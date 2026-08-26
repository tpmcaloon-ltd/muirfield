"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

import { isInitialLoad } from "@/components/Preloader/Preloader";

const PreloaderContext = createContext({
  isLandingReady: true,
  confirmPreloaderEnter: () => {},
});

export function PreloaderProvider({ children }) {
  const isFirstVisit = useRef(isInitialLoad).current;
  const [isLandingReady, setIsLandingReady] = useState(!isFirstVisit);

  // unlock the landing scene after the visitor confirms the preloader on first load
  const confirmPreloaderEnter = useCallback(() => {
    if (isFirstVisit) {
      setIsLandingReady(true);
    }
  }, [isFirstVisit]);

  return (
    <PreloaderContext.Provider
      value={{ isLandingReady, confirmPreloaderEnter }}
    >
      {children}
    </PreloaderContext.Provider>
  );
}

export function usePreloader() {
  return useContext(PreloaderContext);
}
