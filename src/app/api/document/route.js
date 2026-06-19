import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT_DOCUMENTO = `Você é um formatador de documentos agronômicos profissionais.
Com base na conversa técnica abaixo, gere um RELATÓRIO COMPLETO E ESTRUTURADO em markdown.

REGRAS OBRIGATÓRIAS:
- Comece DIRETAMENTE com o conteúdo — sem introduções ou meta-texto
- Use ## para seções principais e ### para subseções
- Inclua TODAS as informações técnicas: valores de pH, saturação de bases, doses, etc.
- Gere tabelas markdown para comparações numéricas
- Seja preciso e completo — este é um documento técnico oficial

ESTRUTURA OBRIGATÓRIA:
## IDENTIFICAÇÃO DA LAVOURA
## RESULTADOS DA ANÁLISE DE SOLO
## NECESSIDADE DE CALAGEM
## RECOMENDAÇÃO DE ADUBAÇÃO
## CRONOGRAMA DE APLICAÇÃO
## OBSERVAÇÕES TÉCNICAS
## DISCLAIMER`;

export async function POST(req) {
  try {
    const { messages } = await req.json();

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

    return Response.json({ content: response.content[0].text });
  } catch (err) {
    console.error('Document API error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
