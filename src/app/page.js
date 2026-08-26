"use client";

import Backrooms from "@/components/Backrooms/Backrooms";
import CreatorAttribution from "@/components/CreatorAttribution/CreatorAttribution";
import { usePreloader } from "@/context/PreloaderContext";
import styles from "./page.module.css";

export default function HomePage() {
  const { isLandingReady } = usePreloader();

  return (
    <main className={styles.main}>
      <Backrooms isLandingReady={isLandingReady} />
      <CreatorAttribution />
    </main>
  );
}
