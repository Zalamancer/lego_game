# Rendering Performance Notes

## Why the scene was slow (pre-instancing)

- Every placed brick was a `template.clone(true)` of a `THREE.Group` with its own materials → one draw call per brick per render pass.
- Shadow pass runs the whole scene again from the sun's POV → 2× draw calls.
- `recolor()` cloned materials per brick, defeating GPU state batching.
- `antialias:true` + Retina DPR = backbuffer is 4× pixels and then MSAA on top.

On a 1,000-brick world that's easily 2,000+ draw calls per frame. MacBook Pros hide this until ~2–3k draws; Chromebook iGPUs stall around 500.

## Round 1 fix — instancing (implemented)

For each loaded `partNum` we now:

1. **Extract shards** at load time: for every mesh in the template, bake the wrapper's world matrix into a cloned `BufferGeometry`. Multi-material meshes are split by group.
2. **Classify** each shard as opaque or transparent.
   - Opaque: one **shared** `MeshStandardMaterial` with `color=white`, `vertexColors=false`. Per-brick hue comes from `InstancedMesh.instanceColor`.
   - Transparent (windows, etc.): keep the original LDraw material so authored glass tints survive.
3. **InstancedMesh per `(partNum, shardIdx)`**, pooled in `state.instancedMeshes`. Capacity starts at 128 and doubles on overflow (`growIM`).
4. Placement writes one matrix + one color into each shard's IM. Removal is **swap-with-last** across every shard, with `partIds` parallel array kept in sync.

### Other fragment-cost cuts
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`.
- `antialias: dpr < 1.5` — skip MSAA when we're already supersampling.
- `PCFShadowMap` instead of `PCFSoftShadowMap` (blocky aesthetic hides the difference).

### What also had to change
- **Raycasting**: candidates are now `[basePlate, ...state.instancedMeshes.values()]`; `hit.instanceId` + `im.userData.partIds[]` resolves the brick.
- **Hover tint**: overrides per-instance `instanceColor` for opaque shards (no material mutation); transparent shards left alone.
- **`state.partsById`**: O(1) lookup during swap-with-last removal.

## Round 2 fix — stud culling (NEXT)

### Why it still matters after instancing
Instancing kills per-brick CPU cost, but each instance still carries the full part geometry. **A LEGO stud is almost all the geometry of a brick.**

Stud primitive = **16-sided cylinder** (`stud.dat`):

| piece | tris |
|---|---|
| side | 32 |
| top cap | 16 |
| bottom cap (inside the underside tube) | 16 |
| **per stud** | **~64 tris, ~34 indexed verts, ~192 unindexed verts** |

Brick body (box) = **12 tris**. So a 2×4 brick = 12 + 8×64 = **524 tris, 98% of which is studs**. A 10×10 plate: 1,212 tris, **99% studs**.

### What's hidden in a built structure
1. **Covered studs** — stud at `(gx, gz, layer+H)` is invisible iff `occ.has(okey(gx, layer+H, gz))`. In dense stacks 70–90% of studs are covered.
2. **Underside tubes/caps** — only visible if you physically pick up the brick. Safe to **always** strip.
3. Interior walls between flush bricks — marginal (12 tris each). Skip.

### Proposed design (composes on top of round 1, doesn't invalidate it)
- At `extractShards`, classify each shard as `"body"` or `"stud"` (detect by bbox footprint matching LDraw's stud primitive size). Store the stud **offsets** per partNum: `Array<{dx, dz}>` in the brick's local frame. **Drop** stud shards from the body render list.
- Drop stud *underside* geometry entirely at load time (never rendered).
- Add one global `StudPool` = one `InstancedMesh` for the stud cylinder, per-instance color.
- On `addPartMesh`:
  - For each `(dx, dz)` on the brick's top face, check `occ` at the cell above. If free → add stud instance. If occupied → skip.
  - Also look for studs belonging to the brick *directly below this one* that this brick just covered; remove those stud instances.
- On `removePartMesh`: remove own stud instances + re-add any stud instances on the brick below that we previously hid.
- Track stud instances in a map keyed by `(gx, gz, topLayer)` so "find covered stud under new brick" is O(1).

### Expected wins
- Flat 30×30×4 build: ~4× fewer stud tris.
- Dense stacked house: 10×+ fewer stud tris.
- Bonus: every stud on screen is a single draw call regardless of how many unique brick parts are placed — stud cost decouples from part variety.

### Composition with round 1
Strictly additive. Body-instance code, raycasting, hover, DPR cap, shadows — all unchanged. Only `extractShards` classification, the new `StudPool`, and a few extra lines in `addPartMesh` / `removePartMesh` are new.

### Gotcha: strip by triangle **centroid**, not max Y

First attempt stripped every triangle whose `maxY > bodyTop`. That punched holes in the brick's top face, because LDraw connects the stud primitive to the top face via triangles that have one vertex at `bodyTop` and two above — those triangles' max Y exceeded the threshold, so they got dropped.

Symptom: hovering a brick always returned `layer = 0` — the ray entered through a hole, hit the interior wall of the brick (normal pointing sideways), and `findTargetCell` treated it as a side-hit.

Fix: use the **centroid** Y. The stud-bottom disc sits at exactly `bodyTop` so it stays with the top face (centroid Y = bodyTop, kept). Stud side walls have centroid Y ≈ `bodyTop + studH/2` (stripped). Stud top caps have centroid Y = `bodyTop + studH` (stripped). Top face is sealed, studs are gone.

Also: always `computeBoundingBox()` / `computeBoundingSphere()` on any geometry passed through `applyMatrix4` — without this, InstancedMesh raycasting broadphase can cull valid intersections.
