"use client";

import { useEffect } from "react";

import { isTouchViewport, syncVisualViewport } from "@/lib/syncVisualViewport";

export default function VisualViewportSync() {
  useEffect(() => {
    const cleanupViewportSync = syncVisualViewport();
    const documentRoot = document.documentElement;

    if (isTouchViewport()) {
      documentRoot.classList.add("touch-viewport");
    }

    return () => {
      cleanupViewportSync();
      documentRoot.classList.remove("touch-viewport");
    };
  }, []);

  return null;
}
