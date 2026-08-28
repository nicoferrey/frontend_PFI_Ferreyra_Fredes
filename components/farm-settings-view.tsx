"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Crown,
  Briefcase,
  Wrench,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Trash2,
  Edit2,
  X,
  Plus,
  MapPinned,
  Sparkles,
  Search,
  ExternalLink,
  MessageSquare,
  Lock,
  Layers3,
  Droplets,
  HelpCircle,
  Clock,
  Radio,
  Eye,
  RefreshCw,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Share2,
  Check,
} from 'lucide-react';
import {
  FieldItem,
  FieldTeamMember,
  FieldRole,
  getTeamMembersApi,
  addTeamMemberApi,
  updateTeamMemberRoleApi,
  removeTeamMemberApi,
  resendInvitationApi,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ModalPortal } from '@/components/modal-portal';
import { formatPhoneWhatsapp } from '@/lib/phone-formatter';

interface FarmSettingsViewProps {
  fields: FieldItem[];
  onOpenWizard?: () => void;
}

const roleDetails: Record<
  FieldRole,
  {
    title: string;
    shortTitle: string;
    description: string;
    badgeStyle: string;
    avatarGradient: string;
    ringColor: string;
    icon: any;
    color: string;
  }
> = {
  admin: {
    title: 'Dueño / Administrador',
    shortTitle: 'Administrador',
    description: 'Control total de la explotación, gestión de usuarios, costos de bombeo y configuración de lotes.',
    badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200 ring-1 ring-emerald-500/20',
    avatarGradient: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-emerald-500/25',
    ringColor: 'ring-emerald-100',
    icon: Crown,
    color: 'text-emerald-700',
  },
  agronomist: {
    title: 'Asesor Agrónomo',
    shortTitle: 'Asesor',
    description: 'Auditoría del balance hídrico FAO-56, curvas NDVI/Kc y ajuste de prescripciones técnicas.',
    badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200 ring-1 ring-sky-500/20',
    avatarGradient: 'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-sky-500/25',
    ringColor: 'ring-sky-100',
    icon: Briefcase,
    color: 'text-sky-700',
  },
  operator: {
    title: 'Operador de Riego',
    shortTitle: 'Operador',
    description: 'Registro de eventos de riego y recepción de alertas operativas por WhatsApp.',
    badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-500/20',
    avatarGradient: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/25',
    ringColor: 'ring-amber-100',
    icon: Wrench,
    color: 'text-amber-700',
  },
};

export function FarmSettingsView({ fields, onOpenWizard }: FarmSettingsViewProps) {
  const { user, isOwner, setUserRole } = useAuth();

  // Active Team Members State
  const [members, setMembers] = useState<FieldTeamMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | FieldRole>('all');
  const [isPermissionsExpanded, setIsPermissionsExpanded] = useState(false);

  // Add User Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<FieldRole>('agronomist');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [createdInvitationUrl, setCreatedInvitationUrl] = useState<string | null>(null);
  const [copiedMemberId, setCopiedMemberId] = useState<string | null>(null);
  const [modalCopiedSuccess, setModalCopiedSuccess] = useState(false);

  // Edit Role Modal State
  const [editingMember, setEditingMember] = useState<FieldTeamMember | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<FieldRole>('operator');

  // Farm General Settings
  const [farmName, setFarmName] = useState('Establecimiento AgroMAS Central');
  const [whatsappAlertsEnabled, setWhatsappAlertsEnabled] = useState(true);
  const [nightTariffOnly, setNightTariffOnly] = useState(true);
  const [deficitAlertThreshold, setDeficitAlertThreshold] = useState<number>(40);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Load team members on mount
  useEffect(() => {
    async function loadMembers() {
      setIsLoadingMembers(true);
      const data = await getTeamMembersApi(fields[0]?.id);
      setMembers(data);
      setIsLoadingMembers(false);
    }
    loadMembers();
  }, [fields]);

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const fullName = `${m.first_name || ''} ${m.last_name || ''} ${m.name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate totals & active role
  const totalHectares = fields.reduce((acc, f) => acc + (f.area_ha || 0), 0);
  const activeUserRole: FieldRole = fields[0]?.user_role_in_farm || user?.role || 'admin';
  const currentUserIsDueño = activeUserRole === 'admin';

  // Handle Add Member Submission (Generates Invitation Link)
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newEmail.trim() || !newEmail.includes('@') || !newEmail.includes('.')) {
      setFormError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setIsSubmittingUser(true);

    const result = await addTeamMemberApi({
      email: newEmail.trim(),
      role: newRole,
      field_id: fields[0]?.id,
    });

    if (result.ok && result.member) {
      setMembers((prev) => [result.member!, ...prev]);
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agromasapp.vercel.app';
      const invUrl = result.invitation_url || result.member.invitation_url || `${origin}/invitation/${result.member.id}`;
      setCreatedInvitationUrl(invUrl);
    } else {
      setFormError(result.error || 'No se pudo generar la invitación al usuario.');
    }

    setIsSubmittingUser(false);
  };

  // Helper Copy Link
  const handleCopyUrl = (url: string, memberId?: string) => {
    navigator.clipboard.writeText(url);
    if (memberId) {
      setCopiedMemberId(memberId);
      setTimeout(() => setCopiedMemberId(null), 2000);
    } else {
      setModalCopiedSuccess(true);
      setTimeout(() => setModalCopiedSuccess(false), 2000);
    }
  };

  // Helper Share WhatsApp
  const handleShareWhatsApp = (url: string) => {
    const text = `¡Hola! Te invito a unirte a nuestro establecimiento en AgroMAS. Podés ingresar y activar tu cuenta directamente desde este enlace:\n\n${url}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // Handle Role Change
  const handleSaveRoleEdit = async () => {
    if (!editingMember) return;
    const ok = await updateTeamMemberRoleApi(editingMember.id, editRoleValue);
    if (ok) {
      setMembers((prev) => prev.map((m) => (m.id === editingMember.id ? { ...m, role: editRoleValue } : m)));
      setEditingMember(null);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberId: string, memberName?: string) => {
    const confirm = window.confirm(`¿Estás seguro de desvincular a ${memberName || 'este usuario'} del campo?`);
    if (!confirm) return;

    const ok = await removeTeamMemberApi(memberId);
    if (ok) {
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    }
  };

  // Handle Resend / Regenerate Invitation Link
  const handleResendInvitation = async (memberId: string, email: string) => {
    const res = await resendInvitationApi(memberId);
    if (res.ok) {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agromasapp.vercel.app';
      const newUrl = res.invitation_url || `${origin}/invitation/${memberId}`;
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, invitation_url: newUrl } : m)));
      navigator.clipboard.writeText(newUrl);
      setCopiedMemberId(memberId);
      setTimeout(() => setCopiedMemberId(null), 2500);
    } else {
      alert(res.message || 'No se pudo generar un nuevo enlace de invitación.');
    }
  };

  // Handle Save Farm Settings
  const handleSaveFarmConfig = () => {
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Helper for Initials
  const getInitials = (first?: string, last?: string, name?: string) => {
    if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return 'AG';
  };

  return (
    <div className="space-y-8 animate-fade-in">


      {/* 2. SECTION: GESTIÓN DE USUARIOS Y ROLES DEL CAMPO */}
      <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 md:p-8 shadow-soft backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-crop-50 text-crop-700">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-950">Equipo y Usuarios del Establecimiento</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                {members.length} activos
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500 mt-1.5">
              Personas autorizadas para monitorear lotes, registrar eventos y recibir alertas de riego por WhatsApp.
            </p>
          </div>

          {/* "+ Agregar Usuario" Button for Dueño/Admin */}
          {currentUserIsDueño ? (
            <button
              onClick={() => {
                setFormError(null);
                setFormSuccess(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 to-water-600 hover:from-crop-500 hover:to-water-500 text-white px-5 py-3 text-xs md:text-sm font-bold shadow-md hover:shadow-lg transition group"
            >
              <UserPlus className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span>+ Agregar Usuario al Campo</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-800 border border-amber-200 shadow-2xs">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Modo Lectura ({roleDetails[activeUserRole]?.shortTitle || 'Colaborador'})</span>
            </div>
          )}
        </div>

        {/* Read-Only RBAC Notification Banner */}
        {!currentUserIsDueño && (
          <div className="mt-4 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="leading-snug">
              Estás viendo este establecimiento como <strong className="font-bold">{roleDetails[activeUserRole]?.title || activeUserRole}</strong>. La invitación de miembros, cambio de roles y ajuste de reglas están reservados para el <strong>Dueño / Administrador</strong>.
            </p>
          </div>
        )}

        {/* Filters & Search */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-crop-500/20 focus:border-crop-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Filtrar:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                roleFilter === 'all' ? 'bg-slate-900 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({members.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                roleFilter === 'admin' ? 'bg-emerald-700 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Dueño
            </button>
            <button
              onClick={() => setRoleFilter('agronomist')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                roleFilter === 'agronomist' ? 'bg-sky-700 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Asesores
            </button>
            <button
              onClick={() => setRoleFilter('operator')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                roleFilter === 'operator' ? 'bg-amber-700 text-white font-bold shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Operarios
            </button>
          </div>
        </div>

        {/* Member Cards Grid - MODERN AGTECH CARDS */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoadingMembers ? (
            <div className="col-span-full py-16 text-center text-xs text-slate-400">
              <RefreshCw className="h-7 w-7 mx-auto animate-spin mb-2 text-crop-600" />
              Cargando miembros del equipo...
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              No se encontraron usuarios con los criterios de búsqueda.
            </div>
          ) : (
            filteredMembers.map((member) => {
              const roleMeta = roleDetails[member.role] || roleDetails.operator;
              const RoleIcon = roleMeta.icon;

              const isInvited = member.status === 'invited' || 
                !member.phone_whatsapp || 
                member.phone_whatsapp === 'Pendiente de registro' ||
                !member.first_name ||
                member.first_name.toLowerCase().includes('invitado');

              const displayName = (!isInvited && (member.name || (member.first_name && member.last_name)))
                ? (member.name || `${member.first_name} ${member.last_name}`).trim()
                : member.email;

              const initials = getInitials(
                !isInvited ? member.first_name : undefined,
                !isInvited ? member.last_name : undefined,
                displayName
              );

              return (
                <article
                  key={member.id}
                  className="rounded-[24px] border border-slate-200/90 bg-white p-6 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header: Avatar, Name & Role Badge with generous spacing */}
                    <div className="flex items-start gap-4">
                      {/* Avatar with gradient & ring */}
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-13 w-13 items-center justify-center rounded-2xl ${roleMeta.avatarGradient} shadow-md ring-4 ${roleMeta.ringColor} font-extrabold text-sm tracking-wider select-none`}
                          style={{ height: '52px', width: '52px' }}
                        >
                          {initials}
                        </div>
                        <span 
                          className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${isInvited ? 'bg-amber-400' : 'bg-emerald-500'} ring-2 ring-white shadow-sm`}
                          title={isInvited ? "Invitación pendiente de registro" : "Usuario activo"}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        </span>
                      </div>

                      {/* Name & Role */}
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-bold text-slate-900 truncate leading-snug">
                          {displayName}
                        </h4>
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${roleMeta.badgeStyle}`}>
                            <RoleIcon className="h-3 w-3 shrink-0" />
                            {roleMeta.shortTitle}
                          </span>

                          {isInvited && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="h-3 w-3 shrink-0 text-amber-600" />
                              <span>Pendiente</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact details pill block */}
                    <div className="mt-5 rounded-2xl bg-slate-50/90 border border-slate-100 p-3.5 space-y-2.5">
                      <div className="flex items-center gap-2.5 text-xs text-slate-700 min-w-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-2xs border border-slate-200/60 shrink-0 text-slate-500">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <span className="truncate font-medium text-[11px] text-slate-700">{member.email}</span>
                      </div>

                      {member.phone_whatsapp && member.phone_whatsapp !== 'Pendiente de registro' && member.phone_whatsapp.length > 5 ? (
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200/60 shrink-0 text-emerald-600">
                              <Phone className="h-3.5 w-3.5" />
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-slate-800 truncate">
                              {formatPhoneWhatsapp(member.phone_whatsapp)}
                            </span>
                          </div>
                          
                          <a
                            href={`https://wa.me/${member.phone_whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-1.5 rounded-xl shadow-sm transition hover:shadow-md shrink-0"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2.5 pt-1 border-t border-slate-200/50 text-[11px] text-slate-400">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 border border-slate-200/50 shrink-0 text-slate-400">
                            <Phone className="h-3.5 w-3.5" />
                          </div>
                          <span className="italic font-medium">WhatsApp pendiente de registro</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      Alta: {new Date(member.joined_at).toLocaleDateString('es-AR')}
                    </span>

                    {currentUserIsDueño && (
                      <div className="flex items-center gap-1">
                        {isInvited && (
                          <button
                            onClick={() => {
                              const origin = typeof window !== 'undefined' ? window.location.origin : 'https://agromasapp.vercel.app';
                              const invUrl = member.invitation_url || `${origin}/invitation/${member.id}`;
                              handleCopyUrl(invUrl, member.id);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded-lg transition"
                            title="Copiar enlace de invitación"
                          >
                            {copiedMemberId === member.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingMember(member);
                            setEditRoleValue(member.role);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-sky-800 hover:bg-sky-50 rounded-lg transition"
                          title="Cambiar rol"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-sky-600" />
                          <span>Rol</span>
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.id, member.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Desvincular del campo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* 3. ROLES PERMISSIONS MATRIX (Collapsible Toggle) */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50/70 p-5 md:p-6 transition-all duration-200">
          <div 
            onClick={() => setIsPermissionsExpanded((prev) => !prev)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-crop-100 text-crop-800">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm md:text-base font-bold text-slate-900">Matriz de Permisos y Accesos por Rol</h4>
                <p className="text-xs text-slate-500">Esquema de seguridad y autorización en AgroMAS.</p>
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 transition"
            >
              <span>{isPermissionsExpanded ? 'Ocultar Matriz' : 'Ver Matriz de Permisos'}</span>
              {isPermissionsExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </button>
          </div>

          {isPermissionsExpanded && (
            <div className="mt-4 border-t border-slate-200/80 pt-4 overflow-x-auto animate-fade-in">
              <table className="w-full text-left text-xs md:text-sm">
                <thead className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 pr-4">Funcionalidad del Sistema</th>
                    <th className="py-2.5 px-4 text-center text-emerald-800">Dueño / Admin</th>
                    <th className="py-2.5 px-4 text-center text-sky-800">Asesor Agronómico</th>
                    <th className="py-2.5 px-4 text-center text-amber-800">Operario de Campo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 text-slate-700 text-xs">
                  <tr className="hover:bg-white/60 transition">
                    <td className="py-3 pr-4 font-medium">Control total del campo y facturación</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Total</td>
                    <td className="py-3 px-4 text-center text-slate-400">—</td>
                    <td className="py-3 px-4 text-center text-slate-400">—</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition">
                    <td className="py-3 pr-4 font-medium">Agregar / Modificar usuarios y asignar roles</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-slate-400">Solo lectura</td>
                    <td className="py-3 px-4 text-center text-slate-400">Solo lectura</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition">
                    <td className="py-3 pr-4 font-medium">Delimitar lotes satelitales y suelos (Wizard)</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-sky-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-slate-400">—</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition">
                    <td className="py-3 pr-4 font-medium">Auditar balance hídrico FAO-56 y curvas NDVI</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-sky-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-slate-400">Básico</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition">
                    <td className="py-3 pr-4 font-medium">Registrar eventos de riego</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-sky-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-bold">✓ Sí (Móvil)</td>
                  </tr>
                  <tr className="hover:bg-white/60 transition">
                    <td className="py-3 pr-4 font-medium">Alertas automáticas de bombeo por WhatsApp</td>
                    <td className="py-3 px-4 text-center text-emerald-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-sky-600 font-bold">✓ Sí</td>
                    <td className="py-3 px-4 text-center text-amber-600 font-bold">✓ Sí</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* 4. SECTION: FICHA DEL ESTABLECIMIENTO & PARCELAS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 md:p-8 shadow-soft backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 rounded-xl bg-crop-50 text-crop-700">
                <MapPinned className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Ficha del Establecimiento</h3>
            </div>

            <div className="space-y-4 text-xs md:text-sm">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Nombre del Campo
                </label>
                <input
                  type="text"
                  value={farmName}
                  disabled={!currentUserIsDueño}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-crop-500/20 disabled:opacity-75"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Superficie Total</span>
                  <p className="text-lg font-extrabold font-mono text-crop-700 mt-1">
                    {totalHectares > 0 ? totalHectares.toFixed(1) : '280.0'} ha
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Lotes Activos</span>
                  <p className="text-lg font-extrabold font-mono text-slate-900 mt-1">
                    {fields.length > 0 ? fields.length : 4} parcelas
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-bold">Zona Agroecológica</span>
                  <span className="font-semibold text-slate-800 text-xs md:text-sm">Pergamino, Buenos Aires (Zona Núcleo)</span>
                </div>
                <span className="rounded-full bg-crop-100 px-2.5 py-1 text-[10px] font-bold text-crop-800 border border-crop-200">
                  Suelo Franco
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap gap-2.5 items-center justify-between">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold transition"
            >
              <MapPinned className="h-3.5 w-3.5 text-crop-400" />
              <span>Redelimitar Lotes en Mapa</span>
            </Link>

            {currentUserIsDueño && (
              <button
                onClick={handleSaveFarmConfig}
                className="inline-flex items-center gap-1.5 rounded-xl bg-crop-600 hover:bg-crop-700 text-white px-4 py-2.5 text-xs font-bold transition shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Guardar Cambios</span>
              </button>
            )}
          </div>
          {saveSuccessMsg && (
            <p className="mt-2 text-[11px] text-emerald-700 font-bold">¡Configuración guardada correctamente!</p>
          )}
        </div>

        {/* 5. SECTION: REGLAS DE RIEGO Y ALERTAS DE WHATSAPP */}
        <div className="rounded-[28px] border border-white/80 bg-white/90 p-6 md:p-8 shadow-soft backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-water-50 text-water-700">
              <Droplets className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-950">Reglas de Riego y Notificaciones MAS</h3>
          </div>

          <div className="space-y-3.5 text-xs md:text-sm">
            {/* Toggle WhatsApp */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-0.5 max-w-sm">
                <span className="font-bold text-slate-900 block">Alertas de Déficit Hídrico por WhatsApp</span>
                <p className="text-[11px] text-slate-500">
                  Notificar al equipo cuando el déficit Dr supere el umbral RAW (Agua Fácilmente Disponible).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={whatsappAlertsEnabled}
                  disabled={!currentUserIsDueño}
                  onChange={(e) => setWhatsappAlertsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Toggle Tarifa Nocturna */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="space-y-0.5 max-w-sm">
                <span className="font-bold text-slate-900 block">Optimización Energética (Ventana Nocturna)</span>
                <p className="text-[11px] text-slate-500">
                  Recomendar encendido de bombas preferentemente en tarifa valle (23:00 a 06:00 hs).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={nightTariffOnly}
                  disabled={!currentUserIsDueño}
                  onChange={(e) => setNightTariffOnly(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-water-600"></div>
              </label>
            </div>

            {/* Threshold Slider */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Umbral Mínimo de Lámina para Aplicación</span>
                <span className="font-mono font-bold text-crop-700">{deficitAlertThreshold} mm</span>
              </div>
              <input
                type="range"
                min="10"
                max="60"
                step="5"
                value={deficitAlertThreshold}
                disabled={!currentUserIsDueño}
                onChange={(e) => setDeficitAlertThreshold(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-crop-600 disabled:opacity-50"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>10 mm (Microaspersión)</span>
                <span>60 mm (Pivote extensivo)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 6. MODAL: AGREGAR USUARIO / MOSTRAR LINK DE INVITACIÓN */}
      <ModalPortal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setCreatedInvitationUrl(null);
          setNewEmail('');
          setFormError(null);
          setFormSuccess(null);
        }}
      >
        <div className="w-full max-w-lg rounded-[28px] border border-white/20 bg-white p-6 md:p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto text-slate-900">
          
          {createdInvitationUrl ? (
            /* SCREEN B: INVITATION LINK CREATED & READY TO SHARE */
            <div className="space-y-5 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">¡Enlace de Invitación Listo!</h3>
                    <p className="text-xs text-slate-500">Compartí el enlace con el colaborador para que ingrese.</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setCreatedInvitationUrl(null);
                    setNewEmail('');
                  }}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Enlace Mágico de Acceso
                </span>
                
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={createdInvitationUrl}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-mono font-semibold text-slate-800 focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(createdInvitationUrl)}
                    className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition"
                  >
                    {modalCopiedSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/70 rounded-2xl text-[11px] text-emerald-800 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Podés enviar este enlace por WhatsApp, Email o mensaje directo. Al abrirlo, el colaborador accederá de inmediato al establecimiento.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setCreatedInvitationUrl(null);
                    setNewEmail('');
                  }}
                  className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white py-3 text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition duration-200"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            /* SCREEN A: INPUT EMAIL & ROLE FORM */
            <div className="space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-crop-100 text-crop-700 shadow-sm">
                    <UserPlus className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Invitar Colaborador al Campo</h3>
                    <p className="text-xs text-slate-500">Genera un enlace de invitación para el nuevo usuario.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Error alerts */}
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAddMember} noValidate className="space-y-4">
                
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Correo Electrónico del Colaborador
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@establecimiento.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-crop-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-crop-500/20 transition"
                    />
                  </div>
                </div>

                {/* Role Selector */}
                <div className="space-y-2 pt-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Rol Asignado en este Establecimiento
                  </label>
                  <div className="space-y-2">
                    {(['admin', 'agronomist', 'operator'] as FieldRole[]).map((r) => {
                      const isSelected = newRole === r;
                      const details = roleDetails[r];
                      const Icon = details.icon;
                      return (
                        <div
                          key={r}
                          onClick={() => setNewRole(r)}
                          className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                            isSelected
                              ? 'border-crop-500 bg-crop-50/60 shadow-xs ring-1 ring-crop-500/20'
                              : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70'
                          }`}
                        >
                          <div className={`p-2 rounded-xl shrink-0 ${isSelected ? 'bg-crop-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-slate-900">{details.title}</span>
                              {isSelected && <span className="h-2 w-2 rounded-full bg-crop-600"></span>}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{details.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanatory Note */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-crop-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Al presionar el botón se generará un enlace de invitación para copiar y compartir directamente con el colaborador.
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-crop-600 via-emerald-600 to-water-600 hover:from-crop-700 hover:to-water-700 text-white py-3 text-xs font-bold shadow-md shadow-crop-600/20 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-50"
                  >
                    {isSubmittingUser ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <span>Generar Enlace</span>
                        <UserPlus className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </ModalPortal>

      {/* 7. MODAL: EDITAR ROL DE MIEMBRO */}
      <ModalPortal isOpen={Boolean(editingMember)} onClose={() => setEditingMember(null)}>
        {editingMember && (
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 md:p-8 shadow-2xl animate-scale-in text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Cambiar Rol de {editingMember.name || editingMember.email}
                </h3>
                <p className="text-xs text-slate-500">Selecciona el nuevo nivel de permisos.</p>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2.5 mb-6">
              {(['admin', 'agronomist', 'operator'] as FieldRole[]).map((r) => {
                const isSelected = editRoleValue === r;
                const meta = roleDetails[r];
                const Icon = meta.icon;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditRoleValue(r)}
                    className={`w-full text-left p-3.5 rounded-2xl border text-xs md:text-sm transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-crop-50 border-crop-500 font-bold text-crop-900 ring-2 ring-crop-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-crop-600' : 'text-slate-500'}`} />
                      <span>{meta.title}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-crop-600" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditingMember(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveRoleEdit}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold shadow"
              >
                Actualizar Rol
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
}

export default FarmSettingsView;
