"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarRange,
  ChevronRight,
  CircleGauge,
  Droplets,
  Filter,
  Layers3,
  Leaf,
  LogOut,
  MapPinned,
  PanelLeftClose,
  Search,
  ShieldAlert,
  Sprout,
  SunMedium,
  Truck,
  UserCircle,
  Waves,
  Wind,
} from 'lucide-react';
import { Fao56LotDetail } from '@/components/fao56-lot-detail';
import { useAuth } from '@/lib/auth-context';

// Load DashboardMap only on client side to prevent Leaflet SSR errors
const DashboardMap = dynamic(
  () => import('@/components/dashboard-map'),
  { ssr: false }
);

const kpis = [
  { title: 'Lotes monitoreados', value: '48', delta: '+6 hoy', icon: MapPinned, tone: 'text-crop-700 bg-crop-100' },
  { title: 'Alertas activas', value: '7', delta: '2 criticas', icon: AlertTriangle, tone: 'text-amber-700 bg-amber-100' },
  { title: 'Agua optimizada', value: '18.4%', delta: 'vs. semana anterior', icon: Droplets, tone: 'text-water-700 bg-water-100' },
  { title: 'Eficiencia MAS', value: '92%', delta: 'decisiones en tiempo', icon: CircleGauge, tone: 'text-sky-700 bg-sky-100' },
];

const defaultLotes = [
  { name: 'Lote Norte', crop: 'Soja 2da', ndvi: 'Alto', water: '0.78', stress: 'Bajo', status: 'Estable' },
  { name: 'Lote Centro', crop: 'Maiz tardio', ndvi: 'Medio', water: '0.61', stress: 'Moderado', status: 'Monitoreo' },
  { name: 'Lote Sur', crop: 'Trigo', ndvi: 'Bajo', water: '0.42', stress: 'Alto', status: 'Riesgo' },
  { name: 'Lote Este', crop: 'Girasol', ndvi: 'Medio', water: '0.67', stress: 'Moderado', status: 'Revisar' },
];

const alerts = [
  { label: 'Deficit hidrico Lote Sur', detail: 'Se espera cruce de umbral de estres en 24 h si no se ajusta riego.', severity: 'Alta' },
  { label: 'Cobertura nubosa en monitoreo', detail: 'Reducida confianza de NDVI para tres lotes al final de la pasada.', severity: 'Media' },
  { label: 'Ventana optima de riego', detail: 'Recomendacion de aplicacion entre 05:00 y 07:00 por menor ET0.', severity: 'Baja' },
];

const sustainability = [
  { label: 'Agua ahorrada', value: '124.8 ML', icon: Waves, accent: 'from-water-500 to-water-700' },
  { label: 'Energia evitada', value: '31.2 MWh', icon: Wind, accent: 'from-crop-500 to-crop-700' },
  { label: 'Combustible reducido', value: '8.6 kL', icon: Truck, accent: 'from-soil-500 to-soil-700' },
];

const layers = ['NDVI', 'Humedad', 'Riego', 'Lotes', 'Clima'];

export default function DashboardPage() {
  const auth = useAuth();
  const [activeLots, setActiveLots] = useState(defaultLotes);
  const [hasCustomLots, setHasCustomLots] = useState(false);
  const [customCenter, setCustomCenter] = useState<[number, number]>([-33.8906, -60.5732]);
  const [rawCustomLots, setRawCustomLots] = useState<any[]>([]);

  const currentUser = auth.user;

  useEffect(() => {
    // 1. If backend has returned saved fields from /api/v1/users/me
    if (auth.fields && auth.fields.length > 0) {
      setHasCustomLots(true);
      const convertedLots = auth.fields.map((f) => {
        const coords = f.geometry_geojson?.coordinates?.[0] || [];
        const polygon = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
        return {
          id: String(f.id),
          name: f.name,
          polygon,
          area: f.area_ha || 0,
          crop: f.crop_type,
          soil: f.soil_type || 'Franco',
          irrigation: f.irrigation_system,
          fc: f.field_capacity_fc,
          wp: f.wilting_point_wp,
          taw: f.total_available_water_taw
        };
      });
      setRawCustomLots(convertedLots);

      const mapped = auth.fields.map((f, idx) => ({
        name: f.name,
        crop: `${f.crop_type} (${f.irrigation_system})`,
        ndvi: idx % 2 === 0 ? 'Alto' : 'Medio',
        water: (0.45 + (idx * 0.11) % 0.4).toFixed(2),
        stress: idx % 3 === 0 ? 'Bajo' : idx % 3 === 1 ? 'Moderado' : 'Alto',
        status: idx % 3 === 0 ? 'Estable' : idx % 3 === 1 ? 'Monitoreo' : 'Revisar'
      }));
      setActiveLots(mapped);

      if (auth.fields[0]?.center_latitude && auth.fields[0]?.center_longitude) {
        setCustomCenter([auth.fields[0].center_latitude, auth.fields[0].center_longitude]);
      }
      return;
    }

    // 2. Offline fallback from localStorage
    const savedLots = localStorage.getItem('agromas_lots');
    const savedCenter = localStorage.getItem('agromas_center');

    if (savedLots) {
      try {
        const parsedLots = JSON.parse(savedLots);
        if (Array.isArray(parsedLots) && parsedLots.length > 0) {
          setRawCustomLots(parsedLots);
          setHasCustomLots(true);

          const mapped = parsedLots.map((l, idx) => ({
            name: l.name,
            crop: `${l.crop} (${l.irrigation})`,
            ndvi: idx % 2 === 0 ? 'Alto' : 'Medio',
            water: (0.45 + (idx * 0.11) % 0.4).toFixed(2),
            stress: idx % 3 === 0 ? 'Bajo' : idx % 3 === 1 ? 'Moderado' : 'Alto',
            status: idx % 3 === 0 ? 'Estable' : idx % 3 === 1 ? 'Monitoreo' : 'Revisar'
          }));
          setActiveLots(mapped);
        }
      } catch (err) {
        console.error("Error reading lots from localStorage:", err);
      }
    }

    if (savedCenter) {
      try {
        setCustomCenter(JSON.parse(savedCenter));
      } catch (err) {}
    }
  }, [auth.fields]);

  const handleClearLots = () => {
    localStorage.removeItem('agromas_lots');
    localStorage.removeItem('agromas_center');
    setActiveLots(defaultLotes);
    setHasCustomLots(false);
    setRawCustomLots([]);
  };

  const handleLogout = () => {
    auth.logout();
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f6f1_0%,#eef2eb_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 p-4 lg:p-6">
        
        {/* Sidebar */}
        <aside className="hidden w-[280px] shrink-0 flex-col rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-soft backdrop-blur xl:flex justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-200/80 pb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-crop-500 to-water-500 text-white shadow-lg shadow-crop-500/20">
                <Sprout className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">AgroMAS</p>
                <h1 className="text-lg font-semibold text-slate-950">Gestión inteligente</h1>
              </div>
            </div>

            <nav className="mt-6 space-y-2">
              {['Overview', 'Mapa de lotes', 'Balance hídrico', 'Sostenibilidad', 'Alertas MAS'].map((item, index) => (
                <button
                  key={item}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${index === 0 ? 'bg-crop-50 text-crop-800 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <span>{item}</span>
                  {index === 0 ? <ChevronRight className="h-4 w-4" /> : null}
                </button>
              ))}
            </nav>

            {/* Onboarding Trigger Button */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 space-y-2">
              <Link 
                href="/onboarding" 
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 text-white rounded-2xl py-3 px-4 text-xs font-bold shadow-md hover:shadow-lg transition duration-200"
              >
                <MapPinned className="h-4 w-4" />
                Configurar Campo (Wizard)
              </Link>

              {hasCustomLots && (
                <button
                  onClick={handleClearLots}
                  className="flex items-center justify-center gap-2 w-full bg-slate-200/50 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-2xl py-2 px-4 text-[11px] font-semibold border border-transparent hover:border-rose-200 transition duration-200"
                >
                  Restaurar Demos
                </button>
              )}
            </div>
          </div>

          {/* User Profile Card & System Status */}
          <div className="space-y-3">
            {currentUser ? (
              <div className="rounded-[24px] bg-slate-900 border border-slate-800 p-4 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs">
                      {currentUser.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AG'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate max-w-[130px]">
                        {currentUser.name || 'Productor'}
                      </p>
                      <p className="text-[10px] text-emerald-400 capitalize">
                        {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'agronomist' ? 'Asesor Agronómico' : 'Operario'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Cerrar sesión"
                    className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-400 hover:text-rose-400 transition"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full rounded-[24px] bg-slate-900 hover:bg-slate-800 border border-slate-700/60 p-3.5 text-white text-xs font-bold shadow-lg transition"
              >
                <UserCircle className="h-4 w-4 text-emerald-400" />
                Iniciar Sesión / Registro
              </Link>
            )}

            <div className="rounded-[24px] bg-slate-950 p-4 text-white shadow-lg">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400 font-semibold">Estado del sistema</p>
              <div className="mt-3 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Fuentes satelitales</span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">OK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Modelo FAO-56</span>
                  <span className="rounded-full bg-water-500/15 px-2 py-0.5 text-[10px] text-water-300">Actualizado</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">MAS orquestación</span>
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">7 eventos</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-soft backdrop-blur md:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <Link href="/onboarding" className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm xl:hidden">
                  <PanelLeftClose className="h-5 w-5" />
                </Link>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Tablero general</p>
                  <h2 className="text-2xl font-semibold text-slate-950 md:text-3xl">Monitoreo agroclimático y balance de lotes</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <Search className="h-4 w-4" />
                  <span>Buscar lote, cultivo o alerta</span>
                </div>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm">
                  <CalendarRange className="h-4 w-4" />
                  Últimos 7 días
                </button>
                
                {currentUser ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold text-xs">
                      {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 hidden sm:inline max-w-[120px] truncate">
                      {currentUser.name ? currentUser.name.split(' ')[0] : 'Usuario'}
                    </span>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-1.5 rounded-2xl bg-slate-950 hover:bg-slate-800 px-4 py-3 text-xs font-bold text-white shadow-sm transition"
                  >
                    <UserCircle className="h-4 w-4 text-emerald-400" />
                    Iniciar Sesión
                  </Link>
                )}
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((item) => {
              const Icon = item.icon;

              return (
                <article key={item.title} className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{item.title}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                        {item.title === 'Lotes monitoreados' && hasCustomLots ? activeLots.length : item.value}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">{item.delta}</p>
                    </div>
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="space-y-6">
            <article className="overflow-hidden rounded-[30px] border border-white/70 bg-slate-950 text-white shadow-soft">
              <div className="border-b border-white/10 px-6 py-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em] text-slate-400">Mapa de lotes</p>
                    <h3 className="mt-1 text-2xl font-semibold">
                      {hasCustomLots ? 'Establecimiento Configurado del Productor' : 'Regiones productivas por tipo de cultivo'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {layers.map((layer, index) => (
                      <button key={layer} className={`rounded-full px-4 py-2 text-sm font-medium transition ${index === 0 ? 'bg-white text-slate-950' : 'bg-white/8 text-slate-300 hover:bg-white/12'}`}>
                        {layer}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,16,12,0.92),rgba(5,9,8,0.98))] p-5 animate-fade-in">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(38,115,77,0.22),transparent_24%),radial-gradient(circle_at_74%_16%,rgba(59,130,246,0.18),transparent_20%),radial-gradient(circle_at_45%_78%,rgba(245,158,11,0.15),transparent_24%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px]" />

                  <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 backdrop-blur mb-5">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        {hasCustomLots ? 'Monitoreo Satelital Real' : 'Vista satelital conceptual'}
                      </p>
                      <p className="text-sm text-slate-200">
                        {hasCustomLots 
                          ? 'Suelos y coberturas vegetales estimadas para los lotes dibujados por el usuario.'
                          : 'Parcelas delimitadas por color según tipo de cultivo y comportamiento del vigor'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="rounded-full bg-white/10 px-3 py-1">Sentinel-2</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">{hasCustomLots ? 'Zoom Dinámico' : 'Zoom 14'}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">NDVI 0.82</span>
                    </div>
                  </div>

                  {/* Render real map if user configured lots, otherwise render mock */}
                  {hasCustomLots ? (
                    <DashboardMap center={customCenter} lots={rawCustomLots} />
                  ) : (
                    <div className="relative min-h-[560px] overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#5a6244_0%,#3f4a32_24%,#263526_52%,#15201d_100%)] p-4">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.05),transparent_20%),radial-gradient(circle_at_82%_12%,rgba(255,255,255,0.04),transparent_14%),radial-gradient(circle_at_60%_76%,rgba(0,0,0,0.20),transparent_26%)]" />
                      <div className="absolute inset-0 bg-[linear-gradient(118deg,transparent_0%,transparent_18%,rgba(255,255,255,0.06)_18.2%,transparent_19%),linear-gradient(32deg,transparent_0%,transparent_36%,rgba(255,255,255,0.05)_36.2%,transparent_37%)] opacity-60" />

                      <div className="absolute left-5 top-5 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs text-white/80 backdrop-blur">Google Earth style mockup</div>
                      <div className="absolute right-5 top-5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100 backdrop-blur">Mapa de regiones por cultivo</div>

                      <div className="absolute left-[7%] top-[14%] h-[22%] w-[24%] rounded-[30px] border border-emerald-300/35 bg-emerald-500/20 shadow-[inset_0_0_42px_rgba(34,197,94,0.18)] rotate-[-9deg]" />
                      <div className="absolute left-[26%] top-[8%] h-[26%] w-[18%] rounded-[34px] border border-yellow-200/35 bg-yellow-500/20 shadow-[inset_0_0_40px_rgba(245,158,11,0.16)] rotate-[10deg]" />
                      <div className="absolute left-[46%] top-[18%] h-[25%] w-[23%] rounded-[38px] border border-cyan-300/30 bg-cyan-500/20 shadow-[inset_0_0_38px_rgba(34,211,238,0.14)] rotate-[-7deg]" />
                      <div className="absolute right-[9%] top-[14%] h-[28%] w-[24%] rounded-[40px] border border-lime-200/35 bg-lime-500/18 shadow-[inset_0_0_42px_rgba(132,204,22,0.16)] rotate-[7deg]" />
                      <div className="absolute left-[16%] bottom-[16%] h-[23%] w-[28%] rounded-[36px] border border-amber-200/35 bg-amber-500/18 shadow-[inset_0_0_36px_rgba(245,158,11,0.14)] rotate-[2deg]" />
                      <div className="absolute right-[19%] bottom-[14%] h-[21%] w-[24%] rounded-[34px] border border-red-200/30 bg-red-500/18 shadow-[inset_0_0_36px_rgba(239,68,68,0.12)] rotate-[-11deg]" />

                      <div className="absolute left-[12%] top-[46%] h-[2px] w-[72%] bg-amber-100/60" />
                      <div className="absolute left-[34%] top-[10%] h-[80%] w-[2px] bg-white/25" />
                      <div className="absolute left-[8%] top-[30%] h-[2px] w-[78%] bg-white/18" />
                      <div className="absolute left-[14%] top-[12%] h-[2px] w-[68%] bg-white/12 rotate-[-12deg] origin-left" />

                      <div className="absolute left-[18%] top-[22%] rounded-full border border-white/15 bg-slate-950/60 px-3 py-1 text-[11px] text-white/80 backdrop-blur">Soja</div>
                      <div className="absolute left-[52%] top-[30%] rounded-full border border-amber-300/25 bg-amber-400/20 px-3 py-1 text-[11px] text-amber-50 backdrop-blur">Maíz</div>
                      <div className="absolute right-[13%] bottom-[24%] rounded-full border border-red-300/25 bg-red-500/20 px-3 py-1 text-[11px] text-red-50 backdrop-blur">Trigo</div>
                      <div className="absolute left-[18%] bottom-[22%] rounded-full border border-cyan-300/25 bg-cyan-500/20 px-3 py-1 text-[11px] text-cyan-50 backdrop-blur">Girasol</div>

                      <div className="absolute left-[23%] bottom-[27%] flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.14)]"><div className="h-2 w-2 rounded-full bg-crop-500" /></div>
                      <div className="absolute left-[49%] top-[34%] flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.14)]"><div className="h-2 w-2 rounded-full bg-amber-400" /></div>
                      <div className="absolute right-[24%] bottom-[29%] flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.14)]"><div className="h-2 w-2 rounded-full bg-red-400" /></div>
                      <div className="absolute left-[39%] bottom-[19%] flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-[0_0_0_6px_rgba(255,255,255,0.14)]"><div className="h-2 w-2 rounded-full bg-cyan-400" /></div>

                      <div className="absolute left-4 top-1/2 flex -translate-y-1/2 flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-2 backdrop-blur">
                        <button className="h-9 w-9 rounded-xl bg-white/10 text-white">+</button>
                        <button className="h-9 w-9 rounded-xl bg-white/10 text-white">-</button>
                        <button className="h-9 w-9 rounded-xl bg-white/10 text-white">⌂</button>
                      </div>

                      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-black/35 px-4 py-3 text-xs text-slate-200 backdrop-blur">
                        <div className="flex items-center gap-2"><Filter className="h-4 w-4" />Capas activas: satélite, NDVI, humedad, alertas</div>
                        <div className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-300" />2 lotes con riesgo de estrés</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lot cards */}
              <div className="p-6 border-t border-white/10">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {activeLots.map((lote, index) => {
                    const borderTone = index === 0 ? 'border-emerald-500/30' : index === 1 ? 'border-amber-500/30' : index === 2 ? 'border-red-500/30' : 'border-cyan-500/30';
                    const dotTone = index === 0 ? 'bg-emerald-400' : index === 1 ? 'bg-amber-400' : index === 2 ? 'bg-red-400' : 'bg-cyan-400';
                    return (
                      <article key={lote.name} className={`rounded-[26px] border ${borderTone} bg-white/80 p-5 shadow-soft backdrop-blur`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Lote {index + 1}</p>
                            <h4 className="mt-1 text-xl font-semibold text-slate-950">{lote.name}</h4>
                            <p className="mt-1 text-sm text-slate-500">{lote.crop}</p>
                          </div>
                          <span className={`mt-1 h-3 w-3 rounded-full ${dotTone}`} />
                        </div>

                        <div className="mt-4 space-y-3 text-sm text-slate-600">
                          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>NDVI</span><span className="font-semibold text-slate-950">{lote.ndvi}</span></div>
                          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>Balance hídrico</span><span className="font-semibold text-slate-950">{lote.water}</span></div>
                          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>Estrés</span><span className="font-semibold text-slate-950">{lote.stress}</span></div>
                          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"><span>Estado</span><span className="font-semibold text-slate-950">{lote.status}</span></div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </article>
          </section>

          {/* FAO-56 section */}
          <section className="rounded-[30px] border border-slate-200/70 bg-slate-100/60 p-4 shadow-soft backdrop-blur md:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Segunda iteración</p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-950">Detalle FAO-56 e impacto acumulado</h3>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Dark mode + Recharts</span>
            </div>

            <Fao56LotDetail />
          </section>
        </section>
      </div>

      <style jsx global>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </main>
  );
}