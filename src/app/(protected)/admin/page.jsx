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
          