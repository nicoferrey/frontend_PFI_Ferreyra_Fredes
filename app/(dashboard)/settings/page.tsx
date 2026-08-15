"use client";

import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { FarmSettingsView } from '@/components/farm-settings-view';

export default function DashboardSettingsPage() {
  const auth = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <FarmSettingsView fields={auth.fields} />
    </div>
  );
}
