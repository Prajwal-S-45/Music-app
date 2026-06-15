# Layout System Implementation Guide

## Overview

This guide documents the current dashboard layout implementation in `DashboardLayout.css`, `AppShell.jsx`, and `Queue.jsx`.

The current implementation uses:

- A desktop 3-column layout above 1200px.
- A 2-column sidebar + main layout from 1101px through 1200px.
- A compact drawer layout at 1100px and below.

## Current Implementation Status

### 1. Desktop 3-Column Layout (>1200px)

`DashboardLayout.css` defines the base dashboard grid as:

```css
.dashboard-shell {
  grid-template-columns: 240px 1fr 72px;
  grid-template-rows: 72px 1fr;
}
```

The three columns are:

- Sidebar: 240px.
- Main content: flexible `1fr`.
- Queue rail: 72px collapsed.

At `max-width: 1400px`, an earlier grid rule uses `240px 1fr 300px`, but the queue component's final desktop width rules still force the queue rail itself to 72px while collapsed.

### 2. 2-Column Layout (1101px - 1200px)

At `max-width: 1200px`, the stylesheet switches the dashboard shell to two columns and hides the queue:

```css
@media (max-width: 1200px) {
  .dashboard-shell {
    grid-template-columns: 220px 1fr;
  }

  .dashboard-queue {
    display: none;
  }
}
```

There is also a later `max-width: 1199px` queue hide rule. The effective behavior is that the queue rail is available only above 1200px.

### 3. Compact Drawer Layout (<=1100px)

`AppShell.jsx` sets compact mode with:

```js
const compact = window.innerWidth <= 1100;
```

At the same breakpoint, `DashboardLayout.css` changes to block layout and turns sidebar/queue into drawers:

```css
@media (max-width: 1100px) {
  .dashboard-shell {
    display: block;
    width: 100%;
    max-width: none;
    padding: 0 12px 12px;
  }

  .dashboard-sidebar {
    position: fixed;
    width: min(280px, calc(100vw - 24px));
    transform: translateX(-112%);
  }

  .dashboard-queue {
    position: fixed;
    width: min(360px, calc(100vw - 24px));
    top: 76px;
    right: 12px;
    bottom: 86px;
    transform: translateX(116%);
    opacity: 0;
    pointer-events: none;
    z-index: 35;
  }
}
```

### 4. Queue Panel Widths

The final queue desktop rules in `DashboardLayout.css` define a 72px collapsed rail and the active hover/edit expansion model.

```css
.dashboard-queue.desktop {
  width: 72px !important;
  min-width: 72px !important;
}

.dashboard-queue.desktop:hover,
.dashboard-queue.desktop.hovered,
.dashboard-queue.desktop.editing {
  width: clamp(400px, 30vw, 480px) !important;
}

.dashboard-queue.desktop.editing {
  width: clamp(440px, 32vw, 520px) !important;
}
```

Breakpoint-specific queue widths:

- `min-width: 1700px`: hover `clamp(440px, 27vw, 520px)`, edit `clamp(480px, 30vw, 560px)`.
- `max-width: 1400px`: hover `clamp(360px, 30vw, 430px)`, edit `clamp(410px, 34vw, 470px)`.
- `max-width: 1200px`: queue hidden.
- `max-width: 1100px`: queue is a fixed drawer when compact mode opens it.

`Queue.jsx` also animates the desktop width:

```js
width: isCompactLayout ? 'auto' : isHovered || isEditMode ? 'clamp(400px, 30vw, 500px)' : '72px'
```

The CSS final pass constrains the rendered hover width to the stylesheet's current clamp values.

### 5. Fixed Bottom Player

The player is fixed at the bottom. The current `.player-bar` implementation uses:

```css
.player-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 96px;
  z-index: 200;
}
```

The main layout reserves vertical space through later shell height rules, including:

```css
.dashboard-sidebar,
.dashboard-main-shell,
.dashboard-queue {
  height: calc(100vh - 164px);
  max-height: calc(100vh - 164px);
}
```

## Responsive Breakpoints

```text
>1200px       Desktop 3-column layout with queue rail
1101-1200px   2-column layout, queue hidden
<=1100px      Compact drawer layout controlled by AppShell
<=768px       Additional mobile single-column refinements
<=760px       Header/mobile tab refinements
<=640px       Small mobile spacing/card refinements
```

## Layout Calculations

### Sidebar

```text
Desktop column: 240px
2-column range: 220px
Compact drawer: min(280px, calc(100vw - 24px))
```

### Content

```text
Desktop shell: 240px 1fr 72px
2-column shell: 220px 1fr
Compact shell: block layout, full-width main content
```

### Queue

```text
Collapsed desktop rail: 72px
Desktop hover/open: clamp(400px, 30vw, 480px)
Desktop edit: clamp(440px, 32vw, 520px)
Wide desktop hover/edit: clamp(440px, 27vw, 520px) / clamp(480px, 30vw, 560px)
Narrow desktop hover/edit: clamp(360px, 30vw, 430px) / clamp(410px, 34vw, 470px)
2-column range: hidden
Compact drawer: min(360px, calc(100vw - 24px))
```

## Mobile Drawer System

### Sidebar Drawer (<=1100px)

```css
.dashboard-sidebar {
  position: fixed;
  left: 12px;
  top: 12px;
  bottom: 12px;
  width: min(280px, calc(100vw - 24px));
  transform: translateX(-112%);
  transition: transform 0.28s ease;
  z-index: 26;
}

.dashboard-sidebar.open,
.dashboard-shell.sidebar-open .dashboard-sidebar {
  transform: translateX(0);
}
```

### Queue Drawer (<=1100px)

```css
.dashboard-queue {
  position: fixed;
  width: min(360px, calc(100vw - 24px));
  top: 76px;
  right: 12px;
  bottom: 86px;
  transform: translateX(116%);
  opacity: 0;
  pointer-events: none;
  z-index: 35;
}

.dashboard-shell.queue-open .dashboard-queue,
.dashboard-queue.mobile.open {
  transform: translateX(0);
  opacity: 1;
  pointer-events: auto;
}
```

## Testing Checklist

### Desktop 3-Column Layout (>1200px)

- [ ] Sidebar visible in the 240px column.
- [ ] Queue rail is visible at 72px while collapsed.
- [ ] Queue expands to the active hover clamp.
- [ ] Queue edit mode uses the wider edit clamp.
- [ ] Player remains fixed at the bottom.

### 2-Column Layout (1101px - 1200px)

- [ ] Shell uses sidebar + main content.
- [ ] Queue is hidden.
- [ ] Main content fills the remaining width.

### Compact Drawer Layout (<=1100px)

- [ ] AppShell sets compact mode.
- [ ] Sidebar opens as a left drawer.
- [ ] Queue opens as a right drawer.
- [ ] Main content remains full width.
- [ ] Drawer transitions and overlay behavior work.

### Small Mobile

- [ ] Refinements hold at 768px, 760px, and 640px.
- [ ] No horizontal scrolling.
- [ ] Touch targets remain usable.

## Related Files

- `DashboardLayout.css` - Complete layout implementation.
- `LayoutArchitecture.md` - High-level layout architecture and breakpoint reference.
- `AppShell.jsx` - Compact layout state management.
- `Queue.jsx` - Queue hover/edit state and motion width animation.
