'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPO_CORES = {
  visita:    'bg-green-100 text-green-800 border-green-200',
  reuniao:   'bg-blue-100 text-blue-800 border-blue-200',
  entrega:   'bg-purple-100 text-purple-800 border-purple-200',
  outro:     'bg-gray-100 text-gray-700 border-gray-200',
};

function AgModal({ ag, clientes, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState(ag ? {
    ...ag,
    // Converte UTC do banco para horário local no input
    data_hora: ag.data_hora ? format(parseISO(ag.data_hora), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  } : {
    titulo: '', descricao: '', data_hora: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    cliente_id: '', tipo: 'visita', status: 'agendado', duracao_min: 60,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      ...form,
      // Converte horário local para UTC antes de salvar
      data_hora: new Date(form.data_hora).toISOString(),
      agronomo_id: user.id,
    };
    if (ag?.id) {
      await supabase.from('agendamentos').update(payload).eq('id', ag.id);
    } else {
      await supabase.from('agendamentos').insert(payload);
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">{ag?.id ? 'Editar agendamento' : 'Novo agendamento'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="label">Título *</label>
            <input className="input" placeholder="Visita técnica - Fazenda..." value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data e hora *</label>
              <input className="input" type="datetime-local" value={form.data_hora} onChange={e => setForm(p => ({ ...p, data_hora: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Duração (min)</label>
              <input className="input" type="number" min="15" step="15" value={form.duracao_min} onChange={e => setForm(p => ({ ...p, duracao_min: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                <option value="visita">Visita técnica</option>
                <option value="reuniao">Reunião</option>
                <option value="entrega">Entrega de laudo</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="agendado">Agendado</option>
                <option value="realizado">Realizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}>
              <option value="">Selecione (opcional)</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input h-20 resize-none" placeholder="Detalhes do agendamento..." value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" disabled={!form.titulo || saving} className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: ag }, { data: cl }] = await Promise.all([
      supabase.from('agendamentos').select('*, clientes(nome)').eq('agronomo_id', user.id).order('data_hora'),
      supabase.from('clientes').select('id, nome').eq('agronomo_id', user.id).eq('ativo', true).order('nome'),
    ]);
    setAgendamentos(ag || []);
    setClientes(cl || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remover este agendamento?')) return;
    await supabase.from('agendamentos').delete().eq('id', id);
    load();
  }

  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);
  const diasCalendario = eachDayOfInterval({
    start: startOfWeek(inicioMes, { weekStartsOn: 0 }),
    end: endOfWeek(fimMes, { weekStartsOn: 0 }),
  });

  const agsDia = (dia) => agendamentos.filter(ag => isSameDay(parseISO(ag.data_hora), dia));
  const agsDiaSelecionado = agsDia(diaSelecionado);
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">{agendamentos.filter(a => a.status === 'agendado').length} compromisso{agendamentos.filter(a => a.status === 'agendado').length !== 1 ? 's' : ''} pendente{agendamentos.filter(a => a.status === 'agendado').length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agendar
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 capitalize">
              {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex gap-1">
              <button onClick={() => setMesAtual(subMonths(mesAtual, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setMesAtual(addMonths(mesAtual, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {diasSemana.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {diasCalendario.map((dia, i) => {
              const ags = agsDia(dia);
              const isToday = isSameDay(dia, new Date());
              const isSelected = isSameDay(dia, diaSelecionado);
              const isCurrentMonth = isSameMonth(dia, mesAtual);
              return (
                <button
                  key={i}
                  onClick={() => setDiaSelecionado(dia)}
                  className={`min-h-[52px] p-1 rounded-lg text-left transition-colors ${
                    isSelected ? 'bg-primary-600 text-white' :
                    isToday ? 'bg-primary-50 text-primary-700' :
                    isCurrentMonth ? 'hover:bg-gray-50' : 'opacity-30'
                  }`}
                >
                  <span className={`text-xs font-medium block text-center mb-1 ${isSelected ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700'}`}>
                    {format(dia, 'd')}
                  </span>
                  {ags.slice(0, 2).map(ag => (
                    <div key={ag.id} className={`text-xs rounded px-1 py-0.5 mb-0.5 truncate border ${isSelected ? 'bg-primary-500 border-primary-400 text-white' : TIPO_CORES[ag.tipo] || TIPO_CORES.outro}`}>
                      {format(parseISO(ag.data_hora), 'HH:mm')} {ag.titulo}
                    </div>
                  ))}
                  {ags.length > 2 && <div className={`text-xs ${isSelected ? 'text-primary-200' : 'text-gray-400'}`}>+{ags.length - 2}</div>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-1 capitalize">
            {format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="text-xs text-gray-400 mb-4">{agsDiaSelecionado.length} compromisso{agsDiaSelecionado.length !== 1 ? 's' : ''}</p>

          {agsDiaSelecionado.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Dia livre</p>
              <button onClick={() => setModal('new')} className="mt-3 text-sm text-primary-600 hover:underline">
                + Agendar algo
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {agsDiaSelecionado.map(ag => (
                <div key={ag.id} className={`border rounded-xl p-3 ${TIPO_CORES[ag.tipo] || TIPO_CORES.outro}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{ag.titulo}</p>
                      <p className="text-xs mt-0.5 opacity-70">{format(parseISO(ag.data_hora), 'HH:mm')} · {ag.duracao_min} min</p>
                      {ag.clientes?.nome && <p className="text-xs opacity-70 mt-0.5">👤 {ag.clientes.nome}</p>}
                      {ag.descricao && <p className="text-xs opacity-70 mt-1 line-clamp-2">{ag.descricao}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setModal(ag)} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
                        <span className="text-xs">✏️</span>
                      </button>
                      <button onClick={() => handleDelete(ag.id)} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <AgModal
          ag={modal === 'new' ? null : modal}
          clientes={clientes}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
