"use client";

import { useEffect, useState } from 'react';
import { MessageSquare, X, Clock, User, ArrowRight, Phone, MessageCircle, ChevronRight } from 'lucide-react';
import { ModalPortal } from '@/components/modal-portal';
import { formatPhoneWhatsapp } from '@/lib/phone-formatter';
import { useDashboard } from '@/app/(dashboard)/context';
import { PageHeader } from '@/components/page-header';
import { FieldHistoryChat } from '@/components/field-history-chat';
import { useAuth } from '@/lib/auth-context';
import { getWebAssistantHistoryApi, type WebAssistantTurn } from '@/lib/api';

function formatDate(value: string | undefined, fallback = '-'): string {
  if (!value) return fallback;
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return fallback;
  return `${day}/${month}/${year}`;
}

export default function DashboardAssistantPage() {
  const auth = useAuth();
  const { selectedLotId, setSelectedLotId, teamMembers } = useDashboard();
  const currentFarmId = auth.currentFarmId;
  // Use persisted authorized fields, never the dashboard's demonstration lots.
  const lot = auth.currentFields.find((field) => String(field.id) === selectedLotId) || auth.currentFields[0];
  const [webRevision, setWebRevision] = useState(0);
  const [expandedWebHistoryScope, setExpandedWebHistoryScope] = useState<string | null>(null);
  const [resumedChat, setResumedChat] = useState<{ scope: string; turns: WebAssistantTurn[]; revision: number } | null>(null);
  const [webHistory, setWebHistory] = useState<{ scope: string; turns: WebAssistantTurn[]; error?: string } | null>(null);
  const webScope = `${auth.user?.id ?? ''}:${currentFarmId ?? 'unassigned'}`;
  const activeChat = resumedChat?.scope === webScope ? resumedChat : null;
  const historyFieldId = auth.currentFields[0]?.id;
  useEffect(() => {
    if (!historyFieldId || !auth.user || auth.isLoading) return;
    const controller = new AbortController();
    getWebAssistantHistoryApi(Number(historyFieldId), controller.signal).then(
      turns => { if (!controller.signal.aborted) setWebHistory({ scope: webScope, turns }); },
      () => { if (!controller.signal.aborted) setWebHistory({ scope: webScope, turns: [], error: 'No se pudo cargar el historial web.' }); },
    );
    return () => controller.abort();
  }, [historyFieldId, auth.user?.id, auth.isLoading, webScope, webRevision]);
  const visibleWebHistory = auth.user && !auth.isLoading && historyFieldId && webHistory?.scope === webScope ? webHistory : null;
  const webConversations = Object.values((visibleWebHistory?.turns ?? []).reduce<Record<string, WebAssistantTurn[]>>(
    (groups, turn) => { (groups[turn.conversation_id] ??= []).push(turn); return groups; }, Object.create(null),
  ));
  const showAllWebChats = expandedWebHistoryScope === webScope;
  const visibleWebChats = showAllWebChats ? webConversations : webConversations.slice(0, 5);

  const [selectedMemberHistory, setSelectedMemberHistory] = useState<any | null>(null);
  const [whatsappMembers, setWhatsappMembers] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchAssistantHistory() {
      setIsLoadingHistory(true);
      setWhatsappMembers([]);
      setSelectedMemberHistory(null);
      try {
        if (!currentFarmId) return;

        const { getAssistantHistoryApi } = await import('@/lib/api');

        const historyRes = await getAssistantHistoryApi(currentFarmId, 7);
        if (isCancelled) return;

        if (historyRes && historyRes.items) {
          const itemsByMember = historyRes.items.reduce((acc: any, item: any) => {
            if (!acc[item.member_id]) acc[item.member_id] = [];
            acc[item.member_id].push(item);
            return acc;
          }, {});

          const roleLabels: Record<string, string> = {
            admin: 'Dueño / Administrador',
            agronomist: 'Asesor Agrónomo',
            operator: 'Operador de Riego',
          };

          const dynamicMembers = Object.keys(itemsByMember).map((memberId, idx) => {
            const memberHistory = itemsByMember[memberId];
            // Sort by newest first
            memberHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const latest = memberHistory[0];
            const memberInfo = teamMembers?.find((m) => String(m.id) === String(memberId));

            const name = memberInfo?.name || `${memberInfo?.first_name || ''} ${memberInfo?.last_name || ''}`.trim() || `Usuario WhatsApp`;
            const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'WA';
            const rawRole = memberInfo?.role || 'operator';
            const role = roleLabels[rawRole] || rawRole;
            const phone = memberInfo?.phone_whatsapp || memberInfo?.phone || latest.phone_whatsapp;

            const colors = ['bg-emerald-100 text-emerald-800 border-emerald-300', 'bg-sky-100 text-sky-800 border-sky-300', 'bg-amber-100 text-amber-800 border-amber-300', 'bg-indigo-100 text-indigo-800 border-indigo-300'];
            const avatarBg = colors[idx % colors.length];

            const categoryLabels: Record<string, string> = {
              irrigation: 'Balance Hídrico',
              weather: 'Alerta Clima',
              ndvi: 'Índices Satelitales',
              register_irrigation: 'Registro Riego',
              register_rainfall: 'Registro Lluvia',
              navigation: 'Navegación'
            };

            const statusLabels: Record<string, string> = {
              resolved: 'RESUELTO',
              pending: 'POSTERGADO',
              registered: 'REGISTRADO'
            };

            const totalTurnCount = memberHistory.reduce((sum: number, h: any) => sum + (h.turn_count ?? h.turnCount ?? 1), 0);

            return {
              id: memberId,
              name,
              role,
              phone,
              avatar: initials,
              avatarBg,
              lastActive: formatDate(latest.date, 'Reciente'),
              latestQuery: latest.query,
              latestSummary: latest.ai_response,
              historyCount: totalTurnCount,
              history: memberHistory.map((h: any) => ({
                id: h.id,
                date: new Date(h.date).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) + ' hs',
                query: h.query,
                aiResponse: h.ai_response,
                category: categoryLabels[h.category] || h.category || 'Consulta',
                status: statusLabels[h.status] || h.status || 'OK',
                turnCount: h.turn_count ?? h.turnCount ?? 1
              }))
            };
          });

          setWhatsappMembers(dynamicMembers);
        } else {
          setWhatsappMembers([]);
        }
      } catch (err) {
        console.error('Failed to fetch assistant history:', err);
      } finally {
        if (!isCancelled) setIsLoadingHistory(false);
      }
    }

    fetchAssistantHistory();

    // Soft polling every 30 seconds
    const interval = setInterval(fetchAssistantHistory, 30000);
    return () => { isCancelled = true; clearInterval(interval); };
  }, [currentFarmId, teamMembers]);


  return (
    <div className="space-y-6">
      <PageHeader badge="Asistente IA" title="Asistente" titleAccent="de riego"
        description="Consultá tus lotes y registrá riegos o lluvias en el chat." />
      {lot && auth.user && !auth.isLoading && <FieldHistoryChat
        key={`${webScope}:${activeChat?.revision ?? 0}`} fieldId={Number(lot.id)} fieldName={lot.name}
        savedTurns={activeChat?.turns}
        onHistoryChanged={() => setWebRevision(value => value + 1)}
        onSelectField={id => {
          if (auth.currentFields.some(field => Number(field.id) === id)) setSelectedLotId(String(id));
        }} />}
      {!lot && !auth.isLoading && <p className="text-sm text-slate-600">No hay lotes registrados accesibles.</p>}

          {/* SECOND ROW (100% Width): WHATSAPP CONVERSATIONS BY TEAM MEMBER */}
          <div className="w-full overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-6 shadow-soft">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <MessageSquare className="h-5.5 w-5.5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-950">
                    Historial de conversaciones
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tus conversaciones web y la actividad del establecimiento por WhatsApp.
                  </p>
                </div>
              </div>
            </div>

            <section className="mb-6 space-y-2" aria-label="Mis chats web">
              <h4 className="text-sm font-bold">Mis chats web</h4>
              {visibleWebHistory?.error && <p role="alert" className="text-sm text-rose-700">{visibleWebHistory.error}</p>}
              {visibleWebHistory && !visibleWebHistory.error && !webConversations.length &&
                <p className="text-sm text-slate-500">No hay conversaciones web en los últimos 90 días.</p>}
              {!visibleWebHistory && Boolean(historyFieldId) && <p className="text-sm text-slate-500">Cargando tus chats web…</p>}
              {visibleWebChats.map(group => <details key={group[0].conversation_id} className="rounded-xl border border-slate-200 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Web · {group.at(-1)?.question} · {formatDate(group[0].created_at)}
                </summary>
                <div className="mt-3 space-y-3">
                  <button type="button" onClick={() => {
                    setResumedChat(previous => ({ scope: webScope, turns: group, revision: (previous?.revision ?? 0) + 1 }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }} className="rounded-lg bg-emerald-800 px-3 py-1.5 text-sm text-white">Continuar chat</button>
                  {[...group].reverse().map(turn => <article key={turn.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="text-xs text-slate-500">{turn.field_name} · {formatDate(turn.created_at)}</p>
                    <p className="font-semibold break-words">{turn.question}</p>
                    <p className="whitespace-pre-wrap break-words">{turn.answer}</p>
                    {turn.outcome && <p className="text-xs font-medium">{turn.outcome === 'SAVED' ? 'Guardado' : 'Cancelado'}</p>}
                  </article>)}
                </div>
              </details>)}
              {webConversations.length > 5 && <button type="button" aria-expanded={showAllWebChats}
                onClick={() => setExpandedWebHistoryScope(showAllWebChats ? null : webScope)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
                {showAllWebChats ? 'Ver menos' : 'Ver más'}
              </button>}
            </section>
            <h4 className="mb-2 text-sm font-bold">WhatsApp</h4>
            {/* Member Cards Grid (Full Width 3 Columns) */}
            {isLoadingHistory ? (
              <div className="py-12 text-center text-sm font-medium text-slate-400">
                <span className="inline-block animate-spin h-5 w-5 border-2 border-slate-300 border-t-slate-500 rounded-full mr-2 align-middle"></span>
                Cargando historial de WhatsApp...
              </div>
            ) : whatsappMembers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {whatsappMembers.map((member) => (
                  <div
                    key={member.id}
                  onClick={() => setSelectedMemberHistory(member)}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-slate-50/50 p-5 transition-all duration-200 hover:bg-white hover:border-slate-300 hover:shadow-md cursor-pointer"
                >
                  <div>
                    {/* Member Profile Header */}
                    <div className="flex items-start justify-between border-b border-slate-200/60 pb-3.5 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-black text-sm border shadow-2xs ${member.avatarBg}`}>
                          {member.avatar}
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-950 group-hover:text-crop-700 transition-colors">
                            {member.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium">{member.role}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{member.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* Latest Session */}
                    <div className="space-y-3 mb-4">
                      <div className="rounded-xl bg-white p-3 border border-slate-200/80 shadow-2xs">
                        <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block mb-1">
                          Tema de la sesión:
                        </span>
                        <p className="text-xs font-semibold text-slate-900 leading-snug italic">
                          “{member.latestQuery}”
                        </p>
                      </div>

                      <div className="rounded-xl bg-emerald-50/60 p-3 border border-emerald-100">
                        <span className="text-[9px] text-emerald-700 uppercase font-extrabold tracking-wider block mb-1">
                          Resumen de la conversación:
                        </span>
                        <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                          {member.latestSummary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-slate-400">
                      {member.lastActive} &bull; {member.historyCount} {member.historyCount === 1 ? 'consulta' : 'consultas'}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 font-extrabold text-crop-700 hover:text-crop-800 text-xs transition"
                    >
                      <span>Ver Historial</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <MessageSquare className="h-8 w-8 mx-auto text-slate-300 mb-3" />
                <h4 className="text-sm font-bold text-slate-700">Sin conversaciones recientes</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Aún no hay interacciones con el Asistente MAS registradas en los últimos 7 días para este establecimiento.
                </p>
              </div>
            )}
          </div>

      {/* WHATSAPP HISTORY MODAL DIALOG */}
      <ModalPortal
        isOpen={Boolean(selectedMemberHistory)}
        onClose={() => setSelectedMemberHistory(null)}
      >
        {selectedMemberHistory && (
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[28px] border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">

            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
              <div className="flex items-center gap-3.5">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-black text-base border shadow-2xs ${selectedMemberHistory.avatarBg}`}>
                  {selectedMemberHistory.avatar}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-950">
                    Historial WhatsApp &bull; {selectedMemberHistory.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedMemberHistory.role} &bull; <span className="font-mono text-slate-600">{formatPhoneWhatsapp(selectedMemberHistory.phone)}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMemberHistory(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Timeline Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between text-xs text-slate-400 font-extrabold uppercase tracking-wider pb-2 border-b border-slate-100">
                <span>Línea de Tiempo de Consultas</span>
                <span>{selectedMemberHistory.historyCount} {selectedMemberHistory.historyCount === 1 ? 'consulta registrada' : 'consultas registradas'}</span>
              </div>

              {selectedMemberHistory.history.map((item: any) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 font-mono text-[11px]">{item.date}</span>
                    <div className="flex items-center gap-2">
                      {item.turnCount > 1 && (
                        <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {item.turnCount} mensajes
                        </span>
                      )}
                      <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700 uppercase">
                        {item.category}
                      </span>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800 uppercase">
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Question / Session Topic */}
                  <div className="rounded-xl bg-white p-3 border border-slate-200/80">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                      Tema de la sesión:
                    </span>
                    <p className="text-xs font-semibold text-slate-900 leading-snug">
                      "{item.query}"
                    </p>
                  </div>

                  {/* AI Response / Conversation Summary */}
                  <div className="rounded-xl bg-emerald-50/80 p-3 border border-emerald-100">
                    <span className="text-[9px] text-emerald-800 font-extrabold uppercase tracking-wider block mb-1">
                      Resumen de la conversación:
                    </span>
                    <p className="text-xs font-medium text-emerald-950 leading-relaxed">
                      {item.aiResponse}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedMemberHistory(null)}
                className="rounded-xl bg-slate-950 px-5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800 transition"
              >
                Cerrar Historial
              </button>
            </div>

          </div>
        )}
      </ModalPortal>

    </div>
  );
}
