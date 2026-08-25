"use client";

import { useEffect } from "react";

import TrailerPlayer from "@/components/TrailerPlayer/TrailerPlayer";
import styles from "./page.module.css";

const VIEWPORT_SCROLL_LOCK_CLASS = "viewport-lock-page";

export default function TrailerPage() {
  // lock page scroll while the full-screen trailer player is active
  useEffect(() => {
    const documentRoot = document.documentElement;
    documentRoot.classList.add(VIEWPORT_SCROLL_LOCK_CLASS);

    const preventTouchScroll = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });

    return () => {
      documentRoot.classList.remove(VIEWPORT_SCROLL_LOCK_CLASS);
      document.removeEventListener("touchmove", preventTouchScroll);
    };
  }, []);

  return (
    <main className={styles.main}>
      <TrailerPlayer />
    </main>
  );
}
