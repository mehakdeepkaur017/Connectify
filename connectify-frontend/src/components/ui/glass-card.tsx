import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn(
        'backdrop-blur-xl bg-background/60 border-white/20 dark:border-white/10 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]',
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = 'GlassCard';

export { GlassCard, CardHeader as GlassCardHeader, CardTitle as GlassCardTitle, CardDescription as GlassCardDescription, CardContent as GlassCardContent, CardFooter as GlassCardFooter };
