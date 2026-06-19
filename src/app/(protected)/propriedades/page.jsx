'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { MapPin, Search, Navigation, User } from 'lucide-react';

export default function PropriedadesPage() {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
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
              {/* Foto da fazenda */}
              <div className="relative h-40 bg-gradient-to-br from-green-100 to-green-200">
                {p.foto_url ? (
                  <img src={p.foto_url} alt={p.nome} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-green-400 opacity-50" />
                  </div>
                )}
                {/* Badge cultura */}
                {p.cultura && (
                  <span className="absolute top-2 right-2 bg-white/90 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {p.cultura}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{p.nome}</h3>

                {/* Produtor */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {p.clientes?.foto_url
                      ? <img src={p.clientes.foto_url} alt="" className="w-full h-full object-cover" />
                      : <User className="w-3.5 h-3.5 text-primary-600" />}
                  </div>
                  <span className="text-sm text-gray-600">{p.clientes?.nome || 'Sem cliente'}</span>
                </div>

                {/* Detalhes */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {p.hectares && <span className="badge-blue">{p.hectares} ha</span>}
                  {p.municipio && <span className="text-xs text-gray-400">{p.municipio}{p.estado ? ' / ' + p.estado : ''}</span>}
                </div>

                {p.talhoes && <p className="text-xs text-gray-400 mb-3 line-clamp-2">{p.talhoes}</p>}

                {/* Botao Navegar */}
                {p.localizacao_maps ? (
                  <a
                    href={p.localizacao_maps}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 rounded-xl transition-colors"
                  >
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
    </div>
  );
}
