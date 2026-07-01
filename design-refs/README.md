# Handoff: Model Win Probability Chart

## Overview
An animated donut (ring) chart showing each team's probability of winning a tournament,
with a frosted-glass card, a center "projected winner" callout, and a two-column legend.
Built for a World Cup–style data product. The vibe is sleek/premium (Apple/Uber-leaning):
restrained typography, frosted glass, flag-colored ring segments, and subtle ambient motion.

## About the Design Files
The files in this bundle are **design references created in HTML** — runnable prototypes that
show the intended look and behavior. They are **not** meant to be shipped verbatim. The task is
to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte,
SwiftUI, etc.), using that codebase's established component patterns, styling system, and data
layer. If no front-end environment exists yet, pick the most appropriate framework and implement
it there.

Two reference files are included (see **Files** below):
- `win-probability-chart.html` — a clean, **framework-agnostic vanilla HTML/CSS/JS** implementation.
  This is the primary reference: copy its structure, CSS tokens, geometry math, and animation logic.
- `Win Probability.dc.html` — the original prototype. It relies on a custom component runtime, so
  treat it as a behavioral reference only; prefer the vanilla file for actual code.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, geometry, and interactions are all
specified below and in the vanilla file. Recreate pixel-for-pixel using the codebase's libraries.

## Screens / Views

### Win Probability Card (single view)
- **Purpose:** Let a viewer scan which teams are most likely to win, see the leader prominently,
  and hover/tap any team for focus + detail.
- **Layout:**
  - Outer **stage** (optional): full-bleed dark background, centers the card, `padding: clamp(16px,4vw,56px)`.
  - **Card:** `max-width: 1080px`, `border-radius: 28px`, `padding: clamp(22px,3.4vw,42px)`, frosted glass.
  - **Header:** gold dot + uppercase title row, then a muted subtitle with an inline "Elo ratings" link,
    then a 1px gradient divider.
  - **Body:** `display:flex; flex-wrap:wrap; gap:clamp(20px,3vw,52px)`. Two children:
    1. **Donut** — `flex:0 1 360px; width:clamp(220px,42vw,380px); aspect-ratio:1; min-width:200px`.
       Contains the SVG ring, an absolutely-centered callout, and a blurred ambient glow behind it.
    2. **Legend** — `flex:1 1 360px; min-width:240px`, CSS grid `repeat(auto-fit,minmax(155px,1fr))`.
  - **Responsive:** the body wraps — on narrow widths the legend drops below the donut and its grid
    collapses to one column. No media queries needed (clamp + flex-wrap + auto-fit grid).

#### Components

**Header**
- Gold dot: 9×9px circle, `background #e3c27e`, `box-shadow 0 0 14px #e3c27e`.
- Title: text "MODEL WIN PROBABILITY", `font-size clamp(15px,1.7vw,18px)`, weight 600,
  `letter-spacing 0.15em`, `text-transform uppercase`, color `#f3ede0`.
- Subtitle: `font-size clamp(12.5px,1.3vw,14px)`, color `rgba(243,237,224,0.52)`, `line-height 1.55`,
  `max-width 62ch`. Inline link color `#e3c27e` with `border-bottom 1px solid rgba(227,194,126,0.45)`.
- Divider: 1px, `linear-gradient(90deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))`,
  `margin-top clamp(18px,2.4vw,26px)`.

**Donut ring (SVG)**
- `viewBox="0 0 200 200"`, `overflow: visible`. Center (100,100), **radius R = 78**,
  circumference C = 2πR ≈ 490.09 (all in viewBox units).
- One `<circle>` per team, `fill:none`, `stroke:<team color>`, `stroke-linecap:round`,
  `stroke-width: 16px` (hover: 16 + 11 = **27px**).
- Segment length = `(team.pct / sumOfAllPct) * C`. A **6px gap** is subtracted from each segment
  (centered) so rounded-cap segments read as separate pills.
- Positioned by `transform="rotate(angle 100 100)"` where `angle = -90 + (startOffset/C)*360`,
  drawn clockwise starting at 12 o'clock. (Exact math is in `render()` in the vanilla file.)
- Segment transition: `stroke-width .35s ease, opacity .3s ease, filter .3s ease`.
- Hover: hovered segment grows to 27px + `drop-shadow(0 0 14px <color@0.95>)`; all others dim to `opacity 0.22`.

**Center callout** (absolutely centered over the ring, `pointer-events:none`)
- Flag emoji: `font-size clamp(26px,4.4vw,36px)`.
- Big percentage: `font-size clamp(34px,6.2vw,52px)`, weight 700, color `#fff`,
  `letter-spacing -0.02em`, `font-variant-numeric: tabular-nums`. Trailing "%" is `0.5em`, `opacity .75`.
- Name: `font-size clamp(13px,1.6vw,15px)`, color `rgba(255,255,255,0.72)`, weight 500.
- Label: `10.5px`, uppercase, `letter-spacing 0.13em`, color `#e3c27e`.
  Reads "PROJECTED WINNER" by default (showing the leader), or "WIN PROBABILITY" while hovering a team.

**Legend rows** (one per team)
- Row: `display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:12px; cursor:pointer`.
  Hovered row: `background rgba(255,255,255,0.07)`; non-hovered (while another is hovered): `opacity 0.4`.
  Transition `background .25s ease, opacity .25s ease`.
- Color dot: 9×9px circle, team color, `box-shadow 0 0 8px <color@0.75>`.
- Flag emoji: `font-size 16px`.
- Name: `flex:1`, `font-size clamp(13px,1.4vw,15px)`, color `#ece6d8`, ellipsis on overflow.
- Percentage: `font-variant-numeric: tabular-nums`, weight 600, `font-size clamp(13px,1.4vw,15px)`,
  color `#fff`; the "%" sign is `opacity 0.55`, weight 500.

## Interactions & Behavior
- **Load animation (plays once):** a single eased progress `p` goes 0→1 over **1700ms** (`easeOutCubic`,
  `1 - (1-t)^3`). It drives:
  - **Ring sweep:** segments reveal clockwise from 12 o'clock as a single continuous wipe
    (`drawn = clamp(p*C - startOffset, 0, segLen-gap)`). Each segment fades in (`opacity 0→1`) as the
    wipe passes it (gated by `drawn > 0.4`), giving a "data flowing in" feel.
  - **Count-up:** every legend percentage and the center number count from 0.0 to their value
    (`displayed = team.pct * p`).
- **Hover/tap a team (segment OR legend row):** that team's segment grows + glows and the center
  callout switches to that team (full value, label "WIN PROBABILITY"); all other segments and rows dim.
  On leave, the center reverts to the leader.
- **Ambient motion (loops, subtle):** a blurred gold radial glow behind the ring "breathes"
  (`opacity .45→1`, `scale .92→1.05`, 4.6s ease-in-out), and a faint diagonal highlight shimmers
  across the glass (8s linear). Both can be disabled (see `ambient` option).

## State Management
- `p` (0→1): animation progress. One-shot on mount; can be reset to replay when new data arrives.
- `hovered` (team index | null): which team is focused.
- `teams`: array of `{ name, pct, color, flag }`. **pct need NOT sum to 100** — the ring normalizes
  segment sizes by the sum, while the legend/center show the raw pct. (The default top-10 sums to ~84%.)
- **Live data:** the chart is designed for a streaming feed. On new data, re-run init / call the
  returned `update(newTeams)` to rebuild and replay the sweep. If you prefer smooth re-tweening on
  every tick instead of a full replay, animate each segment's `dasharray` and each number from its
  current value toward the new target rather than from 0.

## Design Tokens
**Colors**
- Background stage: `#07090e` base; radial gold glow `rgba(227,194,126,0.12)`; radial blue-grey
  `#1b2436 → #0c0f17 → #07090e`.
- Glass card fill: `linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))`,
  border `rgba(255,255,255,0.09)`, shadow `0 40px 120px -45px rgba(0,0,0,0.85)` + inset `rgba(255,255,255,0.08)`.
- Backdrop filter: `blur(22px) saturate(1.25)`.
- Accent (gold): `#e3c27e`. Primary ink: `#f3ede0`. Dim ink: `rgba(243,237,224,0.52)`.
  Legend name ink: `#ece6d8`. Numbers: `#fff`.
- **Team / flag colors:** France `#2138b8`, England `#e23039`, Spain `#c01528`, Argentina `#74b3e0`,
  Brazil `#00a14b`, Germany `#5a6068` (lightened from black for contrast on dark), Morocco `#c1272d`,
  Netherlands `#ff7a00`, Portugal `#0a8a44`, Norway `#ef3340`. These are stored per-team in the data so
  they travel with dynamic data; supply a color per team from your feed (or map by country code).

**Geometry**
- Ring radius 78, circumference ≈490.09 (200×200 viewBox). Stroke 16px, hover +11 (=27px), gap 6px.

**Radii / spacing**
- Card radius 28px; legend rows 12px; dots/flags as above. Spacing uses `clamp()` for fluid scaling.

**Typography**
- Font: `system-ui, -apple-system, "Segoe UI", sans-serif` throughout. Numbers use
  `font-variant-numeric: tabular-nums` so counting digits don't jitter.

**Motion**
- Load: 1700ms easeOutCubic. Segment transitions: stroke-width .35s / opacity .3s / filter .3s.
  Row transitions: .25s. Breathe: 4.6s. Shimmer: 8s.

## Assets
- **Flags:** Unicode emoji flags (no image files). England uses the subdivision-flag sequence
  `🏴󠁧󠁢󠁥󠁮󠁧󠁿`, which renders on Apple/most modern platforms; if you need guaranteed cross-platform
  flags, swap the emoji for small SVG/PNG flag icons keyed by country code.
- No other images, icons, or fonts. The blurred glow and shimmer are pure CSS.

## Files
- `win-probability-chart.html` — **primary reference**: standalone vanilla implementation with the
  full CSS token set, the SVG geometry math, the load animation, and hover logic. The
  `initWinProbabilityChart(mountEl, teams, options)` function returns `{ update(newTeams) }`.
  `options`: `{ thickness=16, hoverGrow=11, gap=6, duration=1700, ambient=true }`.
- `Win Probability.dc.html` — original prototype (custom runtime; behavioral reference only).
- `screenshot.png` — rendered reference image of the final design.

## Notes for implementation
- Keep flag-colored segments but ensure near-black national colors (e.g. Germany) are lightened for
  contrast on the dark card, as done here.
- `backdrop-filter` needs a non-opaque element behind the card to read as glass; keep the dark
  gradient (or the page content) behind it.
- Hit targets: legend rows are full-width and ~38px tall — good for touch. Segments are also tappable.
- If embedding on a light background instead, invert the ink colors and lower the glass opacity.
