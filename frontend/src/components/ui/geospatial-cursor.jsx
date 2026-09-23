import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

/**
 * GeospatialCursor: Sleek, lightweight satellite targeting reticle cursor
 * Designed specifically for SatQuery AI (ISRO / Remote Sensing Intelligence).
 * Features a glowing coordinate dot, trailing orbital reticle, and magnetic hover expansion.
 */
export default function GeospatialCursor({ isModalOpen = false }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [hasModalInDom, setHasModalInDom] = useState(false);

  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  // Automatically detect if any modal/popup is open without constant DOM subtree thrashing
  useEffect(() => {
    const checkModal = () => {
      const modal = document.querySelector('[role="dialog"], .fixed.inset-0.z-50');
      setHasModalInDom(!!modal);
    };
    checkModal();
    window.addEventListener('click', checkModal);
    window.addEventListener('keydown', checkModal);
    return () => {
      window.removeEventListener('click', checkModal);
      window.removeEventListener('keydown', checkModal);
    };
  }, []);

  // Fast responsive spring for center satellite point
  const dotX = useSpring(mouseX, { stiffness: 800, damping: 35 });
  const dotY = useSpring(mouseY, { stiffness: 800, damping: 35 });

  // Smooth orbital trailing spring for outer targeting reticle
  const ringX = useSpring(mouseX, { stiffness: 280, damping: 26 });
  const ringY = useSpring(mouseY, { stiffness: 280, damping: 26 });

  useEffect(() => {
    // Only run on non-touch devices
    if (typeof window === 'undefined' || window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      if (!isVisible) setIsVisible(true);

      const target = e.target;
      const isInteractive = target && (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('.group') ||
        target.closest('[data-cursor="pointer"]')
      );
      const nextHovered = !!isInteractive;
      setIsHovered(prev => (prev !== nextHovered ? nextHovered : prev));
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setIsVisible(true);
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isVisible, mouseX, mouseY]);

  // When a popup/modal is open, restore the normal OS cursor so it is 100% visible on light modal backgrounds
  if (isModalOpen || hasModalInDom || !isVisible) return null;

  return (
    <div className="hidden md:block pointer-events-none fixed inset-0 z-[999999] overflow-hidden">
      {/* Hide native OS cursor on desktop so only the geospatial effect is visible */}
      <style>{`
        @media (min-width: 768px) {
          *, *::before, *::after, button, a, [role="button"], input, select, textarea, label {
            cursor: none !important;
          }
        }
      `}</style>

      {/* Outer Orbital Targeting Reticle */}
      <motion.div
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovered ? 52 : 34,
          height: isHovered ? 52 : 34,
          borderColor: isHovered ? 'rgba(34, 211, 238, 0.75)' : 'rgba(34, 211, 238, 0.35)',
          backgroundColor: isHovered ? 'rgba(34, 211, 238, 0.08)' : 'rgba(34, 211, 238, 0.02)',
          rotate: isHovered ? 45 : 0,
        }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="absolute rounded-full border shadow-[0_0_20px_rgba(34,211,238,0.25)] flex items-center justify-center backdrop-blur-[0.5px]"
      >
        {/* Subtle satellite reticle crosshair ticks */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1.5px] h-1.5 bg-cyan-300/60" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1.5px] h-1.5 bg-cyan-300/60" />
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[1.5px] w-1.5 bg-cyan-300/60" />
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[1.5px] w-1.5 bg-cyan-300/60" />
      </motion.div>

      {/* Center Precision Satellite Dot */}
      <motion.div
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          scale: isHovered ? 1.4 : 1,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className="absolute w-1.5 h-1.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,1)]"
      />
    </div>
  );
}
