#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod tray;
mod audio;

use tauri::{Manager, CustomMenuItem, SystemTray, SystemTrayMenu, SystemTrayEvent, SystemTrayMenuItem, GlobalShortcutManager};
use std::sync::{Arc, Mutex};

/// Application state shared across commands
pub struct AppState {
    pub is_muted: Arc<Mutex<bool>>,
    pub is_deafened: Arc<Mutex<bool>>,
    pub is_streaming: Arc<Mutex<bool>>,
    pub push_to_talk_key: Arc<Mutex<String>>,
    pub push_to_talk_active: Arc<Mutex<bool>>,
    pub server_url: Arc<Mutex<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            is_muted: Arc::new(Mutex::new(false)),
            is_deafened: Arc::new(Mutex::new(false)),
            is_streaming: Arc::new(Mutex::new(false)),
            push_to_talk_key: Arc::new(Mutex::new("Space".to_string())),
            push_to_talk_active: Arc::new(Mutex::new(false)),
            server_url: Arc::new(Mutex::new("http://localhost:8080".to_string())),
        }
    }
}

fn main() {
    // Build system tray menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show".to_string(), "Показать VoiceHub"))
        .add_item(CustomMenuItem::new("mute".to_string(), "Выключить микрофон"))
        .add_item(CustomMenuItem::new("deafen".to_string(), "Выключить звук"))
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("status".to_string(), "● Не подключен").disabled())
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Выход"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .manage(AppState::default())
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                // Show window on tray click
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            SystemTrayEvent::RightClick { .. } => {
                // Update tray menu with current state
                tray::update_tray_menu(app);
            }
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "show" => {
                        if let Some(window) = app.get_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "mute" => {
                        let state = app.state::<AppState>();
                        let mut is_muted = state.is_muted.lock().unwrap();
                        *is_muted = !*is_muted;
                        let muted = *is_muted;
                        drop(is_muted);
                        
                        // Emit event to frontend
                        let _ = app.emit_all("mute-toggled", muted);
                        
                        // Show notification
                        let _ = app.emit_all("notification", format!(
                            "Микрофон {}", if muted { "выключен" } else { "включен" }
                        ));
                        
                        // Update tray menu
                        tray::update_tray_menu(app);
                    }
                    "deafen" => {
                        let state = app.state::<AppState>();
                        let mut is_deafened = state.is_deafened.lock().unwrap();
                        *is_deafened = !*is_deafened;
                        let deafened = *is_deafened;
                        drop(is_deafened);
                        
                        let _ = app.emit_all("deafen-toggled", deafened);
                        tray::update_tray_menu(app);
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
            _ => {}
        })
        .on_window_event(|event| {
            match event.event() {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    // Hide window instead of closing (minimize to tray)
                    event.window().hide().unwrap();
                    api.prevent_close();
                    
                    // Show notification that app is still running
                    #[cfg(target_os = "linux")]
                    {
                        let _ = event.window().app_handle().emit_all(
                            "notification",
                            "VoiceHub продолжает работать в трее"
                        );
                    }
                }
                _ => {}
            }
        })
        .setup(|app| {
            // Global shortcuts are now optional and disabled by default
            // Users can enable them in settings if needed
            
            // Set tray tooltip
            let _ = app.tray_handle().set_tooltip("VoiceHub - Не подключен");
            
            // Show notification on startup
            #[cfg(any(target_os = "linux", target_os = "macos", target_os = "windows"))]
            {
                let _ = app.emit_all("notification", "VoiceHub запущен");
            }
            
            println!("🚀 VoiceHub Desktop started");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_version,
            commands::get_system_info,
            commands::toggle_mute,
            commands::toggle_deafen,
            commands::set_push_to_talk_key,
            commands::get_push_to_talk_key,
            commands::set_server_url,
            commands::get_server_url,
            commands::get_audio_devices,
            commands::show_notification,
            commands::set_autostart,
            commands::get_autostart,
            commands::minimize_to_tray,
            commands::flash_tray_icon,
        ])
        .run(tauri::generate_context!())
        .expect("error while running VoiceHub");
}
