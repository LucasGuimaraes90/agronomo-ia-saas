import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { formato } = await req.json();
    return NextResponse.json({ error: 'Exportacao temporariamente em manutencao. Tente novamente em breve.' }, { status: 503 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
