// GET: validate the client's request, then hand over to the consent page (which needs the ERP login).
// POST: the consent form. Issues a code and sends the browser back to the client.
import { NextResponse } from 'next/server'

import { isSameOrigin, sessionCaller } from '@/mcp/auth'
import { urls } from '@/mcp/config'
import { oauthErrorResponse, issueCode, validateAuthRequest } from '@/mcp/oauth'
import type { McpScope } from '@/mcp/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = async (req: Request) => {
  const params = new URL(req.url).searchParams

  try {
    await validateAuthRequest(params)
  } catch (err) {
    // The redirect URI is not trusted yet, so show the error here instead of redirecting.
    return oauthErrorResponse(err)
  }

  return NextResponse.redirect(`${urls(req).consent}?${params.toString()}`, 302)
}

export const POST = async (req: Request) => {
  if (!isSameOrigin(req)) return Response.json({ error: 'invalid_request', error_description: 'bad origin' }, { status: 403 })

  const form = await req.formData()
  const params = new URLSearchParams()

  for (const key of ['client_id', 'redirect_uri', 'response_type', 'code_challenge', 'code_challenge_method', 'state', 'scope']) {
    const v = form.get(key)

    if (typeof v === 'string') params.set(key, v)
  }

  let authReq

  try {
    authReq = await validateAuthRequest(params)
  } catch (err) {
    return oauthErrorResponse(err)
  }

  const back = new URL(authReq.redirectUri)

  if (authReq.state) back.searchParams.set('state', authReq.state)

  const caller = await sessionCaller()

  if (!caller) return Response.json({ error: 'login_required' }, { status: 401 })

  // Demo sessions are fictional personas: they never get to authorise an MCP client.
  if (caller.demo) return Response.json({ error: 'access_denied', error_description: 'demo session' }, { status: 403 })

  if (form.get('decision') !== 'allow') {
    back.searchParams.set('error', 'access_denied')

    return NextResponse.redirect(back, 303)
  }

  // The user may narrow the request to read-only on the consent page, never widen it.
  const scopes: McpScope[] = form.get('read_only') === 'on' ? ['mcp:read'] : authReq.scopes

  back.searchParams.set('code', await issueCode(authReq, caller, scopes))
  back.searchParams.set('iss', urls(req).issuer)

  return NextResponse.redirect(back, 303)
}
