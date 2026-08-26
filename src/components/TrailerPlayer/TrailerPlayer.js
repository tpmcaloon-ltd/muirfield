"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GUI from "lil-gui";
import styles from "./TrailerPlayer.module.css";
import { useTrailerRenderer } from "./useTrailerRenderer";
import {
  cloneTrailerDisplayConfig,
  exportTrailerDisplayConfig,
} from "./trailerDisplayConfig";
import { isUrlFlagEnabled } from "@/lib/urlFlags";

const MOBILE_BREAKPOINT = 1000;
const DESKTOP_TIMESTAMP_COUNT = 10;
const MOBILE_TIMESTAMP_COUNT = 6;
const DESKTOP_FRAME_COUNT = 9;
const MOBILE_FRAME_COUNT = 5;

function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function buildTimestamps(durationSeconds, count) {
  if (!durationSeconds || count < 2) return ["00:00"];

  const lastIndex = count - 1;
  return Array.from({ length: count }, (_, index) =>
    formatTimestamp((durationSeconds / lastIndex) * index),
  );
}

const ALL_SNAPSHOTS = Array.from(
  { length: 9 },
  (_, i) => `/trailer/snapshots/${i + 1}.png`,
);

function getVisibleSnapshots(count) {
  const total = ALL_SNAPSHOTS.length;
  if (count >= total) return ALL_SNAPSHOTS;

  return Array.from({ length: count }, (_, i) => {
    const index = Math.round((i / (count - 1)) * (total - 1));
    return ALL_SNAPSHOTS[index];
  });
}

const LOOP_THRESHOLD = 0.04;
const CURSOR_OFFSET_X = 20;
const CURSOR_OFFSET_Y = 16;

function isTrailerLayoutTuneMode() {
  return isUrlFlagEnabled("debugTrailer");
}

export default function TrailerPlayer() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const timelineRef = useRef(null);
  const framesRef = useRef(null);
  const cursorRef = useRef(null);
  const markerRafRef = useRef(0);
  const durationRef = useRef(48);
  const visibleFramesRef = useRef(getVisibleSnapshots(DESKTOP_FRAME_COUNT));
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [timestamps, setTimestamps] = useState(() =>
    buildTimestamps(48, DESKTOP_TIMESTAMP_COUNT),
  );
  const [visibleFrames, setVisibleFrames] = useState(() =>
    getVisibleSnapshots(DESKTOP_FRAME_COUNT),
  );
  const [activeFrame, setActiveFrame] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isDebug, setIsDebug] = useState(false);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const configRef = useRef(cloneTrailerDisplayConfig());
  const isMobileRef = useRef(false);
  const isDebugRef = useRef(false);

  useTrailerRenderer(
    videoRef,
    canvasRef,
    containerRef,
    configRef,
    isMobileRef,
    isDebugRef,
  );

  const getContainerStyle = useCallback(() => {
    const layout = configRef.current.layout;
    const metrics = isMobile
      ? {
          top: layout.mobileTop,
          left: layout.mobileLeft,
          width: layout.mobileWidth,
          height: layout.mobileHeight,
        }
      : {
          top: layout.top,
          left: layout.left,
          width: layout.width,
          height: layout.height,
        };

    return {
      top: `${metrics.top}%`,
      left: `${metrics.left}%`,
      width: `${metrics.width}%`,
      height: `${metrics.height}%`,
    };
  }, [isMobile, layoutVersion]);

  const getTrackMetrics = useCallback(() => {
    const timeline = timelineRef.current;
    const frames = framesRef.current;
    if (!timeline || !frames) return null;

    const timelineRect = timeline.getBoundingClientRect();
    const framesRect = frames.getBoundingClientRect();

    return {
      left: framesRect.left - timelineRect.left,
      width: framesRect.width,
    };
  }, []);

  const syncPlaybackUI = useCallback(() => {
    const video = videoRef.current;
    if (!video?.duration) return;

    const progress = video.currentTime / video.duration;
    const marker = timelineRef.current?.querySelector(`.${styles.videoMarker}`);
    const metrics = getTrackMetrics();

    if (marker && metrics) {
      marker.style.left = `${metrics.left + progress * metrics.width - 1}px`;
    }

    setActiveFrame(
      Math.min(
        Math.floor(progress * visibleFramesRef.current.length),
        visibleFramesRef.current.length - 1,
      ),
    );
  }, [getTrackMetrics]);

  const stopMarkerAnimation = useCallback(() => {
    cancelAnimationFrame(markerRafRef.current);
    syncPlaybackUI();
  }, [syncPlaybackUI]);

  const startMarkerAnimation = useCallback(() => {
    cancelAnimationFrame(markerRafRef.current);

    const tick = () => {
      const video = videoRef.current;
      if (!video || video.paused || !video.duration) return;
      syncPlaybackUI();
      markerRafRef.current = requestAnimationFrame(tick);
    };

    markerRafRef.current = requestAnimationFrame(tick);
  }, [syncPlaybackUI]);

  const handleFrameClick = useCallback(
    (e, index) => {
      e.stopPropagation();
      const video = videoRef.current;
      if (!video?.duration) return;
      video.currentTime = (index / visibleFrames.length) * video.duration;
      syncPlaybackUI();
    },
    [syncPlaybackUI, visibleFrames.length],
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      isMobileRef.current = mobile;
      setIsMobile(mobile);
      setVisibleFrames(
        getVisibleSnapshots(mobile ? MOBILE_FRAME_COUNT : DESKTOP_FRAME_COUNT),
      );
      setTimestamps(
        buildTimestamps(
          durationRef.current,
          mobile ? MOBILE_TIMESTAMP_COUNT : DESKTOP_TIMESTAMP_COUNT,
        ),
      );
      requestAnimationFrame(() => syncPlaybackUI());
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [syncPlaybackUI]);

  useEffect(() => {
    visibleFramesRef.current = visibleFrames;
    syncPlaybackUI();
  }, [visibleFrames, syncPlaybackUI]);

  useEffect(() => {
    const video = videoRef.current;
    const timeline = timelineRef.current;
    if (!video || !timeline) return;

    const handlePlay = () => {
      setIsPlaying(true);
      startMarkerAnimation();
    };

    const handlePause = () => {
      setIsPlaying(false);
      stopMarkerAnimation();
    };

    const handleSeamlessLoop = () => {
      if (video.paused || !video.duration) return;
      if (video.currentTime >= video.duration - LOOP_THRESHOLD) {
        video.currentTime = 0;
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration) {
        durationRef.current = video.duration;
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        setTimestamps(
          buildTimestamps(
            video.duration,
            mobile ? MOBILE_TIMESTAMP_COUNT : DESKTOP_TIMESTAMP_COUNT,
          ),
        );
      }
      syncPlaybackUI();
    };

    const startPlayback = () => {
      video.play().catch(() => setIsPlaying(false));
    };

    const handleTimelineClick = (e) => {
      e.stopPropagation();
      const metrics = getTrackMetrics();
      if (!metrics?.width) return;

      const timelineRect = timeline.getBoundingClientRect();
      const x = e.clientX - timelineRect.left - metrics.left;
      const percentage = Math.max(0, Math.min(1, x / metrics.width));
      video.currentTime = percentage * video.duration;
      syncPlaybackUI();
    };

    const handleDocumentClick = (e) => {
      if (timeline.contains(e.target)) return;

      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    };

    const handleMouseMove = (e) => {
      const cursor = cursorRef.current;
      if (!cursor) return;
      cursor.style.transform = `translate(${e.clientX + CURSOR_OFFSET_X}px, ${e.clientY + CURSOR_OFFSET_Y}px)`;
      setCursorVisible(!e.target.closest("[data-hide-play-cursor]"));
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("timeupdate", handleSeamlessLoop);
    video.addEventListener("seeked", syncPlaybackUI);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    timeline.addEventListener("click", handleTimelineClick);
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("mousemove", handleMouseMove);

    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      startPlayback();
    } else {
      video.addEventListener("canplay", startPlayback, { once: true });
    }

    return () => {
      cancelAnimationFrame(markerRafRef.current);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("timeupdate", handleSeamlessLoop);
      video.removeEventListener("seeked", syncPlaybackUI);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", startPlayback);
      timeline.removeEventListener("click", handleTimelineClick);
      document.removeEventListener("click", handleDocumentClick);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [
    getTrackMetrics,
    startMarkerAnimation,
    stopMarkerAnimation,
    syncPlaybackUI,
  ]);

  useEffect(() => {
    setIsDebug(isTrailerLayoutTuneMode());
  }, []);

  useEffect(() => {
    isDebugRef.current = isDebug;
  }, [isDebug]);

  useEffect(() => {
    if (!isDebug) return;

    const config = configRef.current;
    const refreshLayout = () => setLayoutVersion((version) => version + 1);

    const gui = new GUI({ title: "Trailer display" });
    gui.domElement.style.zIndex = "30";

    const layoutFolder = gui.addFolder("Layout");
    layoutFolder.add(config.layout, "top", 0, 30, 0.5).onChange(refreshLayout);
    layoutFolder.add(config.layout, "left", 0, 30, 0.5).onChange(refreshLayout);
    layoutFolder
      .add(config.layout, "width", 50, 100, 0.5)
      .onChange(refreshLayout);
    layoutFolder
      .add(config.layout, "height", 50, 100, 0.5)
      .onChange(refreshLayout);
    layoutFolder
      .add(config.layout, "mobileTop", 0, 20, 0.5)
      .onChange(refreshLayout);
    layoutFolder
      .add(config.layout, "mobileLeft", 0, 20, 0.5)
      .onChange(refreshLayout);
    layoutFolder
      .add(config.layout, "mobileWidth", 70, 100, 0.5)
      .onChange(refreshLayout);
    layoutFolder
      .add(config.layout, "mobileHeight", 70, 100, 0.5)
      .onChange(refreshLayout);

    const videoFolder = gui.addFolder("Video");
    videoFolder.add(config.video, "scale", 0.5, 2, 0.01);

    const postFolder = gui.addFolder("Post");
    postFolder.add(config.post, "distortEnabled");
    postFolder.add(config.post, "distortK1", -0.5, 0.5, 0.001);
    postFolder.add(config.post, "distortK2", -0.2, 0.2, 0.001);
    postFolder.add(config.post, "vignetteEnabled");
    postFolder.add(config.post, "vignetteHalfWidth", 0.1, 0.5, 0.001);
    postFolder.add(config.post, "vignetteHalfHeight", 0.1, 0.5, 0.001);
    postFolder.add(config.post, "vignetteRadius", 0, 0.2, 0.001);
    postFolder.add(config.post, "vignetteFeather", 0.005, 0.1, 0.001);
    postFolder.add(config.post, "chromaticAberrationEnabled");
    postFolder.add(config.post, "chromaticAberrationStrength", 0, 40, 0.5);
    postFolder.add(config.post, "scanlinesEnabled");

    const actions = {
      logConfig: () => {
        console.log(exportTrailerDisplayConfig(config));
      },
      copyConfig: () => {
        navigator.clipboard.writeText(exportTrailerDisplayConfig(config));
      },
    };

    gui.add(actions, "logConfig").name("Log config");
    gui.add(actions, "copyConfig").name("Copy config");

    return () => gui.destroy();
  }, [isDebug]);

  return (
    <div className={styles.overlay}>
      {isDebug ? (
        <div className={styles.debugPanel}>
          <p className={styles.debugBadge}>
            Trailer debug (?debugTrailer) — tune layout and post in the panel
          </p>
        </div>
      ) : null}
      <div
        ref={containerRef}
        className={`${styles.videoContainer} ${isDebug ? styles.videoContainerDebug : ""}`}
        style={getContainerStyle()}
      >
        <video
          ref={videoRef}
          className={styles.videoSource}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
        >
          <source src="/trailer/video.mp4" type="video/mp4" />
        </video>
        <canvas ref={canvasRef} className={styles.videoCanvas} />
      </div>

      <div
        ref={cursorRef}
        className={`${styles.cursor} ${cursorVisible ? "" : styles.cursorHidden}`}
      >
        <p>{isPlaying ? "Pause" : "Play"}</p>
      </div>

      <div
        ref={timelineRef}
        className={`${styles.videoTimeline} ${isMobile ? styles.videoTimelineMobile : ""}`}
        data-hide-play-cursor
      >
        <div
          className={`${styles.videoMarker} ${isMobile ? styles.videoMarkerMobile : ""}`}
        />
        <div className={styles.videoTimestamps}>
          {timestamps.map((time, index) => (
            <p key={`${time}-${index}`}>{time}</p>
          ))}
        </div>
        <div
          ref={framesRef}
          className={`${styles.videoFrames} ${isMobile ? styles.videoFramesMobile : ""}`}
        >
          {visibleFrames.map((src, index) => (
            <button
              key={src}
              type="button"
              className={`${styles.frame} ${activeFrame === index ? styles.frameActive : ""}`}
              onClick={(e) => handleFrameClick(e, index)}
            >
              <img src={src} alt="" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
