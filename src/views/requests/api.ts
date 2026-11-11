// Client helper for /api/requests. Throws with the server's (Thai) error message.
export const api = `${process.env.NEXT_PUBLIC_BASEPATH ?? ''}/api/requests`

export const callApi = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' } })
  const body = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)

  return body as T
}
