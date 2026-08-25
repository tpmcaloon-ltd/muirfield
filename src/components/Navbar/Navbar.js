"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { bindButtonSoundEffects } from "@/lib/uiSounds";
import styles from "./Navbar.module.css";
import AmbientVolumeToggle from "./AmbientVolumeToggle";

function NavigationLink({ href, children, onNavigate }) {
  return (
    <Link
      href={href}
      className={`${styles.menuLink} underline-hover`}
      {...bindButtonSoundEffects({ onClick: onNavigate })}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  // close the menu when route transitions broadcast menu:close
  useEffect(() => {
    const handleMenuClose = () => setIsMenuOpen(false);
    window.addEventListener("menu:close", handleMenuClose);
    return () => window.removeEventListener("menu:close", handleMenuClose);
  }, []);

  return (
    <header className={styles.navbar} data-hide-play-cursor>
      <button
        {...bindButtonSoundEffects({
          type: "button",
          className: `${styles.menuBtn} ${isMenuOpen ? styles.menuBtnOpen : ""}`,
          onClick: () => setIsMenuOpen((open) => !open),
          "aria-expanded": isMenuOpen,
          "aria-controls": "nav-menu-overlay",
        })}
      >
        menu
      </button>

      <div
        id="nav-menu-overlay"
        className={`${styles.menuOverlay} ${isMenuOpen ? styles.menuOverlayOpen : ""}`}
        aria-hidden={!isMenuOpen}
      >
        <nav className={styles.menuNav}>
          <NavigationLink href="/" onNavigate={closeMenu}>
            home
          </NavigationLink>
          <NavigationLink href="/synopsis" onNavigate={closeMenu}>
            synopsis
          </NavigationLink>
          <NavigationLink href="/trailer" onNavigate={closeMenu}>
            trailer
          </NavigationLink>
        </nav>
      </div>

      <Link href="/" className={styles.logo} {...bindButtonSoundEffects()}>
        <h1 className={styles.title}>Muirfield</h1>
        <p className={styles.tagline}>Currently in theatres</p>
      </Link>
      <div className={styles.actions}>
        <AmbientVolumeToggle />
      </div>
    </header>
  );
}
