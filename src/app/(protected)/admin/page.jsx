'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Shield, Plus, Trash2, Copy, Check, UserCheck, AlertCircle, ChevronDown } from 'lucide-react';

const ADMIN_EMAIL = 'lukas.lucreuds@gmail.com';

const PLANOS = [
  { value: 'basico',      label: 'Básico',      desc: 'Chat IA + Documentos',         cls: 'bg-gray-100 text-gray-600' },
  { value: 'pro',         label: 'Pro',          desc: 'CRM + Agenda + tudo',           cls: 'bg-primary-100 text-primary-700' },
  { value: 'empresarial', label: 'Empresarial',  desc: 'Multi-usuário + personalizado', cls: 'bg-yellow-100 text-yellow-700' },
];

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('');
  const [lista, setLista] = useState([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoPlano, setNovoPlano] = useState('basico');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [atualizando, setAtualizando] = useState(null);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [copiado, setCopiado] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || '');
      if (user?.email === ADMIN_EMAIL) {
        await carregarLista();
      }
      setLoading(false);
    }
    init();
  }, []);

  async function carregarLista() {
    const { data } = await supabase
      .from('whitelist')
      .select('*')
      .order('created_at', { ascending: false });
    setLista(data || []);
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!novoEmail.trim()) return;
    setSalvando(true);
    setErro('');
    setSucesso('');
    const { error } = await supabase
      .from('whitelist')
      .insert({ email: novoEmail.toLowerCase().trim(), nome: novoNome.trim() || null, plano: novoPlano });
    if (error) {
      setErro(error.message.includes('duplicate') ? 'Este e-mail já está na lista.' : error.message);
    } else {
      setSucesso(`✓ ${novoEmail} adicionado como ${PLANOS.find(p => p.value === novoPlano)?.label}!`);
      setNovoEmail('');
      setNovoNome('');
      setNovoPlano('basico');
      await carregarLista();
    }
    setSalvando(false);
  }

  async function alterarPlano(id, novoPlanoValue) {
    setAtualizando(id);
    await supabase.from('whitelist').update({ plano: novoPlanoValue }).eq('id', id);
    await carregarLista();
    setAtualizando(null);
  }

  async function remover(id, email) {
    if (!confirm(`Remover ${email} da whitelist?`)) return;
    const { error } = await supabase.from('whitelist').delete().eq('id', id);
    if (!error) await carregarLista();
  }

  function copiarEmail(email) {
    navigator.clipboard.writeText(email);
    setCopiado(email);
    setTimeout(() => setCopiado(null), 2000);
  }

  const totalPorPlano = (plano) => lista.filter(i => i.plano === plano).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (userEmail !== ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-lg font-semibold text-gray-700">Acesso restrito</p>
        <p className="text-sm text-gray-500">Esta página é exclusiva para o administrador.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Controle de Acesso</h1>
          <p className="text-sm text-gray-500">{lista.length} usuário{lista.length !== 1 ? 's' : ''} cadastrado{lista.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Resumo por plano */}
      <div className="grid grid-cols-3 gap-3">
        {PLANOS.map(p => (
          <div key={p.value} className="card p-3 text-center">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>
            <p className="text-2xl font-bold text-gray-900 mt-2">{totalPorPlano(p.value)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
          </div>
        ))}
      </div>

      {/* Formulário adicionar */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-600" />
          Liberar novo acesso
        </h2>
        <form onSubmit={adicionar} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">E-mail *</label>
              <input
                className="input"
                type="email"
                placeholder="agronomo@email.com"
                value={novoEmail}
                onChange={e => setNovoEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Nome (opcional)</label>
              <input
                className="input"
                type="text"
                placeholder="João Silva"
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
              />
            </div>
          </div>

          {/* Seletor de plano */}
          <div>
            <label className="label">Plano</label>
            <div className="grid grid-cols-3 gap-2">
              {PLANOS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setNovoPlano(p.value)}
                  className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                    novoPlano === p.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>
                  <p className="text-[10px] text-gray-400 mt-1 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
          {sucesso && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">{sucesso}</p>}
          <button
            type="submit"
            disabled={salvando}
            className="btn-primary px-5 py-2 disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Liberar acesso'}
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-primary-600" />
            Acessos liberados
          </h2>
        </div>
        {lista.length === 0 ? (
          <div className="px-5 py-10 text-center text-gray-400 text-sm">
            Nenhum e-mail autorizado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lista.map(item => {
              const planoInfo = PLANOS.find(p => p.value === item.plano) || PLANOS[0];
              return (
                <li key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.email}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${planoInfo.cls}`}>
                        {planoInfo.label}
                      </span>
                    </div>
                    {item.nome && <p className="text-xs text-gray-400 mt-0.5">{item.nome}</p>}
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Alterar plano inline */}
                    <div className="relative">
                      <select
                        value={item.plano || 'basico'}
                        onChange={e => alterarPlano(item.id, e.target.value)}
                        disabled={atualizando === item.id}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 pr-6 appearance-none bg-white text-gray-600 cursor-pointer hover:border-gray-300 focus:outline-none focus:border-primary-400 disabled:opacity-50"
                      >
                        {PLANOS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>

                    <button
                      onClick={() => copiarEmail(item.email)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title="Copiar e-mail"
                    >
                      {copiado === item.email
                        ? <Check className="w-4 h-4 text-green-500" />
                        : <Copy className="w-4 h-4" />
                      }
                    </button>
                    <button
                      onClick={() => remover(item.id, item.email)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Remover acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
