'use client';

import { useState } from 'react';
import LandingPage from './landing';
import DashboardShell from '../components/dashboard-shell';

export default function HomePage() {
  const [showDashboard, setShowDashboard] = useState(false);

  // Check if user wants to see dashboard (optional: add auth/query param logic)
  if (showDashboard) {
    return <DashboardShell />;
  }

  return <LandingPage />;
}
