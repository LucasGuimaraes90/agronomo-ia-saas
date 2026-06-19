import Anthropic from '@anthropic-ai/sdk';
import pptxgen from 'pptxgenjs';

const PROMPT_PPTX = `Analise a conversa e gere conteudo para uma apresentacao de PowerPoint agronomica em JSON (apenas JSON, sem texto extra):
{
  "titulo": "titulo da apresentacao",
  "subtitulo": "nome da propriedade e cultura",
  "slides": [
    { "titulo": "Identificacao da Lavoura", "topicos": ["item1", "item2", "item3"] },
    { "titulo": "Resultados da Analise de Solo", "topicos": ["pH: X - status", "P: X mg/dm3", "K: X cmolc/dm3"] },
    { "titulo": "Diagnostico", "topicos": ["problema1", "problema2"] },
    { "titulo": "Recomendacao de Calagem", "topicos": ["dose", "tipo", "epoca"] },
    { "titulo": "Recomendacao de Adubacao", "topicos": ["N: X kg/ha", "P2O5: X kg/ha", "K2O: X kg/ha"] },
    { "titulo": "Cronograma de Aplicacao", "topicos": ["etapa1", "etapa2"] },
    { "titulo": "Conclusao e Proximos Passos", "topicos": ["acao1", "acao2"] }
  ]
}`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

    const textMsgs = messages.filter(m => typeof m.content === 'string').map(m => ({ role: m.role, content: m.content }));
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: PROMPT_PPTX,
      messages: textMsgs.length > 0 ? textMsgs : [{ role: 'user', content: 'Sem dados.' }],
    });

    let data = { titulo: 'Laudo Agronomo IA', subtitulo: '', slides: [] };
    try { data = JSON.parse(res.content[0].text); } catch {}

    const pptx = new pptxgen();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.theme = { headFontFace: 'Calibri', bodyFontFace: 'Calibri' };

    const GREEN = '15803D';
    const WHITE = 'FFFFFF';
    const LIGHT = 'F0FDF4';

    // Slide capa
    const capa = pptx.addSlide();
    capa.background = { color: GREEN };
    capa.addText(data.titulo || 'Laudo Tecnico', {
      x: 0.5, y: 1.5, w: 11, h: 1.5,
      fontSize: 36, bold: true, color: WHITE, align: 'center',
    });
    capa.addText(data.subtitulo || 'Agronomo IA', {
      x: 0.5, y: 3.2, w: 11, h: 0.8,
      fontSize: 20, color: 'BBFBC8', align: 'center',
    });
    capa.addText('Gerado por Agronomo IA', {
      x: 0.5, y: 6.2, w: 11, h: 0.4,
      fontSize: 11, color: 'BBFBC8', align: 'center',
    });

    // Slides de conteudo
    (data.slides || []).forEach(slide => {
      const s = pptx.addSlide();
      s.background = { color: WHITE };
      // Header bar
      s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.1, fill: { color: GREEN } });
      s.addText(slide.titulo || '', {
        x: 0.4, y: 0.15, w: 11.2, h: 0.8,
        fontSize: 22, bold: true, color: WHITE,
      });
      // Topicos
      const topicos = (slide.topicos || []).map(t => ({ text: t, options: { bullet: { code: '2022' }, fontSize: 16, color: '1F2937', paraSpaceAfter: 8 } }));
      if (topicos.length > 0) {
        s.addText(topicos, { x: 0.6, y: 1.4, w: 11, h: 5, valign: 'top' });
      }
      // Footer
      s.addText('Agronomo IA', { x: 0, y: 6.8, w: '100%', h: 0.3, fontSize: 9, color: '9CA3AF', align: 'center' });
    });

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="agronomo-ia-${Date.now()}.pptx"`,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
