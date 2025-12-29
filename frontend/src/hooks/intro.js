import { useRef } from "react";
import { gsap } from "gsap";

const ZoomIntro = ({
  scale = 3,
  duration = 0.9,
  hold = 0.4,
  ease = "power3.inOut",
} = {}) => {
  const elementRef = useRef(null);
  const timelineRef = useRef(null);

  const playIntro = () => {
    return new Promise((resolve) => {
      const el = elementRef.current;
      if (!el) {
        resolve();
        return;
      }

      // Kill any running animation
      timelineRef.current?.kill();

      const rect = el.getBoundingClientRect();

      // 🔥 VISIBLE WINDOW CENTER (scroll-aware)
      const centerX = window.scrollX + window.innerWidth / 2;
      const centerY = window.scrollY + window.innerHeight / 2;

      const elementCenterX = rect.left + window.scrollX + rect.width / 2;
      const elementCenterY = rect.top + window.scrollY + rect.height / 2;

      const dx = centerX - elementCenterX;
      const dy = centerY - elementCenterY;

      gsap.set(el, {
        willChange: "transform",
        transformOrigin: "center center",
      });

      timelineRef.current = gsap.timeline({
        onComplete: resolve, // ✅ resolve AFTER heading settles
      })
        .to(el, {
          x: dx,
          y: dy,
          scale,
          duration,
          ease,
        })
        .to({}, { duration: hold })
        .to(el, {
          x: 0,
          y: 0,
          scale: 1,
          duration,
          ease,
        });
    });
  };

  return { elementRef, playIntro };
};
export default ZoomIntro;