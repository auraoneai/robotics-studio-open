# GitHub Action

```yaml
name: dataset-quality
on: [push, pull_request]
jobs:
  lerobot-quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: auraoneai/lerobot-quality-gates@v0.1.0
        with:
          path: .
          fail-on: high
          format: markdown
```
