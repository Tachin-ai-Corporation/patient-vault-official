'use client'

import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, Select, TextInput } from '@/components/ui/field'
import {
  useCustomFields,
  validateJsonValue,
} from '@/lib/custom-fields-context'
import { CustomFieldInputs } from '@/components/patients/custom-field-inputs'
import {
  ADDRESS_USE_OPTIONS,
  CONTACT_SYSTEM_OPTIONS,
  CONTACT_USE_OPTIONS,
  ETHNICITY_OPTIONS,
  GENDER_IDENTITY_OPTIONS,
  LANGUAGE_OPTIONS,
  PRONOUN_OPTIONS,
  RACE_OPTIONS,
  SEX_AT_BIRTH_OPTIONS,
  generatePatientId,
  type Address,
  type Coded,
  type Contact,
  type Patient,
  type Provider,
  type SexAtBirth,
} from '@/lib/patient-data'

type AddPatientModalProps = {
  open: boolean
  onClose: () => void
  onAdd: (patient: Patient) => void
}

const emptyAddress: Address = {
  use: 'home',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
}
const emptyContact: Contact = { system: 'phone', value: '', use: 'mobile' }
const emptyProvider: Provider = { name: '', role: '', npi: '' }

export function AddPatientModal({ open, onClose, onAdd }: AddPatientModalProps) {
  const { fields, setValuesForPatient } = useCustomFields()
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({})

  const [given, setGiven] = useState('')
  const [family, setFamily] = useState('')
  const [dob, setDob] = useState('')
  const [sex, setSex] = useState<SexAtBirth>('Unknown')
  const [gender, setGender] = useState(GENDER_IDENTITY_OPTIONS[0])
  const [pronouns, setPronouns] = useState(PRONOUN_OPTIONS[0])
  const [raceCode, setRaceCode] = useState(RACE_OPTIONS[0].code)
  const [ethnicityCode, setEthnicityCode] = useState(ETHNICITY_OPTIONS[0].code)
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0].code)

  const [address, setAddress] = useState<Address | null>(null)
  const [contact, setContact] = useState<Contact | null>(null)
  const [provider, setProvider] = useState<Provider | null>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})

  function reset() {
    setGiven('')
    setFamily('')
    setDob('')
    setSex('Unknown')
    setGender(GENDER_IDENTITY_OPTIONS[0])
    setPronouns(PRONOUN_OPTIONS[0])
    setRaceCode(RACE_OPTIONS[0].code)
    setEthnicityCode(ETHNICITY_OPTIONS[0].code)
    setLanguage(LANGUAGE_OPTIONS[0].code)
    setAddress(null)
    setContact(null)
    setProvider(null)
    setCustomValues({})
    setCustomErrors({})
    setErrors({})
  }

  function handleClose() {
    reset()
    onClose()
  }

  function findCoded(options: Coded[], code: string): Coded {
    return options.find((o) => o.code === code) ?? options[0]
  }

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

    const patient: Patient = {
      id: generatePatientId(),
      given_name: given.trim(),
      family_name: family.trim(),
      date_of_birth: dob,
      sex_at_birth: sex,
      gender_identity: gender,
      pronouns,
      race: findCoded(RACE_OPTIONS, raceCode),
      ethnicity: findCoded(ETHNICITY_OPTIONS, ethnicityCode),
      preferred_language: language,
      deceased: false,
      addresses: address ? [address] : [],
      contacts: contact ? [contact] : [],
      providers: provider ? [provider] : [],
      attachments: [],
      attachment_count: 0,
      created_at: new Date().toISOString(),
    }
    // Persist any custom field values against the new patient id (mock/local).
    if (fields.length > 0) {
      setValuesForPatient(patient.id, customValues)
    }
    onAdd(patient)
    reset()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add patient"
      description="Create a single record. Coded fields store both a human label and the standard code."
      className="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" data-icon="inline-start" />
            Add patient
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
                  {o}
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
              {GENDER_IDENTITY_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pronouns" htmlFor="pronouns">
            <Select
              id="pronouns"
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
                  {o.label} ({o.code})
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
                  {o.label} ({o.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Preferred language" htmlFor="language" className="col-span-2">
            <Select
              id="language"
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

        {/* Optional related records */}
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
                    setAddress({ ...address, use: e.target.value as Address['use'] })
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

        <OptionalSection
          title="Contact"
          added={!!contact}
          onAdd={() => setContact({ ...emptyContact })}
          onRemove={() => setContact(null)}
        >
          {contact && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="System" htmlFor="c-system">
                <Select
                  id="c-system"
                  value={contact.system}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      system: e.target.value as Contact['system'],
                    })
                  }
                >
                  {CONTACT_SYSTEM_OPTIONS.map((o) => (
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
                  placeholder={contact.system === 'email' ? 'name@example.com' : '+15555551234'}
                />
              </Field>
              <Field label="Use" htmlFor="c-use">
                <Select
                  id="c-use"
                  value={contact.use}
                  onChange={(e) =>
                    setContact({ ...contact, use: e.target.value as Contact['use'] })
                  }
                >
                  {CONTACT_USE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          )}
        </OptionalSection>

        <OptionalSection
          title="Provider"
          added={!!provider}
          onAdd={() => setProvider({ ...emptyProvider })}
          onRemove={() => setProvider(null)}
        >
          {provider && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Name" htmlFor="p-name">
                <TextInput
                  id="p-name"
                  value={provider.name}
                  onChange={(e) =>
                    setProvider({ ...provider, name: e.target.value })
                  }
                  placeholder="Dr. Anita Rao"
                />
              </Field>
              <Field label="Role" htmlFor="p-role">
                <TextInput
                  id="p-role"
                  value={provider.role}
                  onChange={(e) =>
                    setProvider({ ...provider, role: e.target.value })
                  }
                  placeholder="Primary Care Physician"
                />
              </Field>
              <Field label="NPI" htmlFor="p-npi">
                <TextInput
                  id="p-npi"
                  value={provider.npi}
                  onChange={(e) =>
                    setProvider({ ...provider, npi: e.target.value })
                  }
                  className="font-mono"
                  placeholder="1234567890"
                />
              </Field>
            </div>
          )}
        </OptionalSection>

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
          idPrefix="add-cf"
        />
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
