import { useState, useEffect } from 'react';
import api from '../services/api';
import { playSound } from '../utils/sounds';
import { NOTIFICATION_POLL_MS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';

export function useNotifications() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin';
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchCount() {
      try {
        const res = await api.get('/admin/notifications/unread-count');
        if (!res || !res.ok) return;
        const json = await res.json();
        const newCount = json.data?.count || 0;
        setCount(prev => {
          if (newCount > prev) playSound('notification');
          return newCount;
        });
      } catch {}
    }

    fetchCount();
    const id = setInterval(fetchCount, NOTIFICATION_POLL_MS);
    return () => clearInterval(id);
  }, [isAdmin]);

  return { count };
}
