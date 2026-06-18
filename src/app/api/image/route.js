import OpenAI from 'openai';

export async function POST(req) {
  try {
    const { prompt } = await req.json();
    const fullPrompt = `professional agronomic illustration, ${prompt}, Brazil agriculture, cerrado, detailed realistic technical, high quality`;

    // Tenta OpenAI DALL-E se tiver a key
    if (process.env.OPENAI_API_KEY) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: fullPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });
      return Response.json({ url: response.data[0].url, source: 'dall-e-3' });
    }

    // Fallback: Pollinations.ai (gratuito, sem key)
    const encoded = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
    return Response.json({ url, source: 'pollinations' });

  } catch (err) {
    // Fallback em caso de erro
    const encoded = encodeURIComponent(req.body?.prompt || 'agriculture field');
    return Response.json({
      url: `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`,
      source: 'pollinations'
    });
  }
}
