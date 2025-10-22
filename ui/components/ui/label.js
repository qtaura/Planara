"use client";
import { jsx as _jsx } from "react/jsx-runtime";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "./utils";
function Label({ className, ...props }) {
    return (_jsx(LabelPrimitive.Root, { className: cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className), ...props }));
}
export { Label };
