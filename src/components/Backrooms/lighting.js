import * as THREE from "three";

export function getThemeBgColor(exposure = 1) {
  const hex =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim() || "#181503";

  const color = new THREE.Color(hex);

  if (exposure > 0 && exposure !== 1) {
    color.r = Math.min(color.r / exposure, 1);
    color.g = Math.min(color.g / exposure, 1);
    color.b = Math.min(color.b / exposure, 1);
  }

  return color;
}

export function getModelBounds(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  return {
    box,
    center,
    size,
    maxDim: Math.max(size.x, size.y, size.z),
  };
}

export function configureSceneFromModel(scene, camera, bounds, config) {
  const { maxDim } = bounds;
  const fogColor = getThemeBgColor(config.renderer.exposure);

  scene.background = fogColor;
  scene.fog = new THREE.Fog(
    fogColor,
    maxDim * config.fog.nearScale,
    maxDim * config.fog.farScale,
  );

  const far = Math.ceil(maxDim * config.camera.farScale);
  camera.far = far;
  camera.updateProjectionMatrix();

  return { far };
}
