import { ConsoleApiKey } from '@/components/console/console-api-key'
import { PromotionCode } from '@/components/console/promotion-code'
import { DeveloperProfile } from '@/components/console/developer-profile'
import { InspectorToggle } from '@/components/console/inspector-toggle'

// Console is the single settings surface for the developer + this vault. It
// consolidates the API key, the developer profile (name editable, email
// locked), and a link to the signed legal agreements. Observability / logs are
// intentionally NOT here — that surface is deferred to a later release (1.1).
export function ConsoleView() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          console
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Console
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Manage your API key and developer profile in one place.
        </p>
      </div>

      <ConsoleApiKey />
      <PromotionCode />
      <DeveloperProfile />
      <InspectorToggle />
    </div>
  )
}
