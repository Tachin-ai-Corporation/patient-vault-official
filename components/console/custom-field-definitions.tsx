'use client'

import { Braces, Download, FileText } from 'lucide-react'
import { EnvBadge } from '@/components/env-badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { MOCK_CUSTOM_FIELD_NAMES } from '@/lib/mock-custom-fields'
import { useSession } from '@/lib/session-context'

function downloadFile(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function toMarkdown(fields: string[], environment: string) {
  const rows = fields.map((name, index) => `| ${index + 1} | ${name.replaceAll('|', '\\|')} |`)

  return [
    '# Custom field definitions',
    '',
    `Environment: ${environment}`,
    '',
    '| # | Field name |',
    '| ---: | --- |',
    ...rows,
    '',
  ].join('\n')
}

export function CustomFieldDefinitions() {
  const { currentEnv } = useSession()
  const fields = MOCK_CUSTOM_FIELD_NAMES
  const count = fields.length
  const filenameBase = `patient-vault-${currentEnv}-custom-fields`

  function downloadJson() {
    downloadFile(
      `${filenameBase}.json`,
      `${JSON.stringify(fields, null, 2)}\n`,
      'application/json',
    )
  }

  function downloadMarkdown() {
    downloadFile(
      `${filenameBase}.md`,
      toMarkdown(fields, currentEnv),
      'text/markdown',
    )
  }

  return (
    <section aria-labelledby="custom-fields-title">
      <Card className="shadow-none">
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-primary">
                <Braces aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle id="custom-fields-title" className="text-lg text-balance">
                    Custom field definitions
                  </CardTitle>
                  <EnvBadge env={currentEnv} />
                </div>
                <CardDescription className="max-w-2xl text-pretty">
                  Keep a copy of your custom field definitions for this environment.
                </CardDescription>
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm text-muted-foreground">
              {count} {count === 1 ? 'field' : 'fields'}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          {count === 0 ? (
            <p className="text-sm text-muted-foreground">No custom fields defined.</p>
          ) : (
            <ul className="flex flex-col gap-2" aria-label="Custom field definitions">
              {fields.map((field) => (
                <li
                  key={field}
                  className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                >
                  {field}
                </li>
              ))}
            </ul>
          )}
        </CardContent>

        {count > 0 && (
          <CardFooter className="justify-end gap-2 border-t">
            <Button type="button" variant="outline" onClick={downloadJson}>
              <Download data-icon="inline-start" aria-hidden="true" />
              JSON
            </Button>
            <Button type="button" variant="outline" onClick={downloadMarkdown}>
              <FileText data-icon="inline-start" aria-hidden="true" />
              Markdown
            </Button>
          </CardFooter>
        )}
      </Card>
    </section>
  )
}
