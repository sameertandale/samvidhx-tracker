export async function onRequest(context) {
  const { request, env } = context
  const url = new URL(request.url)

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // List endpoint: GET /api/storage/list?prefix=tasks:
  if (url.pathname.endsWith('/list')) {
    const prefix = url.searchParams.get('prefix') ?? ''
    const listed = await env.TRACKER_KV.list({ prefix })
    return Response.json({ keys: listed.keys.map(k => k.name) }, { headers: corsHeaders })
  }

  const key = url.searchParams.get('key')

  if (request.method === 'GET') {
    if (!key) return Response.json({ error: 'key required' }, { status: 400, headers: corsHeaders })
    const value = await env.TRACKER_KV.get(key, 'json')
    return Response.json({ value }, { headers: corsHeaders })
  }

  if (request.method === 'POST') {
    const body = await request.json()
    await env.TRACKER_KV.put(body.key, JSON.stringify(body.value))
    return Response.json({ ok: true }, { headers: corsHeaders })
  }

  if (request.method === 'DELETE') {
    if (!key) return Response.json({ error: 'key required' }, { status: 400, headers: corsHeaders })
    await env.TRACKER_KV.delete(key)
    return Response.json({ ok: true }, { headers: corsHeaders })
  }

  return Response.json({ error: 'method not allowed' }, { status: 405, headers: corsHeaders })
}
