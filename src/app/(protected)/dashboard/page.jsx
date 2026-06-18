'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { Users, MapPin, ClipboardList, Calendar, TrendingUp, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const [stats, setStats] = useState({ clientes: 0, propriedades: 0, visitas: 0, agendamentos: 0 });
  const [proximosAgendamentos, setProximosAgendamentos] = useState([]);
  const [ultimasVisitas, setUltimasVisitas] = useState([]);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [
        { count: clientes },
        { count: propriedades },
        { count: visitas },
        { count: agendamentos },
        { data: proximos },
        { data: ultimas },
        { data: perf },
      ] = await Promise.all([
        supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('agronomo_id', user.id).eq('ativo', true),
        supabase.from('propriedades').select('*', { count: 'exact', head: true }).eq('agronomo_id', user.id),
        supabase.from('visitas').select('*', { count: 'exact', head: true }).eq('agronomo_id', user.id),
        supabase.from('agendamentos').select('*', { count: 'exact', head: true }).eq('agronomo_id', user.id).eq('status', 'agendado').gte('data_hora', new Date().toISOString()),
        supabase.from('agendamentos').select('*, clientes(nome)').eq('agronomo_id', user.id).eq('status', 'agendado').gte('data_hora', new Date().toISOString()).order('data_hora').limit(4),
        supabase.from('visitas').select('*, clientes(nome), propriedades(nome)').eq('agronomo_id', user.id).order('criado_em', { ascending: false }).limit(5),
        supabase.from('perfis').select('*').eq('id', user.id).single(),
      ]);

      setStats({ clientes: clientes || 0, propriedades: propriedades || 0, visitas: visitas || 0, agendamentos: agendamentos || 0 });
      setProximosAgendamentos(proximos || []);
      setUltimasVisitas(ultimas || []);
      setPerfil(perf);
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: 'Clientes ativos', value: stats.clientes, icon: Users, color: 'bg-blue-50 text-blue-600', href: '/clientes' },
    { label: 'Propriedades', value: stats.propriedades, icon: MapPin, color: 'bg-green-50 text-green-600', href: '/propriedades' },
    { label: 'Visitas realizadas', value: stats.visitas, icon: ClipboardList, color: 'bg-purple-50 text-purple-600', href: '/visitas' },
    { label: 'Próximos agendamentos', value: stats.agendamentos, icon: Calendar, color: 'bg-orange-50 text-orange-600', href: '/agenda' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {perfil?.nome?.split(' ')[0] || 'Agrônomo'} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, href }) => (
          <Link key={href} href={href} className="card p-5 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Próximos agendamentos */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary-600" /> Próximos agendamentos
            </h2>
            <Link href="/agenda" className="text-sm text-primary-600 hover:underline">Ver todos</Link>
          </div>
          {proximosAgendamentos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum agendamento próximo</p>
              <Link href="/agenda" className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                <Plus className="w-3 h-3" /> Agendar visita
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {proximosAgendamentos.map(ag => (
                <div key={ag.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-center min-w-[40px]">
                    <p className="text-lg font-bold text-primary-600 leading-none">
                      {format(new Date(ag.data_hora), 'dd')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {format(new Date(ag.data_hora), 'MMM', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ag.titulo}</p>
                    <p className="text-xs text-gray-500">{ag.clientes?.nome} · {format(new Date(ag.data_hora), 'HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas visitas */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" /> Últimas visitas
            </h2>
            <Link href="/visitas" className="text-sm text-primary-600 hover:underline">Ver todas</Link>
          </div>
          {ultimasVisitas.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma visita registrada</p>
              <Link href="/visitas" className="mt-3 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline">
                <Plus className="w-3 h-3" /> Nova visita
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ultimasVisitas.map(v => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.clientes?.nome || 'Cliente'}</p>
                    <p className="text-xs text-gray-500">{v.propriedades?.nome || ''} · {format(new Date(v.data_visita), 'dd/MM/yyyy')}</p>
                  </div>
                  <span className="badge-green">{v.cultura || 'Visita'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Ações rápidas</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { href: '/visitas', label: '+ Nova visita', color: 'btn-primary' },
            { href: '/clientes', label: '+ Novo cliente', color: 'btn-secondary' },
            { href: '/agenda', label: '+ Agendar', color: 'btn-secondary' },
            { href: '/chat', label: '🤖 Chat IA', color: 'btn-secondary' },
          ].map(({ href, label, color }) => (
            <Link key={href} href={href} className={color}>{label}</Link>
          ))}
        </div>
      </div>
    </div>
  );
}
