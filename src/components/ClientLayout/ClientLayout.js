"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";
import Navbar from "@/components/Navbar/Navbar";
import CrtOverlay from "@/components/CrtOverlay/CrtOverlay";
import TransitionProvider from "@/components/TransitionProvider/TransitionProvider";
import { AudioProvider } from "@/context/AudioContext";
import { PreloaderProvider } from "@/context/PreloaderContext";
import Preloader from "@/components/Preloader/Preloader";
import VisualViewportSync from "@/components/VisualViewportSync/VisualViewportSync";
import "lenis/dist/lenis.css";
import "./ClientLayout.module.css";

const MOBILE_BREAKPOINT_PX = 1000;

const LENIS_EASING = (progress) =>
  Math.min(1, 1.001 - Math.pow(2, -10 * progress));

const LENIS_SHARED_OPTIONS = {
  easing: LENIS_EASING,
  direction: "vertical",
  gestureDirection: "vertical",
  smooth: true,
  infinite: false,
  wheelMultiplier: 1,
  orientation: "vertical",
  smoothWheel: true,
  syncTouch: true,
};

const LENIS_MOBILE_OPTIONS = {
  ...LENIS_SHARED_OPTIONS,
  duration: 0.8,
  smoothTouch: true,
  touchMultiplier: 1.5,
  lerp: 0.09,
};

const LENIS_DESKTOP_OPTIONS = {
  ...LENIS_SHARED_OPTIONS,
  duration: 1.2,
  smoothTouch: false,
  touchMultiplier: 2,
  lerp: 0.1,
};

export default function ClientLayout({ children }) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const updateViewportMode = () =>
      setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT_PX);
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, []);

  const lenisScrollOptions = isMobileViewport
    ? LENIS_MOBILE_OPTIONS
    : LENIS_DESKTOP_OPTIONS;

  return (
    <AudioProvider>
      <PreloaderProvider>
        <VisualViewportSync />
        <ReactLenis root options={lenisScrollOptions}>
          <div className="page">
            <Navbar />
            <TransitionProvider>
              <div className="page-wrapper">{children}</div>
            </TransitionProvider>
          </div>
          <Preloader />
          <CrtOverlay />
        </ReactLenis>
      </PreloaderProvider>
    </AudioProvider>
  );
}
