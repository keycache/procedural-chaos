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

A mandala is fully described by a versioned recipe. The following is the target model for the complete generator; the implemented Phase 1 subset is described in [4.8](#48-implemented-phase-1-geometry-core).

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
    centers: number;                      // >1 only for abstract styles
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
  motifParams: Record<string, number>;    // width, curvature, point count, detail...
  seedOffset: number;
};
```

### 4.3 Generation pipeline

```text
Recipe → style resolver → layer planner → motif generators → symmetry expansion
       → transformations → boundary/closure pass → geometry model → SVG/Canvas renderers
```

1. **Style resolver:** converts the style blend into default biases (for example, traditional favors rings and petals; geometric favors polygons and exact spacing; organic favors branching and irregularity; abstract allows multiple centers and broken symmetry). Explicit user settings always override biases.
2. **Layer planner:** creates or adjusts layers when a preset or randomization requests them.
3. **Motif generators:** pure functions `(params, rng) → Path[]` that build one sector or element.
4. **Symmetry expansion:** applies rotations, `θk = 2πk / N`, and mirrors for dihedral symmetry.
5. **Transformations:** recursion, scaling, twist, controlled noise, and distortion.
6. **Closure pass:** ensures the line art produces closed, fillable regions. Each layer has separator rings or boundary polygons between neighboring layers, and motifs are anchored to those boundaries so strokes meet instead of leaving gaps.

All randomness comes from a seeded PRNG derived from `seed + layer.seedOffset`, so changing one layer does not reshuffle others.

### 4.4 Geometry model

```ts
type GeometryModel = {
  size: number;
  center: { x: number; y: number };
  symmetry: { order: number; type: SymmetryType; mirrorAngle?: number };
  paths: Array<{ id: string; layerId: string; d: PathCommand[]; strokeWidth: number; drawOrder: number }>;
};
```

`drawOrder` is used by Part 2’s animated line drawing.

### 4.5 Rendering

- **SVG renderer:** generates an SVG string directly from the geometry model without one React component per shape. Used for the preview and exports.
- **Canvas renderer:** optional fast preview for very dense mandalas or while a slider is being dragged.
- Generation runs in a worker. Slider changes are debounced, and stale results are discarded.

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

### 4.8 Implemented Phase 1 geometry core

The engine in `src/engines/mandala/` is framework-free:

- `recipe.ts`: Zod schema, inferred recipe/types, and `createStarterRecipe`.
- `geometry.ts`: move, line, cubic Bezier, and close-path commands; geometry model and point mapping.
- `motifs.ts`: petal, arc, dot, polygon, star, and teardrop construction.
- `symmetry.ts`: rotation and vertical reflection of endpoints **and** Bezier control points.
- `boundaries.ts`: closed ring separator contours and organizing shapes.
- `generate.ts`: deterministic ring placement and symmetry expansion.
- `svg.ts`: black, unfilled SVG line art with stable coordinate precision, path IDs, layer IDs, and draw order.

The current strict recipe accepts:

- `schemaVersion: 1`, `engineVersion: "0.1.0"`, seed, and a square canvas of 128-4096 units.
- Structure: all five base geometries, polygon sides (3-24), symmetry type/order (1-48), and exactly one center.
- Global stroke width and irregularity.
- Up to 12 layers using **ring distribution only**, with ID, enabled flag, motif, inner/outer radii, count, scale, rotation offset, width/curvature/point parameters, and seed offset.

Unsupported versions or later-phase fields are rejected rather than ignored. Enabled layers must be ordered, non-overlapping rings with unique IDs; invalid recipes throw Zod errors. The UI displays validation errors instead of retaining stale artwork.

Generation rules:

- The starter recipe uses six rings and a 1000-unit canvas. Per-layer random streams derive from the seed, layer ID, and seed offset, so changing one layer does not reshuffle another.
- Rotational symmetry repeats a sector N times. Dihedral symmetry uses N rotations plus their reflections; bilateral symmetry uses one vertical reflection; no symmetry generates independent placements. Bilateral and no-symmetry recipes have rotational order 1.
- Requested motif counts round **up** to complete symmetry orbits (multiples of N, 2N, 2, or 1 respectively). Mirror templates sit inside their half-sector rather than on an axis, avoiding duplicate copies on the axis.
- Mirror-symmetric layers currently require zero rotation offset to preserve the shared vertical mirror axis.
- Polygon side/star point counts round up to a multiple of N in radial modes so separator boundaries share the motifs' symmetry.
- Circle, polygon, star, and seeded freeform separator contours are sampled as closed polylines, using at least 192 samples and a sample count divisible by N. This is a lightweight geometry-core approximation, not an exact analytic curve representation.
- Spiral organizing geometry keeps closed circular separators and adds Archimedean spiral guides within each ring, expanded by the same symmetry operations. True spiral distribution belongs to Phase 2.
- Petals, dots, teardrops, polygons, and stars are closed paths; arcs and spiral guides are decorative open linework. A general gap/intersection cleanup pass remains a Phase 2 task.
- Shared ring boundaries are emitted once. Geometry IDs and draw order are stable for a given recipe.

The Mandala Studio renders the SVG as an image on a white canvas, with minimal seed/geometry/symmetry controls and the existing zoom/pan view. This bounded starter preview generates synchronously; worker-based generation, the full layer editor, save/export, and export metadata arrive in Phase 3. The Video Studio retains its static placeholder and independent state.

Example:

```ts
import { createStarterRecipe } from './src/engines/mandala/recipe';
import { generateMandala } from './src/engines/mandala/generate';
import { renderSvg } from './src/engines/mandala/svg';

const recipe = createStarterRecipe('lotus-001', 'circle', 'rotational', 12);
const geometry = generateMandala(recipe);
const svg = renderSvg(geometry);
```

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
