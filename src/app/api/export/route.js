import Anthropic from '@anthropic-ai/sdk';
import {
  Document, Packer, Paragraph, HeadingLevel, TextRun,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  ShadingType, Footer, PageNumber, BorderStyle,
} from 'docx';
import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────
// PROMPTS
// ─────────────────────────────────────────────────────────────

const PROMPT_DOCUMENTO = `Você é um especialista agronômico que gera laudos técnicos profissionais em markdown.
Analise a conversa abaixo e gere um documento COMPLETO, ESTRUTURADO e RICO em informações técnicas.

REGRAS OBRIGATÓRIAS:
- A primeira linha deve ser: # TITULO DO DOCUMENTO (baseado no tema real da conversa)
- Use ## para seções principais e ### para subseções
- Adapte as seções AO TEMA REAL discutido — nunca use estrutura genérica
- Inclua TODOS os dados técnicos, doses, valores e recomendações mencionados
- Gere ao menos 6 seções (##) com conteúdo substancial
- Use tabelas markdown (|col|col|) para dados numéricos, comparações e recomendações
- Formate doses, valores e produtos em negrito (**texto**)
- Seja preciso, técnico e completo

EXEMPLOS DE ADAPTAÇÃO:
- Boro em café → seções: O que é Boro, Sintomas Visuais, Causas da Deficiência, Diagnóstico, Recomendações de Correção, Doses Recomendadas, Manejo Preventivo, Cronograma
- Análise de solo → seções: Identificação, Resultados (tabela), Calagem, Adubação (tabela), Cronograma, Observações
- Pragas → seções: Identificação, Ciclo Biológico, Sintomas, Nível de Dano Econômico, Controle Químico (tabela), Controle Biológico, Monitoramento
- Irrigação → seções: Necessidade Hídrica, Sistema Recomendado, Manejo, Cronograma

Comece diretamente com o # TITULO — sem introduções, sem meta-texto.`;

const PROMPT_PPTX = `Você é um especialista agronômico que cria apresentações PowerPoint profissionais.
Analise a conversa abaixo e gere conteúdo OTIMIZADO PARA SLIDES em markdown.

REGRAS CRÍTICAS PARA SLIDES:
- A primeira linha deve ser: # TITULO DA APRESENTAÇÃO (baseado no tema real da conversa)
- Use ## para criar cada slide (máximo 9 slides no total)
- Cada seção (##) vira UM SLIDE — limite o conteúdo a no máximo 8 bullet points por slide
- Use bullet points curtos e diretos (- máximo 15 palavras cada)
- NÃO use tabelas markdown (| col |) — slides não renderizam tabelas
- NÃO use blocos de código (\`\`\`) — não renderiza em slides
- NÃO use ### subseções — apenas ## seções e bullet points (-)
- Para dados numéricos, use bullets simples: "- Dose recomendada: 3 kg/ha"
- Seja direto e visual — cada bullet deve ser uma informação clara e independente

ESTRUTURA DE EXEMPLO (para deficiência de boro):
# Deficiência de Boro no Café — Diagnóstico e Manejo
## O que é o Boro?
- Micronutriente essencial para divisão celular e floração
- Concentrado nas folhas novas e meristemas
## Sintomas Visuais
- Deformação e enrugamento de folhas novas
- Morte de gemas apicais (seca de ponta)
## ...etc

Adapte as seções ao tema real da conversa. Comece diretamente com o # TITULO.`;

const PROMPT_XLSX = `Você é um especialista agronômico que gera dados estruturados para planilha Excel.
Analise a conversa abaixo e gere conteúdo RICO EM TABELAS em markdown.

REGRAS OBRIGATÓRIAS:
- A primeira linha deve ser: # TITULO DO DOCUMENTO
- Use ## para seções principais
- PRIORIZE tabelas markdown (| col | col |) para qualquer dado numérico, dose, comparação ou resultado
- Use texto simples (bullets -) apenas para observações narrativas que não cabem em tabela
- Gere ao menos 5 seções com conteúdo, sendo a maioria com tabelas
- Inclua colunas relevantes nas tabelas: Parâmetro, Resultado, Valor Ideal, Status, Recomendação, Dose, etc.

EXEMPLO:
## Análise Química do Solo
| Parâmetro | Resultado | Valor Ideal | Status |
|-----------|-----------|-------------|--------|
| pH (CaCl₂) | 5.2 | 6.0-6.5 | Baixo |
| MO (%) | 2.8 | >3.0 | Adequado |
| P (mg/dm³) | 6.0 | >12 | Baixo |

Comece diretamente com o # TITULO.`;

// ─────────────────────────────────────────────────────────────
// UTILITÁRIOS COMPARTILHADOS
// ─────────────────────────────────────────────────────────────

async function gerarConteudo(messages, promptSistema) {
  const apiMsgs = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role,
      content: Array.isArray(m.content)
        ? m.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
        : String(m.content),
    }));

  apiMsgs.push({ role: 'user', content: 'Gere o conteúdo completo baseado nessa conversa.' });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: promptSistema,
    messages: apiMsgs,
  });

  return response.content[0].text;
}

function extrairTitulo(markdown) {
  for (const linha of markdown.split('\n')) {
    if (linha.startsWith('# ') && !linha.startsWith('## ')) {
      return linha.replace(/^# /, '').trim();
    }
  }
  return 'Laudo Técnico Agronômico';
}

function parseSecoes(markdown) {
  const secoes = [];
  let atual = null;
  for (const linha of markdown.split('\n')) {
    if (linha.startsWith('# ') && !linha.startsWith('## ')) continue;
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

// Agrupa linhas em blocos: { type: 'line'|'table', content: string | lines: string[] }
function parseContentBlocks(linhas) {
  const blocks = [];
  let tableBuffer = [];

  for (const linha of linhas) {
    const t = linha.trim();
    if (t.startsWith('```') || t.startsWith('├') || t.startsWith('└') || t.startsWith('─')) continue;

    if (t.startsWith('|')) {
      tableBuffer.push(t);
    } else {
      if (tableBuffer.length > 0) {
        blocks.push({ type: 'table', lines: tableBuffer });
        tableBuffer = [];
      }
      blocks.push({ type: 'line', content: linha });
    }
  }
  if (tableBuffer.length > 0) {
    blocks.push({ type: 'table', lines: tableBuffer });
  }
  return blocks;
}

// Analisa linhas de tabela markdown → { headers: string[], rows: string[][] }
function parseMarkdownTable(tableLines) {
  const rows = [];
  let headers = null;

  for (const linha of tableLines) {
    if (linha.match(/^\|[-| :]+\|$/)) continue; // separador |---|---|
    const cols = linha.split('|').slice(1, -1).map(c => c.trim());
    if (cols.length === 0) continue;
    if (!headers) {
      headers = cols;
    } else {
      rows.push(cols);
    }
  }
  return { headers: headers || [], rows };
}

// ─────────────────────────────────────────────────────────────
// GERADOR DOCX
// ─────────────────────────────────────────────────────────────

function markdownTableToWordTable(tableLines) {
  const { headers, rows } = parseMarkdownTable(tableLines);
  if (!headers.length) return null;

  const numCols = headers.length;
  const colWidth = Math.floor(9000 / numCols); // em twips (100% ≈ 9000)

  const makeCell = (text, isHeader) =>
    new TableCell({
      width: { size: colWidth, type: WidthType.DXA },
      shading: isHeader
        ? { type: ShadingType.CLEAR, color: 'auto', fill: '15803d' }
        : undefined,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'D1FAE5' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1FAE5' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'D1FAE5' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'D1FAE5' },
      },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isHeader,
              color: isHeader ? 'FFFFFF' : '1f2937',
              size: 20,
            }),
          ],
          alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
        }),
      ],
    });

  const tableRows = [
    new TableRow({
      tableHeader: true,
      children: headers.map(h => makeCell(h, true)),
    }),
    ...rows.map((row, rowIdx) =>
      new TableRow({
        children: Array.from({ length: numCols }, (_, i) => {
          const cell = makeCell(row[i] ?? '', false);
          // Linha alternada levemente cinza
          if (rowIdx % 2 === 1) {
            cell.options = cell.options || {};
          }
          return cell;
        }),
      })
    ),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: tableRows,
  });
}

function linhaParaElemDocx(linha) {
  const t = linha.trim();
  if (!t) return new Paragraph({ text: '', spacing: { after: 60 } });

  if (linha.startsWith('### ') || linha.startsWith('#### ')) {
    return new Paragraph({
      text: linha.replace(/^#{3,} /, '').trim(),
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 200, after: 80 },
    });
  }
  if (linha.startsWith('- ') || linha.startsWith('* ')) {
    const txt = linha.replace(/^[-*] /, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
    return new Paragraph({ text: txt, bullet: { level: 0 }, spacing: { after: 60 } });
  }

  // Negrito inline **texto**
  const partes = linha.split(/\*\*(.*?)\*\*/g);
  const runs = partes.map((p, i) => new TextRun({ text: p, bold: i % 2 === 1, size: 22 }));
  return new Paragraph({ children: runs, spacing: { after: 80 } });
}

async function gerarDocx(markdown) {
  const secoes = parseSecoes(markdown);
  const titulo = extrairTitulo(markdown);

  const filhos = [
    new Paragraph({
      text: titulo,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 0, after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}  •  Agrônomo IA`,
          color: '6B7280',
          size: 18,
          italics: true,
        }),
      ],
      spacing: { after: 400 },
    }),
  ];

  for (const secao of secoes) {
    filhos.push(
      new Paragraph({
        text: secao.titulo,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 150 },
      })
    );

    const blocks = parseContentBlocks(secao.linhas);

    for (const block of blocks) {
      if (block.type === 'table') {
        const tabela = markdownTableToWordTable(block.lines);
        if (tabela) {
          filhos.push(tabela);
          filhos.push(new Paragraph({ text: '', spacing: { after: 120 } }));
        }
      } else {
        filhos.push(linhaParaElemDocx(block.content));
      }
    }

    filhos.push(new Paragraph({ text: '', spacing: { after: 120 } }));
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { size: 22, font: 'Calibri' } },
        heading1: {
          run: { color: '15803d', bold: true, size: 36, font: 'Calibri' },
          paragraph: { spacing: { before: 0, after: 200 } },
        },
        heading2: {
          run: { color: '15803d', bold: true, size: 28, font: 'Calibri' },
          paragraph: { spacing: { before: 300, after: 100 } },
        },
        heading3: {
          run: { color: '166534', bold: true, size: 22, font: 'Calibri' },
          paragraph: { spacing: { before: 160, after: 60 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1296, bottom: 1440, left: 1296 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Agrônomo IA  •  Página ', color: '9CA3AF', size: 16 }),
                  new TextRun({ children: [PageNumber.CURRENT], color: '9CA3AF', size: 16 }),
                  new TextRun({ text: ' de ', color: '9CA3AF', size: 16 }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], color: '9CA3AF', size: 16 }),
                ],
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        children: filhos,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ─────────────────────────────────────────────────────────────
// GERADOR PPTX
// ─────────────────────────────────────────────────────────────

async function gerarPptx(markdown) {
  const pptxgenModule = await import('pptxgenjs');
  const PptxGenJS = pptxgenModule.default;
  const prs = new PptxGenJS();

  const titulo = extrairTitulo(markdown);
  prs.layout = 'LAYOUT_WIDE';
  prs.author = 'Agrônomo IA';
  prs.title = titulo;

  // Slide de capa
  const capa = prs.addSlide();
  capa.background = { color: '15803d' };
  const tituloFontSize = titulo.length > 50 ? 28 : titulo.length > 35 ? 32 : 38;
  capa.addText(titulo, {
    x: 0.5, y: 1.4, w: 9, h: 2.8,
    fontSize: tituloFontSize, bold: true, color: 'FFFFFF', align: 'center',
    wrap: true, valign: 'middle',
  });
  capa.addShape('rect', { x: 2, y: 4.3, w: 6, h: 0.04, fill: { color: 'BBFFBB' } });
  capa.addText(`Agrônomo IA  •  ${new Date().toLocaleDateString('pt-BR')}`, {
    x: 0.5, y: 4.5, w: 9, h: 0.6,
    fontSize: 16, color: 'BBFFBB', align: 'center', italic: true,
  });

  const secoes = parseSecoes(markdown);

  function adicionarSlideConteudo(tituloSlide, itens) {
    const MAX_POR_SLIDE = 9;
    for (let i = 0; i < Math.max(itens.length, 1); i += MAX_POR_SLIDE) {
      const parte = itens.slice(i, i + MAX_POR_SLIDE);
      const isParte = itens.length > MAX_POR_SLIDE;
      const numParte = Math.floor(i / MAX_POR_SLIDE) + 1;
      const totalPartes = Math.ceil(itens.length / MAX_POR_SLIDE);
      const nomeParte = isParte ? `${tituloSlide} (${numParte}/${totalPartes})` : tituloSlide;

      const slide = prs.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Barra lateral esquerda decorativa
      slide.addShape('rect', { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: '15803d' } });

      // Header do slide
      slide.addShape('rect', { x: 0.12, y: 0, w: 9.88, h: 1.05, fill: { color: '15803d' } });
      slide.addText(nomeParte, {
        x: 0.3, y: 0, w: 9.4, h: 1.05,
        fontSize: 20, bold: true, color: 'FFFFFF', align: 'left', valign: 'middle',
      });

      if (parte.length > 0) {
        const fontSize = parte.length > 7 ? 12 : 13;
        slide.addText(parte, {
          x: 0.4, y: 1.2, w: 9.3, h: 5.6,
          fontSize, color: '1f2937', valign: 'top',
          wrap: true, lineSpacingMultiple: 1.2,
        });
      }

      // Rodapé
      slide.addShape('rect', { x: 0.12, y: 7.15, w: 9.88, h: 0.35, fill: { color: 'F3F4F6' } });
      slide.addText('Agrônomo IA', {
        x: 0.12, y: 7.15, w: 9.6, h: 0.35,
        fontSize: 9, color: '9CA3AF', align: 'right', valign: 'middle',
      });
    }
  }

  for (const secao of secoes) {
    const itensBrutos = secao.linhas
      .filter(l => {
        const t = l.trim();
        if (!t) return false;
        if (t.startsWith('|')) return false;
        if (t.startsWith('---')) return false;
        if (t.startsWith('```')) return false;
        if (t.startsWith('├') || t.startsWith('└') || t.startsWith('─')) return false;
        return true;
      })
      .map(l => {
        const isBullet = l.startsWith('- ') || l.startsWith('* ');
        const isSubtitulo = l.startsWith('### ') || l.startsWith('#### ');
        const textoLimpo = l
          .replace(/^[-*] /, '')
          .replace(/^#{2,} /, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .trim();
        if (!textoLimpo) return null;
        return {
          text: textoLimpo,
          options: {
            bullet: isBullet && !isSubtitulo,
            bold: isSubtitulo,
            color: isSubtitulo ? '15803d' : '1f2937',
            paraSpaceBefore: isSubtitulo ? 8 : 3,
          },
        };
      })
      .filter(Boolean);

    adicionarSlideConteudo(secao.titulo, itensBrutos);
  }

  // Slide de encerramento
  const fim = prs.addSlide();
  fim.background = { color: '166534' };
  fim.addText('Obrigado!', {
    x: 0.5, y: 2.5, w: 9, h: 1.2,
    fontSize: 42, bold: true, color: 'FFFFFF', align: 'center',
  });
  fim.addText('Agrônomo IA — Tecnologia a serviço do campo', {
    x: 0.5, y: 3.9, w: 9, h: 0.6,
    fontSize: 16, color: 'BBFFBB', align: 'center', italic: true,
  });

  return prs.write({ outputType: 'nodebuffer' });
}

// ─────────────────────────────────────────────────────────────
// GERADOR XLSX
// ─────────────────────────────────────────────────────────────

const COR_VERDE_ESCURO  = 'FF15803D';
const COR_VERDE_MEDIO   = 'FF166534';
const COR_VERDE_CLARO   = 'FFD1FAE5';
const COR_VERDE_XCLARO  = 'FFF0FDF4';
const COR_BRANCO        = 'FFFFFFFF';
const COR_CINZA_TEXTO   = 'FF6B7280';

function estiloHeaderSecao(cell) {
  cell.font = { bold: true, color: { argb: COR_BRANCO }, size: 12 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_VERDE_ESCURO } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
}

function estiloHeaderTabela(cell) {
  cell.font = { bold: true, color: { argb: COR_BRANCO }, size: 10 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_VERDE_MEDIO } };
  cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  cell.border = {
    top:    { style: 'thin', color: { argb: COR_VERDE_CLARO } },
    bottom: { style: 'thin', color: { argb: COR_VERDE_CLARO } },
    left:   { style: 'thin', color: { argb: COR_VERDE_CLARO } },
    right:  { style: 'thin', color: { argb: COR_VERDE_CLARO } },
  };
}

function estiloDataRow(cell, alt = false) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: alt ? COR_VERDE_XCLARO : COR_BRANCO } };
  cell.font = { size: 10, color: { argb: 'FF1F2937' } };
  cell.alignment = { wrapText: true, vertical: 'middle' };
  cell.border = {
    top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
  };
}

function limparTexto(txt) {
  return txt
    .replace(/^#{1,6} /, '')
    .replace(/^[-*] /, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

async function gerarXlsx(markdown) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Agrônomo IA';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Laudo Técnico', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  // Colunas fixas: A=Seção (25), B-G=dados dinâmicos (20 cada)
  sheet.columns = [
    { key: 'A', width: 26 },
    { key: 'B', width: 28 },
    { key: 'C', width: 22 },
    { key: 'D', width: 22 },
    { key: 'E', width: 22 },
    { key: 'F', width: 22 },
    { key: 'G', width: 22 },
  ];

  const ULTIMA_COL = 'G';
  const NUM_COLS = 7; // A–G

  // ── Linha 1: Título
  sheet.mergeCells(`A1:${ULTIMA_COL}1`);
  const tituloCell = sheet.getCell('A1');
  tituloCell.value = extrairTitulo(markdown).toUpperCase();
  tituloCell.font = { bold: true, size: 14, color: { argb: COR_BRANCO } };
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_VERDE_ESCURO } };
  tituloCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 32;

  // ── Linha 2: Data
  sheet.mergeCells(`A2:${ULTIMA_COL}2`);
  const dataCell = sheet.getCell('A2');
  dataCell.value = `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}  •  Agrônomo IA`;
  dataCell.font = { italic: true, size: 10, color: { argb: COR_CINZA_TEXTO } };
  dataCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(2).height = 18;

  // ── Linha 3: separador vazio
  sheet.mergeCells(`A3:${ULTIMA_COL}3`);
  sheet.getRow(3).height = 6;

  let rowNum = 4;

  const secoes = parseSecoes(markdown);

  for (const secao of secoes) {
    const blocks = parseContentBlocks(secao.linhas);
    if (blocks.length === 0) continue;

    // ── Cabeçalho da seção (A-G mergeado)
    sheet.mergeCells(`A${rowNum}:${ULTIMA_COL}${rowNum}`);
    const secCell = sheet.getCell(`A${rowNum}`);
    secCell.value = secao.titulo;
    estiloHeaderSecao(secCell);
    sheet.getRow(rowNum).height = 22;
    rowNum++;
    for (const block of blocks) {
      if (block.type === 'table') {
        const { headers, rows: dataRows } = parseMarkdownTable(block.lines);
        if (!headers.length) continue;
        const nCols = Math.min(headers.length, NUM_COLS - 1);
        for (let c = 0; c < nCols; c++) {
          const colLetra = String.fromCharCode(66 + c);
          const cell = sheet.getCell(`${colLetra}${rowNum}`);
          cell.value = headers[c] ?? '';
          estiloHeaderTabela(cell);
        }
        sheet.getCell(`A${rowNum}`).value = '';
        sheet.getRow(rowNum).height = 20;
        rowNum++;
        dataRows.forEach((row, rowIdx) => {
          sheet.getCell(`A${rowNum}`).value = '';
          for (let c = 0; c < nCols; c++) {
            const colLetra = String.fromCharCode(66 + c);
            const cell = sheet.getCell(`${colLetra}${rowNum}`);
            cell.value = row[c] ?? '';
            estiloDataRow(cell, rowIdx % 2 === 1);
          }
          sheet.getRow(rowNum).height = 18;
          rowNum++;
        });
        sheet.mergeCells(`A${rowNum}:${ULTIMA_COL}${rowNum}`);
        sheet.getRow(rowNum).height = 6;
        rowNum++;
      } else {
        const t = block.content.trim();
        if (!t) continue;
        const isSubtitulo = block.content.startsWith('### ') || block.content.startsWith('#### ');
        const isBullet = block.content.startsWith('- ') || block.content.startsWith('* ');
        const texto = limparTexto(block.content);
        if (!texto) continue;
        sheet.getCell(`A${rowNum}`).value = '';
        sheet.mergeCells(`B${rowNum}:${ULTIMA_COL}${rowNum}`);
        const contentCell = sheet.getCell(`B${rowNum}`);
        if (isBullet) { contentCell.value = '• ' + texto; contentCell.font = { size: 10, color: { argb: 'FF1F2937' } }; }
        else if (isSubtitulo) { contentCell.value = texto; contentCell.font = { bold: true, size: 10, color: { argb: COR_VERDE_MEDIO } }; contentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COR_VERDE_CLARO } }; }
        else { contentCell.value = texto; contentCell.font = { size: 10, color: { argb: 'FF1F2937' } }; }
        contentCell.alignment = { wrapText: true, vertical: 'top' };
        sheet.getRow(rowNum).height = 18;
        rowNum++;
      }
    }
    sheet.mergeCells(`A${rowNum}:${ULTIMA_COL}${rowNum}`);
    sheet.getRow(rowNum).height = 8;
    rowNum++;
  }
  return workbook.xlsx.writeBuffer();
}

export async function POST(req) {
  try {
    const { messages, formato } = await req.json();
    if (!messages || !formato) return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 });
    let promptSistema;
    if (formato === 'pptx') promptSistema = PROMPT_PPTX;
    else if (formato === 'xlsx') promptSistema = PROMPT_XLSX;
    else promptSistema = PROMPT_DOCUMENTO;
    const markdown = await gerarConteudo(messages, promptSistema);
    let buffer, contentType, filename;
    const ts = Date.now();
    if (formato === 'docx') { buffer = await gerarDocx(markdown); contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; filename = `laudo_agronomo_${ts}.docx`; }
    else if (formato === 'pptx') { buffer = await gerarPptx(markdown); contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'; filename = `apresentacao_agronomo_${ts}.pptx`; }
    else if (formato === 'xlsx') { buffer = await gerarXlsx(markdown); contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'; filename = `dados_agronomo_${ts}.xlsx`; }
    else return NextResponse.json({ error: 'Formato inválido. Use: docx, pptx, xlsx' }, { status: 400 });
    return new NextResponse(buffer, { status: 200, headers: { 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${filename}"`, 'Con   const markdown = await gerarConteudo(messages, promptSistema);

    let buffer, contentType, filename;
    const ts = Date.now();

    if (formato === 'docx') {
      buffer = await gerarDocx(markdown);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      filename = `laudo_agronomo_${ts}.docx`;
    } else if (formato === 'pptx') {
      buffer = await gerarPptx(markdown);
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      filename = `apresentacao_agronomo_${ts}.pptx`;
    } else if (formato === 'xlsx') {
      buffer = await gerarXlsx(markdown);
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      filename = `dados_agronomo_${ts}.xlsx`;
    } else {
      return NextResponse.json({ error: 'Formato inválido. Use: docx, pptx, xlsx' }, { status: 400 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length ?? buffer.byteLength),
      },
    });
  } catch (err) {
    console.error('Export error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
