import { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';

/**
 * Swipeable card primitive.
 * onSwipeLeft  → unknown
 * onSwipeRight → known
 */
export default function SwipeCard({ children, onSwipeLeft, onSwipeRight, className = '' }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-150, 150], [-15, 15]);
  const leftOpacity  = useTransform(x, [-100, 0], [1, 0]);
  const rightOpacity = useTransform(x, [0, 100], [0, 1]);
  const controls = useAnimation();

  async function handleDragEnd(_, info) {
    if (info.offset.x > 80) {
      await controls.start({ x: 300, opacity: 0 });
      onSwipeRight?.();
    } else if (info.offset.x < -80) {
      await controls.start({ x: -300, opacity: 0 });
      onSwipeLeft?.();
    } else {
      controls.start({ x: 0, rotate: 0 });
    }
  }

  return (
    <div className="relative select-none">
      {/* Swipe indicators */}
      <motion.div style={{ opacity: leftOpacity }}
        className="absolute left-4 top-4 z-10 text-red-400 font-bold text-sm border border-red-400 px-2 py-0.5 rounded">
        ✗ MISS
      </motion.div>
      <motion.div style={{ opacity: rightOpacity }}
        className="absolute right-4 top-4 z-10 text-emerald-400 font-bold text-sm border border-emerald-400 px-2 py-0.5 rounded">
        ✓ GOT IT
      </motion.div>

      <motion.div
        className={`cursor-grab active:cursor-grabbing ${className}`}
        style={{ x, rotate }}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        onDragEnd={handleDragEnd}
        animate={controls}
        whileTap={{ scale: 1.02 }}
      >
        {children}
      </motion.div>
    </div>
  );
}