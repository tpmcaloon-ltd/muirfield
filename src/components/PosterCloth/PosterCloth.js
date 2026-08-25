"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { vertexShader, fragmentShader } from "./shaders";
import styles from "./PosterCloth.module.css";

export const defaultPosterClothConfig = {
  imgSrc: "/images/poster.jpg",
  bgColor: "#181503",
  windForce: 0.2,
  fabricDetail: 0.45,
  shadowOpacity: 0.4,
  edgeScale: 8.8,
  edgeAmp: 0.0328,
  frameSize: 0.0,
  photoInset: 0.013,
  paperColor: "#f0ebe0",
  edgeShadowColor: "#000000",
  edgeShadowOpacity: 0.071,
  scratchAmp: 0.0106272,
  grainAmp: 0.034925,
  vignette: 0.0,
  seed: 0.0,
};

function applyTexture(texture, width, height, material, mesh) {
  material.uniforms.uTexture.value = texture;

  const aspect = width / height;
  material.uniforms.uRatio.value = aspect;

  const baseHeight = 1.3;
  mesh.scale.set(baseHeight * aspect, baseHeight, 1);
}

function syncUniforms(material, scene, config) {
  scene.background.set(config.bgColor);
  material.uniforms.uFabricFreq.value = config.fabricDetail;
  material.uniforms.uShadowOpacity.value = config.shadowOpacity;
  material.uniforms.uEdgeScale.value = config.edgeScale;
  material.uniforms.uEdgeAmp.value = config.edgeAmp;
  material.uniforms.uFrameSize.value = config.frameSize;
  material.uniforms.uPhotoInset.value = config.photoInset;
  material.uniforms.uPaperColor.value.set(config.paperColor);
  material.uniforms.uEdgeShadowColor.value.set(config.edgeShadowColor);
  material.uniforms.uEdgeShadowOpacity.value = config.edgeShadowOpacity;
  material.uniforms.uScratchAmp.value = config.scratchAmp;
  material.uniforms.uGrainAmp.value = config.grainAmp;
  material.uniforms.uVignette.value = config.vignette;
  material.uniforms.uSeed.value = config.seed;
}

export default function PosterCloth({
  imgSrc = defaultPosterClothConfig.imgSrc,
  bgColor = defaultPosterClothConfig.bgColor,
  windForce = defaultPosterClothConfig.windForce,
  fabricDetail = defaultPosterClothConfig.fabricDetail,
  shadowOpacity = defaultPosterClothConfig.shadowOpacity,
  edgeScale = defaultPosterClothConfig.edgeScale,
  edgeAmp = defaultPosterClothConfig.edgeAmp,
  frameSize = defaultPosterClothConfig.frameSize,
  photoInset = defaultPosterClothConfig.photoInset,
  paperColor = defaultPosterClothConfig.paperColor,
  edgeShadowColor = defaultPosterClothConfig.edgeShadowColor,
  edgeShadowOpacity = defaultPosterClothConfig.edgeShadowOpacity,
  scratchAmp = defaultPosterClothConfig.scratchAmp,
  grainAmp = defaultPosterClothConfig.grainAmp,
  vignette = defaultPosterClothConfig.vignette,
  seed = defaultPosterClothConfig.seed,
}) {
  const containerRef = useRef(null);
  const threeRef = useRef(null);

  const configRef = useRef({
    windForce,
    fabricDetail,
    shadowOpacity,
    edgeScale,
    edgeAmp,
    frameSize,
    photoInset,
    paperColor,
    edgeShadowColor,
    edgeShadowOpacity,
    scratchAmp,
    grainAmp,
    vignette,
    seed,
    bgColor,
  });

  configRef.current = {
    windForce,
    fabricDetail,
    shadowOpacity,
    edgeScale,
    edgeAmp,
    frameSize,
    photoInset,
    paperColor,
    edgeShadowColor,
    edgeShadowOpacity,
    scratchAmp,
    grainAmp,
    vignette,
    seed,
    bgColor,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 2.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = styles.canvas;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = false;

    const geometry = new THREE.PlaneGeometry(1, 1, 64, 64);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uRatio: { value: 1.0 },
        uTime: { value: 0 },
        uWindStrength: { value: 0.2 },
        uFabricFreq: { value: fabricDetail },
        uShadowOpacity: { value: shadowOpacity },
        uEdgeScale: { value: edgeScale },
        uEdgeAmp: { value: edgeAmp },
        uFrameSize: { value: frameSize },
        uPhotoInset: { value: photoInset },
        uPaperColor: { value: new THREE.Color(paperColor) },
        uScratchAmp: { value: scratchAmp },
        uGrainAmp: { value: grainAmp },
        uVignette: { value: vignette },
        uSeed: { value: seed },
        uEdgeShadowColor: { value: new THREE.Color(edgeShadowColor) },
        uEdgeShadowOpacity: { value: edgeShadowOpacity },
      },
      side: THREE.DoubleSide,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    syncUniforms(material, scene, configRef.current);

    const textureLoader = new THREE.TextureLoader();
    let currentTexture = null;

    const loadImage = (src) => {
      if (currentTexture) {
        currentTexture.dispose();
        currentTexture = null;
      }

      textureLoader.load(src, (tex) => {
        currentTexture = tex;
        applyTexture(tex, tex.image.width, tex.image.height, material, mesh);
      });
    };

    threeRef.current = { scene, material, loadImage };

    const timer = new THREE.Timer();
    let animationId = null;

    const animate = (timestamp) => {
      animationId = requestAnimationFrame(animate);
      timer.update(timestamp);
      const time = timer.getElapsed();

      material.uniforms.uTime.value = time;

      const { windForce: force } = configRef.current;
      let gust = Math.sin(time * 0.7) + Math.sin(time * 2.3) * 0.5 + 0.5;
      gust = Math.max(0.0, gust);
      material.uniforms.uWindStrength.value = gust * force * 0.3;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      const { clientWidth, clientHeight } = container;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      if (currentTexture) currentTexture.dispose();
      renderer.dispose();
      threeRef.current = null;
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    threeRef.current?.loadImage(imgSrc);
  }, [imgSrc]);

  useEffect(() => {
    const ctx = threeRef.current;
    if (!ctx) return;
    syncUniforms(ctx.material, ctx.scene, configRef.current);
  }, [
    bgColor,
    fabricDetail,
    shadowOpacity,
    edgeScale,
    edgeAmp,
    frameSize,
    photoInset,
    paperColor,
    edgeShadowColor,
    edgeShadowOpacity,
    scratchAmp,
    grainAmp,
    vignette,
    seed,
  ]);

  return (
    <section
      ref={containerRef}
      className={`poster-cloth ${styles.posterCloth}`}
    />
  );
}
