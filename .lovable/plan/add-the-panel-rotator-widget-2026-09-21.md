# Add the Panel Rotator Widget

## Goal
Add a fourth **Widget** tab inside **Twitch Overlays** while keeping Patreon, GamerSupps, and Social unchanged. The new tab will turn the uploaded panel-rotator design into an editable, downloadable OBS widget.

## What I’ll build
- Preserve the uploaded visual design and its five-slide rotation: Patreon, Socials, Throne, Commissions, and GamerSupps.
- Show the widget in the same live 1920×1080 preview workspace used by the other overlays, with replay and custom preview-background controls.
- Add an editor for:
  - slide order and visibility
  - rotation and transition timing
  - text glow and Sakura visibility/spin
  - all displayed headings, handles, URLs, notes, discount, and code text
  - the supplied Patreon background, Throne background/logo, commission background/mascot, and GamerSupps artwork
- Reuse the project’s existing normalized social icons and Sakura artwork where appropriate.
- Seed the new widget with the images supplied in this message, including the Throne logo, commission mascot/background, and GamerSupps bottle.
- Save editor choices in the browser so the setup survives refreshes.
- Download one self-contained HTML file ready for an OBS Browser Source.
- Add the same styled OBS Setup Guide used by the existing overlay tabs.

## Technical details
- Store the uploaded template as source material and add a focused builder that injects configuration into a clean OBS-only version; the downloaded file will not contain the template’s design-sheet previews or editing button.
- Keep image uploads embedded as data URLs so downloaded HTML remains portable.
- Add `WidgetBuilder` as a separate component and extend only the existing Twitch sub-tab switch.
- Keep the route metadata complete and verify the new tab, preview rotation, persistence, and download in the live app.
