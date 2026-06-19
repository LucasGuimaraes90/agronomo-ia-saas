'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  LayoutDashboard, Users, MapPin, ClipboardList, Calendar,
  MessageSquare, FileText, Image, LogOut, Leaf, Menu, X, MoreHorizontal
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/clientes',     icon: Users,           label: 'Clientes' },
  { href: '/propriedades', icon: MapPin,          label: 'Propriedades' },
  { href: '/visitas',      icon: ClipboardList,   label: 'Visitas' },
  { href: '/agenda',       icon: Calendar,        label: 'Agenda' },
  { href: '/chat',         icon: MessageSquare,   label: 'Chat IA' },
  { href: '/documentos',   icon: FileText,        label: 'Documentos' },
  { href: '/imagens',      icon: Image,           label: 'Imagens IA' },
];

// 5 itens na bottom bar mobile
const bottomItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/clientes',  icon: Users,           label: 'Clientes' },
  { href: '/chat',      icon: MessageSquare,   label: 'Chat IA' },
  { href: '/agenda',    icon: Calendar,        label: 'Agenda' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  const isActive = (href) => pathname.startsWith(href);

  return (
    <>
      {/* ===== DESKTOP sidebar ===== */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 min-h-screen fixed left-0 top-0 z-30">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-none">Agronomo IA</p>
            <p className="text-xs text-gray-400 mt-0.5">Guara Agro</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(href) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(href) ? 'text-primary-600' : ''}`} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100">
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 w-full transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      {/* ===== MOBILE: top bar ===== */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900">Agronomo IA</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ===== MOBILE: bottom navigation bar ===== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center safe-area-pb">
        {bottomItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-primary-600' : 'text-gray-400'
              }`}>
              <Icon className="w-5 h-5" />
              <span className={`text-[10px] font-medium ${active ? 'text-primary-600' : 'text-gray-400'}`}>{label}</span>
            </Link>
          );
        })}
        {/* Botao "Mais" abre drawer completo */}
        <button onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-gray-400">
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">Mais</span>
        </button>
      </nav>

      {/* ===== MOBILE: drawer completo ===== */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative flex flex-col w-72 bg-white h-full shadow-xl ml-auto">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-gray-900">Agronomo IA</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map(({ href, icon: Icon, label }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(href) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive(href) ? 'text-primary-600' : ''}`} />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 w-full">
                <LogOut className="w-5 h-5" /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
