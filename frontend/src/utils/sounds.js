// Lazy-init Audio objects — created on first use to avoid autoplay restrictions
let _notificationAudio = null;
let _successAudio      = null;

export function playSound(type) {
  try {
    if (type === 'notification') {
      if (!_notificationAudio) _notificationAudio = new Audio('/assets/sounds/notification.mp3');
      _notificationAudio.currentTime = 0;
      _notificationAudio.play().catch(() => {}); // silent fail if blocked
    }
    if (type === 'success') {
      if (!_successAudio) _successAudio = new Audio('/assets/sounds/success.mp3');
      _successAudio.currentTime = 0;
      _successAudio.play().catch(() => {});
    }
  } catch {
    // Never crash on sound failure
  }
}
