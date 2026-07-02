'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import {
  ADDRESS_USE_OPTIONS,
  CONTACT_SYSTEM_OPTIONS,
  CONTACT_USE_OPTIONS,
  type Address,
  type Contact,
  type Provider,
} from '@/lib/patient-data'

export type RelatedKind = 'contact' | 'address' | 'provider'
export type RelatedValue = Contact | Address | Provider

const EMPTY: Record<RelatedKind, RelatedValue> = {
  contact: { system: 'phone', value: '', use: 'mobile' } as Contact,
  address: {
    use: 'home',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  } as Address,
  provider: { name: '', role: '', npi: '' } as Provider,
}

const TITLES: Record<RelatedKind, string> = {
  contact: 'contact',
  address: 'address',
  provider: 'provider',
}

type RelatedRecordModalProps = {
  open: boolean
  kind: RelatedKind
  // When editing, the existing value; when adding, null.
  initial: RelatedValue | null
  onClose: () => void
  onSave: (value: RelatedValue) => void
}

export function RelatedRecordModal({
  open,
  kind,
  initial,
  onClose,
  onSave,
}: RelatedRecordModalProps) {
  const editing = initial != null
  const [value, setValue] = useState<RelatedValue>(initial ?? EMPTY[kind])

  useEffect(() => {
    if (!open) return
    setValue(initial ?? EMPTY[kind])
  }, [open, kind, initial])

  function handleSubmit() {
    onSave(value)
    onClose()
  }

  const title = `${editing ? 'Edit' : 'Add'} ${TITLES[kind]}`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      className="max-w-lg"
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
            {editing ? 'Save changes' : `Add ${TITLES[kind]}`}
          </Button>
        </>
      }
    >
      {kind === 'contact' && (
        <ContactFields
          value={value as Contact}
          onChange={(v) => setValue(v)}
        />
      )}
      {kind === 'address' && (
        <AddressFields
          value={value as Address}
          onChange={(v) => setValue(v)}
        />
      )}
      {kind === 'provider' && (
        <ProviderFields
          value={value as Provider}
          onChange={(v) => setValue(v)}
        />
      )}
    </Modal>
  )
}

function ContactFields({
  value,
  onChange,
}: {
  value: Contact
  onChange: (v: Contact) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="System" htmlFor="rc-system">
        <Select
          id="rc-system"
          value={value.system}
          onChange={(e) =>
            onChange({ ...value, system: e.target.value as Contact['system'] })
          }
        >
          {CONTACT_SYSTEM_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Value" htmlFor="rc-value">
        <TextInput
          id="rc-value"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          placeholder={
            value.system === 'email' ? 'name@example.com' : '+15555551234'
          }
          className="font-mono"
        />
      </Field>
      <Field label="Use" htmlFor="rc-use">
        <Select
          id="rc-use"
          value={value.use}
          onChange={(e) =>
            onChange({ ...value, use: e.target.value as Contact['use'] })
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
  )
}

function AddressFields({
  value,
  onChange,
}: {
  value: Address
  onChange: (v: Address) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Use" htmlFor="ra-use">
        <Select
          id="ra-use"
          value={value.use}
          onChange={(e) =>
            onChange({ ...value, use: e.target.value as Address['use'] })
          }
        >
          {ADDRESS_USE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Line 1" htmlFor="ra-l1">
        <TextInput
          id="ra-l1"
          value={value.line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
          placeholder="123 Maple Ave"
        />
      </Field>
      <Field label="Line 2" htmlFor="ra-l2">
        <TextInput
          id="ra-l2"
          value={value.line2}
          onChange={(e) => onChange({ ...value, line2: e.target.value })}
          placeholder="Apt 4B"
        />
      </Field>
      <Field label="City" htmlFor="ra-city">
        <TextInput
          id="ra-city"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
        />
      </Field>
      <Field label="State" htmlFor="ra-state">
        <TextInput
          id="ra-state"
          value={value.state}
          onChange={(e) => onChange({ ...value, state: e.target.value })}
        />
      </Field>
      <Field label="Postal code" htmlFor="ra-zip">
        <TextInput
          id="ra-zip"
          value={value.postal_code}
          onChange={(e) => onChange({ ...value, postal_code: e.target.value })}
        />
      </Field>
      <Field label="Country" htmlFor="ra-country">
        <TextInput
          id="ra-country"
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value })}
        />
      </Field>
    </div>
  )
}

function ProviderFields({
  value,
  onChange,
}: {
  value: Provider
  onChange: (v: Provider) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Name" htmlFor="rp-name">
        <TextInput
          id="rp-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Dr. Anita Rao"
        />
      </Field>
      <Field label="Role" htmlFor="rp-role">
        <TextInput
          id="rp-role"
          value={value.role}
          onChange={(e) => onChange({ ...value, role: e.target.value })}
          placeholder="Primary Care Physician"
        />
      </Field>
      <Field label="NPI" htmlFor="rp-npi">
        <TextInput
          id="rp-npi"
          value={value.npi}
          onChange={(e) => onChange({ ...value, npi: e.target.value })}
          className="font-mono"
          placeholder="1234567890"
        />
      </Field>
    </div>
  )
}
