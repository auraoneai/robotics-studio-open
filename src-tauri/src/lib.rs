use auraone_platform_keychain::KeychainKey;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::path::{Path, PathBuf};

pub const ROBOTICS_KEYCHAIN_SERVICE: &str = "robotics-studio-open";
pub const INTAKE_INSTALL_SIGNING_KEY_SCOPE: &str = "intake-install-signing-key";
pub const INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER: &str = "ed25519-install-keypair-v1";
pub const REGISTERED_PLATFORM_KEYCHAIN_COMMANDS: [&str; 4] = [
    "platform_keychain_set",
    "platform_keychain_get",
    "platform_keychain_delete",
    "platform_keychain_list",
];

#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize)]
pub struct PlatformKeychainKey {
    pub service: String,
    pub scope: String,
    pub identifier: String,
}

pub fn is_registered_platform_keychain_command(command: &str) -> bool {
    REGISTERED_PLATFORM_KEYCHAIN_COMMANDS.contains(&command)
}

pub fn validate_platform_keychain_identity(
    key: PlatformKeychainKey,
) -> Result<KeychainKey, String> {
    let key = KeychainKey::new(key.service, key.scope, key.identifier)
        .map_err(|error| error.to_string())?;
    if key.service != ROBOTICS_KEYCHAIN_SERVICE
        || key.scope != INTAKE_INSTALL_SIGNING_KEY_SCOPE
        || key.identifier != INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER
    {
        return Err(
            "platform keychain service/scope/identifier combination is not approved".to_string(),
        );
    }
    Ok(key)
}

pub fn validate_platform_keychain_request(
    key: PlatformKeychainKey,
    secret: Option<bool>,
) -> Result<KeychainKey, String> {
    if secret != Some(true) {
        return Err("keychain IPC requires secret=true".to_string());
    }
    validate_platform_keychain_identity(key)
}

pub fn validate_platform_keychain_delete_request(
    key: PlatformKeychainKey,
) -> Result<KeychainKey, String> {
    validate_platform_keychain_identity(key)
}

pub fn validate_platform_keychain_list_request(
    service: String,
    scope: String,
) -> Result<(String, String), String> {
    let key = validate_platform_keychain_identity(PlatformKeychainKey {
        service,
        scope,
        identifier: INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER.to_string(),
    })?;
    Ok((key.service, key.scope))
}

pub fn validate_platform_keychain_list_response(
    identifiers: Vec<String>,
) -> Result<Vec<String>, String> {
    if identifiers
        .iter()
        .any(|identifier| identifier != INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER)
    {
        return Err("platform keychain returned an unapproved identifier".to_string());
    }
    Ok(identifiers)
}

pub fn platform_keychain_fallback_path(app_data_dir: &Path) -> PathBuf {
    app_data_dir.join("secrets").join("keychain-fallback.json")
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DatasetFormat {
    JsonManifest,
    JsonlEpisodes,
    UnsupportedBinary,
    Unknown,
}

#[derive(Debug, Clone, PartialEq)]
pub struct IndexRow {
    pub episode_id: String,
    pub duration_seconds: Option<f64>,
    pub intervention_count: Option<u32>,
    pub success: Option<bool>,
    pub reviewed: Option<bool>,
    pub sensor_qa_status: SensorQaStatus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SensorQaStatus {
    Pass,
    Warn,
    Fail,
    Unknown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalArchivePlan {
    pub archive_name: String,
    pub artifacts: Vec<&'static str>,
    pub episode_count: usize,
    pub network_transfer: bool,
}

pub fn infer_dataset_format(filenames: &[&str]) -> DatasetFormat {
    if filenames
        .iter()
        .any(|name| name.to_ascii_lowercase().ends_with(".jsonl"))
    {
        return DatasetFormat::JsonlEpisodes;
    }
    if filenames
        .iter()
        .any(|name| name.to_ascii_lowercase().ends_with(".json"))
    {
        return DatasetFormat::JsonManifest;
    }
    if filenames.iter().any(|name| {
        let lower = name.to_ascii_lowercase();
        [".parquet", ".h5", ".hdf5", ".bag", ".db3", ".mp4"]
            .iter()
            .any(|extension| lower.ends_with(extension))
    }) {
        return DatasetFormat::UnsupportedBinary;
    }
    DatasetFormat::Unknown
}

pub fn sort_index_rows(rows: &mut [IndexRow]) {
    rows.sort_by(|left, right| {
        match qa_rank(left.sensor_qa_status).cmp(&qa_rank(right.sensor_qa_status)) {
            Ordering::Equal => left.episode_id.cmp(&right.episode_id),
            ordering => ordering,
        }
    });
}

pub fn build_local_archive_plan(
    episode_count: usize,
    include_interventions: bool,
    include_sensor_qa: bool,
    include_embodiment_card: bool,
) -> LocalArchivePlan {
    let mut artifacts = vec!["review-manifest.json"];
    if include_interventions {
        artifacts.push("interventions.jsonl");
    }
    if include_sensor_qa {
        artifacts.push("sensor-qa.json");
    }
    if include_embodiment_card {
        artifacts.push("EMBODIMENT_CARD.md");
    }
    artifacts.push("checksums.sha256");
    LocalArchivePlan {
        archive_name: "robotics-evidence.zip".to_string(),
        artifacts,
        episode_count,
        network_transfer: false,
    }
}

fn qa_rank(status: SensorQaStatus) -> u8 {
    match status {
        SensorQaStatus::Pass => 0,
        SensorQaStatus::Warn => 1,
        SensorQaStatus::Fail => 2,
        SensorQaStatus::Unknown => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn intake_signing_key() -> PlatformKeychainKey {
        PlatformKeychainKey {
            service: ROBOTICS_KEYCHAIN_SERVICE.to_string(),
            scope: INTAKE_INSTALL_SIGNING_KEY_SCOPE.to_string(),
            identifier: INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER.to_string(),
        }
    }

    #[test]
    fn allows_only_the_intake_install_signing_key_identity() {
        let key = validate_platform_keychain_request(intake_signing_key(), Some(true))
            .expect("approved intake identity");
        assert_eq!(key.service, ROBOTICS_KEYCHAIN_SERVICE);
        assert_eq!(key.scope, INTAKE_INSTALL_SIGNING_KEY_SCOPE);
        assert_eq!(key.identifier, INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER);

        assert!(validate_platform_keychain_delete_request(intake_signing_key()).is_ok());
        assert_eq!(
            validate_platform_keychain_list_request(
                ROBOTICS_KEYCHAIN_SERVICE.to_string(),
                INTAKE_INSTALL_SIGNING_KEY_SCOPE.to_string(),
            )
            .expect("approved intake list"),
            (
                ROBOTICS_KEYCHAIN_SERVICE.to_string(),
                INTAKE_INSTALL_SIGNING_KEY_SCOPE.to_string(),
            )
        );
        assert_eq!(
            validate_platform_keychain_list_response(vec![
                INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER.to_string(),
            ])
            .expect("approved intake identifier"),
            vec![INTAKE_INSTALL_SIGNING_KEY_IDENTIFIER.to_string()]
        );
    }

    #[test]
    fn rejects_invalid_keychain_keys_and_secret_markers() {
        assert!(validate_platform_keychain_request(intake_signing_key(), Some(false)).is_err());
        assert!(validate_platform_keychain_request(intake_signing_key(), None).is_err());

        let invalid_keys = [
            PlatformKeychainKey {
                service: "agent-studio-open".to_string(),
                ..intake_signing_key()
            },
            PlatformKeychainKey {
                scope: "byo-api-keys".to_string(),
                ..intake_signing_key()
            },
            PlatformKeychainKey {
                identifier: "different-install-key".to_string(),
                ..intake_signing_key()
            },
            PlatformKeychainKey {
                service: "robotics studio open".to_string(),
                ..intake_signing_key()
            },
        ];

        for key in invalid_keys {
            assert!(validate_platform_keychain_request(key.clone(), Some(true)).is_err());
            assert!(validate_platform_keychain_delete_request(key).is_err());
        }

        assert!(validate_platform_keychain_list_request(
            "agent-studio-open".to_string(),
            INTAKE_INSTALL_SIGNING_KEY_SCOPE.to_string(),
        )
        .is_err());
        assert!(validate_platform_keychain_list_request(
            ROBOTICS_KEYCHAIN_SERVICE.to_string(),
            "byo-api-keys".to_string(),
        )
        .is_err());
        assert!(validate_platform_keychain_list_response(vec![
            "unexpected-install-key".to_string(),
        ])
        .is_err());
    }

    #[test]
    fn registers_only_the_platform_keychain_commands() {
        assert_eq!(
            REGISTERED_PLATFORM_KEYCHAIN_COMMANDS,
            [
                "platform_keychain_set",
                "platform_keychain_get",
                "platform_keychain_delete",
                "platform_keychain_list",
            ]
        );
        for command in REGISTERED_PLATFORM_KEYCHAIN_COMMANDS {
            assert!(is_registered_platform_keychain_command(command));
        }
        assert!(!is_registered_platform_keychain_command(""));
        assert!(!is_registered_platform_keychain_command(
            "platform_keychain_export"
        ));
    }

    #[test]
    fn places_the_fallback_under_app_data() {
        let app_data_dir = Path::new("app-data");
        assert_eq!(
            platform_keychain_fallback_path(app_data_dir),
            app_data_dir.join("secrets").join("keychain-fallback.json")
        );
    }

    #[test]
    fn recognizes_only_source_build_metadata_formats() {
        assert_eq!(
            infer_dataset_format(&["manifest.json"]),
            DatasetFormat::JsonManifest
        );
        assert_eq!(
            infer_dataset_format(&["episodes.jsonl"]),
            DatasetFormat::JsonlEpisodes
        );
        for filename in [
            "episodes.parquet",
            "demo.hdf5",
            "robot.db3",
            "capture.bag",
            "episode.mp4",
        ] {
            assert_eq!(
                infer_dataset_format(&[filename]),
                DatasetFormat::UnsupportedBinary
            );
        }
    }

    #[test]
    fn local_archive_plan_tracks_real_scope_artifacts() {
        let full = build_local_archive_plan(96, true, true, true);
        assert_eq!(full.episode_count, 96);
        assert!(!full.network_transfer);
        assert!(full.artifacts.contains(&"interventions.jsonl"));
        assert!(full.artifacts.contains(&"sensor-qa.json"));
        assert!(full.artifacts.contains(&"EMBODIMENT_CARD.md"));
        assert!(full.artifacts.contains(&"checksums.sha256"));

        let minimal = build_local_archive_plan(2, false, false, false);
        assert_eq!(
            minimal.artifacts,
            vec!["review-manifest.json", "checksums.sha256"]
        );
    }

    #[test]
    fn sorts_known_quality_before_unknown_then_episode_id() {
        let mut rows = vec![
            IndexRow {
                episode_id: "b".to_string(),
                duration_seconds: None,
                intervention_count: None,
                success: None,
                reviewed: None,
                sensor_qa_status: SensorQaStatus::Unknown,
            },
            IndexRow {
                episode_id: "a".to_string(),
                duration_seconds: Some(10.0),
                intervention_count: Some(1),
                success: Some(false),
                reviewed: Some(false),
                sensor_qa_status: SensorQaStatus::Pass,
            },
        ];
        sort_index_rows(&mut rows);
        assert_eq!(rows[0].episode_id, "a");
    }
}
