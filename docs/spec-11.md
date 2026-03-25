# Spec 11 — Styling System

## Tailwind CSS 3

Uses Tailwind CSS v3 (NOT v4). Configuration in `tailwind.config.js`.

**CSS directives** (in `globals.css`):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Do NOT use `@import "tailwindcss"` (v4 syntax).

---

## Custom Color Palette

Defined in `tailwind.config.js` `theme.extend.colors`:

### Backgrounds (navy)
| Token | Hex | Usage |
|-------|-----|-------|
| `navy-950` | `#0a1628` | Page background |
| `navy-900` | `#162033` | Card backgrounds |
| `navy-800` | `#202b43` | Elevated surfaces, hover states |
| `navy-700` | `#2a3a5c` | Active states, borders on dark surfaces |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `slate-200` | Tailwind default | Primary text |
| `slate-400` | Tailwind default | Secondary/muted text |
| `steel-400` | `#9BB1BB` | Accent text, subtle labels |

### Interactive
| Token | Hex | Usage |
|-------|-----|-------|
| `blue-400` | `#60A5FA` | Primary buttons, links. `text-white` on buttons. |
| — | `#93C5FD` | Button hover |
| — | `#3B82F6` | Button active/pressed |

### Borders
- Default: `border-slate-700`

### Banned Colors
No cyan, sky, or indigo used as accent colors anywhere in the project.

---

## styled-components v5

Used ONLY for `common/` wrapper components:
- `Button.tsx`, `Card.tsx`, `Modal.tsx`, `Select.tsx`, `TextArea.tsx`
- `Switch.tsx`, `Tabs.tsx`, `Message.tsx`, `EmptyState.tsx`
- `SearchableSelect.tsx`, `ThemeProvider.tsx`

These wrap `@splunk/react-ui` components with consistent dark-theme styling.

**Rule:** Do NOT mix styled-components and Tailwind on the same element. New components use Tailwind classes exclusively.

---

## globals.css

Contains:
1. Tailwind directives (`@tailwind base/components/utilities`)
2. Custom CSS properties for theme values
3. Base element resets
4. Scrollbar styling
5. Animation keyframes (supplemented by `animations.css`)

---

## Dark Mode

Dark mode is the ONLY mode. There is no light mode toggle or theme switcher.

The app is wrapped in:
```tsx
<SplunkThemeProvider family="enterprise" colorScheme="dark" density="comfortable">
```

All `@splunk/react-ui` components inherit the dark color scheme from this provider.

---

## Class Conventions

- New components: Tailwind utility classes only.
- Existing `common/` wrappers: styled-components only.
- No inline `style={}` except for truly dynamic values (e.g., computed widths).
- `darkMode: 'class'` in Tailwind config (NOT `'selector'` which is v4).

---

## Prettier Formatting

- `tabWidth: 4` for JS/TS/CSS files
- `tabWidth: 2` for JSON files only
- `singleQuote: true`
- `printWidth: 100`
