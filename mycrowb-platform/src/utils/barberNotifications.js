export const BARBER_NOTIFICATION_KEY = 'mycrowb_barber_notifications';
export const BARBER_NOTIFICATION_LAST_SEEN_KEY = 'mycrowb_barber_notifications_last_seen';

const TWO_MONTHS_IN_MS = 1000 * 60 * 60 * 24 * 61;

export function readAndPruneNotifications() {
  const rawItems = JSON.parse(localStorage.getItem(BARBER_NOTIFICATION_KEY) || '[]');
  const now = Date.now();
  const pruned = rawItems.filter((item) => {
    const createdAtMs = new Date(item.createdAt || 0).getTime();
    return Number.isFinite(createdAtMs) && now - createdAtMs <= TWO_MONTHS_IN_MS;
  });

  if (pruned.length !== rawItems.length) {
    localStorage.setItem(BARBER_NOTIFICATION_KEY, JSON.stringify(pruned));
  }

  return pruned;
}

export function markNotificationsAsSeen() {
  localStorage.setItem(BARBER_NOTIFICATION_LAST_SEEN_KEY, new Date().toISOString());
}

export function hasUnreadNotifications(notifications) {
  const lastSeenAt = localStorage.getItem(BARBER_NOTIFICATION_LAST_SEEN_KEY);
  const lastSeenTime = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  return notifications.some((item) => new Date(item.createdAt || 0).getTime() > lastSeenTime);
}

