import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { acceptanceBody, normalizeBaaAgreements } from '@/lib/baa-agreements'
import { ENVIRONMENT_CONFIG } from '@/lib/session-environments'

export const dynamic = 'force-dynamic'

const AGREEMENT_PATH = '/api/v2/agreement/BAA%20Organization%20Standard'

function noStore<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}

async function productionCredentials() {
  const store = await cookies()
  const token = store.get('prod_access_token')?.value
  const baseUrl = (store.get('prod_base_url')?.value || ENVIRONMENT_CONFIG.prod.apiRoot).replace(/\/+$/, '')
  return { token, baseUrl }
}

async function safeUpstreamError(response: Response): Promise<string> {
  if (response.status === 400) {
    const body = await response.text()
    if (/only by admin/i.test(body)) {
      return 'Only a Production organization administrator can accept this agreement.'
    }
  }
  if (response.status === 401 || response.status === 403) {
    return 'Your Production session is not authorized to review this agreement.'
  }
  return 'The BAA service is temporarily unavailable. Please try again.'
}

export async function GET() {
  const { token, baseUrl } = await productionCredentials()
  if (!token) return noStore({ error: 'A Production session is required.' }, 401)

  try {
    const response = await fetch(`${baseUrl}${AGREEMENT_PATH}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return noStore({ error: await safeUpstreamError(response) }, response.status)

    const status = normalizeBaaAgreements(await response.json())
    if (!status) return noStore({ error: 'The BAA status response was invalid.' }, 502)
    return noStore(status)
  } catch {
    return noStore({ error: 'The BAA service is temporarily unavailable. Please try again.' }, 502)
  }
}

export async function PUT(request: Request) {
  const { token, baseUrl } = await productionCredentials()
  if (!token) return noStore({ error: 'A Production session is required.' }, 401)

  let hipaaCoveredEntity: boolean
  let ids: number[]
  try {
    const body = await request.json()
    hipaaCoveredEntity = body.hipaaCoveredEntity
    ids = body.ids
    if (
      typeof hipaaCoveredEntity !== 'boolean' ||
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      throw new Error('invalid')
    }
  } catch {
    return noStore({ error: 'A valid entity classification and agreement list are required.' }, 400)
  }

  try {
    const query = new URLSearchParams({ hipaaCoveredEntity: String(hipaaCoveredEntity) })
    const response = await fetch(`${baseUrl}${AGREEMENT_PATH}/accept?${query}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(acceptanceBody(ids)),
      cache: 'no-store',
    })
    if (!response.ok) return noStore({ error: await safeUpstreamError(response) }, response.status)
    return noStore({ ok: true })
  } catch {
    return noStore({ error: 'The BAA could not be accepted. Please try again.' }, 502)
  }
}
