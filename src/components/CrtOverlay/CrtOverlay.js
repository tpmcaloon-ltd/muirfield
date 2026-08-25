"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as THREE from "three";
import { crtConfig } from "./crtConfig";
import { fragmentShader, vertexShader } from "./crtShader";
import styles from "./CrtOverlay.module.css";

function buildUniforms(config) {
  return {
    iTime: { value: 0 },
    iResolution: { value: new THREE.Vector2(1, 1) },
    uIntensity: { value: config.intensity },
    uScanBase: { value: config.scanlines.base },
    uScanAmp: { value: config.scanlines.amplitude },
    uScanSpeed: { value: config.scanlines.speed },
    uScanScale: { value: config.scanlines.scale },
    uScanPower: { value: config.scanlines.power },
    uScanFloor: { value: config.scanlines.floor },
    uScanCeil: { value: config.scanlines.ceiling },
    uScanStrength: { value: config.scanlines.strength },
    uVignetteStrength: { value: config.vignette.strength },
    uVignettePower: { value: config.vignette.power },
    uRgbMaskStrength: { value: config.rgbMask.strength },
    uFlickerStrength: { value: config.flicker.strength },
    uFlickerSpeed: { value: config.flicker.speed },
    uFlickerAmp: { value: config.flicker.amplitude },
    uTint: {
      value: new THREE.Vector3(config.tint.r, config.tint.g, config.tint.b),
    },
  };
}

export default function CrtOverlay({ config = crtConfig }) {
  const canvasRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: buildUniforms(config),
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    const timer = new THREE.Timer();

    const resize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio, 2);

      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      material.uniforms.iResolution.value.set(width * dpr, height * dpr);
    };

    let frameId = 0;

    const render = (timestamp) => {
      timer.update(timestamp);
      material.uniforms.iTime.value = timer.getElapsed();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);
    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      material.dispose();
      mesh.geometry.dispose();
      renderer.dispose();
    };
  }, [mounted, config]);

  if (!mounted) return null;

  return createPortal(
    <canvas
      ref={canvasRef}
      className={styles.overlay}
      style={{
        opacity: config.opacity,
        mixBlendMode: config.blendMode,
      }}
      aria-hidden="true"
    />,
    document.body,
  );
}
