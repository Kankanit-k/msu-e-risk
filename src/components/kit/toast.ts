'use client'

// Action feedback. The <ToastContainer> is mounted once in src/components/ClientProviders.tsx.
import { toast } from 'react-toastify'

export const notifySuccess = (message: string) => toast.success(message)

/** Show why it failed, not just that it failed. */
export const notifyError = (message: string, err?: unknown) =>
  toast.error(err instanceof Error && err.message ? `${message}: ${err.message}` : message)
