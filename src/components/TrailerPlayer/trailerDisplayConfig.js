export const trailerDisplayConfig = {
  layout: {
    top: 0,
    left: 0,
    width: 100,
    height: 100,
    mobileTop: 0,
    mobileLeft: 0,
    mobileWidth: 100,
    mobileHeight: 100,
  },
  video: {
    scale: 1,
  },
  post: {
    distortEnabled: true,
    distortK1: 0.25,
    distortK2: 0.075,
    vignetteEnabled: true,
    vignetteHalfWidth: 0.45,
    vignetteHalfHeight: 0.5,
    vignetteRadius: 0.15,
    vignetteFeather: 0.025,
    chromaticAberrationEnabled: true,
    chromaticAberrationStrength: 20,
    scanlinesEnabled: true,
  },
  mobilePost: {
    distortEnabled: false,
    vignetteEnabled: false,
    chromaticAberrationEnabled: false,
    scanlinesEnabled: true,
  },
};

export function getEffectivePost(config, isMobile, isDebug = false) {
  if (!isMobile || isDebug) {
    return config.post;
  }

  return { ...config.post, ...config.mobilePost };
}

export function cloneTrailerDisplayConfig() {
  return JSON.parse(JSON.stringify(trailerDisplayConfig));
}

export function exportTrailerDisplayConfig(config) {
  return JSON.stringify(config, null, 2);
}
