import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://backendpfiferreyrafredes-production.up.railway.app';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    return NextResponse.json({ detail: 'Missing bearer token' }, { status: 401 });
  }
  const apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) return NextResponse.json({ detail: 'Agent service unavailable' }, { status: 503 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !Number.isSafeInteger(body.field_id) || body.field_id <= 0 ||
      Object.keys(body).some((key) => !['field_id', 'max_steps'].includes(key))) {
    return NextResponse.json({ detail: 'Only field_id and max_steps are allowed' }, { status: 422 });
  }
  const maxSteps = body.max_steps === undefined ? 6 : body.max_steps;
  if (!Number.isSafeInteger(maxSteps) || maxSteps < 1 || maxSteps > 12) {
    return NextResponse.json({ detail: 'max_steps must be an integer from 1 to 12' }, { status: 422 });
  }
  const backend = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
  try {
    const access = await fetch(`${backend}/api/v1/fields/${body.field_id}`, {
      headers: { Authorization: authorization }, cache: 'no-store',
    });
    if (!access.ok) return NextResponse.json({ detail: 'Field access denied or unavailable' }, { status: access.status });
    const response = await fetch(`${backend}/agents/supervisor/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({ field_id: body.field_id, max_steps: maxSteps }),
      cache: 'no-store',
    });
    return NextResponse.json(await response.json().catch(() => ({})), { status: response.status });
  } catch {
    return NextResponse.json({ detail: 'Backend unavailable' }, { status: 502 });
  }
}
