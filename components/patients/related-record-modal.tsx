'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Field, Select, TextInput } from '@/components/ui/field'
import {
  ADDRESS_USE_OPTIONS,
  CONTACT_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
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
  // May be async; the modal only closes once it resolves without throwing, so a
  // server-side rejection keeps the dialog open with the user's input intact.
  onSave: (value: RelatedValue) => void | Promise<void>
  // When provided, the modal opens in edit mode: fields are pre-filled with the
  // existing record and the submit action reads as "Save" instead of "Add".
  initial?: RelatedValue | null
}

export function RelatedRecordModal({
  open,
  kind,
  onClose,
  onSave,
  initial = null,
}: RelatedRecordModalProps) {
  const isEdit = initial != null
  const [contact, setContact] = useState<ContactDraft>(EMPTY_CONTACT)
  const [address, setAddress] = useState<AddressDraft>(EMPTY_ADDRESS)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    // Seed from the record being edited, or reset to blank for a new one.
    if (kind === 'contact') {
      setContact(initial ? (initial as ContactDraft) : EMPTY_CONTACT)
    } else {
      setAddress(initial ? (initial as AddressDraft) : EMPTY_ADDRESS)
    }
    setErrors({})
  }, [open, kind, initial])

  async function handleSubmit() {
    // Enforce the fields the v3 API marks required so an incomplete record is
    // never POSTed. Address requires line1, city, state, and postalCode (a
    // missing state is what the API rejects with a 400); a contact requires a
    // value. This mirrors the add-patient and demographics modals.
    const nextErrors: Record<string, string> = {}
    if (kind === 'contact') {
      if (!contact.value.trim()) nextErrors.value = 'Contact value is required.'
    } else {
      if (!address.line1.trim()) nextErrors.line1 = 'Line 1 is required.'
      if (!address.city.trim()) nextErrors.city = 'City is required.'
      if (!address.state.trim()) nextErrors.state = 'State is required.'
      if (!address.postal_code.trim())
        nextErrors.postal_code = 'Postal code is required.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      await onSave(kind === 'contact' ? contact : address)
      onClose()
    } catch {
      // The parent surfaces the API error via a notice; keep the modal open so
      // the user can correct their input rather than lose it.
    }
  }

  const title = `${isEdit ? 'Edit' : 'Add'} ${kind}`

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
            {isEdit ? 'Save' : 'Add'} {kind}
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
          <Field label="Value" htmlFor="rc-value" error={errors.value}>
            <TextInput
              id="rc-value"
              value={contact.value}
              invalid={!!errors.value}
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
          <Field label="Line 1" htmlFor="ra-l1" error={errors.line1}>
            <TextInput
              id="ra-l1"
              value={address.line1}
              invalid={!!errors.line1}
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
          <Field label="City" htmlFor="ra-city" error={errors.city}>
            <TextInput
              id="ra-city"
              value={address.city}
              invalid={!!errors.city}
              onChange={(e) => setAddress({ ...address, city: e.target.value })}
            />
          </Field>
          <Field label="State" htmlFor="ra-state" error={errors.state}>
            <TextInput
              id="ra-state"
              value={address.state}
              invalid={!!errors.state}
              onChange={(e) => setAddress({ ...address, state: e.target.value })}
            />
          </Field>
          <Field label="Postal code" htmlFor="ra-zip" error={errors.postal_code}>
            <TextInput
              id="ra-zip"
              value={address.postal_code}
              invalid={!!errors.postal_code}
              onChange={(e) =>
                setAddress({ ...address, postal_code: e.target.value })
              }
            />
          </Field>
          <Field label="Country" htmlFor="ra-country">
            <Select
              id="ra-country"
              value={address.country}
              onChange={(e) =>
                setAddress({ ...address, country: e.target.value })
              }
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
    </Modal>
  )
}
