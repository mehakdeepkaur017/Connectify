'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/shared/navbar';
import { Footer } from '@/components/shared/footer';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { FloatingShapes } from '@/components/ui/floating-shapes';
import { MessageSquare, Users, Image as ImageIcon, Zap } from 'lucide-react';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from '@/components/ui/glass-card';
import Link from 'next/link';

const features = [
  {
    name: 'Connect with Anyone',
    description: 'Find friends, join communities, and spark conversations with people who share your passions.',
    icon: Users,
  },
  {
    name: 'Share Your Moments',
    description: 'Upload high-quality photos and stories. Express yourself through our premium visual experience.',
    icon: ImageIcon,
  },
  {
    name: 'Real-time Messaging',
    description: 'Chat instantly with zero lag. Read receipts, typing indicators, and rich media support.',
    icon: MessageSquare,
  },
  {
    name: 'Lightning Fast',
    description: 'Built on edge networks for instant load times and butter-smooth interactions everywhere.',
    icon: Zap,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col relative selection:bg-indigo-500/30">
      <Navbar />
      <AnimatedBackground />
      <FloatingShapes />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-20 pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mx-auto max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 pb-4">
              Connect. Share. Inspire.
            </h1>
            <p className="mt-6 text-xl leading-8 text-muted-foreground">
              Experience the next generation of social networking. A premium, ad-free environment designed for meaningful connections and stunning visual expression.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg" className="rounded-full shadow-lg shadow-indigo-500/25 h-12 px-8 text-md font-semibold">
                  Get Started Free
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="ghost" size="lg" className="rounded-full h-12 px-8 text-md font-semibold">
                  Learn more <span aria-hidden="true" className="ml-2">→</span>
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>


        {/* Features Section */}
        <section id="features" className="relative px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything you need to build your network
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <GlassCard className="h-full border-t-white/40 dark:border-t-white/20 hover:scale-[1.02] transition-transform duration-300">
                  <GlassCardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
                      <feature.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <GlassCardTitle className="text-xl">{feature.name}</GlassCardTitle>
                    <GlassCardDescription className="text-base mt-2">
                      {feature.description}
                    </GlassCardDescription>
                  </GlassCardHeader>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
