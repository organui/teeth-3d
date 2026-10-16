# Model provenance and preparation

## Source and license

The runtime model uses **BodyParts3D / Anatomography 4.3** (object set 4.3, ontology tree FMA3.0), retrieved **2026-10-16**. All selected OBJ headers report compatibility version 4.3.

The original service explicitly permits modification and redistribution of contour data and rendered images under **[CC BY-SA 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en)** ([legal text](https://creativecommons.org/licenses/by-sa/2.1/jp/legalcode)). An inert [snapshot of that notice](model-source/original-license.html.txt), copied from the lungs explorer's provenance record, is included. This license governs `public/models/teeth.glb`, the manifest's model data and the model screenshots, separately from the MIT application code. This follows the same choice as [lungs-3d](https://github.com/organui/lungs-3d) and [pancreas-3d](https://github.com/organui/pancreas-3d), which also use 4.3 data: the LSDB archive's CC BY 4.0 grant covers its 4.0 release and is not extended to these 4.3 meshes.

Credit: **BodyParts3D / Anatomography, © The Database Center for Life Science (DBCLS).** Adapted by OrganUI. No endorsement is implied.

## Retrieval and pinning

The network policy of the sandbox this was built in blocked both `dbarchive.biosciencedbc.jp` and `lifesciencedb.jp`, so the official archives could not be downloaded. Geometry comes from the public [olivercase/body_parts_3d_api](https://github.com/olivercase/body_parts_3d_api) mirror, pinned at commit `fd527e6f4daf732fd814314d9257df5877b844bc` (the same commit the lungs and pancreas explorers pin).

Each OBJ is checked three ways:

1. Its SHA-256 matches the oid in its pinned Git LFS pointer (recorded per file in [model-inputs.json](../scripts/model-inputs.json)).
2. Its embedded `File ID` and `Concept ID` headers match.
3. That concept maps to that FJ element in the official 4.3 IS-A table, [`FMA2Obj-4.3.tsv`](model-source/FMA2Obj-4.3.tsv) (SHA-256 `c3d16c89…935d4f`). The table is the unchanged official download preserved by lungs-3d; `prepare-model.ts` refuses to run if its hash changes.

The official per-element metadata table (original model filenames) could not be fetched, so unlike lungs-3d it is not preserved here.

## Selected structures

| Structure                   | Source concept                             | Element |
| --------------------------- | ------------------------------------------ | ------- |
| Upper right central incisor | FMA55681 right upper central incisor tooth | FJ1279  |
| Upper right lateral incisor | FMA55680 right upper lateral incisor tooth | FJ1280  |
| Upper right canine          | FMA55798 right upper canine tooth          | FJ1281  |
| Upper right first premolar  | FMA55689 right first upper premolar tooth  | FJ1277  |
| Upper right second premolar | FMA55688 right second upper premolar tooth | FJ1278  |
| Upper right first molar     | FMA55698 right first upper molar tooth     | FJ1276  |
| Upper right second molar    | FMA55697 right second upper molar tooth    | FJ1275  |
| Upper left central incisor  | FMA55682 left upper central incisor tooth  | FJ1265  |
| Upper left lateral incisor  | FMA55683 left upper lateral incisor tooth  | FJ1266  |
| Upper left canine           | FMA55799 left upper canine tooth           | FJ1267  |
| Upper left first premolar   | FMA55690 left first upper premolar tooth   | FJ1262  |
| Upper left second premolar  | FMA55691 left second upper premolar tooth  | FJ1264  |
| Upper left first molar      | FMA55699 left first upper molar tooth      | FJ1261  |
| Upper left second molar     | FMA55700 left second upper molar tooth     | FJ1263  |
| Lower left central incisor  | FMA57143 left lower central incisor tooth  | FJ1258  |
| Lower left lateral incisor  | FMA57141 left lower lateral incisor tooth  | FJ1259  |
| Lower left canine           | FMA55687 left lower canine tooth           | FJ1260  |
| Lower left first premolar   | FMA55693 left first lower premolar tooth   | FJ1255  |
| Lower left second premolar  | FMA55692 left second lower premolar tooth  | FJ1257  |
| Lower left first molar      | FMA55704 left first lower molar tooth      | FJ1254  |
| Lower left second molar     | FMA55703 left second lower molar tooth     | FJ1256  |
| Lower right central incisor | FMA57142 right lower central incisor tooth | FJ1272  |
| Lower right lateral incisor | FMA57140 right lower lateral incisor tooth | FJ1273  |
| Lower right canine          | FMA55686 right lower canine tooth          | FJ1274  |
| Lower right first premolar  | FMA55694 right first lower premolar tooth  | FJ1269  |
| Lower right second premolar | FMA55695 right second lower premolar tooth | FJ1271  |
| Lower right first molar     | FMA55705 right first lower molar tooth     | FJ1268  |
| Lower right second molar    | FMA55706 right second lower molar tooth    | FJ1270  |
| Upper gum                   | FMA59763 maxillary gingiva                 | FJ1252  |
| Lower gum                   | FMA59764 mandibular gingiva                | FJ1253  |
| Right maxilla               | FMA53649 right maxilla                     | FJ3375  |
| Left maxilla                | FMA53650 left maxilla                      | FJ3269  |
| Mandible                    | FMA52748 mandible                          | FJ3289  |

33 elements, 59,608 triangles. Each element belongs to exactly one structure; the script refuses duplicates and unused inputs. Per-element hashes, sizes and counts are in the [manifest](../public/models/manifest.json) and [selected-mappings.tsv](model-source/selected-mappings.tsv).

Decisions:

- **Duplicate copies.** The 4.3 table maps each maxilla and the mandible to two elements (right maxilla FJ3375 and FJ6468, left maxilla FJ3269 and FJ6380, mandible FJ3289 and FJ6399). Each pair has the same bounds to within 0.2 mm and nearly the same face count, so the lower-numbered element, which has slightly more faces for the mandible, is used and the other is excluded to avoid z-fighting.
- **Teeth.** The 4.3 set has 28 permanent teeth (FJ1254–FJ1281), each under its own tooth concept. There are no third molars and no primary teeth.
- **Gums.** The maxillary and mandibular gingiva (FJ1252, FJ1253) are included as the soft tissue around the teeth.
- Omitted: the rest of the skull (including the temporal bones the mandible hinges on), palatine bones, hyoid, tongue, lips, jaw muscles, and the maxillary and mandibular nerves and vessels. The maxillae keep their frontal and zygomatic processes, so the model rises toward the nose and cheekbones.

## Transformation and orientation

Vertices are recentred on the selection's source bounding box and uniformly scaled by `0.025`; axes change from source `[x, y, z]` to display `[x, z, -y]` (source +x patient left, −y anterior, +z superior). The anterior view looks along display −Z, posterior along +Z, and the right lateral view from the patient's right along +X. In the anterior view the patient's right teeth are on the viewer's left, as expected. No anatomical reshaping or decimation is performed.

## Reproduce

```sh
bun run prepare:model   # downloads missing OBJs into .asset-cache/objs, verifies, writes the GLB and manifest
bun run verify:model    # checks the GLB hash, structure IDs, element lists and geometry
```
