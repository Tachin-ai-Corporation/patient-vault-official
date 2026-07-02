'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, Select, TextInput } from '@/components/ui/field'
import {
  useCustomFields,
  validateJsonValue,
} from '@/lib/custom-fields-context'
import { useApiEmitter } from '@/lib/api-inspector'
import { CustomFieldInputs } from '@/components/patients/custom-field-inputs'
import {
  ETHNICITY_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  LANGUAGE_OPTIONS,
  PRONOUN_OPTIONS,
  RACE_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  type Coded,
  type Patient,
  type SexAtBirth,
} from '@/lib/patient-data'

type EditDemographicsModalProps = {
  open: boolean
  onClose: () => void
  patient: Patient
  // Receives the partial update to apply AND the changed-only fields to send as
  // the PATCH request body. Coded fields are emitted as their {code,label}.
  onSave: (patch: Partial<Patient>, changed: Record<string, unknown>) => void
}

function findCoded(options: Coded[], code: string): Coded {
  return options.find((o) => o.code === code) ?? options[0]
}

export function EditDemographicsModal({
  open,
  onClose,
  patient,
  onSave,
}: EditDemographicsModalProps) {
  const [given, setGiven] = useState(patient.given_name)
  const [family, setFamily] = useState(patient.family_name)
  const [dob, setDob] = useState(patient.date_of_birth)
  const [sex, setSex] = useState<SexAtBirth>(patient.sex_at_birth)
  const [gender, setGender] = useState(patient.gender_identity)
  const [pronouns, setPronouns] = useState(patient.pronouns)
  const [raceCode, setRaceCode] = useState(patient.race.code)
  const [ethnicityCode, setEthnicityCode] = useState(patient.ethnicity.code)
  const [language, setLanguage] = useState(patient.preferred_language)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { fields, getValues, setValuesForPatient } = useCustomFields()
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({})
  const emit = useApiEmitter()

  // Re-seed the form from the patient whenever the modal (re)opens so it always
  // reflects the live record.
  useEffect(() => {
    if (!open) return
    setGiven(patient.given_name)
    setFamily(patient.family_name)
    setDob(patient.date_of_birth)
    setSex(patient.sex_at_birth)
    setGender(patient.gender_identity)
    setPronouns(patient.pronouns)
    setRaceCode(patient.race.code)
    setEthnicityCode(patient.ethnicity.code)
    setLanguage(patient.preferred_language)
    setCustomValues(getValues(patient.id))
    setCustomErrors({})
    setErrors({})
  }, [open, patient, getValues])

  function handleSubmit() {
    const nextErrors: Record<string, string> = {}
    if (!given.trim()) nextErrors.given = 'Given name is required.'
    if (!family.trim()) nextErrors.family = 'Family name is required.'
    if (!dob) nextErrors.dob = 'Date of birth is required.'

    // Validate JSON-type custom fields against their optional schema.
    const nextCustomErrors: Record<string, string> = {}
    for (const f of fields) {
      if (f.type !== 'json') continue
      const msg = validateJsonValue(customValues[f.id], f.schema)
      if (msg) nextCustomErrors[f.id] = msg
    }
    setCustomErrors(nextCustomErrors)
    setErrors(nextErrors)
    if (
      Object.keys(nextErrors).length > 0 ||
      Object.keys(nextCustomErrors).length > 0
    )
      return

    const race = findCoded(RACE_OPTIONS, raceCode)
    const ethnicity = findCoded(ETHNICITY_OPTIONS, ethnicityCode)

    const patch: Partial<Patient> = {
      given_name: given.trim(),
      family_name: family.trim(),
      date_of_birth: dob,
      sex_at_birth: sex,
      gender_identity: gender,
      pronouns,
      race,
      ethnicity,
      preferred_language: language,
    }

    // Diff against the current record so the PATCH body carries only what
    // actually changed (mirrors a real partial update).
    const changed: Record<string, unknown> = {}
    if (patch.given_name !== patient.given_name)
      changed.given_name = patch.given_name
    if (patch.family_name !== patient.family_name)
      changed.family_name = patch.family_name
    if (patch.date_of_birth !== patient.date_of_birth)
      changed.date_of_birth = patch.date_of_birth
    if (patch.sex_at_birth !== patient.sex_at_birth)
      changed.sex_at_birth = patch.sex_at_birth
    if (patch.gender_identity !== patient.gender_identity)
      changed.gender_identity = patch.gender_identity
    if (patch.pronouns !== patient.pronouns) changed.pronouns = patch.pronouns
    if (race.code !== patient.race.code) changed.race = race
    if (ethnicity.code !== patient.ethnicity.code)
      changed.ethnicity = ethnicity
    if (patch.preferred_language !== patient.preferred_language)
      changed.preferred_language = patch.preferred_language

    // Persist custom field values (mock/local) alongside the demographics save.
    if (fields.length > 0) {
      setValuesForPatient(patient.id, customValues)

      // Surface the custom-field write as its own API call, carrying only the
      // values that actually changed (keyed by field name).
      const previous = getValues(patient.id)
      const changedFields: Record<string, string> = {}
      for (const f of fields) {
        const next = customValues[f.id] ?? ''
        if (next !== (previous[f.id] ?? '')) {
          changedFields[f.name] = next
        }
      }
      if (Object.keys(changedFields).length > 0) {
        // SWAP POINT: in production, pass liveResponse from the real PATCH.
        emit({
          method: 'PATCH',
          path: `/patient/${patient.id}/fields`,
          requestBody: changedFields,
        })
      }
    }

    onSave(patch, changed)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit patient"
      description="Update demographics. Coded fields store both a human label and the standard code; only changed fields are sent."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground"
          >
            <Check className="h-4 w-4" data-icon="inline-start" />
            Save changes
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <FieldGroup title="Identity">
          <Field label="Given name" htmlFor="e-given" error={errors.given}>
            <TextInput
              id="e-given"
              value={given}
              invalid={!!errors.given}
              onChange={(e) => setGiven(e.target.value)}
            />
          </Field>
          <Field label="Family name" htmlFor="e-family" error={errors.family}>
            <TextInput
              id="e-family"
              value={family}
              invalid={!!errors.family}
              onChange={(e) => setFamily(e.target.value)}
            />
          </Field>
          <Field label="Date of birth" htmlFor="e-dob" error={errors.dob}>
            <TextInput
              id="e-dob"
              type="date"
              value={dob}
              invalid={!!errors.dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>
          <Field label="Sex at birth" htmlFor="e-sex">
            <Select
              id="e-sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as SexAtBirth)}
            >
              {SEX_AT_BIRTH_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gender identity" htmlFor="e-gender">
            <Select
              id="e-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              {GENDER_IDENTITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pronouns" htmlFor="e-pronouns">
            <Select
              id="e-pronouns"
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
            >
              {PRONOUN_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup title="Demographics">
          <Field label="Race" htmlFor="e-race">
            <Select
              id="e-race"
              value={raceCode}
              onChange={(e) => setRaceCode(e.target.value)}
            >
              {RACE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label} ({o.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ethnicity" htmlFor="e-ethnicity">
            <Select
              id="e-ethnicity"
              value={ethnicityCode}
              onChange={(e) => setEthnicityCode(e.target.value)}
            >
              {ETHNICITY_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label} ({o.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Preferred language"
            htmlFor="e-language"
            className="col-span-2"
          >
            <Select
              id="e-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label} ({o.code})
                </option>
              ))}
            </Select>
          </Field>
        </FieldGroup>

        {/* Developer-defined custom fields (from the field builder). */}
        <CustomFieldInputs
          fields={fields}
          values={customValues}
          errors={customErrors}
          onChange={(fieldId, value) => {
            setCustomValues((prev) => ({ ...prev, [fieldId]: value }))
            setCustomErrors((prev) => {
              if (!prev[fieldId]) return prev
              const { [fieldId]: _removed, ...rest } = prev
              return rest
            })
          }}
          idPrefix="edit-cf"
        />
      </div>
    </Modal>
  )
}
