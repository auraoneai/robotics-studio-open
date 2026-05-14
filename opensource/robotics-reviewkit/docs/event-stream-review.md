# Event Stream Review

The v2 event stream labels per-step success, contact, safety, drift, recovery, and intervention events. Use intervention density to compare synthetic episodes by events per minute and per task.

Each event must include a non-negative `timestamp_s` and one supported `label`. The validator requires events to be monotonically increasing so downstream exporters can stream records without loading or sorting an entire episode in memory. Optional `severity` and `notes` fields preserve reviewer context.

The Python helpers expose the event contract directly:

```python
from robotics_reviewkit.analyzers import intervention_density, summarize_events

summary = summarize_events(episode["event_stream"])
density = intervention_density(episode["event_stream"], episode["duration_seconds"])
```

`summarize_events()` returns counts for every supported label, observed duration, and a synthetic disclosure flag. `intervention_density()` reports interventions, recoveries, and safety events per minute.

The React v2 viewer reads the same JSON shape and renders a timeline, event table, rubric anchors, and intervention-density summary from `viewer/reviewkit-v2/`.
