const HOVER_SOUND_PATH = "/sounds/ui_hover.mp3";
const CLICK_SOUND_PATH = "/sounds/ui_click.mp3";
const WHOOSH_SOUND_PATH = "/sounds/whoosh.mp3";

const HOVER_SOUND_VOLUME = 0.35;
const CLICK_SOUND_VOLUME = 0.5;
const WHOOSH_SOUND_VOLUME = 0.4125;
const HOVER_SOUND_COOLDOWN_MS = 70;

let cachedHoverAudio = null;
let lastHoverSoundPlayedAt = 0;

function isHoverSoundEnabled() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function preloadSoundAsset(soundPath) {
  const audioElement = new Audio(soundPath);
  audioElement.preload = "auto";
  audioElement.load();
}

function playSoundOnce(soundPath, volumeLevel) {
  if (typeof window === "undefined") {
    return;
  }

  const audioElement = new Audio(soundPath);
  audioElement.volume = volumeLevel;
  void audioElement.play().catch(() => {});
}

function playHoverSound() {
  if (!isHoverSoundEnabled()) {
    return;
  }

  const now = performance.now();
  if (now - lastHoverSoundPlayedAt < HOVER_SOUND_COOLDOWN_MS) {
    return;
  }

  lastHoverSoundPlayedAt = now;

  if (!cachedHoverAudio) {
    cachedHoverAudio = new Audio(HOVER_SOUND_PATH);
    cachedHoverAudio.preload = "auto";
  }

  cachedHoverAudio.volume = HOVER_SOUND_VOLUME;
  cachedHoverAudio.currentTime = 0;
  void cachedHoverAudio.play().catch(() => {});
}

function playClickSound() {
  playSoundOnce(CLICK_SOUND_PATH, CLICK_SOUND_VOLUME);
}

// play the whoosh transition sound, optionally delayed for staggered scene exits
export function playWhooshSound(delayMs = 0) {
  if (delayMs > 0) {
    window.setTimeout(
      () => playSoundOnce(WHOOSH_SOUND_PATH, WHOOSH_SOUND_VOLUME),
      delayMs,
    );
    return;
  }

  playSoundOnce(WHOOSH_SOUND_PATH, WHOOSH_SOUND_VOLUME);
}

// merge hover and click sound handlers into button or link event props
export function bindButtonSoundEffects({
  onClick,
  onMouseEnter,
  ...restProps
} = {}) {
  return {
    ...restProps,
    onMouseEnter: (event) => {
      playHoverSound();
      onMouseEnter?.(event);
    },
    onClick: (event) => {
      playClickSound();
      onClick?.(event);
    },
  };
}

if (typeof window !== "undefined") {
  preloadSoundAsset(HOVER_SOUND_PATH);
  preloadSoundAsset(CLICK_SOUND_PATH);
  preloadSoundAsset(WHOOSH_SOUND_PATH);
}
