export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const compositeFragmentShader = /* glsl */ `
  uniform sampler2D uVideo;
  uniform vec2 iResolution;
  uniform vec2 iVideoResolution;
  uniform float uVideoScale;

  varying vec2 vUv;

  vec2 coverUV(vec2 uv, float containerAspect, float contentAspect, float scale) {
    vec2 uvScale = vec2(1.0);

    if (containerAspect > contentAspect) {
      uvScale.y = containerAspect / contentAspect;
    } else {
      uvScale.x = contentAspect / containerAspect;
    }

    uvScale /= max(scale, 0.01);

    return (uv - 0.5) / uvScale + 0.5;
  }

  void main() {
    float containerAspect = iResolution.x / iResolution.y;
    float contentAspect = iVideoResolution.x / max(iVideoResolution.y, 1.0);
    vec2 videoUV = coverUV(vUv, containerAspect, contentAspect, uVideoScale);

    gl_FragColor = vec4(texture2D(uVideo, videoUV).rgb, 1.0);
  }
`;

export const postFragmentShader = /* glsl */ `
  uniform sampler2D iChannel0;
  uniform vec2 iResolution;
  uniform vec3 uBackgroundColor;
  uniform float uDistortEnabled;
  uniform float uDistortK1;
  uniform float uDistortK2;
  uniform float uVignetteEnabled;
  uniform vec2 uVignetteHalfSize;
  uniform float uVignetteRadius;
  uniform float uVignetteFeather;
  uniform float uChromaticAberrationEnabled;
  uniform float uChromaticAberrationStrength;
  uniform float uScanlinesEnabled;

  varying vec2 vUv;

  vec3 ChromaticAberration(vec2 uv, float strength) {
    vec3 color = texture2D(iChannel0, uv).rgb;
    color.r = texture2D(iChannel0, (uv - 0.5) * (1.0 + strength / iResolution.xy) + 0.5).r;
    color.b = texture2D(iChannel0, (uv - 0.5) * (1.0 - strength / iResolution.xy) + 0.5).b;
    return color;
  }

  vec2 BrownConradyDistortion(vec2 uv, float k1, float k2) {
    uv = uv * 2.0 - 1.0;

    float r2 = uv.x * uv.x + uv.y * uv.y;
    uv *= 1.0 + k1 * r2 + k2 * r2 * r2;

    uv = uv * 0.5 + 0.5;

    float scale = abs(k1) < 1.0 ? 1.0 - abs(k1) : 1.0 / (k1 + 1.0);
    uv = uv * scale - (scale * 0.5) + 0.5;

    return uv;
  }

  float Scanlines(vec2 uv) {
    return (abs(sin(iResolution.y * uv.y)) + abs(sin(iResolution.x * uv.x))) / 2.0;
  }

  float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
    vec2 q = abs(p) - halfSize + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
  }

  float Vignette(vec2 uv, vec2 halfSize, float radius, float feather) {
    float aspect = iResolution.x / iResolution.y;
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    float d = sdRoundedBox(p, halfSize * vec2(aspect, 1.0), radius);
    return smoothstep(0.0, feather, -d);
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    if (uDistortEnabled > 0.5) {
      uv = BrownConradyDistortion(uv, uDistortK1, uDistortK2);
    }

    vec3 result;
    if (uChromaticAberrationEnabled > 0.5) {
      result = ChromaticAberration(uv, uChromaticAberrationStrength);
    } else {
      result = texture2D(iChannel0, uv).rgb;
    }

    if (uScanlinesEnabled > 0.5) {
      result *= Scanlines(uv);
    }

    if (uVignetteEnabled > 0.5) {
      float vig = Vignette(uv, uVignetteHalfSize, uVignetteRadius, uVignetteFeather);
      result *= vig;
      result += uBackgroundColor * (1.0 - vig);
    }

    gl_FragColor = vec4(result, 1.0);
  }
`;
