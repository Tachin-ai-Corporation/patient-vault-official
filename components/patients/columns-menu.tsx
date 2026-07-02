'use client'

import { SlidersHorizontal } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { type GridColumn } from '@/lib/grid-columns'

type ColumnsMenuProps = {
  columns: GridColumn[]
  isVisible: (key: string) => boolean
  onToggle: (key: string) => void
  onSelectAll: () => void
  onReset: () => void
}

export function ColumnsMenu({
  columns,
  isVisible,
  onToggle,
  onSelectAll,
  onReset,
}: ColumnsMenuProps) {
  return (
    <Popover>
      <PopoverTrigger className={buttonVariants({ variant: 'outline' })}>
        <SlidersHorizontal className="h-4 w-4" data-icon="inline-start" />
        Columns
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">Columns</p>
          <p className="text-xs text-muted-foreground">
            Choose which columns to show
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {columns.map((col) => {
            const checked = isVisible(col.key)
            const id = `col-${col.key}`
            return (
              <Label
                key={col.key}
                htmlFor={id}
                className={`flex items-center gap-2.5 rounded-input px-2 py-2 text-sm font-normal text-foreground ${
                  col.pinned
                    ? 'cursor-default opacity-80'
                    : 'cursor-pointer hover:bg-muted/60'
                }`}
              >
                <Checkbox
                  id={id}
                  checked={checked}
                  disabled={col.pinned}
                  onCheckedChange={() => onToggle(col.key)}
                />
                <span className="flex-1">{col.label}</span>
                {col.pinned && (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                    pinned
                  </span>
                )}
              </Label>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onSelectAll}
          >
            Select all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={onReset}
          >
            Reset to default
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
