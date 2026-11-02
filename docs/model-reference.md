# Model Reference — portfolio.glb

Source of truth: public/models/portfolio.glb (original 101MB, names intact).
Runtime file: public/models/portfolio-web.glb (37MB, MeshOpt+quantized, node &amp; material names kept via -kn -km, generated: gltfpack -cc -vpf -vt 12 -vn 10 -kn -km).

Totals: nodes 38 · meshes 38 · materials 104 · triangles 1,265,170 · textures 79 (33 images)

Note: the runtime web file loses 40 degenerate triangles during MeshOpt compression (1,265,130 tris at runtime), e.g. `naruto.001` 20 → 12, `wall_part` 13,964 → 13,932. All counts below are from the source-of-truth original.

## Scene tree (node → mesh)

```
• table.001 → mesh "Plane.219" | prims 3 | tris 1,484 | mats [table.003, Material.361, Material.360]
• sframe3.001 → mesh "Cube.094" | prims 2 | tris 28 | mats [Material.096, Material.348]
• sframe2.001 → mesh "Cube.095" | prims 2 | tris 28 | mats [Material.342, Material.347]
• sframe1.001 → mesh "Cube.096" | prims 2 | tris 28 | mats [Material.097, Material.346]
• floor → mesh "Cube.084" | prims 1 | tris 4,144 | mats [Material.364]
• poweroutlet.001 → mesh "Plane.172" | prims 2 | tris 56 | mats [Material.337, Material.336]
  • BézierCurve.005 → mesh "Mesh" | prims 2 | tris 10,940 | mats [Material.341, Material.339]
  • BézierCurve.006 → mesh "Mesh.001" | prims 2 | tris 10,940 | mats [Material.340, Material.338]
• Plane.033 → mesh "Plane.202" | prims 1 | tris 30 | mats [Material.076]
• wall_part → mesh "Plane.180" | prims 12 | tris 13,964 | mats [Material.335, shelf.027, shelf.028, Material.367, shelf.033, shelf.035, shelf.031, shelf.034, shelf.029, shelf.030, shelf.032, Material.334]
• naruto.001 → mesh "Empty.015" | prims 1 | tris 20 | mats [Empty.015]
• mousemate.001 → mesh "Plane.212" | prims 1 | tris 92 | mats [Material.362]
• monitor.001 → mesh "Plane.216" | prims 2 | tris 926 | mats [Material.280, Material.281]
  • screen → mesh "Plane.044" | prims 1 | tris 2 | mats [Material.280]
• minitable.001 → mesh "Plane.218" | prims 2 | tris 1,100 | mats [Material.284, Material.024]
• lamp.001 → mesh "Circle.049" | prims 2 | tris 361,244 | mats [Material.279, Material.366]
  • Circle.013 → mesh "Circle.043" | prims 1 | tris 252 | mats [none]
• homer.001 → mesh "Empty.014" | prims 1 | tris 2 | mats [Empty.014]
• frame4.001 → mesh "Plane.175" | prims 1 | tris 76 | mats [Material.349]
• frame3.001 → mesh "Plane.166" | prims 1 | tris 76 | mats [Material.278]
• frame2.001 → mesh "Plane.167" | prims 1 | tris 76 | mats [Material.288]
• frame1.001 → mesh "Plane.169" | prims 1 | tris 76 | mats [Material.294]
• doormate.001 → mesh "Plane.173" | prims 2 | tris 51,372 | mats [Material.293, Material.343]
• demonslayer.001 → mesh "Empty.013" | prims 1 | tris 2 | mats [Empty.013]
• closet.001 → mesh "Plane.201" | prims 2 | tris 7,860 | mats [Material.332, Material.331]
• wall_lights → mesh "Circle.041" | prims 1 | tris 1,364 | mats [Material.333]
• chair.001 → mesh "Cylinder.095" | prims 17 | tris 28,256 | mats [Material.314, Material.315, Material.316, Material.324, Material.323, Material.320, Material.322, Material.319, Material.330, Material.329, Material.318, Material.328, Material.327, Material.317, Material.325, Material.326, Material.313]
  • seat.001 → mesh "Cube.105" | prims 6 | tris 47,232 | mats [Material.307, Material.308, Material.312, Material.309, Material.310, Material.311]
• pc → mesh "Circle.011" | prims 11 | tris 47,328 | mats [Material.302, Material.027, Material.282, Material.300, Material.297, Material.365, Material.304, Material.363, Material.303, Material.298, Material.299]
  • pc_glass → mesh "Circle.014" | prims 1 | tris 2 | mats [Material.344]
• buds.001 → mesh "Cube.086" | prims 2 | tris 14,352 | mats [Material.305, Material.306]
• plant1.001 → mesh "Plane.203" | prims 1 | tris 1,912 | mats [Material.098]
• plant2.001 → mesh "Circle.045" | prims 1 | tris 18,176 | mats [Material.100]
• linkedin.001 → mesh "Plane.176" | prims 3 | tris 976 | mats [Material.345, SVGMat.011, SVGMat.010]
• github.001 → mesh "Plane.174" | prims 2 | tris 1,592 | mats [Material.078, SVGMat.009]
• keyboard → mesh "Plane.213" | prims 7 | tris 631,296 | mats [Material.291, Material.287, gray.003, Material.285, Material.075, Material.286, Material.290]
• mouse.001 → mesh "Cube.089" | prims 2 | tris 1,776 | mats [Material.354, Material.292]
• rex → mesh "Sphere.019" | prims 3 | tris 6,090 | mats [Material.296, Material.295, Material.283]
```

## Interesting nodes

- `screen` (child of `monitor.001`) — screen shader/texture replacement (PC monitor display)
- `pc_glass` (child of `pc`) — glass side panel of PC tower
- `floor` — floor plane (baked_floor texture)
- `wall_part` — merged walls + shelf parts, 12 prims (old `shelf.001`, `smallshelf.001`, `room.002`, `room.004` nodes fold into here)
- `sframe1/2/3.001` — poster frames, each now a single node with 2 prims (frame + inner image plane, baked textures `sframeN_baked` / `sframeN_im_baked`)
- `wall_lights` — renamed from `Circle.012`
- `plant1.001` / `plant2.001` — now single-prim with baked materials Material.098 / Material.100
- `keyboard` — keyboard (7 prims, 631,296 tris — densest mesh)
- `chair.001` (17 prims) + `seat.001` (child) — office chair, seat cushion
- `Circle.013` (child of `lamp.001`) — no material (prime with none; default material at runtime)

## All materials (104)

| table.003 · Material.361 · Material.360 · Material.096 · Material.348 · Material.342 |
| Material.347 · Material.097 · Material.346 · Material.364 · Material.341 · Material.339 |
| Material.340 · Material.338 · Material.337 · Material.336 · Material.076 · Material.335 |
| shelf.027 · shelf.028 · Material.367 · shelf.033 · shelf.035 · shelf.031 |
| shelf.034 · shelf.029 · shelf.030 · shelf.032 · Material.334 · Empty.015 |
| Material.362 · Material.280 · Material.281 · Material.284 · Material.024 · Material.279 |
| Material.366 · Empty.014 · Material.349 · Material.278 · Material.288 · Material.294 |
| Material.293 · Material.343 · Empty.013 · Material.332 · Material.331 · Material.333 |
| Material.307 · Material.308 · Material.312 · Material.309 · Material.310 · Material.311 |
| Material.314 · Material.315 · Material.316 · Material.324 · Material.323 · Material.320 |
| Material.322 · Material.319 · Material.330 · Material.329 · Material.318 · Material.328 |
| Material.327 · Material.317 · Material.325 · Material.326 · Material.313 · Material.344 |
| Material.302 · Material.027 · Material.282 · Material.300 · Material.297 · Material.365 |
| Material.304 · Material.363 · Material.303 · Material.298 · Material.299 · Material.305 |
| Material.306 · Material.098 · Material.100 · Material.345 · SVGMat.011 · SVGMat.010 |
| Material.078 · SVGMat.009 · Material.291 · Material.287 · gray.003 · Material.285 |
| Material.075 · Material.286 · Material.290 · Material.354 · Material.292 · Material.296 |
| Material.295 · Material.283 |

## Runtime lookup snippets

```jsx
const screen = scene.getObjectByName('screen')
scene.traverse((o) => { if (o.name.startsWith('sframe')) { /* … */ } })
```
