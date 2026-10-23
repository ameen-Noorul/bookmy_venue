import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/context/NotificationContext';

const NotificationBell = () => {
  const { notifications, unreadCount, connected, isUnread, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const close = () => {
    setOpen(false);
    markAllRead();
  };

  // Close when clicking outside the panel.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) close();
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  });

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        className="relative"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-xs flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        <span
          className={`absolute bottom-1 right-1 h-2 w-2 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-300'
          }`}
          title={connected ? 'Live' : 'Offline'}
        />
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b font-semibold text-sm">Notifications</div>
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`px-4 py-3 border-b last:border-b-0 text-sm ${
                  isUnread(n) ? 'bg-rose-50' : ''
                }`}
              >
                <p>{n.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;