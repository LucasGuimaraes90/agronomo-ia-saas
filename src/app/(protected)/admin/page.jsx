'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { Shield, Plus, Trash2, Copy, Check, UserCheck, AlertCircle } from 'lucide-react';

const ADMIN_EMAIL = 'lukas.lucreuds@gmail.com';

export default function AdminPage() {
  const [userEmail, setUserEmail] = useState('');
  const [lista, setLista] = useState([]);
  const [novoEmail, setNovoEmail] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
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
      .insert({ email: novoEmail.toLowerCase().trim(), nome: novoNome.trim() || null });
    if (error) {
      setErro(error.message.includes('duplicate') ? 'Este e-mail já está na lista.' : error.message);
    } else {
      setSucesso(`✓ ${novoEmail} adicionado com sucesso!`);
      setNovoEmail('');
      setNovoNome('');
      await carregarLista();
    }
    setSalvando(false);
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Controle de Acesso</h1>
          <p className="text-sm text-gray-500">{lista.length} e-mail{lista.length !== 1 ? 's' : ''} autorizado{lista.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

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
            {lista.map(item => (
              <li key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.email}</p>
                  {item.nome && <p className="text-xs text-gray-400 mt-0.5">{item.nome}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">
                    {new Date(item.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
