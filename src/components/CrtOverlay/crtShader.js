export const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const fragmentShader = /* glsl */ `
  uniform float iTime;
  uniform vec2 iResolution;

  uniform float uIntensity;

  uniform float uScanBase;
  uniform float uScanAmp;
  uniform float uScanSpeed;
  uniform float uScanScale;
  uniform float uScanPower;
  uniform float uScanFloor;
  uniform float uScanCeil;
  uniform float uScanStrength;

  uniform float uVignetteStrength;
  uniform float uVignettePower;

  uniform float uRgbMaskStrength;

  uniform float uFlickerStrength;
  uniform float uFlickerSpeed;
  uniform float uFlickerAmp;

  uniform vec3 uTint;

  varying vec2 vUv;

  void main() {
    vec2 q = gl_FragCoord.xy / iResolution.xy;

    float scans = clamp(
      uScanBase + uScanAmp * sin(uScanSpeed * iTime + q.y * iResolution.y * uScanScale),
      0.0,
      1.0
    );
    float scanline = mix(1.0, uScanFloor + uScanCeil * pow(scans, uScanPower), uScanStrength);

    float vigCorner = 16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y);
    float vignette = mix(1.0, pow(vigCorner, uVignettePower), uVignetteStrength);

    float rgbMask = 1.0 - uRgbMaskStrength * clamp((mod(gl_FragCoord.x, 2.0) - 1.0) * 2.0, 0.0, 1.0);

    float flicker = 1.0 - uFlickerAmp * (0.5 + 0.5 * sin(uFlickerSpeed * iTime)) * uFlickerStrength;

    vec3 modulation = uTint * scanline * vignette * rgbMask * flicker;
    modulation = mix(vec3(1.0), modulation, uIntensity);
    modulation = min(modulation, vec3(1.0));

    gl_FragColor = vec4(modulation, 1.0);
  }
`;
