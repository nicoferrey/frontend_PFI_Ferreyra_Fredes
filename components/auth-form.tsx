"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle2, 
  ArrowRight, ArrowLeft, ShieldCheck, AlertCircle, Loader2, 
  Sprout, UserCheck, MessageSquare
} from 'lucide-react';
import { formatPhoneWhatsapp } from '@/lib/phone-formatter';
import { useAuth } from '@/lib/auth-context';

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

  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
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

  // Switch between Login and Signup modes
  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setIsGooglePhonePrompt(false);
    setGoogleIdToken(null);
    setGoogleProfile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
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

      // If backend reports user is new and needs WhatsApp phone binding
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
        // User is fully authenticated
        setSuccessMessage('¡Inicio de sesión exitoso con Google! Redirigiendo al panel...');
        setTimeout(() => {
          const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
          if (res.hasFields || (auth.fields && auth.fields.length > 0) || hasLotsInStorage) {
            router.push('/');
          } else {
            router.push('/onboarding');
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

  // Google Login / Signup Click Handler
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

  // Google WhatsApp Phone Completion
  const handleGooglePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || phone.trim().length < 8) {
      setErrorMessage('Por favor ingresa un número de WhatsApp con código de país (ej. +54 9 11 2345 6789).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await auth.googleAuth({
        id_token: googleIdToken || undefined,
        phone_whatsapp: phone,
        role: 'admin' // Open registration defaults to field owner/admin
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Error al completar el registro con Google.');
        setLoading(false);
        return;
      }

      const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
      if (res.hasFields || auth.fields.length > 0 || hasLotsInStorage) {
        setSuccessMessage('¡Cuenta vinculada con éxito! Redirigiendo a tu panel...');
        setTimeout(() => router.push('/'), 800);
      } else {
        setSuccessMessage('¡Cuenta creada con éxito! Configurando tu establecimiento...');
        setTimeout(() => router.push('/onboarding'), 800);
      }
    } catch (err) {
      setErrorMessage('Error de comunicación con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Form Submission (Login or Single-Step Signup)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setErrorMessage('Por favor completa tu correo y contraseña.');
          setLoading(false);
          return;
        }

        const res = await auth.login({ email, password });
        if (!res.success) {
          setErrorMessage(res.error || 'Correo o contraseña incorrectos.');
          setLoading(false);
          return;
        }

        setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo al panel...');
        setTimeout(() => {
          const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
          if (res.hasFields || auth.fields.length > 0 || hasLotsInStorage) {
            router.push('/');
          } else {
            router.push('/onboarding');
          }
        }, 800);

      } else {
        // Unified 1-Step Signup
        if (!firstName.trim() || !lastName.trim()) {
          setErrorMessage('Por favor ingresa tu nombre y apellido.');
          setLoading(false);
          return;
        }
        if (!email.trim() || !email.includes('@')) {
          setErrorMessage('Por favor ingresa un correo electrónico válido.');
          setLoading(false);
          return;
        }
        if (!phone.trim() || phone.trim().length < 8) {
          setErrorMessage('Por favor ingresa tu número de WhatsApp con código de país (ej. +54 9 2477 123456).');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage('Las contraseñas no coinciden.');
          setLoading(false);
          return;
        }

        const res = await auth.register({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          role: 'admin', // Self-registered user defaults to farm admin/owner
          phone_whatsapp: phone
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Error al registrar la cuenta.');
          setLoading(false);
          return;
        }

        // Clear any stale local storage from previous session/user to ensure clean onboarding
        if (typeof window !== 'undefined') {
          localStorage.removeItem('agromas_lots');
          localStorage.removeItem('agromas_center');
        }

        setSuccessMessage('¡Cuenta creada con éxito! Configurando tu establecimiento...');
        setTimeout(() => router.push('/onboarding'), 800);
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      
      {/* Tab Selector (Login / Signup) */}
      {!isGooglePhonePrompt && (
        <div className="flex bg-slate-900/90 border border-white/10 rounded-2xl p-1.5 mb-6 backdrop-blur-md shadow-lg">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              mode === 'login'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('signup')}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 shadow-md shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Crear Cuenta
          </button>
        </div>
      )}

      {/* Header Info */}
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          {isGooglePhonePrompt
            ? 'Vincular WhatsApp de Alertas'
            : mode === 'login'
            ? 'Bienvenido a AgroMAS'
            : 'Crear Cuenta de Productor'}
        </h2>
        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
          {isGooglePhonePrompt
            ? 'Ingresa tu número para recibir las notificaciones y recomendaciones de riego automáticas por WhatsApp.'
            : mode === 'login'
            ? 'Ingresa tus credenciales para acceder al monitoreo satelital y balance hídrico.'
            : 'Regístrate para comenzar a gestionar tu campo con el modelo FAO-56 y agentes de IA.'}
        </p>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs animate-shake">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* GOOGLE PROMPT FOR PHONE (Only when Google login needs WhatsApp) */}
      {isGooglePhonePrompt && googleProfile && (
        <form onSubmit={handleGooglePhoneSubmit} className="space-y-4 animate-fade-in">
          <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 font-bold text-xs">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{googleProfile.name}</p>
              <p className="text-[11px] text-sky-400 truncate">{googleProfile.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block flex items-center justify-between">
              <span>Número de WhatsApp</span>
              <span className="text-[10px] text-emerald-400 font-normal">Requerido (con código de país)</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="tel"
                placeholder="+54 9 2477 1234-5678"
                value={phone}
                onChange={(e) => setPhone(formatPhoneWhatsapp(e.target.value))}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
            </div>
            <p className="text-[10px] text-slate-500">Ejemplo: +54 9 2477 458921</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>Finalizar y Entrar</span>
                <CheckCircle2 className="h-4 w-4 text-slate-950" />
              </>
            )}
          </button>
        </form>
      )}

      {/* GOOGLE 1-CLICK AUTH BUTTON */}
      {!isGooglePhonePrompt && (
        <>
          <button
            type="button"
            onClick={handleGoogleAuthClick}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-2xl py-3 px-4 text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
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

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-slate-950 px-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              o con correo electrónico
            </span>
          </div>
        </>
      )}

      {/* LOGIN FORM */}
      {!isGooglePhonePrompt && mode === 'login' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                placeholder="nombre@establecimiento.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => alert('Para restablecer tu contraseña, ingresa tu correo y contacta al administrador.')}
                className="text-[10px] text-sky-400 hover:text-sky-300 transition"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-white/10 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer h-3.5 w-3.5"
              />
              <span className="text-[11px] text-slate-400">Recordar sesión</span>
            </label>
            <span className="text-[10px] text-slate-500 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" /> Cifrado JWT
            </span>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="h-4 w-4 text-slate-950" />
              </>
            )}
          </button>
        </form>
      )}

      {/* UNIFIED 1-STEP SIGNUP FORM */}
      {!isGooglePhonePrompt && mode === 'signup' && (
        <form onSubmit={handleSubmit} className="space-y-3.5 animate-slide-in">
          
          {/* First & Last Name in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Nombre
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ej. Esteban"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Apellido
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Ej. Ferreyra"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
                />
              </div>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
              Correo Electrónico
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="email"
                placeholder="productor@campo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
            </div>
          </div>

          {/* WhatsApp Phone */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block flex items-center justify-between">
              <span>Teléfono WhatsApp</span>
              <span className="text-[10px] text-emerald-400 font-normal">Para alertas de riego</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="tel"
                placeholder="+54 9 2477 1234-5678"
                value={phone}
                onChange={(e) => setPhone(formatPhoneWhatsapp(e.target.value))}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
            </div>
          </div>

          {/* Password & Confirm Password */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Confirmar
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 h-3.5 w-3.5 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 pt-0.5">
            Mínimo 8 caracteres. Podrás agregar asesores y operarios a tu campo desde la pestaña de Configuración.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
            ) : (
              <>
                <span>Crear Cuenta y Configurar Campo</span>
                <ArrowRight className="h-4 w-4 text-slate-950" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Footer Mode Switch Link */}
      {!isGooglePhonePrompt && (
        <p className="text-center text-slate-400 text-xs mt-6">
          {mode === 'login' ? '¿Aún no tienes una cuenta?' : '¿Ya tienes una cuenta registrada?'}
          <button
            type="button"
            onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
            className="ml-1.5 font-bold text-emerald-400 hover:text-emerald-300 underline transition"
          >
            {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      )}

    </div>
  );
}
