# Mise - App

## Prerequisites

- **Node.js** (v20 or higher)
- **pnpm** (v9 or higher)

To install pnpm:

```bash
npm install -g pnpm
# or
corepack enable && corepack prepare pnpm@latest --activate
```

## Quick Start

1. **Install dependencies:**

   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory (optional, defaults may work for local dev):

   ```env
   VITE_API_URL=http://localhost:8000 # IMPORTANT, can be relative (e.g. /api when deploying with kubernetes)
   VITE_API_VERSION=v1
   VITE_APP_NAME=Mise
   VITE_APP_VERSION=1.0.0
   VITE_APP_ENV=development
   ```

3. **Start development server:**

   ```bash
   pnpm run dev
   ```

   The app will be available at http://localhost:3000

## Available Scripts

- `pnpm run dev` - Start development server (port 3000)
- `pnpm run build` - Build for production (outputs to `dist/`)
- `pnpm run serve` - Preview production build locally
- `pnpm run test` - Run tests
- `pnpm run lint` - Check code for linting errors
- `pnpm run lint:fix` - Auto-fix linting errors
- `pnpm run typecheck` - Type check TypeScript code

## Docker

Build and run with Docker:

```bash
docker build -t mise-app .
docker run -p 80:80 mise-app
```

The app will be available at http://localhost

## Project Structure

- `src/` - Source code
  - `components/` - React components
  - `routes/` - TanStack Router routes
  - `services/` - API services and domain logic
  - `lib/` - Utilities and configuration
- `public/` - Static assets
- `dist/` - Production build output (generated)

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TanStack Router** - Routing
- **TanStack Query** - Data fetching
- **Tailwind CSS** - Styling
- **shadcn/ui** - Accessible UI components (based on Radix UI)
