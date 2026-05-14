# Dataset Adapters

Robotics Studio Open supports these normalized adapters through `robostudio-engine`:

- LeRobot v3 native and LeRobot v2 best-effort metadata.
- RLDS JSONL metadata.
- OpenX manifest metadata.
- HDF5 with ALOHA, ACT, RoboMimic, and generic profile presets.
- ROS bag 2 sqlite and rosbag1 legacy discovery.
- Folder-of-mp4-jsonl exports from AuraOne Capture.

Each adapter emits the same normalized episode contract: episode id, task, split, instruction, success, embodiment, sensors, action segments, interventions, failure modes, and anomaly notes.
