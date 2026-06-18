'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit2, Trash2, X } from 'lucide-react';

const ESTADOS = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

function ClienteModal({ cliente, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState(cliente || { nome:'', cpf_cnpj:'', telefone:'', email:'', municipio:'', estado:'MG', cultura_principal:'', observacoes:'' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (cliente?.id) {
      await supabase.from('clientes').update(form).eq('id', cliente.id);
    } else {
      await supabase.from('clientes').insert({ ...form, agronomo_id: user.id });
    }
    setSaving(false);
    onSave();
  }

  const field = (key, label, type='text', placeholder='') => (
    <div>
      <label className="label">{label}</label>
      <input className="input" type={type} placeholder={placeholder} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{cliente?.id ? 'Editar cliente' : 'Novo cliente'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {field('nome', 'Nome completo *', 'text', 'João da Silva')}
          <div className="grid grid-cols-2 gap-4">
            {field('cpf_cnpj', 'CPF / CNPJ', 'text', '000.000.000-00')}
            {field('telefone', 'Telefone', 'tel', '(35) 99999-9999')}
          </div>
          {field('email', 'E-mail', 'email', 'joao@email.com')}
          <div className="grid grid-cols-2 gap-4">
            {field('municipio', 'Município', 'text', 'Passos')}
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.estado || 'MG'} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                {ESTADOS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          {field('cultura_principal', 'Cultura principal', 'text', 'Café, Milho, Soja...')}
          <div>
            <label className="label">Observações</label>
            <textarea className="input h-20 resize-none" placeholder="Informações adicionais..." value={form.observacoes || ''} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
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
  const [modal, setModal] = useState(null); // null | 'new' | cliente obj
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('clientes').select('*').eq('agronomo_id', user.id).eq('ativo', true).order('nome');
    setClientes(data || []);
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
    c.cultura_principal?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-0.5">{clientes.length} produtor{clientes.length !== 1 ? 'es' : ''} cadastrado{clientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo cliente
        </button>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nome, município ou cultura..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : filtrados.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{busca ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}</p>
          <p className="text-sm mt-1">{busca ? 'Tente outra busca' : 'Clique em "Novo cliente" para começar'}</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtrados.map(c => (
            <div key={c.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 font-bold text-sm">{c.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
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
                {c.municipio && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin className="w-3 h-3" />{c.municipio} - {c.estado}</p>}
                {c.telefone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone className="w-3 h-3" />{c.telefone}</p>}
                {c.email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail className="w-3 h-3" />{c.email}</p>}
              </div>
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
