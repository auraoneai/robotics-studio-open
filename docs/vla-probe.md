# Deterministic VLA Probe

The source build provides one local mock policy and four deterministic
perturbation definitions:

- Language paraphrase metadata.
- Low-light vision metadata.
- Declared gripper-width metadata.
- Task-phase label ordering.

The Trials control is limited to one through four. A run executes exactly the
visible requested count, reports a fixed source-build timestamp, and can
download deterministic JSON or Markdown.

ONNX, PyTorch, hosted model identifiers, local weights, and network inference
are unavailable and are not executed.
