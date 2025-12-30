'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'motion/react';

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = '',
  prefix = '',
  duration = 2,
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number;
    let animationFrame: number;
    let lastDisplayedValue = 0;

    // For small numbers, we need to control when each number appears
    // to make the animation feel the same duration as large numbers
    const getDisplayValue = (progress: number): number => {
      if (value <= 10) {
        // For small numbers (1-10), show each number at equal intervals
        // This makes 7 take same visual time as 500
        const step = Math.floor(progress * value);
        return Math.min(step, value);
      }
      // For larger numbers, use smooth easing
      const eased = 1 - Math.pow(1 - progress, 3);
      return Math.round(eased * value);
    };

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);

      const newValue = getDisplayValue(progress);

      // Only update state if value changed (reduces re-renders for small numbers)
      if (newValue !== lastDisplayedValue) {
        lastDisplayedValue = newValue;
        setDisplayValue(newValue);
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Ensure final value is set
        setDisplayValue(value);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isInView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      <motion.span>{displayValue.toLocaleString()}</motion.span>
      {suffix}
    </span>
  );
}
