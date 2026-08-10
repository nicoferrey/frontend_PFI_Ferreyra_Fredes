import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://backendpfiferreyrafredes-production.up.railway.app';

function backendUrl() {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.AGENT_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { detail: 'AGENT_API_KEY is not configured in the frontend server environment.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const response = await fetch(`${backendUrl()}/agents/analyze-irrigation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
