# Planara UI

A React + Vite application styled with Tailwind CSS v4 and Radix UI components. This repo includes everything needed to run the app exactly as it works locally.

## Prerequisites
- Node.js 18+ (20+ recommended)
- npm 9+ (bundled with Node 18/20)

## Quick Start
1. Clone the repository:
   ```bash
   git clone https://github.com/qtaura/Planara.git
   cd Planara/ui
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the app:
   - Visit `http://localhost:5173/`

## Scripts
- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Type-check then build for production
- `npm run preview` — Preview the production build locally

## Project Structure
The UI lives under `ui/` to keep the repo organized.
```
Planara/
├── .gitignore
├── README.md
└── ui/
    ├── index.html
    ├── main.tsx
    ├── App (1).tsx
    ├── components/
    ├── styles/globals.css
    ├── lib/
    ├── types/
    ├── data/
    ├── postcss.config.js
    ├── vite.config.ts
    ├── package.json
    └── package-lock.json
```

## Tailwind & PostCSS
- Tailwind v4 is used via the official PostCSS plugin `@tailwindcss/postcss`.
- Global styles import Tailwind core layers and define theme tokens in `ui/styles/globals.css`.

## Common Notes
- Browser console may show `net::ERR_ABORTED` during hot reloads; this is normal for Vite HMR and does not indicate a failure.
- No environment variables are required. If you add any, place them in `.env` files and avoid committing them.

## Dependencies
Key runtime libraries are declared in `ui/package.json`:
- React 18, Vite 5
- Tailwind CSS v4, PostCSS, Autoprefixer
- Radix UI (`@radix-ui/react-*`)
- `lucide-react`, `cmdk`, `react-hook-form`, `react-day-picker`, `recharts`, `sonner`, `tailwind-merge`, `embla-carousel-react`, `vaul`, `motion`

## Building & Previewing
```bash
cd ui
npm run build
npm run preview
```

## Troubleshooting
- Ensure Node 18+ is installed: `node -v`
- If the dev server re-optimizes after install, wait for it to complete.
- If you see a PostCSS error about using `tailwindcss` directly, confirm `ui/postcss.config.js` uses `@tailwindcss/postcss` (already configured).