import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  hasProductionRegistration,
  markProductionRegistered,
} from '@/lib/production-registration'

export async function GET() {
  const cookieStore = await cookies()
  const stagingUserId = cookieStore.get('demo_user_id')?.value
  const productionUserId = cookieStore.get('prod_user_id')?.value

  if (!stagingUserId) {
    return NextResponse.json({ registered: false })
  }

  try {
    // Reconcile durable state from an authenticated dual session. This covers
    // returning users and any production callback whose best-effort write failed.
    if (productionUserId) {
      await markProductionRegistered(stagingUserId, productionUserId)
      return NextResponse.json({ registered: true })
    }

    const registered = await hasProductionRegistration(stagingUserId)
    return NextResponse.json({ registered })
  } catch (error) {
    console.error('[production-registration] Failed to read registration state', error)
    return NextResponse.json(
      { error: 'Unable to read production registration state' },
      { status: 500 },
    )
  }
}
