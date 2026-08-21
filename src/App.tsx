import React, { useState, useEffect } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { BoardsView } from './components/boards/BoardsView';
import { BoardDetailView } from './components/boards/BoardDetailView';
import { TaskListView } from './components/tasks/TaskListView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { ProfileView } from './components/profile/ProfileView';
import { SettingsView } from './components/settings/SettingsView';
import { TaskModal } from './components/tasks/TaskModal';
import { SignInView } from './components/auth/SignInView';
import { SignUpView } from './components/auth/SignUpView';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { ResetPasswordView } from './components/auth/ResetPasswordView';
import { Kanban, Loader2 } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { activePage } = useApp();
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'reset-password'>('signin');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Check if URL contains reset password recovery tokens
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setAuthView('reset-password');
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md mb-3 animate-pulse">
          <Kanban className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  // If not logged in, render authentication screens
  if (!user) {
    return (
      <>
        {authView === 'signin' && (
          <SignInView
            onSwitchToSignUp={() => setAuthView('signup')}
            onForgotPassword={() => setIsForgotPasswordOpen(true)}
          />
        )}
        {authView === 'signup' && (
          <SignUpView onSwitchToSignIn={() => setAuthView('signin')} />
        )}
        {authView === 'reset-password' && (
          <ResetPasswordView onSuccess={() => setAuthView('signin')} />
        )}
        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
        />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardView />;
      case 'boards':
        return <BoardsView />;
      case 'board-detail':
        return <BoardDetailView />;
      case 'tasks':
        return <TaskListView />;
      case 'notifications':
        return <NotificationsView />;
      case 'profile':
        return <ProfileView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

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

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/75">
          {renderActiveView()}
        </main>
      </div>

      {/* Global Task Create/Edit Modal */}
      <TaskModal />
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
