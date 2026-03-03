### 11. Styling: CSS Modules + Dark Mode

**Splunk bundling strips Tailwind. CSS Modules survive. Dark mode is the only mode.**

Every component has a co-located .module.css file. All values reference CSS custom properties from tokens.css. Animations are defined in animations.css and applied via CSS Module class names.

**Example: animations.css**
```
@keyframes slideIn { from { opacity: 0; transform: translateY(12px); }
to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
@keyframes shimmer { 0% { background-position: -200% 0; }
100% { background-position: 200% 0; } }
.slideIn { animation: slideIn 200ms ease-out; }
.fadeIn { animation: fadeIn 150ms ease-out; }
.pulse { animation: pulse 2s ease-in-out infinite; }
.shimmer { background: linear-gradient(90deg, var(--bg-surface) 25%,
var(--bg-elevated) 50%, var(--bg-surface) 75%);
background-size: 200% 100%; animation: shimmer 1.5s infinite; }
```