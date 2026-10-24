---
name: Arcade Doodle Lounge
colors:
  surface: '#001136'
  surface-dim: '#001136'
  surface-bright: '#1a3671'
  surface-container-lowest: '#000c2b'
  surface-container-low: '#001946'
  surface-container: '#001c4f'
  surface-container-high: '#032662'
  surface-container-highest: '#14326d'
  on-surface: '#dae2ff'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#dae2ff'
  inverse-on-surface: '#0e2d68'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#adc6ff'
  on-secondary: '#002e6a'
  secondary-container: '#0566d9'
  on-secondary-container: '#e6ecff'
  tertiary: '#56e5a9'
  on-tertiary: '#003824'
  tertiary-container: '#30c88f'
  on-tertiary-container: '#004e34'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#001136'
  on-background: '#dae2ff'
  surface-variant: '#14326d'
typography:
  headline-xl:
    fontFamily: Rubik
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
  headline-xl-mobile:
    fontFamily: Rubik
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
  headline-lg:
    fontFamily: Rubik
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Rubik
    fontSize: 24px
    fontWeight: '800'
    lineHeight: 32px
  headline-md:
    fontFamily: Rubik
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Nunito Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 26px
  body-md:
    fontFamily: Nunito Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
  body-sm:
    fontFamily: Nunito Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-lg:
    fontFamily: Rubik
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Rubik
    fontSize: 13px
    fontWeight: '700'
    lineHeight: 16px
  label-sm:
    fontFamily: Rubik
    fontSize: 11px
    fontWeight: '800'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system channels an energetic, tactile, and cartoon-arcade aesthetic tailored for social, real-time multiplayer drawing and guessing. It strips away austere corporate minimalism in favor of vibrant toy-like tactile feedback, chunky borders, and playful geometry reminiscent of Saturday morning cartoons and classic party games.

### Core Tenets
- **Tactile & Pop-Art Interactive:** Interfaces look physically interactable, featuring thick comic-style outlines, isometric hard offset shadows ("clicky" extrusion), and rounded bubble containers.
- **Expressive & Legible Chaos:** While vibrant and chaotic, essential gameplay data (the drawing surface, timer, character guess stream, and leaderboard) retains instant clarity under time-pressured play.
- **Warm Comedic Delight:** Every interactive element responds with bounce, snappy state transitions, and bold physical feedback that makes winning—or comically failing—feel fun.

## Colors

The palette establishes an immersive deep arcade arena where saturated primary and secondary hues pop dynamically.

### Palette Architecture
- **Primary Accent (`#f59e0b` - Cheerful Amber/Gold):** Utilized for primary gameplay actions, current turn indicators, golden podium moments, and energetic call-to-actions.
- **Secondary Accent (`#3b82f6` - Sky Blue):** Used for drawing tools, player indicators, chat alerts, and system notifications.
- **Tertiary Accent (`#10b981` - Emerald Kick):** Used for correct guess celebrations, online presence, active timer pulses, and success confirmations.
- **Accent Coral / Error (`#ef4444`):** Used for penalty alerts, timer run-out warnings, wrong guesses, and destructive options.
- **Canvas Base & Frame (`#12306b` to `#0d204a`):** Deep navy gaming backdrops that anchor high-contrast white and cream panels without eye strain.
- **Container Surfaces (`#ffffff` and warm cream `#fffdfa`):** High-clarity game surfaces, chat backdrops, and drawing viewports.
- **Comic Ink Contour (`#1e293b`):** Deep slate-navy outline used for all 3D extrusion shadows, comic strokes, and high-legibility icons.

## Typography

Typography prioritizes thick, bubbly, and immediate readability under tight round timers.

- **Headline & Labels (Rubik):** Rounded geometric shapes with heavy stroke weights (700-800) create that classic arcade title presence.
- **Body & Chat Stream (Nunito Sans):** Soft humanist grotesque with clear letter distinction even at small sizes inside rapid-fire chat logs.
- **Word Reveal Spacing:** Blanks and mystery words (`_ _ _ _`) leverage `Rubik` with wide letter-spacing (`0.2em`) to ensure clear character counts at a glance.

## Layout & Spacing

The layout is built around a locked-ratio modular arcade viewport optimized for concurrent interaction:

### Layout Grid & Viewport Model
- **Lobby & In-Game Triad:** The desktop layout organizes into a three-column fixed/fluid hybrid structure:
  - **Left Rail (Leaderboard & Scoreboard):** Fixed width (220px-260px) listing real-time player ranks, avatars, and scoring badges.
  - **Center Stage (The Canvas Hub):** Fluid canvas viewport with docked toolbars, word mystery banners, and overlay countdowns.
  - **Right Rail (Chat & Guess Terminal):** Fixed width (280px-340px) maintaining persistent autoscrolling feedback and entry.
- **Mobile / Compact Adaptation:** Stacks sequentially: Canvas takes top priority with anchored responsive drawing controls; players convert to an expandable top horizontal pill list; guess feed anchors as a bottom overlay with a pinned one-tap input tray.

## Elevation & Depth

This system avoids soft Gaussian blurs and photorealistic drop-shadows in favor of chunky, illustrative 3D extrusion inspired by arcade cabinets and comic book panels.

### The Offset Extrusion Model
- **Level 1 (Subtle Inset / Recessed):** Canvas drawpads and input fields use an interior shadow (`inset 0 3px 0 rgba(30, 41, 59, 0.15)`) coupled with a crisp 3px stroke of `#1e293b`.
- **Level 2 (Standard Raised Containers):** White and cream card containers sit on the dark navy canvas with a uniform 3px boundary border and a hard drop extrusion of `0 6px 0 #1e293b`.
- **Level 3 (Tactile Pushables - Buttons & Modals):** Interactive push-buttons utilize `0 4px 0 #1e293b` in resting state. On `:hover`, extrusion lifts to `0 6px 0 #1e293b` (shifting `translateY(-2px)`). On `:active`, extrusion collapses to `0 0 0 #1e293b` with a matching `translateY(4px)`, delivering instant mechanical press feedback.
- **Level 4 (Floating Overlays & Victory Podiums):** Overlays and podium winner screens command `0 10px 0 #0d1b2a` alongside a 4px perimeter ink border.

## Shapes

The shape vocabulary uses bulbous, friendly contours that balance soft rounded comfort with sturdy geometric boundaries.

- **Containers & Boards:** Set to `rounded-lg` (16px to 24px) to soften rectangular frames into toy-like slabs.
- **Controls & Buttons:** Rounded with 12px to 16px corners to preserve chunkiness while preventing sharp prick points.
- **Avatars & Color Palette Wells:** Perfect circles or high-radius rounded squircles (radius 50%) contained inside rigid 3px solid ink strokes.
- **Borders:** Consistent 3px to 4px `#1e293b` outlines on all major boundary elements.

## Components

### Buttons & Action Bars
- **Primary Game Buttons:** Background `#f59e0b`, label in high-contrast `#1e293b`, 3px stroke `#1e293b`, hard bottom shadow `0 4px 0 #1e293b`. Text in uppercase `Rubik` bold.
- **Secondary Tool Buttons:** Background `#3b82f6` or `#ffffff`, 3px outline, hard 3px shadow. When selected (active brush/color), shifts into pressed state with an inset outline.

### Drawing Canvas & Toolbar
- **Whiteboard Area:** Cream-white `#ffffff` with a crisp 4px `#1e293b` border and rounded corners (20px). Cursor dynamically renders brush size preview.
- **Palette Swatches:** Rounded circle tiles with 3px solid outlines. Selected swatches bounce up by 4px with a checkmark badge.
- **Brush Size Selector:** Segmented pill container enclosing progressive dots (small, medium, large, bucket fill).

### Live Chat & Guess Stream
- **Chat Container:** Pure white `#ffffff` panel with 3px `#1e293b` borders.
- **Message Types:**
  - *Standard Chat:* Slate-colored body text with bold player name tag.
  - *Close Guess Alert:* Soft yellow container (`#fef3c7`), bold orange alert text ("Player is close!").
  - *Correct Guess:* Full emerald banner (`#10b981`), white bold text with comic celebratory checkmark, instantly locking guess input for that player.
- **Guess Input Field:** Thick-padded bottom text input, recessed top shadow, integrated comic send button.

### Avatar Customizer
- **Preview Head:** Central bubble squircle containing eyes, mouth, and accessory layers.
- **Steppers:** Left/right arrow buttons flanking each facial feature category with bouncy hover transitions.
- **Hue Wheel:** Circular color wheel nodes to pick avatar skin and clothes tints.

### Podium & Game Over Screen
- **Tiers:** Gold (1st), Silver (2nd), and Bronze (3rd) extrusion columns with 3D step blocks.
- **Winner Reveal:** 1st place avatar animates on a bobbing bounce loop with celebratory confetti vectors radiating from behind the central card.