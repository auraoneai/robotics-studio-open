# failure-gallery

Used inside **Robotics Studio Open** as the failure-gallery contribution and preview flow.

`failure-gallery` is a public synthetic gallery of agent and robotics failure
cases. Each case includes a description, expected review label, expected finding,
related AuraOne tool, and a reproducible local command.

All cases are synthetic tutorial artifacts. They are not customer data, private
lab data, or real incident reports.

## Quick start

```bash
python -m pip install -e .
failure-gallery validate cases/
failure-gallery render cases/ --out site/index.html
```

The gallery is designed for GitHub Pages and for links from `auraone.ai/open`.
