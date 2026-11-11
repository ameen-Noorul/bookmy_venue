import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/NotificationBell';
import { Building2, LayoutDashboard, ShieldCheck, LogOut, CalendarCheck, Plus, ListChecks } from 'lucide-react';

const linkClass = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-accent text-accent-foreground'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const linksByRole = {
  USER: [{ to: '/my-bookings', label: 'My bookings', icon: CalendarCheck }],
  OWNER: [
    { to: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/owner/bookings', label: 'Bookings', icon: ListChecks },
    { to: '/owner/venues/new', label: 'List a venue', icon: Plus },
  ],
  ADMIN: [{ to: '/admin/dashboard', label: 'Admin panel', icon: ShieldCheck }],
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = linksByRole[user?.role] ?? [];
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase();

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">BookMyVenue</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {!user && (
            <>
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/register">
                <Button>Sign up</Button>
              </Link>
            </>
          )}

          {user && (
            <>
              {links.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={linkClass} title={label}>
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{label}</span>
                </NavLink>
              ))}

              {user.role === 'OWNER' && <NotificationBell />}

              <div className="ml-1 hidden items-center gap-2 border-l pl-3 sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {initial}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium">
                  {user.name || user.email}
                </span>
              </div>

              <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;