"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Logo,
} from '@/components/logo';
import {
  getInvitationPreviewApi,
  acceptInvitationApi,
  InvitationPreviewResponse,
  FieldRole,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatPhoneWhatsapp } from '@/lib/phone-formatter';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Building2,
  Briefcase,
  Crown,
  Wrench,
} from 'lucide-react';

const roleDetails: Record<
  FieldRole,
  { title: string; badgeStyle: string; icon: any }
> = {
  admin: {
    title: 'Dueño / Administrador',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: Crown,
  },
  agronomist: {
    title: 'Asesor Agrónomo',
    badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200',
    icon: Briefcase,
  },
  operator: {
    title: 'Operador de Riego',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: Wrench,
  },
};

export default function InvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State for new users
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      if (!token) {
        setError('Token de invitación no especificado.');
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await getInvitationPreviewApi(token);
      if (res.ok && res.data) {
        setPreview(res.data);
        if (res.data.first_name) setFirstName(res.data.first_name);
        if (res.data.last_name) setLastName(res.data.last_name);
      } else {
        setError('El enlace de invitación ha expirado, es inválido o ya fue utilizado.');
      }
      setLoading(false);
    }
    loadPreview();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (preview?.requires_password) {
      if (!firstName.trim() || !lastName.trim()) {
        setSubmitError('Por favor completa tu nombre y apellido.');
        return;
      }
      if (!password || password.length < 6) {
        setSubmitError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError('Las contraseñas no coinciden.');
        return;
      }
    }

    setIsSubmitting(true);

    const res = await acceptInvitationApi(token, {
      password: preview?.requires_password ? password : undefined,
      first_name: preview?.requires_profile ? firstName.trim() : undefined,
      last_name: preview?.requires_profile ? lastName.trim() : undefined,
      phone_whatsapp: preview?.requires_profile ? phone.trim() : undefined,
    });

    if (res.ok) {
      // Navigate directly to Dashboard
      router.push('/');
    } else {
      setSubmitError(res.data?.detail || res.data?.message || 'Error al aceptar la invitación.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Radial Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-emerald-600/15 via-sky-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
            <Logo className="h-9 w-9 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">AgroMAS</h1>
            <p className="text-xs text-slate-400 font-medium">Plataforma AgTech de Precisión</p>
          </div>
        </div>

        {/* Card Body */}
        <div className="bg-white text-slate-900 rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200/80">
          
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-semibold text-slate-600">Verificando enlace de invitación...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mx-auto">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Enlace No Válido</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => router.push('/login')}
                className="w-full mt-2 rounded-2xl bg-slate-900 text-white py-3 text-xs font-bold hover:bg-slate-800 transition"
              >
                Ir a Iniciar Sesión
              </button>
            </div>
          ) : preview ? (
            <div className="space-y-5">
              
              {/* Header Info */}
              <div className="text-center space-y-2 pb-4 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{preview.farm_name}</span>
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Invitación al Establecimiento
                </h2>
                {preview.invited_by_name && (
                  <p className="text-xs text-slate-500">
                    Invitado por <strong className="text-slate-800">{preview.invited_by_name}</strong>
                  </p>
                )}
              </div>

              {/* Role Card */}
              {(() => {
                const roleMeta = roleDetails[preview.role] || roleDetails.operator;
                const RoleIcon = roleMeta.icon;
                return (
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="p-2.5 rounded-xl bg-white shadow-2xs border border-slate-200 text-emerald-700">
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Rol Asignado</span>
                      <span className="text-xs font-black text-slate-900 block truncate">{roleMeta.title}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Error Message */}
              {submitError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAccept} noValidate className="space-y-3.5">
                
                {/* Email Read-only */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Correo Invitado
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      readOnly
                      value={preview.email}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-100 pl-10 pr-4 py-2.5 text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Additional Inputs if requires_profile or requires_password */}
                {preview.requires_profile && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Nombre
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Tu nombre"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Apellido
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Tu apellido"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        WhatsApp (Alertas de Bombeo)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="+54 9 2477 123456"
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneWhatsapp(e.target.value))}
                          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                {preview.requires_password && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Crear Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          placeholder="Mínimo 6 caracteres"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Confirmar Contraseña
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          required
                          placeholder="Repetir contraseña"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Aceptar y Unirme al Establecimiento</span>
                      <ArrowRight className="h-4 w-4 text-white" />
                    </>
                  )}
                </button>

              </form>

            </div>
          ) : null}

        </div>

      </div>
    </div>
  );
}
