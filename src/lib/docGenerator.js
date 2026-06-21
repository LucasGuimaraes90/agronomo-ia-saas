// Geração de documentos no browser (sem servidor, sem timeout)

// ─── Parser de Markdown ───────────────────────────────────────

function parseMarkdown(text) {
  const lines = text.split('\n');
  const titulo = lines.find(l => l.startsWith('# ') && !l.startsWith('## '))
    ?.replace(/^# /, '').trim() || 'Documento';

  const secoes = [];
  let secaoAtual = null;
  let tableLines = [];
  let inTable = false;

  function flushTable() {
    if (tableLines.length >= 2 && secaoAtual) {
      const headers = tableLines[0].split('|').map(c => c.trim()).filter(Boolean);
      const rows = tableLines.slice(2).map(row =>
        row.split('|').map(c => c.trim()).filter(Boolean)
      ).filter(r => r.length > 0);
      secaoAtual.blocos.push({ tipo: 'tabela', headers, rows });
      tableLines = [];
      inTable = false;
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('# ') && !line.startsWith('## ')) continue;

    if (line.startsWith('## ')) {
      if (inTable) flushTable();
      secaoAtual = { titulo: line.replace(/^## /, '').trim(), blocos: [] };
      secoes.push(secaoAtual);
      continue;
    }

    if (!secaoAtual) continue;

    if (line.startsWith('|')) {
      inTable = true;
      tableLines.push(line);
      continue;
    } else if (inTable) {
      flushTable();
    }

    if (line.startsWith('### ')) {
      secaoAtual.blocos.push({ tipo: 'subtitulo', texto: line.replace(/^### /, '').trim() });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      secaoAtual.blocos.push({ tipo: 'bullet', texto: line.replace(/^[-*] /, '').trim() });
    } else if (line.trim()) {
      secaoAtual.blocos.push({ tipo: 'texto', texto: line.trim() });
    }
  }

  if (inTable) flushTable();
  return { titulo, secoes };
}

function parseInline(texto, TextRun) {
  const runs = [];
  const regex = /\*\*(.*?)\*\*|\*(.*?)\*/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(texto)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: texto.slice(lastIndex, match.index) }));
    }
    if (match[1] !== undefined) {
      runs.push(new TextRun({ text: match[1], bold: true }));
    } else if (match[2] !== undefined) {
      runs.push(new TextRun({ text: match[2], italics: true }));
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < texto.length) {
    runs.push(new TextRun({ text: texto.slice(lastIndex) }));
  }
  return runs.length ? runs : [new TextRun({ text: texto })];
}

// ─── DOCX ────────────────────────────────────────────────────

export async function generateDocx(titulo, markdown) {
  const {
    Document, Packer, Paragraph, HeadingLevel, TextRun,
    Table, TableRow, TableCell, WidthType, AlignmentType,
    ShadingType, BorderStyle,
  } = await import('docx');

  const { secoes } = parseMarkdown(markdown);
  const children = [];

  children.push(new Paragraph({
    children: [new TextRun({ text: titulo, bold: true, size: 56, color: '2E7D32' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  children.push(new Paragraph({
    border: { bottom: { color: '2E7D32', size: 6, space: 1, style: BorderStyle.SINGLE } },
    spacing: { after: 400 },
  }));

  for (const secao of secoes) {
    children.push(new Paragraph({
      children: [new TextRun({ text: secao.titulo, bold: true, size: 28, color: '2E7D32' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 120 },
    }));

    for (const bloco of secao.blocos) {
      if (bloco.tipo === 'subtitulo') {
        children.push(new Paragraph({
          children: [new TextRun({ text: bloco.texto, bold: true, size: 24, color: '1B5E20' })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 80 },
        }));
      } else if (bloco.tipo === 'bullet') {
        children.push(new Paragraph({
          children: parseInline(bloco.texto, TextRun),
          bullet: { level: 0 },
          spacing: { after: 60 },
        }));
      } else if (bloco.tipo === 'texto') {
        children.push(new Paragraph({
          children: parseInline(bloco.texto, TextRun),
          spacing: { after: 80 },
        }));
      } else if (bloco.tipo === 'tabela' && bloco.headers.length) {
        const headerRow = new TableRow({
          children: bloco.headers.map(h =>
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({ text: h, bold: true, size: 20, color: 'FFFFFF' })],
                alignment: AlignmentType.CENTER,
              })],
              shading: { type: ShadingType.SOLID, color: '2E7D32', fill: '2E7D32' },
              width: { size: Math.floor(9000 / bloco.headers.length), type: WidthType.DXA },
            })
          ),
        });
        const dataRows = bloco.rows.map((row, ri) =>
          new TableRow({
            children: bloco.headers.map((_, ci) =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: row[ci] || '', size: 20 })] })],
                shading: ri % 2 === 0
                  ? { type: ShadingType.SOLID, color: 'F1F8E9', fill: 'F1F8E9' }
                  : { type: ShadingType.SOLID, color: 'FFFFFF', fill: 'FFFFFF' },
              })
            ),
          })
        );
        children.push(new Table({
          rows: [headerRow, ...dataRows],
          width: { size: 9000, type: WidthType.DXA },
        }));
        children.push(new Paragraph({ spacing: { after: 120 } }));
      }
    }
  }

  children.push(new Paragraph({
    children: [new TextRun({
      text: `Documento gerado por Agrônomo IA — ${new Date().toLocaleDateString('pt-BR')}`,
      size: 18, color: '9E9E9E', italics: true,
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600 },
  }));

  const doc = new Document({
    sections: [{ properties: {}, children }],
    styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
  });

  return await Packer.toBlob(doc);
}

// ─── XLSX ────────────────────────────────────────────────────

export async function generateXlsx(titulo, markdown) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const { secoes } = parseMarkdown(markdown);

  for (const secao of secoes) {
    const rows = [];
    rows.push([secao.titulo]);
    rows.push([]);

    let hasTable = false;
    const bullets = [];

    for (const bloco of secao.blocos) {
      if (bloco.tipo === 'tabela' && bloco.headers.length) {
        hasTable = true;
        rows.push(bloco.headers);
        for (const row of bloco.rows) {
          rows.push(bloco.headers.map((_, i) => row[i] || ''));
        }
        rows.push([]);
      } else if (bloco.tipo === 'bullet') {
        bullets.push(['• ' + bloco.texto]);
      } else if (bloco.tipo === 'texto') {
        bullets.push([bloco.texto]);
      } else if (bloco.tipo === 'subtitulo') {
        bullets.push([bloco.texto]);
      }
    }

    if (bullets.length) {
      if (hasTable) rows.push(['Observações']);
      for (const b of bullets) rows.push(b);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 30 }];
    const nomeAba = secao.titulo.replace(/[\\/?*[\]:]/g, '').substring(0, 31) || 'Dados';
    XLSX.utils.book_append_sheet(wb, ws, nomeAba);
  }

  const resumo = XLSX.utils.aoa_to_sheet([
    ['Relatório: ' + titulo],
    ['Gerado em: ' + new Date().toLocaleDateString('pt-BR')],
    ['Gerado por: Agrônomo IA'],
    [],
    ['Seções neste documento:'],
    ...secoes.map(s => ['• ' + s.titulo]),
  ]);
  XLSX.utils.book_append_sheet(wb, resumo, 'Resumo');
  wb.SheetNames = ['Resumo', ...wb.SheetNames.filter(n => n !== 'Resumo')];

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ─── PPTX ────────────────────────────────────────────────────

export async function generatePptx(titulo, markdown) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();

  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = titulo;

  const VERDE = '2E7D32';
  const BRANCO = 'FFFFFF';

  const slideTitle = pptx.addSlide();
  slideTitle.background = { color: VERDE };
  slideTitle.addText(titulo, {
    x: 0.5, y: 2.5, w: '90%', h: 1.5,
    fontSize: 36, bold: true, color: BRANCO,
    align: 'center', fontFace: 'Calibri',
  });
  slideTitle.addText('Agrônomo IA — Relatório Técnico', {
    x: 0.5, y: 4.2, w: '90%', h: 0.5,
    fontSize: 16, color: 'A5D6A7', align: 'center', italic: true,
  });
  slideTitle.addText(new Date().toLocaleDateString('pt-BR'), {
    x: 0.5, y: 4.9, w: '90%', h: 0.4,
    fontSize: 14, color: 'C8E6C9', align: 'center',
  });

  const { secoes } = parseMarkdown(markdown);

  for (const secao of secoes) {
    const slide = pptx.addSlide();
    slide.background = { color: BRANCO };

    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 1.2,
      fill: { color: VERDE },
    });

    slide.addText(secao.titulo, {
      x: 0.4, y: 0.15, w: '92%', h: 0.9,
      fontSize: 24, bold: true, color: BRANCO,
      fontFace: 'Calibri',
    });

    const bullets = secao.blocos
      .filter(b => b.tipo === 'bullet' || b.tipo === 'texto' || b.tipo === 'subtitulo')
      .slice(0, 8)
      .map(b => ({
        text: (b.tipo === 'subtitulo' ? '▸ ' : '• ') + b.texto.replace(/\*\*(.*?)\*\*/g, '$1'),
        options: {
          fontSize: b.tipo === 'subtitulo' ? 16 : 14,
          bold: b.tipo === 'subtitulo',
          color: b.tipo === 'subtitulo' ? VERDE : '333333',
          bullet: false,
        },
      }));

    if (bullets.length) {
      slide.addText(bullets, {
        x: 0.4, y: 1.4, w: '92%', h: 5.5,
        valign: 'top', fontFace: 'Calibri',
      });
    }

    slide.addText('Agrônomo IA', {
      x: 0, y: 6.9, w: '100%', h: 0.3,
      fontSize: 9, color: 'AAAAAA', align: 'center',
    });
  }

  return await pptx.write({ outputType: 'blob' });
}
