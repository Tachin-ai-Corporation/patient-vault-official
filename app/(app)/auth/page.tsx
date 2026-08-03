"use client"

import type React from "react"
import Image from "next/image"
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { withAuthParams } from "@/lib/auth-branding"
import { useTheme } from "@/components/theme-provider"

type AuthState = "idle" | "loading" | "success" | "error" | "manual-entry"
type Environment = "demo" | "prod"

interface AuthError {
  title: string
  message: string
}

// User-facing 1health login pages that deep-link straight into the Patient Vault
// app. Used only for the "Go to 1health" / "Go to Demo/Production" buttons.
// These are bases only — `withAuthParams` appends the Patient Vault brandingId
// and the active light/dark mode so the hosted login screen matches this app.
const LOGIN_BASES: Record<Environment, string> = {
  demo: "https://1health.demo.1health.io/login?openApp=Patient%20Vault",
  prod: "https://1health.app.1health.io/login?openApp=Patient%20Vault",
}

function detectEnvironmentFromReferrer(): Environment | null {
  if (typeof document === "undefined" || !document.referrer) return null
  try {
    const referrerHostname = new URL(document.referrer).hostname
    if (referrerHostname.includes("demo.1health")) return "demo"
    if (referrerHostname.includes("app.1health")) return "prod"
  } catch {
    // Invalid referrer URL
  }
  return null
}

function getEnvironmentFromCookie(): Environment | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/onehealth_environment=([^;]+)/)
  if (!match) return null
  const value = decodeURIComponent(match[1])
  return value === "demo" || value === "prod" ? value : null
}

// Animated logo component with state transitions
function AnimatedLogo({ state }: { state: "idle" | "loading" | "success" }) {
  const [showCheck, setShowCheck] = useState(false)
  const [logoHidden, setLogoHidden] = useState(false)

  useEffect(() => {
    if (state === "success") {
      // Start shrinking the logo
      const shrinkTimer = setTimeout(() => {
        setLogoHidden(true)
      }, 50)
      // Show checkmark after logo shrinks
      const checkTimer = setTimeout(() => {
        setShowCheck(true)
      }, 350)
      return () => {
        clearTimeout(shrinkTimer)
        clearTimeout(checkTimer)
      }
    }
  }, [state])

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      {/* Logo - pulses during loading, shrinks on success */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all ${
          state === "loading" ? "animate-pulse-subtle" : ""
        } ${logoHidden ? "animate-shrink-out" : ""}`}
      >
        <Image
          src="/1h-icon.png"
          alt="1health"
          width={96}
          height={96}
          className="rounded-2xl shadow-lg"
          priority
        />
      </div>

      {/* Checkmark - pops in after logo shrinks */}
      {showCheck && (
        <div className="absolute inset-0 flex items-center justify-center animate-pop-in">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

// Login confirmation with 1health can lag by a moment on the first attempt
// (the one-time code needs to propagate on their side), so a transient failure
// is expected rather than a real error. We quietly retry a few times before
// ever surfacing the error screen.
const MAX_AUTH_ATTEMPTS = 5
const AUTH_RETRY_DELAY_MS = 1500

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function AuthContent() {
  const [authState, setAuthState] = useState<AuthState>("idle")
  const [error, setError] = useState<AuthError | null>(null)
  const [manualLpl, setManualLpl] = useState("")
  const [environment, setEnvironment] = useState<Environment | null>(null)
  // True once we've had to retry at least once, so we can reassure the user
  // that the wait is normal instead of implying something went wrong.
  const [isConfirming, setIsConfirming] = useState(false)
  const searchParams = useSearchParams()
  const { theme } = useTheme()

  // Outbound 1health login links, carrying brandingId + the active mode.
  const loginUrls: Record<Environment, string> = {
    demo: withAuthParams(LOGIN_BASES.demo, theme),
    prod: withAuthParams(LOGIN_BASES.prod, theme),
  }

  const lpl = (searchParams.get("lpl") || "").replace(/ /g, "+")

  // Auto-detect environment on mount
  useEffect(() => {
    const fromReferrer = detectEnvironmentFromReferrer()
    if (fromReferrer) {
      setEnvironment(fromReferrer)
      return
    }
    const fromCookie = getEnvironmentFromCookie()
    if (fromCookie) {
      setEnvironment(fromCookie)
    }
  }, [])

  // The server detects an LPL's environment by decrypting it with both keys.
  useEffect(() => {
    if (lpl) {
      void processLpl(lpl)
    } else if (environment) {
      setAuthState("manual-entry")
    }
  }, [environment, lpl])

  async function processLpl(lplValue: string) {
    if (!lplValue) return

    setAuthState("loading")
    setIsConfirming(false)

    let lastError: AuthError = {
      title: "Authentication Failed",
      message: "Unable to authenticate. Please return to 1health and try again.",
    }

    for (let attempt = 1; attempt <= MAX_AUTH_ATTEMPTS; attempt++) {
      try {
        const res = await fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lpl: lplValue }),
        })

        const data = await res.json()

        if (res.ok && data.access_token) {
          if (data.environment === "demo" || data.environment === "prod") {
            setEnvironment(data.environment)
          }
          setIsConfirming(false)
          setAuthState("success")
          const redirectRoute = process.env.NEXT_PUBLIC_DEFAULT_LAUNCH_REDIRECT_ROUTE || "/"

          setTimeout(() => {
            // Hard navigation (not router.push): a full-page load discards any
            // in-memory SWR caches from a previous session so identity, tenant, and
            // the patient list all re-bootstrap from the freshly written cookies.
            // This fixes stale previous-user patients and makes the onboarding gate
            // evaluate immediately without a manual hard refresh.
            window.location.assign(redirectRoute)
          }, 1200) // Allow time for success animation
          return
        }

        // Record why this attempt failed so we can show it if all retries fail.
        lastError = res.ok
          ? {
              title: "Invalid Response",
              message: "No access token received. Please return to 1health and try again.",
            }
          : {
              title: "Authentication Failed",
              message: data.error || "Unable to authenticate. Please return to 1health and try again.",
            }

        // Some failures are permanent (bad/expired payload) — no point retrying.
        if (data?.retryable === false) break
      } catch {
        lastError = {
          title: "Connection Error",
          message: "Unable to connect to the authentication service. Please check your connection and try again.",
        }
      }

      // Still have attempts left: reassure the user and wait before retrying.
      if (attempt < MAX_AUTH_ATTEMPTS) {
        setIsConfirming(true)
        await delay(AUTH_RETRY_DELAY_MS)
      }
    }

    setIsConfirming(false)
    setAuthState("error")
    setError(lastError)
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (manualLpl.trim() && environment) {
      processLpl(manualLpl.trim().replace(/ /g, "+"))
    }
  }

  const returnUrl = environment ? loginUrls[environment] : null

  // Environment selection screen
  if (!environment && authState !== "loading" && authState !== "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo at top of environment selection */}
          <div className="flex justify-center mb-8">
            <Image
              src="/1h-icon.png"
              alt="1health"
              width={80}
              height={80}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>

          <Card className="border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Choose Environment</CardTitle>
              <CardDescription>
                Select which 1health environment to connect to.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Button
                variant="outline"
                className="h-16 text-lg justify-between"
                onClick={() => setEnvironment("demo")}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Demo</span>
                  <span className="text-xs text-muted-foreground">demo.1health.io</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="h-16 text-lg justify-between"
                onClick={() => setEnvironment("prod")}
              >
                <div className="flex flex-col items-start">
                  <span className="font-semibold">Production</span>
                  <span className="text-xs text-muted-foreground">app.1health.io</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                {"Prefer to log in via 1health directly?"}
              </p>
              <div className="flex gap-2">
                <a
                  href={loginUrls.demo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'flex-1' })}
                >
                  Go to Demo <ExternalLink className="ml-1 h-3 w-3" />
                </a>
                <a
                  href={loginUrls.prod}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'flex-1' })}
                >
                  Go to Production <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Loading and success states with animated logo
  if (authState === "loading" || authState === "success") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AnimatedLogo state={authState} />
        <div className="mt-6 text-center">
          {authState === "loading" && (
            <>
              <h2 className="text-xl font-semibold text-foreground">
                {isConfirming ? "Confirming your login..." : "Authenticating..."}
              </h2>
              <p className="text-muted-foreground mt-1">
                {isConfirming
                  ? "This can take a moment. Please wait while we finish confirming your login."
                  : `Connecting to ${environment === "demo" ? "Demo" : "Production"} environment`}
              </p>
            </>
          )}
          {authState === "success" && (
            <>
              <h2 className="text-xl font-semibold text-foreground">Success!</h2>
              <p className="text-muted-foreground mt-1">Loading app...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (authState === "error" && error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Image
              src="/1h-icon.png"
              alt="1health"
              width={64}
              height={64}
              className="rounded-xl shadow-md opacity-50"
            />
          </div>
          <div className="flex flex-col gap-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{error.title}</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => setAuthState("manual-entry")}>
                Enter LPL Manually
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEnvironment(null)
                  setAuthState("idle")
                  setError(null)
                }}
              >
                Switch Environment
              </Button>
              {returnUrl && (
                <a
                  href={returnUrl}
                  className={buttonVariants()}
                >
                  Go to 1health ({environment === "demo" ? "Demo" : "Production"})
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Manual entry state
  if (authState === "manual-entry") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Image
              src="/1h-icon.png"
              alt="1health"
              width={64}
              height={64}
              className="rounded-xl shadow-md"
            />
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Authentication Required</CardTitle>
              <CardDescription>
                Connected to <span className="font-medium">{environment === "demo" ? "Demo" : "Production"}</span> environment.
                No launch payload detected.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="lpl">Launch Payload (LPL)</Label>
                  <Input
                    id="lpl"
                    type="text"
                    placeholder="Paste encrypted LPL here..."
                    value={manualLpl}
                    onChange={(e) => setManualLpl(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={!manualLpl.trim()}>
                  Submit
                </Button>
              </form>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {returnUrl && (
                  <a
                    href={returnUrl}
                    className={buttonVariants({ variant: 'outline' })}
                  >
                    Go to 1health ({environment === "demo" ? "Demo" : "Production"})
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEnvironment(null)
                    setAuthState("idle")
                    setError(null)
                  }}
                >
                  Switch Environment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Idle state (initializing)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <AnimatedLogo state="loading" />
      <p className="text-muted-foreground mt-6">Initializing...</p>
    </div>
  )
}

export default function Auth() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
          <Image
            src="/1h-icon.png"
            alt="1health"
            width={96}
            height={96}
            className="rounded-2xl shadow-lg animate-pulse-subtle"
            priority
          />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  )
}
