# Cribl-gotchi

A Tamagotchi for your Cribl workspace. It eats logs, wears a unibrow, and dies of backpressure.

## App Overview:

**Cribl-gotchi** is a virtual pet (Tamagotchi-style mascot) embedded as a native Cribl App inside the Cribl Stream or Edge workspace. It translates real-time workspace telemetry into interactive game mechanics, reacting dynamically to the health and throughput of your log pipelines.

* **Data-Driven Growth**: The pet eats incoming event streams and routed bytes, gaining XP, leveling up, and earning "Byte-Coins" ($BC) as data passes through the workspace.


* **Evolution & Customization**: Pets evolve through three distinct stages (*Log Blob*, *Stream Serpent*, *Data Titan*) and can be styled with custom sizes, color palettes (e.g., *Chaos Magenta*, *Gangrene LCD*), hats, unibrows, and laser eyes purchased from the Byte-Coin Boutique.


* **Telemetry & Stress Mechanics**: The pet's Health (HP), Hunger (NOM), and Happiness (JOY) react to live workspace conditions. High backpressure, dropped events, worker disconnects, or CPU spikes inflict damage and trigger stress animations.


* **Pipeline Hazards**: Generates interactive incidents like *Regex Catastrophes* (catastrophic backtracking), *Buffer Overflows*, *Ingestion Storms*, and *Gremlin Jams* that require user intervention to resolve.


* **Meeting Time Dilation**: Features adjustable time multipliers ($1\times$, $60\times$ Standup, $600\times$ Incident Bridge) to speed up game ticks for stress testing and quick gameplay.



---

## Backend Functions

The app uses Cribl Apps' server-side Node.js backend runtime (`backend/tick.ts` and `backend/telemetry.ts`) to execute game state reduction and gather operational metrics independently of the client UI.

| Backend Function / Module | Purpose & Logic |
| --- | --- |
| **`onRequest` Handler** | Serves as the primary entry point for HTTP requests to `/api/v1/apps/cribl-gotchi/backend/tick`. Accepts incoming user actions, routes sweep calls, and triggers game ticks.

 |
| **`tickOne` & `reduce` Engine** | Loads state, executes pure functional state reduction (`engine.ts`), applies damage/XP/coin calculations, processes hazard deadlines, and persists updated state.

 |
| **`readWorkspaceTelemetry`** | Polls internal Cribl REST APIs to query real-time control plane and data plane metrics.

 |
| **Sweep Mode (`mode: "sweep"`)** | Scans all stored user pets across the workspace and executes background ticks to advance state even when users are not actively viewing the UI.

 |

### Internal Cribl REST APIs Queried

* `/api/v1/health`: Checks Leader node operational status.


* `/api/v1/health/workers` & `/api/v1/master/workers`: Queries Worker node health, disconnect counts, and group statuses.


* `/api/v1/system/metrics/query`: Issues JSON POST queries to aggregate cumulative metrics (`total.in_events`, `total.out_events`, `total.dropped_events`, `total.in_bytes`, `total.out_bytes`, `health.inputs`, `health.outputs`) over a 5-minute window.



---

## Key-Value Store (KVStore) Usage

State persistence relies on Cribl’s App KVStore API (`/api/v1/kvstore/...`), ensuring pet state follows the deployment environment rather than remaining locked in browser local storage.

* **`users/{userId}/state`**:
* **Contents**: Stores the primary `UserSave` document as plain text JSON.


* **Data Model**: Includes current pet stats (`PetRun`), game settings, unlocked inventory items, cumulative metrics, Hall of Fame records, and a graveyard history of up to 30 past deceased pets.




* **`users/{userId}/webhook`**:
* **Contents**: Stores the user's configured emergency notification endpoint.


* **Security**: Written using the `?encrypted=true` query parameter (`PUT /api/v1/kvstore/.../webhook?encrypted=true`), leveraging Cribl's native KV encryption to protect sensitive Slack/Discord webhook URLs.





---

## Webhook Integration ("Scream Pipe")

The "Scream Pipe" provides external notifications by sending automated outbound alerts when pipeline conditions severely impact the pet.

* **Trigger Events**:
* **Health Alerts**: Dispatched when a pet's health drops below the user-configured alert threshold (e.g., `<30%`).


* **Death Notifications**: Dispatched immediately when a pet dies from pipeline failure or starvation.


* **Test Screams**: Dispatched on demand via `type: "test_scream"` to validate endpoint configuration.




* **Supported Hosts**: Accepts HTTPS webhooks for **Slack** (`hooks.slack.com`) and **Discord** (`discord.com` / `discordapp.com`).


* **Payload Formatting**: Constructs ASCII retro LCD terminal art along with markdown-formatted incident details, current speech lines, cause of death, and pet epitaphs. Message formatting automatically adapts between Discord Markdown (`**bold**`) and Slack Mrkdwn (`*bold*`).

This README uses fixed section names and a fixed metadata table so it can be rendered as normal Markdown today and parsed into App Gallery components later.

## Summary

Cribl-gotchi is a Cribl app that turns workspace health into a ridiculous virtual pet. It helps users notice a sick leader or sweating workers before the bridge does, waste Byte-Coins on a mustache, and laugh when the pet files a postmortem.

It is an ambient health toy, not a pager. If the pet is on fire, check the real health page too.

## What This App Does

* Primary purpose: show Cribl workspace health as a pixel pet that gets hungry, sick, rich, or dead.
* Key capabilities:
  * Polls leader health, worker-process health, and recent system metrics.
  * One pet per signed-in member, stored in the app KV store.
  * Customize size, color, features, and hats. Buy the rest with Byte-Coins.
  * Four difficulties, including Chaos hazards. A stage-only "Fake a storm" button does not touch pipelines.
  * Optional Slack or Discord scream when health crosses a threshold. The webhook URL is stored encrypted.
* Intended users: anyone who wants a laugh and a glanceable health check.
* Works with: Cribl.Cloud Apps. Health is read from the leader, not from a specific Worker Group.

## When To Use This App

* You want a booth demo that is obvious from across the room.
* You want a silly reminder that the leader or its worker processes are unhappy.
* You want to hatch a Smol Bean named Regex Rex and immediately regret it.

## Before You Install

* Required Cribl product or deployment type: Cribl.Cloud with Apps enabled.
* Required permissions or roles: App user grant, plus access to `GET /health`, `GET /health/workers`, and `POST /system/metrics/query`. Those paths are declared in `config/policies.yml`.
* Required external systems or APIs: none. Slack and Discord are optional.
* Required configuration values: none at install. Webhooks are optional and entered in the toy.
* Known limits: scheduled decay runs once a minute. The open app also ticks every 10 seconds. Cron cannot tick faster than one minute.

## Installation

Use Marketplace installation as the default path whenever the app is available there. This gives users the easiest install path and makes future upgrades simpler.

### Install From Marketplace or URL
1. Go to Apps in your Cribl environment.
2. Choose the Marketplace or import from URL option.
3. If the app is available in the Cribl Marketplace, install it directly from there.
4. If the app is distributed as a Marketplace-hosted URL, use the URL to import it.
5. Review the app details and complete installation.

Why this is the preferred path:
* Simplest user experience
* Easier to adopt future releases
* Cleaner upgrade path when newer versions are published

### If The App Is Not Yet In The Cribl Marketplace
1. Go to the app's GitHub repository.
2. Open the Releases section.
3. Download the `.tgz` app package for the version you want. Build it with `npm run package`. Do not hand-tar the folder.
4. In Cribl, go to Apps and choose import from file.
5. Upload the downloaded `.tgz` file.
6. Review the app details and complete installation.

## Configuration

Nothing is required at install. The toy asks for a pet when you hatch one.

| Setting | Required | Description | Example | Scope |
|---|---|---|---|---|
| Pet name, difficulty, look | Yes, on hatch | Name, Easy/Medium/Hard/Chaos, size, color, up to three features | Regex Rex, Chaos, Smol Bean, Gangrene LCD, Unibrow | per user |
| Meeting Time Dilation | No | Speeds hunger and damage for a demo. Does not cheat 24-hour trophies | 60x standup | per user |
| Alert threshold | No | Health percent that arms a scream | 30 | per user |
| Webhook URL | No | Slack `hooks.slack.com/services/...` or Discord `discord.com/api/webhooks/...` | leave blank | per user, encrypted |

Blank webhook means the pet suffers locally. Blank dilation means real time. A healthy workspace will mostly just get hungry. Use Summon gremlin or Fake a storm if the booth is suspiciously calm. Fake a storm is a game overlay. It does not modify routes, pipelines, or destinations.

## How To Use

Open the toy, hatch a problem, and watch it react to the workspace.

### Typical Workflow
1. Open the app from the Apps page.
2. Hatch a pet. Pick a size, a color, and a feature. Chaos is the correct answer.
3. Feed, pet, and scoop it when it complains.
4. Watch HP drop if the leader or worker processes look unhappy.
5. Spend Byte-Coins in the shop. Read the graveyard. Summon a gremlin if the room is too quiet.

### First-Run Checklist
* Confirm the ticker mentions the leader instead of "cannot see workspace health".
* Hatch something embarrassing.
* If you need a death on stage, set dilation to 60x or 600x, pick Chaos, then Fake a storm.

## Permissions

The app needs the policies in `config/policies.yml` to read health. If those calls return 401 or 403, the pet stays playable and the ticker says it cannot see workspace health. It does not invent a healthy workspace.

Optional: a member may paste a Slack or Discord webhook. That URL is stored encrypted and is never required.

### Cribl API Endpoints Used

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Leader health. A non-healthy status stresses the pet. |
| GET | `/api/v1/health/workers` | Worker-process health. Down workers become backpressure. |
| POST | `/api/v1/system/metrics/query` | Recent input, output, and drop totals, plus health.inputs / health.outputs. |
| GET/PUT | `/api/v1/kvstore/users/{id}/state` | Per-member game save. Not a secret. |
| PUT | `/api/v1/kvstore/users/{id}/webhook?encrypted=true` | Webhook URL. Write-only encrypted value. |
| DELETE | `/api/v1/kvstore/users/{id}/webhook` | Forgets the scream pipe after an explicit confirm. |
| POST | `/api/v1/a/{appId}/endpoints/tick` | Backend decay, hazards, and optional alert. |

## External API Access

### Default Configuration
* `config/proxies.yml` — allows `hooks.slack.com/services/`, `discord.com/api/webhooks/`, and `discordapp.com/api/webhooks/`.
* `config/policies.yml` — grants the health and metrics reads above.
* `config/schedules.yml` — `decay-sweep` calls the `tick` endpoint every minute so pets can starve while the app is closed.
* `config/backend.yml` — declares the `tick` endpoint.

### External Endpoints
* Slack incoming webhooks — optional death-and-drama screams. Only if a member pastes a URL.
* Discord webhooks — same joke, different app.

No external call is made until someone arms a webhook. The URL is not written into the game-state document.

## Data And Storage

* `users/{memberId}/state` — pet, graveyard, unlocks, settings. One pet per signed-in member. Keys are namespaced by member id inside the app-scoped KV store.
* `users/{memberId}/webhook` — encrypted webhook URL. Reads from the client come back redacted. Do not put real customer data, hostnames, or tokens in pet names.
* Graveyard entries are capped at 30.
* Uninstall cleanup follows the Cribl Apps KV lifecycle. This app does not delete Cribl configuration.

## Support

### Community Built
This app is a community hackathon entry by Darren Fuller (Chaos Junkie). It does not carry an official support commitment from Cribl. Questions can go to the submission repository issues, once the repo exists under the Cribl-Community organization.

## Limitations

* Workspace health, not a single pipeline. A quiet healthy leader makes a bored pet. That is accurate, and also why Fake a storm exists.
* Metric names that a workspace does not emit are ignored. Health status still counts.
* Time dilation is a demo knob. Legacy trophies use real elapsed seconds.
* Scheduled decay is once a minute. The open app ticks every 10 seconds.
* Fake a storm and Summon gremlin are game overlays. They do not modify routes, pipelines, or destinations.

## Troubleshooting

### The ticker says it cannot see workspace health
The app grant is missing `GET /health`, `GET /health/workers`, or `POST /system/metrics/query`. Reinstall so `config/policies.yml` is applied, or check the member's role. The pet still hatches.

### A webhook scream never arrives
The URL must be `https://hooks.slack.com/services/...` or `https://discord.com/api/webhooks/...` (or `discordapp.com`). Other hosts are rejected. The URL is encrypted, so the form cannot show the saved value. Paste it again in the same session before testing.

### The pet will not die on stage
A healthy workspace is supposed to be boring. Open Knobs, set Meeting Time Dilation to 60x or 600x, hatch on Chaos, then press Fake a storm. That overlay is local drama. It does not touch Cribl config.

## Development

```bash
npm install
npm run dev
npm run build
npm run package
```

`npm run dev` opens Live Preview against Cribl.Cloud. Without the host globals, the same UI runs as a local toy and simulates calm telemetry. `npm run package` builds the versioned `.tgz`. Do not hand-tar it. Packaging bumps the patch version.

Game rules live in `src/game/engine.ts` and are imported by `backend/tick.ts`, so the open app and the minute sweep cannot disagree.

### AI disclosure
Built with GitHub Copilot in VS Code, model Grok 4.7. Work on this app started 2026-09-25. There was no pre-existing app; the scaffold came from `@cribl/apps`.

## Project Layout

```text
src/game/          shared pet rules, catalog, sprites
src/components/    retro shell and dialogs
backend/tick.ts    decay, hazards, encrypted webhook screams
config/            backend, policies, proxies, schedules
LICENSE
README.md
```

## Versioning And Releases

Versions follow semantic versioning. `npm run package` produces the installable `.tgz` and bumps the patch version. Install that artifact, not a hand-made archive.

## Contributing

This is a hackathon entry. Issues and jokes can go to the submission repository once it lives under the Cribl-Community organization.

## License

This app is licensed under the terms in [LICENSE](./LICENSE). Apache-2.0.

## App Metadata

Use this table as the canonical source for gallery fields. Keep the left column labels exactly as written.

| Field | Value |
|---|---|
| App Name | Cribl-gotchi |
| App ID | Cribl-gotchi |
| Version | 1.0.0 |
| Author | Darren Fuller - Chaos Junkie |
| Support Model | community-built |
| Support Label | Community Built |
| Support Contact | Hackathon submission repository issues |
| License | Apache-2.0 |
| License File | [Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0.txt) |
| Product Tags | stream |
