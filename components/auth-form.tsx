"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle2, 
  ArrowRight, ArrowLeft, AlertCircle, Loader2, 
  UserCheck, AlertTriangle
} from 'lucide-react';
import { formatPhoneWhatsapp } from '@/lib/phone-formatter';
import { useAuth } from '@/lib/auth-context';
import { checkEmailApi } from '@/lib/api';
import { LegalConsent } from '@/components/legal/legal-consent';
import Link from 'next/link';

interface AuthFormProps {
  initialMode?: 'login' | 'signup';
}

declare global {
  interface Window {
    google?: any;
  }
}

export default function AuthForm({ initialMode = 'login' }: AuthFormProps) {
  const router = useRouter();
  const auth = useAuth();

  const navigateAfterAuth = (fallback: '/dashboard' | '/onboarding') => {
    const invitation = sessionStorage.getItem('agromas_pending_invitation');
    // Only a closed-format invitation token can produce an internal return
    // path. Never accept arbitrary URLs or expose the token in login queries.
    if (invitation && /^[A-Za-z0-9_-]{16,256}$/.test(invitation)) {
      router.push(`/invitation/${encodeURIComponent(invitation)}`);
    } else {
      router.push(fallback);
    }
  };

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);

  const [isGooglePhonePrompt, setIsGooglePhonePrompt] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [googleProfile, setGoogleProfile] = useState<{ name: string; email: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  // Touched state for real-time validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Real-time error calculations
  const emailError = touched.email
    ? email.trim().length === 0
      ? 'El correo es requerido.'
      : !email.includes('@') || !email.includes('.')
      ? 'Formato de correo inválido.'
      : null
    : null;

  const passwordError = touched.password
    ? password.length === 0
      ? 'La contraseña es requerida.'
      : password.length < 8
      ? 'Mínimo 8 caracteres.'
      : null
    : null;

  const firstNameError = touched.firstName
    ? firstName.trim().length === 0
      ? 'El nombre es requerido.'
      : firstName.trim().length < 2
      ? 'Mínimo 2 caracteres.'
      : null
    : null;

  const lastNameError = touched.lastName
    ? lastName.trim().length === 0
      ? 'El apellido es requerido.'
      : lastName.trim().length < 2
      ? 'Mínimo 2 caracteres.'
      : null
    : null;

  const phoneError = touched.phone
    ? phone.trim().length === 0
      ? 'El WhatsApp es requerido.'
      : phone.replace(/\D/g, '').length < 8
      ? 'Mínimo 8 dígitos.'
      : null
    : null;

  const confirmPasswordError = touched.confirmPassword && mode === 'signup'
    ? confirmPassword.length === 0
      ? 'Confirma la contraseña.'
      : confirmPassword !== password
      ? 'Las contraseñas no coinciden.'
      : null
    : null;

  const isFormValid = mode === 'login'
    ? email.length > 0 && !emailError && password.length >= 8 && !passwordError
    : firstName.trim().length >= 2 && !firstNameError &&
      lastName.trim().length >= 2 && !lastNameError &&
      email.length > 0 && !emailError &&
      phone.replace(/\D/g, '').length >= 8 && !phoneError &&
      password.length >= 8 && !passwordError &&
      confirmPassword === password && !confirmPasswordError &&
      acceptedTerms;

  // Switch between Login, Signup, and Forgot modes
  const handleModeSwitch = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setIsGooglePhonePrompt(false);
    setGoogleIdToken(null);
    setGoogleProfile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTouched({});
    setAcceptedTerms(false);
    setMarketingOptIn(false);
  };

  // Process Google OAuth credential response
  const processGoogleCredential = async (idToken: string) => {
    setGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await auth.googleAuth({ id_token: idToken });
      
      if (!res.success) {
        setErrorMessage(res.error || 'Error al autenticar con Google.');
        return;
      }

      if (res.requiresProfile) {
        setGoogleIdToken(idToken);
        setGoogleProfile({
          name: `${res.firstName || ''} ${res.lastName || ''}`.trim() || res.googleEmail || 'Usuario Google',
          email: res.googleEmail || ''
        });
        setFirstName(res.firstName || '');
        setLastName(res.lastName || '');
        setEmail(res.googleEmail || '');
        setIsGooglePhonePrompt(true);
        setSuccessMessage('¡Cuenta de Google verificada! Completa tu número de WhatsApp para vincular las alertas.');
      } else {
        setSuccessMessage('¡Inicio de sesión exitoso con Google! Redirigiendo al panel...');
        setTimeout(() => {
          const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
          if (res.hasFields || (auth.fields && auth.fields.length > 0) || hasLotsInStorage) {
            navigateAfterAuth('/dashboard');
          } else {
            navigateAfterAuth('/onboarding');
          }
        }, 800);
      }
    } catch (err: any) {
      setErrorMessage('Error de comunicación con el servidor de autenticación.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Initialize Google Identity Services
  useEffect(() => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!googleClientId || googleClientId.includes('<client-id>')) return;

    const setupGoogleGis = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response?.credential) {
              processGoogleCredential(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setupGoogleGis();
    } else {
      const interval = setInterval(() => {
        if (typeof window !== 'undefined' && window.google?.accounts?.id) {
          clearInterval(interval);
          setupGoogleGis();
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [mode]);

  const handleGoogleAuthClick = async () => {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!googleClientId || googleClientId.includes('<client-id>')) {
      setErrorMessage('Google Client ID no está configurado en las variables de entorno.');
      return;
    }

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setGoogleLoading(true);
      setErrorMessage(null);

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: (response: any) => {
            if (response?.credential) {
              processGoogleCredential(response.credential);
            } else {
              setGoogleLoading(false);
            }
          },
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setGoogleLoading(false);
          }
        });
      } catch (e: any) {
        console.warn('Google GIS prompt failed:', e);
        setGoogleLoading(false);
        setErrorMessage('No se pudo abrir el selector de Google.');
      }
    } else {
      setErrorMessage('El SDK de Google aún no está listo. Por favor espera unos segundos.');
    }
  };

  const handleGooglePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMessage('Por favor ingresa un número de WhatsApp con código de país (ej. +54 9 11 2345 6789).');
      return;
    }
    if (!acceptedTerms) {
      markTouched('acceptedTerms');
      setErrorMessage('Para crear la cuenta tenés que aceptar los Términos y la Política de privacidad.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await auth.googleAuth({
        id_token: googleIdToken || undefined,
        phone_whatsapp: phone,
        role: 'admin'
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al completar el registro con Google.');
        setLoading(false);
        return;
      }

      const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
      if (res.hasFields || auth.fields.length > 0 || hasLotsInStorage) {
        setSuccessMessage('¡Cuenta vinculada con éxito! Redirigiendo a tu panel...');
        setTimeout(() => navigateAfterAuth('/dashboard'), 800);
      } else {
        setSuccessMessage('¡Cuenta creada con éxito! Configurando tu establecimiento...');
        setTimeout(() => navigateAfterAuth('/onboarding'), 800);
      }
    } catch (err) {
      setErrorMessage('Error de comunicación con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      acceptedTerms: true,
    });

    if (!isFormValid) {
      if (mode === 'signup' && !acceptedTerms) {
        setErrorMessage('Para crear la cuenta tenés que aceptar los Términos y la Política de privacidad.');
      }
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await auth.login({ email, password });
        if (!res.success) {
          const emailCheck = await checkEmailApi(email);
          if (emailCheck?.invitation_pending && !emailCheck.has_password) {
            const farmsText = emailCheck.pending_farms?.join(', ') || 'un establecimiento';
            setErrorMessage(`Tenés una invitación pendiente a ${farmsText}. Por favor revisá tu correo o utilizá el enlace enviado por el administrador del campo.`);
          } else {
            setErrorMessage(res.error || 'Correo o contraseña incorrectos.');
          }
          setLoading(false);
          return;
        }

        setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo al panel...');
        setTimeout(() => {
          const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
          if (res.hasFields || auth.fields.length > 0 || hasLotsInStorage) {
            navigateAfterAuth('/dashboard');
          } else {
            navigateAfterAuth('/onboarding');
          }
        }, 800);

      } else {
        const res = await auth.register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role: 'admin',
          phone_whatsapp: phone
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Error al registrar la cuenta.');
          setLoading(false);
          return;
        }

        if (typeof window !== 'undefined') {
          localStorage.removeItem('agromas_lots');
          localStorage.removeItem('agromas_center');
          localStorage.setItem('agromas_marketing_opt_in', marketingOptIn ? '1' : '0');
        }

        setSuccessMessage('¡Cuenta creada con éxito! Configurando tu establecimiento...');
        setTimeout(() => navigateAfterAuth('/onboarding'), 800);
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const getInputClass = (hasError: boolean | null, isFieldTouched: boolean, isFieldValid: boolean, isPasswordInput: boolean = false) => {
    const leftPad = "pl-10";
    const rightPad = isPasswordInput ? "pr-10" : "pr-3.5";
    const base = `flex h-11 w-full items-center rounded-2xl border ${leftPad} ${rightPad} shadow-sm transition-all duration-150 text-xs font-semibold focus:outline-none`;
    if (hasError) {
      return `${base} border-rose-400 bg-rose-50/20 text-rose-900 placeholder:text-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20`;
    }
    if (isFieldTouched && isFieldValid) {
      return `${base} border-slate-200 bg-white text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300`;
    }
    return `${base} border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 placeholder:font-normal hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`;
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-between min-h-[580px]">
      
      <div>
        {/* Tab Selector (Login / Signup) */}
        {!isGooglePhonePrompt && mode !== 'forgot' && (
          <div className="flex bg-slate-100 border border-slate-200/80 rounded-2xl p-1.5 mb-4 shadow-inner">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
                mode === 'signup'
                  ? 'bg-slate-950 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              Crear Cuenta
            </button>
          </div>
        )}

        {/* Back link for Forgot Password Mode */}
        {mode === 'forgot' && (
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-950 mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al inicio de sesión</span>
          </button>
        )}

        {/* Header Info */}
        <div className="mb-4">
          <h2 className="text-2xl font-black text-slate-950 tracking-tight">
            {isGooglePhonePrompt
              ? 'Vincular WhatsApp de Alertas'
              : mode === 'forgot'
              ? 'Recuperar Contraseña'
              : mode === 'login'
              ? 'Bienvenido a AgroMAS'
              : 'Crear Cuenta'}
          </h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed font-normal">
            {isGooglePhonePrompt
              ? 'Ingresa tu número para recibir notificaciones automáticas por WhatsApp.'
              : mode === 'forgot'
              ? 'La recuperación de contraseña todavía no está disponible.'
              : mode === 'login'
              ? 'Ingresa tus credenciales para acceder al monitoreo satelital y balance hídrico.'
              : 'Completá tus datos para crear tu cuenta y comenzar el onboarding.'}
          </p>
        </div>

        {/* Alert Messages */}
        {errorMessage && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs animate-fade-in">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* GOOGLE PROMPT FOR PHONE */}
        {isGooglePhonePrompt && googleProfile && (
          <form onSubmit={handleGooglePhoneSubmit} noValidate className="space-y-3.5 animate-fade-in">
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 font-bold text-xs">
                <UserCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{googleProfile.name}</p>
                <p className="text-[11px] text-sky-700 truncate">{googleProfile.email}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
                <span>Número de WhatsApp</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Requerido (código país)</span>
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="+54 9 2477 1234-5678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhoneWhatsapp(e.target.value));
                    markTouched('phone');
                  }}
                  onBlur={() => markTouched('phone')}
                  required
                  className={getInputClass(!!phoneError, !!touched.phone, !phoneError)}
                />
              </div>
              {phoneError && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {phoneError}
                </p>
              )}
            </div>

            <LegalConsent
              accepted={acceptedTerms}
              onAcceptedChange={setAcceptedTerms}
              marketing={marketingOptIn}
              onMarketingChange={setMarketingOptIn}
              showError={!!touched.acceptedTerms}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Finalizar y Entrar</span>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                </>
              )}
            </button>
          </form>
        )}

        {/* GOOGLE 1-CLICK AUTH BUTTON */}
        {!isGooglePhonePrompt && mode !== 'forgot' && (
          <>
            <button
              type="button"
              onClick={handleGoogleAuthClick}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50/80 text-slate-800 border border-slate-200/90 rounded-2xl h-11 px-4 text-xs font-bold shadow-xs hover:border-slate-300 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{mode === 'login' ? 'Continuar con Google' : 'Registrarse con Google'}</span>
            </button>

            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <span className="relative bg-white px-3 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                o con correo electrónico
              </span>
            </div>
          </>
        )}

        {/* Do not claim an email/password change without a real recovery API. */}
        {mode === 'forgot' && !isGooglePhonePrompt && (
          <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Funcionalidad no disponible</p>
            <p className="mt-2">Todavía no enviamos códigos de recuperación ni modificamos contraseñas desde esta pantalla. Si tu cuenta está vinculada a Google, podés ingresar con Google.</p>
            <button type="button" onClick={() => handleModeSwitch('login')} className="mt-4 font-bold underline">Volver al inicio de sesión</button>
          </div>
        )}

        {/* LOGIN FORM */}
        {!isGooglePhonePrompt && mode === 'login' && (
          <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="nombre@establecimiento.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    markTouched('email');
                  }}
                  onBlur={() => markTouched('email')}
                  required
                  className={getInputClass(!!emailError, !!touched.email, !emailError)}
                />
              </div>
              {emailError && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {emailError}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('forgot')}
                  className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    markTouched('password');
                  }}
                  onBlur={() => markTouched('password')}
                  required
                  className={getInputClass(!!passwordError, !!touched.password, !passwordError, true)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="h-3 w-3 shrink-0" /> {passwordError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer h-4 w-4 accent-emerald-600"
                />
                <span className="text-[11px] text-slate-700 font-semibold group-hover:text-slate-900 transition">
                  Recordar sesión
                </span>
              </label>
            </div>

            <p className="text-[10px] leading-relaxed text-slate-500">
              Al iniciar sesión aceptás los{' '}
              <Link href="/legal/terminos" className="font-bold text-crop-700 underline underline-offset-2">Términos</Link>
              {' '}y la{' '}
              <Link href="/legal/privacidad" className="font-bold text-crop-700 underline underline-offset-2">Privacidad</Link>
              . Usamos cookies necesarias para la sesión.{' '}
              <Link href="/legal/cookies" className="font-bold text-crop-700 underline underline-offset-2">Más info</Link>.
            </p>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </>
              )}
            </button>
          </form>
        )}

        {/* UNIFIED 1-STEP SIGNUP FORM */}
        {!isGooglePhonePrompt && mode === 'signup' && (
          <form onSubmit={handleSubmit} noValidate className="space-y-2.5 animate-slide-in">
            
            {/* Row 1: First & Last Name (2 cols) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Nombre
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ej. Esteban"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      markTouched('firstName');
                    }}
                    onBlur={() => markTouched('firstName')}
                    required
                    className={getInputClass(!!firstNameError, !!touched.firstName, !firstNameError)}
                  />
                </div>
                {firstNameError && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {firstNameError}
                  </p>
                )}
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Apellido
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ej. Ferreyra"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      markTouched('lastName');
                    }}
                    onBlur={() => markTouched('lastName')}
                    required
                    className={getInputClass(!!lastNameError, !!touched.lastName, !lastNameError)}
                  />
                </div>
                {lastNameError && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {lastNameError}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Account email owned by the person registering. */}
            <div className="space-y-0.5">
              <label htmlFor="signup-email" className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Correo electrónico</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input id="signup-email" type="email" autoComplete="email" placeholder="tu@correo.com"
                  value={email} onChange={(e) => { setEmail(e.target.value); markTouched('email'); }}
                  onBlur={() => markTouched('email')} required
                  className={getInputClass(!!emailError, !!touched.email, !emailError)} />
              </div>
              {emailError && <p className="text-[10px] text-rose-500 font-semibold">{emailError}</p>}
            </div>

            {/* Row 3: WhatsApp Phone (Full Width Line) */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
                <span>Teléfono WhatsApp</span>
                <span className="text-[9px] text-emerald-600 font-semibold">Para alertas de riego</span>
              </label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  placeholder="+54 9 2477 1234-5678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatPhoneWhatsapp(e.target.value));
                    markTouched('phone');
                  }}
                  onBlur={() => markTouched('phone')}
                  required
                  className={getInputClass(!!phoneError, !!touched.phone, !phoneError)}
                />
              </div>
              {phoneError && (
                <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {phoneError}
                </p>
              )}
            </div>

            {/* Row 4: Password & Confirm Password (2 cols) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Contraseña
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      markTouched('password');
                    }}
                    onBlur={() => markTouched('password')}
                    required
                    minLength={8}
                    className={getInputClass(!!passwordError, !!touched.password, !passwordError, true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {passwordError}
                  </p>
                )}
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                  Confirmar
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      markTouched('confirmPassword');
                    }}
                    onBlur={() => markTouched('confirmPassword')}
                    required
                    className={getInputClass(!!confirmPasswordError, !!touched.confirmPassword, !confirmPasswordError, true)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {confirmPasswordError && (
                  <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {confirmPasswordError}
                  </p>
                )}
              </div>
            </div>

            <LegalConsent
              accepted={acceptedTerms}
              onAcceptedChange={setAcceptedTerms}
              marketing={marketingOptIn}
              onMarketingChange={setMarketingOptIn}
              showError={!!touched.acceptedTerms}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <>
                  <span>Crear Cuenta</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer Mode Switch Link */}
      {!isGooglePhonePrompt && mode !== 'forgot' && (
        <div className="pt-3 space-y-2">
          <p className="text-center text-slate-500 text-xs font-medium">
            {mode === 'login' ? '¿Aún no tienes una cuenta?' : '¿Ya tienes una cuenta registrada?'}
            <button
              type="button"
              onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
              className="ml-1.5 font-bold text-emerald-700 hover:text-emerald-800 underline transition"
            >
              {mode === 'login' ? 'Crear cuenta' : 'Inicia sesión'}
            </button>
          </p>
          <p className="text-center text-[10px] font-medium text-slate-400">
            <Link href="/legal/terminos" className="hover:text-crop-700">Términos</Link>
            <span className="mx-1.5">·</span>
            <Link href="/legal/privacidad" className="hover:text-crop-700">Privacidad</Link>
            <span className="mx-1.5">·</span>
            <Link href="/legal/cookies" className="hover:text-crop-700">Cookies</Link>
          </p>
        </div>
      )}

    </div>
  );
}
