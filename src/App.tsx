import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import { ClerkAuthView } from './components/auth/ClerkAuthView';
import { Kanban, Loader2 } from 'lucide-react';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white flex items-center justify-center shadow-lg mb-3 animate-pulse">
          <Kanban className="w-6 h-6" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
          <span>Loading workspace...</span>
        </div>
      </div>
    );
  }

  // If not logged in, render Clerk authentication screen
  if (!user) {
    return <ClerkAuthView />;
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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/boards" element={<BoardsView />} />
            <Route path="/boards/:boardId" element={<BoardDetailView />} />
            <Route path="/tasks" element={<TaskListView />} />
            <Route path="/notifications" element={<NotificationsView />} />
            <Route path="/users" element={<UsersView />} />
            <Route path="/profile" element={<ProfileView />} />
            <Route path="/settings" element={<SettingsView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
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
