# Contributing

Robotics Studio Open accepts contributions under the Developer Certificate of
Origin (DCO). There is no CLA.

## DCO Sign-Off

Every commit must include a `Signed-off-by:` trailer:

```bash
git commit -s
```

By contributing, you certify the Developer Certificate of Origin 1.1:

```text
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.

Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

## Release Gates

Every release PR must include evidence for:

- DCO pass.
- CODEOWNERS review for release, security, signing, telemetry, and intake files.
- SBOM generation.
- License scan with no GPL, AGPL, LGPL, or unknown licenses in shipped binaries.
- Secret scan.
- Python dependency CVE scan for `robostudio-engine` and bundled sidecars.
- Rust audit for desktop crates.
- Accessibility smoke checks for keyboard-only navigation and command palette.
- Performance baseline artifact for dataset open, grid scroll, scrub fps, and
  clustering.
- Signed artifact provenance and checksums.

External approvals that cannot be completed by CI must be tracked in
`docs/release/blockers-2026-05-13.md` with owner, next action, and evidence.
