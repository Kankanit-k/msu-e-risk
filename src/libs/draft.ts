// Unsaved form drafts in localStorage. Storage may be blocked or full — editing still works, just without a draft.
export const readDraft = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)

    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export const writeDraft = (key: string, value: unknown) => {
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value))
    else localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
