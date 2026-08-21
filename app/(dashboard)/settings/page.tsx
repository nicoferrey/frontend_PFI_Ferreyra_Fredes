"use client";

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { FarmSettingsView } from '@/components/farm-settings-view';
import { PageHeader } from '@/components/page-header';
import { CustomSelect } from '@/components/custom-select';
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
  const searchParams = useSearchParams();
  const { user, logout, setUserRole } = auth;

  const tabQuery = searchParams.get('tab');
  const activeTab = tabQuery === 'profile' ? 'profile' : 'farm';

  const handleTabChange = (tab: 'farm' | 'profile') => {
    router.push(`/settings?tab=${tab}`, { scroll: false });
  };

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
      
      {/* Settings Navigation Bar - Tab selector at top */}
      <div className="rounded-[24px] border border-slate-200/90 bg-[#ebf0f5] p-1.5 shadow-sm overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Tab 1: Configuración del Campo (FIRST) */}
          <button
            type="button"
            onClick={() => handleTabChange('farm')}
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
            onClick={() => handleTabChange('profile')}
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

      {/* Page Header Box - Positioned below tab selector */}
      <PageHeader
        badge="Configuración"
        title={activeTab === 'farm' ? 'Configuración del' : 'Perfil de'}
        titleAccent={activeTab === 'farm' ? 'Campo' : 'Mi Cuenta'}
      />

      {activeTab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-3 items-stretch">
          
          {/* Left Column (Span 2): Datos Personales Form Card */}
          <div className="md:col-span-2 flex flex-col h-full">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft flex-1 flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-4 mb-5">
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

                <form id="profile-form" onSubmit={handleProfileSave} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-900 focus:border-crop-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-crop-500/20 transition duration-150"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-900 focus:border-crop-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-crop-500/20 transition duration-150"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Mail className="h-3.5 w-3.5 text-slate-400" /> Correo Electrónico
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full rounded-2xl border border-slate-200/80 bg-slate-100/80 px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> Teléfono (WhatsApp)
                      </label>
                      <input
                        type="text"
                        value={profileForm.phone}
                        placeholder="+54 9 ..."
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-900 focus:border-crop-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-crop-500/20 transition duration-150"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Rol Operativo
                    </label>
                    <CustomSelect
                      options={[
                        { value: 'admin', label: 'Dueño / Administrador', sublabel: 'Control total del campo y gestión de usuarios' },
                        { value: 'agronomist', label: 'Asesor Agrónomo', sublabel: 'Auditoría del balance hídrico y curvas NDVI' },
                        { value: 'operator', label: 'Operador de Riego', sublabel: 'Registro de riegos y alertas operativas' },
                      ]}
                      value={profileForm.role}
                      onChange={(val) => setProfileForm({ ...profileForm, role: val as FieldRole })}
                      icon={<UserCheck className="h-4 w-4 text-crop-600" />}
                    />
                  </div>
                </form>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-6 flex justify-end">
                <button
                  type="submit"
                  form="profile-form"
                  disabled={isSubmittingProfile}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 text-white font-bold px-6 py-3 text-xs md:text-sm shadow-md hover:shadow-lg transition duration-150 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isSubmittingProfile ? 'Guardando...' : 'Guardar Perfil'}</span>
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
                    {profileForm.role === 'admin' ? 'Dueño / Administrador' : profileForm.role === 'agronomist' ? 'Asesor Agrónomo' : 'Operador de Riego'}
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
