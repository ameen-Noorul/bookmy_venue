import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  connected: false,
  isUnread: () => false,
  markAllRead: () => {},
});

const seenKey = (userId) => `notifications_last_seen_${userId}`;
const time = (n) => new Date(n.createdAt).getTime();

// Merge two lists by id, newest first.
const merge = (a, b) => {
  const map = new Map();
  [...a, ...b].forEach((n) => map.set(n.id, n));
  return [...map.values()].sort((x, y) => time(y) - time(x));
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);

  const isOwner = user?.role === 'OWNER';
  const userId = user?.id || user?.email;

  useEffect(() => {
    if (!isOwner || !userId) {
      setNotifications([]);
      setConnected(false);
      return undefined;
    }

    let cancelled = false;
    let refreshing = false;
    setLastSeen(Number(localStorage.getItem(seenKey(userId)) || 0));

    // Everything the owner missed while offline comes from the REST endpoint.
    const loadMine = async () => {
      try {
        const res = await api.get('/notifications/mine');
        if (!cancelled) setNotifications((prev) => merge(prev, res.data.data || []));
      } catch {
        /* ignore: the live socket still works */
      }
    };

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      // Called on every (re)connection attempt, so it always sends the newest token.
      auth: (cb) => cb({ token: localStorage.getItem('token') }),
    });

    socket.on('connect', () => {
      setConnected(true);
      loadMine(); // first connect AND every reconnect: catch up on anything missed
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('notification:new', (n) => {
      setNotifications((prev) => merge(prev, [n]));
      toast.success('New booking', { description: n.message });
    });

    // The server refuses sockets with an expired token: refresh once, then retry.
    socket.on('connect_error', async (err) => {
      if (refreshing || !/token|authentication/i.test(err.message)) return;
      refreshing = true;
      try {
        const { data } = await api.post('/auth/refresh');
        localStorage.setItem('token', data.data.accessToken);
        if (!cancelled) socket.connect();
      } catch {
        /* the api interceptor sends the user to /login */
      } finally {
        refreshing = false;
      }
    });

    return () => {
      cancelled = true;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isOwner, userId]);

  const isUnread = useCallback((n) => time(n) > lastSeen, [lastSeen]);
  const unreadCount = notifications.filter(isUnread).length;

  const markAllRead = useCallback(() => {
    if (!userId) return;
    const newest = notifications.length ? Math.max(...notifications.map(time)) : Date.now();
    localStorage.setItem(seenKey(userId), String(newest));
    setLastSeen(newest);
  }, [notifications, userId]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, connected, isUnread, markAllRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);