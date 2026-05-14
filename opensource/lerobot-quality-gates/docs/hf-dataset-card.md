# Hugging Face Dataset Card Snippet

Run:

```bash
lerobot-quality-gates check path/to/dataset --format hf-card --out QA.md
```

For a public Hugging Face dataset repository, inspect metadata without pulling large videos:

```bash
lerobot-quality-gates check --hf-repo owner/dataset-name --format hf-card --out QA.md
```

Paste the generated snippet into a dataset README to disclose checked metadata, known limitations, and remaining findings.
