import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

const PROMPTS = {
  docx: `Você é um especialista agronômico que gera laudos técnicos profissionais em markdown.
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

Comece diretamente com o # TITULO — sem introduções, sem meta-texto.`,

  pptx: `Você é um especialista agronômico que cria apresentações PowerPoint profissionais.
Analise a conversa abaixo e gere conteúdo OTIMIZADO PARA SLIDES em markdown.

REGRAS CRÍTICAS PARA SLIDES:
- A primeira linha deve ser: # TITULO DA APRESENTAÇÃO
- Use ## para criar cada slide (máximo 9 slides no total)
- Cada seção (##) vira UM SLIDE — limite a no máximo 7 bullet points por slide
- Use bullet points curtos e diretos (- máximo 15 palavras cada)
- NÃO use tabelas markdown — apenas bullets
- NÃO use ### subseções

Comece diretamente com o # TITULO.`,

  xlsx: `Você é um especialista agronômico que gera dados estruturados para planilha Excel.
Analise a conversa abaixo e gere conteúdo RICO EM TABELAS em markdown.

REGRAS OBRIGATÓRIAS:
- A primeira linha deve ser: # TITULO DO DOCUMENTO
- Use ## para seções principais
- PRIORIZE tabelas markdown (| col | col |) para qualquer dado numérico, dose, comparação ou resultado
- Use bullets (-) apenas para observações narrativas que não cabem em tabela
- Gere ao menos 5 seções com conteúdo, sendo a maioria com tabelas
- Inclua colunas relevantes: Parâmetro, Resultado, Valor Ideal, Status, Recomendação, Dose

Comece diretamente com o # TITULO.`,
};

export async function POST(req) {
  try {
    const { messages, formato } = await req.json();

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
      system: PROMPTS[formato] || PROMPTS.docx,
      messages: apiMsgs,
    });

    const conteudo = response.content[0].text;
    const titulo = conteudo.split('\n').find(l => l.startsWith('# ') && !l.startsWith('## '))
      ?.replace(/^# /, '').trim() || 'Laudo Técnico Agronômico';

    return NextResponse.json({ titulo, conteudo, formato });
  } catch (error) {
    console.error('generate-doc error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
