export const crtConfig = {
  /** Overall overlay canvas opacity */
  opacity: 0.65,
  /** Effect strength blended toward neutral (1.0 = no effect) */
  intensity: 0.65,
  /** multiply = darken only, never lifts underlying brightness */
  blendMode: "multiply",

  scanlines: {
    base: 0.35,
    amplitude: 0.35,
    speed: 0.55,
    scale: 1.2,
    power: 1.7,
    floor: 0.4,
    ceiling: 0.7,
    strength: 0.55,
  },

  vignette: {
    strength: 0,
    power: 0.9,
  },

  rgbMask: {
    strength: 0.18,
  },

  flicker: {
    strength: 0.35,
    speed: 110.0,
    amplitude: 0.01,
  },

  tint: {
    r: 1,
    g: 1,
    b: 1,
  },
};
