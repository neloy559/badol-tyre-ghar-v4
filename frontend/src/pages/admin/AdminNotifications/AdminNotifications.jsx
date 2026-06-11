import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Bell, CheckCheck } from 'lucide-react';
import api from '../../../services/api';
import { timeAgo } from '../../../utils/formatters';
import styles from './AdminNotifications.module.css';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [marking, setMarking]   = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get('/admin/notifications');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setNotifications(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function markRead(id) {
    await api.patch(`/admin/notifications/${id}/read`, {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
  }

  async function markAllRead() {
    setMarking(true);
    await api.patch('/admin/notifications/read-all', {});
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setMarking(false);
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Notifications — BTG Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Notifications
            {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
          </h1>
          <p className={styles.subtitle}>Last 50 notifications</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" className={styles.markAllBtn} onClick={markAllRead} disabled={marking}>
            <CheckCheck size={16} />
            {marking ? 'Marking...' : 'Mark All Read'}
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className={styles.empty}>
          <Bell size={48} style={{ opacity: 0.2 }} />
          <p>No notifications yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map(n => (
            <div
              key={n._id}
              className={`${styles.item} ${!n.isRead ? styles.unread : ''}`}
              onClick={() => !n.isRead && markRead(n._id)}
            >
              <div className={styles.itemDot} />
              <div className={styles.itemContent}>
                <div className={styles.itemTitle}>{n.title}</div>
                <div className={styles.itemMessage}>{n.message}</div>
              </div>
              <div className={styles.itemTime}>{timeAgo(n.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
