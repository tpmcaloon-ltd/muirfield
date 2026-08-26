import * as THREE from "three";
import { classifySurface, isFluorescentMesh } from "./collision";
import { buildFillZones } from "./fillZones";
import {
  applySurfaceUniforms,
  applyZoneUniforms,
  createWorldFillMaterial,
} from "./worldFillMaterial";

const tintColor = new THREE.Color();

function isWorldFillMaterial(material) {
  return Boolean(material?.uniforms?.zoneCount);
}

function captureBaseColor(mesh, material) {
  if (mesh.userData.baseColor) {
    return;
  }

  if (material?.color) {
    mesh.userData.baseColor = material.color.clone();
  }
}

export function getSurfaceConfig(materialsConfig, surfaceType) {
  if (surfaceType === "floor") {
    return materialsConfig.floor;
  }

  if (surfaceType === "ceiling") {
    return materialsConfig.ceiling;
  }

  return materialsConfig.walls;
}

function resolveColor(mesh, surfaceType, materialsConfig) {
  const color = mesh.userData.baseColor.clone();
  const surfaceConfig = getSurfaceConfig(materialsConfig, surfaceType);

  tintColor.set(surfaceConfig.tint);
  return color.lerp(tintColor, surfaceConfig.tintMix);
}

function applyEmissiveBoost(material, emissiveBoost, lightsConfig) {
  if (!material?.color) {
    return;
  }

  if (!material.userData.baseColor) {
    material.userData.baseColor = material.color.clone();
  }

  tintColor.set(lightsConfig.tint);
  material.color
    .copy(material.userData.baseColor)
    .multiplyScalar(emissiveBoost)
    .lerp(tintColor, lightsConfig.tintMix);

  if (material.emissive) {
    if (!material.userData.baseEmissive) {
      material.userData.baseEmissive = material.emissive.clone();
    }

    material.emissive
      .copy(material.userData.baseEmissive)
      .multiplyScalar(emissiveBoost * lightsConfig.emissiveIntensity);
  }

  if (typeof material.emissiveIntensity === "number") {
    material.emissiveIntensity = lightsConfig.emissiveIntensity * emissiveBoost;
  }
}

function configureTexture(map, textureConfig) {
  if (!map) {
    return;
  }

  map.anisotropy = textureConfig.anisotropy;
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(textureConfig.repeat, textureConfig.repeat);
  map.needsUpdate = true;
}

function upgradeMaterial(
  mesh,
  sourceMaterial,
  surfaceType,
  materialsConfig,
  zones,
) {
  captureBaseColor(mesh, sourceMaterial);
  mesh.userData.surfaceType = surfaceType;

  const surfaceConfig = getSurfaceConfig(materialsConfig, surfaceType);
  const tint = resolveColor(mesh, surfaceType, materialsConfig);

  if (isWorldFillMaterial(sourceMaterial)) {
    sourceMaterial.uniforms.color.value.copy(tint);
    applySurfaceUniforms(
      sourceMaterial,
      surfaceConfig,
      materialsConfig.texture,
    );
    applyZoneUniforms(sourceMaterial, zones);
    return sourceMaterial;
  }

  configureTexture(sourceMaterial.map, materialsConfig.texture);

  const worldFillMaterial = createWorldFillMaterial(
    sourceMaterial,
    tint,
    surfaceConfig,
    materialsConfig.texture,
  );
  applyZoneUniforms(worldFillMaterial, zones);
  sourceMaterial.dispose?.();

  return worldFillMaterial;
}

export function prepareMaterials(object, lighting, materialsConfig) {
  const zones = buildFillZones(lighting);

  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    child.castShadow = false;
    child.receiveShadow = false;

    const isLight = isFluorescentMesh(child);

    if (isLight) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((material) => {
        if (!material) {
          return;
        }

        material.needsUpdate = true;
        configureTexture(material.map, materialsConfig.texture);
        applyEmissiveBoost(
          material,
          lighting.emissiveBoost,
          materialsConfig.lights,
        );
      });
      return;
    }

    const surfaceType = classifySurface(child);
    const sourceMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    const nextMaterials = sourceMaterials.map((sourceMaterial) =>
      sourceMaterial
        ? upgradeMaterial(
            child,
            sourceMaterial,
            surfaceType,
            materialsConfig,
            zones,
          )
        : sourceMaterial,
    );

    child.material = Array.isArray(child.material)
      ? nextMaterials
      : nextMaterials[0];
  });
}

export function updateMaterials(object, lighting, materialsConfig) {
  const zones = buildFillZones(lighting);

  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (isFluorescentMesh(child)) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach((material) => {
        configureTexture(material.map, materialsConfig.texture);
        applyEmissiveBoost(
          material,
          lighting.emissiveBoost,
          materialsConfig.lights,
        );
      });
      return;
    }

    const surfaceType = child.userData.surfaceType ?? classifySurface(child);
    const surfaceConfig = getSurfaceConfig(materialsConfig, surfaceType);
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (!isWorldFillMaterial(material)) {
        return;
      }

      if (child.userData.baseColor) {
        const tint = resolveColor(child, surfaceType, materialsConfig);
        material.uniforms.color.value.copy(tint);
      }

      applySurfaceUniforms(material, surfaceConfig, materialsConfig.texture);
      applyZoneUniforms(material, zones);
    });
  });
}

export function updateFillZones(object, lighting) {
  const zones = buildFillZones(lighting);

  object.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (isWorldFillMaterial(material)) {
        applyZoneUniforms(material, zones);
      }
    });
  });
}

export function updateEmissiveBoost(object, emissiveBoost, lightsConfig) {
  object.traverse((child) => {
    if (!child.isMesh || !isFluorescentMesh(child)) {
      return;
    }

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      applyEmissiveBoost(material, emissiveBoost, lightsConfig);
    });
  });
}
