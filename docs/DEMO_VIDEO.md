# Demo Video Generation

Playwright now produces a ~30 second, 1080p walkthrough by rendering the platform SPA, documentation, and marketing build through a lightweight local server so hashed assets load correctly.

## Prerequisites

- Run `npm run build` from the repository root so the main application has fresh static assets.
- Build the marketing site (`cd marketing-site/frontend && npm run build`) if you want its visuals up to date.
- Playwright browsers must be installed (`npx playwright install`).

## Usage

```bash
npm run demo:video
```

The command spins up a temporary static server at `http://127.0.0.1:4173`, captures three curated scenes, and saves the recording to `media/demo/nectar-demo.webm`.

## Customising The Flow

- Timing, scroll motions, and targeted routes live in `scripts/generate-demo-video.js`.
- Add or reorder scenes by editing the `segments` array; each scene just needs a URL served by the helper and an async `action` routine.
- The script is intentionally silent. To layer in narration, record audio separately and combine it in your editor of choice (e.g. ffmpeg, Premiere, Descript).

## Optional MP4 Export

Install a full FFmpeg build (Playwright's minimal binary lacks H.264 presets), then run:

```bash
ffmpeg -i media/demo/nectar-demo.webm -c:v libx264 -crf 18 -preset slow -c:a aac media/demo/nectar-demo.mp4
```

Adjust the CRF or preset to balance quality versus file size.
