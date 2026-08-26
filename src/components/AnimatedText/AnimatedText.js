"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import styles from "./AnimatedText.module.css";

gsap.registerPlugin(SplitText, ScrollTrigger);

export const ANIMATED_TEXT_WORD_CLASS = styles.word;
export const ANIMATED_TEXT_CHAR_CLASS = styles.char;
export const ANIMATED_TEXT_LINE_CLASS = styles.line;

function getBellCurveFactor(position, totalUnits) {
  const midpoint = Math.ceil(totalUnits / 2);
  return position < midpoint
    ? position
    : midpoint - Math.abs(Math.floor(totalUnits / 2) - position) - 1;
}

function applyBellCurveInitialState(units) {
  const totalUnits = units.length;

  units.forEach((unit, position) => {
    const curveFactor = getBellCurveFactor(position, totalUnits);

    gsap.set(unit, {
      scale: gsap.utils.mapRange(
        0,
        Math.ceil(totalUnits / 2),
        0.5,
        2.1,
        curveFactor,
      ),
      y: gsap.utils.mapRange(0, Math.ceil(totalUnits / 2), 0, 60, curveFactor),
      rotation:
        position < totalUnits / 2
          ? gsap.utils.mapRange(
              0,
              Math.ceil(totalUnits / 2),
              -4,
              0,
              curveFactor,
            )
          : gsap.utils.mapRange(
              0,
              Math.ceil(totalUnits / 2),
              0,
              4,
              curveFactor,
            ),
      transformOrigin: "50% 50%",
      filter: "blur(12px)",
      opacity: 0,
      "will-change": "transform, filter",
    });
  });
}

function playBellCurveReveal(units, staggerAmount, delaySeconds) {
  return gsap.to(units, {
    delay: delaySeconds,
    ease: "power3.inOut",
    y: 0,
    rotation: 0,
    scale: 1,
    filter: "blur(0px)",
    opacity: 1,
    duration: 1.6,
    stagger: { amount: staggerAmount, from: "random" },
  });
}

function bindScrollReveal(triggerElement, playAnimation) {
  ScrollTrigger.create({
    trigger: triggerElement,
    start: "top 88%",
    once: true,
    onEnter: playAnimation,
  });
}

export default function AnimatedText({
  children,
  variant = "variant1",
  splitBy = "chars",
  animateOnScroll = true,
  autoPlay = true,
  delay = 0,
}) {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      if (!containerRef.current) {
        return undefined;
      }

      const textElements = containerRef.current.hasAttribute(
        "data-animated-text-wrapper",
      )
        ? Array.from(containerRef.current.children)
        : [containerRef.current];

      const splitInstances = [];

      // variant1: bell-curve char or word reveal with blur and scale
      if (variant === "variant1") {
        textElements.forEach((element) => {
          if (splitBy === "words") {
            const split = SplitText.create(element, {
              type: "words",
              wordsClass: ANIMATED_TEXT_WORD_CLASS,
            });
            splitInstances.push(split);

            const words = [...split.words];
            applyBellCurveInitialState(words);

            const playReveal = () => playBellCurveReveal(words, 0.25, delay);

            if (animateOnScroll) {
              bindScrollReveal(element, playReveal);
            } else if (autoPlay) {
              playReveal();
            }
          } else {
            const split = SplitText.create(element, {
              type: "words,chars",
              wordsClass: ANIMATED_TEXT_WORD_CLASS,
              charsClass: ANIMATED_TEXT_CHAR_CLASS,
            });
            splitInstances.push(split);

            for (const word of split.words) {
              const characters = [
                ...word.querySelectorAll(`.${ANIMATED_TEXT_CHAR_CLASS}`),
              ];
              applyBellCurveInitialState(characters);

              const playReveal = () =>
                playBellCurveReveal(characters, 0.8, delay);

              if (animateOnScroll) {
                bindScrollReveal(word, playReveal);
              } else if (autoPlay) {
                playReveal();
              }
            }
          }
        });
      }

      // variant2: masked line or word slide-up reveal
      if (variant === "variant2") {
        textElements.forEach((element) => {
          const splitByWords = splitBy === "words";

          const split = SplitText.create(element, {
            type: splitByWords ? "words" : "lines",
            wordsClass: ANIMATED_TEXT_WORD_CLASS,
            linesClass: ANIMATED_TEXT_LINE_CLASS,
            mask: splitByWords ? "words" : "lines",
          });
          splitInstances.push(split);

          const units = splitByWords ? [...split.words] : [...split.lines];

          gsap.set(units, { yPercent: 110, opacity: 0 });

          const playReveal = () =>
            gsap.to(units, {
              delay,
              yPercent: 0,
              opacity: 1,
              duration: 0.9,
              ease: "power3.out",
              stagger: splitByWords ? 0.06 : 0.1,
            });

          if (animateOnScroll) {
            bindScrollReveal(element, playReveal);
          } else if (autoPlay) {
            playReveal();
          }
        });
      }

      return () => splitInstances.forEach((split) => split.revert());
    },
    {
      scope: containerRef,
      dependencies: [variant, splitBy, animateOnScroll, autoPlay, delay],
    },
  );

  return (
    <div
      ref={containerRef}
      className={styles.root}
      data-animated-text-wrapper="true"
    >
      {children}
    </div>
  );
}
