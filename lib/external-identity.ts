import type { PatientIdentifierInput } from '@/lib/api/patient'

export type ExternalIdentityDraft = PatientIdentifierInput

export type ExternalIdentityValidation =
  | { ok: true; body: PatientIdentifierInput }
  | { ok: false; message: string; fieldId: string }

function optionalText(value: string | number | null | undefined): string | undefined {
  const normalized = String(value ?? '').trim()
  return normalized || undefined
}

function numericAuthorityId(value: string | number | null | undefined): number | undefined {
  const normalized = optionalText(value)
  if (!normalized) return undefined
  return Number(normalized)
}

/**
 * Validate the add/replace identity editor and produce the exact v3 payload.
 * Authority IDs are numbers in the API contract, names and IDs are mutually
 * exclusive, and optional properties are omitted rather than sent as null.
 */
export function validateAndNormalizeExternalIdentity(
  draft: ExternalIdentityDraft,
): ExternalIdentityValidation {
  const value = optionalText(draft.value)
  if (!value) {
    return { ok: false, message: 'Enter an identifier value.', fieldId: 'identity-value' }
  }

  const organizationIdText = optionalText(draft.authority_organization_id)
  const organizationName = optionalText(draft.authority_organization_name)
  if (organizationIdText && organizationName) {
    return {
      ok: false,
      message: 'Choose either an organization ID or an organization name, not both.',
      fieldId: 'identity-org-id',
    }
  }

  const externalSystemIdText = optionalText(draft.authority_external_system_id)
  const externalSystemName = optionalText(draft.authority_external_system_name)
  if (externalSystemIdText && externalSystemName) {
    return {
      ok: false,
      message: 'Choose either an external system ID or an external system name, not both.',
      fieldId: 'identity-system-id',
    }
  }

  const organizationId = numericAuthorityId(organizationIdText)
  if (organizationIdText && (!Number.isInteger(organizationId) || Number(organizationId) <= 0)) {
    return {
      ok: false,
      message: 'Organization ID must be a positive whole number.',
      fieldId: 'identity-org-id',
    }
  }

  const externalSystemId = numericAuthorityId(externalSystemIdText)
  if (externalSystemIdText && (!Number.isInteger(externalSystemId) || Number(externalSystemId) <= 0)) {
    return {
      ok: false,
      message: 'External system ID must be a positive whole number.',
      fieldId: 'identity-system-id',
    }
  }

  const activeFromText = optionalText(draft.active_from)
  const activeUntilText = optionalText(draft.active_until)
  const activeFrom = activeFromText ? new Date(activeFromText) : undefined
  const activeUntil = activeUntilText ? new Date(activeUntilText) : undefined

  if (activeFrom && Number.isNaN(activeFrom.getTime())) {
    return { ok: false, message: 'Enter a valid “Active from” date and time.', fieldId: 'identity-from' }
  }
  if (activeUntil && Number.isNaN(activeUntil.getTime())) {
    return { ok: false, message: 'Enter a valid “Active until” date and time.', fieldId: 'identity-until' }
  }
  if (activeFrom && activeUntil && activeUntil.getTime() < activeFrom.getTime()) {
    return {
      ok: false,
      message: '“Active until” must be later than or equal to “Active from”.',
      fieldId: 'identity-until',
    }
  }

  return {
    ok: true,
    body: {
      value,
      ...(optionalText(draft.type) ? { type: optionalText(draft.type) } : {}),
      ...(organizationId !== undefined ? { authority_organization_id: organizationId } : {}),
      ...(organizationName ? { authority_organization_name: organizationName } : {}),
      ...(externalSystemId !== undefined ? { authority_external_system_id: externalSystemId } : {}),
      ...(externalSystemName ? { authority_external_system_name: externalSystemName } : {}),
      ...(optionalText(draft.source_name) ? { source_name: optionalText(draft.source_name) } : {}),
      ...(activeFrom ? { active_from: activeFrom.toISOString() } : {}),
      ...(activeUntil ? { active_until: activeUntil.toISOString() } : {}),
    },
  }
}
