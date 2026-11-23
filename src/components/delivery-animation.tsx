"use client";

import { useEffect, useRef } from "react";
import type { Timeline } from "@svgdotjs/svg.js";

/** React owns the scene; SVG.js owns only the two envelope groups' motion. */
export default function DeliveryAnimation() {
  const sceneRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let disposed = false;
    let generation = 0;
    let timeline: Timeline | null = null;

    const resetScene = () => {
      scene.dataset.motion = "static";
      scene
        .querySelectorAll<SVGGElement>("[data-envelope]")
        .forEach((letter, index) => {
          letter.removeAttribute("transform");
          letter.setAttribute("opacity", index === 0 ? "1" : "0");
        });
    };

    const configureMotion = async () => {
      const currentGeneration = ++generation;
      timeline?.terminate();
      timeline = null;
      resetScene();
      if (motionPreference.matches) return;

      try {
        // Load the library only when this sending scene is actually mounted.
        const { SVG, Timeline: SvgTimeline } = await import("@svgdotjs/svg.js");
        if (
          disposed ||
          currentGeneration !== generation ||
          motionPreference.matches
        )
          return;

        timeline = new SvgTimeline();
        const sharedTimeline = timeline;
        scene
          .querySelectorAll<SVGGElement>("[data-envelope]")
          .forEach((node, index) => {
            const letter = SVG(node).timeline(sharedTimeline).opacity(0);
            letter
              .animate(3200, index * 1600, "absolute")
              .during((position: number) => {
                const eased = (1 - Math.cos(position * Math.PI)) / 2;
                const opacity = Math.max(
                  0,
                  Math.min(1, position / 0.18, (1 - position) / 0.25),
                );
                letter.opacity(opacity).transform({
                  translateX: -24 + 88 * eased,
                  translateY: 24 - 68 * eased,
                  rotate: -12 + 20 * eased,
                  scale: 0.8 + 0.12 * eased,
                  origin: [71, 94],
                });
              })
              .loop(Infinity);
          });
        scene.dataset.motion = "animated";
        if (document.visibilityState === "visible") sharedTimeline.play();
        else sharedTimeline.pause();
      } catch {
        // A failed animation import must never interrupt email progress.
        if (!disposed && currentGeneration === generation) {
          timeline?.terminate();
          timeline = null;
          resetScene();
        }
      }
    };

    const onMotionChange = () => void configureMotion();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && !motionPreference.matches)
        timeline?.play();
      else timeline?.pause();
    };

    motionPreference.addEventListener("change", onMotionChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    void configureMotion();

    return () => {
      disposed = true;
      generation++;
      motionPreference.removeEventListener("change", onMotionChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      timeline?.terminate();
    };
  }, []);

  return (
    <svg
      ref={sceneRef}
      data-delivery-animation
      data-motion="static"
      className="delivery-scene mx-auto mb-8"
      viewBox="0 0 224 160"
      width="224"
      height="160"
      aria-hidden="true"
      focusable="false"
    >
      <image
        href="/brand/illustrations/gift.svg"
        x="128"
        y="55"
        width="88"
        height="97"
      />
      <g data-envelope="first" opacity="1">
        <image
          href="/brand/illustrations/envelope.svg"
          x="18"
          y="56"
          width="106"
          height="76"
        />
      </g>
      <g data-envelope="second" opacity="0">
        <image
          href="/brand/illustrations/envelope.svg"
          x="18"
          y="56"
          width="106"
          height="76"
        />
      </g>
    </svg>
  );
}
