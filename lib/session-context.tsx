'use client'

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useSearchParams } from 'next/navigation'
import {
  generateSyntheticPatients,
  patientFullName,
  type Patient,
  type ScenarioKey,
} from '@/lib/patient-data'

export type Project = {
  id: string
  name: string
  patientCount: number
}

export type SessionUser = {
  first_name: string
  last_name: string
  // display name = "{first_name} {last_name}"; initials derived from both.
  name: string
  initials: string
  email: string
}

export type Environment = 'development' | 'production'

export type Session = {
  user: SessionUser
  projects: Project[]
  currentProjectId: string
  partner: string | null
  freeCeiling: number
  environment: Environment
  // The API environment the developer is currently viewing (staging by
  // default). Distinct from `environment` (the dev→prod go-live state):
  // currentEnv selects which credential set the API Keys section shows.
  currentEnv: ApiEnv
}

export type ApiEnv = 'staging' | 'production'

type SessionContextValue = {
  session: Session
  currentProject: Project
  setCurrentProjectId: (id: string) => void
  // Create a new project: a named STAGING vault with a generated proj_ id and
  // 0 patients. New projects are NEVER born in production — they always start
  // in staging. The new project becomes the current project.
  createProject: (name: string) => void
  // Delete a STAGING project (synthetic-only data, so it is immediate). Removes
  // it from session.projects; if it was the current project, switches to another
  // one, or leaves no current project when it was the last. Production deletion
  // is NOT performed here — it follows the BAA return-or-destroy request flow.
  deleteProject: (id: string) => void
  // Mock referential guard: how many of a project's patients are referenced by
  // other projects/entities and are therefore tombstoned (cannot be hard-deleted
  // until the references are released). Reuses the merge-redirect concept.
  projectReferenceCount: (projectId: string) => number
  // patients for the currently selected project
  patients: Patient[]
  // Resolve a patient by id within the current project + viewed environment,
  // following merge redirects so a merged-away (tombstoned) id still returns
  // its surviving canonical record. Returns undefined when nothing resolves.
  getPatientById: (id: string) => Patient | undefined
  // Apply a partial update to a single patient in the active store. Used by the
  // record page for demographics edits and add/edit of related records. When
  // `patch.attachments` is supplied, attachment_count is kept in sync so the
  // grid and org-wide Attachments view stay correct. SWAP POINT: in production
  // each of these is a scoped PATCH/POST against the patient sub-resource.
  updatePatient: (id: string, patch: Partial<Patient>) => void
  addPatient: (patient: Patient) => void
  // returns the number actually seeded after ceiling capping
  seedPatients: (count: number, scenario?: ScenarioKey) => number
  clearPatients: () => void
  // Delete a single patient by id from the active environment. SWAP POINT:
  // scoped DELETE /patient/{id} in production.
  deletePatient: (id: string) => void
  // Consolidate duplicate records into one canonical survivor. The survivor
  // keeps its id and absorbs the others' contacts/addresses/attachments; the
  // merged-away ids become permanent redirects to the survivor. Operates on
  // the environment currently being viewed (staging or production).
  mergePatients: (survivorId: string, mergedIds: string[]) => void
  // Mock of the production HTTP 308 redirect table: merged-away id -> survivor
  // id, so an old id keeps resolving to the canonical record.
  redirects: Record<string, string>
  // Whether the CURRENT project has activated production (per-project, not global).
  isProductionActivated: boolean
  // The current project's production secret key, masked. Shown in full exactly
  // once in the go-live success screen, then only ever masked afterwards.
  productionMaskedKey: string | null
  // Complete the go-live gate for the current project: marks production
  // activated, stores the masked production key, starts the production DB
  // empty, and switches the viewing environment to production.
  activateProductionForProject: (maskedKey: string) => void
  // ---- auth (mocked) ----
  // Whether the user has a mocked session. Persisted like theme.
  isAuthenticated: boolean
  // True once localStorage has been read on the client, so the gate can avoid
  // redirecting (and flashing) before the persisted value is known.
  authHydrated: boolean
  login: () => void
  logout: () => void
  // Register a brand-new user: sets the user name and creates exactly one
  // personalized staging project ("{First} {Last}'s Patient Vault", 0
  // patients), which becomes the current project. Does NOT create the
  // Acme/Northwind demo projects.
  register: (firstName: string, lastName: string, email: string) => void
  // Rename the current project (reflected in switcher + breadcrumb).
  renameCurrentProject: (name: string) => void
  // Update the developer's first/last name from the Console. Email is fixed by
  // the identity provider and is never editable here. SWAP POINT: in production
  // this is a PATCH against the developer profile.
  updateUserName: (firstName: string, lastName: string) => void
  // Manually claim a partner code (dcp) from Settings when the developer
  // arrived without one on their URL. Reuses the same ceiling logic.
  claimPartner: (code: string) => void
  // Switch which API environment the credential surface is viewing.
  setCurrentEnv: (env: ApiEnv) => void
}

// Single source of truth for the mocked session. Later prompts extend this.
// MOCK — real implementation: the session (user, project memberships,
// environment) is established by an OAuth 2.1 PKCE resource-server flow. 1health
// authorizes access to the vault and is NOT an identity provider. SWAP POINT:
// replace this static object with the claims/memberships resolved from the
// verified token.
// Derive uppercase initials from a first + last name, e.g. "Neil Sethi" → "NS".
function deriveInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function makeUser(first: string, last: string, email: string): SessionUser {
  return {
    first_name: first,
    last_name: last,
    name: `${first} ${last}`.trim(),
    initials: deriveInitials(first, last),
    email,
  }
}

// The logged-in DEMO user lands with multiple projects to showcase the switcher.
const DEMO_USER = makeUser('Neil', 'Sethi', 'neil@1health.io')
const DEMO_PROJECTS: Project[] = [
  { id: 'proj_demo', name: 'Acme Health', patientCount: 0 },
  { id: 'proj_two', name: 'Northwind Clinical', patientCount: 0 },
]

const BASE_SESSION: Omit<
  Session,
  'currentProjectId' | 'partner' | 'freeCeiling'
> = {
  user: DEMO_USER,
  projects: DEMO_PROJECTS,
  environment: 'development',
  currentEnv: 'staging',
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams()
  // dcp partner referral raises the free patient ceiling from 1,000 to 25,000.
  // We hold it in state (seeded from the URL param) so it persists across
  // client navigation and can also be claimed manually from Settings.
  const dcpParam = searchParams.get('dcp')
  const [claimedPartner, setClaimedPartner] = useState<string | null>(
    () => dcpParam,
  )
  useEffect(() => {
    if (dcpParam && dcpParam !== claimedPartner) setClaimedPartner(dcpParam)
  }, [dcpParam, claimedPartner])
  const partner = claimedPartner
  const freeCeiling = partner ? 25000 : 1000

  const claimPartner = useCallback((code: string) => {
    const trimmed = code.trim()
    setClaimedPartner(trimmed ? trimmed : null)
  }, [])

  // User + base project list are stateful so the registration path can replace
  // the demo defaults with a single personalized staging project. These
  // default to the logged-in demo state (Acme/Northwind) for /login.
  const [user, setUser] = useState<SessionUser>(BASE_SESSION.user)
  const [baseProjects, setBaseProjects] = useState<Project[]>(
    BASE_SESSION.projects,
  )

  // ---- mocked auth (persisted in localStorage like the theme) ----
  // SWAP POINT: real implementation establishes this via OAuth 2.1 / a session
  // cookie set by the resource server, not a localStorage flag.
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authHydrated, setAuthHydrated] = useState(false)

  useEffect(() => {
    try {
      setIsAuthenticated(localStorage.getItem('pv-auth') === '1')
    } catch {
      // ignore storage access errors
    }
    setAuthHydrated(true)
  }, [])

  const login = useCallback(() => {
    setIsAuthenticated(true)
    try {
      localStorage.setItem('pv-auth', '1')
    } catch {
      // ignore
    }
  }, [])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    try {
      localStorage.removeItem('pv-auth')
    } catch {
      // ignore
    }
  }, [])

  const [currentProjectId, setCurrentProjectId] = useState('proj_demo')

  // Per-project production activation. A project is in 'development' until it
  // clears the go-live human checkpoint; activation is tracked per project id
  // so each project's production state is independent.
  const [activatedProjects, setActivatedProjects] = useState<
    Record<string, boolean>
  >({})
  // Per-project masked production key (the full secret is shown once in the
  // go-live success screen and never persisted here).
  const [prodKeyByProject, setProdKeyByProject] = useState<
    Record<string, string>
  >({})

  const isProductionActivated = !!activatedProjects[currentProjectId]
  const productionMaskedKey = prodKeyByProject[currentProjectId] ?? null

  // The project's go-live state is derived from activation, not a separate flag.
  const environment: Environment = isProductionActivated
    ? 'production'
    : 'development'

  // Which API environment the developer is currently viewing. Defaults to
  // staging. Switching to production is allowed freely (e.g. to view the
  // locked credential panel); the top-level toggle opens the go-live flow
  // instead of switching when production is not yet activated.
  const [currentEnv, setCurrentEnv] = useState<ApiEnv>('staging')

  const activateProductionForProject = useCallback(
    (maskedKey: string) => {
      // SWAP POINT: in production this is a server mutation that provisions the
      // production project only after the human checkpoint (card, project
      // verify, Developer Agreement, BAA) is satisfied. Here it flips local
      // state and stores only the masked key. The production DB starts empty —
      // no synthetic/staging data is ever carried over.
      const projectId = currentProjectId
      setActivatedProjects((prev) => ({ ...prev, [projectId]: true }))
      setProdKeyByProject((prev) => ({ ...prev, [projectId]: maskedKey }))
      setProdPatientsByProject((prev) => ({
        ...prev,
        [projectId]: prev[projectId] ?? [],
      }))
      setCurrentEnv('production')
    },
    [currentProjectId],
  )

  // Per-project STAGING patient arrays. Each project starts empty; mutated below.
  const [patientsByProject, setPatientsByProject] = useState<
    Record<string, Patient[]>
  >(() =>
    Object.fromEntries(
      BASE_SESSION.projects.map((p) => [p.id, [] as Patient[]]),
    ),
  )
  // Per-project PRODUCTION patient arrays — separate from staging so the two
  // datasets persist independently. Production starts empty on activation.
  const [prodPatientsByProject, setProdPatientsByProject] = useState<
    Record<string, Patient[]>
  >({})

  // The active store depends on the environment currently being viewed.
  const activeStore =
    currentEnv === 'production' ? prodPatientsByProject : patientsByProject
  const setActiveStore =
    currentEnv === 'production'
      ? setProdPatientsByProject
      : setPatientsByProject

  const patients = useMemo<Patient[]>(
    () => activeStore[currentProjectId] ?? [],
    [activeStore, currentProjectId],
  )

  const addPatient = useCallback(
    (patient: Patient) => {
      setActiveStore((prev) => {
        const existing = prev[currentProjectId] ?? []
        if (existing.length >= freeCeiling) return prev
        return { ...prev, [currentProjectId]: [patient, ...existing] }
      })
    },
    [setActiveStore, currentProjectId, freeCeiling],
  )

  // Mock 308 redirect table is declared below (redirects). getPatientById
  // resolves through it so a deep-link to a merged-away id keeps working.
  const getPatientById = useCallback(
    (id: string): Patient | undefined => {
      const list = activeStore[currentProjectId] ?? []
      // Walk redirects (old id -> survivor id) until we land on a live record.
      let resolved = id
      const seen = new Set<string>()
      while (redirectsRef.current[resolved] && !seen.has(resolved)) {
        seen.add(resolved)
        resolved = redirectsRef.current[resolved]
      }
      return list.find((p) => p.id === resolved)
    },
    [activeStore, currentProjectId],
  )

  const updatePatient = useCallback(
    (id: string, patch: Partial<Patient>) => {
      setActiveStore((prev) => {
        const list = prev[currentProjectId] ?? []
        const next = list.map((p) => {
          if (p.id !== id) return p
          const merged: Patient = { ...p, ...patch }
          // Keep the derived count in lockstep with the attachments array so
          // the grid's attachment_count and the Attachments view stay correct.
          if (patch.attachments) {
            merged.attachment_count = patch.attachments.length
          }
          return merged
        })
        return { ...prev, [currentProjectId]: next }
      })
    },
    [setActiveStore, currentProjectId],
  )

  const seedPatients = useCallback(
    (count: number, scenario: ScenarioKey = 'general'): number => {
      // Seeding is a staging-only affordance — production holds real patient
      // data, so synthetic generation is never available there.
      if (currentEnv === 'production') return 0
      const existing = patientsByProject[currentProjectId] ?? []
      // Respect the free ceiling: cap so we never exceed it.
      const room = Math.max(0, freeCeiling - existing.length)
      const toCreate = Math.min(count, room)
      if (toCreate <= 0) return 0

      // ---- v0 MOCK: client-side synthetic generation -----------------------
      // SWAP POINT: in production replace this with a server call:
      //   await fetch(`/seed?count=${toCreate}&population=${scenario}`, { method: 'POST' })
      // which is backed by a Synthea-derived synthetic patient generator,
      // where `population` biases the generated cohort's conditions,
      // observations, and attachments.
      const created = generateSyntheticPatients(toCreate, scenario)
      // ----------------------------------------------------------------------

      setPatientsByProject((prev) => ({
        ...prev,
        [currentProjectId]: [...created, ...(prev[currentProjectId] ?? [])],
      }))
      return toCreate
    },
    [currentEnv, patientsByProject, currentProjectId, freeCeiling],
  )

  const clearPatients = useCallback(() => {
    // Clear operates on whichever environment is currently being viewed.
    setActiveStore((prev) => ({ ...prev, [currentProjectId]: [] }))
  }, [setActiveStore, currentProjectId])

  // Delete a single patient from the active store. SWAP POINT: in production
  // this is a scoped DELETE /patient/{id} against the active environment.
  const deletePatient = useCallback(
    (id: string) => {
      setActiveStore((prev) => {
        const list = prev[currentProjectId] ?? []
        return { ...prev, [currentProjectId]: list.filter((p) => p.id !== id) }
      })
    },
    [setActiveStore, currentProjectId],
  )

  // Mock 308 redirect table (old id -> survivor id). In production this is the
  // server's permanent redirect map; here it lets old ids resolve post-merge.
  const [redirects, setRedirects] = useState<Record<string, string>>({})
  // Ref mirror so getPatientById (declared above) can read the latest redirect
  // table without depending on it (keeps the resolver referentially stable).
  const redirectsRef = useRef(redirects)
  useEffect(() => {
    redirectsRef.current = redirects
  }, [redirects])

  const mergePatients = useCallback(
    (survivorId: string, mergedIds: string[]) => {
      // SWAP POINT: in production this is the specified merge endpoint — a WRITE
      // that consolidates the records, returns the canonical patient, and
      // installs permanent HTTP 308 redirects (GET /patient/{old} -> 308
      // Location: /patient/{survivor}) so the merged ids keep resolving. The
      // merge also emits an audit event (it is a mutation); the audit feed is
      // intentionally NOT wired in this pass. There is no auto-merge — this only
      // runs after explicit human confirmation in the merge dialog.
      const ids = mergedIds.filter((id) => id !== survivorId)
      if (ids.length === 0) return

      setActiveStore((prev) => {
        const list = prev[currentProjectId] ?? []
        const survivor = list.find((p) => p.id === survivorId)
        if (!survivor) return prev
        const merged = list.filter((p) => ids.includes(p.id))
        if (merged.length === 0) return prev

        // Absorb related records onto the survivor — counts sum naturally
        // because the drawer/grid read array lengths and attachment_count.
        const absorbedAddresses = merged.flatMap((m) => m.addresses)
        const absorbedContacts = merged.flatMap((m) => m.contacts)
        const absorbedAttachments = merged.flatMap((m) =>
          m.attachments.map((a) => ({ ...a, patient_id: survivorId })),
        )
        // Preserve the merged records' names (and any aliases they carried) as
        // aliases on the survivor.
        const newAliases = merged.flatMap((m) => [
          patientFullName(m),
          ...(m.aliases ?? []),
        ])
        const updatedSurvivor: Patient = {
          ...survivor,
          addresses: [...survivor.addresses, ...absorbedAddresses],
          contacts: [...survivor.contacts, ...absorbedContacts],
          attachments: [...survivor.attachments, ...absorbedAttachments],
          attachment_count:
            survivor.attachments.length + absorbedAttachments.length,
          aliases: Array.from(
            new Set([...(survivor.aliases ?? []), ...newAliases]),
          ),
        }

        // Drop the merged-away records; replace the survivor in place.
        const nextList = list
          .filter((p) => !ids.includes(p.id))
          .map((p) => (p.id === survivorId ? updatedSurvivor : p))
        return { ...prev, [currentProjectId]: nextList }
      })

      // Install mock redirects so the old ids resolve to the survivor.
      setRedirects((prev) => {
        const next = { ...prev }
        for (const id of ids) next[id] = survivorId
        return next
      })
    },
    [setActiveStore, currentProjectId],
  )

  const register = useCallback(
    (firstName: string, lastName: string, email: string) => {
      const first = firstName.trim()
      const last = lastName.trim()
      setUser(makeUser(first, last, email.trim()))

      // Exactly one personalized staging project, 0 patients, set as current.
      const projectId = `proj_${Date.now().toString(36)}`
      const projectName = `${first} ${last}`.trim()
        ? `${`${first} ${last}`.trim()}'s Patient Vault`
        : 'Patient Vault'
      setBaseProjects([{ id: projectId, name: projectName, patientCount: 0 }])
      setPatientsByProject({ [projectId]: [] })
      setCurrentProjectId(projectId)

      // Establish the mocked session.
      login()
    },
    [login],
  )

  const renameCurrentProject = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setBaseProjects((prev) =>
        prev.map((p) =>
          p.id === currentProjectId ? { ...p, name: trimmed } : p,
        ),
      )
    },
    [currentProjectId],
  )

  const updateUserName = useCallback((firstName: string, lastName: string) => {
    const first = firstName.trim()
    const last = lastName.trim()
    if (!first || !last) return
    // Email is preserved — it is established by the identity provider and is
    // not editable from the Console.
    setUser((prev) => makeUser(first, last, prev.email))
  }, [])

  const createProject = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    // SWAP POINT: real project creation provisions a STAGING vault server-side
    // (an isolated database + a staging API key) and returns the new id. New
    // projects are always born in staging — never production — so the go-live
    // gate still governs any later move to production.
    const projectId = `proj_${Date.now().toString(36)}`
    setBaseProjects((prev) => [
      ...prev,
      { id: projectId, name: trimmed, patientCount: 0 },
    ])
    setPatientsByProject((prev) => ({ ...prev, [projectId]: [] }))
    setCurrentProjectId(projectId)
    // A brand-new project is staging-only; make sure we're viewing staging.
    setCurrentEnv('staging')
  }, [])

  const projectReferenceCount = useCallback(
    (projectId: string) => {
      // MOCK referential guard. SWAP POINT: the real check asks the platform
      // whether any other project or entity holds an active reference to a
      // patient in this project (e.g. a cross-project link or merge redirect).
      // Here we reuse the merge-redirect table: each tombstoned old id whose
      // surviving record lives in this project is an active reference that must
      // be released before the project can be hard-deleted.
      const idsInProject = new Set<string>([
        ...(patientsByProject[projectId] ?? []).map((p) => p.id),
        ...(prodPatientsByProject[projectId] ?? []).map((p) => p.id),
      ])
      return Object.values(redirects).filter((survivorId) =>
        idsInProject.has(survivorId),
      ).length
    },
    [redirects, patientsByProject, prodPatientsByProject],
  )

  const deleteProject = useCallback(
    (id: string) => {
      // SWAP POINT: real STAGING deletion deprovisions the staging vault
      // server-side (drops its database and revokes its keys). Because staging
      // holds synthetic-only data, it is immediate. PRODUCTION deletion is never
      // handled here — it is request-only and follows the BAA return-or-destroy
      // flow, and is blocked while referenced records are tombstoned.
      const remaining = baseProjects.filter((p) => p.id !== id)
      setBaseProjects(remaining)
      setCurrentProjectId((curr) =>
        curr === id ? (remaining[0]?.id ?? '') : curr,
      )
      // Clean up all per-project state so nothing dangles.
      setPatientsByProject((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setProdPatientsByProject((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setActivatedProjects((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setProdKeyByProject((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      // Deleting a project always returns the viewer to staging.
      setCurrentEnv('staging')
    },
    [baseProjects],
  )

  const session = useMemo<Session>(() => {
    return {
      user,
      // patientCount is derived from the live per-project patient arrays for
      // the environment currently being viewed (staging vs production).
      projects: baseProjects.map((p) => ({
        ...p,
        patientCount: (activeStore[p.id] ?? []).length,
      })),
      currentProjectId,
      partner,
      freeCeiling,
      environment,
      currentEnv,
    }
  }, [
    user,
    baseProjects,
    currentProjectId,
    partner,
    freeCeiling,
    activeStore,
    environment,
    currentEnv,
  ])

  const currentProject = useMemo<Project>(() => {
    // Falls back to a placeholder when there are no projects (e.g. just after
    // deleting the last one) so chrome that reads currentProject never crashes;
    // the AppShell renders the onboarding state in that case.
    return (
      session.projects.find((p) => p.id === currentProjectId) ??
      session.projects[0] ?? { id: '', name: 'No project', patientCount: 0 }
    )
  }, [session.projects, currentProjectId])

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      currentProject,
      setCurrentProjectId,
      createProject,
      deleteProject,
      projectReferenceCount,
      patients,
      getPatientById,
      updatePatient,
      addPatient,
    seedPatients,
    clearPatients,
    deletePatient,
    mergePatients,
      redirects,
      isProductionActivated,
      productionMaskedKey,
      activateProductionForProject,
      isAuthenticated,
      authHydrated,
      login,
      logout,
      register,
      renameCurrentProject,
      updateUserName,
      claimPartner,
      setCurrentEnv,
    }),
    [
      session,
      currentProject,
      createProject,
      deleteProject,
      projectReferenceCount,
      patients,
      getPatientById,
      updatePatient,
      addPatient,
    seedPatients,
    clearPatients,
    deletePatient,
    mergePatients,
      redirects,
      isProductionActivated,
      productionMaskedKey,
      activateProductionForProject,
      isAuthenticated,
      authHydrated,
      login,
      logout,
      register,
      renameCurrentProject,
      updateUserName,
      claimPartner,
      setCurrentEnv,
    ],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return ctx
}
