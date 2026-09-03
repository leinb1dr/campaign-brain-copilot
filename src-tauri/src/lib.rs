pub mod commands;
pub mod db;
pub mod models;
pub mod parser;

#[cfg_attr(all(feature = "desktop-app", mobile), tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(feature = "desktop-app")]
    {
        tauri::Builder::default()
            .invoke_handler(tauri::generate_handler![
                commands::approve_suggestion,
                commands::create_campaign,
                commands::generate_suggestions,
                commands::get_location_briefing,
                commands::open_campaign,
                commands::open_example_campaign,
                commands::read_campaign_notes,
            ])
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
