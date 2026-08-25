"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const VOLUME_FADE_DURATION_MS = 900;
const AMBIENT_AUDIO_TRACKS = [
  { src: "/sounds/bg.mp3", maxVolume: 0.25 },
  { src: "/sounds/white-noise.mp3", maxVolume: 1.2 },
];

const AmbientAudioContext = createContext(null);

export function AudioProvider({ children }) {
  const ambientAudioElementsRef = useRef([]);
  const volumeFadeFrameRef = useRef(0);
  const [isAmbientAudioPlaying, setIsAmbientAudioPlaying] = useState(false);

  // create looping ambient tracks on mount and release them on unmount
  useEffect(() => {
    const audioElements = AMBIENT_AUDIO_TRACKS.map(({ src }) => {
      const audioElement = new Audio(src);
      audioElement.loop = true;
      audioElement.volume = 0;
      audioElement.preload = "auto";
      return audioElement;
    });
    ambientAudioElementsRef.current = audioElements;

    return () => {
      window.cancelAnimationFrame(volumeFadeFrameRef.current);
      audioElements.forEach((audioElement) => {
        audioElement.pause();
        audioElement.src = "";
      });
    };
  }, []);

  // ease ambient track volumes toward a target level over the fade duration
  const fadeAmbientAudioVolume = useCallback((volumeLevel, onComplete) => {
    const audioElements = ambientAudioElementsRef.current;
    if (!audioElements.length) {
      return;
    }

    const targetVolumes = AMBIENT_AUDIO_TRACKS.map(({ maxVolume }) =>
      Math.min(1, maxVolume * volumeLevel),
    );

    window.cancelAnimationFrame(volumeFadeFrameRef.current);
    const startVolumes = audioElements.map(
      (audioElement) => audioElement.volume,
    );
    const fadeStartTime = performance.now();

    const animateVolumeFade = (currentTime) => {
      const fadeProgress = Math.min(
        1,
        (currentTime - fadeStartTime) / VOLUME_FADE_DURATION_MS,
      );
      const easedProgress =
        fadeProgress < 0.5
          ? 2 * fadeProgress * fadeProgress
          : 1 - (-2 * fadeProgress + 2) ** 2 / 2;

      audioElements.forEach((audioElement, trackIndex) => {
        const startVolume = startVolumes[trackIndex];
        const targetVolume = targetVolumes[trackIndex];
        audioElement.volume =
          startVolume + (targetVolume - startVolume) * easedProgress;
      });

      if (fadeProgress < 1) {
        volumeFadeFrameRef.current =
          window.requestAnimationFrame(animateVolumeFade);
      } else {
        audioElements.forEach((audioElement, trackIndex) => {
          audioElement.volume = targetVolumes[trackIndex];
        });
        onComplete?.();
      }
    };

    volumeFadeFrameRef.current =
      window.requestAnimationFrame(animateVolumeFade);
  }, []);

  const startAmbientAudio = useCallback(async () => {
    const audioElements = ambientAudioElementsRef.current;
    if (!audioElements.length || isAmbientAudioPlaying) {
      return;
    }

    try {
      await Promise.all(
        audioElements.map((audioElement) => audioElement.play()),
      );
      setIsAmbientAudioPlaying(true);
      fadeAmbientAudioVolume(1);
    } catch {
      // autoplay blocked until the user interacts with the page
    }
  }, [fadeAmbientAudioVolume, isAmbientAudioPlaying]);

  const stopAmbientAudio = useCallback(() => {
    const audioElements = ambientAudioElementsRef.current;
    if (!audioElements.length || !isAmbientAudioPlaying) {
      return;
    }

    setIsAmbientAudioPlaying(false);
    fadeAmbientAudioVolume(0, () => {
      audioElements.forEach((audioElement) => audioElement.pause());
    });
  }, [fadeAmbientAudioVolume, isAmbientAudioPlaying]);

  const toggleAmbientAudio = useCallback(async () => {
    if (isAmbientAudioPlaying) {
      stopAmbientAudio();
      return;
    }

    await startAmbientAudio();
  }, [isAmbientAudioPlaying, startAmbientAudio, stopAmbientAudio]);

  return (
    <AmbientAudioContext.Provider
      value={{
        isAmbientAudioPlaying,
        startAmbientAudio,
        toggleAmbientAudio,
      }}
    >
      {children}
    </AmbientAudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AmbientAudioContext);
  if (!context) {
    throw new Error("useAudio must be used within an AudioProvider");
  }
  return context;
}
