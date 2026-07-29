'use client'

import { useSyncExternalStore } from 'react'
import {
  findEnvironment,
  type EnvironmentStatus,
} from '@/lib/environments'

let productionStatus: EnvironmentStatus =
  findEnvironment('production')?.status ?? 'none'

const listeners = new Set<() => void>()

/** Re-read the mocked catalog so callback handling and polling share one source. */
export function refreshProductionStatus(): EnvironmentStatus {
  const nextStatus = findEnvironment('production')?.status ?? 'none'

  if (nextStatus !== productionStatus) {
    productionStatus = nextStatus
    listeners.forEach((listener) => listener())
  }

  return nextStatus
}

export function getProductionStatus(): EnvironmentStatus {
  return productionStatus
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProductionStatus(): EnvironmentStatus {
  return useSyncExternalStore(subscribe, getProductionStatus, getProductionStatus)
}
