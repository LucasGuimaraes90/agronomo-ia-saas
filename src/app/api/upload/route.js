import { NextResponse } from 'next/server';

const SUPABASE_URL = 'https://oocezgcdkqzhjlyouxmu.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vY2V6Z2Nka3F6aGpseW91eG11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTgxOTExNSwiZXhwIjoyMDk3Mzk1MTE1fQ.2r16egarlsZzWG4xMQvXl5RLjWxV91YYwpPKsHHvIxY';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const pasta = formData.get("pasta") || "geral";

    if (!file) return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });

    const nome = pasta + "/" + Date.now() + ".jpg";
    const bytes = await file.arrayBuffer();

    const uploadUrl = SUPABASE_URL + "/storage/v1/object/fotos/" + nome;
    const r = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + SERVICE_KEY,
        "Content-Type": file.type || "image/jpeg",
        "x-upsert": "true",
      },
      body: bytes,
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Supabase storage error:", errText);
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    const url = SUPABASE_URL + "/storage/v1/object/public/fotos/" + nome;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
