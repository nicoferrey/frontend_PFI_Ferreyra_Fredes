"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Bell, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Settings, 
  LogOut, 
  CheckCheck, 
  HelpCircle, 
  MapPin, 
  Shield, 
  Layers,
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type?: 'alert' | 'info' | 'success' | 'warning';
}

interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
  customNotifications?: NotificationItem[];
  className?: string;
}

export function Topbar({
  breadcrumbs,
  onToggleSidebar,
  showSidebarToggle = false,
  customNotifications,
  className = "",
}: TopbarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Default sample notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    customNotifications || [
      {
        id: '1',
        title: 'Déficit hídrico en Lote Sur',
        description: 'Se proyecta cruce de umbral de estrés en 24h. Ajustar lámina de riego.',
        time: 'Hace 15 min',
        unread: true,
        type: 'warning',
      },
      {
        id: '2',
        title: 'Nueva imagen satelital Sentinel-2',
        description: 'Índices NDVI y NDRE procesados con 0% de cobertura de nubes.',
        time: 'Hace 2 horas',
        unread: true,
        type: 'info',
      },
      {
        id: '3',
        title: 'Optimización MAS completada',
        description: 'Ahorro proyectado de 18.4% en volumen de agua para este ciclo.',
        time: 'Hace 5 horas',
        unread: true,
        type: 'success',
      },
    ]
  );

  const unreadCount = notifications.filter((n) => n.unread).length;

  // Auto-generate breadcrumbs if none provided
  const resolvedBreadcrumbs: BreadcrumbItem[] = breadcrumbs || [
    { label: 'Inicio', href: '/' },
    ...(pathname === '/onboarding'
      ? [{ label: 'Configuración de Campo', active: true }]
      : pathname === '/login'
      ? [{ label: 'Acceso de Usuario', active: true }]
      : [{ label: 'Monitoreo de Lotes', active: true }]),
  ];

  // Close menus on outside click or ESC key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const handleNotificationClick = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
  };

  // Helper to extract initials (e.g. "Ada Lovelace" -> "AL")
  const getInitials = (name?: string) => {
    if (!name) return 'AL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const userName = user?.name || (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null) || 'Ada Lovelace';
  const userInitials = getInitials(userName);
  const userRole = user?.role === 'admin' 
    ? 'Dueño / Administrador' 
    : user?.role === 'agronomist' 
    ? 'Asesor Agrónomo' 
    : user?.role === 'operator' 
    ? 'Operador de Riego' 
    : 'Dueño / Administrador';

  return (
    <header className={`relative z-[500] w-full rounded-[24px] border border-white/80 bg-white/90 px-5 py-3.5 shadow-sm backdrop-blur-md transition-all ${className}`}>
      <div className="flex items-center justify-between gap-4">
        
        {/* Left Side: Breadcrumbs / Navigation Index */}
        <div className="flex items-center gap-3">
          {showSidebarToggle && (
            <button
              onClick={onToggleSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition xl:hidden"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-4 w-4" />
            </button>
          )}

          <nav aria-label="Breadcrumb" className="flex items-center text-sm font-medium">
            <ol className="flex items-center flex-wrap gap-1.5 md:gap-2">
              {resolvedBreadcrumbs.map((crumb, idx) => {
                const isLast = idx === resolvedBreadcrumbs.length - 1;
                return (
                  <li key={idx} className="flex items-center">
                    {idx > 0 && (
                      <ChevronRight className="h-4 w-4 mx-1 text-slate-400 shrink-0 select-none stroke-[2.2]" />
                    )}
                    {crumb.href && !isLast ? (
                      <Link
                        href={crumb.href}
                        className="text-slate-500 hover:text-slate-800 transition-colors duration-150 py-1"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className={`py-1 ${isLast ? 'font-bold text-slate-800 tracking-tight' : 'text-slate-500'}`}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Right Side: Notifications & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          
          {/* Notifications Trigger & Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setUserDropdownOpen(false);
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                notificationsOpen 
                  ? 'bg-slate-100 text-slate-900 ring-2 ring-slate-200' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              aria-label={`Notificaciones (${unreadCount} no leídas)`}
              aria-expanded={notificationsOpen}
            >
              <Bell className="h-5 w-5 stroke-[2]" />
              
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#ef4444] px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-2xl ring-1 ring-black/5 z-[1020] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">Notificaciones</h3>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 transition"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Leídas
                    </button>
                  )}
                </div>

                <div className="mt-2 divide-y divide-slate-100 max-h-[340px] overflow-y-auto pr-0.5">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No tienes notificaciones pendientes
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif.id)}
                        className={`group relative flex cursor-pointer gap-3 rounded-xl p-3 text-left transition-colors ${
                          notif.unread ? 'bg-emerald-50/40 hover:bg-emerald-50/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            notif.unread ? 'bg-rose-500 ring-4 ring-rose-100' : 'bg-transparent'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900">
                            {notif.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {notif.description}
                          </p>
                          <span className="mt-1.5 inline-block text-[10px] text-slate-400 font-medium">
                            {notif.time}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                  <Link
                    href="#alertas"
                    onClick={() => setNotificationsOpen(false)}
                    className="block text-xs font-semibold text-crop-700 hover:text-crop-800 py-1"
                  >
                    Ver todas las alertas MAS
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown */}
          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => {
                setUserDropdownOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              className={`group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition-all duration-150 ${
                userDropdownOpen
                  ? 'bg-slate-100 ring-2 ring-slate-200'
                  : 'hover:bg-slate-100'
              }`}
              aria-expanded={userDropdownOpen}
              aria-label="Menú de opciones de usuario"
            >
              {/* Circular Avatar with Initials - Reference Match (Coral/Red-Pink Vibrant Tone) */}
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f43f5e] text-white font-bold text-xs shadow-sm ring-2 ring-rose-200/60 select-none">
                {userInitials}
              </div>

              {/* User Name */}
              <span className="text-sm font-semibold text-slate-800 hidden sm:inline-block max-w-[150px] truncate">
                {userName}
              </span>

              {/* Dropdown Chevron */}
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                  userDropdownOpen ? 'rotate-180 text-slate-800' : 'group-hover:text-slate-800'
                }`}
              />
            </button>

            {/* User Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xl ring-1 ring-black/5 z-[1020] animate-in fade-in zoom-in-95 duration-150 origin-top-right">
                
                {/* User Header Info Card */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-1.5 border border-slate-100">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f43f5e] text-white font-bold text-xs shadow-sm">
                    {userInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {userName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user?.email || 'productor@agromas.com'}
                    </p>
                    <span className="mt-1 inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wider">
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Navigation Options */}
                <div className="space-y-0.5">
                  <Link
                    href="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span>Ajustes de Cuenta</span>
                  </Link>

                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                  >
                    <HelpCircle className="h-4 w-4 text-slate-500" />
                    <span>Centro de Ayuda</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="my-1.5 border-t border-slate-100" />

                {/* Logout / Login Action */}
                {user ? (
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      router.push('/login');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-crop-700 hover:bg-crop-50 transition"
                  >
                    <User className="h-4 w-4" />
                    <span>Iniciar Sesión / Registro</span>
                  </Link>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
}

export default Topbar;
