export type CopyableApiCall = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  baseUrl: string
  path: string
  requestBody?: unknown
  responseBody?: unknown
  uploadOriginalSizeKb?: number | string
}

export const CURL_DATA_PLACEHOLDER = '<BASE64_FILE_CONTENT>'

export function isUploadCall(
  call: Pick<CopyableApiCall, 'method' | 'path' | 'requestBody'>,
): boolean {
  return (
    call.method === 'POST' &&
    call.path.includes('/attach') &&
    !!call.requestBody &&
    typeof call.requestBody === 'object' &&
    typeof (call.requestBody as Record<string, unknown>).data === 'string'
  )
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`
}

export function versionedPath(path: string): string {
  const match = path.match(/\/v\d+(?:\/|\?|$)/)
  if (!match || match.index === undefined) {
    throw new Error(`Inspector call does not contain a versioned API path: ${path}`)
  }
  return path.slice(match.index)
}

export function buildCurl(call: CopyableApiCall): string {
  const connectedBase = call.baseUrl.replace(/\/+$/, '')
  if (!connectedBase) {
    throw new Error('Cannot build cURL until the connected 1health base URL is resolved.')
  }
  const url = `${connectedBase}/api${versionedPath(call.path)}`
  const lines: string[] = [
    `curl --request ${call.method} ${shellQuote(url)}`,
    '  --header "Authorization: Bearer $PV_API_KEY"',
    "  --header 'Content-Type: application/json'",
  ]

  if (call.requestBody !== undefined && call.method !== 'GET') {
    const body = isUploadCall(call)
      ? {
          ...(call.requestBody as Record<string, unknown>),
          data: CURL_DATA_PLACEHOLDER,
        }
      : call.requestBody
    lines.push(`  --data ${shellQuote(JSON.stringify(body))}`)
  }

  return lines.join(' \\\n')
}

export function buildRequestJson(call: CopyableApiCall): string {
  const body =
    isUploadCall(call) && call.uploadOriginalSizeKb
      ? {
          ...(call.requestBody as Record<string, unknown>),
          _note: `data truncated — full payload was ${call.uploadOriginalSizeKb} KB base64`,
        }
      : (call.requestBody ?? null)
  return JSON.stringify(body, null, 2)
}

export function buildResponseJson(call: CopyableApiCall): string {
  return JSON.stringify(call.responseBody ?? null, null, 2)
}
