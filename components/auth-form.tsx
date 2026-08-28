"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, Lock, Eye, EyeOff, User, Phone, CheckCircle2, 
  ArrowRight, ArrowLeft, AlertCircle, Loader2, 
  UserCheck, AlertTriangle, KeyRound, RefreshCw
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

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password' | 'success'>('email');

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

  // Forgot Password Fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

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

  // Forgot password validations
  const forgotEmailError = touched.forgotEmail
    ? forgotEmail.trim().length === 0
      ? 'Ingresa tu correo registrado.'
      : !forgotEmail.includes('@') || !forgotEmail.includes('.')
      ? 'Formato de correo inválido.'
      : null
    : null;

  const newPasswordError = touched.newPassword
    ? newPassword.length === 0
      ? 'Ingresa una nueva contraseña.'
      : newPassword.length < 8
      ? 'Mínimo 8 caracteres.'
      : null
    : null;

  const confirmNewPasswordError = touched.confirmNewPassword
    ? confirmNewPassword.length === 0
      ? 'Confirma la contraseña.'
      : confirmNewPassword !== newPassword
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
      confirmPassword === password && !confirmPasswordError;

  // Switch between Login, Signup, and Forgot modes
  const handleModeSwitch = (newMode: 'login' | 'signup' | 'forgot') => {
    setMode(newMode);
    setForgotStep('email');
    setIsGooglePhonePrompt(false);
    setGoogleIdToken(null);
    setGoogleProfile(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTouched({});
    setOtp(['', '', '', '', '', '']);
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // OTP Timer countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of 6 digits
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length > 0) {
        const newOtp = [...otp];
        digits.forEach((d, i) => {
          if (i < 6) newOtp[i] = d;
        });
        setOtp(newOtp);
        const nextFocus = Math.min(digits.length, 5);
        otpInputsRef.current[nextFocus]?.focus();
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Process Forgot Password Step 1: Send Mail Code
  const handleSendForgotCode = (e: React.FormEvent) => {
    e.preventDefault();
    markTouched('forgotEmail');
    if (!forgotEmail || forgotEmailError) return;

    setLoading(true);
    setErrorMessage(null);

    // Simulate sending 6-digit OTP code to email
    setTimeout(() => {
      setLoading(false);
      setForgotStep('otp');
      setResendCountdown(60);
      setSuccessMessage(`Hemos enviado un código de 6 dígitos a ${forgotEmail}.`);
    }, 800);
  };

  // Process Forgot Password Step 2: Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMessage('Por favor completa los 6 dígitos del código de verificación.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setLoading(false);
      setForgotStep('new_password');
      setSuccessMessage('¡Código verificado! Ahora ingresa tu nueva contraseña.');
    }, 800);
  };

  // Process Forgot Password Step 3: Change Password
  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markTouched('newPassword');
    markTouched('confirmNewPassword');

    if (newPassword.length < 8 || newPassword !== confirmNewPassword) return;

    setLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      setLoading(false);
      setForgotStep('success');
      setSuccessMessage('¡Tu contraseña se ha actualizado correctamente!');
    }, 800);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (!isFormValid) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
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
    <div className="w-full max-w-xl mx-auto flex flex-col justify-between h-[580px]">
      
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
              ? forgotStep === 'email'
                ? 'Recuperar Contraseña'
                : forgotStep === 'otp'
                ? 'Ingresa el Código'
                : forgotStep === 'new_password'
                ? 'Nueva Contraseña'
                : '¡Contraseña Actualizada!'
              : mode === 'login'
              ? 'Bienvenido a AgroMAS'
              : 'Crear Cuenta de Productor'}
          </h2>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed font-normal">
            {isGooglePhonePrompt
              ? 'Ingresa tu número para recibir notificaciones automáticas por WhatsApp.'
              : mode === 'forgot'
              ? forgotStep === 'email'
                ? 'Ingresa tu correo para recibir un código de verificación de 6 dígitos.'
                : forgotStep === 'otp'
                ? `Enviamos un código de 6 dígitos a ${forgotEmail}.`
                : forgotStep === 'new_password'
                ? 'Crea una contraseña segura de al menos 8 caracteres.'
                : 'Ya puedes acceder con tu nueva clave.'
              : mode === 'login'
              ? 'Ingresa tus credenciales para acceder al monitoreo satelital y balance hídrico.'
              : 'Regístrate para comenzar a gestionar tu campo con el modelo FAO-56 y agentes de IA.'}
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

        {/* FORGOT PASSWORD MULTI-STEP FLOW */}
        {!isGooglePhonePrompt && mode === 'forgot' && (
          <div className="space-y-4">
            {/* Step 1: Input Email */}
            {forgotStep === 'email' && (
              <form onSubmit={handleSendForgotCode} noValidate className="space-y-4 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Correo Electrónico Registrado
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="nombre@establecimiento.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        markTouched('forgotEmail');
                      }}
                      onBlur={() => markTouched('forgotEmail')}
                      required
                      className={getInputClass(!!forgotEmailError, !!touched.forgotEmail, !forgotEmailError)}
                    />
                  </div>
                  {forgotEmailError && (
                    <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {forgotEmailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Enviar Código de Verificación</span>
                      <ArrowRight className="h-4 w-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Input 6-Digit OTP */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} noValidate className="space-y-4 animate-fade-in">
                <div className="space-y-2 text-center">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Código de 6 dígitos
                  </label>
                  
                  {/* 6 Individual Digit Inputs */}
                  <div className="flex justify-center gap-2 pt-1">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpInputsRef.current[i] = el; }}
                        type="text"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-11 h-12 text-center text-lg font-black text-slate-900 rounded-2xl border border-slate-200 bg-white shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    disabled={resendCountdown > 0}
                    onClick={() => {
                      setResendCountdown(60);
                      setSuccessMessage('Nuevo código enviado a tu casilla.');
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>{resendCountdown > 0 ? `Reenviar en ${resendCountdown}s` : 'Reenviar código'}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-slate-400 hover:text-slate-600 transition font-medium"
                  >
                    Cambiar correo
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length < 6}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Validar Código</span>
                      <KeyRound className="h-4 w-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Enter New Password */}
            {forgotStep === 'new_password' && (
              <form onSubmit={handleChangePasswordSubmit} noValidate className="space-y-3.5 animate-fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Nueva Contraseña
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        markTouched('newPassword');
                      }}
                      onBlur={() => markTouched('newPassword')}
                      required
                      minLength={8}
                      className={getInputClass(!!newPasswordError, !!touched.newPassword, !newPasswordError, true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {newPasswordError && (
                    <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {newPasswordError}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmNewPassword}
                      onChange={(e) => {
                        setConfirmNewPassword(e.target.value);
                        markTouched('confirmNewPassword');
                      }}
                      onBlur={() => markTouched('confirmNewPassword')}
                      required
                      className={getInputClass(!!confirmNewPasswordError, !!touched.confirmNewPassword, !confirmNewPasswordError, true)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmNewPasswordError && (
                    <p className="text-[10px] text-rose-500 font-semibold flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3 shrink-0" /> {confirmNewPasswordError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword.length < 8 || newPassword !== confirmNewPassword}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                  ) : (
                    <>
                      <span>Restablecer Contraseña</span>
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 4: Success View */}
            {forgotStep === 'success' && (
              <div className="space-y-5 text-center animate-fade-in py-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">¡Contraseña Actualizada!</h3>
                  <p className="text-xs text-slate-500 mt-1">Ya puedes iniciar sesión con tu nueva contraseña.</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 via-crop-500 to-water-600 hover:from-emerald-700 hover:to-water-700 text-white rounded-2xl h-11 px-4 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-[0.98] transition-all duration-200"
                >
                  <span>Iniciar Sesión Ahora</span>
                  <ArrowRight className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
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

            {/* Row 2: Email (Full Width Line) */}
            <div className="space-y-0.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  placeholder="productor@campo.com"
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
                  <AlertTriangle className="h-2.5 w-2.5 shrink-0" /> {emailError}
                </p>
              )}
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

            {/* Submit Button */}
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
        <p className="text-center text-slate-500 text-xs font-medium pt-2">
          {mode === 'login' ? '¿Aún no tienes una cuenta?' : '¿Ya tienes una cuenta registrada?'}
          <button
            type="button"
            onClick={() => handleModeSwitch(mode === 'login' ? 'signup' : 'login')}
            className="ml-1.5 font-bold text-emerald-700 hover:text-emerald-800 underline transition"
          >
            {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión'}
          </button>
        </p>
      )}

    </div>
  );
}
