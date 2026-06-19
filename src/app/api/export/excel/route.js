import Anthropic from '@anthropic-ai/sdk';
import ExcelJS from 'exceljs';

const PROMPT_EXCEL = `Analise a conversa agronomica e extraia os dados em JSON com esta estrutura exata (sem texto extra, apenas JSON):
{
  "propriedade": "nome da propriedade ou Nao informado",
  "cultura": "cultura ou Nao informada",
  "data": "data ou hoje",
  "analise_solo": [
    {"parametro": "pH", "valor": "", "unidade": "", "status": "baixo/adequado/alto"},
    {"parametro": "Materia Organica", "valor": "", "unidade": "%", "status": ""},
    {"parametro": "Fosforo (P)", "valor": "", "unidade": "mg/dm3", "status": ""},
    {"parametro": "Potassio (K)", "valor": "", "unidade": "cmolc/dm3", "status": ""},
    {"parametro": "Calcio (Ca)", "valor": "", "unidade": "cmolc/dm3", "status": ""},
    {"parametro": "Magnesio (Mg)", "valor": "", "unidade": "cmolc/dm3", "status": ""},
    {"parametro": "Aluminio (Al)", "valor": "", "unidade": "cmolc/dm3", "status": ""},
    {"parametro": "Argila", "valor": "", "unidade": "%", "status": ""}
  ],
  "calagem": [
    {"item": "Necessidade de Calcario", "dose": "", "unidade": "t/ha"},
    {"item": "Tipo recomendado", "dose": "", "unidade": "PRNT%"}
  ],
  "adubacao": [
    {"periodo": "Plantio", "N": "", "P2O5": "", "K2O": "", "unidade": "kg/ha"},
    {"periodo": "Cobertura 1", "N": "", "P2O5": "", "K2O": "", "unidade": "kg/ha"},
    {"periodo": "Cobertura 2", "N": "", "P2O5": "", "K2O": "", "unidade": "kg/ha"}
  ],
  "observacoes": "observacoes tecnicas resumidas"
}`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

    const textMsgs = messages.filter(m => typeof m.content === 'string').map(m => ({ role: m.role, content: m.content }));
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: PROMPT_EXCEL,
      messages: textMsgs.length > 0 ? textMsgs : [{ role: 'user', content: 'Sem dados de conversa.' }],
    });

    let data = {};
    try { data = JSON.parse(res.content[0].text); } catch { data = { propriedade: 'Nao informado', analise_solo: [], calagem: [], adubacao: [], observacoes: '' }; }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Agronomo IA';
    wb.created = new Date();

    // Estilo header
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    const headerFont = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const borderStyle = { style: 'thin', color: { argb: 'FFCCCCCC' } };
    const allBorders = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

    // Sheet 1: Analise de Solo
    const ws1 = wb.addWorksheet('Analise de Solo');
    ws1.columns = [{ width: 30 }, { width: 20 }, { width: 20 }, { width: 20 }];
    ws1.addRow(['Propriedade:', data.propriedade || '', 'Cultura:', data.cultura || '']);
    ws1.addRow(['Data:', data.data || '', '', '']);
    ws1.addRow([]);
    const h1 = ws1.addRow(['Parametro', 'Valor', 'Unidade', 'Status']);
    h1.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = allBorders; });
    (data.analise_solo || []).forEach(item => {
      const row = ws1.addRow([item.parametro, item.valor, item.unidade, item.status]);
      row.eachCell(c => { c.border = allBorders; });
    });

    // Sheet 2: Calagem e Adubacao
    const ws2 = wb.addWorksheet('Calagem e Adubacao');
    ws2.columns = [{ width: 30 }, { width: 20 }, { width: 20 }, { width: 15 }, { width: 15 }];
    const h2 = ws2.addRow(['CALAGEM', '', '', '', '']);
    h2.getCell(1).fill = headerFill; h2.getCell(1).font = headerFont;
    const h2b = ws2.addRow(['Item', 'Dose', 'Unidade', '', '']);
    h2b.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = allBorders; });
    (data.calagem || []).forEach(item => {
      const row = ws2.addRow([item.item, item.dose, item.unidade]);
      row.eachCell(c => { c.border = allBorders; });
    });
    ws2.addRow([]);
    const h3 = ws2.addRow(['ADUBACAO', '', '', '', '']);
    h3.getCell(1).fill = headerFill; h3.getCell(1).font = headerFont;
    const h3b = ws2.addRow(['Periodo', 'N (kg/ha)', 'P2O5 (kg/ha)', 'K2O (kg/ha)', 'Unidade']);
    h3b.eachCell(c => { c.fill = headerFill; c.font = headerFont; c.border = allBorders; });
    (data.adubacao || []).forEach(item => {
      const row = ws2.addRow([item.periodo, item.N, item.P2O5, item.K2O, item.unidade]);
      row.eachCell(c => { c.border = allBorders; });
    });

    // Sheet 3: Observacoes
    const ws3 = wb.addWorksheet('Observacoes');
    ws3.columns = [{ width: 80 }];
    ws3.addRow(['Observacoes Tecnicas - Agronomo IA']);
    ws3.getRow(1).font = { bold: true, size: 13, color: { argb: 'FF15803D' } };
    ws3.addRow([]);
    ws3.addRow([data.observacoes || '']);
    ws3.getRow(3).alignment = { wrapText: true };

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="agronomo-ia-${Date.now()}.xlsx"`,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
