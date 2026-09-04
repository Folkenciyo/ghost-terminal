import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness probe used by the Docker healthcheck and by Dokploy. */
export function GET() {
  return NextResponse.json({ status: 'ok', uptime: Math.round(process.uptime()) });
}
