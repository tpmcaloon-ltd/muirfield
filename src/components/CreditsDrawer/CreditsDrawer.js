"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Image from "next/image";
import { bindButtonSoundEffects } from "@/lib/uiSounds";
import styles from "./CreditsDrawer.module.css";

export default function CreditsDrawer() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCloseButtonVisible, setIsCloseButtonVisible] = useState(false);
  const drawerId = useId();

  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((open) => !open), []);

  const handleCloseButtonClick = useCallback(() => {
    setIsCloseButtonVisible(false);
    closeDrawer();
  }, [closeDrawer]);

  // manage escape key handling and delayed close button reveal while open
  useEffect(() => {
    if (!isDrawerOpen) {
      setIsCloseButtonVisible(false);
      return;
    }

    const showCloseButtonTimer = window.setTimeout(() => {
      setIsCloseButtonVisible(true);
    }, 200);

    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        closeDrawer();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      window.clearTimeout(showCloseButtonTimer);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [closeDrawer, isDrawerOpen]);

  return (
    <>
      <button
        type="button"
        id="credits-toggler"
        className={styles.toggler}
        aria-expanded={isDrawerOpen}
        aria-controls={drawerId}
        {...bindButtonSoundEffects({ onClick: toggleDrawer })}
      >
        <span className={`${styles.togglerLabel} underline-hover`}>
          Credits
        </span>
      </button>

      <div
        className={`${styles.backdrop} ${isDrawerOpen ? styles.backdropOpen : ""}`}
        onClick={closeDrawer}
        aria-hidden="true"
      />

      <aside
        id={drawerId}
        className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!isDrawerOpen}
      >
        <button
          type="button"
          className={`${styles.closeBtn} ${isCloseButtonVisible ? styles.closeBtnVisible : ""}`}
          aria-label="Close credits"
          {...bindButtonSoundEffects({ onClick: handleCloseButtonClick })}
        >
          <svg
            className={styles.closeIcon}
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M1 1L11 11M11 1L1 11"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </button>

        <div className={styles.content}>
          <div className={styles.logos}>
            <Image
              src="/images/credits-logo-1.png"
              alt="Elevation Pictures"
              width={120}
              height={48}
              className={styles.logo}
            />
            <Image
              src="/images/credits-logo-2.png"
              alt="A24"
              width={72}
              height={48}
              className={styles.logo}
            />
          </div>

          <nav className={styles.links} aria-label="Legal">
            <a href="#" className={styles.link}>
              Privacy Policy
            </a>
            <span className={styles.dot} aria-hidden="true">
              •
            </span>
            <a href="#" className={styles.link}>
              Terms of Use
            </a>
          </nav>

          <p className={styles.copyright}>
            Movie Platform © 2026 Powster © 2026 Elevation Pictures. All Rights
            Reserved.
          </p>
        </div>
      </aside>
    </>
  );
}
