import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
  db: 'ok' | 'error';
};

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  let dbStatus: 'ok' | 'error' = 'error';

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'ok';
  } catch (e) {
    // DB unreachable
  }

  const response: HealthResponse = {
    status: 'ok',
    service: 'solar-erp',
    timestamp,
    db: dbStatus,
  };

  return NextResponse.json(response);
}

