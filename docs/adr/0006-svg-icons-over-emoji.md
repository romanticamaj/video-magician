# ADR-0006: SVG icon components instead of emoji

## Status

Accepted

## Context

Overlays need small pictorial marks (chapter chips, CTA, stamps). Emoji are the
zero-effort option but render differently per platform, clash with a curated
visual style, and cannot follow the design system's colors or stroke weight.

## Decision

Hand-drawn inline SVG components (`src/engine/icons.tsx`) with a consistent
24-unit viewBox and stroke style, colored via props. Configs reference icons by
string name through an `ICONS` map, keeping config data serializable.

## Consequences

- Icons match the accent palette and scale crisply at any size.
- Adding an icon means drawing a small SVG path rather than picking a glyph —
  slightly more effort, uniform result.
- No dependency on any icon library; the whole set is ~200 lines.
