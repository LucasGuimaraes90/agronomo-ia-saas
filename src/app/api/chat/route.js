import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Você é o Agrônomo IA — assistente técnico especializado em agronomia brasileira.

Você tem expertise em:
- Análise e correção de solo (calagem, adubação, pH, saturação de bases)
- Nutrição de plantas e diagnóstico de deficiências
- Culturas: café, soja, milho, cana, feijão, hortaliças, pastagens
- Manejo fitossanitário (pragas, doenças, plantas daninhas)
- Irrigação, manejo de água
- Legislação agrícola brasileira (receituário agronômico, ART)
- Embrapa, IAC, IAPAR — bases técnicas brasileiras

Regras:
- Seja técnico, preciso e prático
- Use unidades brasileiras (kg/ha, t/ha, mg/dm³, cmolc/dm³)
- Cite fontes (Embrapa, Comissão de Fertilidade do Solo, etc.) quando relevante
- Pergunte dados específicos quando necessário para dar recomendações precisas
- Responda em português brasileiro`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    return Response.json({ content: response.content[0].text });
  } catch (err) {
    console.error('Chat API error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
