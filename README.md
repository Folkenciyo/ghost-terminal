# Ghost Terminal

A terminal that is always busy and never actually does anything. It streams an
endless, non-repeating simulation of a machine at work — installs, bundles,
container builds, rollouts, request logs, migrations, training runs, process
tables, memory dumps, video encodes, traceroutes, chaos drills, cluster
heatmaps, even whole incident-response narratives — with live progress bars,
telemetry gauges, a job feed, and commands that type themselves out with a
human's uneven rhythm (and the occasional corrected typo).

Pure eye candy, by design: nothing is executed, nothing is fetched, nothing is
stored.

## How it works

```
src/lib/
  rng.ts        seeded mulberry32 PRNG — every visual is reproducible
  types.ts      Chunk / Line / Op / Step / Scene contracts
  ansi.ts       bar(), pad(), spinner(), line builders
  vocab.ts      word banks + fake semver / sha / ip / path / uuid generators
  buffer.ts     immutable op reducer, capped at 400 rows
  scheduler.ts  weighted pick that refuses the last 4 scenes
  metrics.ts    random-walk gauges for the telemetry rail
  typewriter.ts turns a command string into human-rhythm keystrokes
  config.ts     URL / storage config: seed, speed, theme, pane count
  engine.ts     endless step stream, namespaces line ids per run
  scenes/       40 scene generators (pure: Rng -> Step[])
src/hooks/      useTerminalStream (one engine per pane), useGauges
src/components/ TerminalPane, TerminalView, GaugeRail, StatusBar, TopBar,
                GhostTerminal (the shell: panes, theme, kiosk mode)
```

The engine is pure data: a scene is a function `Rng -> Step[]`, and a step is
`{ delayMs, ops }`. Rendering is the only side effect, which is why the whole
simulation — typewriter rhythm included — is unit-testable without a DOM.

Non-repetition comes from three places: seeded randomness inside every scene,
a scheduler that blocks the last four scenes, and per-run id namespacing so no
two runs of the same scene collide. Each pane runs its own `createEngine`
instance from an independently-seeded stream, so panes never mirror each other.

## Scene catalogue

| Group | Scenes |
| --- | --- |
| build | npm-install · bundler · cargo-build |
| quality | test-run · vuln-scan · stack-trace |
| infra | docker-build · k8s-rollout · git-push |
| runtime | http-log · db-migrate · train-model |
| system | sysmon · hex-dump · boot-banner |
| media | encode-video · render-frame · compile-shaders |
| network | traceroute · port-scan · dns-propagation · renew-cert · crawl-site |
| data | kafka-lag · redis-monitor · object-sync · query-plan |
| ops | terraform-apply · apt-upgrade · disk-check · canary-shift · chaos-drill · git-bisect |
| art | matrix-rain · heat-grid · mesh-topology · benchmark |
| incidents | incident-5xx · incident-disk · incident-supply |

`incidents/` scenes are ordinary scenes that stitch three catalogue scenes into
a story with `ALERT` → diagnosis beats → `RESOLVED`, so they get the same
automatic test coverage as everything else.

Adding a scene is a single pure function plus a registry entry — the contract
suite in `src/lib/scenes/scenes.test.ts` then tests it automatically (delays,
id hygiene, determinism, seed variation, printable output).

## Controls

| Key / control | Action |
| --- | --- |
| `space` | pause / resume every pane together |
| `1`–`5` | playback speed (0.5x, 1x, 2x, 4x, 8x) |
| `p` | cycle pane count (1 → 2 → 3 → 4 → 1) |
| `t` | cycle theme (persisted to `localStorage`) |
| `f` | toggle fullscreen / kiosk mode |
| status bar | all of the above, by mouse |

### Themes

`phosphor` (default teal) · `amber` (IBM 3278) · `matrix` (green) ·
`synthwave` · `ice`. Each is a CSS custom-property swap in `globals.css` —
no per-component theme logic.

### URL configuration

Every knob is a query param, so a link is a saved preset:

```
/?seed=4242&speed=2&panes=3&theme=amber&kiosk=1
```

- `seed` — fixes the first pane's RNG seed (other panes derive from it) for a
  byte-identical replay.
- `speed` — one of `0.5`, `1`, `2`, `4`, `8`.
- `panes` — one of `1`, `2`, `3`, `4`.
- `theme` — one of the theme ids above; overrides the stored preference.
- `kiosk=1` — starts fullscreen-oriented (hides the pointer after 3s idle,
  requests a screen wake lock where the browser supports it).

## Development

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 470+ unit + integration tests
npm run test:cov     # coverage, 80% gate
npm run lint
npm run typecheck
npm run build
```

## Deploy (Dokploy)

The image is a standard multi-stage Next.js `standalone` build listening on
port 3000, with `/api/health` wired to the container healthcheck.

1. In Dokploy create a **Compose** application pointing at this repository.
2. Compose file: `docker-compose.yml` (already in the repo root).
3. Attach the domain to service `ghost-terminal`, container port **3000**.
4. Deploy.

Traefik labels are intentionally absent — Dokploy manages routing, TLS and
certificates itself, so adding labels by hand would fight the platform.

Local equivalent:

```bash
docker compose up --build
```
