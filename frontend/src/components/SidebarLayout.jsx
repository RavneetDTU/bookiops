import { NavLink, Outlet, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Store,
  UserPlus,
  PhoneForwarded,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';

const LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/onboarding-requests', label: 'Onboarding Requests', icon: ClipboardList },
  { to: '/restaurants', label: 'Restaurants', icon: Store },
  { to: '/onboard', label: 'Onboard Restaurant', icon: UserPlus },
  { to: '/number-changes', label: 'Number Change Requests', icon: PhoneForwarded },
];

export function SidebarLayout() {
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-56 shrink-0 border-r border-border bg-white flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="font-heading text-2xl text-foreground">BookiOps</div>
          <p className="text-xs text-muted-foreground mt-1">Admin · Booki.ai</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground px-3 mb-2 truncate">{user?.email}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

export function RequireAdmin({ children }) {
  const { isAuthenticated, booting } = useAuth();
  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}
