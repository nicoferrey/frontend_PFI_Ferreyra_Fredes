"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FarmSettingsView } from '@/components/farm-settings-view';
import { 
  User, 
  Settings, 
  Lock, 
  LogOut, 
  Mail, 
  Phone, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Building,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { updateUserProfileApi, changePasswordApi, FieldRole } from '@/lib/api';

export default function DashboardSettingsPage() {
  const auth = useAuth();
  const router = useRouter();
  const { user, logout, setUserRole } = auth;

  const [activeTab, setActiveTab] = useState<'farm' | 'profile'>('farm');

  // Helper to extract first and last name from user
  const getUserNameParts = (u: typeof user) => {
    if (!u) return { firstName: '', lastName: '' };
    if (u.first_name || u.last_name) {
      return {
        firstName: u.first_name || '',
        lastName: u.last_name || '',
      };
    }
    const nameStr = (u.name || '').trim();
    if (!nameStr) return { firstName: 'Productor', lastName: 'Demo' };
    const parts = nameStr.split(' ');
    return {
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
    };
  };

  // Profile Form States
  const [profileForm, setProfileForm] = useState(() => {
    const { firstName, lastName } = getUserNameParts(user);
    return {
      firstName,
      lastName,
      phone: user?.phone_whatsapp || '',
      role: (user?.role || 'operator') as FieldRole
    };
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  // Sync profile form when auth user loads/changes
  React.useEffect(() => {
    if (user) {
      const { firstName, lastName } = getUserNameParts(user);
      setProfileForm((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        phone: prev.phone || user.phone_whatsapp || '',
        role: (user.role || prev.role || 'operator') as FieldRole
      }));
    }
  }, [user]);

  // Password Form States
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  // Determine if explicitly Google OAuth Account (NOT based on @gmail.com email domain)
  const isGoogleUser = useMemo(() => {
    if (!user) return false;
    const uAny = user as any;
    return Boolean(uAny.provider === 'google' || uAny.auth_provider === 'google' || uAny.is_google === true);
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    setProfileSuccessMessage(null);
    setProfileErrorMessage(null);

    try {
      const fullName = `${profileForm.firstName} ${profileForm.lastName}`.trim();
      const res = await updateUserProfileApi({
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        name: fullName,
        phone: profileForm.phone,
        role: profileForm.role
      });

      if (res.ok) {
        setProfileSuccessMessage(res.message);
        if (profileForm.role !== user?.role) {
          setUserRole(profileForm.role as any);
        }
      } else {
        setProfileErrorMessage(res.message);
      }
    } catch {
      setProfileErrorMessage('Error de conexión al actualizar perfil.');
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingPassword(true);
    setPasswordSuccessMessage(null);
    setPasswordErrorMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordErrorMessage('Las contraseñas nuevas no coinciden.');
      setIsSubmittingPassword(false);
      return;
    }

    try {
      const res = await changePasswordApi({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      });

      if (res.ok) {
        setPasswordSuccessMessage(res.message);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordErrorMessage(res.message);
      }
    } catch {
      setPasswordErrorMessage('Error de conexión al cambiar contraseña.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleLogoutClick = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      
      {/* Settings Navigation Bar - Inspired by grey tab strip UI with rounded corners */}
      <div className="rounded-[24px] border border-slate-200/90 bg-[#ebf0f5] p-1.5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Tab 1: Configuración del Campo (FIRST) */}
          <button
            type="button"
            onClick={() => setActiveTab('farm')}
            className={`relative flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all duration-150 rounded-xl ${
              activeTab === 'farm'
                ? 'bg-white text-slate-950 shadow-md border-b-2 border-crop-600'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
            }`}
          >
            <Building className={`h-4 w-4 ${activeTab === 'farm' ? 'text-crop-600' : 'text-slate-500'}`} />
            <span>Configuración del Campo</span>
          </button>

          {/* Tab 2: Mi Cuenta (SECOND) */}
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`relative flex items-center gap-2.5 px-6 py-3 text-xs font-bold transition-all duration-150 rounded-xl ${
              activeTab === 'profile'
                ? 'bg-white text-slate-950 shadow-md border-b-2 border-water-600'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
            }`}
          >
            <User className={`h-4 w-4 ${activeTab === 'profile' ? 'text-water-600' : 'text-slate-500'}`} />
            <span>Mi Cuenta</span>
          </button>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          
          {/* Left Column (Span 2): Datos Personales Form Card */}
          <div className="md:col-span-2 flex flex-col h-full">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
                  <UserCheck className="h-5 w-5 text-sky-500" />
                  <h3 className="text-base font-bold text-slate-950">Datos Personales</h3>
                </div>

                {profileSuccessMessage && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800 mb-5">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                    <span>{profileSuccessMessage}</span>
                  </div>
                )}

                {profileErrorMessage && (
                  <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-800 mb-5">
                    <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                    <span>{profileErrorMessage}</span>
                  </div>
                )}

                <form id="profile-form" onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Nombre</label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Apellido</label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs text-slate-400 cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Teléfono (WhatsApp)
                      </label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        placeholder="+54 9 ..."
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Rol Operativo</label>
                    <select
                      value={profileForm.role}
                      onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value as FieldRole })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                    >
                      <option value="admin">Dueño / Administrador</option>
                      <option value="agronomist">Asesor Agrónomo</option>
                      <option value="operator">Operario / Regador</option>
                    </select>
                  </div>
                </form>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-6">
                <button
                  type="submit"
                  form="profile-form"
                  disabled={isSubmittingProfile}
                  className="rounded-xl bg-slate-950 hover:bg-slate-850 text-white font-bold px-5 py-2.5 text-xs shadow-md transition disabled:opacity-50"
                >
                  {isSubmittingProfile ? 'Guardando...' : 'Guardar Perfil'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (Span 1): Account Status & Logout */}
          <div className="flex flex-col h-full justify-between space-y-6">
            
            {/* Account Status Card */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft flex-1 flex flex-col justify-between">
              <div className="text-center pb-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f43f5e] text-white font-black text-lg shadow-md ring-4 ring-rose-200/55 mb-3 select-none">
                  {(
                    (profileForm.firstName.slice(0, 1) + profileForm.lastName.slice(0, 1)).trim() ||
                    user?.email?.slice(0, 2) ||
                    'US'
                  ).toUpperCase()}
                </div>
                <h4 className="font-extrabold text-slate-955">
                  {profileForm.firstName || profileForm.lastName
                    ? `${profileForm.firstName} ${profileForm.lastName}`.trim()
                    : user?.email || 'Usuario'}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
                <div className="mt-2.5">
                  <span className="inline-block rounded-md bg-sky-500/10 text-sky-650 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {profileForm.role === 'admin' ? 'Administrador' : profileForm.role === 'agronomist' ? 'Asesor' : 'Operador'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 text-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Campos asignados:</span>
                  <strong className="font-semibold text-slate-800">{auth.fields.length} campos</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Proveedor de Auth:</span>
                  <strong className="font-semibold text-slate-850">{isGoogleUser ? 'Google OAuth' : 'Email / Contraseña'}</strong>
                </div>
              </div>
            </div>

            {/* Logout Card */}
            <div className="rounded-[28px] border border-rose-200/60 bg-rose-50/20 p-6 shadow-soft">
              <h4 className="text-xs font-bold text-rose-950">Cerrar Sesión</h4>
              <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">
                Sal de la cuenta en este dispositivo. Deberás volver a ingresar credenciales para ingresar.
              </p>
              
              <button
                onClick={handleLogoutClick}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef4444] hover:bg-rose-700 text-white font-bold py-2.5 text-xs shadow-md transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {activeTab === 'farm' && (
        <div className="space-y-6">
          <FarmSettingsView fields={auth.fields} />
        </div>
      )}

    </div>
  );
}
