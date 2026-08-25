export type DefinitionFieldIdentity = { id: number }

export type DefinitionDeletionTarget = {
  definition: {
    id: number
    fields: DefinitionFieldIdentity[]
  }
  field: DefinitionFieldIdentity
}

export function validateFieldDeletion(target: DefinitionDeletionTarget | null) {
  if (!target) return { safe: false as const, reason: 'No custom field was selected.' }

  const { definition, field } = target
  if (!Number.isSafeInteger(field.id) || field.id <= 0) {
    return { safe: false as const, reason: 'The selected custom field has an invalid field identifier.' }
  }
  if (!definition.fields.some((candidate) => candidate.id === field.id)) {
    return { safe: false as const, reason: 'The selected field does not belong to the expected definition.' }
  }

  return { safe: true as const }
}
