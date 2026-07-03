import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps extends React.SVGProps<SVGSVGElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  default: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const LoadingSpinner = React.forwardRef<SVGSVGElement, LoadingSpinnerProps>(
  ({ className, size = 'default', ...props }, ref) => {
    return (
      <Loader2
        ref={ref}
        className={cn('animate-spin text-primary', sizeClasses[size], className)}
        {...props}
      />
    );
  }
);
LoadingSpinner.displayName = 'LoadingSpinner';
