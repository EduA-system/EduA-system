# Physics Simulation Review Findings

Code review of commit `83e837f` ("feat(fe): bring physics simulations from
feat/physicals-simulation-4"), merged into `main` via PR #47. Scope: mechanics
engine, EM/rotation/magnetism engines, presets, and renderers under
`fe/components/simulations/`.

Findings are ordered roughly by severity/blast radius, not by file.

**Status: all 10 findings fixed.** Findings #1–6 touch files marked
`AI KHÔNG đụng vào file này` in `fe/components/simulations/engines/mechanics/`
(`collisions.ts`, `build-derivs.ts`, `forces.ts`, `constraints.ts`) — fixed
with explicit user authorization, since the request here was a direct,
human-directed bug fix rather than autonomous AI edits to Scene-adjacent code.

Note on finding #1: the original review flagged permanent sticky collisions as
a bug, but the code comment in `collisions.ts` documented the permanent-merge
behavior as intentional ("đúng nghĩa va chạm mềm hoàn toàn"). After discussion,
the actual physics is more precise than either take: `restitution = 0` only
fixes the *normal* relative velocity to zero *at the instant of impact* — it
is not a standing distance constraint. The fix makes the bond **one-directional
(non-penetration only)**: it keeps preventing interpenetration and matching
velocities while bodies are still overlapping, but releases the pair the
moment another force in the scene separates them past contact distance,
instead of pulling them back together like a welded rod. See the "Đã sửa"
note under finding #1 below for the exact mechanism.

## 1. Inelastic collisions become permanent welds

**File:** `fe/components/simulations/engines/mechanics/collisions.ts:166`

Perfectly-inelastic collisions (`restitution === 0`) are stored as a permanent
bidirectional distance constraint (`stickyPairs`) instead of a one-sided
contact.

**Failure scenario:** Two bodies collide with restitution 0 and get added to
`stickyPairs`. `enforceStickyPair` recomputes `correction = pair.distance - dist`
on every later step; if a spring or other force later separates them
(`dist > pair.distance`), the correction goes negative and pulls the bodies
back together — like a welded rod, not an inelastic collision. Nothing ever
removes entries from `stickyPairs`, so the bond never expires.

**Đã sửa:** `enforceStickyPair` now only pushes the pair apart when they're
still overlapping (`overlap = pair.distance - dist > 0`) and matches
velocities in that case only. The moment `dist >= pair.distance`, the function
returns `false` and the caller (`resolveCollisions`) deletes the entry from
`stickyPairs`, releasing the pair back to ordinary per-step collision
detection. Non-penetration + velocity matching while touching, no pull-back
once separated.

## 2. Mechanical-energy conservation defeats intentional inelastic collisions

**File:** `fe/components/simulations/engines/mechanics/build-derivs.ts:137`

The `conserveMechanicalEnergy` rescale runs unconditionally after
`resolveCollisions`.

**Failure scenario:** A scene sets both `conserveMechanicalEnergy: true` and a
collision with `restitution < 1` (intentionally lossy). After
`resolveCollisions` reduces kinetic energy, the rescale block restores
velocities to hit `targetMechanicalEnergy`, silently undoing the energy loss
the collision was configured to cause. No guard exists against combining the
two independent Scene flags.

**Đã sửa:** `targetMechanicalEnergy` is now `null` (energy-lock disabled for
the whole kernel) whenever `hasCollidable && (scene.restitution ?? 1) < 1` —
an inelastic-collision scene opts out of the energy correction entirely
instead of fighting it step by step. No shipped preset currently combines the
two flags, so this is a defensive fix against future/AI-authored scenes.

## 3. Spring force and potential-energy models disagree at the contact boundary

**File:** `fe/components/simulations/engines/mechanics/forces.ts:63`
(compare `fe/components/simulations/engines/mechanics/build-derivs.ts:97`)

`compressionOnly` spring force gates on `Math.min(0, rawMagnitude)`, while the
potential-energy model gates on `ext >= 0`.

**Failure scenario:** When `ext >= 0` (spring at/past natural length — contact
should have ended) but `relRate` is strongly negative (bodies still closing
fast), `forces.ts` can still apply a nonzero compressive force while the PE
model in `build-derivs.ts` contributes zero for that same state. With
`conserveMechanicalEnergy` active, this mismatch injects or removes energy
inconsistently near the boundary.

**Đã sửa:** the force gate now checks `ext < 0` first (matching the PE gate
exactly), and only clamps to non-positive within that: `force.compressionOnly
? (ext < 0 ? Math.min(0, rawMagnitude) : 0) : rawMagnitude`. Force and PE are
now zero on exactly the same states.

## 4. Energy-conservation target computed from unprojected initial state

**File:** `fe/components/simulations/engines/mechanics/build-derivs.ts:104`

`targetMechanicalEnergy` is captured from the raw, unprojected initial state
instead of the post-constraint-projection state simulations actually start
from.

**Failure scenario:** All real entry points (`scene-konva-2d.tsx`,
`sim-time.ts`) call `kernel.project(kernel.initialState)` before stepping. If
an initial body position doesn't exactly satisfy a rod/curveTrack constraint
(e.g. a pendulum bob placed slightly off the exact rod length), the projected
starting state's true energy differs from the locked target, so the
energy-lock logic injects or drains energy starting on frame 1.

**Đã sửa:** `targetMechanicalEnergy` is now computed by running
`projectConstraints` on a scratch copy of the initial points before measuring
energy, matching the state real steps actually start from.

## 5. Mechanical-energy conservation silently no-ops on constraint-free scenes

**File:** `fe/components/simulations/engines/mechanics/build-derivs.ts:127`

An early-return guard (`if (scene.constraints.length === 0 && !hasCollidable)
return s;`) runs before the `conserveMechanicalEnergy` block.

**Failure scenario:** A pure spring-and-gravity scene with
`conserveMechanicalEnergy: true`, zero `constraints` entries, and no
radius-bearing bodies hits the early return before the energy-correction block
ever runs — a silent no-op with no warning. Currently masked because both
shipped presets using the flag (`bao-toan-co-nang-con-lac.ts`,
`mang-cong-galilei.ts`) happen to declare a rod/curveTrack constraint.

**Đã sửa:** the guard now also checks `targetMechanicalEnergy == null`
(equivalent to the flag being off), so a constraint-free, collision-free scene
with `conserveMechanicalEnergy: true` no longer skips the correction block.

## 6. `curveTrack` friction scales incorrectly with integrator substep

**File:** `fe/components/simulations/engines/mechanics/constraints.ts:131`

`curveTrack` friction is derived from positional drift off the track (scales
~dt²), while the sibling `surface` constraint (line ~118) derives friction
from normal velocity (scales ~dt).

**Failure scenario:** With the renderer's small fixed substep (~1/240s), the
RK4-integrated drift off the track is tiny, so
`drop = Math.min(|vt|, friction * correction)` barely reduces tangential
velocity regardless of the configured friction coefficient. A roller-coaster
or ramp preset with friction set high shows almost no deceleration, unlike the
physically-consistent `surface` constraint.

**Đã sửa:** friction now caps the tangential-velocity drop using
`friction * Math.abs(vn)`, where `vn` is the pre-snap velocity component along
the track's local normal — the same normal-velocity proxy the `surface`
constraint uses — instead of the positional drift `correction`.

## 7. Compass inertia divide-by-zero unguarded

**File:** `fe/components/simulations/engines/magnetism/physics.ts:36`

`stepMagnetic` divides by `scene.compass.inertia` with no zero/negative guard,
unlike sibling engines (`rotation`, `magnetic-loop`) added in the same commit,
which floor their inertia divisor with an epsilon.

**Failure scenario:** If any preset, param slider, or malformed scene sets
`compass.inertia` to 0 or negative, acceleration becomes `Infinity`/`NaN` and
propagates into `angle`, silently breaking the compass-needle rendering with
no error surfaced.

**Đã sửa:** added `const EPSILON = 1e-9` and divide by
`Math.max(scene.compass.inertia, EPSILON)`, matching the `rotation`/
`magnetic-loop` pattern.

## 8. Current-sheet mass divide-by-zero unguarded

**File:** `fe/components/simulations/engines/parallel-current-sheets/physics.ts:15`

`stepCurrentSheets` divides by `scene.mass` with no zero/negative guard — the
same gap pattern absent versus sibling engines in this commit that do guard
their divisors.

**Failure scenario:** A scene with `mass` 0 or negative produces
`Infinity`/`NaN` acceleration that propagates into plate positions and then
into the renderer's `atan2`-based deflection calculation, silently breaking
rendering.

**Đã sửa:** added the same `EPSILON` guard, dividing by
`Math.max(scene.mass, EPSILON)` for both `leftA` and `rightA`.

## 9. Feather image reloaded on every param-slider tick

**File:** `fe/components/simulations/renderers/mechanics/scene-konva-2d.tsx:906`

A new `Image()` for `feather.png` is created and its `src` set unconditionally
inside the stage-rebuild effect, regardless of whether any body in the current
scene actually uses the "feather" visual shape.

**Failure scenario:** The rebuild effect depends on `scene`, which is
recomputed on every param-slider tick via `useMemo(() =>
preset.applyParams(params), [preset, params])` in `page.tsx`. Every one of the
~30 non-feather mechanics presets therefore reloads and decodes
`/simulations/newton/feather.png` on every slider drag; the `shape ===
"feather"` check only happens later (~line 1083) when choosing a node factory,
so the load itself isn't gated, and cleanup (~line 2198) only nulls `onload`
rather than aborting the in-flight load.

**Đã sửa:** the image is now only constructed when
`work.bodies.some((b) => b.visual?.shape === "feather")`; `featherAsset` is
`HTMLImageElement | null` and `makeFeatherNode` passes `featherAsset ??
undefined`. Cleanup also sets `featherAsset.src = ""` (in addition to nulling
`onload`) to cancel any in-flight load.

## 10. Balance tolerance inconsistent between sibling moment presets

**File:** `fe/components/simulations/presets/quy-tac-moment-dia-tron.ts:11`
(compare `fe/components/simulations/presets/quy-tac-moment.ts`)

The "balanced" (Cân bằng) check on the disk version uses a near-machine-epsilon
tolerance (`1e-9`), while the near-identical seesaw preset uses a forgiving
relative tolerance (`max(0.05, 0.005 * max(MLeft, MRight))`).

**Failure scenario:** A student adjusting continuous mass/distance sliders on
the disk version needs an exact floating-point match to see "Cân bằng",
whereas the same near-balance on the seesaw version reports balanced much more
readily — inconsistent pedagogy for the identical moment-balance rule between
two sibling presets.

**Đã sửa:** `quy-tac-moment-dia-tron.ts` now uses the same
`tolerance = Math.max(0.05, 0.005 * Math.max(MLeft, MRight))` /
`Math.abs(netMoment) <= tolerance` formula as `quy-tac-moment.ts`.
