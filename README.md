# Procedural Chaos

A client-side creative playground built with Vite, React, TypeScript, shadcn/ui, and Tailwind CSS.

- **Mandala Studio:** deterministic traditional, geometric, organic, abstract, and hybrid mandala line art.
- **Video Studio:** planned automated coloring videos using generated or imported artwork.

Phase 2 adds style-guided compositions and normalized hybrid blending, with nested ornamentation, beaded borders, six distributions, recursive motifs, transformations, and multiple focal centers. Geometry, symmetry, distribution, and growth controls override the style suggestions. Video creation, the full layer editor, project saving, and artwork exports are still planned.

Open `#/mandala` to try the generator. Identical seeds and settings produce identical line art. The Video Studio remains a placeholder; the landing page still offers the local-storage and Web Worker smoke tests.

No backend, accounts, or server-side processing are required. Desktop Chrome or Edge is recommended.

## Try the current Mandala Studio

1. Select **traditional**, **geometric**, **organic**, and **abstract**. Expect visibly different petals, polygon patterns, botanical forms, and asymmetric multi-center compositions.
2. Select **hybrid** (starts at 70% traditional / 30% geometric). Adjust the four weights; the contribution summary normalizes them. All-zero weights show an explicit error; add a positive weight or restore defaults to recover.
3. Move **Complexity** to compare simpler bands with more layered ornamentation. Keep the same seed/settings to reproduce the artwork; change the seed to vary band proportions and details.
4. Under **Geometry & placement**, try a different base, symmetry, distribution, or number of focal centers. Explicit choices override style defaults. Narrow ornamental borders remain rings.
5. Expand **Growth & transformations** and try recursion, twist, distortion, noise, and broken symmetry. Broken symmetry and multiple centers are labeled as not globally symmetric. **Restore style defaults** clears overrides; selecting a new style also clears them.
6. Zoom, drag to pan, and reset the view. On desktop, the preview stays beside the settings as you scroll; smaller screens keep the stacked layout. Video Studio remains an independent placeholder.

Styled paths are closed and can enclose coloring regions, but dense intersections and tiny details are not automatically simplified. Generation is currently synchronous and capped at 24,000 paths with an explicit error; worker/debounced generation arrives with the full editor.

## Prerequisites

- Node.js **24** and npm.
- Git and write access to the GitHub repository **only for deployment**.

If you use [nvm](https://github.com/nvm-sh/nvm), run these commands from the repository root:

```bash
nvm install
nvm use
```

The version is specified in [.nvmrc](./.nvmrc). Without nvm, install Node 24 using your preferred method.

## Install dependencies

Run all commands below from the repository root:

```bash
npm ci
```

This installs the versions recorded in [package-lock.json](./package-lock.json).

## Run locally (development)

```bash
npm run dev
```

Open **http://localhost:5173/procedural-chaos/**, or use the address printed by Vite if it selects another port.

The development server automatically updates the page as you edit source files. Press **Ctrl+C** to stop it.

## Build

```bash
npm run build
```

This type-checks the TypeScript code and generates the static application in `dist/`. The build includes `.nojekyll` from [public/.nojekyll](./public/.nojekyll).

## Run the built app locally

```bash
npm run build
npm run preview
```

Open **http://localhost:4173/procedural-chaos/**, or the address printed by Vite.

This serves the same `dist/` output that gets deployed, rather than the development source. Preview does not rebuild automatically; rerun `npm run build` after source changes. Press **Ctrl+C** to stop the preview server.

Do not open `dist/index.html` directly with a `file://` URL: the app uses web assets and workers that require an HTTP server. `vite preview` is a local verification tool, not a production hosting service.

## Deploy to GitHub Pages (manual)

**Deployment and source commits are user-managed.** Installing dependencies, developing, building, and previewing do not deploy anything.

Confirm that `origin` points to the repository you intend to publish:

```bash
git remote -v
```

When you are ready to publish:

```bash
npm run deploy
```

This command:

1. Runs the `predeploy` hook: lint, tests, and the production build.
2. Uses the `gh-pages` npm package to commit the contents of `dist/` to the **gh-pages** branch and push it to **origin**.
3. Includes hidden files using `--dotfiles`, preserving `.nojekyll`.

It requires working Git credentials and write access to the remote repository. It does **not** commit your source files on `main`; manage source commits separately. No custom GitHub Actions deployment workflow is needed.

### One-time GitHub Pages setup

After the first deployment creates the branch:

1. Open the repository on GitHub.
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **Deploy from a branch**.
4. Select **gh-pages** and **/(root)**, then save.

The configured repository's site URL is:

**https://keycache.github.io/procedural-chaos/**

For a fork, use `https://{username}.github.io/procedural-chaos/`. If you rename the repository or change the hosting path, update `base` in [vite.config.ts](./vite.config.ts) before rebuilding.

GitHub Pages may take a short time to publish. Once available, check that the greeting, styling, worker test, and navigation work. Refresh a studio URL to confirm routing:

- `https://keycache.github.io/procedural-chaos/#/mandala`
- `https://keycache.github.io/procedural-chaos/#/video`
- `https://keycache.github.io/procedural-chaos/#/library`

Hash routing avoids the need for server-side SPA rewrites. A push to `main` alone does not publish a new version; run `npm run deploy` again when ready.

## Quality checks

```bash
npm run lint
npm test
npm run format:check
```

Other useful commands:

```bash
npm run test:watch   # Watch tests during development
npm run format      # Format application and configuration files
```

## Local storage

Projects and settings are designed to stay in your browser's IndexedDB database. Phase 0 supports saving the smoke-test seed; project collections are initially empty.

Storage is specific to the browser and origin. Local development, local preview, and GitHub Pages do not share the same library. Clearing site data removes locally stored settings and projects.

## Project documentation

- [Plan](./docs/PLAN.md): phased implementation roadmap.
- [Specifications](./docs/SPECIFICATIONS.md): architecture and technical details.
- [npm scripts and dependencies](./package.json).
