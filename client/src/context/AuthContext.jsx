import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

// The API returns { accessToken, user } (older versions returned { token, user }).
const pickToken = (data) => data.accessToken ?? data.token;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const saveSession = (data) => {
    const token = pickToken(data);
    if (token) localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    return saveSession(res.data.data);
  };

  const register = async (email, password, name, role) => {
    const res = await api.post('/auth/register', { email, password, name, role });
    return saveSession(res.data.data);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);