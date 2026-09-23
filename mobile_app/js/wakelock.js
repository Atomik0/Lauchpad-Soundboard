// Screen Wake Lock API Manager
// Keeps screen active while mobile soundboard pad is in use

let wakeLockSentinel = null;
let isWakeLockEnabled = true;

async function requestScreenWakeLock() {
  if (!isWakeLockEnabled) return false;
  if (!('wakeLock' in navigator)) {
    console.log('[WakeLock] API not supported on this device/browser');
    return false;
  }

  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
    wakeLockSentinel.addEventListener('release', () => {
      wakeLockSentinel = null;
    });
    console.log('[WakeLock] Screen wake lock acquired successfully');
    return true;
  } catch (err) {
    console.warn('[WakeLock] Request failed:', err.message);
    return false;
  }
}

async function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    try {
      await wakeLockSentinel.release();
      wakeLockSentinel = null;
      console.log('[WakeLock] Screen wake lock released');
    } catch (e) { }
  }
}

function setWakeLockEnabled(enabled) {
  isWakeLockEnabled = !!enabled;
  localStorage.setItem('lp_wake_lock', isWakeLockEnabled ? '1' : '0');
  if (isWakeLockEnabled) {
    requestScreenWakeLock();
  } else {
    releaseScreenWakeLock();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isWakeLockEnabled) {
    requestScreenWakeLock();
  }
});

const savedWakeLock = localStorage.getItem('lp_wake_lock');
if (savedWakeLock !== null) {
  isWakeLockEnabled = savedWakeLock === '1';
}

window.WakeLockManager = {
  request: requestScreenWakeLock,
  release: releaseScreenWakeLock,
  setEnabled: setWakeLockEnabled,
  isEnabled: () => isWakeLockEnabled
};
