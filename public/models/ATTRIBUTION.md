# Anatomy model attribution

BodyParts3D / Anatomography, © The Database Center for Life Science (DBCLS).
https://lifesciencedb.jp/bp3d/

- Version: BodyParts3D / Anatomography 4.3 (object set 4.3, ontology tree FMA3.0).
- Model/data license: [Creative Commons Attribution-Share Alike 2.1 Japan](https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en) ([legal code](https://creativecommons.org/licenses/by-sa/2.1/jp/legalcode)), as stated by the [original service](https://lifesciencedb.jp/bp3d/info/index.html#License) for contour data and rendered images.
- Source meshes: supplied through the public [olivercase/body_parts_3d_api](https://github.com/olivercase/body_parts_3d_api) mirror at commit `fd527e6f4daf732fd814314d9257df5877b844bc`, each checked against its Git LFS SHA-256 and the official 4.3 concept-to-element table.
- Retrieved: 2026-10-16.
- Full hashes and source-to-runtime mapping: [manifest.json](manifest.json).
- Original work: Mitsuhashi et al., “BodyParts3D: 3D structure database for anatomical concepts”, Nucleic Acids Research 37 (2009), D782–D785. [DOI](https://doi.org/10.1093/nar/gkn613).

Changes by OrganUI (2026): selected 33 meshes, one per structure, by source concept, triangulated faces, recentered and uniformly scaled coordinates, changed axes from Z-up to Y-up, recomputed smooth normals, assigned illustrative colors, and converted OBJ to GLB. No decimation or invented anatomy.

`public/models/teeth.glb` and screenshots of it are adaptations distributed under the same CC BY-SA 2.1 Japan license. The MIT license for original application code does not relicense them. Preserve this attribution, the license link, and the modification notice when redistributing. Neither DBCLS nor the mirror author endorses this demonstration. The source notes that the database can contain missing or incorrect anatomical representations.
