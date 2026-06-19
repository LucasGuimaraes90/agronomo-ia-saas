import OpenAI from 'openai';

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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const apiMsgs = messages.filter(m => m.role !== 'system');
    apiMsgs.push({ role: 'user', content: 'Gere o relatório técnico completo desta análise.' });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 4096,
      messages: [
        { role: 'system', content: PROMPT_DOCUMENTO },
        ...apiMsgs.map(m => ({ role: m.role, content: m.content })),
      ],
    });

    return Response.json({ content: response.choices[0].message.content });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
