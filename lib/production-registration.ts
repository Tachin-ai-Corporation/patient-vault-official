import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { productionRegistrations } from '@/lib/db/schema'

export async function hasProductionRegistration(stagingUserId: string): Promise<boolean> {
  const rows = await db
    .select({ stagingUserId: productionRegistrations.stagingUserId })
    .from(productionRegistrations)
    .where(eq(productionRegistrations.stagingUserId, stagingUserId))
    .limit(1)

  return rows.length > 0
}

export async function markProductionRegistered(
  stagingUserId: string,
  productionUserId: string,
): Promise<void> {
  await db
    .insert(productionRegistrations)
    .values({ stagingUserId, productionUserId })
    .onConflictDoUpdate({
      target: productionRegistrations.stagingUserId,
      set: { productionUserId, updatedAt: new Date() },
    })
}
