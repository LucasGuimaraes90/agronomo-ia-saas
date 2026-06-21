'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Leaf, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [crea, setCrea] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // Verificar whitelist antes de criar conta
        const { data: autorizado } = await supabase
          .from('whitelist')
          .select('email')
          .eq('email', email.toLowerCase().trim())
          .single();

        if (!autorizado) {
          throw new Error('E-mail não autorizado. Solicite acesso ao administrador.');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome, crea } },
        });
        if (error) throw error;
        setSucesso('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
        setMode('login');
      }
    } catch (err) {
      const msgs = {
        'Invalid login credentials': 'E-mail ou senha incorretos.',
        'User already registered': 'Este e-mail já está cadastrado.',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
      };
      setErro(msgs[err.message] || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Agrônomo IA</h1>
          <p className="text-gray-500 mt-1">Plataforma inteligente para agrônomos</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setErro(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >Entrar</button>
            <button
              onClick={() => { setMode('signup'); setErro(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >Criar conta</button>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">{erro}</div>}
          {sucesso && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">{sucesso}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">Nome completo</label>
                  <input className="input" type="text" placeholder="João Silva" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div>
                  <label className="label">CREA (opcional)</label>
                  <input className="input" type="text" placeholder="CREA-MG 12345/D" value={crea} onChange={e => setCrea(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" placeholder="joao@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center text-sm text-gray-500 mt-4">
              Não tem conta?{' '}