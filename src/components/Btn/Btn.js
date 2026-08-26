"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

import styles from "./Btn.module.css";

export const BTN_FADE_DURATION = 0.75;

export default function Btn({
  children,
  className = "",
  delay,
  duration = BTN_FADE_DURATION,
  playOnLoad = false,
  ...buttonProps
}) {
  const buttonRef = useRef(null);
  const hasPlayedLoadAnimationRef = useRef(false);
  const [hasCompletedFadeIn, setHasCompletedFadeIn] = useState(false);
  const shouldHideUntilFadeIn =
    playOnLoad && delay !== undefined && !hasCompletedFadeIn;

  // fade the button in after a timed delay when playOnLoad is enabled
  useGSAP(
    () => {
      if (!buttonRef.current || delay === undefined || !playOnLoad) {
        return undefined;
      }

      if (hasPlayedLoadAnimationRef.current) {
        return undefined;
      }

      hasPlayedLoadAnimationRef.current = true;

      gsap.killTweensOf(buttonRef.current);
      gsap.set(buttonRef.current, { opacity: 0 });

      const fadeInTween = gsap.to(buttonRef.current, {
        opacity: 1,
        duration,
        ease: "power2.out",
        delay,
        overwrite: true,
        onComplete: () => setHasCompletedFadeIn(true),
      });

      return () => {
        fadeInTween.kill();
        hasPlayedLoadAnimationRef.current = false;
      };
    },
    { scope: buttonRef, dependencies: [delay, duration, playOnLoad] },
  );

  return (
    <button
      ref={buttonRef}
      className={`${styles.button} ${shouldHideUntilFadeIn ? styles.fadePending : ""} ${className}`.trim()}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
