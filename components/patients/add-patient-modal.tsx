'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, Select, TextInput } from '@/components/ui/field'
import {
  ADDRESS_USE_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  LANGUAGE_OPTIONS,
  RACE_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  prettifyCode,
  type AddressUse,
  type ContactType,
  type SexAtBirth,
} from '@/lib/patient-data'
import type {
  PatientCreateInput,
  ContactInput,
  AddressInput,
} from '@/lib/api/patient'

export type NewPatientDraft = {
  patient: PatientCreateInput
  contact?: ContactInput
  address?: AddressInput
}

type AddPatientModalProps = {
  open: boolean
  onClose: () => void
  // Persists the new patient (and optional contact/address) via the API.
  onAdd: (draft: NewPatientDraft) => Promise<void> | void
}

type ContactState = { type: ContactType; value: string }
type AddressState = {
  use: AddressUse
  line1: string
  city: string
  state: string
  postal_code: string
  country: string
}

const emptyContact: ContactState = { type: 'mobile', value: '' }
const emptyAddress: AddressState = {
  use: 'home',
  line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'United States',
}

export function AddPatientModal({ open, onClose, onAdd }: AddPatientModalProps) {
  const [given, setGiven] = useState('')
  const [middle, setMiddle] = useState('')
  const [family, setFamily] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState<SexAtBirth>('unknown')
  const [gender, setGender] = useState('')
  const [raceCode, setRaceCode] = useState(RACE_OPTIONS[0].code)
  const [ethnicityCode, setEthnicityCode] = useState(ETHNICITY_OPTIONS[0].code)
  const [language, setLanguage] = useState('')

  const [address, setAddress] = useState<AddressState | null>(null)
  const [contact, setContact] = useState<ContactState | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setGiven('')
    setMiddle('')
    setFamily('')
    setDob('')
    setSex('unknown')
    setGender('')
    setRaceCode(RACE_OPTIONS[0].code)
    setEthnicityCode(ETHNICITY_OPTIONS[0].code)
    setLanguage('')
    setAddress(null)
    setContact(null)
    setErrors({})
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {}
    if (!given.trim()) nextErrors.given = 'Given name is required.'
    if (!family.trim()) nextErrors.family = 'Family name is required.'
    if (!dob) nextErrors.dob = 'Date of birth is required.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const draft: NewPatientDraft = {
      patient: {
        firstName: given.trim(),
        lastName: family.trim(),
        middleName: middle.trim() || undefined,
        dob,
        sexAtBirth: sex,
        genderIdentity: gender || undefined,
        race: raceCode,
        ethnicity: ethnicityCode,
        preferredLanguage: language || undefined,
      },
      contact:
        contact && contact.value.trim()
          ? { type: contact.type, value: contact.value.trim(), isPrimary: true }
          : undefined,
      address:
        address && address.line1.trim()
          ? {
              line1: address.line1.trim(),
              city: address.city.trim(),
              state: address.state.trim(),
              postalCode: address.postal_code.trim(),
              country: address.country.trim() || undefined,
              use: address.use,
              primary: true,
            }
          : undefined,
    }

    setSubmitting(true)
    try {
      await onAdd(draft)
      reset()
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add patient"
      description="Create a single record. Race and ethnicity are stored as the API's validated codes."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" data-icon="inline-start" />
            {submitting ? 'Adding…' : 'Add patient'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Identity */}
        <FieldGroup title="Identity">
          <Field label="Given name" htmlFor="given" error={errors.given}>
            <TextInput
              id="given"
              value={given}
              invalid={!!errors.given}
              onChange={(e) => setGiven(e.target.value)}
              placeholder="Maria"
            />
          </Field>
          <Field label="Middle name" htmlFor="middle">
            <TextInput
              id="middle"
              value={middle}
              onChange={(e) => setMiddle(e.target.value)}
              placeholder="Elena"
            />
          </Field>
          <Field label="Family name" htmlFor="family" error={errors.family}>
            <TextInput
              id="family"
              value={family}
              invalid={!!errors.family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="Garcia"
            />
          </Field>
          <Field label="Date of birth" htmlFor="dob" error={errors.dob}>
            <TextInput
              id="dob"
              type="date"
              value={dob}
              invalid={!!errors.dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </Field>
          <Field label="Sex at birth" htmlFor="sex">
            <Select
              id="sex"
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
          <Field label="Gender identity" htmlFor="gender">
            <Select
              id="gender"
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

        {/* Demographics */}
        <FieldGroup title="Demographics">
          <Field label="Race" htmlFor="race">
            <Select
              id="race"
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
          <Field label="Ethnicity" htmlFor="ethnicity">
            <Select
              id="ethnicity"
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
            htmlFor="language"
            className="col-span-2"
          >
            <Select
              id="language"
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

        {/* Optional related records */}
        <OptionalSection
          title="Contact"
          added={!!contact}
          onAdd={() => setContact({ ...emptyContact })}
          onRemove={() => setContact(null)}
        >
          {contact && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="c-type">
                <Select
                  id="c-type"
                  value={contact.type}
                  onChange={(e) =>
                    setContact({ ...contact, type: e.target.value as ContactType })
                  }
                >
                  {CONTACT_TYPE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Value" htmlFor="c-value">
                <TextInput
                  id="c-value"
                  value={contact.value}
                  onChange={(e) =>
                    setContact({ ...contact, value: e.target.value })
                  }
                  placeholder={
                    contact.type === 'email'
                      ? 'name@example.com'
                      : '+15555551234'
                  }
                />
              </Field>
            </div>
          )}
        </OptionalSection>

        <OptionalSection
          title="Address"
          added={!!address}
          onAdd={() => setAddress({ ...emptyAddress })}
          onRemove={() => setAddress(null)}
        >
          {address && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Use" htmlFor="addr-use">
                <Select
                  id="addr-use"
                  value={address.use}
                  onChange={(e) =>
                    setAddress({ ...address, use: e.target.value as AddressUse })
                  }
                >
                  {ADDRESS_USE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Line 1" htmlFor="addr-l1">
                <TextInput
                  id="addr-l1"
                  value={address.line1}
                  onChange={(e) =>
                    setAddress({ ...address, line1: e.target.value })
                  }
                  placeholder="123 Maple Ave"
                />
              </Field>
              <Field label="City" htmlFor="addr-city">
                <TextInput
                  id="addr-city"
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                />
              </Field>
              <Field label="State" htmlFor="addr-state">
                <TextInput
                  id="addr-state"
                  value={address.state}
                  onChange={(e) =>
                    setAddress({ ...address, state: e.target.value })
                  }
                />
              </Field>
              <Field label="Postal code" htmlFor="addr-zip">
                <TextInput
                  id="addr-zip"
                  value={address.postal_code}
                  onChange={(e) =>
                    setAddress({ ...address, postal_code: e.target.value })
                  }
                />
              </Field>
              <Field label="Country" htmlFor="addr-country">
                <TextInput
                  id="addr-country"
                  value={address.country}
                  onChange={(e) =>
                    setAddress({ ...address, country: e.target.value })
                  }
                />
              </Field>
            </div>
          )}
        </OptionalSection>
      </div>
    </Modal>
  )
}

function OptionalSection({
  title,
  added,
  onAdd,
  onRemove,
  children,
}: {
  title: string
  added: boolean
  onAdd: () => void
  onRemove: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="text-xs text-muted-foreground/80">Optional</p>
        </div>
        {added ? (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Minus className="h-3.5 w-3.5" data-icon="inline-start" />
            Remove
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" data-icon="inline-start" />
            Add {title.toLowerCase()}
          </Button>
        )}
      </div>
      {added && <div className="mt-3">{children}</div>}
    </div>
  )
}
