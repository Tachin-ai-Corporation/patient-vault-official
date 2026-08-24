export type DefinitionFieldIdentity = { id: number }

export type DefinitionDeletionTarget = {
  definition: {
    id: number
    fields: DefinitionFieldIdentity[]
  }
  field: DefinitionFieldIdentity
}

export function validateDefinitionDeletion(target: DefinitionDeletionTarget | null) {
  if (!target) return { safe: false as const, reason: 'No custom field was selected.' }

  const { definition, field } = target
  if (!Number.isFinite(definition.id) || !Number.isFinite(field.id)) {
    return { safe: false as const, reason: 'The selected custom field has an invalid identifier.' }
  }
  if (definition.fields.length === 0) {
    return { safe: false as const, reason: 'This definition has no fields, so deletion is blocked.' }
  }
  if (definition.fields.length > 1) {
    return {
      safe: false as const,
      reason: `Deletion is blocked because this definition contains ${definition.fields.length} fields. The 1health API can only delete the entire definition.`,
    }
  }
  if (definition.fields[0]?.id !== field.id) {
    return { safe: false as const, reason: 'The selected field does not match the definition being deleted.' }
  }

  return { safe: true as const }
}
