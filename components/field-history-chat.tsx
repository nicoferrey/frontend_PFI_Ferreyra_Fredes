"use client";

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Bot, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { askFieldHistoryApi, decideFieldWaterDraft, type FieldHistoryAnswer, type WebAssistantTurn } from '@/lib/api';

const examples = ['¿Cuánto llovió en los últimos 7 días?', '¿Cuántos días superó la AFD?', '¿Qué NDVI hay guardado?',
  '¿Conviene regar hoy?', '¿Cuánto debería regar mañana?', 'Ayer regué 20 mm', 'Ayer medí 12 mm de lluvia'];
const conversationalExample = '¿Cuándo estuvo más seco y cómo cambió el agotamiento después de las lluvias?';

export function FieldHistoryChat({ fieldId, fieldName, onSelectField, onHistoryChanged, savedTurns }: {
  fieldId: number; fieldName: string; onSelectField: (id: number) => void; onHistoryChanged: () => void;
  savedTurns?: WebAssistantTurn[];
}) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Array<{ question: string; result: FieldHistoryAnswer; scope: number }>>([]);
  const [transcriptHistory, setTranscriptHistory] = useState(() => savedTurns?.slice().reverse() ?? []);
  const [pending, setPending] = useState(false);
  const [clarifications, setClarifications] = useState<string[]>([]);
  const [conversationField, setConversationField] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [decisions, setDecisions] = useState<Record<string, 'SAVED' | 'CANCELLED'>>({});
  const transcript = useRef<HTMLDivElement>(null);
  const conversationId = useRef<string | null>(savedTurns?.[0]?.conversation_id ?? null);

  useEffect(() => {
    if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [turns, pending]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !question.trim()) return;
    const asked = question.trim();
    setPending(true);
    setError('');
    try {
      const last = turns.at(-1);
      const previous = last?.scope === fieldId && last.result.status === 'ANSWERED' && !last.result.draft ? last.question : undefined;
      const memory = conversationField === fieldId
        ? turns.slice().reverse().find(turn => turn.scope === fieldId && turn.result.read_context)?.result.read_context
        : undefined;
      conversationId.current ??= globalThis.crypto.randomUUID();
      const result = await askFieldHistoryApi(fieldId, { question: asked,
        conversation_id: conversationId.current,
        ...(memory ? { read_context: memory } : {}),
        ...(previous && !memory && !clarifications.length ? { previous_question: previous } : {}),
        ...(clarifications.length ? { pending_messages: clarifications } : {}),
        ...(conversationField === fieldId ? { conversation_field_id: conversationField } : {}) });
      setTurns(previous => [...previous.slice(-19), { question: asked, result, scope: result.selected_field_id ?? fieldId }]);
      if (result.status === 'NEEDS_INPUT') {
        const next = result.replaces_pending_request ? [asked] : [...clarifications, asked];
        if (next.length <= 5) setClarifications(next);
        else {
          setClarifications([]);
          setError('Volvé a contarme el pedido para empezar de nuevo.');
        }
      } else {
        setClarifications([]);
      }
      setQuestion('');
      onHistoryChanged();
      if (result.selected_field_id) {
        onSelectField(result.selected_field_id);
        setConversationField(result.selected_field_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el historial.');
    } finally {
      setPending(false);
    }
  }

  async function decide(id: string, confirm: boolean) {
    if (pending || decisions[id]) return;
    setPending(true);
    setError('');
    try {
      const result = await decideFieldWaterDraft(id, confirm);
      setDecisions(old => ({ ...old, [id]: result }));
      onHistoryChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo resolver el registro.');
    } finally {
      setPending(false);
    }
  }

  return <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-800"><MessageSquare className="h-5 w-5" /></div>
        <div><h2 className="font-bold">Preguntá por el historial del lote</h2>
          <p className="text-xs text-slate-500">{conversationField === fieldId ? fieldName : 'Sin lote elegido en esta conversación'} · Registros con confirmación</p></div>
      </div>
      <button type="button" disabled={pending || (turns.length === 0 && transcriptHistory.length === 0)}
        onClick={() => { setTurns([]); setTranscriptHistory([]); setDecisions({}); setQuestion(''); setError('');
          setClarifications([]); setConversationField(null); conversationId.current = null; }}
        className="inline-flex items-center gap-1.5 text-xs text-slate-600 disabled:opacity-40">
        <RotateCcw className="h-3.5 w-3.5" /> Nuevo chat
      </button>
    </header>
    <div ref={transcript} role="log" aria-label="Conversación del lote"
      className="min-h-52 max-h-[28rem] space-y-5 overflow-y-auto bg-slate-50/60 p-5">
      {!turns.length && !transcriptHistory.length && <div className="max-w-xl space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <Bot className="mr-2 inline h-4 w-4 text-emerald-700" />
          Preguntame o contame qué querés registrar. Si falta el lote, la fecha o la cantidad, te lo pregunto.
        </div>
        <div className="flex flex-wrap gap-2">
          {[...examples, conversationalExample].map(example =>
            <button key={example} type="button" disabled={pending} onClick={() => setQuestion(example)}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-900">{example}</button>)}
        </div>
      </div>}
      {transcriptHistory.map(turn => <div key={turn.id} className="space-y-2">
        <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-emerald-800 px-4 py-2.5 text-sm text-white">{turn.question}</div>
        <article className="mr-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-white p-4 text-sm">
          {turn.answer}
          {turn.outcome && <p className="text-xs font-medium">{turn.outcome === 'SAVED' ? 'Guardado' : 'Cancelado'}</p>}
        </article>
      </div>)}
      {turns.map(({ question: asked, result }, index) => <div key={index} className="space-y-2">
        <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-emerald-800 px-4 py-2.5 text-sm text-white">{asked}</div>
        <article className="mr-auto max-w-[90%] space-y-3 rounded-2xl rounded-bl-sm border border-slate-200 bg-white p-4 text-sm">
          {result.field_name && <p className="text-xs font-semibold text-emerald-800">{result.field_name}</p>}
          {(result.parts?.length ? result.parts : [result]).map((part, i) => <div key={i} className="space-y-1">
            <p>{part.answer}</p>
            {!result.draft && <p className="text-xs text-slate-500">{part.target_date
              ? `${part.mode === 'FORECAST' ? 'Proyección' : 'Vigente'} · ${part.target_date}`
              : part.days_found > 0 ? `${part.date_from} a ${part.date_to}` : ''}</p>}
            {part.warnings.map(warning => <p key={warning} className="text-xs text-slate-600">{warning}</p>)}
          </div>)}
          {result.draft && (() => {
            const draft = result.draft;
            const state = decisions[draft.id];
            return <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="font-semibold">{draft.kind === 'rain' ? 'Lluvia manual' : 'Riego aplicado'} · {draft.amount_mm} mm</p>
              <p>{draft.field_name} · {draft.event_date}</p>
              {draft.efficiency_pct != null && <p className="text-xs">Eficiencia estimada: {draft.efficiency_pct}%.</p>}
              {state ? <p role="status">{state === 'SAVED' ? 'Guardado en Historial.' : 'Borrador cancelado.'}</p>
                : <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={pending} onClick={() => decide(draft.id, true)}
                    className="rounded-lg bg-emerald-800 px-3 py-1.5 text-white disabled:opacity-50">Confirmar</button>
                  <button type="button" disabled={pending} onClick={() => decide(draft.id, false)}
                    className="rounded-lg border border-emerald-300 px-3 py-1.5 disabled:opacity-50">Cancelar</button>
                </div>}
            </div>;
          })()}
        </article>
      </div>)}
      {pending && <p className="text-sm text-slate-600"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Consultando…</p>}
    </div>
    <form onSubmit={submit} className="space-y-2 border-t border-slate-100 p-4">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-300 p-2 focus-within:border-emerald-600">
        <textarea rows={2} aria-label="Tu pregunta" value={question} onChange={event => setQuestion(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault(); event.currentTarget.form?.requestSubmit();
          } }}
          maxLength={350} disabled={pending} placeholder={clarifications.length ? 'Respondé la aclaración…' : 'Escribí tu pregunta…'}
          className="min-w-0 flex-1 resize-y rounded-xl bg-transparent px-2 py-1 text-sm outline-none" />
        <button type="submit" aria-label="Enviar pregunta" disabled={pending || !question.trim()}
          className="rounded-xl bg-emerald-700 p-2.5 text-white disabled:opacity-40"><ArrowUp className="h-5 w-5" /></button>
      </div>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">Privacidad del chat</summary>
        <p className="mt-1">La conversación se guarda en tu historial. El texto necesario para entender tu consulta se
          procesa con un proveedor externo (Google); no se envían los registros del lote. No incluyas información personal.</p>
      </details>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
  </section>;
}
