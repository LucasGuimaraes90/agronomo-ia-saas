import Anthropic from '@anthropic-ai/sdk';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx';

const PROMPT_DOCX = `Voce e um redator tecnico agronomico. Com base na conversa, gere um LAUDO TECNICO completo e estruturado.
Escreva diretamente o conteudo — sem meta-texto. Use o seguinte formato marcado com tags:

[TITULO]Laudo Tecnico Agronomico[/TITULO]
[SUBTITULO]Propriedade: [nome] | Cultura: [cultura] | Data: [data][/SUBTITULO]

[H1]1. Identificacao da Lavoura[/H1]
[P]Texto descritivo...[/P]

[H1]2. Resultados da Analise de Solo[/H1]
[P]Texto...[/P]

[H1]3. Diagnostico[/H1]
[P]Texto...[/P]

[H1]4. Necessidade de Calagem[/H1]
[P]Texto...[/P]

[H1]5. Recomendacao de Adubacao[/H1]
[P]Texto...[/P]

[H1]6. Cronograma de Aplicacao[/H1]
[P]Texto...[/P]

[H1]7. Observacoes Tecnicas[/H1]
[P]Texto...[/P]

[H1]8. Disclaimer[/H1]
[P]Este laudo foi gerado pelo Agronomo IA como suporte tecnico. Recomenda-se validacao com engenheiro agronomo responsavel.[/P]`;

function parseContent(text) {
  const children = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { children.push(new Paragraph({ children: [] })); continue; }
    
    const tituloMatch = trimmed.match(/^\[TITULO\](.*?)\[\/TITULO\]$/);
    const subtituloMatch = trimmed.match(/^\[SUBTITULO\](.*?)\[\/SUBTITULO\]$/);
    const h1Match = trimmed.match(/^\[H1\](.*?)\[\/H1\]$/);
    const pMatch = trimmed.match(/^\[P\](.*?)\[\/P\]$/);
    
    if (tituloMatch) {
      children.push(new Paragraph({
        children: [new TextRun({ text: tituloMatch[1], bold: true, size: 48, color: '15803D' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));
    } else if (subtituloMatch) {
      children.push(new Paragraph({
        children: [new TextRun({ text: subtituloMatch[1], size: 22, color: '6B7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }));
    } else if (h1Match) {
      children.push(new Paragraph({
        text: h1Match[1],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }));
    } else if (pMatch) {
      children.push(new Paragraph({
        children: [new TextRun({ text: pMatch[1], size: 22 })],
        spacing: { after: 160 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed, size: 22 })],
        spacing: { after: 120 },
      }));
    }
  }
  return children;
}

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

    const textMsgs = messages.filter(m => typeof m.content === 'string').map(m => ({ role: m.role, content: m.content }));
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: PROMPT_DOCX,
      messages: textMsgs.length > 0 ? textMsgs : [{ role: 'user', content: 'Gere um laudo tecnico em branco.' }],
    });

    const contentText = res.content[0].text;
    const children = parseContent(contentText);

    const doc = new Document({
      styles: {
        default: {
          heading1: {
            run: { size: 28, bold: true, color: '15803D' },
            paragraph: { spacing: { before: 360, after: 180 } },
          },
        },
      },
      sections: [{
        properties: {
          page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="laudo-agronomo-ia-${Date.now()}.docx"`,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
