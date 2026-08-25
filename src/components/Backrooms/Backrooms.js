"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import GUI from "lil-gui";
import { collectCollisionMeshes, moveWithCollision } from "./collision";
import {
  prepareMaterials,
  updateFillZones,
  updateEmissiveBoost,
  updateMaterials,
} from "./materials";
import {
  configureSceneFromModel,
  getModelBounds,
  getThemeBgColor,
} from "./lighting";
import { buildFillZones } from "./fillZones";
import { updateCameraUniform } from "./worldFillMaterial";
import { experienceConfig } from "./config";
import { bindButtonSoundEffects, playWhooshSound } from "@/lib/uiSounds";
import { isUrlFlagEnabled } from "@/lib/urlFlags";
import SceneStatusBar from "@/components/SceneStatusBar/SceneStatusBar";
import styles from "./Backrooms.module.css";
import AnimatedText from "@/components/AnimatedText/AnimatedText";
import Btn from "@/components/Btn/Btn";
import { playLandingCopyIn, playLandingCopyOut } from "./landingCopyAnimations";
import MobileMovementControls, {
  createTouchInputState,
  resetTouchInputState,
} from "./MobileMovementControls";

const MODEL_PATH = "/models/backrooms.glb";
const MOBILE_BREAKPOINT = 1000;
const MOVEMENT_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

const isForward = (keys) => keys.has("ArrowUp") || keys.has("KeyW");
const isBackward = (keys) => keys.has("ArrowDown") || keys.has("KeyS");
const isTurnLeft = (keys) => keys.has("ArrowLeft") || keys.has("KeyA");
const isTurnRight = (keys) => keys.has("ArrowRight") || keys.has("KeyD");
const isWalking = (keys) =>
  isForward(keys) || isBackward(keys) || isTurnLeft(keys) || isTurnRight(keys);
const isTurning = (keys) => isTurnLeft(keys) || isTurnRight(keys);

function getMovementState(pressedKeys, touchInput) {
  const forward = isForward(pressedKeys) || touchInput.forward;
  const backward = isBackward(pressedKeys) || touchInput.backward;
  const turnLeft = isTurnLeft(pressedKeys) || touchInput.turnLeft;
  const turnRight = isTurnRight(pressedKeys) || touchInput.turnRight;

  return {
    forward,
    backward,
    turnLeft,
    turnRight,
    walking: forward || backward || turnLeft || turnRight,
    turning: turnLeft || turnRight,
  };
}

function orientCameraToTarget(camera, target) {
  camera.lookAt(target);
  camera.rotation.order = "YXZ";
  camera.rotation.setFromQuaternion(camera.quaternion, "YXZ");
}

function applyInitialCamera(camera, config) {
  const { initialCamera, camera: cameraConfig } = config;
  camera.position.set(
    initialCamera.position.x,
    initialCamera.position.y,
    initialCamera.position.z,
  );
  camera.fov = cameraConfig.fov;
  camera.far = cameraConfig.far;
  camera.updateProjectionMatrix();
}

function applyModelRotation(model, rotation) {
  model.rotation.set(rotation.x, rotation.y, rotation.z, "YXZ");
}

function lerpModelRotation(model, from, to, alpha) {
  const fromQuaternion = getTargetQuaternion(from);
  const toQuaternion = getTargetQuaternion(to);
  model.quaternion.slerpQuaternions(fromQuaternion, toQuaternion, alpha);
  model.rotation.setFromQuaternion(model.quaternion, "YXZ");
}

function captureCameraPose(camera) {
  return {
    position: {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
    },
    rotation: {
      x: camera.rotation.x,
      y: camera.rotation.y,
      z: camera.rotation.z,
    },
  };
}

function getSceneTuneMode() {
  const isFullSceneTune = isUrlFlagEnabled("debugScene");
  const isLandingCameraTune = isUrlFlagEnabled("debugLanding");

  return {
    isDebug: isFullSceneTune || isLandingCameraTune,
    isFullDebug: isFullSceneTune,
  };
}

function formatLandingDebugHud(camera, modelRotation) {
  return [
    `camera: ${camera.position.x.toFixed(3)}, ${camera.position.y.toFixed(3)}, ${camera.position.z.toFixed(3)}`,
    `model: ${modelRotation.x.toFixed(3)}, ${modelRotation.y.toFixed(3)}, ${modelRotation.z.toFixed(3)}`,
  ].join("\n");
}

function exportLandingComposition(position, modelRotation) {
  return JSON.stringify(
    {
      initialCamera: {
        position: {
          x: Number(position.x.toFixed(3)),
          y: Number(position.y.toFixed(3)),
          z: Number(position.z.toFixed(3)),
        },
      },
      initialModel: {
        rotation: {
          x: Number(modelRotation.x.toFixed(3)),
          y: Number(modelRotation.y.toFixed(3)),
          z: Number(modelRotation.z.toFixed(3)),
        },
      },
    },
    null,
    2,
  );
}

function exportConfig(camera, config) {
  return JSON.stringify(
    {
      initialCamera: {
        position: {
          x: Number(camera.position.x.toFixed(3)),
          y: Number(camera.position.y.toFixed(3)),
          z: Number(camera.position.z.toFixed(3)),
        },
      },
      initialModel: config.initialModel,
      camera: {
        position: {
          x: Number(camera.position.x.toFixed(3)),
          y: Number(camera.position.y.toFixed(3)),
          z: Number(camera.position.z.toFixed(3)),
        },
        rotation: {
          x: Number(camera.rotation.x.toFixed(3)),
          y: Number(camera.rotation.y.toFixed(3)),
          z: Number(camera.rotation.z.toFixed(3)),
        },
        fov: camera.fov,
        far: camera.far,
      },
      movement: config.movement,
      lighting: config.lighting,
      materials: config.materials,
      renderer: config.renderer,
      post: config.post,
      fog: config.fog,
    },
    null,
    2,
  );
}

function dampYaw(current, target, lambda, delta) {
  const shortest = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  const alpha = 1 - Math.exp(-lambda * delta);
  return current + shortest * alpha;
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function getTargetQuaternion(rotation) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotation.x, rotation.y, rotation.z, "YXZ"),
  );
}

function computeApproachPoint(fromPosition, focus, stopDistance) {
  const toFocus = focus.clone().sub(fromPosition);
  const distance = toFocus.length();

  if (distance <= stopDistance) {
    return fromPosition.clone();
  }

  return focus.clone().addScaledVector(toFocus.normalize(), -stopDistance);
}

function getLookAtQuaternion(position, target, scratchCamera) {
  scratchCamera.position.copy(position);
  scratchCamera.lookAt(target);
  scratchCamera.rotation.order = "YXZ";
  scratchCamera.rotation.setFromQuaternion(scratchCamera.quaternion, "YXZ");
  return scratchCamera.quaternion.clone();
}

export default function Backrooms({ isLandingReady = true }) {
  const containerRef = useRef(null);
  const cameraHudRef = useRef(null);
  const cameraStateRef = useRef(null);
  const enterExperienceRef = useRef(null);
  const exitExperienceRef = useRef(null);
  const landingCopyRef = useRef(null);
  const playLandingCopyInRef = useRef(() => {});
  const rampBloomInRef = useRef(() => {});
  const rampBloomOutRef = useRef(() => {});
  const [debug, setDebug] = useState(false);
  const [fullDebug, setFullDebug] = useState(false);
  const [showEnterButton, setShowEnterButton] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const touchInputRef = useRef(createTouchInputState());
  const isMobileViewportRef = useRef(false);
  const [status, setStatus] = useState({
    connected: 3,
    engine: "WebGL",
    frameMs: 0,
    fps: 0,
  });

  useEffect(() => {
    const MIN_CONNECTED = 1;
    const MAX_CONNECTED = 14;
    let connected = 3;
    let timeoutId = 0;

    const scheduleConnectedChange = () => {
      const delay = 1500 + Math.random() * 6500;

      timeoutId = window.setTimeout(() => {
        const step = Math.random() < 0.5 ? 1 : 2;
        const direction = Math.random() < 0.5 ? -1 : 1;
        connected = Math.min(
          MAX_CONNECTED,
          Math.max(MIN_CONNECTED, connected + direction * step),
        );

        setStatus((prev) => ({ ...prev, connected }));
        scheduleConnectedChange();
      }, delay);
    };

    scheduleConnectedChange();

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      isMobileViewportRef.current = mobile;
      setIsMobileViewport(mobile);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  playLandingCopyInRef.current = () => {
    if (landingCopyRef.current) {
      playLandingCopyIn(landingCopyRef.current);
    }
  };

  useEffect(() => {
    if (!isLandingReady) {
      return undefined;
    }

    let frameId = 0;

    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(() => {
        playLandingCopyInRef.current();
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isLandingReady]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    const { isDebug, isFullDebug } = getSceneTuneMode();
    setDebug(isDebug);
    setFullDebug(isFullDebug);
    setShowEnterButton(true);
    setShowBackButton(false);
    const config = structuredClone(experienceConfig);
    const pressedKeys = new Set();

    const scene = new THREE.Scene();
    scene.background = getThemeBgColor(config.renderer.exposure);

    const camera = new THREE.PerspectiveCamera(
      config.camera.fov,
      container.clientWidth / container.clientHeight,
      0.08,
      config.camera.far,
    );
    applyInitialCamera(camera, config);
    const landingCamera = {
      position: { ...config.initialCamera.position },
      rotation: { x: 0, y: 0, z: 0 },
    };
    const landingModelRotation = { ...config.initialModel.rotation };
    const gameplayModelRotation = { x: 0, y: 0, z: 0 };
    const gameplayCamera = {
      position: { ...config.camera.position },
      rotation: { ...config.camera.rotation },
    };
    camera.rotation.order = "YXZ";

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.LinearToneMapping;
    renderer.toneMappingExposure = config.renderer.exposure;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);
    renderer.domElement.className = styles.canvas;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      0,
      config.post.bloomRadius,
      config.post.bloomThreshold,
    );
    composer.addPass(bloomPass);
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    let controls = null;
    let gui = null;
    let model = null;
    let modelBounds = null;
    let fillZoneHelpers = null;
    let collisionMeshes = [];
    let moveSpeed = 0;
    let movementYaw = camera.rotation.y;
    let targetYaw = movementYaw;
    let hasStartedMoving = false;
    let wasFpsActive = false;
    let skipLandingOrientOnce = false;
    let skipDebugControlsUpdateOnce = false;
    let hasRevealedLandingCopy = false;
    let hasRevealedBackButton = false;
    let experiencePhase = "landing";
    let touchLookPointerId = null;
    let lastTouchLookX = 0;
    let enterProgress = 0;
    const enterFrom = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
    };
    const enterTo = {
      position: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
    };
    const entryLookTarget = new THREE.Vector3();

    if (isDebug) {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.enableRotate = false;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.target.set(
        camera.position.x,
        camera.position.y,
        camera.position.z - 2,
      );
    }

    const movementDirection = new THREE.Vector3();
    const movementDelta = new THREE.Vector3();
    const mouseTarget = { x: 0, y: 0 };
    const mouseCurrent = { x: 0, y: 0 };
    const transitionModelFrom = { x: 0, y: 0, z: 0 };
    const transitionModelTo = { x: 0, y: 0, z: 0 };
    const transitionFocus = new THREE.Vector3();
    const approachPoint = new THREE.Vector3();
    const transitionPosition = new THREE.Vector3();
    const lookAtScratch = new THREE.PerspectiveCamera();
    const landingLookQuaternion = new THREE.Quaternion();

    const syncLandingFromView = () => {
      Object.assign(config.initialCamera.position, {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });

      orientLandingCamera();

      const pose = captureCameraPose(camera);
      Object.assign(landingCamera.position, pose.position);
      Object.assign(landingCamera.rotation, pose.rotation);
    };

    const syncLandingStateFromCamera = () => {
      Object.assign(config.initialCamera.position, {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      });

      const pose = captureCameraPose(camera);
      Object.assign(landingCamera.position, pose.position);
      Object.assign(landingCamera.rotation, pose.rotation);
    };

    const getModelLookTarget = () => {
      if (!model) {
        return entryLookTarget;
      }

      return getModelBounds(model).center;
    };

    const orientLandingCamera = () => {
      const lookTarget = getModelLookTarget();
      entryLookTarget.copy(lookTarget);
      orientCameraToTarget(camera, lookTarget);
    };

    const applyLandingComposition = () => {
      if (!model) {
        return;
      }

      applyModelRotation(model, config.initialModel.rotation);
      Object.assign(landingModelRotation, config.initialModel.rotation);

      camera.position.set(
        config.initialCamera.position.x,
        config.initialCamera.position.y,
        config.initialCamera.position.z,
      );

      orientLandingCamera();

      const pose = captureCameraPose(camera);
      Object.assign(landingCamera.position, pose.position);
      Object.assign(landingCamera.rotation, pose.rotation);

      if (controls) {
        controls.enableRotate = false;
        syncControlsToCamera();
      }
    };

    const updateDebugCameraHud = () => {
      cameraStateRef.current = {
        position: { ...config.initialCamera.position },
        rotation: { ...config.initialModel.rotation },
      };

      if (cameraHudRef.current) {
        cameraHudRef.current.textContent = formatLandingDebugHud(
          camera,
          config.initialModel.rotation,
        );
      }
    };

    const loader = new GLTFLoader();
    loader.load(MODEL_PATH, (gltf) => {
      model = gltf.scene;
      prepareMaterials(model, config.lighting, config.materials);
      modelBounds = getModelBounds(model);
      entryLookTarget.copy(modelBounds.center);
      configureSceneFromModel(scene, camera, modelBounds, config);
      collisionMeshes = collectCollisionMeshes(model);
      scene.add(model);

      applyLandingComposition();
      movementYaw = camera.rotation.y;
      targetYaw = movementYaw;
      updateDebugCameraHud();

      if (isDebug && controls && modelBounds) {
        controls.target.copy(modelBounds.center);
        controls.update();
      }

      if (isDebug && config.lighting.fillZones) {
        fillZoneHelpers = new THREE.Group();
        fillZoneHelpers.name = "FillZoneDebug";

        buildFillZones(config.lighting).forEach((zone) => {
          const helper = new THREE.Mesh(
            new THREE.SphereGeometry(zone.radius, 16, 12),
            new THREE.MeshBasicMaterial({
              color: 0xfff2a8,
              transparent: true,
              opacity: 0.08,
              depthWrite: false,
              wireframe: true,
            }),
          );
          helper.position.set(zone.x, 1.5, zone.z);
          helper.userData.zoneLabel = zone.label;
          fillZoneHelpers.add(helper);
        });

        scene.add(fillZoneHelpers);
      }
    });

    const onKeyDown = (event) => {
      if (!MOVEMENT_KEYS.has(event.code)) {
        return;
      }

      event.preventDefault();
      pressedKeys.add(event.code);
    };

    const onKeyUp = (event) => {
      if (!MOVEMENT_KEYS.has(event.code)) {
        return;
      }

      pressedKeys.delete(event.code);
    };

    const syncControlsToCamera = () => {
      if (!controls) {
        return;
      }

      camera.getWorldDirection(movementDirection);
      controls.target
        .copy(camera.position)
        .addScaledVector(movementDirection, 2);
      controls.update();
      movementYaw = camera.rotation.y;
      targetYaw = movementYaw;
    };

    const prepareApproachPath = (viewPosition, focus) => {
      transitionFocus.copy(focus);
      approachPoint.copy(
        computeApproachPoint(
          viewPosition,
          transitionFocus,
          config.entry.approachDistance,
        ),
      );
    };

    const captureLandingEndPose = () => {
      enterTo.position.set(
        landingCamera.position.x,
        landingCamera.position.y,
        landingCamera.position.z,
      );

      if (!model) {
        enterTo.quaternion.copy(getTargetQuaternion(landingCamera.rotation));
        return;
      }

      const previewPosition = camera.position.clone();
      const previewQuaternion = camera.quaternion.clone();
      const previewModelRotation = {
        x: model.rotation.x,
        y: model.rotation.y,
        z: model.rotation.z,
      };

      applyModelRotation(model, landingModelRotation);
      camera.position.copy(enterTo.position);
      orientLandingCamera();
      enterTo.position.copy(camera.position);
      enterTo.quaternion.copy(camera.quaternion);
      Object.assign(landingCamera.rotation, captureCameraPose(camera).rotation);

      applyModelRotation(model, previewModelRotation);
      camera.position.copy(previewPosition);
      camera.quaternion.copy(previewQuaternion);
    };

    const startEnterExperience = () => {
      if (experiencePhase !== "landing") {
        return;
      }

      Object.assign(landingModelRotation, config.initialModel.rotation);

      if (model) {
        applyModelRotation(model, landingModelRotation);
      }

      const pose = captureCameraPose(camera);
      Object.assign(landingCamera.position, pose.position);
      Object.assign(landingCamera.rotation, pose.rotation);

      if (isDebug && controls) {
        controls.enabled = false;
        controls.state = -1;
      }

      enterFrom.position.copy(camera.position);
      enterFrom.quaternion.copy(camera.quaternion);
      enterTo.position.set(
        gameplayCamera.position.x,
        gameplayCamera.position.y,
        gameplayCamera.position.z,
      );
      enterTo.quaternion.copy(getTargetQuaternion(gameplayCamera.rotation));
      Object.assign(transitionModelFrom, landingModelRotation);
      Object.assign(transitionModelTo, gameplayModelRotation);
      prepareApproachPath(enterFrom.position, getModelLookTarget());

      experiencePhase = "entering";
      enterProgress = 0;
      hasRevealedLandingCopy = false;
      hasRevealedBackButton = false;
    };

    const startExitExperience = () => {
      if (experiencePhase !== "playing") {
        return;
      }

      enterFrom.position.copy(camera.position);
      enterFrom.quaternion.copy(camera.quaternion);
      captureLandingEndPose();
      Object.assign(transitionModelFrom, gameplayModelRotation);
      Object.assign(transitionModelTo, landingModelRotation);

      const previewModelRotation = {
        x: model.rotation.x,
        y: model.rotation.y,
        z: model.rotation.z,
      };
      applyModelRotation(model, landingModelRotation);
      prepareApproachPath(enterTo.position, getModelLookTarget());
      applyModelRotation(model, previewModelRotation);

      if (isDebug && controls) {
        controls.enabled = false;
        controls.state = -1;
      }

      experiencePhase = "exiting";
      enterProgress = 0;
      hasRevealedLandingCopy = false;
      hasRevealedBackButton = false;
      setIsPlaying(false);
      pressedKeys.clear();
      moveSpeed = 0;
      resetTouchInputState(touchInputRef);
      touchLookPointerId = null;
      mouseTarget.x = 0;
      mouseTarget.y = 0;
      mouseCurrent.x = 0;
      mouseCurrent.y = 0;
      setShowBackButton(false);
    };

    enterExperienceRef.current = startEnterExperience;
    exitExperienceRef.current = startExitExperience;

    let bloomTween = null;

    const rampBloomIn = (delay = config.entry.bloomFadeInDelay) => {
      bloomTween?.kill();
      bloomTween = gsap.to(bloomPass, {
        strength: config.post.bloomStrength,
        duration: config.entry.bloomFadeInDuration,
        delay,
        ease: "power2.inOut",
      });
    };

    const rampBloomOut = (delay = config.entry.bloomFadeOutDelay) => {
      bloomTween?.kill();
      bloomTween = gsap.to(bloomPass, {
        strength: 0,
        duration: config.entry.bloomFadeOutDuration,
        delay,
        ease: "power2.inOut",
      });
    };

    rampBloomInRef.current = rampBloomIn;
    rampBloomOutRef.current = rampBloomOut;

    const syncGameplayFromCamera = () => {
      const pose = captureCameraPose(camera);
      Object.assign(gameplayCamera.position, pose.position);
      Object.assign(gameplayCamera.rotation, pose.rotation);
      Object.assign(config.camera.position, pose.position);
      Object.assign(config.camera.rotation, pose.rotation);
      movementYaw = pose.rotation.y;
      targetYaw = movementYaw;
    };

    const applyExperienceTransition = (progress, phase) => {
      const t = easeInOutCubic(THREE.MathUtils.clamp(progress, 0, 1));
      const oneMinusT = 1 - t;

      transitionPosition
        .copy(enterFrom.position)
        .multiplyScalar(oneMinusT * oneMinusT)
        .addScaledVector(approachPoint, 2 * oneMinusT * t)
        .addScaledVector(enterTo.position, t * t);
      camera.position.copy(transitionPosition);

      if (model) {
        lerpModelRotation(model, transitionModelFrom, transitionModelTo, t);
      }

      if (phase === "entering") {
        camera.quaternion.slerpQuaternions(
          enterFrom.quaternion,
          enterTo.quaternion,
          t,
        );
      } else {
        landingLookQuaternion.copy(
          getLookAtQuaternion(enterTo.position, transitionFocus, lookAtScratch),
        );
        camera.quaternion.slerpQuaternions(
          enterFrom.quaternion,
          landingLookQuaternion,
          t,
        );
      }

      camera.rotation.setFromQuaternion(camera.quaternion, "YXZ");
    };

    const finishEnterTransition = () => {
      syncGameplayFromCamera();
      experiencePhase = "playing";
      hasStartedMoving = false;
      wasFpsActive = false;
      moveSpeed = 0;
      mouseTarget.x = 0;
      mouseTarget.y = 0;
      mouseCurrent.x = 0;
      mouseCurrent.y = 0;
      setIsPlaying(true);

      if (isDebug && controls) {
        syncControlsToCamera();
        skipDebugControlsUpdateOnce = true;
      }
    };

    const finishExitTransition = () => {
      experiencePhase = "landing";
      hasStartedMoving = false;
      setIsPlaying(false);
      resetTouchInputState(touchInputRef);
      touchLookPointerId = null;
      wasFpsActive = false;
      skipLandingOrientOnce = true;
      moveSpeed = 0;
      mouseTarget.x = 0;
      mouseTarget.y = 0;
      mouseCurrent.x = 0;
      mouseCurrent.y = 0;

      const pose = captureCameraPose(camera);
      Object.assign(landingCamera.position, pose.position);
      Object.assign(landingCamera.rotation, pose.rotation);
      Object.assign(config.initialCamera.position, pose.position);
      Object.assign(config.initialModel.rotation, landingModelRotation);
      movementYaw = pose.rotation.y;
      targetYaw = movementYaw;

      if (isDebug && controls) {
        controls.enabled = true;
        syncControlsToCamera();
        skipDebugControlsUpdateOnce = true;
      }
    };

    const yawDelta = () =>
      Math.atan2(
        Math.sin(targetYaw - movementYaw),
        Math.cos(targetYaw - movementYaw),
      );

    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrame = 0;
    const statusMetricsRef = {
      frameCount: 0,
      windowStart: performance.now(),
    };

    const animate = (timestamp) => {
      animationFrame = window.requestAnimationFrame(animate);

      statusMetricsRef.frameCount += 1;
      const elapsed = performance.now() - statusMetricsRef.windowStart;

      if (elapsed >= 1000) {
        if (elapsed <= 2500) {
          const rawFps = (statusMetricsRef.frameCount * 1000) / elapsed;
          const fps = Math.min(120, Math.max(1, Math.round(rawFps)));
          const frameMs = 1000 / fps;

          setStatus((prev) => ({
            ...prev,
            frameMs,
            fps,
          }));
        }

        statusMetricsRef.frameCount = 0;
        statusMetricsRef.windowStart = performance.now();
      }

      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.05);

      const movement = getMovementState(pressedKeys, touchInputRef.current);
      const walking = movement.walking;
      const turning = movement.turning;

      if (experiencePhase === "entering" || experiencePhase === "exiting") {
        enterProgress = Math.min(
          1,
          enterProgress + delta / config.entry.duration,
        );

        applyExperienceTransition(enterProgress, experiencePhase);

        if (
          experiencePhase === "entering" &&
          enterProgress >= config.entry.backButtonReveal &&
          !hasRevealedBackButton
        ) {
          hasRevealedBackButton = true;
          setShowBackButton(true);
        }

        if (
          experiencePhase === "exiting" &&
          enterProgress >= config.entry.landingCopyReveal &&
          !hasRevealedLandingCopy
        ) {
          hasRevealedLandingCopy = true;
          setShowEnterButton(true);
          requestAnimationFrame(() => {
            playLandingCopyInRef.current();
          });
        }

        if (enterProgress >= 1) {
          applyExperienceTransition(1, experiencePhase);

          if (experiencePhase === "entering") {
            finishEnterTransition();
          } else if (experiencePhase === "exiting") {
            finishExitTransition();
          }
        }
      } else if (experiencePhase === "landing") {
        if (isDebug && controls) {
          controls.enableRotate = false;
          controls.enabled = true;

          if (skipDebugControlsUpdateOnce) {
            skipDebugControlsUpdateOnce = false;
          } else {
            controls.update();
          }

          if (skipLandingOrientOnce) {
            skipLandingOrientOnce = false;
            syncLandingStateFromCamera();
          } else {
            syncLandingFromView();
          }

          updateDebugCameraHud();
        }
      } else if (experiencePhase === "playing") {
        if (walking || turning) {
          hasStartedMoving = true;
        }

        const isCoasting =
          Math.abs(moveSpeed) > 0.001 || Math.abs(yawDelta()) > 0.0001;
        const fpsActive = !isDebug || walking || turning || isCoasting;

        if (fpsActive && !wasFpsActive) {
          movementYaw = camera.rotation.y;
          if (config.parallax.enabled && !isMobileViewportRef.current) {
            movementYaw += mouseCurrent.x * config.parallax.maxYaw;
          }
          targetYaw = movementYaw;
        }

        if (fpsActive) {
          let targetMove = 0;

          if (movement.turning) {
            if (movement.turnLeft) {
              targetYaw += config.movement.turnSpeed * delta;
            }
            if (movement.turnRight) {
              targetYaw -= config.movement.turnSpeed * delta;
            }
          }

          movementYaw = dampYaw(
            movementYaw,
            targetYaw,
            config.movement.turnDamping,
            delta,
          );

          if (movement.forward) {
            targetMove += config.movement.speed;
          }
          if (movement.backward) {
            targetMove -= config.movement.speed;
          }

          moveSpeed = THREE.MathUtils.damp(
            moveSpeed,
            targetMove,
            config.movement.moveDamping,
            delta,
          );

          if (Math.abs(moveSpeed) > 0.0001) {
            camera.getWorldDirection(movementDirection);
            movementDirection.y = 0;
            movementDirection.normalize();
            movementDelta
              .copy(movementDirection)
              .multiplyScalar(moveSpeed * delta);

            if (collisionMeshes.length > 0) {
              moveWithCollision(
                camera.position,
                movementDelta,
                collisionMeshes,
                config.movement.collisionRadius,
              );
            } else {
              camera.position.add(movementDelta);
            }
          }

          if (hasStartedMoving) {
            camera.position.y = config.movement.eyeHeight;
          }

          if (!config.parallax.enabled || isMobileViewportRef.current) {
            camera.rotation.y = movementYaw;
            camera.rotation.x = config.camera.rotation.x;
            camera.rotation.z = config.camera.rotation.z;
          }
        }

        if (isDebug && controls) {
          if (fpsActive) {
            controls.enabled = false;
            controls.state = -1;
          } else {
            if (wasFpsActive) {
              syncControlsToCamera();
            }

            controls.enabled = true;

            if (skipDebugControlsUpdateOnce) {
              skipDebugControlsUpdateOnce = false;
            } else {
              controls.update();
            }

            Object.assign(config.camera.position, {
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z,
            });
            Object.assign(config.camera.rotation, {
              x: camera.rotation.x,
              y: camera.rotation.y,
              z: camera.rotation.z,
            });
            syncGameplayFromCamera();
          }

          updateDebugCameraHud();
        }

        wasFpsActive = fpsActive;

        if (config.parallax.enabled && !isMobileViewportRef.current) {
          mouseCurrent.x = THREE.MathUtils.damp(
            mouseCurrent.x,
            mouseTarget.x,
            config.parallax.damping,
            delta,
          );
          mouseCurrent.y = THREE.MathUtils.damp(
            mouseCurrent.y,
            mouseTarget.y,
            config.parallax.damping,
            delta,
          );
          camera.rotation.y =
            movementYaw - mouseCurrent.x * config.parallax.maxYaw;
          camera.rotation.x =
            config.camera.rotation.x -
            mouseCurrent.y * config.parallax.maxPitch;
          camera.rotation.z = config.camera.rotation.z;
        }
      }

      if (model) {
        updateCameraUniform(model, camera.position);
      }

      composer.render();
    };

    animationFrame = window.requestAnimationFrame(animate);

    const onResize = () => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
      composer.setSize(clientWidth, clientHeight);
      bloomPass.setSize(clientWidth, clientHeight);
    };

    const onPointerMove = (event) => {
      if (
        experiencePhase === "playing" &&
        isMobileViewportRef.current &&
        touchLookPointerId === event.pointerId
      ) {
        const deltaX = event.clientX - lastTouchLookX;
        lastTouchLookX = event.clientX;
        targetYaw -= deltaX * 0.006;
        return;
      }

      if (!config.parallax.enabled || isMobileViewportRef.current) {
        return;
      }

      if (experiencePhase !== "playing") {
        return;
      }

      mouseTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
    };

    const onPointerDown = (event) => {
      if (
        experiencePhase === "playing" &&
        isMobileViewportRef.current &&
        !event.target.closest("[data-touch-control]")
      ) {
        touchLookPointerId = event.pointerId;
        lastTouchLookX = event.clientX;
      }
    };

    const onPointerUp = (event) => {
      if (event.pointerId === touchLookPointerId) {
        touchLookPointerId = null;
      }
    };

    const onPointerLeave = () => {
      mouseTarget.x = 0;
      mouseTarget.y = 0;
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointerleave", onPointerLeave);

    const addCameraDebugControls = (guiInstance) => {
      const cameraFolder = guiInstance.addFolder("Initial camera");
      cameraFolder
        .add(config.initialCamera.position, "x", -120, 120, 0.01)
        .listen()
        .onChange(applyLandingComposition);
      cameraFolder
        .add(config.initialCamera.position, "y", 0, 30, 0.01)
        .listen()
        .onChange(applyLandingComposition);
      cameraFolder
        .add(config.initialCamera.position, "z", -120, 120, 0.01)
        .listen()
        .onChange(applyLandingComposition);

      const modelFolder = guiInstance.addFolder("Initial model");
      const applyModelComposition = () => {
        applyLandingComposition();
        updateDebugCameraHud();
      };
      modelFolder
        .add(config.initialModel.rotation, "x", -Math.PI / 2, Math.PI / 2, 0.01)
        .name("pitch (x)")
        .listen()
        .onChange(applyModelComposition);
      modelFolder
        .add(config.initialModel.rotation, "y", -Math.PI, Math.PI, 0.01)
        .name("yaw (y)")
        .listen()
        .onChange(applyModelComposition);
      modelFolder
        .add(config.initialModel.rotation, "z", -Math.PI / 4, Math.PI / 4, 0.01)
        .name("roll (z)")
        .listen()
        .onChange(applyModelComposition);

      cameraFolder.add(camera, "fov", 35, 110, 1).onChange(() => {
        camera.updateProjectionMatrix();
      });

      const cameraActions = {
        logInitialCamera() {
          console.log(
            exportLandingComposition(
              config.initialCamera.position,
              config.initialModel.rotation,
            ),
          );
        },
        async copyInitialCamera() {
          await navigator.clipboard.writeText(
            exportLandingComposition(
              config.initialCamera.position,
              config.initialModel.rotation,
            ),
          );
          console.log("Landing composition copied to clipboard.");
        },
      };

      guiInstance
        .add(cameraActions, "logInitialCamera")
        .name("Log landing composition");
      guiInstance
        .add(cameraActions, "copyInitialCamera")
        .name("Copy landing composition");
    };

    if (isDebug) {
      gui = new GUI({
        title: isFullDebug ? "Backrooms Debug" : "Initial Camera",
      });
      gui.domElement.style.zIndex = "20";

      addCameraDebugControls(gui);

      if (isFullDebug) {
        const movementFolder = gui.addFolder("Movement");
        movementFolder.add(camera, "far", 80, 800, 1).onChange(() => {
          camera.updateProjectionMatrix();
        });
        movementFolder.add(config.movement, "eyeHeight", 1, 2.4, 0.01);
        movementFolder.add(config.movement, "collisionRadius", 0.2, 0.8, 0.01);
        movementFolder
          .add(config.movement, "speed", 0.5, 6, 0.1)
          .name("Move speed");
        movementFolder
          .add(config.movement, "turnSpeed", 0.3, 3, 0.05)
          .name("Turn speed");
        movementFolder
          .add(config.movement, "moveDamping", 1, 20, 0.1)
          .name("Move smoothing");
        movementFolder
          .add(config.movement, "turnDamping", 1, 20, 0.1)
          .name("Turn smoothing");

        const lightingFolder = gui.addFolder("Lighting");
        const syncFillZoneHelpers = () => {
          if (!fillZoneHelpers) {
            return;
          }

          fillZoneHelpers.children.forEach((helper) => {
            const baseRadius = helper.geometry.parameters.radius;
            const scale = config.lighting.zoneRadius / baseRadius;
            helper.scale.set(scale, scale, scale);
          });
        };

        lightingFolder
          .add(config.lighting, "fillZones")
          .name("Fill zones")
          .onChange(() => {
            if (model) {
              updateFillZones(model, config.lighting);
            }
          });
        lightingFolder
          .add(config.lighting, "zoneBrighten", 1, 4.5, 0.05)
          .name("Zone brighten")
          .onChange(() => {
            if (model) {
              updateFillZones(model, config.lighting);
            }
          });
        lightingFolder
          .add(config.lighting, "zoneRadius", 4, 14, 0.25)
          .name("Zone radius")
          .onChange(() => {
            if (model) {
              updateFillZones(model, config.lighting);
            }
            syncFillZoneHelpers();
          });
        lightingFolder
          .add(config.lighting, "emissiveBoost", 0.8, 4, 0.05)
          .name("Panel brightness")
          .onChange((value) => {
            if (model) {
              updateEmissiveBoost(model, value, config.materials.lights);
            }
          });

        const refreshMaterials = () => {
          if (model) {
            updateMaterials(model, config.lighting, config.materials);
          }
        };

        const addSurfaceControls = (folder, surfaceConfig) => {
          folder
            .add(surfaceConfig, "brighten", 0.5, 3, 0.01)
            .name("Brighten")
            .onChange(refreshMaterials);
          folder.addColor(surfaceConfig, "tint").onChange(refreshMaterials);
          folder
            .add(surfaceConfig, "tintMix", 0, 1, 0.01)
            .name("Tint mix")
            .onChange(refreshMaterials);
          folder
            .add(surfaceConfig, "roughness", 0, 1, 0.01)
            .name("Roughness")
            .onChange(refreshMaterials);
          folder
            .add(surfaceConfig, "textureScale", 0.25, 4, 0.01)
            .name("Texture scale")
            .onChange(refreshMaterials);
          folder
            .add(surfaceConfig, "textureOpacity", 0, 1, 0.01)
            .name("Texture opacity")
            .onChange(refreshMaterials);
        };

        const syncThemeBackground = (exposure) => {
          const themeBg = getThemeBgColor(exposure);
          scene.background = themeBg;
          if (scene.fog) {
            scene.fog.color.copy(themeBg);
          }
        };

        const postFolder = gui.addFolder("Post");
        postFolder
          .add(config.renderer, "exposure", 0.2, 2.5, 0.01)
          .onChange((value) => {
            renderer.toneMappingExposure = value;
            syncThemeBackground(value);
          });
        postFolder
          .add(config.post, "bloomStrength", 0, 1.5, 0.01)
          .onChange((value) => {
            bloomPass.strength = value;
          });
        postFolder
          .add(config.post, "bloomRadius", 0, 1.5, 0.01)
          .onChange((value) => {
            bloomPass.radius = value;
          });
        postFolder
          .add(config.post, "bloomThreshold", 0, 1.5, 0.01)
          .onChange((value) => {
            bloomPass.threshold = value;
          });

        const materialFolder = gui.addFolder("Materials");
        addSurfaceControls(
          materialFolder.addFolder("Walls"),
          config.materials.walls,
        );
        addSurfaceControls(
          materialFolder.addFolder("Floor"),
          config.materials.floor,
        );
        addSurfaceControls(
          materialFolder.addFolder("Ceiling"),
          config.materials.ceiling,
        );

        const textureFolder = materialFolder.addFolder("Texture");
        textureFolder
          .add(config.materials.texture, "repeat", 0.25, 4, 0.01)
          .name("Repeat")
          .onChange(refreshMaterials);
        textureFolder
          .add(config.materials.texture, "anisotropy", 1, 16, 1)
          .name("Anisotropy")
          .onChange(refreshMaterials);
        textureFolder
          .add(config.materials.texture, "saturation", 0.5, 1.8, 0.01)
          .name("Saturation")
          .onChange(refreshMaterials);
        textureFolder
          .add(config.materials.texture, "contrast", 0.6, 1.6, 0.01)
          .name("Contrast")
          .onChange(refreshMaterials);

        const lightsFolder = materialFolder.addFolder("Light panels");
        lightsFolder
          .addColor(config.materials.lights, "tint")
          .onChange(refreshMaterials);
        lightsFolder
          .add(config.materials.lights, "tintMix", 0, 1, 0.01)
          .name("Tint mix")
          .onChange(refreshMaterials);
        lightsFolder
          .add(config.materials.lights, "emissiveIntensity", 0, 3, 0.01)
          .name("Emissive intensity")
          .onChange(refreshMaterials);

        const fogFolder = gui.addFolder("Fog");
        fogFolder
          .add(
            {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue("--color-bg")
                .trim(),
            },
            "color",
          )
          .name("Color (--color-bg)")
          .disable();
        fogFolder.add(config.fog, "nearScale", 1, 8, 0.1).onChange((value) => {
          if (modelBounds && scene.fog) {
            scene.fog.near = modelBounds.maxDim * value;
          }
        });
        fogFolder.add(config.fog, "farScale", 4, 20, 0.1).onChange((value) => {
          if (modelBounds && scene.fog) {
            scene.fog.far = modelBounds.maxDim * value;
          }
        });

        const actions = {
          logConfig() {
            console.log(exportConfig(camera, config));
          },
          async copyConfig() {
            await navigator.clipboard.writeText(exportConfig(camera, config));
            console.log("Backrooms config copied to clipboard.");
          },
        };

        gui.add(actions, "logConfig").name("Log config");
        gui.add(actions, "copyConfig").name("Copy config");
      }
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointerleave", onPointerLeave);
      controls?.dispose();
      gui?.destroy();
      bloomTween?.kill();
      enterExperienceRef.current = null;
      exitExperienceRef.current = null;
      rampBloomInRef.current = () => {};
      rampBloomOutRef.current = () => {};
      fillZoneHelpers?.removeFromParent();
      timer.dispose();
      composer.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  const copyInitialCamera = async () => {
    if (!cameraStateRef.current) {
      return;
    }

    const { position, rotation } = cameraStateRef.current;
    const payload = exportLandingComposition(position, rotation);

    await navigator.clipboard.writeText(payload);
    console.log("Landing composition copied to clipboard.");
  };

  const handleEnterExperience = () => {
    playWhooshSound(250);
    rampBloomInRef.current();
    playLandingCopyOut(landingCopyRef.current, {
      onComplete: () => setShowEnterButton(false),
    });
    enterExperienceRef.current?.();
  };

  const handleExitExperience = () => {
    playWhooshSound();
    rampBloomOutRef.current();
    exitExperienceRef.current?.();
  };

  const enterButtonProps = bindButtonSoundEffects({
    type: "button",
    className: styles.enterButton,
    onClick: handleEnterExperience,
  });

  const backButtonProps = bindButtonSoundEffects({
    type: "button",
    className: `${styles.backButton} ${showBackButton ? "" : styles.backButtonHidden}`,
    onClick: handleExitExperience,
    children: (
      <span className={`${styles.backButtonLabel} underline-hover`}>
        Escape
      </span>
    ),
  });

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isPlaying && isMobileViewport ? styles.containerPlaying : ""}`}
    >
      <div className={styles.enterOverlay}>
        <div
          ref={landingCopyRef}
          className={`${styles.landingCopy} ${showEnterButton ? "" : styles.landingCopyHidden}`}
        >
          {isLandingReady ? (
            <>
              <AnimatedText
                variant="variant1"
                animateOnScroll={false}
                autoPlay={false}
              >
                <h1 className={styles.landingTitle}>MUIRFIELD</h1>
              </AnimatedText>
              <AnimatedText
                variant="variant2"
                splitBy="words"
                animateOnScroll={false}
                autoPlay={false}
                delay={1.25}
              >
                <p className={styles.landingTagline}>everything must go</p>
              </AnimatedText>
              <Btn {...enterButtonProps}>Enter Experience</Btn>
            </>
          ) : null}
        </div>
      </div>
      <button {...backButtonProps} />
      <MobileMovementControls
        inputRef={touchInputRef}
        visible={showBackButton && isMobileViewport}
      />
      {debug ? (
        <div className={styles.debugPanel}>
          <div className={styles.debugBadge}>
            {fullDebug
              ? "Scene debug (?debugScene) — drag to orbit, scroll to zoom, enter/back to test transitions"
              : "Landing debug (?debugLanding) — drag to orbit, scroll to zoom, enter/back to test transitions"}
          </div>
          <pre ref={cameraHudRef} className={styles.cameraHud} />
          <button
            type="button"
            className={styles.copyCameraButton}
            onClick={copyInitialCamera}
          >
            Copy landing composition
          </button>
        </div>
      ) : null}
      <SceneStatusBar {...status} />
    </div>
  );
}
