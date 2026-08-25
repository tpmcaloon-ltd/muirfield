import * as THREE from "three";

const raycaster = new THREE.Raycaster();
const stepVector = new THREE.Vector3();
const probeOrigin = new THREE.Vector3();
const axisDelta = new THREE.Vector3();

export function isHorizontalSurface(mesh) {
  return classifySurface(mesh) !== "wall";
}

export function classifySurface(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  if (size.y < 0.35 && size.x > 0.8 && size.z > 0.8) {
    if (center.y < 1.2) {
      return "floor";
    }

    if (center.y > 2) {
      return "ceiling";
    }

    return "floor";
  }

  return "wall";
}

export function isFluorescentMesh(mesh) {
  const name = mesh.name.toLowerCase();
  if (/light|lamp|fluor|panel|emissive|bulb/.test(name)) {
    return true;
  }

  const materials = Array.isArray(mesh.material)
    ? mesh.material
    : [mesh.material];

  return materials.some((material) => {
    if (!material) {
      return false;
    }

    if (material.emissiveMap) {
      return true;
    }

    if (!material.emissive) {
      return false;
    }

    const emissiveStrength =
      material.emissive.r + material.emissive.g + material.emissive.b;

    return emissiveStrength > 0.35 && (material.emissiveIntensity ?? 1) > 0.2;
  });
}

export function collectCollisionMeshes(object) {
  const meshes = [];

  object.traverse((child) => {
    if (
      !child.isMesh ||
      isFluorescentMesh(child) ||
      isHorizontalSurface(child)
    ) {
      return;
    }

    meshes.push(child);
  });

  return meshes;
}

function hitsWall(position, collisionMeshes, radius) {
  probeOrigin.set(position.x, position.y, position.z);
  const samples = 12;

  for (let index = 0; index < samples; index += 1) {
    const angle = (index / samples) * Math.PI * 2;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));

    raycaster.set(probeOrigin, direction);
    raycaster.far = radius;

    if (raycaster.intersectObjects(collisionMeshes, false).length > 0) {
      return true;
    }
  }

  return false;
}

function isMovementBlocked(position, delta, collisionMeshes, radius) {
  const distance = delta.length();
  if (distance === 0) {
    return false;
  }

  axisDelta.copy(delta).normalize();
  raycaster.set(position, axisDelta);
  raycaster.far = distance + radius;

  const hit = raycaster.intersectObjects(collisionMeshes, false)[0];
  return Boolean(hit && hit.distance < distance + radius * 0.85);
}

function moveAxis(position, axis, amount, collisionMeshes, radius) {
  if (amount === 0) {
    return;
  }

  axisDelta.set(0, 0, 0);
  axisDelta[axis] = amount;

  if (isMovementBlocked(position, axisDelta, collisionMeshes, radius)) {
    return;
  }

  probeOrigin.set(position.x, position.y, position.z);
  probeOrigin[axis] += amount;

  if (!hitsWall(probeOrigin, collisionMeshes, radius)) {
    position[axis] = probeOrigin[axis];
  }
}

function moveStep(position, delta, collisionMeshes, radius) {
  moveAxis(position, "x", delta.x, collisionMeshes, radius);
  moveAxis(position, "z", delta.z, collisionMeshes, radius);
}

export function moveWithCollision(position, delta, collisionMeshes, radius) {
  const stepSize = 0.06;
  const steps = Math.max(1, Math.ceil(delta.length() / stepSize));

  stepVector.copy(delta).divideScalar(steps);

  for (let index = 0; index < steps; index += 1) {
    moveStep(position, stepVector, collisionMeshes, radius);
  }

  return position;
}
