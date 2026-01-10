'use client';

import { motion, type SVGMotionProps } from 'motion/react';

interface FinProps {
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Gentle bob animation for the fin
const bobAnimation = {
  animate: { y: [0, -5, 0], rotate: [-2, 2, -2] },
  transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' as const },
};

type MotionPathProps = SVGMotionProps<SVGPathElement>;

export function Fin({ animated = false, className, style }: FinProps) {
  const pathProps: MotionPathProps = animated
    ? { animate: bobAnimation.animate, transition: bobAnimation.transition }
    : {};

  return (
    <motion.svg
      viewBox="0 0 846.96 900"
      fill="currentColor"
      className={className}
      style={style}
      {...(animated ? { animate: bobAnimation.animate, transition: bobAnimation.transition } : {})}
    >
      <motion.path
        d="M43.58.03C153.18.03,306.62-.04,382.59.04c120.73.13,241.47.06,362.2.66,80.69.4,116.57,40.75,96.88,119.93-56.84,228.54-138.5,444.9-308.34,617.59-118.66,120.66-263.06,173.36-429.44,159.65-35.55-2.93-94.37-15.09-103-53.03-7.59-33.36,34.74-63.42,61.34-81.68,264.07-181.34,304.94-415.6,113.6-665.6-10.47-13.68-54.95-70.57-117.46-67.24C46.41,30.96,47.97,7.9,43.58.03Z"
        {...pathProps}
      />
    </motion.svg>
  );
}
