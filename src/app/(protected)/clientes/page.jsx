'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X, Camera, Navigation } from 'lucide-react';

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

// Campos exclusivos de cada tabela — evita enviar campo errado para tabela errada
const CAMPOS_CLIENTE = ['nome','cpf_cnpj','telefone','email','municipio','estado','cultura_principal','observacoes','foto_url'];
const CAMPOS_PROP    = ['nome','area_ha','cultura','municipio','estado','localizacao_maps','talhoes','observacoes','foto_url'];

function FotoUpload({ preview, onFile, label }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {preview
          ? <img src={preview} alt="" className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-gray-300"><Camera className="w-6 h-6" /></div>
        }
      </div>
      <div>
        <label className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700">
          {label}
          <input type="file" accept="image/*" className="hidden" onChange={e => {
            const f = e.target.files?.[0];
            if (f) onFile(f, URL.createObjectURL(f));
          }} />
        </label>
        <p className="text-xs text-gray-400 mt-0.5">JPG ou PNG, máx 5MB</p>
      </div>
    </div>
  );
}

function ClienteModal({ cliente, propriedade: propInicial, onClose, onSave }) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);

  // Estado separado por tabela — NUNCA misturar ao salvar
  const [cf, setCf] = useState({
    nome:             cliente?.nome             || '',
    cpf_cnpj:         cliente?.cpf_cnpj         || '',
    telefone:         cliente?.telefone         || '',
    email:            cliente?.email            || '',
    municipio:        cliente?.municipio        || '',
    estado:           cliente?.estado           || 'MG',
    cultura_principal:cliente?.cultura_principal|| '',
    observacoes:      cliente?.observacoes      || '',
    foto_url:         cliente?.foto_url         || '',
  });

  const [pf, setPf] = useState({
    nome:             propInicial?.nome             || '',
    area_ha:          propInicial?.area_ha          || '',
    cultura:          propInicial?.cultura          || '',
    municipio:        propInicial?.municipio        || '',
    estado:           propInicial?.estado           || 'MG',
    localizacao_maps: propInicial?.localizacao_maps || '',
    talhoes:          propInicial?.talhoes          || '',
    observacoes:      propInicial?.observacoes      || '',
    foto_url:         propInicial?.foto_url         || '',
  });

  const [clienteFotoFile, setClienteFotoFile] = useState(null);
  const [clienteFotoPreview, setClienteFotoPreview] = useState(cliente?.foto_url || null);
  const [propFotoFile, setPropFotoFile] = useState(null);
  const [propFotoPreview, setPropFotoPreview] = useState(propInicial?.foto_url || null);

  async function uploadFoto(file, pasta) {
    const ext = file.name.split('.').pop();
    const path = `${pasta}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fotos').upload(path, file, { upsert: true });
    if (error) { console.error('upload erro:', error); return null; }
    const { data } = supabase.storage.from('fotos').getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Upload fotos se o usuário selecionou
      let clienteFotoUrl = cf.foto_url;
      if (clienteFotoFile) clienteFotoUrl = await uploadFoto(clienteFotoFile, 'clientes') || cf.foto_url;

      let propFotoUrl = pf.foto_url;
      if (propFotoFile) propFotoUrl = await uploadFoto(propFotoFile, 'propriedades') || pf.foto_url;

      // ─── Salvar CLIENTE ───────────────────────────────────────────
      // Apenas campos que existem na tabela `clientes`
      const clientePayload = {
        nome:              cf.nome,
        cpf_cnpj:          cf.cpf_cnpj,
        telefone:          cf.telefone,
        email:             cf.email,
        municipio:         cf.municipio,
        estado:            cf.estado,
        cultura_principal: cf.cultura_principal,
        observacoes:       cf.observacoes,
        foto_url:          clienteFotoUrl,
      };

      let clienteId = cliente?.id;
      if (clienteId) {
        const { error } = await supabase.from('clientes').update(clientePayload).eq('id', clienteId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('clientes')
          .insert({ ...clientePayload, agronomo_id: user.id })
          .select('id')
          .single();
        if (error) throw error;
        clienteId = data.id;
      }

      // ─── Salvar PROPRIEDADE ───────────────────────────────────────
      // Apenas campos que existem na tabela `propriedades`
      const temProp = pf.nome || pf.area_ha || pf.municipio;
      if (clienteId && temProp) {
        const propPayload = {
          nome:             pf.nome,
          area_ha:          pf.area_ha ? Number(pf.area_ha) : null,
          cultura:          pf.cultura,
          municipio:        pf.municipio,
          estado:           pf.estado,
          localizacao_maps: pf.localizacao_maps,
          talhoes:          pf.talhoes,
          observacoes:      pf.observacoes,
          foto_url:         propFotoUrl,
          cliente_id:       clienteId,
          agronomo_id:      user.id,
        };

        if (propInicial?.id) {
          const { error } = await supabase.from('propriedades').update(propPayload).eq('id', propInicial.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('propriedades').insert(propPayload);
          if (error) throw error;
        }
      }

      onSave();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar: ' + (err.message || JSON.stringify(err)));
    } finally {
      setSaving(false);
    }
  }

  const fieldC = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={cf[key] || ''} onChange={e => setCf(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  const fieldP = (key, label, type = 'text', placeholder = '') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder}
        value={pf[key] || ''} onChange={e => setPf(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{cliente?.id ? 'Editar cliente' : 'Novo cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* ── DADOS DO PRODUTOR ── */}
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider">Dados do Produtor</p>

          <FotoUpload
            preview={clienteFotoPreview}
            label="Trocar foto"
            onFile={(file, preview) => { setClienteFotoFile(file); setClienteFotoPreview(preview); }}
          />

          {fieldC('nome', 'Nome completo *', 'text', 'João da Silva')}
          <div className="grid grid-cols-2 gap-4">
            {fieldC('cpf_cnpj', 'CPF / CNPJ', 'text', '000.000.000-00')}
            {fieldC('telefone', 'Telefone', 'tel', '(35) 99999-9999')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fieldC('email', 'E-mail', 'email', 'joao@email.com')}
            {fieldC('cultura_principal', 'Cultura principal', 'text', 'Café, Milho...')}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {fieldC('municipio', 'Município', 'text', 'Passos')}
            <div>
              <label className="label">Estado</label>
              <select className="input" value={cf.estado || 'MG'} onChange={e => setCf(p => ({ ...p, estado: e.target.value }))}>
                {ESTADOS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Observações do produtor</label>
            <textarea className="input h-20 resize-none" placeholder="Preferências, histórico..."
              value={cf.observacoes || ''} onChange={e => setCf(p => ({ ...p, observacoes: e.target.value }))} />
          </div>

          {/* ── PROPRIEDADE / FAZENDA ── */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-4">Propriedade / Fazenda</p>

            <FotoUpload
              preview={propFotoPreview}
              label="Trocar foto"
              onFile={(file, preview) => { setPropFotoFile(file); setPropFotoPreview(preview); }}
            />

            {fieldP('nome', 'Nome da fazenda', 'text', 'Fazenda Santa Rosa')}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {fieldP('area_ha', 'Área (ha)', 'number', '100')}
              {fieldP('cultura', 'Cultura', 'text', 'Milho Silagem / Café')}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {fieldP('municipio', 'Município', 'text', 'Passos')}
              <div>
                <label className="label">Estado</label>
                <select className="input" value={pf.estado || 'MG'} onChange={e => setPf(p => ({ ...p, estado: e.target.value }))}>
                  {ESTADOS.map(uf => <option key={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Localização no Maps</label>
              <div className="flex gap-2">
                <input className="input flex-1" type="url" placeholder="https://maps.app.goo.gl/..."
                  value={pf.localizacao_maps || ''} onChange={e => setPf(p => ({ ...p, localizacao_maps: e.target.value }))} />
                {pf.localizacao_maps && (
                  <a href={pf.localizacao_maps} target="_blank" rel="noreferrer"
                    className="btn-secondary flex items-center gap-1 text-sm whitespace-nowrap">
                    <Navigation className="w-3 h-3" /> Testar
                  </a>
                )}
              </div>
            </div>
            <div className="mt-4">
              <label className="label">Talhões / Áreas</label>
              <textarea className="input h-16 resize-none" placeholder="Talhão A: 50ha café..."
                value={pf.talhoes || ''} onChange={e => setPf(p => ({ ...p, talhoes: e.target.value }))} />
            </div>
            <div className="mt-4">
              <label className="label">Observações da propriedade</label>
              <textarea className="input h-16 resize-none" placeholder="Solo, histórico, problemas frequentes..."
                value={pf.observacoes || ''} onChange={e => setPf(p => ({ ...p, observacoes: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={!cf.nome || saving} className="btn-primary flex-1 disabled:opacity-60">
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
  const [modal, setModal] = useState(null); // null | { cliente, propriedade }
  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('clientes')
      .select('*, propriedades(id, nome, area_ha, cultura, municipio, estado, localizacao_maps, foto_url, talhoes, observacoes)')
      .eq('agronomo_id', user.id)
      .eq('ativo', true)
      .order('nome');
    setClientes(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remover este cliente?')) return;
    await supabase.from('clientes').update({ ativo: false }).eq('id', id);
    load();
  }

  function abrirEdicao(c) {
    const prop = c.propriedades?.[0] || null;
    setModal({ cliente: c, propriedade: prop });
  }

  const filtrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(busca.toLowerCase()) ||
    c.municipio?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cultura_principal?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clientes.length} produtor{clientes.length !== 1 ? 'es' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal({ cliente: null, propriedade: null })} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nome, município ou cultura..."
          value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
          <p className="text-sm mt-1">{busca ? 'Tente outra busca' : 'Clique em "Novo cliente" para começar'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => {
            const prop = c.propriedades?.[0];
            return (
              <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-primary-100 flex-shrink-0">
                    {c.foto_url
                      ? <img src={c.foto_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <span className="text-primary-700 font-bold">{c.nome.charAt(0).toUpperCase()}</span>
                        </div>
                    }
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => abrirEdicao(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{c.nome}</h3>
                {c.cultura_principal && <span className="badge-green mb-2">{c.cultura_principal}</span>}
                <div className="space-y-1 mt-2">
                  {c.municipio && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{c.municipio} – {c.estado}</p>}
                  {c.telefone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.telefone}</p>}
                  {c.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>}
                </div>
                {prop && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{prop.nome}</p>
                      {prop.area_ha && <p className="text-xs text-gray-400">{prop.area_ha} ha · {prop.cultura || c.cultura_principal}</p>}
                    </div>
                    {prop.localizacao_maps && (
                      <a href={prop.localizacao_maps} target="_blank" rel="noreferrer"
                        className="text-xs text-primary-600 flex items-center gap-1 hover:text-primary-700">
                        <Navigation className="w-3 h-3" /> Maps
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ClienteModal
          cliente={modal.cliente}
          propriedade={modal.propriedade}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
