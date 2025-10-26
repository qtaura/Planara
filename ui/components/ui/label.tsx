'use client';

import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from './utils';

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  /** Indicates if the associated field is required */
  required?: boolean;
  /** Optional indicator text */
  optional?: boolean;
}

function Label({ className, required, optional, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-destructive ml-1" aria-label="required">
          *
        </span>
      )}
      {optional && !required && (
        <span className="text-muted-foreground ml-1 font-normal">(optional)</span>
      )}
    </LabelPrimitive.Root>
  );
}

export { Label };
