// Acceptance checks for the MCP layer against a running dev server.
// Run: node --env-file=.env.local .clear/mcp-chatbot/check.mjs   (server started with AUTH_DISABLED=false)
import { createHash, randomBytes } from 'node:crypto'

import { encode } from 'next-auth/jwt'

const BASE = process.env.CHECK_BASE || 'http://localhost:3000/digitalplan'
const ORIGIN = new URL(BASE).origin
const REDIRECT = 'http://localhost:6274/oauth/callback'
const results = []
const check = (id, ok, detail = '') => results.push({ id, ok: !!ok, detail })

const sessionCookie = async (user, role) => {
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    token: {
      sub: String(user.STAFFID),
      role,
      user: { ...user, SCOPES: { progcode: 'X', twofa_secret: 'SECRET2FA', line_access_token: 'LINESECRET' }, access_token: 'ERPTOKEN' },
      erpAccessToken: 'ERPTOKEN'
    }
  })

  return `next-auth.session-token=${token}`
}

const alice = await sessionCookie({ id: 111, STAFFID: 111, name: 'Alice Test', STAFFNAME: 'Alice', email: 'a@x' }, 'user')
const bob = await sessionCookie({ id: 222, STAFFID: 222, name: 'Bob Test', STAFFNAME: 'Bob', email: 'b@x' }, 'user')

const mcp = (token, body) =>
  fetch(`${BASE}/api/mcp/`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, ...body })
  })

try {
// SC1 — session response carries no secrets
{
  const r = await fetch(`${BASE}/api/auth/session`, { headers: { cookie: alice } })
  const text = await r.text()

  check('SC1 session has no secrets', r.ok && text.includes('Alice') && !/SECRET2FA|LINESECRET|ERPTOKEN|access_token|twofa|line_access/.test(text), text.slice(0, 120))
}

// SC3 — unauthenticated MCP call
{
  const r = await fetch(`${BASE}/api/mcp/`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: '{}' })

  check('SC3 401 + resource_metadata', r.status === 401 && /resource_metadata="[^"]+oauth-protected-resource/.test(r.headers.get('www-authenticate') ?? ''), `${r.status} ${r.headers.get('www-authenticate')}`)
}

// Discovery
{
  const prm = await (await fetch(`${BASE}/.well-known/oauth-protected-resource/`)).json()
  const as = await (await fetch(`${BASE}/.well-known/openid-configuration/`)).json()

  check('R1 discovery metadata', prm.resource?.endsWith('/api/mcp/') && as.code_challenge_methods_supported?.includes('S256') && as.registration_endpoint, JSON.stringify(prm))
}

// SC7 — registration allowlist
const register = uris =>
  fetch(`${BASE}/api/oauth/register/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Check client', redirect_uris: uris }) })

check('SC7 bad redirect rejected', (await register(['https://evil.example/cb'])).status === 400)
const client = await (await register([REDIRECT])).json()

check('SC7 allowlisted redirect registered', !!client.client_id)

const pkce = () => {
  const verifier = randomBytes(32).toString('base64url')

  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') }
}

const authorize = async (cookie, { challenge }, scope = 'mcp:read mcp:write', extra = {}) => {
  const q = new URLSearchParams({ client_id: client.client_id, redirect_uri: REDIRECT, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', state: 'st1', scope })
  const get = await fetch(`${BASE}/api/oauth/authorize/?${q}`, { redirect: 'manual' })

  if (get.status !== 302) return { getStatus: get.status }

  const form = new URLSearchParams({ ...Object.fromEntries(q), decision: 'allow', ...extra })
  const post = await fetch(`${BASE}/api/oauth/authorize/`, { method: 'POST', redirect: 'manual', headers: { cookie, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body: form })
  const loc = new URL(post.headers.get('location') ?? 'http://x/')

  return { getStatus: 302, consent: get.headers.get('location'), postStatus: post.status, code: loc.searchParams.get('code'), state: loc.searchParams.get('state') }
}

const token = body => fetch(`${BASE}/api/oauth/token/`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) })

// authorize without PKCE → error, no redirect
{
  const q = new URLSearchParams({ client_id: client.client_id, redirect_uri: REDIRECT, response_type: 'code' })

  check('SC7 PKCE required at authorize', (await fetch(`${BASE}/api/oauth/authorize/?${q}`, { redirect: 'manual' })).status === 400)
}

// cross-origin consent POST rejected
{
  const r = await fetch(`${BASE}/api/oauth/authorize/`, { method: 'POST', redirect: 'manual', headers: { cookie: alice, origin: 'https://evil.example', 'content-type': 'application/x-www-form-urlencoded' }, body: 'decision=allow' })

  check('CSRF consent POST from other origin → 403', r.status === 403)
}

// wrong verifier → invalid_grant, and the code is burnt
let p1 = pkce()
let a1 = await authorize(alice, p1)

check('SC7 authorize → consent → code', a1.consent?.includes('/oauth/consent/') && a1.postStatus === 303 && a1.code && a1.state === 'st1', JSON.stringify(a1))
{
  const bad = await (await token({ grant_type: 'authorization_code', code: a1.code, code_verifier: pkce().verifier, client_id: client.client_id, redirect_uri: REDIRECT })).json()
  const again = await (await token({ grant_type: 'authorization_code', code: a1.code, code_verifier: p1.verifier, client_id: client.client_id, redirect_uri: REDIRECT })).json()

  check('SC7 wrong verifier → invalid_grant', bad.error === 'invalid_grant')
  check('SC7 code single use (burnt after failure)', again.error === 'invalid_grant')
}

// good exchange
p1 = pkce()
a1 = await authorize(alice, p1)
const t1 = await (await token({ grant_type: 'authorization_code', code: a1.code, code_verifier: p1.verifier, client_id: client.client_id, redirect_uri: REDIRECT })).json()

check('SC7 token issued with expiry', t1.access_token && t1.expires_in === 3600 && t1.refresh_token, JSON.stringify({ ...t1, access_token: '…', refresh_token: '…' }))
{
  const reuse = await (await token({ grant_type: 'authorization_code', code: a1.code, code_verifier: p1.verifier, client_id: client.client_id, redirect_uri: REDIRECT })).json()

  check('SC7 code single use (after success)', reuse.error === 'invalid_grant')
}

// SC4 — tools/list via bearer
{
  const r = await mcp(t1.access_token, { method: 'tools/list', params: {} })
  const names = ((await r.json()).result?.tools ?? []).map(t => t.name)

  check('SC4 tools/list (read+write grant)', names.includes('whoami') && names.includes('save_note'), names.join(','))
  const who = await (await mcp(t1.access_token, { method: 'tools/call', params: { name: 'whoami', arguments: {} } })).json()

  check('SC8-lite whoami over MCP', JSON.stringify(who).includes('Alice'), JSON.stringify(who).slice(0, 160))
}

// read-only grant hides and rejects write tools
{
  const p = pkce()
  const a = await authorize(alice, p, 'mcp:read mcp:write', { read_only: 'on' })
  const t = await (await token({ grant_type: 'authorization_code', code: a.code, code_verifier: p.verifier, client_id: client.client_id, redirect_uri: REDIRECT })).json()
  const names = ((await (await mcp(t.access_token, { method: 'tools/list', params: {} })).json()).result?.tools ?? []).map(x => x.name)
  const call = await (await mcp(t.access_token, { method: 'tools/call', params: { name: 'save_note', arguments: { text: 'x' } } })).json()

  check('SC4/A6 read-only grant hides save_note', t.scope === 'mcp:read' && !names.includes('save_note'), names.join(','))
  check('SC4 calling hidden tool by name fails', JSON.stringify(call).includes('error') || call.result?.isError, JSON.stringify(call).slice(0, 160))
}

// SC5 — write goes to a pending action; only the owner (human, same origin) can confirm; once
{
  const res = await (await mcp(t1.access_token, { method: 'tools/call', params: { name: 'save_note', arguments: { text: 'สวัสดี' } } })).json()
  const text = res.result?.content?.[0]?.text ?? ''
  const id = /actions\/([0-9a-f-]{36})/.exec(text)?.[1]

  check('SC5 write returns confirm link, not executed', id && text.includes('ยังไม่ได้ดำเนินการ'), text.slice(0, 160))
  const post = (cookie, origin = ORIGIN) =>
    fetch(`${BASE}/api/actions/${id}/`, { method: 'POST', headers: { cookie, origin, 'content-type': 'application/json' }, body: '{"decision":"confirm"}' })

  check('SC5 other user cannot confirm', (await post(bob)).status === 409)
  check('SC5 cross-origin confirm blocked', (await post(alice, 'https://evil.example')).status === 403)
  check('SC5 bearer (model) cannot confirm', (await fetch(`${BASE}/api/actions/${id}/`, { method: 'POST', headers: { authorization: `Bearer ${t1.access_token}`, origin: ORIGIN }, body: '{}' })).status === 401)
  const ok = await post(alice)

  check('SC5 owner confirms → executed', ok.status === 200 && JSON.stringify(await ok.json()).includes('สวัสดี'))
  check('SC5 confirm is single use', (await post(alice)).status === 409)
}

// SC7 — refresh rotation + reuse detection
{
  const r1 = await (await token({ grant_type: 'refresh_token', refresh_token: t1.refresh_token, client_id: client.client_id })).json()

  check('SC7 refresh rotates', r1.access_token && r1.refresh_token && r1.refresh_token !== t1.refresh_token)
  const reuse = await (await token({ grant_type: 'refresh_token', refresh_token: t1.refresh_token, client_id: client.client_id })).json()

  check('E2 old refresh reuse → invalid_grant', reuse.error === 'invalid_grant')
  check('E2 reuse revoked the whole grant', (await mcp(r1.access_token, { method: 'tools/list', params: {} })).status === 401)
}

// SC7 — user revokes a connection
{
  const p = pkce()
  const a = await authorize(alice, p)
  const t = await (await token({ grant_type: 'authorization_code', code: a.code, code_verifier: p.verifier, client_id: client.client_id, redirect_uri: REDIRECT })).json()
  const list = await (await fetch(`${BASE}/api/oauth/grants/`, { headers: { cookie: alice } })).json()
  const live = list.grants.filter(g => !g.revokedAt)
  const bobList = await (await fetch(`${BASE}/api/oauth/grants/`, { headers: { cookie: bob } })).json()

  check('grants list is per user', live.length >= 1 && bobList.grants.length === 0)
  for (const g of live) await fetch(`${BASE}/api/oauth/grants/?id=${g.id}`, { method: 'DELETE', headers: { cookie: alice, origin: ORIGIN } })
  check('SC7 revoked connection → 401', (await mcp(t.access_token, { method: 'tools/list', params: {} })).status === 401)
}

// SC9 — chat without key
{
  const g = await (await fetch(`${BASE}/api/chat/`)).json()
  const p = await fetch(`${BASE}/api/chat/`, { method: 'POST', headers: { cookie: alice, origin: ORIGIN, 'content-type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }) })
  const anon = await fetch(`${BASE}/api/chat/`, { method: 'POST', redirect: 'manual', headers: { origin: ORIGIN, 'content-type': 'application/json' }, body: '{}' })

  if (process.env.LLM_API_KEY) check('SC9 chat configured', g.configured === true)
  else check('SC9 no key → configured:false + 503', g.configured === false && p.status === 503)
  check('chat needs login (401, no redirect)', anon.status === 401)
}

} catch (e) {
  check('run aborted (remaining checks not reached)', false, e.message)
}

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}${r.ok ? '' : `  ← ${r.detail}`}`)
console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed`)
process.exit(results.every(r => r.ok) ? 0 : 1)
