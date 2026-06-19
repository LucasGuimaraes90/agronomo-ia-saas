'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Trash2, Navigation, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TIPO_CORES = {
  visita:  'bg-green-100 text-green-800 border-green-200',
  reuniao: 'bg-blue-100 text-blue-800 border-blue-200',
  entrega: 'bg-purple-100 text-purple-800 border-purple-200',
  outro:   'bg-gray-100 text-gray-700 border-gray-200',
};

function googleCalendarUrl(ag) {
  const start = parseISO(ag.data_hora);
  const end = addMinutes(start, Number(ag.duracao_min) || 60);
  const fmt = (d) => format(d, "yyyyMMdd'T'HHmmss");
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ag.titulo,
    dates: fmt(start) + '/' + fmt(end),
    details: [ag.descricao, ag.clientes?.nome ? 'Cliente: ' + ag.clientes.nome : ''].filter(Boolean).join('\n'),
    location: ag._localizacao || '',
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

function AgModal({ ag, clientes, propriedades, onClose, onSave }) {
  const supabase = createClient();
  const [form, setForm] = useState(ag ? {
    titulo: ag.titulo, descricao: ag.descricao || '', data_hora: ag.data_hora,
    cliente_id: ag.cliente_id || '', tipo: ag.tipo, status: ag.status, duracao_min: ag.duracao_min,
  } : {
    titulo: '', descricao: '', data_hora: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    cliente_id: '', tipo: 'visita', status: 'agendado', duracao_min: 60,
  });
  const [saving, setSaving] = useState(false);

  const propDoCliente = form.cliente_id ? propriedades.find(p => p.cliente_id === form.cliente_id) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = { ...form, agronomo_id: user.id };
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
            <label className="label">Titulo *</label>
            <input className="input" placeholder="Visita tecnica - Fazenda..." value={form.titulo}
              onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Data e hora *</label>
              <input className="input" type="datetime-local" value={form.data_hora}
                onChange={e => setForm(p => ({ ...p, data_hora: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Duracao (min)</label>
              <input className="input" type="number" min="15" step="15" value={form.duracao_min}
                onChange={e => setForm(p => ({ ...p, duracao_min: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select className="input" value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
                <option value="visita">Visita tecnica</option>
                <option value="reuniao">Reuniao</option>
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

          {/* Localizacao detectada automaticamente */}
          {propDoCliente?.localizacao_maps && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <Navigation className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-green-800">Localizacao da fazenda encontrada</p>
                <p className="text-xs text-green-600 truncate">{propDoCliente.nome}</p>
              </div>
              <a href={propDoCliente.localizacao_maps} target="_blank" rel="noreferrer"
                className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors flex-shrink-0">
                Navegar
              </a>
            </div>
          )}

          <div>
            <label className="label">Descricao</label>
            <textarea className="input h-20 resize-none" placeholder="Detalhes do agendamento..."
              value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
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
  const [propriedades, setPropriedades] = useState([]);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(new Date());
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const [{ data: ag }, { data: cl }, { data: pr }] = await Promise.all([
      supabase.from('agendamentos').select('*, clientes(nome)').eq('agronomo_id', user.id).order('data_hora'),
      supabase.from('clientes').select('id, nome').eq('agronomo_id', user.id).eq('ativo', true).order('nome'),
      supabase.from('propriedades').select('id, nome, cliente_id, localizacao_maps').eq('agronomo_id', user.id),
    ]);
    setAgendamentos(ag || []);
    setClientes(cl || []);
    setPropriedades(pr || []);
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
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  // Adiciona localizacao da propriedade para cada agendamento
  function agComLocalizacao(ag) {
    const prop = ag.cliente_id ? propriedades.find(p => p.cliente_id === ag.cliente_id) : null;
    return { ...ag, _localizacao: prop?.localizacao_maps || null, _propNome: prop?.nome || null };
  }

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
        {/* Calendario */}
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
            {diasSemana.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasCalendario.map((dia, i) => {
              const ags = agsDia(dia);
              const isToday = isSameDay(dia, new Date());
              const isSelected = isSameDay(dia, diaSelecionado);
              const isCurrentMonth = isSameMonth(dia, mesAtual);
              return (
                <button key={i} onClick={() => setDiaSelecionado(dia)}
                  className={"min-h-[52px] p-1 rounded-lg text-left transition-colors " + (isSelected ? 'bg-primary-600 text-white' : isToday ? 'bg-primary-50 text-primary-700' : isCurrentMonth ? 'hover:bg-gray-50' : 'opacity-30')}>
                  <span className={"text-xs font-medium block text-center mb-1 " + (isSelected ? 'text-white' : isToday ? 'text-primary-600' : 'text-gray-700')}>
                    {format(dia, 'd')}
                  </span>
                  {ags.slice(0, 2).map(ag => (
                    <div key={ag.id} className={"text-xs rounded px-1 py-0.5 mb-0.5 truncate border " + (isSelected ? 'bg-primary-500 border-primary-400 text-white' : TIPO_CORES[ag.tipo] || TIPO_CORES.outro)}>
                      {format(parseISO(ag.data_hora), 'HH:mm')} {ag.titulo}
                    </div>
                  ))}
                  {ags.length > 2 && <div className={"text-xs " + (isSelected ? 'text-primary-200' : 'text-gray-400')}>+{ags.length - 2}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Painel do dia */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-1 capitalize">
            {format(diaSelecionado, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="text-xs text-gray-400 mb-4">{agsDiaSelecionado.length} compromisso{agsDiaSelecionado.length !== 1 ? 's' : ''}</p>

          {agsDiaSelecionado.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Dia livre</p>
              <button onClick={() => setModal('new')} className="mt-3 text-sm text-primary-600 hover:underline">+ Agendar algo</button>
            </div>
          ) : (
            <div className="space-y-3">
              {agsDiaSelecionado.map(agRaw => {
                const ag = agComLocalizacao(agRaw);
                return (
                  <div key={ag.id} className={"border rounded-xl p-3 " + (TIPO_CORES[ag.tipo] || TIPO_CORES.outro)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{ag.titulo}</p>
                        <p className="text-xs mt-0.5 opacity-70">{format(parseISO(ag.data_hora), 'HH:mm')} · {ag.duracao_min} min</p>
                        {ag.clientes?.nome && <p className="text-xs opacity-70 mt-0.5">Produtor: {ag.clientes.nome}</p>}
                        {ag.descricao && <p className="text-xs opacity-70 mt-1 line-clamp-2">{ag.descricao}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setModal(agRaw)} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
                          <span className="text-xs">editar</span>
                        </button>
                        <button onClick={() => handleDelete(ag.id)} className="p-1 opacity-60 hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Botoes de acao */}
                    <div className="flex gap-2 mt-2">
                      {ag._localizacao && (
                        <a href={ag._localizacao} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 bg-white/70 hover:bg-white text-green-800 text-xs px-2.5 py-1.5 rounded-lg border border-green-300 transition-colors flex-1 justify-center font-medium">
                          <Navigation className="w-3 h-3" /> Navegar
                        </a>
                      )}
                      <a href={googleCalendarUrl(ag)} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 bg-white/70 hover:bg-white text-blue-800 text-xs px-2.5 py-1.5 rounded-lg border border-blue-300 transition-colors flex-1 justify-center font-medium">
                        <CalendarDays className="w-3 h-3" /> Google Calendar
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <AgModal
          ag={modal === 'new' ? null : modal}
          clientes={clientes}
          propriedades={propriedades}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
