'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from '@base-ui/react/select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

// Themed Select built on Base UI. Options render inside a themed popup using the
// app's `popover` / `popover-foreground` tokens, so option text meets WCAG AA
// contrast in both light and dark mode (unlike a native <select> whose option
// list is painted by the OS and ignores our theme). Highlighted (keyboard /
// hover) and selected states are clearly visible.

function Select<Value>(props: SelectPrimitive.Root.Props<Value>) {
  return <SelectPrimitive.Root {...props} />
}

function SelectTrigger({
  className,
  children,
  invalid,
  ...props
}: SelectPrimitive.Trigger.Props & { invalid?: boolean }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-input border border-input bg-background px-3 text-sm text-foreground transition-colors',
        'focus-visible:border-aqua/60 focus-visible:outline-none',
        'data-[popup-open]:border-aqua/60',
        invalid && 'border-destructive',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Value />
      <SelectPrimitive.Icon className="flex shrink-0 text-muted-foreground">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.Icon>
      {children}
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  ...props
}: SelectPrimitive.Popup.Props) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side="bottom"
        sideOffset={4}
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'z-50 max-h-(--available-height) min-w-(--anchor-width) origin-(--transform-origin) overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden',
            'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
            className,
          )}
          {...props}
        >
          {children}
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({
  className,
  children,
  ...props
}: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-md py-1.5 pl-2 pr-8 text-sm text-popover-foreground outline-none',
        // Highlighted (keyboard nav / hover) — clear, AA-contrast surface.
        'data-[highlighted]:bg-aqua/15 data-[highlighted]:text-popover-foreground',
        // Selected — persistent aqua accent.
        'data-[selected]:font-medium data-[selected]:text-aqua',
        // Disabled (no slots remaining).
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem }
