use std::cmp::Ordering;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatasetFormat {
    LeRobotV3,
    Rlds,
    OpenX,
    Hdf5,
    RosBag,
    Mp4Jsonl,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DatasetOpenRequest {
    pub root: PathBuf,
}

#[derive(Debug, Clone, PartialEq)]
pub struct IndexRow {
    pub episode_id: String,
    pub duration_seconds: f64,
    pub intervention_count: u32,
    pub success: Option<bool>,
    pub reviewed: bool,
    pub sensor_qa_status: SensorQaStatus,
    pub mtime_unix: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SensorQaStatus {
    Pass,
    Warn,
    Fail,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SidecarPaths {
    pub index_sqlite: PathBuf,
    pub thumbs_dir: PathBuf,
    pub views_json: PathBuf,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ExportPacketPlan {
    pub manifest_name: String,
    pub payload_roles: Vec<&'static str>,
    pub episode_count: usize,
    pub requires_user_consent: bool,
}

pub fn infer_dataset_format(root: &Path, filenames: &[&str]) -> DatasetFormat {
    let has = |name: &str| filenames.iter().any(|candidate| *candidate == name);

    if has("meta/info.json") || has("episodes.parquet") {
        DatasetFormat::LeRobotV3
    } else if has("openx_manifest.json") {
        DatasetFormat::OpenX
    } else if filenames
        .iter()
        .any(|name| name.ends_with(".hdf5") || name.ends_with(".h5"))
    {
        DatasetFormat::Hdf5
    } else if filenames
        .iter()
        .any(|name| name.ends_with(".db3") || name.ends_with(".bag"))
    {
        DatasetFormat::RosBag
    } else if filenames.iter().any(|name| name.ends_with(".mp4"))
        && filenames.iter().any(|name| name.ends_with(".jsonl"))
    {
        DatasetFormat::Mp4Jsonl
    } else if has("features.json") || root.to_string_lossy().contains("rlds") {
        DatasetFormat::Rlds
    } else {
        DatasetFormat::Unknown
    }
}

pub fn sidecar_paths(root: &Path) -> SidecarPaths {
    let base = root.join(".robostudio");
    SidecarPaths {
        index_sqlite: base.join("index.sqlite"),
        thumbs_dir: base.join("thumbs"),
        views_json: base.join("views.json"),
    }
}

pub fn sort_index_rows(rows: &mut [IndexRow]) {
    rows.sort_by(|left, right| {
        match qa_rank(left.sensor_qa_status).cmp(&qa_rank(right.sensor_qa_status)) {
            Ordering::Equal => left.episode_id.cmp(&right.episode_id),
            ordering => ordering,
        }
    });
}

pub fn build_intake_packet_plan(episode_count: usize) -> ExportPacketPlan {
    ExportPacketPlan {
        manifest_name: "manifest.json".to_string(),
        payload_roles: vec![
            "robotics_reviewed_subset_manifest",
            "robotics_episode_reference",
            "robotics_failure_cluster",
            "robotics_intervention_note",
            "robotics_embodiment_card",
            "robotics_sensor_qa_report",
        ],
        episode_count,
        requires_user_consent: true,
    }
}

fn qa_rank(status: SensorQaStatus) -> u8 {
    match status {
        SensorQaStatus::Pass => 0,
        SensorQaStatus::Warn => 1,
        SensorQaStatus::Fail => 2,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_supported_dataset_formats() {
        let root = Path::new("/tmp/rlds-dataset");
        assert_eq!(
            infer_dataset_format(root, &["meta/info.json"]),
            DatasetFormat::LeRobotV3
        );
        assert_eq!(
            infer_dataset_format(root, &["features.json"]),
            DatasetFormat::Rlds
        );
        assert_eq!(
            infer_dataset_format(root, &["openx_manifest.json"]),
            DatasetFormat::OpenX
        );
        assert_eq!(
            infer_dataset_format(root, &["demo.hdf5"]),
            DatasetFormat::Hdf5
        );
        assert_eq!(
            infer_dataset_format(root, &["robot.db3"]),
            DatasetFormat::RosBag
        );
        assert_eq!(
            infer_dataset_format(root, &["episode.mp4", "episode.jsonl"]),
            DatasetFormat::Mp4Jsonl
        );
    }

    #[test]
    fn creates_standard_sidecar_paths() {
        let paths = sidecar_paths(Path::new("/datasets/so101"));
        assert_eq!(
            paths.index_sqlite,
            PathBuf::from("/datasets/so101/.robostudio/index.sqlite")
        );
        assert_eq!(
            paths.thumbs_dir,
            PathBuf::from("/datasets/so101/.robostudio/thumbs")
        );
        assert_eq!(
            paths.views_json,
            PathBuf::from("/datasets/so101/.robostudio/views.json")
        );
    }

    #[test]
    fn intake_packet_requires_consent_and_robotics_payloads() {
        let plan = build_intake_packet_plan(1200);
        assert!(plan.requires_user_consent);
        assert_eq!(plan.manifest_name, "manifest.json");
        assert_eq!(plan.episode_count, 1200);
        assert!(plan.payload_roles.contains(&"robotics_sensor_qa_report"));
        assert!(plan.payload_roles.contains(&"robotics_failure_cluster"));
        assert!(plan.payload_roles.contains(&"robotics_episode_reference"));
    }

    #[test]
    fn sorts_index_by_quality_then_episode_id() {
        let mut rows = vec![
            IndexRow {
                episode_id: "b".to_string(),
                duration_seconds: 12.0,
                intervention_count: 0,
                success: Some(true),
                reviewed: true,
                sensor_qa_status: SensorQaStatus::Fail,
                mtime_unix: 1,
            },
            IndexRow {
                episode_id: "a".to_string(),
                duration_seconds: 10.0,
                intervention_count: 1,
                success: Some(false),
                reviewed: false,
                sensor_qa_status: SensorQaStatus::Pass,
                mtime_unix: 1,
            },
        ];
        sort_index_rows(&mut rows);
        assert_eq!(rows[0].episode_id, "a");
    }
}
