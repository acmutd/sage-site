# @sage/ui Adoption Guide

## Overview
`@sage/ui` is a shared component library for all SAGE web applications. It provides common UI elements including navigation atoms, mobile shell components, theme hooks, and utility functions.

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
Your app's `tailwind.config.js` **must** include the shared package in its content scanning paths. This ensures Tailwind purges only unused classes and includes shared component styles:

```javascript
// tailwind.config.js
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // REQUIRED: Add the shared package path to scan shared components
    "../packages/ui/src/**/*.{js,ts,jsx,tsx}"
  ],
  // ... rest of config
};
```

**Why this matters:** Without this path, Tailwind will not scan shared component files, causing shared navbar classes to be purged from the CSS bundle. This results in unstyled components at runtime.

### 2. Ensure Theme Token Parity
Your app's Tailwind theme **must** define all custom tokens used by shared components:

#### Required Color Tokens
- `accent` - Primary action color (e.g., `#5AED86`)
- `textlight` - Light text color for dark backgrounds
- `textdark` - Dark text color for light backgrounds
- `bglight` - Light background color
- `bgdark` - Dark background color
- `destructive` - Destructive action color (e.g., `#DB0000`)
- `buttonhover` - Button hover state color

#### Example Theme Extension
```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        accent: "#5AED86",
        textlight: "#F8F8F8",
        textdark: "#1a1a1a",
        bglight: "#F3F3F3",
        bgdark: "#1a1a1a",
        destructive: "#DB0000",
        buttonhover: "#4AC570",
        innercontainer: "#F8F8F8",
      },
    },
  },
  // ... rest of config
};
```

If your app uses different colors, either:
1. Override the shared component classes via props, OR
2. Define the tokens in your theme to match your design system

### 3. Dependency Verification
Ensure your `package.json` includes all required peer dependencies for shared components:

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
Composable building blocks for custom navbar layouts:

```typescript
import {
  NavBrand,           // Logo/home link with theme support
  NavPrimaryLinks,    // Planner and chatbot links
  UserProfileMenu,    // Profile dropdown with auth
  useRouteMode,       // Hook to detect public vs in-app routes
} from "@sage/ui";
```

### Mobile Shell
Shared mobile navigation container:

```typescript
import { MobileNavbar } from "@sage/ui";
```

Props:
- `renderSidebarContent` (React.ReactNode) - Sidebar content component
- `isDarkMode` (boolean) - Dark mode toggle
- `sidebarClassName` (string, optional) - Custom sidebar classes
- `overlayClassName` (string, optional) - Custom overlay classes

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

### 1. Component Prop Flexibility
Shared components accept className overrides for customization. Always pass custom classes if you need to deviate from defaults:

```typescript
<NavBrand 
  isDarkMode={isDarkMode}
  className="ml-4"  // Override default margin
  imgClassName="h-10 w-auto"  // Override logo size
/>
```

### 2. Avoid Vite Environment Globals in Shared Code
Shared components must not import from `import.meta.env`. Instead, pass explicit props:

```typescript
// ❌ DON'T DO THIS in shared components
const isDev = import.meta.env.DEV;

// ✅ DO THIS instead
export function DevEnvironmentBanner({ isDevelopment, className }: Props) {
  if (!isDevelopment) return null;
  // ...
}
```

### 3. Test Token Consistency
After integrating @sage/ui, run your build and verify:
1. No errors from Tailwind class purging (check console)
2. Navbar renders with correct colors/spacing
3. Mobile responsiveness works (test dropdown, sidebar, overlay)

### 4. Monorepo Workspace Resolution
If using pnpm workspaces, ensure your `pnpm-workspace.yaml` includes the ui package:

```yaml
packages:
  - 'packages/ui'
  - 'main'
  - '...'
```

## Adoption Checklist
When adding @sage/ui to a new site, follow this pre-flight checklist:

- [ ] Add `@sage/ui` as workspace dependency in package.json
- [ ] Update tailwind.config.js to include `../packages/ui/src/**/*.{js,ts,jsx,tsx}` in content paths
- [ ] Define all required theme color tokens (accent, textlight, textdark, bglight, bgdark, destructive, buttonhover, innercontainer)
- [ ] Add tsconfig path alias for `@sage/ui` if using TypeScript path resolution
- [ ] Install all peer dependencies (react, react-router-dom, lucide-react, @radix-ui/*, etc.)
- [ ] Test navbar component rendering on desktop and mobile
- [ ] Verify no TypeScript errors in the consuming app
- [ ] Run `build` command and confirm no CSS purging errors in output
