import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Logo({ size = 'md', showText = true }) {
    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };
    const textSizes = {
        sm: 'text-base',
        md: 'text-lg',
        lg: 'text-2xl',
    };
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: `${sizes[size]} relative`, children: _jsxs("svg", { viewBox: "0 0 32 32", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: "w-full h-full", children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "logo-gradient", x1: "0%", y1: "0%", x2: "100%", y2: "100%", children: [_jsx("stop", { offset: "0%", stopColor: "#6366f1" }), _jsx("stop", { offset: "100%", stopColor: "#8b5cf6" })] }) }), _jsx("rect", { width: "32", height: "32", rx: "8", fill: "url(#logo-gradient)" }), _jsx("path", { d: "M10 8h7c2.76 0 5 2.24 5 5s-2.24 5-5 5h-3v6h-4V8zm4 4v4h3c1.1 0 2-.9 2-2s-.9-2-2-2h-3z", fill: "white" }), _jsx("circle", { cx: "23", cy: "23", r: "2", fill: "white", opacity: "0.6" })] }) }), showText && (_jsx("span", { className: `${textSizes[size]} tracking-tight text-slate-900 dark:text-white`, children: "Planara" }))] }));
}
