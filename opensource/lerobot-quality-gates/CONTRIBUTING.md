# Contributing

Keep checks deterministic and actionable. Each new gate needs a failing fixture, a passing fixture, and remediation text.

```bash
python -m pytest -q
python -m build
twine check dist/*
```
