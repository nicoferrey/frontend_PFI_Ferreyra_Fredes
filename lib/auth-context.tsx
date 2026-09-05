"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  UserProfile, FieldItem, FarmSummary, getMeApi, setAccessToken, 
  getAccessToken, logoutApi, loginApi, registerApi, 
  googleAuthApi, acceptInvitationApi, LoginPayload, RegisterPayload, GoogleAuthPayload, getFarmApi 
} from './api';

interface AuthContextType {
  user: UserProfile | null;
  fields: FieldItem[];
  currentFarmId: string | null;
  farms: FarmSummary[];
  currentFarm: FarmSummary | null;
  currentFields: FieldItem[];
  currentRole: 'admin' | 'agronomist' | 'operator' | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOwner: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string; hasFields?: boolean; fieldCount?: number }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; hasFields?: boolean }>;
  googleAuth: (payload: GoogleAuthPayload) => Promise<{ 
    success: boolean; 
    requiresProfile?: boolean; 
    googleEmail?: string; 
    firstName?: string; 
    lastName?: string; 
    error?: string;
    hasFields?: boolean;
    fieldCount?: number;
  }>;
  acceptInvitation: (
    token: string,
    payload: {
      password?: string;
      first_name?: string;
      last_name?: string;
      phone_whatsapp?: string;
    }
  ) => Promise<{ success: boolean; error?: string; hasFields?: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<FieldItem[]>;
  setUserFields: (fields: FieldItem[]) => void;
  setUserRole: (role: 'admin' | 'agronomist' | 'operator') => void;
  setCurrentFarmId: (farmId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function groupFarms(fields: FieldItem[]): Map<string, FieldItem[]> {
  const map = new Map<string, FieldItem[]>();
  for (const field of fields) {
    if (!field.farm_id) continue;
    const list = map.get(field.farm_id) ?? [];
    list.push(field);
    map.set(field.farm_id, list);
  }
  return map;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-farm state
  const [currentFarmId, setCurrentFarmIdState] = useState<string | null>(null);
  const [farms, setFarms] = useState<FarmSummary[]>([]);

  const setCurrentFarmId = (farmId: string) => {
    setCurrentFarmIdState(farmId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agromas_current_farm_id', farmId);
    }
  };

  const processFarms = async (currentFields: FieldItem[]) => {
    const grouped = groupFarms(currentFields);
    const newFarms: FarmSummary[] = [];

    for (const [farmId, farmFields] of grouped.entries()) {
      let name = `Establecimiento ${farmId.slice(0, 4)}`;
      let agricultural_zone = null;
      let role: 'admin' | 'agronomist' | 'operator' = 'operator';

      // Try to find the highest role among fields
      if (farmFields.some(f => f.user_role_in_farm === 'admin')) role = 'admin';
      else if (farmFields.some(f => f.user_role_in_farm === 'agronomist')) role = 'agronomist';

      // Fetch farm details to get the actual name
      try {
        const farmData = await getFarmApi(farmId);
        if (farmData && farmData.name) {
          name = farmData.name;
          agricultural_zone = farmData.agricultural_zone || null;
        }
      } catch (err) {
        console.warn(`Could not fetch farm details for ${farmId}`, err);
      }

      newFarms.push({
        id: farmId,
        name,
        agricultural_zone,
        user_role_in_farm: role,
        field_ids: farmFields.map(f => f.id)
      });
    }

    setFarms(newFarms);

    // Determine currentFarmId
    if (newFarms.length > 0) {
      const savedFarmId = typeof window !== 'undefined' ? localStorage.getItem('agromas_current_farm_id') : null;
      if (savedFarmId && newFarms.some(f => f.id === savedFarmId)) {
        setCurrentFarmIdState(savedFarmId);
      } else {
        const firstFarmId = newFarms[0].id;
        setCurrentFarmIdState(firstFarmId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('agromas_current_farm_id', firstFarmId);
        }
      }
    } else {
      setCurrentFarmIdState(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('agromas_current_farm_id');
      }
    }
  };

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      const savedUserStr = localStorage.getItem('agromas_user');
      if (savedUserStr) {
        try {
          setUser(JSON.parse(savedUserStr));
        } catch {}
      }

      try {
        const meData = await getMeApi();
        if (meData && meData.user) {
          const formattedUser: UserProfile = {
            ...meData.user,
            name: `${meData.user.first_name || ''} ${meData.user.last_name || ''}`.trim() || meData.user.email
          };
          setUser(formattedUser);
          const currentFields = meData.fields || [];
          setFields(currentFields);
          localStorage.setItem('agromas_user', JSON.stringify(formattedUser));
          await processFarms(currentFields);
        } else if (!getAccessToken()) {
          setUser(null);
          setFields([]);
          setFarms([]);
          localStorage.removeItem('agromas_user');
        }
      } catch (err) {
        console.warn('Session init check failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const refreshProfile = async (): Promise<FieldItem[]> => {
    try {
      const meData = await getMeApi();
      if (meData && meData.user) {
        const formattedUser: UserProfile = {
          ...meData.user,
          name: `${meData.user.first_name || ''} ${meData.user.last_name || ''}`.trim() || meData.user.email
        };
        setUser(formattedUser);
        const currentFields = meData.fields || [];
        setFields(currentFields);
        localStorage.setItem('agromas_user', JSON.stringify(formattedUser));
        await processFarms(currentFields);
        return currentFields;
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
    return fields;
  };

  function formatError(detail: any, fallback: string): string {
    if (!detail) return fallback;
    if (typeof detail === 'string') {
      if (detail.toLowerCase().includes('whatsapp')) {
        return 'Este teléfono ya está asociado a otra cuenta.';
      }
      return detail;
    }
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item?.msg) {
            const field = item.loc ? item.loc[item.loc.length - 1] : '';
            if (field === 'password') return 'La contraseña debe tener al menos 8 caracteres.';
            if (field === 'phone_whatsapp') {
                if (item.msg.toLowerCase().includes('already registered')) {
                    return 'Este teléfono ya está asociado a otra cuenta.';
                }
                return 'El número de WhatsApp ingresado no es válido (verifica el código de área).';
            }
            if (field === 'email') return 'El correo electrónico ingresado no es válido.';
            return `${field ? field + ': ' : ''}${item.msg}`;
          }
          return JSON.stringify(item);
        })
        .join(' | ');
    }
    if (typeof detail === 'object') {
      const msg = detail.message || detail.error || detail.msg || detail.detail;
      if (typeof msg === 'string' && msg.toLowerCase().includes('whatsapp')) {
         return 'Este teléfono ya está asociado a otra cuenta.';
      }
      return msg || fallback;
    }
    return String(detail);
  }

  const login = async (payload: LoginPayload) => {
    const res = await loginApi(payload);
    if (!res.ok) {
      const errorMsg = formatError(
        res.data?.detail,
        res.status === 401 ? 'Correo o contraseña incorrectos.' : 'Error al iniciar sesión.'
      );
      return { success: false, error: errorMsg };
    }

    if (res.data.access_token) {
      setAccessToken(res.data.access_token);
    }

    const userData = res.data.user || {
      email: payload.email,
      first_name: 'Productor',
      last_name: 'Campo',
      role: 'admin'
    };

    const formattedUser: UserProfile = {
      ...userData,
      name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email
    };

    setUser(formattedUser);
    localStorage.setItem('agromas_user', JSON.stringify(formattedUser));

    const updatedFields = await refreshProfile();
    const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
    const hasFields = (updatedFields && updatedFields.length > 0) || hasLotsInStorage;

    return { 
      success: true, 
      hasFields,
      fieldCount: updatedFields ? updatedFields.length : 0 
    };
  };

  const register = async (payload: RegisterPayload) => {
    const res = await registerApi(payload);
    if (!res.ok) {
      const errorMsg = formatError(
        res.data?.detail,
        res.status === 409 ? 'Este correo ya se encuentra registrado.' : 'Error al registrar la cuenta.'
      );
      return { success: false, error: errorMsg };
    }

    if (res.data.access_token) {
      setAccessToken(res.data.access_token);
    }

    const userData = res.data.user || {
      email: payload.email,
      first_name: payload.first_name,
      last_name: payload.last_name,
      role: payload.role,
      phone_whatsapp: payload.phone_whatsapp
    };

    const formattedUser: UserProfile = {
      ...userData,
      name: `${userData.first_name} ${userData.last_name}`.trim()
    };

    setUser(formattedUser);
    localStorage.setItem('agromas_user', JSON.stringify(formattedUser));

    const updatedFields = await refreshProfile();
    const hasFields = updatedFields && updatedFields.length > 0;

    return { success: true, hasFields };
  };

  const googleAuth = async (payload: GoogleAuthPayload) => {
    const res = await googleAuthApi(payload);
    if (!res.ok) {
      const errorMsg = formatError(res.data?.detail, 'Error al autenticar con Google.');
      return { success: false, error: errorMsg };
    }

    if (res.data.requires_profile) {
      return {
        success: true,
        requiresProfile: true,
        googleEmail: res.data.google_email,
        firstName: res.data.first_name,
        lastName: res.data.last_name
      };
    }

    if (res.data.access_token) {
      setAccessToken(res.data.access_token);
    }

    let updatedFields: FieldItem[] = [];
    if (res.data.user) {
      const formattedUser: UserProfile = {
        ...res.data.user,
        name: `${res.data.user.first_name || ''} ${res.data.user.last_name || ''}`.trim() || res.data.user.email
      };
      setUser(formattedUser);
      localStorage.setItem('agromas_user', JSON.stringify(formattedUser));
      updatedFields = await refreshProfile();
    }

    const hasLotsInStorage = typeof window !== 'undefined' && !!localStorage.getItem('agromas_lots');
    const hasFields = (updatedFields && updatedFields.length > 0) || hasLotsInStorage;

    return { 
      success: true, 
      hasFields,
      fieldCount: updatedFields.length 
    };
  };

  const acceptInvitation = async (
    token: string,
    payload: {
      password?: string;
      first_name?: string;
      last_name?: string;
      phone_whatsapp?: string;
    }
  ) => {
    const res = await acceptInvitationApi(token, payload);
    if (!res.ok) {
      const errorMsg = formatError(res.data?.detail, 'Error al aceptar la invitación.');
      return { success: false, error: errorMsg };
    }

    if (res.access_token) {
      setAccessToken(res.access_token);
    }

    const updatedFields = await refreshProfile();
    const hasFields = (updatedFields && updatedFields.length > 0) || true;

    return { success: true, hasFields };
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setFields([]);
    setFarms([]);
    setCurrentFarmIdState(null);
    localStorage.removeItem('agromas_user');
    localStorage.removeItem('agromas_access_token');
    sessionStorage.removeItem('agromas_access_token');
    localStorage.removeItem('agromas_lots');
    localStorage.removeItem('agromas_center');
    localStorage.removeItem('agromas_current_farm_id');
  };

  const setUserFields = (newFields: FieldItem[]) => {
    setFields(newFields);
    processFarms(newFields);
  };

  const setUserRole = (newRole: 'admin' | 'agronomist' | 'operator') => {
    if (!user) return;
    const updated = { ...user, role: newRole };
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('agromas_user', JSON.stringify(updated));
    }
  };

  const currentFarm = farms.find(f => f.id === currentFarmId) || null;
  const currentFields = currentFarmId ? fields.filter(f => f.farm_id === currentFarmId) : fields;
  const currentRole = currentFarm ? currentFarm.user_role_in_farm : null;
  const isOwner = currentRole === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        fields,
        currentFarmId,
        farms,
        currentFarm,
        currentFields,
        currentRole,
        isLoading,
        isAuthenticated: !!user,
        isOwner,
        login,
        register,
        googleAuth,
        acceptInvitation,
        logout,
        refreshProfile,
        setUserFields,
        setUserRole,
        setCurrentFarmId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
