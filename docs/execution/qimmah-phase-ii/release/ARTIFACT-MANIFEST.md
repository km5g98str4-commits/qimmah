# Built Artifact Manifest Tool

Status: `EXECUTABLE / FINAL_ARTIFACT_BLOCKED`

The tool inventories the exact files served from a built artifact. It records
ordered repository-relative paths, byte counts, and SHA-256 digests, then hashes
that canonical file list. It does not build, serve, upload, or deploy anything.

Symlinks and non-regular files are rejected so a manifest cannot silently hash
content outside the selected root. Candidate identity must be a full 40-character
SHA. Empty roots and unsafe root labels fail.

Future final usage:

```bash
node scripts/phase-ii-release/build-artifact-manifest.mjs \
  --root dist \
  --root-label dist \
  --candidate-sha <final-40-character-sha> \
  --out <evidence-directory>/dist-manifest.json

node scripts/phase-ii-release/build-artifact-manifest.mjs \
  --root dist \
  --root-label dist \
  --candidate-sha <same-final-sha> \
  --check <evidence-directory>/dist-manifest.json
```

The `contentSha256` is the `distManifestSha256` consumed by the Release Evidence
contract. The JSON file itself also receives a SHA during `--check`; the two
digests have different meanings and must not be substituted for one another.

Current proof uses temporary synthetic files only:

- identical roots reproduce byte-for-byte;
- the ordered paths are stable;
- changing one byte changes `contentSha256`;
- invalid candidate SHA and unsafe root label fail by name;
- empty roots fail;
- symlinks fail before their target is read.

## Dependencies

| Dependency ID | Description | Blocking Web Sovereign artifact | Expected future integration point | Remaining work after integration |
| --- | --- | --- | --- | --- |
| `WS-REL-DIST-001` | The manifest tool is ready, but no current build can represent the unaccepted moving Web implementation. | Founder-accepted Web SHA and final candidate after lane rebind. | Exact final `npm ci` + production build before browser evidence. | Build once, generate the manifest outside `dist`, verify it unchanged before/after the browser run, and bind its `contentSha256` to every evidence record and release note. |

