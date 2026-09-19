import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';

const navByRole = {
  ADMIN: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'Projects' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/clients', label: 'Clients' },
    { to: '/users', label: 'Users' },
    { to: '/activity', label: 'Activity Feed' },
  ],
  PROJECT_MANAGER: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/projects', label: 'My Projects' },
    { to: '/tasks', label: 'Tasks' },
    { to: '/activity', label: 'Activity Feed' },
  ],
  DEVELOPER: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/tasks', label: 'My Tasks' },
    { to: '/activity', label: 'Activity' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel =
    user.role === 'PROJECT_MANAGER'
      ? 'Project Manager'
      : user.role === 'DEVELOPER'
      ? 'Developer'
      : 'Admin';

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-indigo-900 text-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-auto`}
      >
        {/* Logo */}
        <div className="flex items-center h-16 px-6 border-b border-indigo-800">
          <span className="text-xl font-bold tracking-tight">Velozity</span>
          <span className="ml-2 text-indigo-300 text-sm font-medium">Dashboard</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-indigo-700 text-white'
                  : 'text-indigo-200 hover:bg-indigo-800 hover:text-white'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-4 py-4 border-t border-indigo-800">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <p className="text-xs text-indigo-400 truncate">{roleLabel}</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-4 ml-auto">
            {/* Socket connection indicator */}
            <span
              title={isConnected ? 'Live' : 'Disconnected'}
              className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400'}`}
            />
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
