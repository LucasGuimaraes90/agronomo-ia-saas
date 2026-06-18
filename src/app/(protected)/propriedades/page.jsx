'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { MapPin, Plus, Search, Edit2, Trash2, X } from 'lucide-react';

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

function PropModal({ prop, clientes, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState(prop || { nome:'', cliente_id:'', hectares:'', municipio:'', estado:'MG', cultura:'', talhoes:'', coordenadas:'', observacoes:'' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, agronomo_id: user.id };
    if (prop?.id) {
      await supabase.from('propriedades').update(payload).eq('id', prop.id);
    } else {
      await supabase.from('propriedades').insert(payload);
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{prop?.id ? 'Editar propriedade' : 'Nova propriedade'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Nome da fazenda *</label>
            <input className="input" placeholder="Fazenda São João" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Produtor (cliente) *</label>
            <select className="input" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} required>
              <option value="">Selecione...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Área (hectares)</label>
              <input className="input" type="number" step="0.01" placeholder="150" value={form.hectares} onChange={e => setForm(p => ({ ...p, hectares: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cultura</label>
              <input className="input" placeholder="Café, Milho..." value={form.cultura} onChange={e => setForm(p => ({ ...p, cultura: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Município</label>
              <input className="input" placeholder="Passos" value={form.municipio} onChange={e => setForm(p => ({ ...p, municipio: e.target.value }))} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                {ESTADOS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Talhões / Descrição de áreas</label>
            <textarea className="input h-20 resize-none" placeholder="Talhão A: 50ha café arábica, Talhão B: 30ha pastagem..." value={form.talhoes} onChange={e => setForm(p => ({ ...p, talhoes: e.target.value }))} />
          </div>
          <div>
            <label className="label">Coordenadas GPS (opcional)</label>
            <input className="input" placeholder="-21.123456, -46.123456" value={form.coordenadas} onChange={e => setForm(p => ({ ...p, coordenadas: e.target.value }))} />
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input h-16 resize-none" placeholder="Informações adicionais..." value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={!form.nome || !form.cliente_id || saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PropriedadesPage() {
  const [props, setProps] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: pr }, { data: cl }] = await Promise.all([
      supabase.from('propriedades').select('*, clientes(nome)').eq('agronomo_id', user.id).order('nome'),
      supabase.from('clientes').select('id, nome').eq('agronomo_id', user.id).eq('ativo', true).order('nome'),
    ]);
    setProps(pr || []);
    setClientes(cl || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remover esta propriedade?')) return;
    await supabase.from('propriedades').delete().eq('id', id);
    load();
  }

  const filtrados = props.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.municipio?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriedades</h1>
          <p className="text-gray-500 text-sm mt-0.5">{props.length} fazenda{props.length !== 1 ? 's' : ''} cadastrada{props.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova propriedade
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nome, cliente ou município..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{busca ? 'Nenhuma propriedade encontrada' : 'Nenhuma propriedade cadastrada'}</p>
          <p className="text-sm mt-1">{busca ? 'Tente outra busca' : 'Clique em "Nova propriedade" para começar'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(p => (
            <div key={p.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900">{p.nome}</h3>
              <p className="text-sm text-gray-500 mt-0.5">👨‍🌾 {p.clientes?.nome || 'Sem cliente'}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {p.hectares && <span className="badge-blue">{p.hectares} ha</span>}
                {p.cultura && <span className="badge-green">{p.cultura}</span>}
                {p.municipio && <span className="text-xs text-gray-400">{p.municipio}/{p.estado}</span>}
              </div>
              {p.talhoes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{p.talhoes}</p>}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <PropModal
          prop={modal === 'new' ? null : modal}
          clientes={clientes}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
