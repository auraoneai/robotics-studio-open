#[cfg(feature = "tauri-runtime")]
use auraone_platform_keychain::{Keychain, NativeKeychainBackend};
#[cfg(feature = "tauri-runtime")]
use robotics_studio_core::{
    platform_keychain_fallback_path, validate_platform_keychain_delete_request,
    validate_platform_keychain_list_request, validate_platform_keychain_list_response,
    validate_platform_keychain_request, PlatformKeychainKey,
};
#[cfg(feature = "tauri-runtime")]
use tauri::Manager;

#[cfg(feature = "tauri-runtime")]
#[tauri::command]
fn platform_keychain_set(
    app: tauri::AppHandle,
    key: PlatformKeychainKey,
    value: String,
    secret: Option<bool>,
) -> Result<(), String> {
    let key = validate_platform_keychain_request(key, secret)?;
    platform_keychain(&app)?
        .set(&key, &value)
        .map_err(redact_keychain_error)
}

#[cfg(feature = "tauri-runtime")]
#[tauri::command]
fn platform_keychain_get(
    app: tauri::AppHandle,
    key: PlatformKeychainKey,
    secret: Option<bool>,
) -> Result<Option<String>, String> {
    let key = validate_platform_keychain_request(key, secret)?;
    platform_keychain(&app)?
        .get(&key)
        .map(|value| value.map(|secret| secret.expose().to_string()))
        .map_err(redact_keychain_error)
}

#[cfg(feature = "tauri-runtime")]
#[tauri::command]
fn platform_keychain_delete(app: tauri::AppHandle, key: PlatformKeychainKey) -> Result<(), String> {
    let key = validate_platform_keychain_delete_request(key)?;
    platform_keychain(&app)?
        .delete(&key)
        .map_err(redact_keychain_error)
}

#[cfg(feature = "tauri-runtime")]
#[tauri::command]
fn platform_keychain_list(
    app: tauri::AppHandle,
    service: String,
    scope: String,
) -> Result<Vec<String>, String> {
    let (service, scope) = validate_platform_keychain_list_request(service, scope)?;
    let identifiers = platform_keychain(&app)?
        .list(&service, &scope)
        .map_err(redact_keychain_error)?;
    validate_platform_keychain_list_response(identifiers)
}

#[cfg(feature = "tauri-runtime")]
fn platform_keychain(app: &tauri::AppHandle) -> Result<Keychain<NativeKeychainBackend>, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("failed to resolve app data dir: {error}"))?;
    Ok(Keychain::new(NativeKeychainBackend::for_current_os(
        platform_keychain_fallback_path(&app_data_dir),
    )))
}

#[cfg(feature = "tauri-runtime")]
fn redact_keychain_error(error: impl std::fmt::Display) -> String {
    format!("platform keychain operation failed: {error}")
}

#[cfg(feature = "tauri-runtime")]
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            platform_keychain_set,
            platform_keychain_get,
            platform_keychain_delete,
            platform_keychain_list
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Robotics Studio Open");
}

#[cfg(not(feature = "tauri-runtime"))]
fn main() {
    println!(
        "Robotics Studio Open source-build Rust contracts; no native robotics engine is connected."
    );
}
