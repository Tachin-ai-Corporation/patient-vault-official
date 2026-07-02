'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, Select, TextInput } from '@/components/ui/field'
import {
  ETHNICITY_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  LANGUAGE_OPTIONS,
  RACE_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  prettifyCode,
  type Coded,
  type Patient,
  type SexAtBirth,
} from '@/lib/patient-data'

type EditDemographicsModalProps = {
  open: boolean
  onClose: () => void
  patient: Patient
  // Receives the partial update to apply. The session layer maps this to the
  // v3 PATCH body and only changed fields are sent.
  onSave: (patch: Partial<Patient>) => void
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
  const [middle, setMiddle] = useState(patient.middle_name)
  const [family, setFamily] = useState(patient.family_name)
  const [dob, setDob] = useState(patient.date_of_birth)
  const [sex, setSex] = useState<SexAtBirth>(patient.sex_at_birth)
  const [gender, setGender] = useState(patient.gender_identity)
  const [raceCode, setRaceCode] = useState(patient.race.code)
  const [ethnicityCode, setEthnicityCode] = useState(patient.ethnicity.code)
  const [language, setLanguage] = useState(patient.preferred_language)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Re-seed the form from the patient whenever the modal (re)opens.
  useEffect(() => {
    if (!open) return
    setGiven(patient.given_name)
    setMiddle(patient.middle_name)
    setFamily(patient.family_name)
    setDob(patient.date_of_birth)
    setSex(patient.sex_at_birth)
    setGender(patient.gender_identity)
    setRaceCode(patient.race.code || RACE_OPTIONS[0].code)
    setEthnicityCode(patient.ethnicity.code || ETHNICITY_OPTIONS[0].code)
    setLanguage(patient.preferred_language)
    setErrors({})
  }, [open, patient])

  function handleSubmit() {
    const nextErrors: Record<string, string> = {}
    if (!given.trim()) nextErrors.given = 'Given name is required.'
    if (!family.trim()) nextErrors.family = 'Family name is required.'
    if (!dob) nextErrors.dob = 'Date of birth is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const patch: Partial<Patient> = {
      given_name: given.trim(),
      middle_name: middle.trim(),
      family_name: family.trim(),
      date_of_birth: dob,
      sex_at_birth: sex,
      gender_identity: gender,
      race: findCoded(RACE_OPTIONS, raceCode),
      ethnicity: findCoded(ETHNICITY_OPTIONS, ethnicityCode),
      preferred_language: language,
    }

    onSave(patch)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit patient"
      description="Update demographics. Race and ethnicity are stored as the API's validated codes."
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
          <Field label="Middle name" htmlFor="e-middle">
            <TextInput
              id="e-middle"
              value={middle}
              onChange={(e) => setMiddle(e.target.value)}
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
                  {prettifyCode(o)}
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
              <option value="">—</option>
              {GENDER_IDENTITY_OPTIONS.map((o) => (
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
                  {o.label}
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
                  {o.label}
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
              <option value="">—</option>
              {LANGUAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGroup>
      </div>
    </Modal>
  )
}
