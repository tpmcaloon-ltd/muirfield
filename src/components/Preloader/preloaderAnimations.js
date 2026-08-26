import gsap from "gsap";

import { BTN_FADE_DURATION } from "@/components/Btn/Btn";

const bellFactor = (pos, total) => {
  const mid = Math.ceil(total / 2);
  return pos < mid ? pos : mid - Math.abs(Math.floor(total / 2) - pos) - 1;
};

const playBellOut = (units, staggerAmount) => {
  const total = units.length;

  return gsap.to(units, {
    ease: "power3.inOut",
    duration: 1.6,
    stagger: { amount: staggerAmount, from: "random" },
    y: (index) => {
      const f = bellFactor(index, total);
      return gsap.utils.mapRange(0, Math.ceil(total / 2), 0, 60, f);
    },
    rotation: (index) => {
      const f = bellFactor(index, total);
      return index < total / 2
        ? gsap.utils.mapRange(0, Math.ceil(total / 2), -4, 0, f)
        : gsap.utils.mapRange(0, Math.ceil(total / 2), 0, 4, f);
    },
    scale: (index) => {
      const f = bellFactor(index, total);
      return gsap.utils.mapRange(0, Math.ceil(total / 2), 0.5, 2.1, f);
    },
    filter: "blur(12px)",
    opacity: 0,
  });
};

export function playPreloaderOut(root, { onComplete } = {}) {
  if (!root) {
    onComplete?.();
    return null;
  }

  const title = root.querySelector("h2");
  const chars = title ? [...title.querySelectorAll(".copy-char")] : [];
  const primaryButton = root.querySelector("[data-preloader-primary]");
  const secondaryButton = root.querySelector("[data-preloader-secondary]");
  const timeline = gsap.timeline({ onComplete });

  if (chars.length) {
    timeline.add(playBellOut(chars, 0.8), 0);
  } else if (title) {
    timeline.to(title, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0);
  }

  [primaryButton, secondaryButton].forEach((node) => {
    if (!node) {
      return;
    }

    timeline.to(
      node,
      { opacity: 0, duration: BTN_FADE_DURATION, ease: "power2.out" },
      0,
    );
  });

  if (timeline.duration() === 0) {
    onComplete?.();
  }

  return timeline;
}
