import React from 'react';
import { Activity } from 'lucide-react';
import { timeAgo } from '../../../utils/formatters';
import styles from './ActivityFeed.module.css';

// Convert raw "METHOD /path" audit action to human-readable label
function formatAction(action) {
  if (!action) return 'Performed an action';
  const a = action.toUpperCase();
  if (a.includes('DEALER_APPROVE') || (a.includes('PATCH') && a.includes('/APPROVE'))) return 'Approved a dealer';
  if (a.includes('DEALER_REJECT') || (a.includes('PATCH') && a.includes('/REJECT'))) return 'Rejected a dealer';
  if (a.includes('TIER_CHANGE') || (a.includes('PATCH') && a.includes('/TIER'))) return 'Changed dealer tier';
  if (a.includes('DEALER_DELETE') || (a.includes('PATCH') && a.includes('/SUSPEND'))) return 'Suspended a dealer';
  if (a.includes('POST') && a.includes('/CATALOG')) return 'Created a product';
  if (a.includes('PATCH') && a.includes('/CATALOG')) return 'Updated a product';
  if (a.includes('DELETE') && a.includes('/CATALOG')) return 'Deleted a product';
  if (a.includes('POST') && a.includes('/CAMPAIGNS')) return 'Created a campaign';
  if (a.includes('PATCH') && a.includes('/CAMPAIGNS')) return 'Updated a campaign';
  if (a.includes('POST') && a.includes('/MEDIA')) return 'Uploaded media';
  if (a.includes('DELETE') && a.includes('/MEDIA')) return 'Deleted media';
  if (a.includes('PATCH') && a.includes('/SITE-CONFIG')) return 'Updated site config';
  if (a.includes('PATCH') && a.includes('/STOCK')) return 'Updated product stock';
  // fallback: prettify raw string
  return action.replace(/^(POST|PATCH|PUT|DELETE)\s+/, '').replace(/\/api\/v1\/admin\//, '');
}

export default function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Recent Activity</h3>
        <p className={styles.empty}>No recent activity</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Recent Activity</h3>
      <div className={styles.feed}>
        {activities.map((activity) => (
          <div key={activity._id} className={styles.item}>
            <div className={styles.iconWrapper}>
              <Activity size={16} className={styles.icon} />
            </div>
            <div className={styles.content}>
              <p className={styles.action}>
                <span className={styles.admin}>
                  {activity.adminId?.profile?.name || 'Admin'}
                </span>
                {' '}
                {formatAction(activity.action)}
              </p>
              <p className={styles.timestamp}>
                {timeAgo(activity.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
