/**
 * Demo mode helpers — edge-safe (no node-only imports), so middleware can use them.
 *
 * DEMO_MODE=true (server) turns on the role simulator (/demo, /api/demo/session).
 * Off by default. Never enable it on a real production deployment: demo sessions are
 * minted for fictional personas without ERP sign-in.
 */

export const DEMO_MODE: boolean = process.env.DEMO_MODE === 'true'

/** True when the NextAuth token was minted by the demo role simulator. */
export const isDemoToken = (token: Record<string, any> | null | undefined): boolean => token?.demo === true
