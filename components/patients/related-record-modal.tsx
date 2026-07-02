'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import {
  ADDRESS_USE_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  type ContactType,
  type AddressUse,
} from '@/lib/patient-data'

// The related records the API can persist as sub-resources of a patient.
export type RelatedKind = 'contact' | 'address'

export type ContactDraft = {
  type: ContactType
  value: string
  label: string
  isPrimary: boolean
}

export type AddressDraft = {
  use: AddressUse
  line1: string
  line2: string
  city: string
  state: string
  postal_code: string
  country: string
  primary: boolean
}

export type RelatedValue = ContactDraft | AddressDraft

const EMPTY_CONTACT: ContactDraft = {
  type: 'mobile',
  value: '',
  label: '',
  isPrimary: false,
}
const EMPTY_ADDRESS: AddressDraft = {
  use: 'home',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'United States',
  primary: false,
}

type RelatedRecordModalProps = {
  open: boolean
  kind: RelatedKind
  onClose: () => void
  onSave: (value: RelatedValue) => void
}

export function RelatedRecordModal({
  open,
  kind,
  onClose,
  onSave,
}: RelatedRecordModalProps) {
  const [contact, setContact] = useState<ContactDraft>(EMPTY_CONTACT)
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS)

  useEffect(() => {
    if (!open) return
    setContact(EMPTY_CONTACT)
    setAddress(EMPTY_ADDRESS)
  }, [open, kind])

  function handleSubmit() {
    onSave(kind === 'contact' ? contact : address)
    onClose()
  }

  const title = `Add ${kind}`

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
            Add {kind}
          </Button>
        </>
      }
    >
      {kind === 'contact' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" htmlFor="rc-type">
            <Select
              id="rc-type"
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
          <Field label="Value" htmlFor="rc-value">
            <TextInput
              id="rc-value"
              value={contact.value}
              onChange={(e) => setContact({ ...contact, value: e.target.value })}
              placeholder={
                contact.type === 'email' ? 'name@example.com' : '+15555551234'
              }
              className="font-mono"
            />
          </Field>
          <Field label="Label" htmlFor="rc-label">
            <TextInput
              id="rc-label"
              value={contact.label}
              onChange={(e) => setContact({ ...contact, label: e.target.value })}
              placeholder="Personal"
            />
          </Field>
          <Field label="Primary" htmlFor="rc-primary">
            <Select
              id="rc-primary"
              value={contact.isPrimary ? 'yes' : 'no'}
              onChange={(e) =>
                setContact({ ...contact, isPrimary: e.target.value === 'yes' })
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Use" htmlFor="ra-use">
            <Select
              id="ra-use"
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
          <Field label="Line 1" htmlFor="ra-l1">
            <TextInput
              id="ra-l1"
              value={address.line1}
              onChange={(e) => setAddress({ ...address, line1: e.target.value })}
              placeholder="123 Maple Ave"
            />
          </Field>
          <Field label="Line 2" htmlFor="ra-l2">
            <TextInput
              id="ra-l2"
              value={address.line2}
              onChange={(e) => setAddress({ ...address, line2: e.target.value })}
              placeholder="Apt 4B"
            />
          </Field>
          <Field label="City" htmlFor="ra-city">
            <TextInput
              id="ra-city"
              value={address.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
          </Field>
          <Field label="State" htmlFor="ra-state">
            <TextInput
              id="ra-state"
              value={address.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
          </Field>
          <Field label="Postal code" htmlFor="ra-zip">
            <TextInput
              id="ra-zip"
              value={address.postal_code}
              onChange={(e) =>
                setAddress({ ...address, postal_code: e.target.value })
              }
            />
          </Field>
          <Field label="Country" htmlFor="ra-country">
            <TextInput
              id="ra-country"
              value={address.country}
              onChange={(e) =>
                setAddress({ ...address, country: e.target.value })
              }
            />
          </Field>
        </div>
      )}
    </Modal>
  )
}
