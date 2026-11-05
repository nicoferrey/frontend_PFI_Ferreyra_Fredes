"use client";

import { useState, type FormEvent } from 'react';
import { askFieldHistoryApi, type FieldHistoryAnswer } from '@/lib/api';
import { fieldDateString, shiftFieldDate } from '@/lib/field-dates';

const examples = ['Resumí el balance', '¿Cuántos días superó la AFD?', '¿Cuál fue el agotamiento máximo?',
  '¿Cuánto llovió y cuánto riego se contabilizó?', '¿Qué NDVI hay guardado?'];

export function FieldHistoryChat({ fieldId }: { fieldId: number }) {
  const yesterday = shiftFieldDate(fieldDateString(), -1);
  const [from, setFrom] = useState(shiftFieldDate(yesterday, -89));
  const [to, setTo] = useState(yesterday);
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Array<{ question: string; result: FieldHistoryAnswer }>>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const validRange = !!from && !!to && from <= to && to <= yesterday && from >= shiftFieldDate(to, -89);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !validRange || !question.trim()) return;
    const asked = question.trim();
    setPending(true);
    setError('');
    try {
      const result = await askFieldHistoryApi(fieldId, { question: asked, date_from: from, date_to: to });
      setTurns(previous => [...previous.slice(-19), { question: asked, result }]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo consultar el historial.');
    } finally {
      setPending(false);
    }
  }

  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
    <h2 className="text-lg font-bold">Preguntá por el historial del lote</h2>
    <p className="text-sm text-slate-600">Solo datos guardados del lote seleccionado. Elegí las fechas abajo; no se recalcula el balance ni se consultan APIs externas.</p>
    <form onSubmit={submit} className="space-y-3">
      <fieldset disabled={pending} className="flex flex-wrap gap-3">
        <label className="text-sm">Desde <input required type="date" value={from} max={to || yesterday}
          onChange={event => setFrom(event.target.value)} className="block rounded-lg border border-slate-300 p-2" /></label>
        <label className="text-sm">Hasta <input required type="date" value={to} max={yesterday}
          onChange={event => setTo(event.target.value)} className="block rounded-lg border border-slate-300 p-2" /></label>
      </fieldset>
      {!validRange && <p className="text-sm text-rose-700">Elegí un período de hasta 90 días cerrados.</p>}
      <div className="flex flex-wrap gap-2">
        {examples.map(example => <button key={example} type="button" disabled={pending}
          onClick={() => setQuestion(example)} className="rounded-lg border border-slate-200 px-3 py-1 text-sm">{example}</button>)}
      </div>
      <label className="block text-sm font-semibold">Tu pregunta
        <input value={question} onChange={event => setQuestion(event.target.value)} maxLength={350}
          disabled={pending} className="mt-1 w-full rounded-xl border border-slate-300 p-3"
          placeholder="Por ejemplo: ¿Cuál fue el agotamiento máximo?" />
      </label>
      <button type="submit" disabled={pending || !validRange || !question.trim()}
        className="rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
        {pending ? 'Consultando…' : 'Preguntar'}
      </button>
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    </form>
    <div aria-live="polite" className="max-h-96 space-y-3 overflow-y-auto">
      {turns.map(({ question: asked, result }, index) => <article key={index} className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm">
        <p className="font-semibold break-words">{asked}</p>
        <p>{result.answer}</p>
        <p className="text-xs text-slate-500">{result.date_from} a {result.date_to}</p>
        {result.warnings.map(warning => <p key={warning} className="text-xs text-slate-600">{warning}</p>)}
      </article>)}
    </div>
  </section>;
}
