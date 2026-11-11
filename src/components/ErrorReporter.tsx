'use client'

// React Imports
import { useEffect } from 'react'

// Logger Imports
import { installGlobalErrorHandlers } from '@/libs/logger/client'

/**
 * Mounted once in the root layout. Streams window.onerror and unhandled promise
 * rejections to /api/log so browser failures land in the same daily file as server ones.
 */
const ErrorReporter = () => {
  useEffect(() => installGlobalErrorHandlers(), [])

  return null
}

export default ErrorReporter
