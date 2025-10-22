import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from '../lib/theme-context';
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (_jsxs(Button, { variant: "ghost", size: "sm", onClick: toggleTheme, className: "h-9 w-9 p-0", children: [theme === 'dark' ? (_jsx(Sun, { className: "h-4 w-4" })) : (_jsx(Moon, { className: "h-4 w-4" })), _jsx("span", { className: "sr-only", children: "Toggle theme" })] }));
}
