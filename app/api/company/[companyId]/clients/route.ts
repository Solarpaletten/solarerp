// app/api/company/[companyId]/clients/route.ts
// TASK 59 — Clients API with requireCompanyContext
// This is the reference implementation for all company routes

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireCompanyContext,
  companyContextErrorResponse,
} from '@/lib/auth/requireCompanyContext';

type RouteParams = { params: Promise<{ companyId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);

    // URL param must match header
    const { companyId: urlId } = await params;
    if (urlId !== companyId) {
      return NextResponse.json({ error: 'COMPANY_CONTEXT_MISMATCH' }, { status: 400 });
    }

    const url      = new URL(request.url);
    const page     = Math.max(1, parseInt(url.searchParams.get('page')     || '1'));
    const pageSize = Math.min(100, parseInt(url.searchParams.get('pageSize') || '20'));
    const search   = url.searchParams.get('search') || '';
    const role     = url.searchParams.get('role')   || undefined;

    const where: any = {
      companyId,
      company: { tenantId },
      ...(search && {
        OR: [
          { name:    { contains: search, mode: 'insensitive' } },
          { code:    { contains: search, mode: 'insensitive' } },
          { email:   { contains: search, mode: 'insensitive' } },
          { vatCode: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(role && { role }),
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.client.count({ where }),
    ]);

    return NextResponse.json({
      data: clients, total, page, pageSize,
      pages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    const errRes = companyContextErrorResponse(err);
    if (errRes) return errRes;
    console.error('[GET /clients]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { companyId, tenantId } = await requireCompanyContext(request);
    const { companyId: urlId } = await params;
    if (urlId !== companyId) {
      return NextResponse.json({ error: 'COMPANY_CONTEXT_MISMATCH' }, { status: 400 });
    }

    const body = await request.json();
    const { name, code, type, role, location } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (code) {
      const exists = await prisma.client.findFirst({
        where: { companyId, code: code.trim() },
        select: { id: true },
      });
      if (exists) {
        return NextResponse.json(
          { error: 'Client with this code already exists' },
          { status: 409 }
        );
      }
    }

    const client = await prisma.client.create({
      data: {
        companyId, tenantId,
        name:             name.trim(),
        code:             code?.trim()     || null,
        type:             type             || 'COMPANY',
        role:             role             || 'CUSTOMER',
        location:         location         || 'EU',
        isActive:         true,
        shortName:        body.shortName   || null,
        vatCode:          body.vatCode     || null,
        email:            body.email       || null,
        phoneNumber:      body.phoneNumber || null,
        paymentTermsDays: body.paymentTermsDays || 14,
      },
    });

    return NextResponse.json({ data: client }, { status: 201 });
  } catch (err) {
    const errRes = companyContextErrorResponse(err);
    if (errRes) return errRes;
    console.error('[POST /clients]', err);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
