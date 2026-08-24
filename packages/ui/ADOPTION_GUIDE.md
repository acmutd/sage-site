# @sage/ui Adoption Guide

## Overview
`@sage/ui` is a shared component library for all SAGE web applications. It provides common UI elements including navigation atoms, mobile shell components, sidebar templates, and utility functions.

## Installation

Add `@sage/ui` to your workspace's `package.json` as a workspace dependency:

```json
{
  "dependencies": {
    "@sage/ui": "workspace:*"
  }
}
```

## Tailwind CSS Setup

### 1. Add Shared Package to Content Paths
Your app's `tailwind.config.js` **must** include the shared package in its content scanning paths:

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  // ... rest of config
};
```

**Why this matters:** Without this path, Tailwind will not scan shared component files, causing shared component styles to be purged from the CSS bundle and resulting in unstyled components at runtime.

### 2. Apply the Tailwind Preset
Import and apply the `@sage/ui` preset so your app inherits the SAGE design tokens (colors, font families, border radii) without duplicating them:

```javascript
// tailwind.config.js
import uiPreset from "../packages/ui/tailwind.preset.js";

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  presets: [uiPreset],
  theme: {
    extend: {
      // Add only tokens specific to your app here
    },
  },
};
```

The preset is the single source of truth for the SAGE design system tokens (`accent`, `bglight`, `bgdark`, `textdark`, `textlight`, `buttonhover`, `destructive`, `innercontainer`, `font-dmsans`, `font-mermaid`, and custom border radii). Do not redefine these in your app's config — extend on top of the preset instead.

### 3. Dependency Verification
Ensure your `package.json` includes all required peer dependencies:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^7.1.1",
    "lucide-react": "^0.475.0",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "next-themes": "^0.4.4",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.0.2"
  }
}
```

## Component Import Reference

### Navigation Atoms
Composable building blocks for custom navbar layouts. All route-specific values (links, home href) are passed in as props — the package contains no hardcoded routes.

```typescript
import {
  NavBrand,           // Logo/home link with theme support
  NavPrimaryLinks,    // Configurable primary nav links
  UserProfileMenu,    // Profile dropdown with auth
} from "@sage/ui";
import type { NavLinkItem } from "@sage/ui";
```

**`NavBrand`** — Logo link to your home route:
```typescript
<NavBrand
  isDarkMode={isDarkMode}
  homeHref="/"              // Required: your app's home route
  logoDarkSrc="/logo-dark.svg"  // Optional: defaults to /Sage_Logo_Dark.svg
  logoLightSrc="/logo-light.svg"
/>
```

**`NavPrimaryLinks`** — Renders a list of nav links. Define your own routes in the consuming app:
```typescript
import { Route, MessageCirclePlus } from "lucide-react";
import type { NavLinkItem } from "@sage/ui";

const NAV_LINKS: NavLinkItem[] = [
  { to: "/planner", label: "Plan your degree", icon: Route },
  { to: "/chatbot", label: "Start a chat", icon: MessageCirclePlus },
];

<NavPrimaryLinks
  isDarkMode={isDarkMode}
  links={NAV_LINKS}
/>
```

`NavLinkItem` shape:
```typescript
interface NavLinkItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}
```

### Mobile Shell
Shared mobile navigation container. Pass your app-specific nav links and sidebar content as props.

```typescript
import { MobileNavbar } from "@sage/ui";
import type { NavLinkItem } from "@sage/ui";
```

Key props:
- `navLinks: NavLinkItem[]` — Links rendered in the mobile dropdown menu
- `homeHref?: string` — Home route for the logo link inside the drawer (default: `"/"`)
- `sidebarContent?: (onClose: () => void) => ReactNode` — Sidebar panel content
- `sidebarIcon?: ReactNode` — Icon shown in the top-left to open the sidebar
- `showSidebar?: boolean` — Whether to render the sidebar toggle at all (default: `true`)
- `isDarkMode: boolean` — Theme mode toggle
- `user: unknown` — Current user object (truthy = logged in)
- `logout: () => void` — Sign out handler

```typescript
import { Route, MessageCirclePlus, UserRound } from "lucide-react";

const MOBILE_LINKS: NavLinkItem[] = [
  { to: "/planner", label: "Plan your degree", icon: Route },
  { to: "/chatbot", label: "Start a chat", icon: MessageCirclePlus },
  { to: "/profile", label: "Your Profile", icon: UserRound },
];

<MobileNavbar
  isInWebapp={isInWebapp}
  isDarkMode={isDarkMode}
  user={user}
  logout={logout}
  navLinks={MOBILE_LINKS}
  sidebarContent={(onClose) => <MySidebarContent onClose={onClose} />}
/>
```

### Route Mode Detection
`@sage/ui` does **not** export a route mode hook. Each consuming app owns its own notion of "am I inside the webapp vs on a public page." Implement it locally:

```typescript
// src/hooks/useRouteMode.ts
import { useLocation } from "react-router-dom";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/forgot-password"];

export function useRouteMode() {
  const location = useLocation();
  return {
    isInWebapp: !PUBLIC_ROUTES.includes(location.pathname),
    pathname: location.pathname,
  };
}
```

Adjust `PUBLIC_ROUTES` to match your app's route structure.

### Sidebar Template
Shared sidebar shell for desktop collapse rails and configurable action slots:

```typescript
import { SidebarTemplate } from "@sage/ui";
```

Recommended props:
- `isCollapsed` - Controls the expanded vs collapsed layout
- `onToggleCollapse` - Toggles the sidebar state
- `primaryAction` - One primary action slot for the expanded header
- `collapsedActions` - Configurable icon/label action list for the collapsed rail
- `renderExpandedContent` - Main sidebar body for the expanded state
- `renderCollapsedFooter` - Optional footer content for the collapsed rail

Use this when multiple apps share the same sidebar affordances but supply different content, actions, or open/close behavior.

### Environment Banner
Development environment indicator:

```typescript
import { DevEnvironmentBanner } from "@sage/ui";
```

Props:
- `isDevelopment` (boolean) - Explicit development flag (no Vite env globals)
- `className` (string, optional) - Custom styling

### UI Primitives
Re-exported shadcn/ui components (button, card, dropdown-menu, dialog, etc.):

```typescript
import {
  Button,
  Card,
  CardContent,
  DropdownMenu,
  DropdownMenuContent,
  // ... plus 20+ others
} from "@sage/ui";
```

## Best Practices

### 1. Define Routes in the Consuming App
Navigation components accept routes as props — never rely on hardcoded defaults. Define your link arrays once in a shared constants file:

```typescript
// src/lib/navLinks.ts
import { Route, MessageCirclePlus, UserRound } from "lucide-react";
import type { NavLinkItem } from "@sage/ui";

export const PRIMARY_NAV_LINKS: NavLinkItem[] = [
  { to: "/planner", label: "Plan your degree", icon: Route },
  { to: "/chatbot", label: "Start a chat", icon: MessageCirclePlus },
];

export const MOBILE_NAV_LINKS: NavLinkItem[] = [
  ...PRIMARY_NAV_LINKS,
  { to: "/profile", label: "Your Profile", icon: UserRound },
];
```

### 2. Component Prop Flexibility
Shared components accept `className` overrides for customization:

```typescript
<NavBrand
  isDarkMode={isDarkMode}
  homeHref="/"
  className="ml-4"
  imgClassName="h-10 w-auto"
/>
```

### 3. Avoid Vite Environment Globals in Shared Code
Shared components must not import from `import.meta.env`. Pass explicit props instead:

```typescript
// ❌ DON'T DO THIS in shared components
const isDev = import.meta.env.DEV;

// ✅ DO THIS instead
export function DevEnvironmentBanner({ isDevelopment, className }: Props) {
  if (!isDevelopment) return null;
}
```

### 4. Test Token Consistency
After integrating @sage/ui, run your build and verify:
1. No errors from Tailwind class purging (check console)
2. Navbar renders with correct colors/spacing
3. Mobile responsiveness works (test dropdown, sidebar, overlay)

### 5. Monorepo Workspace Resolution
If using pnpm workspaces, ensure your `pnpm-workspace.yaml` includes the ui package:

```yaml
packages:
  - 'packages/ui'
  - 'main'
  - '...'
```

## Adoption Checklist
When adding @sage/ui to a new site:

- [ ] Add `@sage/ui` as workspace dependency in `package.json`
- [ ] Update `tailwind.config.js` to include `../packages/ui/src/**/*.{js,ts,jsx,tsx}` in content paths
- [ ] Apply `uiPreset` from `../packages/ui/tailwind.preset.js` via `presets: [uiPreset]` — do not manually redefine SAGE design tokens
- [ ] Install all peer dependencies (`react`, `react-router-dom`, `lucide-react`, `@radix-ui/*`, etc.)
- [ ] Define your app's `NavLinkItem[]` arrays for desktop and mobile nav
- [ ] Implement `useRouteMode` locally with your app's public route list
- [ ] Test navbar component rendering on desktop and mobile
- [ ] Verify no TypeScript errors in the consuming app
- [ ] Run `build` and confirm no CSS purging errors in output
