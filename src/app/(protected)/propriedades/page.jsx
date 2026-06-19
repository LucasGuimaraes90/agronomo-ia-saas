'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { MapPin, Search, Navigation, User, X, ZoomIn } from 'lucide-react';

function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={onClose}>
        <X className="w-7 h-7" />
      </button>
      <img src={src} alt={alt} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={e => e.stopPropagation()} />
    </div>
  );
}

export default function PropriedadesPage() {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [lightbox, setLightbox] = useState(null);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('propriedades')
      .select('*, clientes(nome, foto_url)')
      .eq('agronomo_id', user.id)
      .order('nome');
    setProps(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtrados = props.filter(p =>
    p.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.municipio?.toLowerCase().includes(busca.toLowerCase()) ||
    p.cultura?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Propriedades</h1>
        <p className="text-gray-500 text-sm mt-0.5">{props.length} fazenda{props.length !== 1 ? 's' : ''} cadastrada{props.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por fazenda, cliente ou municipio..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{busca ? 'Nenhuma propriedade encontrada' : 'Nenhuma propriedade cadastrada'}</p>
          <p className="text-sm mt-1">Cadastre clientes com suas fazendas pela aba Clientes</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(p => (
            <div key={p.id} className="card overflow-hidden hover:shadow-md transition-shadow">
              {/* Foto da fazenda clicavel */}
              <div className="relative h-40 bg-gradient-to-br from-green-100 to-green-200 group cursor-zoom-in"
                onClick={() => p.foto_url && setLightbox({ src: p.foto_url, alt: p.nome })}>
                {p.foto_url ? (
                  <>
                    <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center cursor-default">
                    <MapPin className="w-12 h-12 text-green-400 opacity-50" />
                  </div>
                )}
                {p.cultura && (
                  <span className="absolute top-2 right-2 bg-white/90 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {p.cultura}
                  </span>
                )}
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{p.nome}</h3>

                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-zoom-in"
                    onClick={() => p.clientes?.foto_url && setLightbox({ src: p.clientes.foto_url, alt: p.clientes.nome })}>
                    {p.clientes?.foto_url
                      ? <img src={p.clientes.foto_url} alt="" className="w-full h-full object-cover" />
                      : <User className="w-3.5 h-3.5 text-primary-600" />}
                  </div>
                  <span className="text-sm text-gray-600">{p.clientes?.nome || 'Sem cliente'}</span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {p.hectares && <span className="badge-blue">{p.hectares} ha</span>}
                  {p.municipio && <span className="text-xs text-gray-400">{p.municipio}{p.estado ? ' / ' + p.estado : ''}</span>}
                </div>

                {p.talhoes && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{p.talhoes}</p>}
                {p.observacoes && <p className="text-xs text-gray-400 italic mb-3 line-clamp-2 border-l-2 border-gray-100 pl-2">{p.observacoes}</p>}

                {p.localizacao_maps ? (
                  <a href={p.localizacao_maps} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 rounded-xl transition-colors">
                    <Navigation className="w-4 h-4" />
                    Navegar ate a fazenda
                  </a>
                ) : (
                  <p className="text-center text-xs text-gray-400 py-1">Localizacao nao cadastrada</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}
    </div>
  );
}
