'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  LayoutDashboard, Users, MapPin, ClipboardList, Calendar,
  MessageSquare, FileText, Image, LogOut, Leaf, Menu, X, Shield, Zap,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const ADMIN_EMAIL = 'lukas.lucreuds@gmail.com';

const NAV_BASICO = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/chat',       icon: MessageSquare,   label: 'Chat IA' },
  { href: '/documentos', icon: FileText,        label: 'Documentos' },
  { href: '/imagens',    icon: Image,           label: 'Imagens IA' },
];

const NAV_PRO = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/propriedades', icon: MapPin,          label: 'Propriedades' },
  { href: '/visitas',      icon: ClipboardList,   label: 'Visitas' },
  { href: '/agenda',       icon: Calendar,        label: 'Agenda' },
  { href: '/chat',         icon: MessageSquare,   label: 'Chat IA' },
  { href: '/documentos',   icon: FileText,        label: 'Documentos' },
  { href: '/imagens',      icon: Image,           label: 'Imagens IA' },
];

const PLANO_BADGE = {
  basico:      { label: 'Básico',      cls: 'bg-gray-100 text-gray-500' },
  pro:         { label: 'Pro',         cls: 'bg-primary-100 text-primary-700' },
  empresarial: { label: 'Empresarial', cls: 'bg-yellow-100 text-yellow-700' },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plano, setPlano] = useState('pro'); // default pro enquanto carrega
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setIsAdmin(user.email === ADMIN_EMAIL);

      // Admins são sempre pro
      if (user.email === ADMIN_EMAIL) {
        setPlano('pro');
        return;
      }

      const { data } = await supabase
        .from('whitelist')
        .select('plano')
        .eq('email', user.email.toLowerCase().trim())
        .single();

      setPlano(data?.plano || 'basico');
    }
    init();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const navItems = plano === 'basico' ? NAV_BASICO : NAV_PRO;
  const badge = PLANO_BADGE[plano] || PLANO_BADGE.basico;

  const NavContent = () => (
    <>
      {/* Logo + plano */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-none">Agrônomo IA</p>
          <p className="text-xs text-gray-400 mt-0.5">Guara Agro</p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-primary-600' : ''}`} />
              {label}
            </Link>
          );
        })}

        {/* Itens bloqueados (apenas visual para básico) */}
        {plano === 'basico' && (
          <div className="pt-2 mt-2 border-t border-gray-100">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1">
              Plano Pro
            </p>
            {[
              { icon: Users,         label: 'Clientes' },
              { icon: MapPin,        label: 'Propriedades' },
              { icon: ClipboardList, label: 'Visitas' },
              { icon: Calendar,      label: 'Agenda' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 cursor-not-allowed select-none"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
                <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded">Pro</span>
              </div>
            ))}
          </div>
    