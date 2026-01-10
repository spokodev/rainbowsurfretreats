'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

interface SurfboardProps {
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Surfboard path from Drawings/Surfboard1.svg
const surfboardPaths = [
  "M618.85,5.19C415.35,592.33,216.31,1166.59,13.47,1751.81-84.82,1467.45,378.99,117.41,618.85,5.19Z",
  "M104,1785.66C303.22,1211.17,508.93,612.74,708.15,38.25c10.99.65,34.03,81.82,25.38,156.47-53.31,460.06-378.98,1299.15-515.47,1492.67-38.65,54.8-104.58,104.78-114.06,98.27Z",
  "M685.53,14.64C482.46,600.74,273.74,1198.66,70.66,1784.76c-15.79,3.74-25.77.08-32.47-11.21C241.48,1187.08,450.41,588.8,653.7,2.33c16.05-6.4,26.02,1.25,31.84,12.31Z"
];

const bobAnimation = {
  animate: {
    y: [0, -8, 0],
    rotate: [-3, 3, -3],
  },
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export function Surfboard({ animated = false, className, style }: SurfboardProps) {
  return (
    <motion.svg
      viewBox="0 0 735.43 1786.23"
      className={cn('fill-current', className)}
      style={style}
      animate={animated ? bobAnimation.animate : undefined}
      transition={animated ? bobAnimation.transition : undefined}
    >
      {surfboardPaths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </motion.svg>
  );
}
