import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Building2, LayoutDashboard, ShieldCheck, LogOut, CalendarCheck } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-rose-600">
          <Building2 className="h-6 w-6" />
          BookMyVenue
        </Link>

        <div className="flex items-center gap-3">
          {!user && (
            <>
              <Link to="/login"><Button variant="ghost">Login</Button></Link>
              <Link to="/register"><Button className="bg-rose-600 hover:bg-rose-700">Sign Up</Button></Link>
            </>
          )}

          {user?.role === 'USER' && (
            <>
              <Link to="/my-bookings">
                <Button variant="ghost"><CalendarCheck className="h-4 w-4 mr-2" />My Bookings</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
            </>
          )}

          {user?.role === 'OWNER' && (
            <>
              <Link to="/owner/dashboard">
                <Button variant="ghost"><LayoutDashboard className="h-4 w-4 mr-2" />Dashboard</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
            </>
          )}

          {user?.role === 'ADMIN' && (
            <>
              <Link to="/admin/dashboard">
                <Button variant="ghost"><ShieldCheck className="h-4 w-4 mr-2" />Admin Panel</Button>
              </Link>
              <Button variant="ghost" onClick={handleLogout}><LogOut className="h-4 w-4" /></Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;