# Part 1: Frontend Project Setup on Inner Network

## What you're doing
Transferring the entire source project to your inner network machine so you can build the frontend locally there (or build here and copy the output).

---

## Option A: Build on your dev machine, copy output only (RECOMMENDED)

You only need **2 compiled files** from the build. No need to install Node/yarn on the inner network.

### Step 1 — Build on your current machine

```bash
cd packages/query-tester
./node_modules/.bin/webpack --mode=production
```

### Step 2 — Grab the output files

After the build, the compiled files are at:

```
packages/query-tester/stage/appserver/static/pages/QueryTesterApp.js    (≈13 MB)
packages/query-tester/stage/appserver/static/pages/QueryTesterApp.css   (≈47 KB)
```

These two files ARE the entire React app + Tailwind CSS. Copy them to a USB drive / file share.

### Step 3 — Done

Skip to `02-SPLUNK-APP-DEPLOY.md` for deploying into Splunk.

---

## Option B: Transfer entire project and build on inner network

Use this if you need to make future code changes on the inner network.

### Step 1 — What to transfer

Copy the entire repo folder. The critical parts are:

```
splunk-ui-toolkit-apps/
├── packages/
│   ├── query-tester/            # Splunk app wrapper + webpack config
│   │   ├── src/                 # Webpack entry point (index.tsx)
│   │   ├── webpack.config.js
│   │   ├── package.json
│   │   └── node_modules/        # ← MUST be included (no npm install on air-gap)
│   │
│   └── query-tester-app/        # React source code
│       └── src/
│           ├── config/
│           │   └── env.ts       # ← EDIT THIS before building (see Step 2)
│           ├── api/
│           ├── core/
│           ├── features/
│           └── components/
│
├── node_modules/                # ← MUST be included (root-level deps)
└── package.json
```

**IMPORTANT:** You must include `node_modules/` at both levels (root and `packages/query-tester/`). Since it's an air-gapped network, you can't run `yarn install`.

### Step 2 — Edit frontend config BEFORE building

Edit `packages/query-tester-app/src/config/env.ts`:

```ts
export const ENV = {
  // These must match your target Splunk's restmap.conf
  REST_PATH: 'splunk_query_tester/query_tester',
  FALLBACK_ENDPOINT: '/splunkd/__raw/services/splunk_query_tester/query_tester',
  SPLUNK_SERVICES_BASE: '/splunkd/__raw/services',

  // Set to '' to disable AI features (no internet on air-gap)
  LLM_ENDPOINT: '',
  LLM_API_KEY: '',
  LLM_MODEL: '',
  LLM_MAX_TOKENS: 1024,

  MAX_QUERY_DATA_EVENTS: 10_000,
} as const;
```

> **Air-gapped network:** Set `LLM_ENDPOINT` and `LLM_API_KEY` to empty strings.
> The Extract Fields button will show an error message instead of calling OpenAI.

### Step 3 — Build

```bash
cd packages/query-tester
./node_modules/.bin/webpack --mode=production
```

### Step 4 — Output

Same as Option A — the compiled files are at:
```
packages/query-tester/stage/appserver/static/pages/QueryTesterApp.js
packages/query-tester/stage/appserver/static/pages/QueryTesterApp.css
```

---

## What does NOT go to the Splunk server

None of the source code goes to Splunk. Only the compiled output:

| DO NOT copy to Splunk | Reason |
|---|---|
| `packages/query-tester-app/src/` | Source code, only needed for builds |
| `packages/query-tester/src/` | Webpack entry point, only needed for builds |
| `node_modules/` | Build dependencies, not needed at runtime |
| `package.json`, `webpack.config.js` | Build config |
| `vite.config.ts` | Dev server only |
| `.env.local` | Dev only |
