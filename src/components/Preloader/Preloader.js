"use client";

import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

import Btn from "@/components/Btn/Btn";
import AnimatedText from "@/components/AnimatedText/AnimatedText";
import { useAudio } from "@/context/AudioContext";
import { usePreloader } from "@/context/PreloaderContext";
import { bindButtonSoundEffects } from "@/lib/uiSounds";

import { playPreloaderOut } from "./preloaderAnimations";
import styles from "./Preloader.module.css";

const EXIT_ANIMATION_MS = 700;
const CTA_FADE_DELAY_S = 1.85;

let isInitialLoad = true;

export default function Preloader({ onAnimationComplete }) {
  const lenis = useLenis();
  const { startAmbientAudio } = useAudio();
  const { confirmPreloaderEnter } = usePreloader();
  const contentRef = useRef(null);
  const [isVisible, setIsVisible] = useState(isInitialLoad);
  const [isScrollLocked, setIsScrollLocked] = useState(isInitialLoad);
  const [isExiting, setIsExiting] = useState(false);
  const [ctasVisible, setCtasVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCtasVisible(true));
      });
    }, CTA_FADE_DELAY_S * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [isVisible]);

  useEffect(() => {
    if (!isScrollLocked) {
      if (lenis) {
        lenis.start();
      }
      document.body.style.overflow = "";
      return undefined;
    }

    if (lenis) {
      lenis.stop();
    }
    document.body.style.overflow = "hidden";

    return () => {
      if (lenis) {
        lenis.start();
      }
      document.body.style.overflow = "";
    };
  }, [lenis, isScrollLocked]);

  const handleEnter = (withSound) => {
    if (isExiting) {
      return;
    }

    if (withSound) {
      void startAmbientAudio();
    }

    confirmPreloaderEnter();

    setIsExiting(true);
    setIsScrollLocked(false);
    playPreloaderOut(contentRef.current);

    window.setTimeout(() => {
      isInitialLoad = false;
      setIsVisible(false);
      onAnimationComplete?.();
    }, EXIT_ANIMATION_MS);
  };

  const ctaClassName =
    `${styles.cta} ${ctasVisible ? styles.ctaVisible : ""}`.trim();

  const enterWithSoundProps = bindButtonSoundEffects({
    type: "button",
    className: `${styles.primaryButton} ${ctaClassName}`,
    "data-preloader-primary": true,
    onClick: () => handleEnter(true),
  });

  const enterWithoutSoundProps = bindButtonSoundEffects({
    type: "button",
    className: `${styles.muteEnter} ${ctaClassName}`,
    "data-preloader-secondary": true,
    onClick: () => handleEnter(false),
    children: (
      <span className={`${styles.muteLabel} underline-hover`}>
        Enter without sound
      </span>
    ),
  });

  if (!isVisible) {
    return null;
  }

  return (
    <section
      className={`${styles.preloader} ${isExiting ? styles.isExiting : ""}`}
      aria-label="Website preloader"
    >
      <div ref={contentRef} className={styles.content}>
        <div className={styles.inner}>
          <AnimatedText variant="variant1" animateOnScroll={false} delay={1}>
            <h2 className={styles.title}>
              The
              <br />
              Corridors
              <br />
              Wait
            </h2>
          </AnimatedText>

          <Btn {...enterWithSoundProps}>Enter with sound</Btn>
        </div>

        <button {...enterWithoutSoundProps} />
      </div>
    </section>
  );
}

export { isInitialLoad };
