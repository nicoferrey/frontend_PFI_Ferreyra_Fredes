import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://backendpfiferreyrafredes-production.up.railway.app';

function backendUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    return NextResponse.json({ detail: 'Missing bearer token' }, { status: 401 });
  }
  const apiKey = process.env.AGENT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { detail: 'AGENT_API_KEY is not configured in the frontend server environment.' },
      { status: 500 }
    );
  }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ detail: 'Invalid JSON' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      !Number.isSafeInteger(body.field_id) || body.field_id <= 0) {
    return NextResponse.json({ detail: 'A valid field_id is required' }, { status: 422 });
  }
  // The service API key is never a substitute for the caller's field access.
  // Verify JWT and current farm membership before invoking a privileged agent.
  let field;
  try {
    const access = await fetch(`${backendUrl()}/api/v1/fields/${body.field_id}`, {
      headers: { Authorization: authorization }, cache: 'no-store',
    });
    if (!access.ok) return NextResponse.json({ detail: 'Field access denied or unavailable' }, { status: access.status });
    field = await access.json();
  } catch {
    return NextResponse.json({ detail: 'Backend unavailable' }, { status: 502 });
  }
  // Use the authorized lot's location, not arbitrary geometry passed to a
  // public proxy that possesses the server's external-service credentials.
  const payload = { ...body, field_id: field.id, field_name: field.name,
    latitude: field.center_latitude, longitude: field.center_longitude,
    geometry_geojson: field.geometry_geojson, crop_name: field.crop_type || 'cultivo generico',
    irrigation_system: field.irrigation_system, use_persisted_irrigation_events: true };
  let response;
  try {
    response = await fetch(`${backendUrl()}/agents/analyze-irrigation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ detail: 'Backend unavailable' }, { status: 502 });
  }

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
