"use client";

import { useEffect, useRef } from "react";
import { TransitionRouter } from "next-transition-router";
import { useLenis } from "lenis/react";
import gsap from "gsap";

import { dispatchMenuClose } from "@/lib/menuClose";
import { resetScrollPosition } from "@/lib/resetScrollPosition";
import styles from "./TransitionProvider.module.css";

const TRANSITION_DURATION = 0.6;
const TRANSITION_EASE = "power2.inOut";

export default function TransitionProvider({ children }) {
  const lenis = useLenis();
  const routeOverlayRef = useRef(null);

  useEffect(() => {
    gsap.set(routeOverlayRef.current, {
      opacity: 0,
      visibility: "hidden",
      pointerEvents: "none",
    });
  }, []);

  return (
    <TransitionRouter
      auto
      leave={(completeTransition) => {
        const overlay = routeOverlayRef.current;
        gsap.set(overlay, {
          opacity: 0,
          visibility: "visible",
          pointerEvents: "auto",
        });

        const fadeOutTween = gsap.to(overlay, {
          opacity: 1,
          duration: TRANSITION_DURATION,
          ease: TRANSITION_EASE,
          onComplete: completeTransition,
        });

        return () => fadeOutTween.kill();
      }}
      enter={(completeTransition) => {
        dispatchMenuClose();
        resetScrollPosition(lenis);

        const overlay = routeOverlayRef.current;
        gsap.set(overlay, { opacity: 1, visibility: "visible" });

        const fadeInTween = gsap.to(overlay, {
          opacity: 0,
          duration: TRANSITION_DURATION,
          ease: TRANSITION_EASE,
          onComplete: () => {
            gsap.set(overlay, {
              visibility: "hidden",
              pointerEvents: "none",
            });
            completeTransition();
          },
        });

        return () => fadeInTween.kill();
      }}
    >
      <div
        ref={routeOverlayRef}
        className={styles.routeTransitionOverlay}
        aria-hidden="true"
      />
      {children}
    </TransitionRouter>
  );
}
