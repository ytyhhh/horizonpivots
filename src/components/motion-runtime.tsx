"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function MotionRuntime() {
  const pathname = usePathname();

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    if (reducedMotion.matches || coarsePointer.matches) return;

    let disposed = false;
    let teardown = () => {};

    void Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
      import("lenis"),
    ]).then(([gsapModule, scrollModule, lenisModule]) => {
      if (disposed) return;

      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollModule.ScrollTrigger;
      const Lenis = lenisModule.default;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        wheelMultiplier: 0.85,
        touchMultiplier: 1,
      });
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const context = gsap.context(() => {
        const header = document.querySelector<HTMLElement>("[data-app-header]");
        if (header) {
          ScrollTrigger.create({
            start: 48,
            end: "max",
            onUpdate: (self) => {
              header.dataset.scrolled = self.scroll() > 48 ? "true" : "false";
            },
          });
        }

        const heroItems = gsap.utils.toArray<HTMLElement>("[data-hero]");
        if (heroItems.length) {
          gsap.fromTo(
            heroItems,
            { opacity: 0, y: 32 },
            {
              opacity: 1,
              y: 0,
              duration: 0.9,
              stagger: 0.09,
              ease: "power3.out",
              clearProps: "transform,opacity",
            },
          );
        }

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
          gsap.fromTo(
            element,
            { opacity: 0, y: 28 },
            {
              opacity: 1,
              y: 0,
              duration: 0.82,
              ease: "power3.out",
              clearProps: "transform,opacity",
              scrollTrigger: {
                trigger: element,
                start: "top 88%",
                once: true,
              },
            },
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-radar-ring]").forEach((ring, index) => {
          gsap.to(ring, {
            scale: 1.08 + index * 0.025,
            opacity: 0.18,
            duration: 2.4 + index * 0.35,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((element) => {
          const target = Number(element.dataset.count);
          if (!Number.isFinite(target)) return;
          const state = { value: 0 };
          gsap.to(state, {
            value: target,
            duration: 1.25,
            delay: 0.25,
            ease: "power3.out",
            onUpdate: () => {
              element.textContent = Math.round(state.value).toLocaleString("zh-CN");
            },
          });
        });
      });

      ScrollTrigger.refresh();
      teardown = () => {
        context.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    });

    return () => {
      disposed = true;
      teardown();
    };
  }, [pathname]);

  return null;
}
