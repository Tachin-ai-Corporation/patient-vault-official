'use client'

import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTheme } from '@/components/theme-provider'
import { BRANDING_ID } from '@/lib/auth-branding'
import { useSession } from '@/lib/session-context'

function buildRegistrationUrl(mode: 'dark' | 'light'): string {
  const registrationUrl = new URL('/register', 'https://1health.app.1health.io')
  const parameters = new URLSearchParams({
    openApp: 'Patient Vault',
    brandingId: BRANDING_ID,
    mode,
  })
  registrationUrl.search = parameters.toString()
  return registrationUrl.toString()
}

export function GoToProduction() {
  const { theme } = useTheme()
  const { currentEnv, productionAccountState } = useSession()

  function createProductionAccount() {
    window.location.assign(buildRegistrationUrl(theme))
  }

  if (
    currentEnv === 'staging' &&
    productionAccountState !== 'not_registered'
  ) {
    return null
  }

  if (currentEnv === 'production') {
    return (
      <section aria-labelledby="patient-vault-production-title">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle
              id="patient-vault-production-title"
              className="text-xl text-balance"
            >
              Patient Vault production
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-foreground text-pretty">
              Your production account is active. Patient Vault production access
              is not yet enabled.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
              The API will become available on this account when it ships.
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section aria-labelledby="going-to-production-title">
      <Card className="border-primary/30 bg-primary/5 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" />
          </div>
          <CardTitle
            id="going-to-production-title"
            className="text-xl text-balance"
          >
            Going to production
          </CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Staging and production are completely separate systems, firewalled
            from each other because patient data is regulated. Nothing transfers
            automatically between them, including records, documents, settings,
            or other data.
          </p>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-background p-4">
            <LockKeyhole
              className="mt-0.5 size-5 shrink-0 text-primary"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                A separate production account
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                Create your production account separately using the same email
                address. At your first production login, the 1health platform
                will present the business associate agreement for review and
                acceptance.
              </p>
            </div>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Patient Vault production availability is opening soon. Production
            accounts created now will have access as soon as it lands.
          </p>
        </CardContent>

        <CardFooter className="justify-end border-t">
          <Button type="button" onClick={createProductionAccount}>
            Create production account
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}
