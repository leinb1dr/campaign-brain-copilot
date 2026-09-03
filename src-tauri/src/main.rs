#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(feature = "desktop-app")]
fn main() {
    campaign_brain_copilot_lib::run()
}

#[cfg(not(feature = "desktop-app"))]
fn main() {}
