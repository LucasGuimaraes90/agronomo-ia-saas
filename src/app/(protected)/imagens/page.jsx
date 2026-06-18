'use client';
import { useState } from 'react';
import { Image, Sparkles, Download } from 'lucide-react';

const SUGESTOES = [
  'lavoura de café arábica no cerrado mineiro florescendo',
  'análise de solo com equipamentos técnicos modernos',
  'produtor rural examinando plantação de soja',
  'aplicação de calcário em lavoura com trator',
  'sistema de irrigação por gotejamento em hortaliças',
  'colheita mecanizada de milho no cerrado',
];

export default function ImagensPage() {
  const [prompt, setPrompt] = useState('');
  const [imagens, setImagens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  async function gerar() {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.url) {
        setImagens(prev => [{ url: data.url, prompt, source: data.source, id: Date.now() }, ...prev]);
      }
    } catch {
      setErro('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function downloadImagem(url, prompt) {
    const a = document.createElement('a');
    a.href = url;
    a.download = `agronomo_ia_${Date.now()}.jpg`;
    a.target = '_blank';
    a.click();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Imagens IA</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gere imagens agronômicas profissionais com inteligência artificial</p>
      </div>

      {/* Gerador */}
      <div className="card p-6 mb-6">
        <label className="label text-base mb-2">Descreva a imagem que deseja gerar</label>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder="Ex: lavoura de café no cerrado com floração..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && gerar()}
          />
          <button
            onClick={gerar}
            disabled={!prompt.trim() || loading}
            className="btn-primary flex items-center gap-2 px-6 disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Gerando...' : 'Gerar'}
          </button>
        </div>

        {/* Sugestões */}
        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-2">Sugestões:</p>
          <div className="flex flex-wrap gap-2">
            {SUGESTOES.map((s, i) => (
              <button
                key={i}
                onClick={() => setPrompt(s)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {erro && <p className="mt-3 text-sm text-red-500">{erro}</p>}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="card p-4 mb-6 animate-pulse">
          <div className="bg-gray-200 rounded-xl aspect-square max-w-lg mx-auto" />
          <div className="h-4 bg-gray-200 rounded mt-3 w-2/3 mx-auto" />
        </div>
      )}

      {/* Galeria */}
      {imagens.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Imagens geradas ({imagens.length})</h2>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {imagens.map(img => (
              <div key={img.id} className="card overflow-hidden group">
                <div className="relative">
                  <img
                    src={img.url}
                    alt={img.prompt}
                    className="w-full aspect-square object-cover"
                    onError={e => { e.target.src = 'https://placehold.co/400x400/f0fdf4/16a34a?text=Imagem+IA'; }}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      onClick={() => downloadImagem(img.url, img.prompt)}
                      className="bg-white text-gray-800 rounded-full px-4 py-2 text-sm font-medium flex items-center gap-2 shadow-lg"
                    >
                      <Download className="w-4 h-4" /> Baixar
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-700 line-clamp-2">{img.prompt}</p>
                  <p className="text-xs text-gray-400 mt-1">🤖 Gerado por IA · {img.source === 'dall-e-3' ? 'DALL-E 3' : 'Pollinations'} · Meramente ilustrativo</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {imagens.length === 0 && !loading && (
        <div className="card p-16 text-center text-gray-400">
          <Image className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="font-medium text-gray-500">Nenhuma imagem gerada ainda</p>
          <p className="text-sm mt-1">Descreva o que quer visualizar e clique em Gerar</p>
        </div>
      )}
    </div>
  );
}
