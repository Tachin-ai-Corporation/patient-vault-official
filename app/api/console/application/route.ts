import { NextRequest, NextResponse } from 'next/server'

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

const COOKIE_NAMES: Record<Environment, string> = {
  demo: 'pv_console_app_demo',
  production: 'pv_console_app_production',
}

function environmentFrom(request: NextRequest): Environment {
  return request.nextUrl.searchParams.get('environment') === 'production' ? 'production' : 'demo'
}

function apiRoot(environment: Environment) {
  return environment === 'demo' ? 'https://1health.demo.1health.io/api' : 'https://1health.app.1health.io/api'
}

function readStored(request: NextRequest, environment: Environment): StoredApplication | null {
  const value = request.cookies.get(COOKIE_NAMES[environment])?.value
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as StoredApplication
  } catch {
    return null
  }
}

function store(response: NextResponse, environment: Environment, app: StoredApplication) {
  response.cookies.set(COOKIE_NAMES[environment], Buffer.from(JSON.stringify(app)).toString('base64url'), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
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
  const stored = readStored(request, environment)
  if (!stored) return NextResponse.json({ application: null })

  const auth = authorization(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const platform = await fetch(`${apiRoot(environment)}/v2/external-application/${stored.id}`, {
    headers: { Authorization: auth },
    cache: 'no-store',
  })
  if (platform.status === 404) {
    const response = NextResponse.json({ application: null })
    response.cookies.delete(COOKIE_NAMES[environment])
    return response
  }
  if (!platform.ok) return NextResponse.json({ error: await platformError(platform) }, { status: platform.status })

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
  store(response, environment, application)
  return response
}

export async function POST(request: NextRequest) {
  const environment = environmentFrom(request)
  if (readStored(request, environment)) {
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
    store(response, environment, application)
    return response
  }
  const response = NextResponse.json({ application, launchSecret: data.launchSecret }, { status: 201 })
  store(response, environment, application)
  return response
}

export async function PUT(request: NextRequest) {
  const environment = environmentFrom(request)
  const stored = readStored(request, environment)
  if (!stored) return NextResponse.json({ error: 'Create an application first.' }, { status: 409 })
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
  store(response, environment, application)
  return response
}
