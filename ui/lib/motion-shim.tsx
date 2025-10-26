import React from 'react';

// CSP-safe shim for Motion under strict `script-src` without `unsafe-eval`.
// Provides minimal pass-through components for motion.div and motion.button,
// plus a no-op AnimatePresence that just renders children.

function passProps<T extends keyof JSX.IntrinsicElements>(tag: T) {
  return React.forwardRef<any, React.ComponentProps<T>>(function Shim(props, ref) {
    const Comp: any = tag;
    return <Comp ref={ref} {...props} />;
  });
}

export const motion = {
  div: passProps('div'),
  button: passProps('button'),
};

export const AnimatePresence: React.FC<{ children?: React.ReactNode } & Record<string, any>> = ({
  children,
}) => <>{children}</>;
