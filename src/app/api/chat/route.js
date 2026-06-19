import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `Voce e o Agronomo IA - assistente tecnico especializado em agronomia brasileira.

Voce tem expertise em:
- Analise e correcao de solo (calagem, adubacao, pH, saturacao de bases)
- Nutricao de plantas e diagnostico de deficiencias
- Culturas: cafe, soja, milho, cana, feijao, hortalicas, pastagens
- Manejo fitossanitario (pragas, doencas, plantas daninhas)
- Irrigacao, manejo de agua
- Legislacao agricola brasileira (receituario agronomico, ART)
- Embrapa, IAC, IAPAR - bases tecnicas brasileiras

Quando receber uma imagem de laudo de solo, leia e interprete todos os valores visíveis.

Regras:
- Seja tecnico, preciso e pratico
- Use unidades brasileiras (kg/ha, t/ha, mg/dm3, cmolc/dm3)
- Cite fontes quando relevante
- Pergunte dados especificos quando necessario
- Responda em portugues brasileiro`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    const client = new Anthropic({ apiKey: process.env.OPENAI_API_KEY });

    // Converte mensagens para formato Anthropic (suporta imagens)
    const formattedMessages = messages.map(m => {
      if (Array.isArray(m.content)) {
        // Mensagem com imagem
        return {
          role: m.role,
          content: m.content.map(block => {
            if (block.type === 'image') {
              return {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: block.media_type || 'image/jpeg',
                  data: block.data,
                },
              };
            }
            return { type: 'text', text: block.text };
          }),
        };
      }
      return { role: m.role, content: m.content };
    });

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: formattedMessages,
    });

    return Response.json({ content: response.content[0].text });
  } catch (err) {
    console.error('Chat API error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
