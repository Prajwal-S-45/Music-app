# Professional Layout Architecture - Music Streaming App

## Visual Layout Structure

### Desktop 3-Column Layout (>1200px)

The implemented desktop shell uses a grid with sidebar, main content, and the queue rail.

```css
.dashboard-shell {
  grid-template-columns: 240px 1fr 72px;
  grid-template-rows: 72px 1fr;
}

@media (max-width: 1400px) {
  .dashboard-shell {
    grid-template-columns: 240px 1fr 300px;
  }
}
```

Layout properties:

- Sidebar: 240px desktop column.
- Main: flexible center content column.
- Queue collapsed rail: 72px.
- Queue hover/open: `clamp(400px, 30vw, 480px)`.
- Queue edit mode: `clamp(440px, 32vw, 520px)`.
- Queue wide-screen override at `min-width: 1700px`: hover `clamp(440px, 27vw, 520px)`, edit `clamp(480px, 30vw, 560px)`.
- Queue narrower desktop override at `max-width: 1400px`: hover `clamp(360px, 30vw, 430px)`, edit `clamp(410px, 34vw, 470px)`.
- Player: fixed bottom.
- Header: sticky top.

### 2-Column Layout (1101px - 1200px)

At `max-width: 1200px`, the shell changes to sidebar + main content and hides the queue.

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

The final queue rule also hides queue at `max-width: 1199px`, so the documented behavior is: the queue rail is a desktop feature above 1200px, and the 2-column range does not show the queue panel.

### Compact Drawer Layout (<=1100px)

`AppShell.jsx` switches `isCompactLayout` when `window.innerWidth <= 1100`. The CSS also converts the shell into block/drawer mode at `max-width: 1100px`.

Implemented compact behavior:

- Shell: block layout with full-width main content.
- Sidebar: fixed drawer, `width: min(280px, calc(100vw - 24px))`, hidden with `translateX(-112%)`.
- Queue: fixed drawer, `width: min(360px, calc(100vw - 24px))`, hidden with `translateX(116%)`.
- Queue drawer position: `top: 76px`, `right: 12px`, `bottom: 86px`, `z-index: 35`.
- `.dashboard-shell.queue-open .dashboard-queue` and `.dashboard-queue.mobile.open` bring the queue drawer onscreen.

### Small Mobile Refinements

The stylesheet also includes smaller mobile refinements around `max-width: 768px`, `max-width: 760px`, and `max-width: 640px` for single-column layout, compact header controls, and tighter card/player spacing.

## CSS Dimension Reference

```css
/* Desktop 3-column: >1200px */
sidebar column: 240px
queue collapsed width: 72px
queue hover width: clamp(400px, 30vw, 480px)
queue edit width: clamp(440px, 32vw, 520px)
header row: 72px

/* 2-column: 1101px - 1200px */
sidebar column: 220px
queue display: none

/* Compact drawer: <=1100px */
sidebar drawer width: min(280px, calc(100vw - 24px))
queue drawer width: min(360px, calc(100vw - 24px))
queue drawer top/right/bottom: 76px / 12px / 86px
```

## Z-Index Hierarchy

```text
200 Player bar
120 Queue menu
80  Queue menu shell
35  Mobile queue drawer
32  Header
28  Mobile overlay
26  Mobile sidebar drawer
```

## Layout Features

### Desktop-Only

- Sidebar, main content, and queue rail are visible above 1200px.
- Queue expands from 72px to the hover clamp width.
- Queue edit mode uses a wider clamp than hover mode.
- Main, sidebar, and queue use constrained heights; the later implementation sets them to `calc(100vh - 164px)`.

### 2-Column

- The 1101px - 1200px range keeps sidebar + main content.
- Queue is hidden by CSS in this range.

### Compact/Mobile

- Compact layout starts at `<=1100px`.
- Sidebar and queue become drawers.
- Main content is full width.
- Smaller refinements continue at 768px, 760px, and 640px.

## Media Query Breakpoints

```css
/* Desktop 3-column: >1200px */
Default desktop queue rail is available.

/* 2-column: 1101px - 1200px */
@media (max-width: 1200px)
  - dashboard shell: 220px 1fr
  - queue hidden

/* Compact drawer: <=1100px */
@media (max-width: 1100px)
  - shell becomes block layout
  - sidebar and queue become fixed drawers

/* Mobile refinements */
@media (max-width: 768px)
@media (max-width: 760px)
@media (max-width: 640px)
```

## Testing Checklist

- [ ] Desktop 3-column layout above 1200px.
- [ ] Queue collapsed rail at 72px.
- [ ] Queue hover width matches `clamp(400px, 30vw, 480px)`.
- [ ] Queue edit width matches `clamp(440px, 32vw, 520px)`.
- [ ] Wide desktop queue overrides apply at 1700px and above.
- [ ] Narrow desktop queue overrides apply at 1400px and below.
- [ ] Queue is hidden from 1101px through 1200px.
- [ ] Compact drawer mode starts at 1100px and below.
- [ ] Sidebar drawer opens and closes in compact mode.
- [ ] Queue drawer opens and closes in compact mode.
- [ ] Small mobile refinements hold at 768px, 760px, and 640px.
