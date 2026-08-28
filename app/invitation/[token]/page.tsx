"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Logo,
} from '@/components/logo';
import {
  getInvitationPreviewApi,
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
  Sparkles,
  Eye,
  EyeOff,
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
  const auth = useAuth();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form State for new users
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Real-time Field Touch State
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

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

  const needsFullRegistration = Boolean(
    preview?.requires_password || preview?.requires_profile || !preview?.first_name
  );

  // Real-Time Field Validation Checks
  const isFirstNameInvalid = touched.firstName && (!firstName.trim() || firstName.trim().length < 2);
  const isLastNameInvalid = touched.lastName && (!lastName.trim() || lastName.trim().length < 2);
  const isPhoneInvalid = touched.phone && (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 8);
  const isPasswordInvalid = touched.password && (!password || password.length < 6);
  const isConfirmPasswordInvalid = touched.confirmPassword && (confirmPassword !== password);

  // Clean Farm Name formatting (ensure it displays "Establecimiento" instead of raw "Lote")
  const rawFarmName = preview?.farm_name || '';
  const formattedFarmName = rawFarmName
    ? rawFarmName.toLowerCase().startsWith('lote')
      ? 'Establecimiento Principal'
      : rawFarmName
    : 'Establecimiento AgroMAS';

  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    setTouched({
      firstName: true,
      lastName: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (needsFullRegistration) {
      if (!firstName.trim() || firstName.trim().length < 2) {
        setSubmitError('Ingresa un nombre válido (mínimo 2 letras).');
        return;
      }
      if (!lastName.trim() || lastName.trim().length < 2) {
        setSubmitError('Ingresa un apellido válido (mínimo 2 letras).');
        return;
      }
      if (!phone.trim() || phone.replace(/[^0-9]/g, '').length < 8) {
        setSubmitError('Ingresa un número de WhatsApp de alertas válido.');
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

    const res = await auth.acceptInvitation(token, {
      password: needsFullRegistration ? password : undefined,
      first_name: needsFullRegistration ? firstName.trim() : undefined,
      last_name: needsFullRegistration ? lastName.trim() : undefined,
      phone_whatsapp: needsFullRegistration ? phone.trim() : undefined,
    });

    if (res.success) {
      // Direct redirect to Dashboard with active session
      router.push('/');
    } else {
      setSubmitError(res.error || 'Error al aceptar la invitación.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Background Radial Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-emerald-600/15 via-sky-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container - EXPANDED WIDTH (max-w-xl) */}
      <div className="w-full max-w-xl z-10 space-y-6">
        
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

        {/* Card Body - EXPANDED PADDING AND FLEXIBLE LAYOUT */}
        <div className="bg-white text-slate-900 rounded-[32px] p-6 sm:p-9 shadow-2xl border border-slate-200/80">
          
          {loading ? (
            <div className="py-14 text-center space-y-3">
              <Loader2 className="h-9 w-9 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs font-semibold text-slate-600">Verificando enlace de invitación al establecimiento...</p>
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-4">
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
            <div className="space-y-6">
              
              {/* Header Info */}
              <div className="text-center space-y-2.5 pb-5 border-b border-slate-100">
                <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{formattedFarmName}</span>
                </span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Invitación al Establecimiento
                </h2>
                {preview.invited_by_name && (
                  <p className="text-xs text-slate-500">
                    Invitado por <strong className="text-slate-800 font-bold">{preview.invited_by_name}</strong>
                  </p>
                )}
              </div>

              {/* Role Card */}
              {(() => {
                const roleMeta = roleDetails[preview.role] || roleDetails.operator;
                const RoleIcon = roleMeta.icon;
                return (
                  <div className="flex items-center gap-3.5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <div className="p-2.5 rounded-xl bg-white shadow-2xs border border-slate-200 text-emerald-700 shrink-0">
                      <RoleIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Nivel de Acceso</span>
                      <span className="text-xs font-black text-slate-900 block truncate">{roleMeta.title}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Error Banners */}
              {submitError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2.5 animate-shake">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAccept} noValidate className="space-y-4">
                
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

                {/* Registration inputs for new users */}
                {needsFullRegistration ? (
                  <>
                    {/* Row 1: Nombre & Apellido */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Nombre
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tu nombre"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            onBlur={() => handleBlur('firstName')}
                            className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 transition focus:outline-none ${
                              isFirstNameInvalid
                                ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>
                        {isFirstNameInvalid && (
                          <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Ingresa tu nombre (mínimo 2 letras)</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Apellido
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Tu apellido"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            onBlur={() => handleBlur('lastName')}
                            className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 transition focus:outline-none ${
                              isLastNameInvalid
                                ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            }`}
                          />
                        </div>
                        {isLastNameInvalid && (
                          <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Ingresa tu apellido (mínimo 2 letras)</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: WhatsApp */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Teléfono WhatsApp (Alertas de Bombeo)
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          placeholder="+54 9 2477 123456"
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneWhatsapp(e.target.value))}
                          onBlur={() => handleBlur('phone')}
                          className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 transition focus:outline-none ${
                            isPhoneInvalid
                              ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20'
                              : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                          }`}
                        />
                      </div>
                      {isPhoneInvalid && (
                        <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Ingresa un número de WhatsApp válido (código de país + número)</span>
                        </p>
                      )}
                    </div>

                    {/* Row 3: Passwords */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Crear Contraseña
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => handleBlur('password')}
                            className={`w-full rounded-2xl border bg-white pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 transition focus:outline-none ${
                              isPasswordInvalid
                                ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {isPasswordInvalid && (
                          <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Mínimo 6 caracteres</span>
                          </p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Confirmar Contraseña
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Repetir contraseña"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onBlur={() => handleBlur('confirmPassword')}
                            className={`w-full rounded-2xl border bg-white pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 transition focus:outline-none ${
                              isConfirmPasswordInvalid
                                ? 'border-rose-400 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20'
                                : 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {isConfirmPasswordInvalid && (
                          <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span>Las contraseñas no coinciden</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Ya tenés una cuenta en AgroMAS. Al presionar el botón te vincularás de inmediato a este establecimiento.
                    </p>
                  </div>
                )}

                {/* Action Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-5 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
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
