'use client'

/**
 * Session + Patient Vault store — API-backed.
 *
 * This is the single source of truth the whole console reads. It hydrates the
 * developer identity from GET /api/v2/user/myself and the organization/brand
 * from the tenant sys-config endpoint, and it backs the patient list with the
 * real 1health v3 patient API (grid + CRUD + contacts/addresses/deceased).
 *
 * The shape of this context intentionally matches the original demo interface
 * so the console chrome and the (static) developer-platform screens keep
 * working. Concepts the API does not have (multiple projects, staging vs
 * production stores, merge redirects) are represented as thin, single-tenant
 * shims mapped onto the one real vault.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { fetchMyself, type UserInfo } from '@/lib/api/user'
import {
  getActiveEnvironment,
  hasEnvironmentSession,
  migrateLegacySession,
  setActiveEnvironment as persistActiveEnvironment,
} from '@/lib/auth-client'
import { toUiEnvironment, type SessionEnvironment } from '@/lib/session-environments'
import { fetchTenantConfig, type TenantConfig } from '@/lib/api/tenant'
import {
  fetchPatientGrid,
  fetchPatient,
  createPatient,
  patchPatient,
  deletePatient as apiDeletePatient,
  addContact,
  updateContact,
  deleteContact,
  addAddress,
  updateAddress,
  deleteAddress,
  setDeceased,
  updateDeceased,
  clearDeceased,
  listPatients,
  gridRowToPatient,
  seedPatients as apiSeedPatients,
  type SeedProgress,
  type DeceasedInput,
} from '@/lib/api/patient'
import type { SeedPatient } from '@/lib/seed-data'
import {
  patientFullName,
  type Patient,
  type SexAtBirth,
} from '@/lib/patient-data'

// ---- public types (kept compatible with the original demo interface) -------

export type Project = {
  id: string
  name: string
  patientCount: number
}

export type SessionUser = {
  first_name: string
  last_name: string
  name: string
  initials: string
  email: string
}

export type Environment = 'development' | 'production'
export type ApiEnv = 'staging' | 'production'

export type Session = {
  user: SessionUser
  projects: Project[]
  currentProjectId: string
  partner: string | null
  freeCeiling: number
  environment: Environment
  currentEnv: ApiEnv
}

type SessionContextValue = {
  session: Session
  currentProject: Project
  // Live user + tenant from the API (new — used by hydrated console/settings).
  user: UserInfo | null
  tenant: TenantConfig | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  // Patients (real API-backed).
  patients: Patient[]
  patientsLoading: boolean
  getPatientById: (id: string) => Patient | undefined
  fetchPatientDetail: (id: string) => Promise<Patient>
  createPatientRecord: (input: Parameters<typeof createPatient>[0]) => Promise<Patient>
  updatePatient: (id: string, patch: Partial<Patient>) => Promise<void>
  deletePatient: (id: string) => Promise<void>
  addPatientContact: (id: string, input: Parameters<typeof addContact>[1]) => Promise<void>
  updatePatientContact: (
    id: string,
    contactId: string,
    input: Parameters<typeof updateContact>[2],
  ) => Promise<void>
  deletePatientContact: (id: string, contactId: string) => Promise<void>
  addPatientAddress: (id: string, input: Parameters<typeof addAddress>[1]) => Promise<void>
  updatePatientAddress: (
    id: string,
    addressId: string,
    input: Parameters<typeof updateAddress>[2],
  ) => Promise<void>
  deletePatientAddress: (id: string, addressId: string) => Promise<void>
  setPatientDeceased: (id: string, deceased: boolean, date?: string) => Promise<void>
  // Full-body deceased record operations (POST with all fields / PATCH corrections).
  markPatientDeceased: (id: string, body: DeceasedInput) => Promise<void>
  updatePatientDeceased: (id: string, body: Partial<DeceasedInput>) => Promise<void>
  clearPatientDeceased: (id: string) => Promise<void>
  // Plain paginated list via GET /v3/patient (exercises the vanilla endpoint).
  listAllPatients: (page?: number, size?: number) => Promise<number>
  seedSampleData: (batch: SeedPatient[], onProgress?: (p: SeedProgress) => void) => Promise<number>
  reloadPatients: () => Promise<void>
  // Static-screen shims (single-tenant): kept so demo chrome compiles.
  setCurrentProjectId: (id: string) => void
  partner: string | null
  freeCeiling: number
  claimPartner: (code: string) => void
  isProductionActivated: boolean
  currentEnv: ApiEnv
  activeEnvironment: SessionEnvironment
  environmentSessions: Record<SessionEnvironment, boolean>
  setActiveEnvironment: (env: SessionEnvironment) => Promise<boolean>
  // Developer-platform shims. These back the static Console/Settings screens.
  // The 1health API surface used here (myself + tenant + patients) has no
  // project-management or key-provisioning endpoints, so these are local-only
  // and never persist to the tenant.
  updateUserName: (first: string, last: string) => void
  createProject: (name: string) => void
  renameCurrentProject: (name: string) => void
  deleteProject: (id: string) => void
  projectReferenceCount: (id: string) => number
  activateProductionForProject: (maskedKey: string) => void
  productionMaskedKey: string | null
}

// ---- helpers ----------------------------------------------------------------

function deriveInitials(first: string, last: string): string {
  const a = first.charAt(0)
  const b = last.charAt(0)
  return `${a}${b}`.toUpperCase() || 'U'
}

function toSessionUser(u: UserInfo | null): SessionUser {
  if (!u) {
    return { first_name: '', last_name: '', name: 'Loading…', initials: 'U', email: '' }
  }
  return {
    first_name: u.firstName,
    last_name: u.lastName,
    name: `${u.firstName} ${u.lastName}`.trim() || u.username,
    initials: deriveInitials(u.firstName, u.lastName),
    email: u.email,
  }
}

// ---- context ----------------------------------------------------------------

const SessionContext = createContext<SessionContextValue | null>(null)

async function userFetcher(): Promise<UserInfo> {
  const result = await fetchMyself()
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to load user info')
  }
  return result.data
}

async function tenantFetcher(tenantId: number): Promise<TenantConfig | null> {
  const result = await fetchTenantConfig(tenantId)
  return result.success && result.data ? result.data : null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeEnvironment, setActiveEnvironmentState] = useState<SessionEnvironment>('demo')
  const [sessionVersion, setSessionVersion] = useState(0)

  useEffect(() => {
    migrateLegacySession()
    setActiveEnvironmentState(getActiveEnvironment())
    setSessionVersion((version) => version + 1)
  }, [])

  const environmentSessions = useMemo(
    () => ({ demo: hasEnvironmentSession('demo'), prod: hasEnvironmentSession('prod') }),
    [activeEnvironment, sessionVersion],
  )

  const searchParams = useSearchParams()
  const dcpParam = searchParams.get('dcp')
  const [claimedPartner, setClaimedPartner] = useState<string | null>(dcpParam)
  const partner = claimedPartner
  const freeCeiling = partner ? 25000 : 1000
  const claimPartner = useCallback((code: string) => {
    const trimmed = code.trim()
    setClaimedPartner(trimmed || null)
  }, [])

  // --- identity + tenant ---
  const { data: user, error: userError, isLoading: userLoading, mutate: mutateUser } = useSWR(
    environmentSessions[activeEnvironment] ? `session:user:${activeEnvironment}` : null,
    userFetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 2000 },
  )
  const tenantId = user?.tenantContext?.id ?? null
  const { data: tenant, isLoading: tenantLoading, mutate: mutateTenant } = useSWR(
    tenantId ? `session:tenant:${activeEnvironment}:${tenantId}` : null,
    () => tenantFetcher(tenantId!),
    { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 2000 },
  )

  // --- patients (grid-backed list) ---
  const {
    data: patients = [],
    isLoading: patientsLoading,
    mutate: mutatePatients,
  } = useSWR(
    user ? `patients:list:${activeEnvironment}` : null,
    async () => {
      const page = await fetchPatientGrid({ page: 0, size: 200 })
      return (page.data ?? []).map(gridRowToPatient)
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  )

  const isLoading = userLoading || (!!tenantId && tenantLoading)
  const error = userError ? (userError as Error).message : null

  const refresh = useCallback(async () => {
    await mutateUser()
    await mutateTenant()
    // Also revalidate the patient list so that when onboarding finishes and the
    // app calls refresh(), the grid re-fetches under the new org-scoped token
    // instead of showing the bootstrap-tenant cache.
    await mutatePatients()
  }, [mutateUser, mutateTenant, mutatePatients])

  const reloadPatients = useCallback(async () => {
    await mutatePatients()
  }, [mutatePatients])

  // --- derived session/project (single-tenant shim) ---
  const sessionUser = useMemo(() => toSessionUser(user ?? null), [user])
  const projectId = tenantId ? `tenant_${tenantId}` : 'tenant'
  const projectName =
    tenant?.organization?.name ||
    tenant?.applicationName ||
    tenant?.tenantName ||
    user?.tenantContext?.name ||
    'Patient Vault'

  const currentProject = useMemo<Project>(
    () => ({ id: projectId, name: projectName, patientCount: patients.length }),
    [projectId, projectName, patients.length],
  )

  const currentEnv = toUiEnvironment(activeEnvironment)

  const setActiveEnvironment = useCallback(
    async (env: SessionEnvironment) => {
      if (!persistActiveEnvironment(env)) return false
      setActiveEnvironmentState(env)
      setSessionVersion((version) => version + 1)
      return true
    },
    [],
  )

  const session = useMemo<Session>(
    () => ({
      user: sessionUser,
      projects: [currentProject],
      currentProjectId: projectId,
      partner,
      freeCeiling,
      environment: currentEnv === 'production' ? 'production' : 'development',
      currentEnv,
    }),
    [sessionUser, currentProject, projectId, partner, freeCeiling, currentEnv],
  )

  // --- patient reads ---
  const getPatientById = useCallback(
    (id: string) => patients.find((p) => p.id === id),
    [patients],
  )
  const fetchPatientDetail = useCallback((id: string) => fetchPatient(id), [])

  // --- patient writes (all hit the real API, then refresh the list) ---
  const createPatientRecord = useCallback(
    async (input: Parameters<typeof createPatient>[0]) => {
      const dto = await createPatient(input)
      await mutatePatients()
      return fetchPatient(String(dto.id))
    },
    [mutatePatients],
  )

  const updatePatient = useCallback(
    async (id: string, patch: Partial<Patient>) => {
      const body: Record<string, unknown> = {}
      if (patch.given_name !== undefined) body.firstName = patch.given_name
      if (patch.family_name !== undefined) body.lastName = patch.family_name
      if (patch.middle_name !== undefined) body.middleName = patch.middle_name
      if (patch.date_of_birth !== undefined) body.dob = patch.date_of_birth
      if (patch.sex_at_birth !== undefined) body.sexAtBirth = patch.sex_at_birth
      if (patch.gender_identity !== undefined) body.genderIdentity = patch.gender_identity
      if (patch.race !== undefined) body.race = patch.race.code
      if (patch.ethnicity !== undefined) body.ethnicity = patch.ethnicity.code
      if (patch.preferred_language !== undefined) body.preferredLanguage = patch.preferred_language
      if (patch.last4_ssn !== undefined) body.last4Ssn = patch.last4_ssn
      await patchPatient(id, body)
      await mutatePatients()
    },
    [mutatePatients],
  )

  const deletePatient = useCallback(
    async (id: string) => {
      await apiDeletePatient(id)
      await mutatePatients()
    },
    [mutatePatients],
  )

  const addPatientContact = useCallback(
    async (id: string, input: Parameters<typeof addContact>[1]) => {
      await addContact(id, input)
    },
    [],
  )

  const updatePatientContact = useCallback(
    async (
      id: string,
      contactId: string,
      input: Parameters<typeof updateContact>[2],
    ) => {
      await updateContact(id, contactId, input)
    },
    [],
  )

  const deletePatientContact = useCallback(
    async (id: string, contactId: string) => {
      await deleteContact(id, contactId)
    },
    [],
  )

  const addPatientAddress = useCallback(
    async (id: string, input: Parameters<typeof addAddress>[1]) => {
      await addAddress(id, input)
    },
    [],
  )

  const updatePatientAddress = useCallback(
    async (
      id: string,
      addressId: string,
      input: Parameters<typeof updateAddress>[2],
    ) => {
      await updateAddress(id, addressId, input)
    },
    [],
  )

  const deletePatientAddress = useCallback(
    async (id: string, addressId: string) => {
      await deleteAddress(id, addressId)
    },
    [],
  )

  const setPatientDeceased = useCallback(
    async (id: string, deceased: boolean, date?: string) => {
      if (deceased) {
        // deceasedDate is required by the API; default to today when the caller
        // does not supply one. setDeceased handles the already-deceased (409)
        // case by falling back to PATCH.
        const deceasedDate = date ?? new Date().toISOString().slice(0, 10)
        await setDeceased(id, { deceasedDate })
      } else {
        await clearDeceased(id)
      }
      await mutatePatients()
    },
    [mutatePatients],
  )

  const markPatientDeceased = useCallback(
    async (id: string, body: DeceasedInput) => {
      // POST the full record; setDeceased falls back to PATCH on 409 (already
      // marked), so this doubles as a safe "set or correct" operation.
      await setDeceased(id, body)
      await mutatePatients()
    },
    [mutatePatients],
  )

  const updatePatientDeceased = useCallback(
    async (id: string, body: Partial<DeceasedInput>) => {
      await updateDeceased(id, body)
      await mutatePatients()
    },
    [mutatePatients],
  )

  const clearPatientDeceased = useCallback(
    async (id: string) => {
      await clearDeceased(id)
      await mutatePatients()
    },
    [mutatePatients],
  )

  const listAllPatients = useCallback(async (page = 0, size = 25) => {
    const result = await listPatients(page, size)
    // Report the total row count; the call itself is what surfaces in the
    // Inspector. Fall back to the page length if totalElements is absent.
    return result?.totalElements ?? result?.data?.length ?? 0
  }, [])

  const seedSampleData = useCallback(
    async (batch: SeedPatient[], onProgress?: (p: SeedProgress) => void) => {
      const created = await apiSeedPatients(batch, onProgress)
      await mutatePatients()
      return created
    },
    [mutatePatients],
  )

  // --- static-screen shims ---
  const setCurrentProjectId = useCallback(() => {}, [])
  const [productionMaskedKey, setProductionMaskedKey] = useState<string | null>(
    null,
  )
  const isProductionActivated = environmentSessions.prod

  // Locally override the displayed developer name (no user-write endpoint is
  // used here — this only updates the in-memory SWR cache for the session).
  const updateUserName = useCallback(
    (first: string, last: string) => {
      mutateUser(
        (prev) =>
          prev ? { ...prev, firstName: first, lastName: last } : prev,
        { revalidate: false },
      )
    },
    [mutateUser],
  )

  const createProject = useCallback(() => {}, [])
  const renameCurrentProject = useCallback(() => {}, [])
  const deleteProject = useCallback(() => {}, [])
  const projectReferenceCount = useCallback(() => 0, [])
  const activateProductionForProject = useCallback((maskedKey: string) => {
    setProductionMaskedKey(maskedKey)
  }, [])

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      currentProject,
      user: user ?? null,
      tenant: tenant ?? null,
      isLoading,
      error,
      refresh,
      patients,
      patientsLoading,
      getPatientById,
      fetchPatientDetail,
      createPatientRecord,
      updatePatient,
      deletePatient,
      addPatientContact,
      updatePatientContact,
      deletePatientContact,
      addPatientAddress,
      updatePatientAddress,
      deletePatientAddress,
      setPatientDeceased,
      markPatientDeceased,
      updatePatientDeceased,
      clearPatientDeceased,
      listAllPatients,
      seedSampleData,
      reloadPatients,
      setCurrentProjectId,
      partner,
      freeCeiling,
      claimPartner,
      isProductionActivated,
      currentEnv,
      activeEnvironment,
      environmentSessions,
      setActiveEnvironment,
      updateUserName,
      createProject,
      renameCurrentProject,
      deleteProject,
      projectReferenceCount,
      activateProductionForProject,
      productionMaskedKey,
    }),
    [
      session,
      currentProject,
      user,
      tenant,
      isLoading,
      error,
      refresh,
      patients,
      patientsLoading,
      getPatientById,
      fetchPatientDetail,
      createPatientRecord,
      updatePatient,
      deletePatient,
      addPatientContact,
      updatePatientContact,
      deletePatientContact,
      addPatientAddress,
      updatePatientAddress,
      deletePatientAddress,
      setPatientDeceased,
      markPatientDeceased,
      updatePatientDeceased,
      clearPatientDeceased,
      listAllPatients,
      seedSampleData,
      reloadPatients,
      setCurrentProjectId,
      partner,
      freeCeiling,
      claimPartner,
      currentEnv,
      activeEnvironment,
      environmentSessions,
      setActiveEnvironment,
      isProductionActivated,
      updateUserName,
      createProject,
      renameCurrentProject,
      deleteProject,
      projectReferenceCount,
      activateProductionForProject,
      productionMaskedKey,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within a SessionProvider')
  return ctx
}

// Re-export for convenience where components import the name helper.
export { patientFullName }
export type { SexAtBirth }
