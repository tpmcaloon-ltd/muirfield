"use client";

import { useCallback, useEffect, useRef } from "react";
import { bindButtonSoundEffects } from "@/lib/uiSounds";
import { useAudio } from "@/context/AudioContext";
import styles from "./AmbientVolumeToggle.module.css";

const STARTUP_MS = 520;
const SHUTDOWN_MS = 550;

const VIEW_SIZE = 48;
const CANVAS_CENTER = VIEW_SIZE / 2;
const RING_RADIUS = 18;
const CANVAS_SIZE_PX = 20;
const WAVE_POINT_COUNT = 48;
const WAVE_ANIMATION_SPEED = -0.05;
const WAVE_IDLE_SHAPE = { sinHeight: 0.55, stretch: 10 };
const WAVE_ACTIVE_SHAPE = { sinHeight: 2.1, stretch: 5 };

function easeOutCubic(progress) {
  return 1 - (1 - progress) ** 3;
}

function easeInCubic(progress) {
  return progress ** 3;
}

function interpolate(start, end, progress) {
  return start + (end - start) * progress;
}

export default function AmbientVolumeToggle() {
  const { isAmbientAudioPlaying, toggleAmbientAudio } = useAudio();
  const buttonRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasContextRef = useRef(null);
  const animationFrameRef = useRef(0);
  const waveModeRef = useRef("idle");
  const transitionStartTimeRef = useRef(0);
  const waveTimeRef = useRef(0);
  const previousPlayingStateRef = useRef(isAmbientAudioPlaying);

  const getWaveEnvelope = useCallback((currentTime) => {
    if (waveModeRef.current === "rampUp") {
      const rampProgress = Math.min(
        1,
        (currentTime - transitionStartTimeRef.current) / STARTUP_MS,
      );

      if (rampProgress >= 1) {
        waveModeRef.current = "playing";
        return 1;
      }

      return easeOutCubic(rampProgress);
    }

    if (waveModeRef.current === "rampDown") {
      const rampProgress = Math.min(
        1,
        (currentTime - transitionStartTimeRef.current) / SHUTDOWN_MS,
      );

      if (rampProgress >= 1) {
        waveModeRef.current = "idle";
        return 0;
      }

      return 1 - easeInCubic(rampProgress);
    }

    if (waveModeRef.current === "playing") {
      return 1;
    }

    return 0;
  }, []);

  const drawWaveform = useCallback((envelope) => {
    const canvas = canvasRef.current;
    const canvasContext = canvasContextRef.current;
    if (!canvas || !canvasContext) {
      return;
    }

    const canvasSize = CANVAS_SIZE_PX;
    const sinHeight = interpolate(
      WAVE_IDLE_SHAPE.sinHeight,
      WAVE_ACTIVE_SHAPE.sinHeight,
      envelope,
    );
    const stretch = interpolate(
      WAVE_IDLE_SHAPE.stretch,
      WAVE_ACTIVE_SHAPE.stretch,
      envelope,
    );
    const midlineY = canvasSize / 2;

    canvasContext.clearRect(0, 0, canvasSize, canvasSize);
    canvasContext.strokeStyle = getComputedStyle(canvas).color;
    canvasContext.globalAlpha = 0.45 + envelope * 0.55;
    canvasContext.beginPath();

    let amplitudeIncrement = 0;

    for (let pointIndex = 0; pointIndex <= WAVE_POINT_COUNT; pointIndex++) {
      if (pointIndex < WAVE_POINT_COUNT / 2) {
        amplitudeIncrement += 0.1;
      } else {
        amplitudeIncrement += -0.1;
      }

      const x = (canvasSize / WAVE_POINT_COUNT) * pointIndex;
      const y =
        midlineY +
        Math.sin(
          waveTimeRef.current * WAVE_ANIMATION_SPEED + pointIndex / stretch,
        ) *
          sinHeight *
          amplitudeIncrement;
      canvasContext.lineTo(x, y);
    }

    canvasContext.stroke();
    canvasContext.globalAlpha = 1;
  }, []);

  const renderWaveFrame = useCallback(
    (currentTime) => {
      waveTimeRef.current += 1;
      drawWaveform(getWaveEnvelope(currentTime));
      animationFrameRef.current = window.requestAnimationFrame(renderWaveFrame);
    },
    [drawWaveform, getWaveEnvelope],
  );

  const startWaveTransition = useCallback((mode) => {
    waveModeRef.current = mode;
    transitionStartTimeRef.current = performance.now();
  }, []);

  // sync the waveform animation with ambient audio play state changes
  useEffect(() => {
    if (isAmbientAudioPlaying === previousPlayingStateRef.current) {
      return;
    }

    previousPlayingStateRef.current = isAmbientAudioPlaying;
    startWaveTransition(isAmbientAudioPlaying ? "rampUp" : "rampDown");
  }, [isAmbientAudioPlaying, startWaveTransition]);

  // initialize the canvas wave renderer and keep it animating
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const devicePixelRatio = Math.min(window.devicePixelRatio, 2);
    canvas.width = CANVAS_SIZE_PX * devicePixelRatio;
    canvas.height = CANVAS_SIZE_PX * devicePixelRatio;
    canvas.style.width = `${CANVAS_SIZE_PX}px`;
    canvas.style.height = `${CANVAS_SIZE_PX}px`;

    const canvasContext = canvas.getContext("2d");
    canvasContext.scale(devicePixelRatio, devicePixelRatio);
    canvasContext.lineCap = "round";
    canvasContext.lineJoin = "round";
    canvasContext.lineWidth = 1.25;
    canvasContextRef.current = canvasContext;

    animationFrameRef.current = window.requestAnimationFrame(renderWaveFrame);

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [renderWaveFrame]);

  const handleToggleClick = useCallback(() => {
    buttonRef.current?.blur();
    void toggleAmbientAudio();
  }, [toggleAmbientAudio]);

  const buttonProps = bindButtonSoundEffects({
    type: "button",
    className: styles.button,
    tabIndex: -1,
    onClick: handleToggleClick,
    onMouseDown: (event) => event.preventDefault(),
    "aria-label": isAmbientAudioPlaying ? "Mute audio" : "Play audio",
    "aria-pressed": isAmbientAudioPlaying,
  });

  return (
    <button ref={buttonRef} {...buttonProps}>
      <span className={styles.inner} aria-hidden="true">
        <svg
          className={styles.icon}
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className={styles.ring}
            cx={CANVAS_CENTER}
            cy={CANVAS_CENTER}
            r={RING_RADIUS}
          />
        </svg>
        <canvas ref={canvasRef} className={styles.wave} />
      </span>
    </button>
  );
}
