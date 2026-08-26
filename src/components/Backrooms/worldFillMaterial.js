import * as THREE from "three";

const MAX_ZONES = 8;

export const WorldFillShader = {
  name: "WorldFillShader",

  uniforms: {
    map: { value: null },
    color: { value: new THREE.Color(1, 1, 1) },
    opacity: { value: 1 },
    hasMap: { value: false },
    brighten: { value: 1 },
    tint: { value: new THREE.Color(1, 1, 1) },
    tintMix: { value: 0 },
    roughness: { value: 0.9 },
    textureScale: { value: 1 },
    textureOpacity: { value: 1 },
    saturation: { value: 1 },
    contrast: { value: 1 },
    viewCameraPos: { value: new THREE.Vector3() },
    zoneCount: { value: 0 },
    zonePositions: {
      value: Array.from({ length: MAX_ZONES }, () => new THREE.Vector2()),
    },
    zoneRadii: { value: new Float32Array(MAX_ZONES) },
    zoneBrightens: { value: new Float32Array(MAX_ZONES) },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D map;
    uniform vec3 color;
    uniform float opacity;
    uniform bool hasMap;
    uniform float brighten;
    uniform vec3 tint;
    uniform float tintMix;
    uniform float roughness;
    uniform float textureScale;
    uniform float textureOpacity;
    uniform float saturation;
    uniform float contrast;
    uniform vec3 viewCameraPos;
    uniform int zoneCount;
    uniform vec2 zonePositions[${MAX_ZONES}];
    uniform float zoneRadii[${MAX_ZONES}];
    uniform float zoneBrightens[${MAX_ZONES}];

    varying vec2 vUv;
    varying vec3 vWorldPos;
    varying vec3 vWorldNormal;

    vec3 applySaturation(vec3 value, float amount) {
      float luma = dot(value, vec3(0.2126, 0.7152, 0.0722));
      return mix(vec3(luma), value, amount);
    }

    vec3 applyContrast(vec3 value, float amount) {
      return (value - 0.5) * amount + 0.5;
    }

    float zoneBoost() {
      float boost = 1.0;

      for (int i = 0; i < ${MAX_ZONES}; i++) {
        if (i >= zoneCount) {
          break;
        }

        vec2 delta = vWorldPos.xz - zonePositions[i];
        float dist = length(delta);

        if (dist < zoneRadii[i]) {
          float falloff = 1.0 - dist / zoneRadii[i];
          float zoneBrighten = 1.0 + (zoneBrightens[i] - 1.0) * falloff;
          boost = max(boost, zoneBrighten);
        }
      }

      return boost;
    }

    void main() {
      vec2 uv = vUv * textureScale;
      vec4 texColor = hasMap ? texture2D(map, uv) : vec4(1.0);

      vec3 texSample = texColor.rgb;
      texSample = applySaturation(texSample, saturation);
      texSample = applyContrast(texSample, contrast);

      float mapMix = hasMap ? textureOpacity : 1.0;
      vec3 albedo = mix(vec3(1.0), texSample, mapMix);
      albedo *= brighten;
      albedo = mix(albedo, albedo * tint, tintMix);
      albedo *= color;

      vec3 normal = normalize(vWorldNormal);
      vec3 viewDir = normalize(viewCameraPos - vWorldPos);
      vec3 lightDir = normalize(vec3(0.22, 1.0, 0.18));
      float diffuse = max(dot(normal, lightDir), 0.0);
      float ambient = 0.68 + diffuse * 0.32 * (1.0 - roughness * 0.45);

      vec3 halfDir = normalize(lightDir + viewDir);
      float specPower = mix(4.0, 72.0, 1.0 - roughness);
      float spec = pow(max(dot(normal, halfDir), 0.0), specPower);
      spec *= (1.0 - roughness) * 0.1;

      float boost = zoneBoost();
      vec3 lit = albedo * ambient * boost + vec3(spec);

      gl_FragColor = vec4(lit, texColor.a * opacity);
    }
  `,
};

export function applyZoneUniforms(material, zones) {
  if (!material?.uniforms) {
    return;
  }

  const count = Math.min(zones.length, MAX_ZONES);
  material.uniforms.zoneCount.value = count;

  for (let index = 0; index < MAX_ZONES; index += 1) {
    const zone = zones[index];

    if (zone) {
      material.uniforms.zonePositions.value[index].set(zone.x, zone.z);
      material.uniforms.zoneRadii.value[index] = zone.radius;
      material.uniforms.zoneBrightens.value[index] = zone.brighten;
    } else {
      material.uniforms.zoneRadii.value[index] = 0;
      material.uniforms.zoneBrightens.value[index] = 1;
    }
  }

  material.uniformsNeedUpdate = true;
  material.needsUpdate = true;
}

export function applySurfaceUniforms(material, surfaceConfig, textureConfig) {
  if (!material?.uniforms) {
    return;
  }

  material.uniforms.brighten.value = surfaceConfig.brighten;
  material.uniforms.tint.value.set(surfaceConfig.tint);
  material.uniforms.tintMix.value = surfaceConfig.tintMix;
  material.uniforms.roughness.value = surfaceConfig.roughness;
  material.uniforms.textureScale.value =
    surfaceConfig.textureScale * textureConfig.repeat;
  material.uniforms.textureOpacity.value = surfaceConfig.textureOpacity;
  material.uniforms.saturation.value = textureConfig.saturation;
  material.uniforms.contrast.value = textureConfig.contrast;
  material.uniformsNeedUpdate = true;
  material.needsUpdate = true;
}

export function createWorldFillMaterial(
  sourceMaterial,
  color,
  surfaceConfig,
  textureConfig,
) {
  const uniforms = THREE.UniformsUtils.clone(WorldFillShader.uniforms);
  uniforms.color.value = color.clone();
  uniforms.opacity.value = sourceMaterial.opacity ?? 1;
  uniforms.hasMap.value = Boolean(sourceMaterial.map);

  if (sourceMaterial.map) {
    uniforms.map.value = sourceMaterial.map;
  }

  const material = new THREE.ShaderMaterial({
    name: "WorldFillMaterial",
    uniforms,
    vertexShader: WorldFillShader.vertexShader,
    fragmentShader: WorldFillShader.fragmentShader,
    transparent: sourceMaterial.transparent ?? false,
    side: sourceMaterial.side ?? THREE.FrontSide,
    depthWrite: sourceMaterial.depthWrite ?? true,
  });

  applySurfaceUniforms(material, surfaceConfig, textureConfig);
  return material;
}

export function updateCameraUniform(object, cameraPosition) {
  object.traverse((child) => {
    if (!child.isMesh || !child.material?.uniforms?.viewCameraPos) {
      return;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      material.uniforms.viewCameraPos.value.copy(cameraPosition);
    });
  });
}
