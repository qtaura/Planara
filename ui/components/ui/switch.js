'use client';
import { jsx as _jsx } from 'react/jsx-runtime';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from './utils';
function Switch({ className, ...props }) {
  return _jsx(SwitchPrimitive.Root, {
    className: cn(
      'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-switch data-[state=checked]:bg-primary',
      className
    ),
    ...props,
    children: _jsx(SwitchPrimitive.Thumb, {
      className:
        'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
    }),
  });
}
export { Switch };
