use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioDevice {
    pub name: String,
    pub device_type: String,
    pub is_default: bool,
    pub sample_rates: Vec<u32>,
}

/// Get all audio input devices (microphones)
pub fn get_input_devices() -> Vec<AudioDevice> {
    let host = cpal::default_host();
    let mut devices = Vec::new();
    
    // Get default input device
    if let Some(default) = host.default_input_device() {
        if let Ok(name) = default.name() {
            devices.push(AudioDevice {
                name,
                device_type: "input".to_string(),
                is_default: true,
                sample_rates: get_supported_sample_rates(&default),
            });
        }
    }
    
    // Get all input devices
    if let Ok(input_devices) = host.input_devices() {
        for device in input_devices {
            if let Ok(name) = device.name() {
                // Skip if already added as default
                if !devices.iter().any(|d| d.name == name) {
                    devices.push(AudioDevice {
                        name,
                        device_type: "input".to_string(),
                        is_default: false,
                        sample_rates: get_supported_sample_rates(&device),
                    });
                }
            }
        }
    }
    
    devices
}

/// Get all audio output devices (speakers)
pub fn get_output_devices() -> Vec<AudioDevice> {
    let host = cpal::default_host();
    let mut devices = Vec::new();
    
    // Get default output device
    if let Some(default) = host.default_output_device() {
        if let Ok(name) = default.name() {
            devices.push(AudioDevice {
                name,
                device_type: "output".to_string(),
                is_default: true,
                sample_rates: get_supported_sample_rates(&default),
            });
        }
    }
    
    // Get all output devices
    if let Ok(output_devices) = host.output_devices() {
        for device in output_devices {
            if let Ok(name) = device.name() {
                if !devices.iter().any(|d| d.name == name) {
                    devices.push(AudioDevice {
                        name,
                        device_type: "output".to_string(),
                        is_default: false,
                        sample_rates: get_supported_sample_rates(&device),
                    });
                }
            }
        }
    }
    
    devices
}

/// Get supported sample rates for a device
fn get_supported_sample_rates(device: &cpal::Device) -> Vec<u32> {
    let mut rates = Vec::new();
    
    if let Ok(config) = device.default_input_config() {
        rates.push(config.sample_rate().0);
    } else if let Ok(config) = device.default_output_config() {
        rates.push(config.sample_rate().0);
    }
    
    // Add common sample rates
    if rates.is_empty() {
        rates.extend_from_slice(&[44100, 48000]);
    }
    
    rates
}

/// Test audio device by playing a tone
pub fn test_output_device(device_name: &str) -> Result<(), String> {
    let host = cpal::default_host();
    
    // Find device by name
    let device = host.output_devices()
        .map_err(|e| e.to_string())?
        .find(|d| d.name().map(|n| n == device_name).unwrap_or(false))
        .ok_or_else(|| format!("Device not found: {}", device_name))?;
    
    let config = device.default_output_config().map_err(|e| e.to_string())?;
    let sample_rate = config.sample_rate().0;
    let channels = config.channels() as usize;
    
    // Create stream and play a test tone
    let mut sample_clock = 0u32;
    let frequency = 440.0; // A4 note
    
    let err_fn = |err| eprintln!("Audio stream error: {}", err);
    
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => device.build_output_stream(
            &config.into(),
            move |data: &mut [f32], _: &cpal::OutputCallbackInfo| {
                for frame in data.chunks_mut(channels) {
                    let value = ((sample_clock as f32 * frequency * 2.0 * std::f32::consts::PI / sample_rate as f32).sin() * 0.3) as f32;
                    for sample in frame.iter_mut() {
                        *sample = value;
                    }
                    sample_clock += 1;
                }
            },
            err_fn,
            None,
        ),
        _ => return Err("Unsupported sample format".to_string()),
    }.map_err(|e| e.to_string())?;
    
    stream.play().map_err(|e| e.to_string())?;
    
    // Play for 1 second
    std::thread::sleep(std::time::Duration::from_secs(1));
    
    Ok(())
}

/// Monitor audio input level
pub fn monitor_input_level(device_name: Option<&str>) -> Result<f32, String> {
    let host = cpal::default_host();
    
    let device = if let Some(name) = device_name {
        host.input_devices()
            .map_err(|e| e.to_string())?
            .find(|d| d.name().map(|n| n == name).unwrap_or(false))
            .ok_or_else(|| format!("Device not found: {}", name))?
    } else {
        host.default_input_device()
            .ok_or_else(|| "No default input device".to_string())?
    };
    
    let config = device.default_input_config().map_err(|e| e.to_string())?;
    let channels = config.channels() as usize;
    
    let level = std::sync::Arc::new(std::sync::Mutex::new(0.0f32));
    let level_clone = level.clone();
    
    let err_fn = |err| eprintln!("Audio stream error: {}", err);
    
    let stream = match config.sample_format() {
        cpal::SampleFormat::F32 => device.build_input_stream(
            &config.into(),
            move |data: &[f32], _: &cpal::InputCallbackInfo| {
                let mut max = 0.0f32;
                for frame in data.chunks(channels) {
                    for sample in frame {
                        let abs = sample.abs();
                        if abs > max {
                            max = abs;
                        }
                    }
                }
                *level_clone.lock().unwrap() = max;
            },
            err_fn,
            None,
        ),
        _ => return Err("Unsupported sample format".to_string()),
    }.map_err(|e| e.to_string())?;
    
    stream.play().map_err(|e| e.to_string())?;
    
    // Monitor for 100ms
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    let final_level = *level.lock().unwrap();
    
    Ok(final_level)
}
