import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { BoardsView } from './components/boards/BoardsView';
import { BoardDetailView } from './components/boards/BoardDetailView';
import { TaskListView } from './components/tasks/TaskListView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { UsersView } from './components/users/UsersView';
import { ProfileView } from './components/profile/ProfileView';
import { SettingsView } from './components/settings/SettingsView';
import { TaskModal } from './components/tasks/TaskModal';
import { OnboardingModal } from './components/onboarding/OnboardingModal';
import { SecretLoginView } from './components/auth/SecretLoginView';
import { NotFoundView } from './components/auth/NotFoundView';
import { ResetPasswordView } from './components/auth/ResetPasswordView';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { RequireAdmin } from './components/common/RequireAdmin';
import { Kanban, Loader2 } from 'lucide-react';

const SECRET_LOGIN_PATH = (
  import.meta.env.VITE_SECRET_LOGIN_PATH || '/access'
).toLowerCase().replace(/^\/?/, '/');

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(false);

  // Check if URL contains Supabase password recovery or invitation hash
  useEffect(() => {
    const hash = window.location.hash || '';
    const isInviteOrRecovery =
      hash.includes('type=recovery') ||
      hash.includes('type=invite') ||
      hash.includes('type=signup') ||
      hash.includes('access_token=');

    if (isInviteOrRecovery) {
      setIsPasswordRecovery(true);
      if (window.location.hash) {
        window.history.replaceState(null, '', '/set-password');
      }
    }
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg mb-3 animate-pulse">
          <Kanban className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  // Handle password recovery / invitation flow — STRICT GATE
  const requirePassword =
    isPasswordRecovery ||
    location.pathname === '/set-password' ||
    localStorage.getItem('kf_require_password_setup') === 'true';

  if (requirePassword) {
    return (
      <ResetPasswordView
        onSuccess={() => {
          localStorage.removeItem('kf_require_password_setup');
          setIsPasswordRecovery(false);
          window.history.replaceState(null, '', '/dashboard');
          window.location.href = '/dashboard';
        }}
        onCancel={() => {
          localStorage.removeItem('kf_require_password_setup');
          setIsPasswordRecovery(false);
          window.history.replaceState(null, '', SECRET_LOGIN_PATH);
          window.location.href = SECRET_LOGIN_PATH;
        }}
      />
    );
  }

  const currentPath = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  const isSecretLoginRoute =
    currentPath === SECRET_LOGIN_PATH || currentPath === '/access';

  // If user is not authenticated:
  if (!user) {
    if (isSecretLoginRoute) {
      return <SecretLoginView />;
    }
    // Any other URL without auth shows the mysterious landing view
    return <NotFoundView />;
  }

  // If user is authenticated and visits the secret login route, redirect to /dashboard
  if (isSecretLoginRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header */}
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Scrollable View Area via Routes */}
        <main className="flex-1 overflow-y-auto bg-slate-50/75">
          <ErrorBoundary fallbackTitle="Application View Error">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/boards" element={<BoardsView />} />
              <Route path="/boards/:boardId" element={<BoardDetailView />} />
              <Route path="/tasks" element={<TaskListView />} />
              <Route path="/notifications" element={<NotificationsView />} />
              <Route
                path="/users"
                element={
                  <RequireAdmin>
                    <UsersView />
                  </RequireAdmin>
                }
              />
              <Route path="/profile" element={<ProfileView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Task Create/Edit Modal */}
      <TaskModal />

      {/* First-time User Onboarding & Workspace Setup Wizard */}
      <OnboardingModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}

