# Procedural Chaos — Specifications

A toy, browser-only creative app with two independent studios:

- **Part 1 — Mandala Studio:** procedurally generates coloring-ready mandala line art.
- **Part 2 — Video Studio:** turns any line-art illustration (generated or imported) into a procedural coloring video.

Part 1 output can be used as Part 2 input via an exported SVG file, but neither part depends on the other.

Source discussions: [automated-mandala-creation.md](../.data/raw/automated-mandala-creation.md), [automated-mandala-video-creation.md](../.data/raw/automated-mandala-video-creation.md), [decisions](../.data/decisions/automated-mandala-video-creation.md).

---

## 1. Principles and constraints

| Principle | Meaning |
| --- | --- |
| Client-side only | No backend, API, accounts, or server rendering. GitHub Pages serves static files published with the `gh-pages` npm package. |
| Toy project | Prefer simple, working solutions over production hardening. Polished UI; rough edges are acceptable. |
| Deterministic | Same inputs + same seed → identical mandala, coloring order, and video. |
| Engines are framework-free | Generation, region detection, sequencing, and rendering logic contain no React and can be tested in isolation. |
| Responsive UI | Heavy computation runs in Web Workers. |
| Desktop Chrome/Edge first | Other browsers are best effort. Required APIs are feature-detected with a clear message when missing. |

### Out of scope

- Server-side processing, cloud storage, accounts, or collaboration
- Mobile layouts
- Production concerns such as analytics, monitoring, and broad browser support
- Video formats other than MP4 and aspect ratios other than 1:1 (possible later)

---

## 2. Tech stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript 6 (strict; compatible with `typescript-eslint`) |
| Build/dev | Vite |
| UI | React, shadcn/ui, Tailwind CSS, lucide-react icons |
| Routing | React Router `HashRouter` (`#/mandala`, `#/video`, `#/library`) |
| State | Zustand (separate store per studio, plus a library store) |
| Schemas | Zod for recipes, saved projects, and imported JSON |
| Randomness | In-house Mulberry32 PRNG initialized from an FNV-1a string hash |
| Color | `culori` for OKLCH-based shades, harmonies, and contrast |
| Persistence | IndexedDB through `idb` |
| Background work | Web Workers through Comlink; `OffscreenCanvas` for rendering |
| Video export | WebCodecs (`VideoEncoder`, H.264) + Mediabunny (MP4 muxing) |
| Testing | Vitest for engines; manual UI checks |
| Linting | ESLint + Prettier |
| Hosting | GitHub Pages at `https://{username}.github.io/procedural-chaos/` |
| Package manager / runtime | npm with a committed `package-lock.json`; Node 24 via `.nvmrc` |
| Deployment | `npm run deploy` using `gh-pages` to publish `dist/` to the `gh-pages` branch |

---

## 3. Application structure

One app with two studios and a shared library.

```text
src/
  app/                 # shell, routes, layout, theme, providers
  components/ui/       # shadcn/ui components
  shared/              # PRNG, math/geometry, color, schemas, storage, worker helpers
  engines/
    mandala/           # Part 1 generation engine (framework-free)
    regions/           # Part 2 import, region detection, symmetry (framework-free)
    sequencing/        # Part 2 grouping, ordering, color assignment, timeline
    render/            # Part 2 frame renderer and video export
  studios/
    mandala/           # Part 1 UI, store, and presets
    video/             # Part 2 UI, store, and presets
    library/           # saved mandalas, artworks, and video projects
  workers/             # worker entry points
```

Import rules: `engines/*` may import only from `shared/`; `studios/*` may import engines and `shared/`; studios must not import each other.

### UI layout (both studios)

- **Top bar:** studio switcher, project name, save, export.
- **Left panel:** preset picker followed by collapsible settings sections (one per aspect).
- **Center:** live preview with zoom and pan.
- **Bottom (Video Studio):** transport controls (play/pause, scrub, time, speed) and render progress.
- Dark theme by default, keyboard shortcuts for common actions, and toast notifications for errors.

### 3.1 GitHub Pages and Vite configuration

The repository is a GitHub Pages **project site**, not the account's root site. Its deployment path is `/procedural-chaos/`; the username does not appear in Vite's base setting.

Configure `vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/procedural-chaos/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

- Keep the default `dist/` build output.
- Merge `"paths": { "@/*": ["./src/*"] }` into `compilerOptions` in **both** `tsconfig.json` (for shadcn's configuration discovery) and `tsconfig.app.json` (for application type-checking). Preserve existing references and strict settings.
- Use the Tailwind Vite plugin and `@import "tailwindcss";` in `src/index.css`, followed by shadcn-generated theme definitions. No legacy Tailwind/PostCSS setup is needed.
- Ensure the React entry point imports `src/index.css`. Remove the Vite demo `App.css` import/styles so they do not constrain the app layout.
- Use bundled imports for application assets. For files in `public/`, construct paths using `import.meta.env.BASE_URL` rather than hard-coded root URLs such as `/image.png`. Remove or update the starter `/vite.svg` favicon reference.
- Bundle workers through Vite's `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` pattern rather than fetching a root-relative worker script.
- Add an **empty, tracked** `public/.nojekyll`; Vite copies public files unchanged, including this file, into `dist/`. It marks the content as static rather than Jekyll input. The `gh-pages --dotfiles` deployment command includes this marker in the published branch.

**Routing:** GitHub Pages has no SPA rewrite rule. Use `HashRouter`, not `BrowserRouter`, so the server always receives `/procedural-chaos/` regardless of the selected studio. Route definitions remain `/mandala`, `/video`, and `/library`, and React Router links use those paths. Do not add a `/procedural-chaos/` router basename; Vite's base controls asset URLs, while the hash controls client-side routes.

Examples:

- Landing page: `https://{username}.github.io/procedural-chaos/`
- Mandala Studio: `https://{username}.github.io/procedural-chaos/#/mandala`
- Video Studio: `https://{username}.github.io/procedural-chaos/#/video`
- Library: `https://{username}.github.io/procedural-chaos/#/library`

Neither `.nojekyll` nor the Vite base setting fixes history-based routing; hash routing is a separate requirement.

### 3.2 Phase 0: Hello Procedural Chaos test screen

The first deployable slice proves the build pipeline, shadcn styling, Tailwind classes, React interaction, and GitHub Pages navigation before any engine work.

Initialize shadcn with the **Radix** base (the `Button asChild` API below uses that base), then generate `button`, `card`, and `badge` as described in [Phase 0](./PLAN.md#01-scaffold-and-configure). In `index.html`, set `<html lang="en" class="dark">` and `<title>Procedural Chaos</title>`.

An initial `src/App.tsx` can be:

```tsx
import { useState } from 'react';
import { HashRouter, Link, Route, Routes } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function TestScreen({ title }: { title: string }) {
  const [clicks, setClicks] = useState(0);

  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <Card className="w-full max-w-xl rounded-xl border-border shadow-lg">
        <CardHeader className="gap-3">
          <Badge variant="secondary">Phase 0</Badge>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription>
            Two independent creative studios. Everything runs in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <nav aria-label="Studios" className="flex flex-wrap gap-3">
            <Button asChild><Link to="/mandala">Mandala Studio</Link></Button>
            <Button asChild variant="outline"><Link to="/video">Video Studio</Link></Button>
            <Button asChild variant="ghost"><Link to="/library">Library</Link></Button>
          </nav>
          <Button variant="secondary" onClick={() => setClicks((count) => count + 1)}>
            Test interaction: {clicks}
          </Button>
          <Link to="/" className="text-sm text-muted-foreground underline underline-offset-4">
            Back to hello screen
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<TestScreen title="Hello Procedural Chaos" />} />
        <Route path="/mandala" element={<TestScreen title="Mandala Studio — coming soon" />} />
        <Route path="/video" element={<TestScreen title="Video Studio — coming soon" />} />
        <Route path="/library" element={<TestScreen title="Library — coming soon" />} />
        <Route path="*" element={<TestScreen title="Page not found" />} />
      </Routes>
    </HashRouter>
  );
}
```

These are temporary studio placeholders; later phases replace their content while preserving the shell and route URLs.

Use the Vite React TypeScript template's npm scripts:

| Command | Purpose |
| --- | --- |
| `npm install` | Initial local installation; commit the resulting lockfile |
| `npm ci` | Reproducible installation from the lockfile |
| `npm run dev` | Development server |
| `npm run lint` | ESLint checks |
| `npm run build` | Type-check and build (`tsc -b && vite build`) |
| `npm run preview` | Local production-build preview, not a deployment server |
| `npm test` | Run the foundation tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run format` / `npm run format:check` | Format or check application/configuration files with Prettier |
| `npm run deploy` | Lint, test, build, and publish the static app with `gh-pages` |

Later in Phase 0, add the Vitest script and foundation tests. The hello deployment does not need to wait for the generation or video engines.

### 3.3 GitHub Pages deployment

Use the `gh-pages` npm package, not a custom GitHub Actions deployment workflow. Add `.nvmrc` containing `24` and commit `package-lock.json`. Keep `dist/` and `node_modules/` ignored in the source tree.

Install the deployment dependency:

```bash
npm install -D gh-pages
```

Include these scripts in `package.json`:

```json
{
  "scripts": {
    "predeploy": "npm run lint && npm test && npm run build",
    "deploy": "gh-pages -d dist --dotfiles"
  }
}
```

Run `npm run deploy` from the repository root. npm runs the `predeploy` hook first; `gh-pages` then commits the build output and pushes it to the `gh-pages` branch using the configured `origin` remote and Git credentials. `--dotfiles` is required to publish `dist/.nojekyll`.

After the first push, set the repository's **Settings → Pages → Build and deployment → Source: Deploy from a branch**, selecting **gh-pages** and **/(root)**. This serves the generated files from the branch root; do not select `/docs`.

The current remote is `keycache/procedural-chaos`, giving the URL `https://keycache.github.io/procedural-chaos/`. Publishing does not commit the source files on `main`. Source commits and deployments remain separate, and subsequent releases use the same `npm run deploy` command. No custom deployment token is needed beyond Git access to the repository.

Deployment acceptance checks:

1. `npm run deploy` succeeds, and `.nojekyll` is present at the root of the remote `gh-pages` branch.
2. `https://{username}.github.io/procedural-chaos/` displays **Hello Procedural Chaos** with the dark shadcn/Tailwind styling.
3. JavaScript and CSS load from `/procedural-chaos/` without 404 errors.
4. The counter responds to clicks, and navigation/refresh works at `#/mandala`, `#/video`, and `#/library`.
5. Subsequent `npm run deploy` executions update the hosted static app; pushing source to `main` alone does not publish it.

### 3.4 Implemented foundation

- The landing page contains the greeting, studio navigation, click counter, a deterministic worker test, and a locally saved test seed.
- Both studios have independent Zustand seed state and placeholder settings panels. A static SVG study exercises the shared zoom/pan preview; it is explicitly labeled as not generated output.
- The Library page reads actual counts from IndexedDB. Its `mandalas`, `artworks`, and `videoProjects` stores are initially empty; the `settings` store holds the smoke-test seed.
- Shared modules provide seeded randomness, rotation/reflection helpers, OKLCH shade adjustment, Zod recipe-envelope validation, IndexedDB initialization, and a typed Comlink worker.
- Browser capability warnings identify unavailable Workers, IndexedDB, OffscreenCanvas, WebCodecs, or HTTPS. Future video export must still check the specific encoder configuration.
- Disabled save/export/playback controls explain that their features arrive in later phases.

Setup references: [Vite GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages) and [shadcn/ui for Vite](https://ui.shadcn.com/docs/installation/vite).

---

## 4. Part 1 — Mandala Studio

### 4.1 Goal

Generate intricate, coloring-ready mandala line art from parameters and a seed. Support all four styles (traditional, geometric, organic, abstract) and hybrid blends from the first version.

### 4.2 Recipe model

A mandala is fully described by a versioned recipe. The following is the target model for the complete generator; the implemented subset is described in [4.8](#48-implemented-geometry-core) and [4.9](#49-implemented-styles-and-hybrid-compositions).

```ts
type MandalaRecipe = {
  schemaVersion: 1;
  engineVersion: string;
  seed: string;
  canvas: { size: number };               // logical units; square
  style: StyleBlend;                      // e.g. { traditional: 0.7, geometric: 0.3 }
  structure: {
    baseGeometry: 'circle' | 'polygon' | 'star' | 'spiral' | 'freeform';
    polygonSides?: number;
    symmetryOrder: number;                // 1–48
    symmetryType: 'rotational' | 'dihedral' | 'bilateral' | 'none';
    centers: number;                      // 1–4; abstract favors multiple centers
    brokenSymmetry: number;               // 0–1; explicit opt-in elsewhere
  };
  global: {
    complexity: number;                   // 0–1
    density: number;                      // 0–1
    negativeSpace: number;                // 0–1
    irregularity: number;                 // 0–1, controlled imperfection
    strokeWidth: number;
  };
  layers: LayerRecipe[];
};

type LayerRecipe = {
  id: string;
  enabled: boolean;
  distribution: 'ring' | 'grid' | 'spiral' | 'branching' | 'tessellation' | 'scatter';
  motif: MotifId;                         // petal, leaf, teardrop, arc, polygon, star, dot, spiral, branch...
  innerRadius: number;                    // 0–1 of canvas radius
  outerRadius: number;
  count: number;                          // repetitions (snapped to the symmetry order when symmetric)
  scale: number;
  rotationOffset: number;
  twist: number;
  recursionDepth: number;
  scaling: number;                        // recursive size multiplier
  distortion: number;
  noise: number;
  ornament: number;
  strokeScale: number;
  motifParams: Record<string, number>;    // width, curvature, point count, detail...
  seedOffset: number;
};
```

### 4.3 Generation pipeline

```text
Style options → style resolver → layer planner → validated recipe
             → motif generators + distributions → canonical transformations
             → symmetry expansion → optional symmetry breaking
             → boundary/closure pass → geometry model → SVG/Canvas renderers
```

1. **Style resolver:** converts the style blend into default biases (for example, traditional favors rings and petals; geometric favors polygons and exact spacing; organic favors branching and irregularity; abstract allows multiple centers and broken symmetry). Explicit user settings always override biases.
2. **Layer planner:** creates or adjusts layers when a preset or randomization requests them.
3. **Motif generators:** pure functions `(params, rng) → Path[]` that build one sector or element.
4. **Transformations:** nested scaling, twist, controlled noise, and distortion act on the canonical template before expansion, so exact symmetry is preserved unless explicitly broken.
5. **Symmetry expansion:** applies rotations, `θk = 2πk / N`, and mirrors for dihedral symmetry. An explicit broken-symmetry setting then perturbs orbit angles reproducibly.
6. **Closure pass:** closes each styled subpath, snaps near-coincident endpoints, and rejects nonfinite coordinates. Closed separators distinguish adjacent bands. Motifs are independently closed rather than requiring contact with every separator; this does not perform general Boolean intersection cleanup or guarantee a minimum-sized region.

All randomness comes from a seeded PRNG derived from `seed + layer.seedOffset`, so changing one layer does not reshuffle others.

### 4.4 Geometry model

```ts
type GeometryModel = {
  size: number;
  center: { x: number; y: number };
  centers?: Array<{ x: number; y: number }>;
  symmetry: { order: number; type: SymmetryType; mirrorAngle?: number };
  paths: Array<{ id: string; layerId: string; d: PathCommand[]; strokeWidth: number; drawOrder: number }>;
};
```

`drawOrder` is used by Part 2’s animated line drawing.

### 4.5 Rendering

- **SVG renderer:** generates an SVG string directly from the geometry model without one React component per shape. Used for the preview and exports.
- **Canvas renderer:** optional fast preview for very dense mandalas or while a slider is being dragged.
- Generation and SVG serialization run in a module worker after a 200 ms debounce. Each obsolete request is aborted/terminated and its result is rejected; no stale image is presented as current output.

### 4.6 Controls

- **Presets:** curated recipes for each style and several hybrids.
- **Seed:** text field, randomize button, and seed history for undo.
- **Global settings:** style blend, base geometry, symmetry, complexity, density, negative space, irregularity, and stroke width.
- **Layers:** add, remove, duplicate, reorder, enable/disable, and edit per-layer settings.
- Undo/redo for recipe changes.

### 4.7 Outputs

| Output | Details |
| --- | --- |
| SVG | Black line art on white or transparent background. Includes a `<metadata>` block containing the recipe, center, symmetry order/type, and path draw order. |
| PNG | Rendered at a chosen size (1024–8192 px), transparent or white background. |
| JSON recipe | Exact recipe to reproduce the mandala. |

Colored static output is planned for a later phase. The first version produces line art.

### 4.8 Implemented geometry core

The engine in `src/engines/mandala/` is framework-free:

- `recipe.ts`: Zod schema, inferred recipe/types, and `createStarterRecipe`.
- `geometry.ts`: move, line, cubic Bezier, and close-path commands; geometry model and point mapping.
- `motifs.ts`: petal, arc, dot, polygon, star, teardrop, leaf, closed spiral ribbon, branch foliage, and interlocking polygons.
- `symmetry.ts`: rotation and vertical reflection of endpoints **and** Bezier control points.
- `boundaries.ts`: closed ring separator contours and organizing shapes.
- `generate.ts`: deterministic placement, ornamentation, transformations, symmetry expansion, and multiple-center composition.
- `svg.ts`: SVG with stable coordinate precision, path IDs, layer IDs, and draw order. Band-based drawings remain black/unfilled; the opt-in floral family adds solid ink accents and foreground masks (4.11).

The current strict recipe accepts:

- `schemaVersion: 1`, `engineVersion: "0.2.0"`, seed, and a square canvas of 128-4096 units. Older engine-version recipes are rejected explicitly; project import/migrations do not exist yet.
- Optional style blend with four finite 0-1 weights and at least one positive value.
- Optional versioned bold-floral composition (4.11). Recipes without it retain their existing band-based generation and SVG serialization.
- Structure: all five base geometries, polygon sides (3-24), symmetry type/order (1-48), one to four centers, and 0-1 broken symmetry.
- Global stroke width, irregularity, density (0-1, default 0.5), and negative space (0-1, default 0). The additional fields have neutral defaults for older recipes from this engine version.
- Up to 12 layers using ring, grid, spiral, branching, tessellation, or scatter, with ID, enabled flag, motif, inner/outer radii, count, scale, rotation offset, width/curvature/point parameters, and seed offset.
- Layer recursion depth (0-3), recursive scaling (0.35-0.8), twist (radians), distortion/noise/ornament (0-1), and stroke multiplier (0.4-2). Neutral defaults preserve the simple starter recipe.

Unsupported versions or unknown fields are rejected rather than ignored. Enabled layers must have ordered, non-overlapping radial bounds and unique IDs; invalid recipes throw Zod errors. The UI displays validation errors instead of retaining stale artwork.

Generation rules:

- The starter recipe uses six rings and a 1000-unit canvas. Per-layer random streams derive from the seed, layer ID, and seed offset, so changing one layer does not reshuffle another.
- Rotational symmetry repeats a sector N times. Dihedral symmetry uses N rotations plus their reflections; bilateral symmetry uses one vertical reflection; no symmetry generates independent placements. Bilateral and no-symmetry recipes have rotational order 1.
- Ring/spiral/scatter counts round **up** to complete symmetry orbits (multiples of N, 2N, 2, or 1 respectively). Grid/tessellation use count as a density hint and fit cell rows to sector width, clipping placements to the annular band; branching uses a bounded binary tree per sector. Mirror templates sit inside their half-sector rather than on an axis, avoiding duplicate copies on the axis.
- Mirror-symmetric layers currently require zero rotation offset to preserve the shared vertical mirror axis.
- Polygon side/star point counts round up to a multiple of N in radial modes so separator boundaries share the motifs' symmetry.
- Circle, polygon, star, and seeded freeform separator contours are sampled as closed polylines, using at least 192 samples and a sample count divisible by N. This is a lightweight geometry-core approximation, not an exact analytic curve representation.
- Spiral organizing geometry keeps closed circular separators and adds Archimedean spiral guides within each ring, expanded by the same symmetry operations. The independent spiral distribution advances placements radially and angularly within each sector.
- The legacy `createStarterRecipe` keeps decorative arcs and spiral guides open. Band-style-planned recipes close every subpath, including those decorations, with chords where necessary. Floral drawing roles intentionally preserve open decorative strokes.
- Shared ring boundaries are emitted once. Geometry IDs and draw order are stable for a given recipe.

The Mandala Studio renders the worker-generated SVG as an image on a white canvas, with style/blend, complexity, geometry, placement, growth, appearance, and layer controls plus zoom/pan. The preview stays sticky alongside desktop settings; narrow layouts remain stacked. Save/export and the local Library are implemented as described in 4.10. The Video Studio retains its static placeholder and independent state.

Example:

```ts
import { createStarterRecipe } from './src/engines/mandala/recipe';
import { generateMandala } from './src/engines/mandala/generate';
import { renderSvg } from './src/engines/mandala/svg';

const recipe = createStarterRecipe('lotus-001', 'circle', 'rotational', 12);
const geometry = generateMandala(recipe);
const svg = renderSvg(geometry);
```

### 4.9 Implemented styles and hybrid compositions

Additional framework-free modules:

- `styles.ts`: validated style options, blend normalization, weighted numeric biases, seeded motif/distribution selection, and a band planner.
- `distribution.ts`: ring placement, Cartesian grid, staggered hexagonal cells, spiral progression, bounded binary branching, and seeded polar scatter within radial bands.
- `transforms.ts`: recursive inset scaling/twist, smooth positional distortion/noise, and subpath closure.

Style defaults:

| Style | Composition |
| --- | --- |
| Traditional | Eight-fold rotation, circular bands, petals/teardrops/leaves, nested outlines, veins, and bead borders. |
| Geometric | Six-fold rotation, stars/polygons/interlocking forms, ring/grid/tessellation placement, and precise spacing. |
| Organic | Six-fold rotation with freeform boundaries, leaves/branches/spiral ribbons, branching/spiral/ring placement, and smooth controlled irregularity. |
| Abstract | No enforced symmetry, freeform boundaries, three centers, mixed spiral/grid/scatter/ring placement, and deliberate perturbation. |

These are biases, not restrictions. Explicit base geometry, symmetry/order, distribution, centers, recursion, twist, noise, distortion, and broken symmetry always override suggestions. The UI uses **Style guided** to remove individual structure overrides; **Restore style defaults** clears all overrides but keeps complexity and a valid blend. Selecting a different style also clears overrides while retaining seed/complexity. Hybrid begins at 70% traditional / 30% geometric; an all-zero blend is an error with an explicit recovery action.

Blend weights normalize before planning. Continuous properties (irregularity, ornament, recursion tendency, twist, distortion, noise) are weighted averages. Seeded weighted choices select categorical motifs/distributions per band; these need not exactly match the numeric percentages in a small number of bands. The highest-weight style chooses discrete base geometry, symmetry order/type, default center count, and polygon point defaults; ties follow traditional/geometric/organic/abstract order.

Complexity is a planner input rather than a stored global recipe field: it creates 3-5 broad bands alternating with narrow borders (6-10 layers total), determines recursion tendency, and increases repetitions in detailed outer bands. Radii occupy 0.035-0.9 of the canvas radius with varying widths. Border distributions remain rings when a user overrides main-band distribution/recursion. Ornamental ring contours follow the annulus for broader, less stamp-like compositions; nested outlines and closed vein ribbons use finer strokes.

Recursion adds scaled inset outlines around a motif's midpoint. The planner multiplier is 0.62 (editable per layer); the signed global UI twist range is -1 to 1, applied as `twist × depth × 0.35` radians. Twist therefore needs a nonzero recursion depth to be visible. Branching also uses depth to grow a binary placement tree, capped at three branching levels. Noise/distortion transform endpoints and Bezier controls coherently before symmetry expansion. Independent random streams derive from seed/layer ID/offset and, for multiple centers, center index.

Several centers place scaled rosettes at deterministic offsets. `GeometryModel.symmetry` reports `none`, order 1, when multiple centers or deliberate perturbation make a global symmetry claim unsafe; local rosettes still use the chosen expansion. Stroke widths scale with the rosettes. A 24,000-path hard limit throws a visible error instead of truncating or silently falling back.

Styled subpaths are closed and individually suitable for enclosing coloring regions. Intersections, overlaps between rosettes, tiny details, and uneven region sizes are intentional rough edges; this is not a Boolean polygon solver. Raster region detection, minimum-area filtering, and corrections remain in Part 2. Automated checks cover reproducibility, normalization, overrides, all distributions, exact dihedral symmetry after transformations, closure, finite/bounded default output, recursion limits, excessive-scene errors, and editor recovery.

### 4.10 Implemented editor, outputs, and local projects

The editor uses an explicit document containing name, seed, style/blend, planner options, global appearance overrides, and optional custom layers. `editorRecipe` materializes and validates a complete engine recipe. Presets cover traditional, geometric, organic, abstract, 70/30 traditional/geometric, and 45/55 geometric/organic compositions.

- **History:** up to 100 immutable edit snapshots with undo/redo; a new edit clears the redo branch. The 12 most recent successful seeds are deduplicated and reusable. These histories are in-memory, not persisted across refreshes.
- **Layer editing:** ID, radial order, and independent seed streams are preserved. Add/duplicate use unique IDs; add/remove distribute widths across radii 0.035-0.9 with a 0.02 minimum. Reordering exchanges layer contents between existing radial slots. Direct radial edits remain strictly validated (ordered/non-overlapping). Invalid edits retain their controls and offer undo/reset.
- **Replanning:** style, blend, complexity, structure, and global growth options replace custom layers; the UI explains this and undo can recover them. Appearance overrides preserve layers.
- **Density:** effective requested count is `round(layer.count × (0.5 + density))`, limited to 1-192 before distribution/orbit rounding. Branching retains its depth-driven placement tree. Negative space scales motif dimensions by `1 - 0.65 × negativeSpace`; it does not move separator boundaries. Stroke width and irregularity are independent overrides.
- **Worker lifecycle:** each settled recipe starts a typed Comlink module worker after 200 ms; changes cancel the timer or terminate its worker. Request keys plus abort guards prevent obsolete completion from replacing current state. Success, failure, cancellation, and a 15-second timeout release/terminate the worker. Pending/error states disable save/export rather than exporting a previous image.
- **Preview:** SVG is generated as a string off-thread and displayed in an image, not one React element per path. There is no separate Canvas preview renderer because the bounded SVG preview is sufficient here. The geometry path limit remains 24,000.
- **SVG:** XML-safe JSON metadata embeds the complete engine recipe, center(s), and effective global symmetry; paths retain `id`, `data-layer`, and `data-draw-order`. White/transparent backgrounds are selectable. Exact metadata can be used by the future Video Studio.
- **PNG:** asynchronous image decoding and Canvas 2D encoding produce square files at the selected 1024/2048/4096/8192 resolution. Transparent/white backgrounds are explicit; object URLs and canvas backing memory are released after export. Unsupported contexts/encoding failures surface errors.
- **JSON:** a validated, pretty-printed engine recipe, including engine/schema versions, complete layers, and globals. It reproduces geometry exactly, but is not an editor-history archive. JSON import remains a future UI enhancement.
- **Persistence:** the existing IndexedDB `mandalas` store holds ID/name/timestamps and a version-1 payload containing validated editor document, exact materialized recipe, and preview SVG. The document/recipe pair must agree. Save updates a loaded/saved ID while preserving creation time; Save a copy creates another ID. Unsaved edits are not auto-persisted.
- **Library:** saved mandala thumbnails, names, seeds, and timestamps with explicit reopen actions. Reopen validates data, restores the document/ID, clears undo/redo, and regenerates off-thread. Unsupported/corrupt data and storage failures are reported, not silently skipped. Imported-artwork/video-project counts remain placeholders.

Validation includes preset distinctness, undo/redo round trips, structural versus appearance changes, layer operations, metadata escaping, recipe reproduction, worker cancellation/crash/timeout cleanup, and persistence across connections. Browser checks additionally verify exact SVG after Library refresh/reopen, real exported SVG/JSON contents, PNG dimensions/transparency, and last-edit-wins generation.

### 4.11 Implemented bold-floral composition

**Floral flourish** is an additional opt-in preset, exposed as **bold-floral** in the style selector. It is a separate art-directed composition, not a fifth blend weight. The four existing style weights and their hybrid behavior are unchanged.

- **Recipe:** retains schema version 1 and engine version `0.2.0` with additive optional `composition: { family: "bold-floral", version: 1, complexity: number }`. Complexity is stored explicitly in the engine recipe (0-1). The family requires empty `layers`, one freeform center, rotational symmetry at 6/8/10/12 divisions, no broken symmetry, and neutral density/negative-space/irregularity. Stroke width remains configurable. Unsupported family versions and incompatible ring/structure settings are errors.
- **Editor:** the document's mode is `bold-floral`; complexity and optional symmetry order materialize the complete composition recipe. The traditional blend is a compatibility descriptor, not a way to mix composition planners. Switching modes resets structural/global overrides and custom layers using the existing undoable action. Ring/layer, hybrid, distribution, and growth controls are replaced with floral divisions and stroke width. Existing seed, preset matching, history, saving, and export controls still apply.
- **Geometry:** `bold-floral.ts` constructs whole cubic-Bezier crown silhouettes crossing radial bands, large nested leaves with contour-aligned border hatching, paired spiral tendrils, two interleaved central petal crowns, and tapered black accents. No circular separator boundaries are added. Seeded fullness, crown/leaf height, leaf-tip bend, and curl turns vary coherently across rotational copies; widths adapt to sector count.
- **Detail budget:** fixed divisions and bounded ornament counts keep the family below 1,500 drawing paths at maximum detail. Complexity changes beads/hatches and optional fine outlines/curls while preserving primary silhouettes. Coordinates use a 0.465-canvas-size radius; strokes scale from a 1000-unit design, defaulting to 2.5 units for primary contours with relative bold/fine weights.
- **Drawing roles:** new geometry paths carry `region-boundary`, `decoration`, or `solid-accent` roles. Region boundaries and solid accents are closed; decorative curls/veins/hatches may remain open. Roles and foreground flags export as `data-role` and `data-occludes`; metadata declares the roles and occlusion strategy. Existing paths do not acquire new attributes, preserving legacy serialization.
- **Occlusion:** contiguous drawing groups render back-to-front. Each rear group has an SVG luminance mask subtracting later groups' closed foreground silhouettes. This removes covered rear outlines and decoration rather than painting foreground interiors white. Only solid accents use black fills. This prototype does not Boolean-flatten geometry or solve arbitrary overlaps within a group.
- **Outputs/persistence:** SVG masks remain in vector exports and are rasterized by the browser for PNG. Transparent exports retain transparency inside otherwise unpainted petals. Complete composition recipes round-trip through JSON and validated IndexedDB project payloads; older band-based documents/recipes need no migration.

Geometry checks cover deterministic output, seeded variation, rotational copies, finite/in-canvas coordinates, bounded detail, role-specific closure, mask references, and unsupported settings. Editor/output checks cover family switching with undo, preset identification, exact recipe reproduction, and save/reopen. The user-facing visual checks are in Phase 3.1 of the plan. General-purpose shape-aware decoration, ornate lotus crowns, and swirling paisley planning remain Phases 3.2–3.4; Part 2 region detection is not implemented. Drawing roles and closed contours alone are not a guarantee of correct raster coloring regions.

---

## 5. Part 2 — Video Studio

### 5.1 Goal

Import an illustration, detect fillable regions and symmetry, configure how coloring happens, preview it, and export a deterministic MP4 video.

### 5.2 Workflow

```text
Import → Prepare regions → Configure video → Preview → Export MP4
```

### 5.3 Import

- Formats: SVG, PNG, JPG, and WebP. Part 1 SVGs are imported the same way.
- Input is rasterized onto a square working canvas (default 2160 px; 1080–4096 px is configurable). Non-square art is centered.
- If SVG metadata from Part 1 is present, its symmetry data and path draw order are used.
- Vector paths are kept only for SVG input and only for animated line drawing.

### 5.4 Region detection (runs in a worker)

1. Convert to grayscale and threshold to create a line mask (threshold slider; optional automatic threshold).
2. Optionally invert input with light lines on a dark background.
3. Close gaps by dilating the line mask by `gapRadius` pixels to prevent leaks.
4. Label connected non-line pixels with 4-connectivity.
5. Treat components touching the image border as background (can be toggled per region).
6. Discard regions smaller than `minArea`, merging them into the line layer.
7. Restore region masks under dilated lines so fills reach the original stroke.
8. Calculate area, centroid, bounding box, mean radius/angle from the center, and an adjacency graph.

Output:

```ts
type PreparedArtwork = {
  id: string;
  sourceHash: string;
  size: number;
  labels: Uint32Array;                 // per-pixel region id (0 = line/background)
  lineArt: ImageBitmap | Blob;         // original line layer for compositing
  regions: RegionInfo[];               // area, centroid, bbox, polar position, neighbors, excluded
  symmetry: SymmetryInfo;
  vectorPaths?: VectorPath[];          // SVG input only
  detectionSettings: DetectionSettings;
};
```

Prepared artwork is cached in IndexedDB so one illustration can produce many videos.

### 5.5 Manual region tools

- **Merge:** select regions and combine them.
- **Split:** draw a line that acts as a new boundary, then relabel.
- **Exclude/include:** a region is never filled or is restored.
- **Mark background:** show or hide the outer background region.
- **Fix symmetry:** reassign a region to a different symmetry group or remove it from one.
- Overlay modes: random-color region view, outlines, region IDs, and symmetry-group colors.

### 5.6 Symmetry detection

Supports radial (rotational, optionally with mirrors) and left/right mirror symmetry.

1. **Center:** Part 1 metadata, otherwise the line-mask centroid refined by a local search; user can drag to override.
2. **Radial order N:** compare the line mask with rotated copies for candidate N values (2–48) and choose the strongest match. User can override.
3. **Mirror axis:** search angles for the best reflected match. Vertical is the default for illustrations such as front-facing animals.
4. **Grouping:** transform each region’s centroid by each symmetry operation, choose candidates nearby, and confirm with area similarity and transformed-mask IoU. Matching regions become one **symmetry group** (orbit). Unmatched regions are singleton groups.

```ts
type SymmetryInfo = {
  center: { x: number; y: number };
  rotationalOrder: number;               // 1 = none
  mirrorAxes: number[];                  // angles in radians
  groups: Array<{ id: string; regionIds: number[]; confidence: number }>;
};
```

### 5.7 Video recipe

Coloring is configured through independent, combinable dimensions.

```ts
type VideoRecipe = {
  schemaVersion: 1;
  seed: string;
  artworkId: string;
  output: { width: 1080; height: 1080; fps: 30; background: string };
  grouping: 'region' | 'symmetryGroup';
  groupPlayback: 'simultaneous' | 'sequentialAround' | 'onePauseThenRest';
  ordering: OrderingStrategy;
  color: ColorRecipe;
  animation: AnimationRecipe;
  structure: RevealStructure;
  timing: {
    targetDuration?: number;             // seconds; otherwise derived from per-fill timing
    fillDuration: number;
    gap: number;
    jitter: number;                      // 0–1 random timing variation
    speedRamp: 'none' | 'accelerate' | 'decelerate' | 'easeInOut';
    introHold: number;
    outroHold: number;
  };
};
```

#### Ordering strategies

| Strategy | Rule |
| --- | --- |
| Random | Seeded shuffle |
| Smallest first / largest first | Sort by area |
| Center outward / outside inward | Sort by distance from symmetry center |
| Spiral | Sort by radius plus angle progression |
| Wave/sweep | Sort by projection on a direction, with optional sinusoidal offset |
| Farthest jump | Next unit is farthest from the previous one, with a seeded start |
| One color at a time | Assign colors first, then fill all units of each color in turn |

When `grouping = symmetryGroup`, ordering applies to groups and uses the group’s centroid and total area.

#### Color assignment

```ts
type ColorRecipe = {
  palette: string[];                     // preset or custom
  assignment: 'random' | 'byRing' | 'byGroup' | 'gradientByRadius' | 'gradientByOrder';
  symmetryMode: 'exact' | 'sameFamilyShades' | 'complementary' | 'independent';
  neighborAware: boolean;                // avoid identical or too-similar adjacent colors
  minNeighborContrast: number;           // OKLCH deltaE
  accentChance: number;                  // 0–1 controlled contrasting exceptions
};
```

- Shade variations are created in OKLCH by adjusting lightness and chroma within the color family.
- Neighbor-aware assignment uses greedy graph coloring over the adjacency graph with seeded tie-breaking.
- Palette tools: curated presets and a custom palette editor.

#### Animations and reveal structures

| Fill animation | Implementation notes |
| --- | --- |
| Instant | Region appears in one frame |
| Fade in | Alpha changes from 0 to 1 over `fillDuration` |
| Spread from a point | Precomputed BFS distance within the region from a seeded seed pixel; pixels appear as distance passes a threshold |
| Directional wipe | Projection along a seeded or configured angle |

| Reveal structure | Behavior |
| --- | --- |
| Outline first | Line art is visible, or drawn first, before coloring |
| Color first, outline last | Fills appear without line art, followed by a final outline reveal |
| Animated line drawing | Stroke-dash animation using vector paths in `drawOrder`; available only for SVG/generated art and otherwise disabled with an explanation |

### 5.8 Timeline and renderer

- **Scheduler:** creates a deterministic sorted event list from the prepared artwork and video recipe.

  ```ts
  type FillEvent = { regionIds: number[]; color: string; start: number; duration: number; animation: FillAnimation; origin?: Point };
  ```

- **Renderer:** draws a frame at time `t` from the event list.
  - Completed fills are baked into an accumulated fill canvas, so each frame draws only active fills.
  - Region pixel spans and bounding boxes are cached for quick drawing.
  - Layer order: background → fills → line art (opacity follows the reveal structure).
- Preview uses the same renderer through `requestAnimationFrame`; seeking rebuilds the accumulated canvas from the event list.
- Preview runs on a reduced-size canvas when needed; export always renders at full resolution.

### 5.9 Video export

- Runs in a worker using `OffscreenCanvas`.
- Renders every frame deterministically (no real-time capture), creates a `VideoFrame` with an exact timestamp, encodes with `VideoEncoder` using H.264, and muxes to MP4 with Mediabunny.
- Initial output: 1080×1080, 30 fps, adjustable bitrate (default about 6 Mbps).
- Checks `VideoEncoder.isConfigSupported` before rendering and shows a clear error if unsupported.
- Shows progress, estimated time remaining, and cancel. Output is downloaded as a Blob.
- Initial target is videos up to about 10 minutes. Longer videos may work but are not optimized.

---

## 6. Persistence

IndexedDB database `procedural-chaos`:

| Store | Contents |
| --- | --- |
| `mandalas` | Mandala recipe, thumbnail, timestamps |
| `artworks` | Source file, prepared artwork, detection settings, thumbnail |
| `videoProjects` | Video recipe, artwork reference, thumbnail |
| `settings` | UI preferences |

- The Library page lists saved items, opens them, and lets users rename, duplicate, or delete them.
- JSON export/import for mandala recipes and video projects. Video project exports may include the source image so they remain portable.
- Every stored or exported document has a `schemaVersion`; Zod validates imports, and simple migration functions handle version changes.

---

## 7. Performance targets (approximate)

| Operation | Target |
| --- | --- |
| Mandala regeneration after a settings change | Under 300 ms for typical settings |
| Region detection at 2160 px | Under 3 seconds |
| Preview playback | Smooth at preview resolution with about 2,000 regions |
| Export | Faster than real time on a recent desktop for 1080×1080 at 30 fps |

These are guidelines, not hard requirements.

---

## 8. Testing

- Vitest for deterministic engine behavior: PRNG reproducibility, symmetry transforms, motif closure, region labeling on fixtures, symmetry grouping, ordering strategies, color constraints, and scheduler output.
- Snapshot SVG output for a few fixed recipes and seeds.
- Small fixture images (clean, gapped, and noisy line art) for region detection.
- Manual testing for UI and video export in Chrome.

---

## 9. Later-phase features

| Feature | Notes |
| --- | --- |
| Colored static mandalas (Part 1) | Reuse Part 2 color assignment on generated line art |
| Audio | Synchronized fill sound effects through `OfflineAudioContext`, optional user music, AAC/Opus audio track in MP4 |
| Text hooks/CTA overlays | Timed text layers (for example, “Can you guess what this is?”) with simple styling |
| Batch variations | Render multiple seeds or strategies from one artwork as a queue |
| Side-by-side comparison | Same artwork and palette, different strategies, rendered in a split layout |
| Camera zoom/pan | Keyframed zoom and pan, or follow the active region; may require higher working resolution |
| Thumbnail export | Export a chosen frame, usually the final frame, as PNG |
