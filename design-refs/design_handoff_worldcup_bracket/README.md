# Handoff: World Cup Circular Bracket Animation

## Overview
An animated, data-driven World Cup knockout bracket laid out as a **radial circle** (Round of 32 on the outer ring → champion at the center), echoing the panelling of a soccer ball. On load the outer ring of 32 teams fades in, the full dashed bracket skeleton (every matchup) appears, then each match plays out — both opponents rush inward to meet at the match node, the loser fades out, the winner lights up gold and advances. This repeats round by round until the champion lands on the center trophy with a celebratory pulse. After the intro, every node settles into a gentle, perpetual float.

Square 1:1 format, built for a hero/embed surface. Three visual themes and a video export hook are included.

## About the Design Files
The files in this bundle are **design references created in HTML/React (JSX)** — a prototype demonstrating the intended look, motion, and data flow. They are **not** meant to be shipped verbatim. The task is to **recreate this animation in the target codebase's environment** (React, Vue, SwiftUI, canvas/WebGL, etc.) using its established patterns, fed by real tournament data. If no front-end environment exists yet, pick the most appropriate one for the project.

The animation logic (geometry, timeline, easing, advancement) is framework-agnostic and documented in full below — port the math, not necessarily the DOM structure.

## Fidelity
**High-fidelity.** Final layout, motion design, timing, easing, colors, and typography. Recreate it faithfully, but drive it from live data instead of the bundled sample.

---

## The Visualization (single view)

A square canvas. Conceptual coordinate space is **1000 × 1000**, center at **(500, 500)**. Everything scales uniformly to fit the container (SVG via `viewBox`; the HTML chip layer via a `scale(containerWidth / 1000)` transform applied every frame).

### Layout — radial bracket as a binary tree
The bracket is a balanced binary tree drawn radially. 6 levels, outer → inner:

| Level | Round | Nodes | Radius (1000-space) | Node radius (px) |
|------:|-------|------:|--------------------:|-----------------:|
| 0 | Round of 32 (teams) | 32 | 430 | 34 |
| 1 | Round of 16 | 16 | 340 | 30 |
| 2 | Quarter-finals | 8 | 252 | 27 |
| 3 | Semi-finals | 4 | 172 | 24 |
| 4 | Final | 2 | 96 | 22 |
| 5 | Champion (trophy) | 1 | 0 (center) | 46 |

- **Leaf angles:** team `i` sits at `angle = -90 + i * 11.25` degrees (32 teams × 11.25° = 360°, starting at top, going clockwise).
- **Internal node angle:** the **mean of its two children's angles**. Children of node `j` at level `L` are nodes `2j` and `2j+1` at level `L-1`. This midpoint placement produces the symmetric "soccer-ball" panelling.
- **Champion** sits dead center (radius 0).

### Connectors
- **Skeleton (every matchup):** for each match node, BOTH children connect to it via a faint **dashed** quadratic curve (dash pattern `5 8`, width 1.4). The control point is the segment midpoint pulled 18% toward center: `ctrl = mid + (center - mid) * 0.18`. This is the "who plays whom" layer, visible from the start.
- **Winner edge:** the winning child→parent link also gets a solid **accent-colored** curve (width 2, soft drop-shadow) that draws on (via `stroke-dashoffset`, `pathLength=1`) as the match resolves. The matching skeleton edge fades out as this draws in; the losing skeleton edge dims.

### Nodes (flag chips)
Circular chips. Composition (z-order low→high):
1. **Flag fill** — `background` is a CSS gradient abstraction of the country's flag (see Design Tokens → flag chips). `border-radius: 50%`, inset shadow `inset 0 0 0 1px rgba(0,0,0,0.18)` plus theme drop-shadow.
2. **Gloss** — `radial-gradient(circle at 50% 26%, rgba(255,255,255,0.34), rgba(255,255,255,0) 62%)` for a subtle sphere highlight.
3. **Neutral ring** — `1.5px solid` (theme ring color).
4. **Gold ring** (winners only) — `2.5px solid <accent>`, glow `0 0 13px <accent>77`, fades in when the team wins.

Empty/unresolved match nodes render a **dashed placeholder** with a centered `?` (dashed border in theme stroke color, `?` at `fontSize = nodeRadius * 0.8`).

### Round labels
Faint, letter-spaced, monospace, stacked vertically near the top along the vertical axis at each ring's radius: `ROUND OF 32`, `ROUND OF 16`, `QUARTERS`, `SEMIS`, `FINAL`. Placed at `(500, 500 - radius + 5)`, `text-anchor: middle`, max opacity ~0.6. Toggleable.

### Champion centerpiece
Enlarged champion flag chip (radius 46) with gold ring + glow at center, a celebratory expanding **pulse** (3 staggered rings, `border: 2px solid <accent>`, scale 0.3→~2.4, fade out), and a caption pill below: 🏆 + champion name (white, 700, 27px) + `WORLD CHAMPIONS 2026` (accent, 600, 11px, letter-spacing 0.34em) on a `rgba(8,9,12,0.66)` blurred pill.

---

## Interactions & Behavior

Single clock `t` in seconds (a `requestAnimationFrame` loop, `t = (now - start) / 1000`). All visual state is a **pure function of `t`** (`update(t)`), which makes it deterministic and seekable. There is a **Replay** button (bottom-right pill) that resets `start`.

### Timeline (seconds)
- **0.3 → ~2.8** — Outer ring of 32 reveals, staggered: leaf `i` starts at `0.3 + i*0.06`, animates 0.6s (opacity 0→1, scale 0.5→1, ease-out cubic).
- **0.6 → ~2.6** — Dashed skeleton fades in, staggered by level (`start = 0.6 + (level-1)*0.3`, 0.8s fade). Orbit guide circles also present (very faint).
- **Round advancement** (per level `L`, match index `j`):

  | Level | Round start (s) | Per-match stagger (s) | Match duration (s) |
  |------:|----------------:|----------------------:|-------------------:|
  | 1 | 3.0 | 0.08 | 0.9 |
  | 2 | 5.0 | 0.10 | 0.9 |
  | 3 | 6.5 | 0.12 | 0.85 |
  | 4 | 7.6 | 0.15 | 0.85 |
  | 5 (champion) | 8.6 | — | 1.0 |

  Each match's `fillStart = roundStart[L] + j * stagger[L]`.
- **~9.6 → ~11.6** — Champion celebration (caption fade-in + 3 pulse rings staggered 0.5s).
- **After settle** — Perpetual idle float continues forever (intro never replays unless Replay pressed).

### Per-match motion (the head-to-head)
Within a match's window `[fillStart, fillStart + duration]`, progress `pf = clamp((t - fillStart) / duration, 0, 1)`:
- **Winner traveler:** a clone of the winning team's chip travels from the child node to the match node, `easeInOut(pf)`, with a slight arc toward center (`+sin(π·e)*8` along the to-center normal). Fades in over first 12% of window, fades out over last 10% as the node's own chip takes over.
- **Loser traveler:** the opponent's chip rushes in to **0.6** of the distance (`reach = 0.6 * easeInOut(clamp(pf/0.55,0,1))`), then fades out after `pf > 0.5` and shrinks slightly — reads as "challenged and eliminated."
- **Node fill:** the `?` placeholder fades out (`pf` 0.15→0.55), the winner's flag fades in (`pf` 0.78→1.0). The losing leaf node also dims to ~0.4 opacity after its match.

### Idle float
After a node's `settleT`, it bobs: radial offset `AMP[L] * sin(t*0.9 + phase)` and tangential `TANG[L] * sin(t*0.7 + phase*1.3)`, ramped in over 1.2s. `AMP = [5,4,3.2,2.6,2,0]`, `TANG = [2,1.6,1.2,1,0.8,0]` per level. `phase` is per-node. All connectors/travelers recompute against live node positions each frame, so the whole web breathes together.

### Easing
- `easeOutCubic(p) = 1 - (1-p)^3`
- `easeInOut(p) = p < 0.5 ? 4p³ : 1 - (-2p+2)³/2`

### Video export hook
Root element carries `data-om-exportable-video-with-duration-secs="13"` and listens for a `data-om-seek-to-time-frame` event (`detail: { time, frame }`); on receipt it freezes the clock and renders `update(detail.time)` deterministically. Port or drop this depending on the target platform's capture story.

---

## Data Model (this is the data-driven contract)

The bracket is computed from a flat ordered list of 32 teams. **Order = ring order** (index 0 at top, clockwise). Each team has a `rank` (1 = strongest). **Match resolution rule: the lower `rank` wins.** Because ranks are globally unique, the entire tree resolves deterministically and global rank-1 becomes champion. To drive from real results instead, replace the "lower rank wins" resolver with actual match outcomes (store an explicit `winnerId` per match).

```js
// One team
{ code: 'BRA', name: 'Brazil', rank: 1, bg: '<CSS background for the flag chip>' }
```

### Tree build (pseudocode)
```
levels[0] = teams (with angle = -90 + i*11.25)
for L in 1..5:
  for j in 0..(32>>L)-1:
    a = levels[L-1][2j]; b = levels[L-1][2j+1]
    winner = (a.rank < b.rank) ? a : b      // ← swap for real results
    levels[L][j] = { team: winner, angle: (a.angle + b.angle)/2 }
```
Each node also records `winChildId`, `loseChildId`, `parentId`, and its `fillStart/fillEnd` timing. Leaves record `advanced` (did they win their R32 match).

The bundled sample data resolves to a **Brazil vs France** final, Brazil champion (see `BracketEngine.jsx` → `TEAMS_ORDER`). Swap freely.

---

## Design Tokens

### Themes (3)
Selectable via the `theme` prop: `carbon` (default), `stadium`, `mono`.

**carbon** (sleek near-black):
- bg: `radial-gradient(circle at 50% 42%, #16181d 0%, #0b0c10 60%, #070809 100%)`
- ring `rgba(255,255,255,0.22)` · placeholder fill `rgba(255,255,255,0.04)` · placeholder stroke `rgba(255,255,255,0.16)` · placeholder text `rgba(255,255,255,0.34)`
- skeleton `rgba(255,255,255,0.15)` · guide `rgba(255,255,255,0.05)` · label `rgba(255,255,255,0.34)`

**stadium** (the reference navy):
- bg: `radial-gradient(circle at 50% 36%, #173a6b 0%, #0d2649 55%, #0a1c39 100%)`
- ring `rgba(255,255,255,0.82)` · placeholder fill `rgba(74,58,46,0.5)` (warm brown) · placeholder stroke `rgba(255,255,255,0.22)`
- skeleton `rgba(214,224,240,0.26)` · guide `rgba(255,255,255,0.06)` · label `rgba(222,212,192,0.62)`

**mono** (Uber-like, pure black + single accent):
- bg: `#000000`
- ring `rgba(255,255,255,0.68)` · placeholder fill `rgba(255,255,255,0.025)` · placeholder stroke `rgba(255,255,255,0.26)`
- skeleton `rgba(255,255,255,0.2)` · guide `rgba(255,255,255,0.06)` · label `rgba(255,255,255,0.46)`

### Accent (`accent` prop)
Drives winner rings, winner connectors, trophy glow, pulses. Curated options:
`#E8B24A` (gold, default) · `#3B82F6` (blue) · `#10B981` (green) · `#EDEDED` (white).
Shadow/glow uses the accent with alpha suffixes (`<accent>77`, `<accent>55`, `<accent>33`).

### Shadows
- Chip drop shadow: `0 6px 16px rgba(0,0,0,0.5)` (carbon) / `0.45` (stadium) / `0.6` (mono)
- Winner ring glow: `0 0 13px <accent>77`
- Winner connector glow: `drop-shadow(0 0 3px <accent>55)`
- Caption pill: `0 0 0 1px <accent>33, 0 8px 26px rgba(0,0,0,0.5)`, `backdrop-filter: blur(6px)`, bg `rgba(8,9,12,0.66)`

### Typography
- UI/champion name: system sans stack — `ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif`. Champion name 700/27px; `WORLD CHAMPIONS 2026` 600/11px/0.34em.
- Labels & `?` glyphs: champion caption sublabel and round labels use `ui-monospace, "SF Mono", monospace`, 600/13px/0.22em.

### Flag chips
Flags are **abstracted as CSS gradients** (not images) for a clean, consistent, SVG-style look — tricolors, bicolors, crosses (layered `linear-gradient` bars), and disc flags (Japan via `radial-gradient`). See the `vt/ht/vb/cross` helpers and `TEAMS_ORDER` in `BracketEngine.jsx`. In a production app you may instead use real circular flag SVGs/`flag-icons`; keep them clipped to a circle with the same gloss + ring treatment.

---

## Props (the component's tweakable surface)
- `theme`: `'carbon' | 'stadium' | 'mono'` — default `'carbon'`
- `accent`: hex string — default `'#E8B24A'`
- `labels`: boolean — show/hide round labels — default `true`

## Assets
- No external images. Flags are CSS gradients; the trophy is the 🏆 emoji. No fonts to load (system + monospace stacks).
- `reference.png` — the original concept the design was modeled on (navy/gold "stadium" look).
- `screens/` — rendered reference frames from the prototype (see Frame Guide below).

## Frame Guide (`screens/`)
Use these as the visual source of truth for each moment of the animation:

| File | Moment (t) | What it shows |
|------|-----------|---------------|
| `01-reveal-ring32.png` | ~2.6s | Outer ring of 32 fully revealed; full **dashed bracket skeleton** visible (every matchup); inner `?` placeholders present. Carbon theme. |
| `02-match-headtohead.png` | ~3.7s | Round-of-32 matches resolving — pairs of opponents **converging on their match node** (winner + loser travelers in motion). |
| `03-advancing-rounds.png` | ~6.0s | Mid-tournament: winners lit gold and advanced inward, gold winner-connectors drawn, deeper rounds beginning to fill. Carbon theme. |
| `04-champion-carbon.png` | ~11.8s | Champion (Brazil) at center with gold ring + caption pill + pulse; full resolved bracket. **Carbon** theme (default). |
| `05-champion-stadium.png` | ~11.8s | Same end state in the **Stadium** theme (navy field, bright white rings — closest to the original reference). |
| `06-advancing-mono.png` | ~6.0s | Mid-tournament in the **Mono** theme (pure black, single accent — Uber-like). |

The three theme stills (`04`/`05`/`06`) double as the **theme gallery** — carbon vs stadium vs mono.

## Files
- `BracketEngine.jsx` — the full animation engine: sample data (`TEAMS_ORDER`), tree builder (`buildLayout`), geometry/timeline constants, themes (`themeVars`), and the `BracketEngine` component (RAF clock, `update(t)`, refs-based imperative updates, export seek hook). **This is the file to port.**
- `World Cup Bracket.dc.html` — thin host that mounts `BracketEngine` and exposes the `theme`/`accent`/`labels` controls. (Prototype shell; not needed in production.)
- `reference.png` — visual reference.

### Porting notes
- Performance: positions/opacity/`d`/`dash-offset` are written **imperatively to element refs each frame** (no per-frame re-render). ~63 nodes + 31 winner edges + 62 skeleton edges + 62 travelers. Keep the same approach (or a `<canvas>`/SVG render loop) rather than re-rendering a component tree at 60fps.
- The SVG layer (`viewBox="0 0 1000 1000"`) auto-scales; the HTML chip layer needs an explicit `scale(containerWidth/1000)` set each frame (or via `ResizeObserver`).
- Everything keys off the single `t` clock and pure `update(t)` — preserve that for determinism, seeking, and easy testing.
