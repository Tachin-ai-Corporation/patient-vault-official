import { and, eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { onehealthApplications } from '@/lib/db/schema'

type Environment = 'demo' | 'production'

type StoredApplication = {
  id: number
  name: string
  url: string
  description?: string
  state?: string
  iconUrl?: string
  launchSecretMasked?: string
}

const LEGACY_COOKIE_NAMES: Record<Environment, string> = {
  demo: 'pv_console_app_demo',
  production: 'pv_console_app_production',
}

function userIdFrom(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('userId')
  const userId = raw ? Number(raw) : Number.NaN
  return Number.isSafeInteger(userId) && userId > 0 ? userId : null
}

function cookieName(environment: Environment, userId: number) {
  return `pv_console_app_${environment}_${userId}`
}

function environmentFrom(request: NextRequest): Environment {
  return request.nextUrl.searchParams.get('environment') === 'production' ? 'production' : 'demo'
}

function apiRoot(environment: Environment) {
  return environment === 'demo' ? 'https://1health.demo.1health.io/api' : 'https://1health.app.1health.io/api'
}

function decodeStored(value?: string): StoredApplication | null {
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as StoredApplication
  } catch {
    return null
  }
}

function readStored(request: NextRequest, environment: Environment, userId: number): StoredApplication | null {
  return decodeStored(request.cookies.get(cookieName(environment, userId))?.value)
}

function readLegacyStored(request: NextRequest, environment: Environment): StoredApplication | null {
  return decodeStored(request.cookies.get(LEGACY_COOKIE_NAMES[environment])?.value)
}

async function readPersisted(userId: number, environment: Environment): Promise<StoredApplication | null> {
  const [row] = await db.select().from(onehealthApplications).where(
    and(eq(onehealthApplications.userId, String(userId)), eq(onehealthApplications.environment, environment)),
  ).limit(1)
  if (!row) return null
  return {
    id: row.applicationId,
    name: row.applicationName,
    url: row.applicationUrl,
    description: row.description ?? undefined,
    state: row.state ?? undefined,
    iconUrl: row.iconUrl ?? undefined,
    launchSecretMasked: row.launchSecretMasked ?? undefined,
  }
}

async function persist(userId: number, environment: Environment, app: StoredApplication) {
  await db.insert(onehealthApplications).values({
    userId: String(userId), environment, applicationId: app.id, applicationName: app.name,
    applicationUrl: app.url, description: app.description, state: app.state, iconUrl: app.iconUrl,
    launchSecretMasked: app.launchSecretMasked, updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [onehealthApplications.userId, onehealthApplications.environment],
    set: {
      applicationId: app.id, applicationName: app.name, applicationUrl: app.url,
      description: app.description, state: app.state, iconUrl: app.iconUrl,
      launchSecretMasked: app.launchSecretMasked, updatedAt: new Date(),
    },
  })
}

async function store(response: NextResponse, environment: Environment, userId: number, app: StoredApplication) {
  await persist(userId, environment, app)
  response.cookies.delete(cookieName(environment, userId))
}

function authorization(request: NextRequest) {
  return request.headers.get('authorization')
}

async function platformError(response: Response) {
  const text = await response.text()
  try {
    const body = JSON.parse(text) as { message?: string; error?: string }
    return body.message || body.error || text
  } catch {
    return text || response.statusText
  }
}

export async function GET(request: NextRequest) {
  const environment = environmentFrom(request)
  const userId = userIdFrom(request)
  if (!userId) return NextResponse.json({ error: 'A valid authenticated user ID is required.' }, { status: 400 })
  const persisted = await readPersisted(userId, environment)
  const scoped = readStored(request, environment, userId)
  const stored = persisted ?? scoped ?? readLegacyStored(request, environment)
  if (!stored) return NextResponse.json({ application: null })

  const auth = authorization(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = await fetch(`${apiRoot(environment)}/v2/external-application/${stored.id}`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  if (!platform.ok) {
    if (!persisted || platform.status === 404) {
      if (persisted && platform.status === 404) {
        await db.delete(onehealthApplications).where(
          and(eq(onehealthApplications.userId, String(userId)), eq(onehealthApplications.environment, environment)),
        )
      }
      const response = NextResponse.json({ application: null })
      response.cookies.delete(cookieName(environment, userId))
      response.cookies.delete(LEGACY_COOKIE_NAMES[environment])
      return response
    }
    return NextResponse.json({ error: await platformError(platform) }, { status: platform.status })
  }

  const data = await platform.json()
  const application: StoredApplication = {
    id: Number(data.id ?? stored.id),
    name: String(data.name ?? stored.name),
    url: String(data.url ?? stored.url),
    description: typeof data.description === 'string' ? data.description : stored.description,
    state: typeof data.state === 'string' ? data.state : stored.state,
    iconUrl: typeof data.iconUrl === 'string' ? data.iconUrl : stored.iconUrl,
    launchSecretMasked: typeof data.launchSecretMasked === 'string' ? data.launchSecretMasked : stored.launchSecretMasked,
  }
  const response = NextResponse.json({ application })
  await store(response, environment, userId, application)
  if (!scoped) response.cookies.delete(LEGACY_COOKIE_NAMES[environment])
  return response
}

export async function POST(request: NextRequest) {
  const environment = environmentFrom(request)
  const userId = userIdFrom(request)
  if (!userId) return NextResponse.json({ error: 'A valid authenticated user ID is required.' }, { status: 400 })
  if (await readPersisted(userId, environment)) {
    return NextResponse.json({ error: 'This environment already has a Patient Vault application.' }, { status: 409 })
  }
  const auth = authorization(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const incoming = await request.formData()
  const form = new FormData()
  for (const key of ['name', 'url', 'description', 'icon']) {
    const value = incoming.get(key)
    if (value instanceof File && value.size > 0) form.append(key, value)
    else if (typeof value === 'string' && value) form.append(key, value)
  }
  form.set('isPublic', 'false')
  form.set('isAllowedForPatients', 'false')

  const platform = await fetch(`${apiRoot(environment)}/v2/external-application`, {
    method: 'POST',
    headers: { Authorization: auth },
    body: form,
    cache: 'no-store',
  })
  if (!platform.ok) return NextResponse.json({ error: await platformError(platform) }, { status: platform.status })

  const data = await platform.json()
  const application: StoredApplication = {
    id: Number(data.id),
    name: String(incoming.get('name') ?? data.name),
    url: String(incoming.get('url') ?? ''),
    description: String(incoming.get('description') ?? ''),
    state: String(data.state ?? 'DRAFT'),
    iconUrl: data.iconUrl,
    launchSecretMasked: typeof data.launchSecretMasked === 'string' ? data.launchSecretMasked : undefined,
  }
  if (typeof data.launchSecret !== 'string' || !data.launchSecret) {
    const response = NextResponse.json({ error: 'The application was created, but its one-time key was not returned. Contact support before continuing.' }, { status: 502 })
    await store(response, environment, userId, application)
    return response
  }
  const response = NextResponse.json({ application, launchSecret: data.launchSecret }, { status: 201 })
  await store(response, environment, userId, application)
  return response
}

export async function PATCH(request: NextRequest) {
  const environment = environmentFrom(request)
  const userId = userIdFrom(request)
  if (!userId) return NextResponse.json({ error: 'A valid authenticated user ID is required.' }, { status: 400 })
  const auth = authorization(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { applicationId?: unknown } | null
  const applicationId = Number(body?.applicationId)
  if (!Number.isSafeInteger(applicationId) || applicationId <= 0) {
    return NextResponse.json({ error: 'Enter a valid positive application ID.' }, { status: 400 })
  }

  const platform = await fetch(`${apiRoot(environment)}/v2/external-application/${applicationId}`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  if (!platform.ok) {
    const detail = await platformError(platform)
    return NextResponse.json(
      { error: `Application ${applicationId} could not be connected for this signed-in user. ${detail}` },
      { status: platform.status },
    )
  }

  const data = await platform.json()
  const application: StoredApplication = {
    id: Number(data.id ?? applicationId),
    name: String(data.name ?? `Application ${applicationId}`),
    url: String(data.url ?? ''),
    description: typeof data.description === 'string' ? data.description : undefined,
    state: typeof data.state === 'string' ? data.state : undefined,
    iconUrl: typeof data.iconUrl === 'string' ? data.iconUrl : undefined,
    launchSecretMasked: typeof data.launchSecretMasked === 'string' ? data.launchSecretMasked : undefined,
  }
  const response = NextResponse.json({ application })
  await store(response, environment, userId, application)
  response.cookies.delete(LEGACY_COOKIE_NAMES[environment])
  return response
}

export async function PUT(request: NextRequest) {
  const environment = environmentFrom(request)
  const userId = userIdFrom(request)
  if (!userId) return NextResponse.json({ error: 'A valid authenticated user ID is required.' }, { status: 400 })
  const stored = await readPersisted(userId, environment)
  if (!stored) return NextResponse.json({ error: 'Create or connect an application first.' }, { status: 409 })
  const auth = authorization(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const incoming = await request.formData()
  const form = new FormData()
  for (const key of ['name', 'url', 'description', 'icon']) {
    const value = incoming.get(key)
    if (value instanceof File && value.size > 0) form.append(key, value)
    else if (typeof value === 'string' && value) form.append(key, value)
  }
  form.set('isPublic', 'false')
  form.set('isAllowedForPatients', 'false')

  const platform = await fetch(`${apiRoot(environment)}/v2/external-application/${stored.id}`, {
    method: 'PUT',
    headers: { Authorization: auth },
    body: form,
    cache: 'no-store',
  })
  if (!platform.ok) return NextResponse.json({ error: await platformError(platform) }, { status: platform.status })

  const data = await platform.json().catch(() => ({}))
  const application: StoredApplication = {
    id: stored.id,
    name: String(incoming.get('name') ?? stored.name),
    url: String(incoming.get('url') ?? stored.url),
    description: String(incoming.get('description') ?? stored.description ?? ''),
    state: typeof data.state === 'string' ? data.state : stored.state,
    iconUrl: typeof data.iconUrl === 'string' ? data.iconUrl : stored.iconUrl,
    launchSecretMasked: typeof data.launchSecretMasked === 'string' ? data.launchSecretMasked : stored.launchSecretMasked,
  }
  const response = NextResponse.json({ application })
  await store(response, environment, userId, application)
  return response
}
