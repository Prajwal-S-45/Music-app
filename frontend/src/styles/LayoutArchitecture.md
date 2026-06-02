# Professional Layout Architecture - Music Streaming App

## Visual Layout Structure

### Desktop Layout (≥1100px)
```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER (sticky, z-index: 32, height: 64px)                         │
├──────┬────────────────────────────────────────────────────┬────────┤
│      │                                                    │        │
│      │ MAIN CONTENT (scrollable, flex: 1)               │ QUEUE  │
│SIDE  │ - Hero Section                                   │ PANEL  │
│BAR   │ - Sections with Cards (grid)                     │(82px  │
│(220  │ - Proper spacing hierarchy                       │ default│
│-250  │ - Independent scroll                             │)       │
│px)   │                                                    │        │
│Fixed │                                                    │ Hover: │
│Stick │                                                    │260-290 │
│y     │                                                    │px      │
│      │                                                    │        │
├──────┴────────────────────────────────────────────────────┴────────┤
│ PLAYER BAR (fixed bottom, z-index: 35, height: 132px)             │
└────────────────────────────────────────────────────────────────────┘

Layout Properties:
- Sidebar: flex: 0 0 220-250px, position: sticky, top: 16px
- Main: flex: 1 1 auto, min-width: 0, flex-direction: column
- Queue: flex: 0 0 82px (default), width animation on hover
- Player: fixed bottom, width: calc(100vw - padding*2)
- Header: sticky top, z-index: 32
```

### Tablet Layout (960px - 1099px)
```
┌──────────────────────────────────────────────┐
│ HEADER (compact, 56px)                       │
├───────┬─────────────────────────────────────┤
│       │                                     │
│ SIDE  │ MAIN CONTENT (scrollable)          │
│ BAR   │ - Grid adjusted (150px minmax)     │
│ (250) │ - Header compact                    │
│ px    │ - Player 120px                      │
│       │                                     │
├───────┴─────────────────────────────────────┤
│ PLAYER BAR (120px)                          │
└──────────────────────────────────────────────┘

Queue: Hidden (accessed via menu or drawer)
```

### Mobile Layout (<960px)
```
┌─────────────────────────────────┐
│ HEADER (compact, 52px)          │
├─────────────────────────────────┤
│                                 │
│ MAIN CONTENT (scrollable)       │
│ - Grid 2-3 columns (130px)      │
│ - Padding bottom for player     │
│ - Full width                    │
│                                 │
├─────────────────────────────────┤
│ PLAYER BAR (100px, fixed)       │
└─────────────────────────────────┘

Sidebar: Fixed drawer (260px, hidden by default, slides from left)
Queue: Fixed drawer (hidden by default, slides from right)
```

### Small Mobile Layout (<640px)
```
┌──────────────────────────────┐
│ HEADER (compact, 48px)       │
├──────────────────────────────┤
│                              │
│ MAIN CONTENT (scrollable)    │
│ - Grid 2 columns (110px)     │
│ - Ultra-compact padding      │
│                              │
├──────────────────────────────┤
│ PLAYER BAR (96px, fixed)     │
└──────────────────────────────┘

All panels: Drawer overlays when expanded
```

## CSS Variable System

### Layout Dimensions
```css
/* Desktop */
--sidebar-width: clamp(220px, 18vw, 250px);
--queue-width: 82px;
--header-height: 64px;
--player-height: 132px;
--shell-padding: 16px;
--shell-gap: 16px;
--content-gap: 18px;

/* Tablet: 960px - 1099px */
--header-height: 56px;
--player-height: 120px;
--shell-padding: 12px;
--content-gap: 16px;

/* Mobile: < 960px */
--header-height: 52px;
--player-height: 100px;
--shell-padding: 8px;
--content-gap: 12px;

/* Small Mobile: < 640px */
--header-height: 48px;
--player-height: 96px;
--shell-padding: 6px;
--content-gap: 10px;
```

### Color System
```css
--bg-0: #040814;              /* Primary background */
--bg-1: #09101f;              /* Secondary background */
--surface: rgba(255,255,255,0.06);        /* Surface */
--surface-strong: rgba(255,255,255,0.12); /* Surface emphasize */
--border: rgba(148,163,184,0.22);         /* Borders */
--text-strong: #f8fafc;       /* Primary text */
--text-soft: #94a3b8;         /* Secondary text */
--accent: #22c55e;            /* Green accent */
--accent-2: #10b981;          /* Teal accent */
```

## Component Z-Index Hierarchy

```
55 ├─ Modal Dialogs
50 ├─ Search Results Dropdown
40 ├─ Queue Context Menu
35 ├─ Player Bar (fixed bottom)
32 ├─ Header (sticky top)
30 ├─ Sidebar + Queue Panels
28 ├─ Mobile Overlay (sidebar/queue backdrop)
25 └─ Base Layer
```

## Spacing Hierarchy

### Padding/Margin System
```
Outer Shell:        var(--shell-padding)  [16px desktop, 8px mobile]
Component Gap:      var(--shell-gap)      [16px desktop, 0 mobile]
Content Gap:        var(--content-gap)    [18px desktop, 12px mobile]
Inner Component:    8px - 12px default
```

### Reserved Spaces
```
Player Buffer:      var(--player-height) + var(--shell-padding) + 8px
Sidebar Bottom:     var(--player-height) + var(--shell-gap) + 20px
Queue Bottom:       var(--player-height) + 20px
```

## Layout Features

### Desktop-Exclusive
- ✅ Sidebar always visible (sticky)
- ✅ Queue hover-expand animation (82px → 260px)
- ✅ Independent scroll areas
- ✅ Full 3-column layout
- ✅ Header with full navigation

### Mobile-Only
- ✅ Sidebar drawer (hidden, slide from left)
- ✅ Queue drawer (hidden, slide from right)
- ✅ Collapsible navigation
- ✅ Compact header
- ✅ Full-width content

### Responsive Features
- ✅ Automatic layout switch at 1100px breakpoint
- ✅ Tablet optimizations (960px - 1099px)
- ✅ Small mobile adaptations (<640px)
- ✅ Smooth transition animations (0.28s)
- ✅ Touch-friendly buttons (minimum 44px)

## Scrolling Behavior

### Main Content
- Scrolls independently
- Smooth scroll-behavior
- Custom scrollbar (6px width, rgba(148,163,184,0.3))
- Padding-bottom accounts for fixed player

### Sidebar
- Scrolls independently (if content overflows)
- Padding-bottom prevents overlap with player
- Max-height: calc(100vh - shell-padding*2)

### Queue
- Scrolls independently (collapsed state)
- Scrolls when expanded
- Custom scrollbar styling

### Player
- Fixed position (never scrolls)
- Always above content
- Bottom: var(--shell-padding)
- Width: calc(100vw - shell-padding*2)

## Media Query Breakpoints

```css
/* Desktop: ≥ 1100px */
Default styles - full layout

/* Tablet: 960px - 1099px */
@media (max-width: 1099px)
- Adjusted dimensions
- Queue hidden (menu access)
- Header compact

/* Mobile: < 960px */
@media (max-width: 959px)
- Block layout mode
- Drawer navigation
- Compact player
- Full-width content

/* Small Mobile: < 640px */
@media (max-width: 639px)
- Ultra-compact spacing
- Reduced card sizes
- Minimal player
- Button optimization
```

## Layout Calculations

### Queue Height (Desktop)
```
100vh - header - player - padding - margin = scrollable height
100vh - 64px - 132px - 16px - 8px = scrollable area
```

### Content Padding Bottom
```
player-height + shell-padding + 8px = total bottom clearance
132px + 16px + 8px = 156px buffer
```

### Sidebar Max Height
```
100vh - shell-padding*2 = max sidebar height
100vh - 32px = scrollable sidebar area
```

## Animation Timings

```
Width transitions:    0.28s ease-in-out
Opacity changes:      0.22s ease
Scale transforms:     0.18s ease
Height changes:       0.26s ease
Menu animations:      0.18s ease
```

## Accessibility Features

- ✅ Sticky header remains accessible
- ✅ Focus management in modals
- ✅ Keyboard navigation support
- ✅ ARIA labels and roles
- ✅ Proper heading hierarchy
- ✅ Color contrast compliance
- ✅ Touch targets ≥44px on mobile

## Performance Considerations

- ✅ Framer Motion for smooth animations
- ✅ CSS Grid + Flexbox (efficient layout)
- ✅ Custom scrollbars (lightweight)
- ✅ Backdrop-filter with reasonable blur
- ✅ Will-change avoided for scrolling elements
- ✅ Transform/opacity for animations (GPU-accelerated)

## Testing Checklist

- [ ] Desktop layout (1920px, 1440px, 1200px, 1100px+)
- [ ] Tablet layout (960px - 1099px)
- [ ] Mobile layout (<960px, portrait)
- [ ] Small mobile (<640px)
- [ ] Sidebar scrolling (long content)
- [ ] Queue hover expansion
- [ ] Player not overlapping content
- [ ] Header sticky behavior
- [ ] Responsive card grids
- [ ] Touch interactions
- [ ] Animations smooth (no jank)
- [ ] Scrollbar visibility/interaction
