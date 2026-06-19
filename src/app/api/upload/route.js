import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const pasta = formData.get('pasta') || 'geral';
    const token = formData.get('token');

    if (!file) return NextResponse.json({ error: 'Arquivo nao enviado' }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      token ? { global: { headers: { Authorization: 'Bearer ' + token } } } : {}
    );

    const nome = pasta + '/' + Date.now() + '.jpg';
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error } = await supabase.storage.from('fotos').upload(nome, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true,
    });

    if (error) {
      console.error('Storage upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/fotos/' + nome;
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Upload route error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
