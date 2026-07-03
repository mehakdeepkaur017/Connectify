'use client';

import * as React from 'react';
import { motion } from 'framer-motion';

export const FloatingShapes = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        animate={{
          y: [0, -20, 0],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-24 h-24 bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 rounded-3xl backdrop-blur-3xl border border-white/10 shadow-2xl"
      />
      <motion.div
        animate={{
          y: [0, 30, 0],
          rotate: [0, -15, 0],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1
        }}
        className="absolute bottom-1/3 right-1/4 w-32 h-32 bg-gradient-to-br from-violet-600/20 to-fuchsia-500/20 rounded-full backdrop-blur-3xl border border-white/10 shadow-2xl"
      />
      <motion.div
        animate={{
          x: [0, 20, 0],
          rotate: [45, 90, 45],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute top-1/2 right-1/3 w-16 h-16 bg-gradient-to-bl from-blue-500/20 to-indigo-500/20 rounded-xl backdrop-blur-3xl border border-white/10 shadow-2xl"
      />
    </div>
  );
};
