# Exporting an Audio Teaser as a Video (for X)

The site doesn't render video itself — instead it gives you a clean **Broadcast**
view that you record with **OBS Studio** (free). This works for any clip length,
costs nothing, and produces a real MP4 that X accepts.

## One-time OBS setup (about 2 minutes)

1. Install **OBS Studio** (free): https://obsproject.com
2. Open OBS → in **Settings → Output**:
   - Recording Format: **MP4**
   - Encoder: leave default (hardware if offered)
3. In **Settings → Audio**, make sure a **Desktop Audio** device is set (this is
   how OBS records the teaser's sound).

## Recording a teaser

1. In the site, open the **Audio Teasers** tab.
2. **Upload the audio** (top bar) and edit the text/cover on the style you want.
3. Click **● Broadcast for OBS** under that style. The card fills the screen on
   black; the on-screen label shows its exact pixel size (e.g. `1026×1283px`).
4. In OBS, add a source:
   - **Display Capture** (simplest), or
   - **Window Capture** → pick the browser window.
   Then right-click the source → **Transform → Edit Transform** (or just drag the
   red crop handles while holding **Alt**) to crop down to just the card.
5. Press **Start Recording** in OBS.
6. Back in the browser, move the mouse to reveal the controls and click
   **▶ Start from 0:00**. The visuals react to the audio in real time.
7. When the audio finishes, click **Stop Recording** in OBS.
8. Trim the start/end in any free editor if needed, then post the MP4 to X.

> Tip: the controls auto-hide after a couple of seconds so they won't appear in
> the recording. Move the mouse any time to bring them back.

## Quality note

With screen/window capture the resolution is limited by the monitor. That's fine
for X (it re-compresses anyway). If you later want **true 1080×1350** regardless
of screen size, that's the "OBS Browser Source" upgrade — it needs the audio
hosted on a URL (your Supabase project can do this for free), and a storage
bucket created once. Ask and we'll wire it up.
