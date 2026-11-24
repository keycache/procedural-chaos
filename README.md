# Procedural Chaos

A client-side creative playground built with Vite, React, TypeScript, shadcn/ui, and Tailwind CSS.

- **Mandala Studio:** deterministic traditional, geometric, organic, abstract, hybrid, bold-floral, and ornate-lotus mandala line art.
- **Video Studio:** planned automated coloring videos using generated or imported artwork.

Mandala Studio includes eleven curated presets, random seeds and recent-seed history, global appearance and per-layer controls, undo/redo, background generation, SVG/PNG/JSON exports, and local project save/reopen. The engine includes four band-based styles and hybrids, bold-floral and ornate-lotus compositions with shape-aware ornament, six distributions, recursive motifs, and multiple focal centers. Video creation remains planned.

Open `#/mandala` to try the generator. Identical seeds and settings produce identical line art. The Video Studio remains a placeholder; the landing page still offers the local-storage and Web Worker smoke tests.

No backend, accounts, or server-side processing are required. Desktop Chrome or Edge is recommended.

## Try the current Mandala Studio

1. Select **traditional**, **geometric**, **organic**, and **abstract**. Expect visibly different petals, polygon patterns, botanical forms, and asymmetric multi-center compositions.
2. Select **hybrid** (starts at 70% traditional / 30% geometric). Adjust the four weights; the contribution summary normalizes them. All-zero weights show an explicit error; add a positive weight or restore defaults to recover.
3. Move **Complexity** to compare simpler bands with more layered ornamentation. Keep the same seed/settings to reproduce the artwork; change the seed to vary band proportions and details.
4. Under **Geometry & placement**, try a different base, symmetry, distribution, or number of focal centers. Explicit choices override style defaults. Narrow ornamental borders remain rings.
5. Expand **Growth & transformations** and try recursion, twist, distortion, noise, and broken symmetry. Broken symmetry and multiple centers are labeled as not globally symmetric. **Restore style defaults** clears overrides; selecting a new style also clears them.
6. Zoom, drag to pan, and reset the view. The mandala automatically scales to fit the preview's available width and height; reset restores this fitted view. On desktop, the canvas uses the available viewport height and stays beside the settings as you scroll; smaller screens keep the stacked layout. Video Studio remains an independent placeholder.
7. Choose a **Composition preset**; its name stays selected while the composition matches it, including after undo/redo or reopening a saved project. Editing its settings shows **Custom composition**; renaming alone preserves the selection. Then try **Randomize seed** or reuse a **Recent seed**. The eleven presets cover the four band-based styles, two hybrids, four bold-floral treatments, and ornate layered lotus. Recent seeds and undo/redo are tab-session state, not permanent storage.
8. Under **Global appearance**, vary density, negative space, irregularity, and stroke width. In **Layers**, add, duplicate, move, enable/disable, or remove bands; edit motifs, placement, radial bounds, and detail settings. Undo/redo must restore the exact drawing. Invalid layer edits show an error without hiding the editable controls.
9. Give the project a name and **Save project**. Open **Library**, refresh, and reopen it: the exact custom recipe and drawing should return. Subsequent saves update that project; **Save a copy** creates another. Unsaved tab edits are lost on refresh.
10. At the bottom of the settings, export **SVG**, **PNG**, and **JSON**. SVG includes recipe and geometry metadata. Choose PNG sizes from 1024 to 8192 pixels and white/transparent backgrounds. JSON is the exact engine recipe; JSON import is not yet a UI feature.

Each setting has a small info icon beside its label. Hover over it or focus it with **Tab** to see what the control does, including prerequisites and effects on custom layers. **Escape** dismisses the tooltip.

### Try the bold-floral composition

Select **Floral flourish** under **Composition preset**, or choose **bold-floral** under **Generative style**. Expect a central flower, large nested leaves, alternating pointed/scalloped crowns, curling tendrils, and tapered black accents instead of circular separator bands.

- Try **Floral divisions** at 6, 8, 10, and 12; widths adapt to the repeated sector. Eight is the curated starting point.
- Change **Complexity** to vary hatching, beads, inset outlines, and small curls while retaining the main silhouette. **Stroke width** controls the line hierarchy without enlarging filled accents.
- Compare seeds `flourish-008`, `flourish-009`, and `flourish-010`, then restore the original settings for identical artwork.
- Switch back to a band-based style and undo/redo. Existing layer controls return for those styles; they are intentionally hidden for floral compositions.
- Save/reopen and export SVG, PNG, or JSON as usual. Foreground masks remove covered rear lines without adding white paint, including on transparent exports. SVG drawing roles distinguish closed outlines, decorative open strokes, and solid ink accents.

### Try the shape-aware ornaments

- Compare the **Contour lace**, **Botanical filigree**, and **Paisley jewels** presets. All use seed `flourish-008`, 65% complexity, eight divisions, and 35% spacing, so you can compare treatments without changing the primary silhouette.
- In **bold-floral** mode, change **Ornament treatment**: contour lace adds nested petals and beaded borders; botanical filigree adds curved veins and leaf sprays; paisley jewels adds curled ornaments and bead accents. The roomy heads of pointed crowns and the large leaves receive fitted detail.
- Vary **Complexity** and **Ornament spacing**. Increasing spacing increases clearance and repeated-detail gaps; unsafe or undersized candidates are omitted and counted below the preview. Fine decoration stays subordinate to the large forms. Settings with no room for readable detail show an actionable error.
- Select **Classic floral** to recover the original floral treatment exactly. Undo/redo, preset matching, Library save/reopen, and SVG/PNG/JSON exports include the new settings. Both new controls have info tooltips.

The reusable vocabulary includes leaves, lotus petals, paisleys, scallops, curls, and beaded borders with motif-local contours, curved spines, and attachment points. It also decorates the separate ornate-lotus family below. Full swirling-paisley composition planning remains future work. Fitting is not arbitrary collision packing; intentional vein/leaf attachments can meet. Region detection and coloring remain future work.

### Try the ornate layered lotus

Select **Ornate layered lotus** under **Composition preset**, or **ornate-lotus** under **Generative style**. The curated starting point uses seed `lotus-bloom-008`, 75% complexity, eight divisions, and stroke width 2.5.

- Expect six interleaved crowns: rounded outer scallops, dominant lotus petals, a double-count slender crown, curled inner petals, and two central rosette crowns. Fitted beads, botanical detail, and paisley curls alternate with quiet areas instead of adding circular separator bands.
- Vary **Complexity** from low to high. Primary petal silhouettes and overlaps stay identical; the ornament changes. **Petal divisions** supports 6/8/10/12, with coordinated widths and offsets; the slender crown has twice that many petals.
- Compare seeds `lotus-bloom-008`, `lotus-bloom-009`, and `lotus-bloom-010`, then restore the starting preset. Expect bounded variations and exact reproduction.
- **Stroke width** is limited to 0.25–4 design units to preserve readable central ornaments. Treatment/spacing choices are curated per crown rather than exposed as global overrides. Inapplicable ring/layer/blend controls stay hidden; the new division label and existing dials have info tooltips.
- Zoom into overlapping crowns and export SVG/PNG: rear outlines and ornament should disappear beneath foreground petals, without white backing paint in transparent exports. Save/reopen, preset highlighting, and Undo/Redo work as with other families.

### Current generation limits

Style, blend, complexity, and structure/growth changes rebuild custom layers; global appearance changes preserve them. Adding/removing bands redistributes widths; moving swaps bands between radial slots. Use undo to recover an earlier composition.

Band-based styled paths are closed and can enclose coloring regions, but dense intersections and tiny details are not automatically simplified. Floral drawings deliberately retain open decorative strokes separately from closed outlines; neither closure nor drawing roles guarantee clean coloring regions. Generation uses a Web Worker with a 200 ms debounce, cancellation/stale-result rejection, a 15-second timeout, and a 24,000-path band-engine limit. Classic floral stays below 1,500 drawing paths; petal compositions have a 4,000-path ceiling. Shape-aware treatments additionally limit each decorated motif to 128 accepted paths and 256 fitting attempts, with at most 48 beads per border. Pending/error previews never silently export old artwork. Very large PNGs require more browser memory.

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

Saved mandalas and settings stay in your browser's IndexedDB database. The Library lists saved mandalas with previews and reopens their exact editor state. Imported-artwork and video-project collections remain placeholders; the smoke-test seed is still supported. Save explicitly before refreshing or closing the tab.

Storage is specific to the browser and origin. Local development, local preview, and GitHub Pages do not share the same library. Clearing site data removes locally stored settings and projects.

## Project documentation

- [Plan](./docs/PLAN.md): phased implementation roadmap.
- [Specifications](./docs/SPECIFICATIONS.md): architecture and technical details.
- [npm scripts and dependencies](./package.json).
