"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  UserProfile, FieldItem, getMeApi, setAccessToken, 
  getAccessToken, logoutApi, loginApi, registerApi, 
  googleAuthApi, LoginPayload, RegisterPayload, GoogleAuthPayload 
} from './api';

interface AuthContextType {
  user: UserProfile | null;
  fields: FieldItem[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  googleAuth: (payload: GoogleAuthPayload) => Promise<{ 
    success: boolean; 
    requiresProfile?: boolean; 
    googleEmail?: string; 
    firstName?: string; 
    lastName?: string; 
    error?: string 
  }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUserFields: (fields: FieldItem[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    async function initSession() {
      // 1. Check if we have a saved user or token in localStorage for instant UI feedback
      const savedUserStr = localStorage.getItem('agromas_user');
      if (savedUserStr) {
        try {
          const parsed = JSON.parse(savedUserStr);
          setUser(parsed);
        } catch {}
      }

      // 2. Fetch fresh user & fields profile from /api/v1/users/me (uses Bearer or refresh cookie)
      try {
        const meData = await getMeApi();
        if (meData && meData.user) {
          const formattedUser: UserProfile = {
            ...meData.user,
            name: `${meData.user.first_name || ''} ${meData.user.last_name || ''}`.trim() || meData.user.email
          };
          setUser(formattedUser);
          setFields(meData.fields || []);
          localStorage.setItem('agromas_user', JSON.stringify(formattedUser));
        }
      } catch (err) {
        console.warn('Session init check failed:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const refreshProfile = async () => {
    try {
      const meData = await getMeApi();
      if (meData && meData.user) {
        const formattedUser: UserProfile = {
          ...meData.user,
          name: `${meData.user.first_name || ''} ${meData.user.last_name || ''}`.trim() || meData.user.email
        };
        setUser(formattedUser);
        setFields(meData.fields || []);
        localStorage.setItem('agromas_user', JSON.stringify(formattedUser));
      }
    } catch (e) {
      console.error('Failed to refresh profile:', e);
    }
  };

  function formatError(detail: any, fallback: string): string {
    if (!detail) return fallback;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item?.msg) {
            const field = item.loc ? item.loc[item.loc.length - 1] : '';
            if (field === 'password') return 'La contraseña debe tener al menos 8 caracteres.';
            if (field === 'phone_whatsapp') return 'El número de WhatsApp debe tener al menos 8 caracteres con código de país.';
            if (field === 'email') return 'El correo electrónico ingresado no es válido.';
            return `${field ? field + ': ' : ''}${item.msg}`;
          }
          return JSON.stringify(item);
        })
        .join(' | ');
    }
    if (typeof detail === 'object') {
      return detail.message || detail.error || detail.msg || fallback;
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

    // Try fetching fields
    await refreshProfile();

    return { success: true };
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

    return { success: true };
  };

  const googleAuth = async (payload: GoogleAuthPayload) => {
    const res = await googleAuthApi(payload);
    if (!res.ok) {
      const errorMsg = formatError(res.data?.detail, 'Error al autenticar con Google.');
      return { success: false, error: errorMsg };
    }

    // Step 1: User requires Step 2 profile completion (phone + role)
    if (res.data.requires_profile) {
      return {
        success: true,
        requiresProfile: true,
        googleEmail: res.data.google_email,
        firstName: res.data.first_name,
        lastName: res.data.last_name
      };
    }

    // Step 2: Full session created
    if (res.data.access_token) {
      setAccessToken(res.data.access_token);
    }

    if (res.data.user) {
      const formattedUser: UserProfile = {
        ...res.data.user,
        name: `${res.data.user.first_name || ''} ${res.data.user.last_name || ''}`.trim() || res.data.user.email
      };
      setUser(formattedUser);
      localStorage.setItem('agromas_user', JSON.stringify(formattedUser));
      await refreshProfile();
    }

    return { success: true };
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
    setFields([]);
    localStorage.removeItem('agromas_user');
    localStorage.removeItem('agromas_access_token');
    sessionStorage.removeItem('agromas_access_token');
  };

  const setUserFields = (newFields: FieldItem[]) => {
    setFields(newFields);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        fields,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        googleAuth,
        logout,
        refreshProfile,
        setUserFields,
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
