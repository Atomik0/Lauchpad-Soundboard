// Haptics & Vibration Manager
// Generates low-latency tactile feedback on mobile pad touch

let hapticIntensity = 'medium';

const HAPTIC_PATTERNS = {
  light: [15],
  medium: [25],
  strong: [45],
  double: [20, 40, 20]
};

function triggerHaptic(type = 'medium') {
  if (hapticIntensity === 'off') return;
  if (!('vibrate' in navigator)) return;

  try {
    const pattern = HAPTIC_PATTERNS[type] || HAPTIC_PATTERNS[hapticIntensity] || [25];
    navigator.vibrate(pattern);
  }
  catch (err) {
    // Vibration blocked by system or browser policy
  }
}

function setHapticIntensity(intensity) {
  if (['off', 'light', 'medium', 'strong'].includes(intensity)) {
    hapticIntensity = intensity;
    localStorage.setItem('lp_haptic_intensity', intensity);
    if (intensity !== 'off') {
      triggerHaptic(intensity);
    }
  }
}

const savedHaptic = localStorage.getItem('lp_haptic_intensity');

if (savedHaptic) {
  hapticIntensity = savedHaptic;
}

window.HapticsManager = {
  trigger: triggerHaptic,
  setIntensity: setHapticIntensity,
  getIntensity: () => hapticIntensity
};
