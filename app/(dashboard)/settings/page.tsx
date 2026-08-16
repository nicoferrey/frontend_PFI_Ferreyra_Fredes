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

  const [activeTab, setActiveTab] = useState<'profile' | 'farm'>('profile');

  // Profile Form States
  const [profileForm, setProfileForm] = useState({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    name: user?.name || '',
    phone: user?.phone_whatsapp || '',
    role: (user?.role || 'operator') as FieldRole
  });
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [profileSuccessMessage, setProfileSuccessMessage] = useState<string | null>(null);
  const [profileErrorMessage, setProfileErrorMessage] = useState<string | null>(null);

  // Password Form States
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<string | null>(null);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<string | null>(null);

  // Determine if Google Account
  const isGoogleUser = useMemo(() => {
    if (!user) return false;
    const email = user.email || '';
    const name = user.name || '';
    return email.toLowerCase().endsWith('@gmail.com') || name.toLowerCase().includes('google');
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingProfile(true);
    setProfileSuccessMessage(null);
    setProfileErrorMessage(null);

    try {
      const res = await updateUserProfileApi({
        first_name: profileForm.firstName,
        last_name: profileForm.lastName,
        name: profileForm.name || `${profileForm.firstName} ${profileForm.lastName}`.trim(),
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
      
      {/* Tab Selectors Header */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'profile'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-4.5 w-4.5" />
          Mi Cuenta
        </button>
        <button
          onClick={() => setActiveTab('farm')}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 -mb-[2px] ${
            activeTab === 'farm'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="h-4.5 w-4.5" />
          Configuración del Campo
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Left / Span 2: Account Details & Password Updates */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Profile Info Form Card */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
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

              <form onSubmit={handleProfileSave} className="space-y-4">
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

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500">Nombre Completo para Reportes</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    placeholder={`${profileForm.firstName} ${profileForm.lastName}`}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                  />
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

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingProfile}
                    className="rounded-xl bg-slate-950 hover:bg-slate-850 text-white font-bold px-4 py-2.5 text-xs shadow-md transition disabled:opacity-50"
                  >
                    {isSubmittingProfile ? 'Guardando...' : 'Guardar Perfil'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password Form Card */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
                <KeyRound className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-955">Seguridad de la Cuenta</h3>
              </div>

              {isGoogleUser ? (
                <div className="rounded-2xl border border-sky-100 bg-sky-50/50 p-4">
                  <div className="flex gap-2">
                    <span className="text-lg">🔓</span>
                    <div>
                      <h4 className="text-xs font-bold text-sky-955">Cuenta Vinculada con Google</h4>
                      <p className="text-[11px] text-sky-800 mt-0.5 leading-relaxed">
                        Has iniciado sesión con tu cuenta de Google. Tu contraseña y seguridad se gestionan a través de Google Accounts, por lo que no es necesario crear o editar claves locales.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordSave} className="space-y-4">
                  {passwordSuccessMessage && (
                    <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-xs text-emerald-800">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                      <span>{passwordSuccessMessage}</span>
                    </div>
                  )}

                  {passwordErrorMessage && (
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs text-rose-800">
                      <AlertTriangle className="h-4.5 w-4.5 text-rose-500" />
                      <span>{passwordErrorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500">Contraseña Actual</label>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Nueva Contraseña</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500">Confirmar Nueva Contraseña</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-850 outline-hidden transition focus:border-sky-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmittingPassword}
                      className="rounded-xl bg-slate-950 hover:bg-slate-850 text-white font-bold px-4 py-2.5 text-xs shadow-md transition disabled:opacity-50"
                    >
                      {isSubmittingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>

          {/* Right / Span 1: Quick details and logout action */}
          <div className="space-y-6">
            
            {/* Account Status Card */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
              <div className="text-center pb-2">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f43f5e] text-white font-black text-lg shadow-md ring-4 ring-rose-200/55 mb-3 select-none">
                  {profileForm.firstName.slice(0, 1) + profileForm.lastName.slice(0, 1)}
                </div>
                <h4 className="font-extrabold text-slate-955">
                  {profileForm.firstName} {profileForm.lastName}
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
                  <strong className="font-semibold text-slate-850">{isGoogleUser ? 'Google OAuth' : 'Local / Credenciales'}</strong>
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
