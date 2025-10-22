"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "./utils";
function Progress({ className, value, ...props }) {
    return (_jsx(ProgressPrimitive.Root, { className: cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className), ...props, children: _jsx(ProgressPrimitive.Indicator, { className: "h-full w-full flex-1 bg-primary transition-transform", style: { transform: `translateX(-${100 - (value ?? 0)}%)` } }) }));
}
export { Progress };
