'use client';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X, Camera, Navigation } from 'lucide-react';

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

function comprimirImagem(file, maxSize = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadFoto(supabase, file, pasta) {
  const blob = await comprimirImagem(file);
  const nome = pasta + '/' + Date.now() + '.jpg';
  const { error } = await supabase.storage.from('fotos').upload(nome, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) return null;
  return SUPABASE_URL + '/storage/v1/object/public/fotos/' + nome;
}

function FotoUpload({ label, preview, onSelect }) {
  const ref = useRef();
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <div onClick={() => ref.current?.click()}
          className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary-400 overflow-hidden bg-gray-50 flex-shrink-0 transition-colors">
          {preview
            ? <img src={preview} alt="foto" className="w-full h-full object-cover" />
            : <Camera className="w-6 h-6 text-gray-400" />}
        </div>
        <div>
          <button type="button" onClick={() => ref.current?.click()} className="btn-secondary text-xs py-1.5 px-3">
            {preview ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <p className="text-xs text-gray-400 mt-1">JPG ou PNG, max 5MB</p>
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => onSelect(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function ClienteModal({ cliente, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState(cliente || {
    nome:'', cpf_cnpj:'', telefone:'', email:'', municipio:'', estado:'MG', cultura_principal:'', observacoes:'', foto_url:''
  });
  const [prop, setProp] = useState(cliente?._prop || {
    nome:'', hectares:'', municipio:'', estado:'MG', cultura:'', localizacao_maps:'', talhoes:'', observacoes:'', foto_url:''
  });
  const [fotoCliente, setFotoCliente] = useState(null);
  const [fotoProp, setFotoProp] = useState(null);
  const [previewCliente, setPreviewCliente] = useState(cliente?.foto_url || null);
  const [previewProp, setPreviewProp] = useState(cliente?._prop?.foto_url || null);
  const [saving, setSaving] = useState(false);

  function handleFotoCliente(file) { if (!file) return; setFotoCliente(file); setPreviewCliente(URL.createObjectURL(file)); }
  function handleFotoProp(file) { if (!file) return; setFotoProp(file); setPreviewProp(URL.createObjectURL(file)); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    let fotoClienteUrl = form.foto_url;
    let fotoPropUrl = prop.foto_url;

    if (fotoCliente) fotoClienteUrl = await uploadFoto(supabase, fotoCliente, 'clientes') || fotoClienteUrl;
    if (fotoProp) fotoPropUrl = await uploadFoto(supabase, fotoProp, 'propriedades') || fotoPropUrl;

    const clientePayload = { ...form, foto_url: fotoClienteUrl, agronomo_id: user.id };
    let clienteId = cliente?.id;

    if (clienteId) {
      await supabase.from('clientes').update(clientePayload).eq('id', clienteId);
    } else {
      const { data } = await supabase.from('clientes').insert(clientePayload).select('id').single();
      clienteId = data?.id;
    }

    if (clienteId && prop.nome) {
      const propPayload = { ...prop, foto_url: fotoPropUrl, cliente_id: clienteId, agronomo_id: user.id };
      if (cliente?._prop?.id) {
        await supabase.from('propriedades').update(propPayload).eq('id', cliente._prop.id);
      } else {
        await supabase.from('propriedades').insert(propPayload);
      }
    }

    setSaving(false);
    onSave();
  }

  const f = (key, label, type='text', placeholder='', obj='form') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={obj === 'form' ? (form[key]||'') : (prop[key]||'')}
        onChange={e => obj === 'form' ? setForm(p=>({...p,[key]:e.target.value})) : setProp(p=>({...p,[key]:e.target.value}))} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{cliente?.id ? 'Editar cliente' : 'Novo cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* DADOS DO CLIENTE */}
          <div className="pb-2">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-3">Dados do produtor</p>
            <FotoUpload label="Foto do produtor" preview={previewCliente} onSelect={handleFotoCliente} />
          </div>
          {f('nome','Nome completo *','text','Joao da Silva')}
          <div className="grid grid-cols-2 gap-3">
            {f('telefone','Telefone','tel','(35) 99999-9999')}
            {f('email','E-mail','email','joao@email.com')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('cpf_cnpj','CPF / CNPJ','text','000.000.000-00')}
            {f('cultura_principal','Cultura principal','text','Cafe, Milho...')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('municipio','Municipio','text','Passos')}
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm(p=>({...p,estado:e.target.value}))}>
                {ESTADOS.map(uf=><option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Observacoes do produtor</label>
            <textarea className="input h-20 resize-none" placeholder="Preferencias, historico, particularidades do produtor..."
              value={form.observacoes||''} onChange={e=>setForm(p=>({...p,observacoes:e.target.value}))} />
          </div>

          {/* PROPRIEDADE */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-3">Propriedade / Fazenda</p>
            <FotoUpload label="Foto da fazenda" preview={previewProp} onSelect={handleFotoProp} />
          </div>
          {f('nome','Nome da fazenda','text','Fazenda Sao Joao','prop')}
          <div className="grid grid-cols-2 gap-3">
            {f('hectares','Area (ha)','number','150','prop')}
            {f('cultura','Cultura','text','Cafe','prop')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f('municipio','Municipio','text','Passos','prop')}
            <div>
              <label className="label">Estado</label>
              <select className="input" value={prop.estado||'MG'} onChange={e=>setProp(p=>({...p,estado:e.target.value}))}>
                {ESTADOS.map(uf=><option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Localizacao no Maps</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Cole o link do Google Maps da fazenda..."
                value={prop.localizacao_maps||''} onChange={e=>setProp(p=>({...p,localizacao_maps:e.target.value}))} />
              {prop.localizacao_maps && (
                <a href={prop.localizacao_maps} target="_blank" rel="noreferrer"
                  className="btn-secondary px-3 flex items-center gap-1 text-xs flex-shrink-0">
                  <Navigation className="w-3.5 h-3.5" /> Testar
                </a>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">Abra o Google Maps, marque o local, clique em Compartilhar e cole o link aqui</p>
          </div>
          <div>
            <label className="label">Talhoes / Areas</label>
            <textarea className="input h-16 resize-none" placeholder="Talhao A: 50ha cafe, Talhao B: 30ha pastagem..."
              value={prop.talhoes||''} onChange={e=>setProp(p=>({...p,talhoes:e.target.value}))} />
          </div>
          <div>
            <label className="label">Observacoes da propriedade</label>
            <textarea className="input h-20 resize-none" placeholder="Solo, historico de culturas, problemas frequentes, anotacoes tecnicas..."
              value={prop.observacoes||''} onChange={e=>setProp(p=>({...p,observacoes:e.target.value}))} />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={!form.nome || saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: cls } = await supabase.from('clientes').select('*').eq('agronomo_id', user.id).eq('ativo', true).order('nome');
    const { data: props } = await supabase.from('propriedades').select('*').eq('agronomo_id', user.id);
    const propMap = {};
    (props || []).forEach(p => { if (!propMap[p.cliente_id]) propMap[p.cliente_id] = p; });
    setClientes((cls || []).map(c => ({ ...c, _prop: propMap[c.id] || null })));
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remover este cliente?')) return;
    await supabase.from('clientes').update({ ativo: false }).eq('id', id);
    load();
  }

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.municipio?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cultura_principal?.toLowerCase().includes(busca.toLowerCase()) ||
    c._prop?.nome?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clientes.length} produtor{clientes.length!==1?'es':''} cadastrado{clientes.length!==1?'s':''}</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nome, fazenda ou municipio..." value={busca} onChange={e=>setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
          <p className="text-sm mt-1">{busca ? 'Tente outra busca' : 'Clique em "Novo cliente" para comecar'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => (
            <div key={c.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-100 flex-shrink-0 flex items-center justify-center">
                  {c.foto_url
                    ? <img src={c.foto_url} alt={c.nome} className="w-full h-full object-cover" />
                    : <span className="text-primary-700 font-bold text-lg">{c.nome.charAt(0).toUpperCase()}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{c.nome}</h3>
                  {c.cultura_principal && <span className="badge-green text-xs">{c.cultura_principal}</span>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {c.telefone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.telefone}</p>}
                {c.municipio && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{c.municipio} - {c.estado}</p>}
              </div>

              {c.observacoes && (
                <p className="text-xs text-gray-400 italic mb-3 line-clamp-2 border-l-2 border-gray-100 pl-2">{c.observacoes}</p>
              )}

              {c._prop && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    {c._prop.foto_url && (
                      <img src={c._prop.foto_url} alt="fazenda" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{c._prop.nome}</p>
                      {c._prop.hectares && <p className="text-xs text-gray-400">{c._prop.hectares} ha · {c._prop.cultura || ''}</p>}
                      {c._prop.observacoes && <p className="text-xs text-gray-400 italic line-clamp-1 mt-0.5">{c._prop.observacoes}</p>}
                    </div>
                    {c._prop.localizacao_maps && (
                      <button onClick={() => window.open(c._prop.localizacao_maps, '_blank')}
                        className="flex items-center gap-1 bg-primary-600 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-primary-700 transition-colors flex-shrink-0">
                        <Navigation className="w-3 h-3" /> Navegar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ClienteModal
          cliente={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
