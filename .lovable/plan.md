# Add Per-Slide Background Cropping

## Goal
Give every panel-rotator slide with a full background image—Patreon, Throne, and Commissions—its own Twitter/X-style crop editor, while preserving existing widget settings and exports.

## What I’ll build
- Add a separate background upload and crop area inside each applicable slide editor.
- Show the image inside a fixed 480×130 crop window that matches the panel’s aspect ratio.
- Support pointer and touch dragging in every direction, with the image updating immediately.
- Add a zoom slider that starts at `1×` and only zooms inward, so the frame never exposes empty edges.
- Display and store each slide’s horizontal position, vertical position, and zoom independently.
- Keep the current shared background as the fallback for existing saved setups, so nothing unexpectedly resets.
- Apply the saved crop to the main live preview and write it into the downloaded OBS HTML.
- Include a reset control for returning one slide to centered, unzoomed framing.

## Technical details
- Extend the widget configuration with per-slide crop data: `{ x, y, zoom }` for Patreon, Throne, and Commissions.
- Give those three slides independent background image overrides while retaining the legacy `banner` fallback.
- Continue using `object-fit: cover`; export `object-position: X% Y%`, `transform: scale(zoom)`, and a matching transform origin on each `.panel-bg` image.
- During dragging, calculate the rendered cover dimensions from the image’s natural dimensions and the crop frame, then convert pointer movement into clamped `0–100%` object-position values. Zoom remains at or above `1`, ensuring no empty edges.
- Use pointer capture so mouse and touch dragging remain smooth even when the pointer leaves the crop window.
- Verify persistence, drag behavior, zoom, per-slide independence, live-preview output, exported HTML, and desktop/mobile layout.
