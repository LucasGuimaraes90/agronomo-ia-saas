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
        )}
      </nav>

      {/* Upgrade banner — apenas básico */}
      {plano === 'basico' && (
        <div className="mx-3 mb-3 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 p-3.5 text-white">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-bold">Upgrade para Pro</p>
          </div>
          <p className="text-xs text-primary-100 mb-3 leading-relaxed">
            Acesse Clientes, Propriedades, Visitas e Agenda.
          </p>
          <a
            href="https://wa.me/5534991307301?text=Quero+fazer+upgrade+para+o+plano+Pro"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs font-semibold bg-white text-primary-700 rounded-lg py-2 hover:bg-primary-50 transition-colors"
          >
            Falar no WhatsApp →
          </a>
        </div>
      )}

      {/* Admin link */}
      {isAdmin && (
        <div className="px-3 pb-2">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith('/admin')
                ? 'bg-yellow-50 text-yellow-700'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 flex-shrink-0" />
            Admin
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sair
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 h-screen bg-white border-r border-gray-200 fixed top-0 left-0 z-30">
        <NavContent />
      </aside>

      {/* Mobile topbar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Agrônomo IA</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>
          {badge.label}
        </span>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-72 h-full bg-white flex flex-col shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
