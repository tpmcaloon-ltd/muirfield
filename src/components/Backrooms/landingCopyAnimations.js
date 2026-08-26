import gsap from "gsap";

import { BTN_FADE_DURATION } from "@/components/Btn/Btn";
import {
  ANIMATED_TEXT_CHAR_CLASS,
  ANIMATED_TEXT_WORD_CLASS,
} from "@/components/AnimatedText/AnimatedText";

const bellFactor = (pos, total) => {
  const mid = Math.ceil(total / 2);
  return pos < mid ? pos : mid - Math.abs(Math.floor(total / 2) - pos) - 1;
};

const applyBellSet = (units) => {
  const total = units.length;
  units.forEach((unit, pos) => {
    const f = bellFactor(pos, total);
    gsap.set(unit, {
      scale: gsap.utils.mapRange(0, Math.ceil(total / 2), 0.5, 2.1, f),
      y: gsap.utils.mapRange(0, Math.ceil(total / 2), 0, 60, f),
      rotation:
        pos < total / 2
          ? gsap.utils.mapRange(0, Math.ceil(total / 2), -4, 0, f)
          : gsap.utils.mapRange(0, Math.ceil(total / 2), 0, 4, f),
      transformOrigin: "50% 50%",
      filter: "blur(12px)",
      opacity: 0,
      willChange: "transform, filter",
    });
  });
};

const playBellIn = (units, staggerAmount) =>
  gsap.to(units, {
    ease: "power3.inOut",
    y: 0,
    rotation: 0,
    scale: 1,
    filter: "blur(0px)",
    opacity: 1,
    duration: 1.6,
    stagger: { amount: staggerAmount, from: "random" },
  });

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

function getLandingNodes(root) {
  if (!root) {
    return { chars: [], words: [], button: null, title: null, tagline: null };
  }

  const title = root.querySelector("h1");
  const tagline = root.querySelector("p");
  const button = root.querySelector("button");

  return {
    title,
    tagline,
    button,
    chars: title
      ? [...title.querySelectorAll(`.${ANIMATED_TEXT_CHAR_CLASS}`)]
      : [],
    words: tagline
      ? [...tagline.querySelectorAll(`.${ANIMATED_TEXT_WORD_CLASS}`)]
      : [],
  };
}

export function playLandingCopyOut(root, { onComplete } = {}) {
  const { chars, words, button, title, tagline } = getLandingNodes(root);
  const timeline = gsap.timeline({ onComplete });

  if (chars.length) {
    timeline.add(playBellOut(chars, 0.8), 0);
  } else if (title) {
    timeline.to(title, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0);
  }

  if (words.length) {
    timeline.to(
      words,
      {
        yPercent: 110,
        opacity: 0,
        duration: 0.9,
        ease: "power3.in",
        stagger: 0.06,
      },
      0,
    );
  } else if (tagline) {
    timeline.to(tagline, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0);
  }

  if (button) {
    timeline.to(
      button,
      { opacity: 0, duration: BTN_FADE_DURATION, ease: "power2.out" },
      0,
    );
  }

  if (timeline.duration() === 0) {
    onComplete?.();
  }

  return timeline;
}

export function playLandingCopyIn(root) {
  const { chars, words, button, title, tagline } = getLandingNodes(root);
  const timeline = gsap.timeline();
  const taglineStart = chars.length ? 0.85 : title ? 0.6 : 0;
  const buttonStart = taglineStart + 0.35;

  if (chars.length) {
    applyBellSet(chars);
    timeline.add(playBellIn(chars, 0.8), 0);
  } else if (title) {
    gsap.set(title, { opacity: 0 });
    timeline.to(title, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0);
  }

  if (words.length) {
    gsap.set(words, { yPercent: 110, opacity: 0 });
    timeline.to(
      words,
      {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.06,
      },
      taglineStart,
    );
  } else if (tagline) {
    gsap.set(tagline, { opacity: 0 });
    timeline.to(
      tagline,
      { opacity: 1, duration: 0.6, ease: "power2.out" },
      taglineStart,
    );
  }

  if (button) {
    gsap.set(button, { opacity: 0 });
    timeline.to(
      button,
      { opacity: 1, duration: BTN_FADE_DURATION, ease: "power2.out" },
      buttonStart,
    );
  }

  return timeline;
}
