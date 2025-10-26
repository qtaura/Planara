'use client';
import { jsx as _jsx } from 'react/jsx-runtime';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from './utils';
function Avatar({ className, ...props }) {
  return _jsx(AvatarPrimitive.Root, {
    className: cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className),
    ...props,
  });
}
function AvatarImage({ className, ...props }) {
  return _jsx(AvatarPrimitive.Image, {
    className: cn('aspect-square h-full w-full', className),
    ...props,
  });
}
function AvatarFallback({ className, ...props }) {
  return _jsx(AvatarPrimitive.Fallback, {
    className: cn(
      'flex h-full w-full items-center justify-center rounded-full bg-muted',
      className
    ),
    ...props,
  });
}
export { Avatar, AvatarImage, AvatarFallback };
