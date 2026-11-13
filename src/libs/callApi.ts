// Client helper for JSON API routes. Throws with the server's (Thai) error message.
export const apiBase = process.env.NEXT_PUBLIC_BASEPATH ?? ''

export const callApi = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
  const body = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)

  return body as T
}
