use crate::AppState;
use tauri::{AppHandle, Manager, CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};

/// Update system tray menu with current state
pub fn update_tray_menu(app: &AppHandle) {
    let state = app.state::<AppState>();
    
    let is_muted = *state.is_muted.lock().unwrap();
    let is_deafened = *state.is_deafened.lock().unwrap();
    let is_streaming = *state.is_streaming.lock().unwrap();
    
    // Build status text
    let mut status_parts = Vec::new();
    if is_muted {
        status_parts.push("🔇 Микрофон");
    }
    if is_deafened {
        status_parts.push("🔇 Звук");
    }
    if is_streaming {
        status_parts.push("📺 Трансляция");
    }
    
    let status_text = if status_parts.is_empty() {
        "● Не подключен".to_string()
    } else {
        format!("● {}", status_parts.join(" | "))
    };
    
    // Update tray tooltip
    let tooltip = if status_parts.is_empty() {
        "VoiceHub - Не подключен".to_string()
    } else {
        format!("VoiceHub - {}", status_parts.join(", "))
    };
    let _ = app.tray_handle().set_tooltip(&tooltip);
    
    // Rebuild tray menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(CustomMenuItem::new("show".to_string(), "Показать VoiceHub"))
        .add_item(
            CustomMenuItem::new("mute".to_string(), 
                if is_muted { "✓ Микрофон выключен" } else { "  Выключить микрофон" }
            )
        )
        .add_item(
            CustomMenuItem::new("deafen".to_string(),
                if is_deafened { "✓ Звук выключен" } else { "  Выключить звук" }
            )
        )
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("status".to_string(), status_text).disabled())
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(CustomMenuItem::new("quit".to_string(), "Выход"));
    
    let _ = app.tray_handle().set_menu(tray_menu);
}
