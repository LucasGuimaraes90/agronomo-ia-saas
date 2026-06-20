'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { ClipboardList, Plus, Search, Edit2, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function VisitaModal({ visita, clientes, propriedades, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState(visita || {
    data_visita: format(new Date(), 'yyyy-MM-dd'),
    cliente_id: '', propriedade_id: '', cultura: '', estagio: '',
    observacoes: '', recomendacoes: '', ph_solo: '', fosforo: '', potassio: '', calcario_recomendado: '', status: 'realizada'
  });
  const [saving, setSaving] = useState(false);
  const [propsFiltradas, setPropsFiltradas] = useState([]);

  useEffect(() => {
    setPropsFiltradas(form.cliente_id ? propriedades.filter(p => p.cliente_id === form.cliente_id) : []);
  }, [form.cliente_id, propriedades]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Payload explícito — nunca espalhar o objeto visita inteiro
      // (join traz clientes:{nome} e propriedades:{nome} que quebram o PostgREST)
      const payload = {
        data_visita:           form.data_visita || null,
        cliente_id:            form.cliente_id  || null,
        propriedade_id:        form.propriedade_id || null,
        cultura:               form.cultura     || null,
        estagio:               form.estagio     || null,
        observacoes:           form.observacoes || null,
        recomendacoes:         form.recomendacoes || null,
        ph_solo:               form.ph_solo               ? Number(form.ph_solo)               : null,
        fosforo:               form.fosforo               ? Number(form.fosforo)               : null,
        potassio:              form.potassio              ? Number(form.potassio)              : null,
        calcario_recomendado:  form.calcario_recomendado  ? Number(form.calcario_recomendado)  : null,
        status:                form.status      || 'realizada',
        agronomo_id:           user.id,
      };

      let erro;
      if (visita?.id) {
        ({ error: erro } = await supabase.from('visitas').update(payload).eq('id', visita.id));
      } else {
        ({ error: erro } = await supabase.from('visitas').insert(payload));
      }

      if (erro) throw new Error(erro.message);
      onSave();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{visita?.id ? 'Editar visita' : 'Nova visita técnica'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identificação */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Identificação</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data da visita *</label>
                <input className="input" type="date" value={form.data_visita} onChange={e => setForm(p => ({ ...p, data_visita: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                  <option value="realizada">Realizada</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Cliente *</label>
                <select className="input" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value, propriedade_id: '' }))} required>
                  <option value="">Selecione...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Propriedade</label>
                <select className="input" value={form.propriedade_id} onChange={e => setForm(p => ({ ...p, propriedade_id: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {propsFiltradas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="label">Cultura</label>
                <input className="input" placeholder="Café, Milho, Soja..." value={form.cultura} onChange={e => setForm(p => ({ ...p, cultura: e.target.value }))} />
              </div>
              <div>
                <label className="label">Estágio fenológico</label>
                <input className="input" placeholder="Floração, Granação..." value={form.estagio} onChange={e => setForm(p => ({ ...p, estagio: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Análise de solo */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Dados de solo (opcional)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[['ph_solo','pH','6.5'],['fosforo','P (mg/dm³)','15'],['potassio','K (mg/dm³)','120'],['calcario_recomendado','Calcário (t/ha)','2']].map(([key, label, ph]) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <input className="input" type="number" step="0.01" placeholder={ph} value={form[key] || ''} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Anotações</h3>
            <div className="space-y-4">
              <div>
                <label className="label">Observações da visita</label>
                <textarea className="input h-24 resize-none" placeholder="Descreva o que foi observado em campo..." value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} />
              </div>
              <div>
                <label className="label">Recomendações técnicas</label>
                <textarea className="input h-24 resize-none" placeholder="Aplicações, manejo, correções recomendadas..." value={form.recomendacoes} onChange={e => setForm(p => ({ ...p, recomendacoes: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={!form.cliente_id || saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar visita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VisitasPage() {
  const [visitas, setVisitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [propriedades, setPropriedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState(null);
  const [expandida, setExpandida] = useState(null);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: v }, { data: c }, { data: p }] = await Promise.all([
      supabase.from('visitas').select('*, clientes(nome), propriedades(nome)').eq('agronomo_id', user.id).order('data_visita', { ascending: false }),
      supabase.from('clientes').select('id, nome').eq('agronomo_id', user.id).eq('ativo', true).order('nome'),
      supabase.from('propriedades').select('id, nome, cliente_id').eq('agronomo_id', user.id).order('nome'),
    ]);
    setVisitas(v || []);
    setClientes(c || []);
    setPropriedades(p || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remover esta visita?')) return;
    await supabase.from('visitas').delete().eq('id', id);
    load();
  }

  const statusColor = { realizada: 'badge-green', pendente: 'badge-yellow', cancelada: 'badge-red' };

  const filtradas = visitas.filter(v =>
    v.clientes?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    v.propriedades?.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    v.cultura?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visitas Técnicas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{visitas.length} visita{visitas.length !== 1 ? 's' : ''} registrada{visitas.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nova visita
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por cliente, propriedade ou cultura..." value={busca} onChange={e => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : filtradas.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{busca ? 'Nenhuma visita encontrada' : 'Nenhuma visita registrada'}</p>
          <p className="text-sm mt-1">Clique em "Nova visita" para registrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(v => (
            <div key={v.id} className="card overflow-hidden">
              <div className="p-4 flex items-center gap-4">
                <div className="text-center min-w-[52px] bg-gray-50 rounded-xl p-2">
                  <p className="text-lg font-bold text-primary-600 leading-none">
                    {format(new Date(v.data_visita + 'T12:00:00'), 'dd')}
                  </p>
                  <p className="text-xs text-gray-400">{format(new Date(v.data_visita + 'T12:00:00'), 'MMM', { locale: ptBR })}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{v.clientes?.nome || 'Cliente'}</p>
                    <span className={statusColor[v.status] || 'badge-blue'}>{v.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {v.propriedades?.nome && `${v.propriedades.nome} · `}
                    {v.cultura || 'Sem cultura'}
                    {v.estagio && ` · ${v.estagio}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setExpandida(expandida === v.id ? null : v.id)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    {expandida === v.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setModal(v)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(v.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {expandida === v.id && (
                <div className="border-t border-gray-100 p-4 bg-gray-50 grid md:grid-cols-2 gap-4">
                  {(v.ph_solo || v.fosforo || v.potassio || v.calcario_recomendado) && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Dados de Solo</p>
                      <div className="grid grid-cols-2 gap-2">
                        {v.ph_solo && <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">pH</p><p className="font-bold text-gray-900">{v.ph_solo}</p></div>}
                        {v.fosforo && <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Fósforo</p><p className="font-bold text-gray-900">{v.fosforo}</p></div>}
                        {v.potassio && <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Potássio</p><p className="font-bold text-gray-900">{v.potassio}</p></div>}
                        {v.calcario_recomendado && <div className="bg-white rounded-lg p-2 text-center"><p className="text-xs text-gray-500">Calcário (t/ha)</p><p className="font-bold text-gray-900">{v.calcario_recomendado}</p></div>}
                      </div>
                    </div>
                  )}
                  <div className="space-y-3">
                    {v.observacoes && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Observações</p><p className="text-sm text-gray-700">{v.observacoes}</p></div>}
                    {v.recomendacoes && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Recomendações</p><p className="text-sm text-gray-700">{v.recomendacoes}</p></div>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <VisitaModal
          visita={modal === 'new' ? null : modal}
          clientes={clientes}
          propriedades={propriedades}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
