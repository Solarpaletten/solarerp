import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const body = await request.json();
  const { priorities } = body;

  console.log('Saving priorities:', priorities);

  // TODO: сохранить в БД

  return NextResponse.json({ success: true });
}