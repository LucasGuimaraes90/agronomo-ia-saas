import Anthropic from '@anthropic-ai/sdk';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT_DOCUMENTO = `Você é um formatador de documentos agronômicos profissionais.
Com base na conversa técnica abaixo, gere um RELATÓRIO COMPLETO E ESTRUTURADO em markdown.

REGRAS OBRIGATÓRIAS:
- Comece DIRETAMENTE com o conteúdo — sem introduções ou meta-texto
- Use ## para seções principais e ### para subseções
- Inclua TODAS as informações técnicas: valores de pH, saturação de bases, doses, etc.
- Seja preciso e completo — este é um documento técnico oficial

ESTRUTURA OBRIGATÓRIA:
## IDENTIFICAÇÃO DA LAVOURA
## RESULTADOS DA ANÁLISE DE SOLO
## NECESSIDADE DE CALAGEM
## RECOMENDAÇÃO DE ADUBAÇÃO
## CRONOGRAMA DE APLICAÇÃO
## OBSERVAÇÕES TÉCNICAS
## DISCLAIMER`;

async function gerarConteudo(messages) {
  const apiMsgs = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : String(m.content),
    }));

  apiMsgs.push({ role: 'user', content: 'Gere o relatório técnico completo desta análise.' });

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: PROMPT_DOCUMENTO,
    messages: apiMsgs,
  });

  return response.content[0].text;
}

function parseSecoes(markdown) {
  const secoes = [];
  let atual = null;

  for (const linha of markdown.split('\n')) {
    if (linha.startsWith('## ')) {
      if (atual) secoes.push(atual);
      atual = { titulo: linha.replace('## ', '').trim(), linhas: [] };
    } else if (atual) {
      atual.linhas.push(linha);
    }
  }
  if (atual) secoes.push(atual);
  return secoes;
}

function linhaParaParagrafo(linha) {
  if (linha.startsWith('### ')) {
    return new Paragraph({ text: linha.replace('### ', '').trim(), heading: HeadingLevel.HEADING_3 });
  }
  if (linha.startsWith('- ') || linha.startsWith('* ')) {
    return new Paragraph({ text: linha.replace(/^[-*] /, '').trim(), bullet: { level: 0 } });
  }
  if (!linha.trim()) {
    return new Paragraph({ text: '' });
  }

  // Negrito inline **texto**
  const partes = linha.split(/\*\*(.*?)\*\*/g);
  const runs = partes.map((p, i) =>
    new TextRun({ text: p, bold: i % 2 === 1 })
  );
  return new Paragraph({ children: runs });
}

async function gerarDocx(markdown) {
  const secoes = parseSecoes(markdown);
  const filhos = [
    new Paragraph({
      text: 'Laudo Técnico Agronômico',
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({ text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')}` }),
    new Paragraph({ text: '' }),
  ];

  for (const secao of secoes) {
    filhos.push(new Paragraph({ text: secao.titulo, heading: HeadingLevel.HEADING_2 }));
    for (const linha of secao.linhas) {
      filhos.push(linhaParaParagrafo(linha));
    }
    filhos.push(new Paragraph({ text: '' }));
  }

  const doc = new Document({
    styles: {
      default: {
        heading1: { run: { color: '15803d', bold: true, size: 36 } },
        heading2: { run: { color: '15803d', bold: true, size: 28 } },
        heading3: { run: { color: '166534', bold: true, size: 24 } },
      },
    },
    sections: [{ children: filhos }],
  });

  return Packer.toBuffer(doc);
}

async function gerarPptx(markdown) {
  // pptxgenjs importado dinamicamente para evitar problemas com SSR
  const pptxgenModule = await import('pptxgenjs');
  const PptxGenJS = pptxgenModule.default;
  const prs = new PptxGenJS();

  prs.layout = 'LAYOUT_WIDE';
  prs.author = 'Agrônomo IA';
  prs.title = 'Laudo Técnico Agronômico';

  // Slide de capa
  const capa = prs.addSlide();
  capa.background = { color: '15803d' };
  capa.addText('Laudo Técnico Agronômico', {
    x: 0.5, y: 1.8, w: 9, h: 1.5,
    fontSize: 40, bold: true, color: 'FFFFFF', align: 'center',
  });
  capa.addText(`Agrônomo IA  •  ${new Date().toLocaleDateString('pt-BR')}`, {
    x: 0.5, y: 3.5, w: 9, h: 0.7,
    fontSize: 18, color: 'BBFFBB', align: 'center',
  });

  const secoes = parseSecoes(markdown);

  for (const secao of secoes) {
    const slide = prs.addSlide();
    slide.background = { color: 'FFFFFF' };

    // Barra de título verde
    slide.addText(secao.titulo, {
      x: 0, y: 0, w: '100%', h: 1.2,
      fontSize: 22, bold: true, color: 'FFFFFF', align: 'left',
      fill: { color: '15803d' },
      margin: [0, 0, 0, 20],
    });

    // Conteúdo
    const itens = secao.linhas
      .filter(l => l.trim())
      .map(l => {
        const isBullet = l.startsWith('- ') || l.startsWith('* ');
        const textoLimpo = l
          .replace(/^[-*] /, '')
          .replace(/^### /, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .trim();
        return { text: textoLimpo, options: { bullet: isBullet, paraSpaceBefore: 4 } };
      });

    if (itens.length > 0) {
      slide.addText(itens, {
        x: 0.5, y: 1.4, w: 9, h: 5.0,
        fontSize: 13, color: '1f2937', valign: 'top',
        wrap: true,
      });
    }

    // Rodapé
    slide.addText('Agrônomo IA', {
      x: 0, y: 6.8, w: '100%', h: 0.4,
      fontSize: 9, color: '9ca3af', align: 'right',
    });
  }

  return prs.write({ outputType: 'nodebuffer' });
}

async function gerarXlsx(markdown) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Agrônomo IA';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laudo Técnico', {
    pageSetup: { orientation: 'portrait', fitToPage: true },
  });

  // Cabeçalho
  sheet.mergeCells('A1:C1');
  const tituloCell = sheet.getCell('A1');
  tituloCell.value = 'LAUDO TÉCNICO AGRONÔMICO — Agrônomo IA';
  tituloCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
  tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 30;

  sheet.mergeCells('A2:C2');
  const dataCell = sheet.getCell('A2');
  dataCell.value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
  dataCell.font = { italic: true, size: 10, color: { argb: 'FF6B7280' } };
  dataCell.alignment = { horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Cabeçalhos de coluna
  const headerRow = sheet.addRow(['Seção', 'Item', 'Conteúdo']);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF166534' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF15803D' } },
    };
  });
  sheet.getRow(3).height = 22;

  sheet.columns = [
    { key: 'secao', width: 28 },
    { key: 'item', width: 40 },
    { key: 'conteudo', width: 60 },
  ];

  const secoes = parseSecoes(markdown);
  let rowNum = 4;

  for (const secao of secoes) {
    const itensDaSecao = secao.linhas.filter(l => l.trim());
    if (itensDaSecao.length === 0) continue;

    let primeiraLinhaDaSecao = rowNum;

    for (let i = 0; i < itensDaSecao.length; i++) {
      const linha = itensDaSecao[i];
      const isSubtitulo = linha.startsWith('### ');
      const isBullet = linha.startsWith('- ') || linha.startsWith('* ');

      const textoLimpo = linha
        .replace(/^### /, '')
        .replace(/^[-*] /, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .trim();

      const row = sheet.addRow([
        i === 0 ? secao.titulo : '',
        isSubtitulo ? textoLimpo : (isBullet ? '• ' + textoLimpo : ''),
        isSubtitulo ? '' : textoLimpo,
      ]);

      if (isSubtitulo) {
        row.getCell('item').font = { bold: true, color: { argb: 'FF166534' } };
        row.getCell('item').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      }

      row.getCell('conteudo').alignment = { wrapText: true, vertical: 'top' };
      row.height = 18;
      rowNum++;
    }

    // Mescla a coluna "Seção" para todas as linhas da seção
    if (rowNum - primeiraLinhaDaSecao > 1) {
      sheet.mergeCells(`A${primeiraLinhaDaSecao}:A${rowNum - 1}`);
    }
    const secaoCell = sheet.getCell(`A${primeiraLinhaDaSecao}`);
    secaoCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    secaoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    secaoCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  return workbook.xlsx.writeBuffer();
}

export async function POST(req) {
  try {
    const { messages, formato } = await req.json();

    if (!messages || !formato) {
      return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
    }

    const markdown = await gerarConteudo(messages);

    let buffer, contentType, filename;

    if (formato === 'docx') {
      buffer = await gerarDocx(markdown);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `laudo_agronomo_${Date.now()}.docx`;
    } else if (formato === 'pptx') {
      buffer = await gerarPptx(markdown);
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      filename = `apresentacao_agronomo_${Date.now()}.pptx`;
    } else if (formato === 'xlsx') {
      buffer = await gerarXlsx(markdown);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `dados_agronomo_${Date.now()}.xlsx`;
    } else {
      return NextResponse.json({ error: 'Formato inválido. Use: docx, pptx, xlsx' }, { status: 400 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length || buffer.byteLength),
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
