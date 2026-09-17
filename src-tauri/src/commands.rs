use crate::AppState;
use tauri::{command, AppHandle, Manager};
use serde::{Deserialize, Serialize};
use sysinfo::System;
use auto_launch::AutoLaunchBuilder;
use cpal::traits::{HostTrait, DeviceTrait};
use reqwest;
use std::time::Duration;

/// Проверить доступность микрофона
#[command]
pub fn check_microphone_availability() -> Result<bool, String> {
    let host = cpal::default_host();
    
    // Проверяем наличие устройств захвата
    match host.input_devices() {
        Ok(devices) => {
            let count = devices.count();
            Ok(count > 0)
        }
        Err(e) => {
            Err(format!("Не удалось получить список устройств: {}", e))
        }
    }
}

/// Получить список доступных микрофонов
#[command]
pub fn get_available_microphones() -> Result<Vec<String>, String> {
    let host = cpal::default_host();
    
    match host.input_devices() {
        Ok(devices) => {
            let names: Vec<String> = devices
                .filter_map(|d| d.name().ok())
                .collect();
            Ok(names)
        }
        Err(e) => {
            Err(format!("Не удалось получить список устройств: {}", e))
        }
    }
}

/// Проверить доступность захвата экрана
#[command]
pub fn check_screen_capture_availability() -> bool {
    // В Windows захват экрана доступен через Desktop Duplication API
    // или через DXGI
    cfg!(target_os = "windows") || cfg!(target_os = "macos") || cfg!(target_os = "linux")
}

/// Получить информацию о микрофоне
#[command]
pub fn get_microphone_info() -> Result<serde_json::Value, String> {
    let host = cpal::default_host();
    
    let mut info = serde_json::json!({
        "available": false,
        "devices": [],
        "default_device": null
    });
    
    // Проверяем наличие устройств захвата
    match host.input_devices() {
        Ok(devices) => {
            let device_list: Vec<String> = devices
                .filter_map(|d| d.name().ok())
                .collect();
            
            info["available"] = serde_json::json!(!device_list.is_empty());
            info["devices"] = serde_json::json!(device_list);
            
            // Получаем устройство по умолчанию
            if let Some(default) = host.default_input_device() {
                if let Ok(name) = default.name() {
                    info["default_device"] = serde_json::json!(name);
                }
            }
        }
        Err(e) => {
            return Err(format!("Не удалось получить список устройств: {}", e));
        }
    }
    
    Ok(info)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub cpu_count: usize,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub app_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub name: String,
    pub device_type: String, // "input" or "output"
    pub is_default: bool,
}

/// Get application version
#[command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get system information
#[command]
pub fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Calculate average CPU usage
    let cpu_usage = if !sys.cpus().is_empty() {
        sys.cpus().iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / sys.cpus().len() as f32
    } else {
        0.0
    };
    
    SystemInfo {
        os_name: System::name().unwrap_or_else(|| "Unknown".to_string()),
        os_version: System::os_version().unwrap_or_else(|| "Unknown".to_string()),
        cpu_count: sys.cpus().len(),
        cpu_usage,
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

/// Toggle mute state
#[command]
pub fn toggle_mute(state: tauri::State<AppState>, app: AppHandle) -> bool {
    let mut is_muted = state.is_muted.lock().unwrap();
    *is_muted = !*is_muted;
    let muted = *is_muted;
    drop(is_muted);
    
    // Emit event to frontend
    let _ = app.emit_all("mute-toggled", muted);
    
    // Update tray
    crate::tray::update_tray_menu(&app);
    
    muted
}

/// Toggle deafen state
#[command]
pub fn toggle_deafen(state: tauri::State<AppState>, app: AppHandle) -> bool {
    let mut is_deafened = state.is_deafened.lock().unwrap();
    *is_deafened = !*is_deafened;
    let deafened = *is_deafened;
    drop(is_deafened);
    
    let _ = app.emit_all("deafen-toggled", deafened);
    crate::tray::update_tray_menu(&app);
    
    deafened
}

/// Set push-to-talk hotkey
#[command]
pub fn set_push_to_talk_key(state: tauri::State<AppState>, key: String) -> Result<(), String> {
    let mut current_key = state.push_to_talk_key.lock().unwrap();
    *current_key = key.clone();
    drop(current_key);
    
    // TODO: Re-register global shortcut with new key
    // This requires unregistering old and registering new
    
    Ok(())
}

/// Get current push-to-talk hotkey
#[command]
pub fn get_push_to_talk_key(state: tauri::State<AppState>) -> String {
    state.push_to_talk_key.lock().unwrap().clone()
}

/// Set server URL
#[command]
pub fn set_server_url(state: tauri::State<AppState>, url: String) {
    let mut server_url = state.server_url.lock().unwrap();
    *server_url = url;
}

/// Get server URL
#[command]
pub fn get_server_url(state: tauri::State<AppState>) -> String {
    state.server_url.lock().unwrap().clone()
}

/// Get list of audio devices using cpal
#[command]
pub fn get_audio_devices() -> Vec<AudioDeviceInfo> {
    let mut devices = Vec::new();
    
    // Get input devices (microphones)
    if let Ok(host) = cpal::default_host().input_devices() {
        for device in host {
            if let Ok(name) = device.name() {
                devices.push(AudioDeviceInfo {
                    name,
                    device_type: "input".to_string(),
                    is_default: false,
                });
            }
        }
    }
    
    // Get output devices (speakers)
    if let Ok(host) = cpal::default_host().output_devices() {
        for device in host {
            if let Ok(name) = device.name() {
                devices.push(AudioDeviceInfo {
                    name,
                    device_type: "output".to_string(),
                    is_default: false,
                });
            }
        }
    }
    
    devices
}

/// Show native notification
#[command]
pub fn show_notification(app: AppHandle, title: String, body: String) {
    let _ = app.emit_all("native-notification", serde_json::json!({
        "title": title,
        "body": body
    }));
}

/// Set application to start on system boot
#[command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    
    let auto = AutoLaunchBuilder::new()
        .set_app_name("VoiceHub")
        .set_app_path(&current_exe.to_string_lossy())
        .build()
        .map_err(|e| e.to_string())?;
    
    if enabled {
        auto.enable().map_err(|e| e.to_string())?;
    } else {
        auto.disable().map_err(|e| e.to_string())?;
    }
    
    Ok(())
}

/// Get autostart status
#[command]
pub fn get_autostart() -> Result<bool, String> {
    let current_exe = std::env::current_exe().map_err(|e| e.to_string())?;
    
    let auto = AutoLaunchBuilder::new()
        .set_app_name("VoiceHub")
        .set_app_path(&current_exe.to_string_lossy())
        .build()
        .map_err(|e| e.to_string())?;
    
    auto.is_enabled().map_err(|e| e.to_string())
}

/// Minimize window to system tray
#[command]
pub fn minimize_to_tray(app: AppHandle) {
    if let Some(window) = app.get_window("main") {
        let _ = window.hide();
    }
}

/// Flash tray icon (for notifications)
#[command]
pub fn flash_tray_icon(app: AppHandle) {
    // On Windows, this would use taskbar flashing
    // On Linux, this would use urgency hints
    // For now, just show a notification
    let _ = app.emit_all("notification", "Новое событие в VoiceHub");
}

/// Check server health via Rust backend (bypasses WebView2 restrictions)
#[command]
pub async fn check_server_health(url: String) -> Result<serde_json::Value, String> {
    println!("[Rust] Checking server health: {}", url);
    
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client
        .get(&url)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| {
            println!("[Rust] HTTP request failed: {}", e);
            format!("HTTP request failed: {}", e)
        })?;
    
    let status = response.status();
    println!("[Rust] Response status: {}", status);
    
    if !status.is_success() {
        return Err(format!("Server returned status: {}", status));
    }
    
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    println!("[Rust] Response : {:?}", data);
    Ok(data)
}

/// Generic HTTP request via Rust backend
#[command]
pub async fn http_request(
    url: String,
    method: String,
    headers: Option<serde_json::Value>,
    body: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    println!("[Rust] HTTP {} request: {}", method, url);
    
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let mut request = match method.to_uppercase().as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        _ => return Err(format!("Unsupported method: {}", method)),
    };
    
    // Add headers if provided
    if let Some(headers_json) = headers {
        if let Some(headers_obj) = headers_json.as_object() {
            for (key, value) in headers_obj {
                if let Some(value_str) = value.as_str() {
                    request = request.header(key, value_str);
                }
            }
        }
    }
    
    // Add body if provided
    if let Some(body_json) = body {
        request = request.json(&body_json);
    }
    
    let response = request.send().await.map_err(|e| {
        println!("[Rust] HTTP request failed: {}", e);
        format!("HTTP request failed: {}", e)
    })?;
    
    let status = response.status();
    println!("[Rust] Response status: {}", status);
    
    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    Ok(serde_json::json!({
        "status": status.as_u16(),
        "data": data
    }))
}
