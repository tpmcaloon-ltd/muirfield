export const experienceConfig = {
  // ── Landing shot (before "enter experience") ──────────────────────────────
  // Camera position for the landing shot. Always looks at the model center.
  // tune with /?debugLanding → copy landing composition → paste below.
  initialCamera: {
    position: { x: 30, y: 8, z: -20 },
  },

  // Model rotation for the landing composition (radians).
  initialModel: {
    rotation: { x: 0, y: 0, z: 0 },
  },

  // ── Gameplay camera (after "enter experience") ────────────────────────────
  // Where the enter animation ends and WASD movement begins.
  camera: {
    position: { x: 0, y: 1.7, z: 2 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 78,
    far: 420,
    farScale: 10,
  },

  // ── Enter transition ──────────────────────────────────────────────────────
  entry: {
    duration: 3.2,
    approachDistance: 4,
    landingCopyReveal: 0.52,
    backButtonReveal: 0.5,
    bloomFadeInDelay: 1.25,
    bloomFadeInDuration: 1.5,
    bloomFadeOutDelay: 0.5,
    bloomFadeOutDuration: 1.2,
  },
  movement: {
    speed: 2.8,
    turnSpeed: 1.4,
    eyeHeight: 1.7,
    collisionRadius: 0.38,
    moveDamping: 7,
    turnDamping: 5,
  },
  parallax: {
    enabled: true,
    maxYaw: 0.05,
    maxPitch: 0.05,
    damping: 5,
  },
  lighting: {
    emissiveBoost: 1,
    fillZones: true,
    zoneBrighten: 1.85,
    zoneRadius: 14,
  },
  materials: {
    walls: {
      brighten: 2,
      tint: "#fdff75",
      tintMix: 0.14,
      roughness: 1,
      textureScale: 2,
      textureOpacity: 1,
    },
    floor: {
      brighten: 1.35,
      tint: "#aaaa64",
      tintMix: 0.45,
      roughness: 0,
      textureScale: 0.95,
      textureOpacity: 1,
    },
    ceiling: {
      brighten: 1.25,
      tint: "#f7f5b0",
      tintMix: 0.15,
      roughness: 1,
      textureScale: 2,
      textureOpacity: 1,
    },
    texture: {
      repeat: 1.25,
      anisotropy: 10,
      saturation: 1.05,
      contrast: 1.05,
    },
    lights: {
      tint: "#ffffff",
      tintMix: 0.15,
      emissiveIntensity: 1.5,
    },
  },
  renderer: {
    exposure: 0.3,
  },
  post: {
    bloomStrength: 0.15,
    bloomRadius: 0.5,
    bloomThreshold: 1.5,
  },
  fog: {
    nearScale: 3,
    farScale: 10,
  },
};
