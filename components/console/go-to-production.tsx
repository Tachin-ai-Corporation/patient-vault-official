'use client'

import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useTheme } from '@/components/theme-provider'
import { withAuthParams } from '@/lib/auth-branding'
import { useSession } from '@/lib/session-context'

export function GoToProduction() {
  const { theme } = useTheme()
  const { currentEnv } = useSession()

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

  const productionLoginUrl = withAuthParams(
    'https://1health.app.1health.io/login?openApp=Patient+Vault',
    theme,
  )

  return (
    <section aria-labelledby="production-account-ready-title">
      <Card className="border-primary/30 bg-primary/5 shadow-none">
        <CardHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck aria-hidden="true" />
          </div>
          <CardTitle
            id="production-account-ready-title"
            className="text-xl text-balance"
          >
            Your production account is ready
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm leading-relaxed text-foreground text-pretty">
            Your production account was created alongside this Sandbox account.
            Sign in to production to start a separate production session, then
            use the environment menu to switch between them.
          </p>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Sandbox and production are completely separate systems, firewalled
            from each other because patient data is regulated. Nothing
            transfers automatically between them. At your first production
            login, the 1health platform will present the business associate
            agreement for review and acceptance.
          </p>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button
            type="button"
            onClick={() => window.location.assign(productionLoginUrl)}
          >
            Sign in to production
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}
