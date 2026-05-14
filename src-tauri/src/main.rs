const STARTUP_PROBE_FLAG: &str = "--benchmark-startup-probe";

fn main() {
    if std::env::args().any(|arg| arg == STARTUP_PROBE_FLAG) {
        println!(
            "{{\"product\":\"Robotics Studio Open\",\"probe\":\"packaged-startup\",\"ok\":true}}"
        );
        return;
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("failed to run Robotics Studio Open desktop shell");
}
