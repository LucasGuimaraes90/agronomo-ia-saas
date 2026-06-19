import Anthropic from '@anthropic-ai/sdk';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT_DOCUMENTO = `Você é um especialista agronômico que gera documentos técnicos profissionais.
Analise a conversa abaixo e gere um documento COMPLETO e ESTRUTURADO em markdown.

REGRAS OBRIGATÓRIAS:
- A primeira linha deve ser: # TITULO DO DOCUMENTO (baseado no tema real da conversa)
- Use ## para seções principais e ### para subseções
- Adapte as seções AO TEMA REAL discutido — NÃO use estrutura genérica de análise de solo se o tema for outro
- Inclua TODOS os dados técnicos, doses, valores e recomendações mencionados
- Gere ao menos 5 seções (##) com conteúdo substancial
- Seja preciso, técnico e completo
- Pode usar tabelas markdown (|col|col|) pois o formato suporta

EXEMPLOS DE ADAPTAÇÃO:
- Conversa sobre deficiência de boro na soja → seções: O que é Boro, Sintomas Visuais, Causas da Deficiência, Diagnóstico, Impactos na Produção, Recomendações de Correção, Doses Recomendadas, Manejo Preventivo
- Conversa sobre análise de solo → seções: Identificação da Lavoura, Resultados, Calagem, Adubação, Cronograma, Observações
- Conversa sobre pragas → seções: Identificação da Praga, Ciclo Biológico, Sintomas, Nível de Dano, Controle Químico, Controle Biológico, Monitoramento
- Conversa sobre irrigação → seções: Necessidade Hídrica, Sistema Recomendado, Manejo, Cronograma

Comece diretamente com o # TITULO — sem introduções, sem meta-texto.`;

const PROMPT_PPTX = `Você é um especialista agronômico que cria apresentações PowerPoint profissionais.
Analise a conversa abaixo e gere conteúdo OTIMIZADO PARA SLIDES em markdown.

REGRAS CRÍTICAS PARA SLIDES:
- A primeira linha deve ser: # TITULO DA APRESENTAÇÃO (baseado no tema real da conversa)
- Use ## para criar cada slide (máximo 8-10 slides no total)
- Cada seção (##) vira UM SLIDE — portanto LIMITE o conteúdo a no máximo 8 bullet points por slide
- Use bullet points curtos (- máximo 15 palavras cada)
- NÃO use tabelas markdown (| col |) — slides não renderizam tabelas
- NÃO use blocos de código (```) — não renderiza em slides
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

async function gerarConteudo(messages, promptSistema = PROMPT_DOCUMENTO) {
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
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: promptSistema,
    messages: apiMsgs,
  });

  return response.content[0].text;
}

function extrairTitulo(markdown) {
  const linhas = markdown.split('\n');
  for (const linha of linhas) {
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
    // Ignora o título principal (# Titulo)
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
  const titulo = extrairTitulo(markdown);
  const filhos = [
    new Paragraph({
      text: titulo,
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({ text: `Gerado em: ${new Date().toLocaleDateString('pt-BR')} • Agrônomo IA` }),
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

  const titulo = extrairTitulo(markdown);
  prs.layout = 'LAYOUT_WIDE';
  prs.author = 'Agrônomo IA';
  prs.title = titulo;

  // Slide de capa
  const capa = prs.addSlide();
  capa.background = { color: '15803d' };
  // Título dinâmico — quebra em 2 linhas se longo
  const tituloFontSize = titulo.length > 50 ? 28 : titulo.length > 35 ? 32 : 38;
  capa.addText(titulo, {
    x: 0.5, y: 1.5, w: 9, h: 2.5,
    fontSize: tituloFontSize, bold: true, color: 'FFFFFF', align: 'center',
    wrap: true, valign: 'middle',
  });
  capa.addText(`Agrônomo IA  •  ${new Date().toLocaleDateString('pt-BR')}`, {
    x: 0.5, y: 4.2, w: 9, h: 0.7,
    fontSize: 18, color: 'BBFFBB', align: 'center',
  });

  const secoes = parseSecoes(markdown);

  function adicionarSlideConteudo(titulo, itens) {
    const MAX_POR_SLIDE = 9;
    // Divide em múltiplos slides se houver muito conteúdo
    for (let i = 0; i < itens.length; i += MAX_POR_SLIDE) {
      const parte = itens.slice(i, i + MAX_POR_SLIDE);
      const isParte = itens.length > MAX_POR_SLIDE;
      const numParte = Math.floor(i / MAX_POR_SLIDE) + 1;
      const totalPartes = Math.ceil(itens.length / MAX_POR_SLIDE);
      const tituloSlide = isParte ? `${titulo} (${numParte}/${totalPartes})` : titulo;

      const slide = prs.addSlide();
      slide.background = { color: 'FFFFFF' };

      // Barra de título verde
      slide.addText(tituloSlide, {
        x: 0, y: 0, w: '100%', h: 1.1,
        fontSize: 20, bold: true, color: 'FFFFFF', align: 'left',
        fill: { color: '15803d' },
        margin: [0, 0, 0, 18],
      });

      if (parte.length > 0) {
        const fontSize = parte.length > 7 ? 12 : 13;
        slide.addText(parte, {
          x: 0.4, y: 1.25, w: 9.2, h: 5.3,
          fontSize, color: '1f2937', valign: 'top',
          wrap: true, lineSpacingMultiple: 1.15,
        });
      }

      // Rodapé
      slide.addText('Agrônomo IA', {
        x: 0, y: 6.8, w: '100%', h: 0.35,
        fontSize: 9, color: '9ca3af', align: 'right',
      });
    }
  }

  for (const secao of secoes) {
    // Filtra linhas inválidas: tabelas markdown, separadores, blocos de código, linhas vazias
    const itensBrutos = secao.linhas
      .filter(l => {
        const t = l.trim();
        if (!t) return false;
        if (t.startsWith('|')) return false;      // tabela markdown
        if (t.startsWith('---')) return false;     // separador
        if (t.startsWith('```')) return false;     // bloco de código
        if (t.startsWith('├') || t.startsWith('└') || t.startsWith('─')) return false; // tree
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
            paraSpaceBefore: isSubtitulo ? 6 : 3,
          }
        };
      })
      .filter(Boolean);

    adicionarSlideConteudo(secao.titulo, itensBrutos);
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
  const tituloXlsx = extrairTitulo(markdown).toUpperCase();
  const tituloCell = sheet.getCell('A1');
  tituloCell.value = tituloXlsx + ' — Agrônomo IA';
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

  // Função para limpar linha de markdown
  function limparLinhaXlsx(linha) {
    return linha
      .replace(/^#{1,6} /, '')
      .replace(/^[-*] /, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim();
  }

  // Função para detectar se linha é tabela markdown e converter para texto
  function tabelaParaTexto(linhas) {
    const resultado = [];
    let emTabela = false;
    let cabecalho = null;

    for (const linha of linhas) {
      const t = linha.trim();
      if (!t) continue;
      if (t.startsWith('---') || t.startsWith('```')) continue;
      if (t.startsWith('├') || t.startsWith('└') || t.startsWith('─')) continue;

      if (t.startsWith('|')) {
        // Linha de tabela markdown
        if (t.match(/^\|[-| :]+\|$/)) continue; // linha separadora (|---|---|)
        const colunas = t.split('|').filter(c => c.trim()).map(c => c.trim());
        if (!emTabela) {
          cabecalho = colunas;
          emTabela = true;
        } else {
          // Linha de dados: "Coluna1: valor1 | Coluna2: valor2"
          const pares = colunas.map((v, i) => cabecalho && cabecalho[i] ? `${cabecalho[i]}: ${v}` : v);
          resultado.push({ tipo: 'bullet', texto: pares.join('  |  ') });
        }
      } else {
        emTabela = false;
        cabecalho = null;
        const isSubtitulo = linha.startsWith('### ') || linha.startsWith('#### ');
        const isBullet = linha.startsWith('- ') || linha.startsWith('* ');
        resultado.push({ tipo: isSubtitulo ? 'subtitulo' : isBullet ? 'bullet' : 'texto', texto: limparLinhaXlsx(linha) });
      }
    }
    return resultado;
  }

  for (const secao of secoes) {
    const itensDaSecao = tabelaParaTexto(secao.linhas);
    if (itensDaSecao.length === 0) continue;

    let primeiraLinhaDaSecao = rowNum;

    for (let i = 0; i < itensDaSecao.length; i++) {
      const { tipo, texto } = itensDaSecao[i];
      if (!texto) continue;
      const isSubtitulo = tipo === 'subtitulo';
      const isBullet = tipo === 'bullet';

      const row = sheet.addRow([
        i === 0 ? secao.titulo : '',
        isSubtitulo ? texto : (isBullet ? '• ' + texto : ''),
        isSubtitulo ? '' : texto,
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
      return NextResponse.json({ error: 'Parâmetros ausentes' }, { stat