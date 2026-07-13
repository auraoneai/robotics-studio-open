# Failure Intelligence

The source build groups only records with an explicit failure outcome,
`failure_cluster`, or failure taxonomy field.

The deterministic group key is:

1. `failure_cluster`, when present.
2. The first declared failure taxonomy tag.
3. `unclassified-failure` only when the record explicitly declares a failure
   outcome without either field.

No embeddings, image models, CLIP weights, or remote services are used.
Readiness and homogeneity are computed from known member fields; absent values
remain unknown.

Split divides a cluster's ordered episode identifiers into two deterministic
segments. Merge combines the selected row with its adjacent comparison row.
Both operations recompute size, representative episode, readiness,
homogeneity, dominant tag, and training decision. Undo restores and recomputes
the previous state.
