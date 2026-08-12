"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle2, 
  ArrowRight, ArrowLeft, ShieldCheck, AlertCircle, Loader2, 
  Sprout, Briefcase, ChevronRight, UserCheck
} from 'lucide-react';
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
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [googleIdToken, setGoogleIdToken] = useState<string | null>(null);
  const [googleProfile, setGoogleProfile] = useState<{ name: string; email: string } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields - Step 1
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Form Fields - Step 2
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'agronomist' | 'operator'>('admin');

  // Switch between Login and Signup modes
  const handleModeSwitch = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setSignupStep(1);
    setIsGoogleSignup(false);
    setGoogleIdToken(null);
    setGoogleProfile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Process Google OAuth credential response (from Google Identity Services)
  const processGoogleCredential = async (idToken: string) => {
    setGoogleLoading(true);
    setErrorMessage(null);

    try {
      const res = await auth.googleAuth({ id_token: idToken });
      
      if (!res.success) {
        setErrorMessage(res.error || 'Error al autenticar con Google.');
        return;
      }

      // If backend reports user is new and needs Step 2 (phone + role)
      if (res.requiresProfile) {
        setGoogleIdToken(idToken);
        setGoogleProfile({
          name: `${res.firstName || ''} ${res.lastName || ''}`.trim() || res.googleEmail || 'Usuario Google',
          email: res.googleEmail || ''
        });
        setFirstName(res.firstName || '');
        setLastName(res.lastName || '');
        setEmail(res.googleEmail || '');
        setIsGoogleSignup(true);
        setMode('signup');
        setSignupStep(2);
        setSuccessMessage('¡Cuenta de Google verificada! Por favor completa tu teléfono de WhatsApp y tu rol.');
      } else {
        // User is fully authenticated
        setSuccessMessage('¡Inicio de sesión exitoso con Google! Redirigiendo...');
        setTimeout(() => {
          if (auth.fields && auth.fields.length > 0) {
            router.push('/');
          } else {
            router.push('/onboarding');
          }
        }, 1000);
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
      setErrorMessage('Google Client ID no está configurado en las variables de entorno (NEXT_PUBLIC_GOOGLE_CLIENT_ID).');
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

        // Prompt Google Account Chooser
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setGoogleLoading(false);
          }
        });
      } catch (e: any) {
        console.warn('Google GIS prompt failed:', e);
        setGoogleLoading(false);
        setErrorMessage('No se pudo abrir el selector de Google. Asegúrate de permitir ventanas emergentes.');
      }
    } else {
      setErrorMessage('El SDK de Google aún no está listo. Por favor espera unos segundos o recarga la página.');
    }
  };

  // Step 1 Validation & Proceed to Step 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage('Por favor, ingresa tu nombre y apellido en campos separados.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres (requisito de seguridad del servidor).');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setSignupStep(2);
  };

  // Form Submission (Login or Signup Step 2)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    setLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setErrorMessage('Por favor, completa tu correo y contraseña.');
          setLoading(false);
          return;
        }

        const res = await auth.login({ email, password });
        if (!res.success) {
          setErrorMessage(res.error || 'Credenciales incorrectas.');
          setLoading(false);
          return;
        }

        setSuccessMessage('¡Inicio de sesión exitoso! Redirigiendo...');
        setTimeout(() => {
          const savedLots = localStorage.getItem('agromas_lots');
          if (auth.fields.length > 0 || (savedLots && JSON.parse(savedLots).length > 0)) {
            router.push('/');
          } else {
            router.push('/onboarding');
          }
        }, 1000);

      } else {
        // Signup Mode (Step 2 Submission)
        if (!phone.trim() || phone.trim().length < 8) {
          setErrorMessage('Por favor, ingresa un número de WhatsApp válido con código de país (mínimo 8 dígitos).');
          setLoading(false);
          return;
        }

        if (isGoogleSignup && googleIdToken) {
          // Google Step 2 Completion
          const res = await auth.googleAuth({
            id_token: googleIdToken,
            phone_whatsapp: phone,
            role: role
          });

          if (!res.success) {
            setErrorMessage(res.error || 'Error al completar el registro con Google.');
            setLoading(false);
            return;
          }
        } else {
          // Email/Password Step 2 Completion
          const res = await auth.register({
            email,
            password,
            first_name: firstName,
            last_name: lastName,
            role,
            phone_whatsapp: phone
          });

          if (!res.success) {
            setErrorMessage(res.error || 'Error al registrar la cuenta.');
            setLoading(false);
            return;
          }
        }

        setSuccessMessage('¡Cuenta creada con éxito! Configurando tu establecimiento...');
        setTimeout(() => {
          router.push('/onboarding');
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage('Error de conexión con el servidor. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      
      {/* Tab Selector */}
      {!isGoogleSignup && (
        <div className="flex bg-slate-900/90 border border-white/10 rounded-2xl p-1 mb-6 backdrop-blur-md">
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

      {/* Stepper Indicator for Signup */}
      {mode === 'signup' && (
        <div className="mb-6 bg-slate-900/40 border border-white/5 p-3 rounded-2xl">
          <div className="flex items-center justify-between text-[11px] font-semibold mb-2">
            <span className={signupStep === 1 ? 'text-emerald-400' : 'text-slate-400'}>
              Paso 1: Datos y Acceso
            </span>
            <span className={signupStep === 2 ? 'text-emerald-400' : 'text-slate-500'}>
              Paso 2: WhatsApp y Rol
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className={`h-1.5 rounded-full transition-all duration-300 ${signupStep >= 1 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-800'}`} />
            <div className={`h-1.5 rounded-full transition-all duration-300 ${signupStep === 2 ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-800'}`} />
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          {mode === 'login' 
            ? 'Bienvenido a AgroMAS' 
            : signupStep === 1 
              ? 'Crear Cuenta: Paso 1 de 2' 
              : 'Perfil Agronómico: Paso 2 de 2'}
        </h2>
        <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
          {mode === 'login'
            ? 'Ingresa tus credenciales para acceder al monitoreo satelital y balance hídrico.'
            : signupStep === 1
              ? 'Ingresa tu nombre, correo y contraseña para crear tu cuenta de productor.'
              : 'Configura tu teléfono para recibir alertas de riego por WhatsApp y define tu rol.'}
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

      {/* GOOGLE BUTTON (On Login or Signup Step 1) */}
      {(mode === 'login' || (mode === 'signup' && signupStep === 1)) && (
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

      {/* Google User Connected Badge (Step 2 of Google Signup) */}
      {isGoogleSignup && signupStep === 2 && googleProfile && (
        <div className="mb-5 p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/20 text-sky-300 font-bold text-xs">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{googleProfile.name}</p>
            <p className="text-[11px] text-sky-400 truncate">{googleProfile.email}</p>
          </div>
        </div>
      )}

      {/* LOGIN FORM */}
      {mode === 'login' && (
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

      {/* SIGNUP STEP 1: DATOS PERSONALES Y ACCESO */}
      {mode === 'signup' && signupStep === 1 && (
        <form onSubmit={handleProceedToStep2} className="space-y-4 animate-slide-in">
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
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
                  className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
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
                  className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
                />
              </div>
            </div>
          </div>

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
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
              Contraseña (mínimo 8 caracteres)
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
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

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
              Confirmar Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-200"
          >
            <span>Continuar al Paso 2</span>
            <ChevronRight className="h-4 w-4 text-slate-950" />
          </button>
        </form>
      )}

      {/* SIGNUP STEP 2: WHATSAPP Y ROL AGRONÓMICO */}
      {mode === 'signup' && signupStep === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-in">
          
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 leading-relaxed">
            <p className="font-bold flex items-center gap-1.5 mb-1">
              <Phone className="h-3.5 w-3.5" /> Vinculación con WhatsApp RAG
            </p>
            <p className="text-[11px] text-emerald-200/80">
              El Sistema Multi-Agente (MAS) usará este número para enviarte las alertas automáticas de déficit hídrico y responder consultas agronómicas en el campo.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block flex items-center justify-between">
              <span>Número de WhatsApp</span>
              <span className="text-[9px] text-emerald-400 font-normal">Requerido (con código de país)</span>
            </label>
            <div className="relative flex items-center">
              <Phone className="absolute left-3.5 h-4 w-4 text-slate-500" />
              <input
                type="tel"
                placeholder="+54 9 2477 458921"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/10 focus:border-emerald-400 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400/20 transition"
              />
            </div>
            <p className="text-[10px] text-slate-500">Ejemplo: +54 9 11 2345 6789</p>
          </div>

          <div className="space-y-2 pt-1">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
              Tu Rol en el Establecimiento
            </label>
            <div className="space-y-2">
              {[
                { 
                  id: 'admin', 
                  title: 'Productor / Administrador General', 
                  desc: 'Control integral de lotes, costos y decisiones de riego',
                  icon: Sprout 
                },
                { 
                  id: 'agronomist', 
                  title: 'Asesor Agronómico / Consultor', 
                  desc: 'Auditoría de curvas FAO-56, NDVI y prescripciones',
                  icon: Briefcase 
                },
                { 
                  id: 'operator', 
                  title: 'Operario de Campo / Regador', 
                  desc: 'Recepción de alertas operativas de encendido de bombas',
                  icon: User 
                }
              ].map((item) => {
                const isSelected = role === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRole(item.id as any)}
                    className={`w-full text-left p-3 rounded-2xl border transition duration-200 flex items-start gap-3 ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-400 text-white shadow-md shadow-emerald-500/5'
                        : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-slate-800/30'
                    }`}
                  >
                    <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-white/5 text-slate-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{item.title}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {!isGoogleSignup && (
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                className="flex items-center justify-center gap-1.5 border border-white/15 bg-white/5 hover:bg-white/10 text-white rounded-2xl px-4 py-3 text-xs font-semibold transition"
              >
                <ArrowLeft className="h-4 w-4" /> Volver
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-slate-950 rounded-2xl py-3 px-4 text-xs font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <span>{isGoogleSignup ? 'Completar Registro con Google' : 'Finalizar Registro y Comenzar'}</span>
                  <CheckCircle2 className="h-4 w-4 text-slate-950" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Footer Mode Switch Link */}
      {!isGoogleSignup && (
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
