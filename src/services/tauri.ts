/**
 * Tauri API wrapper for desktop-specific features
 * Falls back to browser APIs when running in web mode
 */

// Check if running in Tauri
export const isTauri = (): boolean => {
  return !!(window as any).__TAURI__;
};

// Invoke Tauri command
const invoke = async <T>(cmd: string, args?: Record<string, any>): Promise<T> => {
  if (!isTauri()) {
    console.warn(`[Tauri] Command ${cmd} called in web mode`);
    return null as T;
  }
  return (window as any).__TAURI__.invoke(cmd, args);
};

// Listen to Tauri events
export const listen = (event: string, handler: (payload: any) => void) => {
  if (!isTauri()) {
    return () => {};
  }
  return (window as any).__TAURI__.event.listen(event, (e: any) => handler(e.payload));
};

// Emit Tauri event
export const emit = (event: string, payload?: any) => {
  if (!isTauri()) return;
  return (window as any).__TAURI__.event.emit(event, payload);
};

/**
 * Desktop API
 */
export const desktopAPI = {
  /**
   * Check if running in desktop mode
   */
  isDesktop: isTauri,

  /**
   * Check if microphone is available
   */
  checkMicrophoneAvailability: async (): Promise<boolean> => {
    if (!isTauri()) {
      // В браузере проверяем через navigator.mediaDevices
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    return invoke<boolean>('check_microphone_availability');
  },

  /**
   * Get list of available microphones
   */
  getAvailableMicrophones: async (): Promise<string[]> => {
    if (!isTauri()) {
      // В браузере получаем через navigator.mediaDevices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices
          .filter(d => d.kind === 'audioinput')
          .map(d => d.label || `Microphone ${d.deviceId.slice(0, 8)}`);
      } catch (e) {
        console.error('[Tauri] Failed to get microphones:', e);
        return [];
      }
    }
    return invoke<string[]>('get_available_microphones');
  },

  /**
   * Check if screen capture is available
   */
  checkScreenCaptureAvailability: async (): Promise<boolean> => {
    if (!isTauri()) {
      // В браузере проверяем через navigator.mediaDevices.getDisplayMedia
      return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    }
    return invoke<boolean>('check_screen_capture_availability');
  },

  /**
   * Get application version
   */
  getVersion: async (): Promise<string> => {
    return invoke<string>('get_app_version');
  },

  /**
   * Get system information
   */
  getSystemInfo: async () => {
    return invoke<{
      os_name: string;
      os_version: string;
      cpu_count: number;
      cpu_usage: number;
      total_memory: number;
      used_memory: number;
      app_version: string;
    }>('get_system_info');
  },

  /**
   * Toggle mute state
   */
  toggleMute: async (): Promise<boolean> => {
    return invoke<boolean>('toggle_mute');
  },

  /**
   * Toggle deafen state
   */
  toggleDeafen: async (): Promise<boolean> => {
    return invoke<boolean>('toggle_deafen');
  },

  /**
   * Set push-to-talk hotkey
   */
  setPushToTalkKey: async (key: string): Promise<void> => {
    return invoke<void>('set_push_to_talk_key', { key });
  },

  /**
   * Get current push-to-talk hotkey
   */
  getPushToTalkKey: async (): Promise<string> => {
    return invoke<string>('get_push_to_talk_key');
  },

  /**
   * Set server URL
   */
  setServerUrl: async (url: string): Promise<void> => {
    return invoke<void>('set_server_url', { url });
  },

  /**
   * Get server URL
   */
  getServerUrl: async (): Promise<string> => {
    return invoke<string>('get_server_url');
  },

  /**
   * Get list of audio devices
   */
  getAudioDevices: async () => {
    return invoke<Array<{
      name: string;
      device_type: string;
      is_default: boolean;
    }>>('get_audio_devices');
  },

  /**
   * Show native notification
   */
  showNotification: async (title: string, body: string): Promise<void> => {
    return invoke<void>('show_notification', { title, body });
  },

  /**
   * Set autostart on system boot
   */
  setAutostart: async (enabled: boolean): Promise<void> => {
    return invoke<void>('set_autostart', { enabled });
  },

  /**
   * Get autostart status
   */
  getAutostart: async (): Promise<boolean> => {
    return invoke<boolean>('get_autostart');
  },

  /**
   * Minimize window to system tray
   */
  minimizeToTray: async (): Promise<void> => {
    return invoke<void>('minimize_to_tray');
  },

  /**
   * Flash tray icon for notifications
   */
  flashTrayIcon: async (): Promise<void> => {
    return invoke<void>('flash_tray_icon');
  },

  /**
   * Listen to mute toggled events
   */
  onMuteToggled: (handler: (muted: boolean) => void) => {
    return listen('mute-toggled', handler);
  },

  /**
   * Listen to deafen toggled events
   */
  onDeafenToggled: (handler: (deafened: boolean) => void) => {
    return listen('deafen-toggled', handler);
  },

  /**
   * Listen to push-to-talk events
   */
  onPushToTalk: (handler: (active: boolean) => void) => {
    return listen('push-to-talk', handler);
  },

  /**
   * Listen to notifications
   */
  onNotification: (handler: (message: string) => void) => {
    return listen('notification', handler);
  },

  /**
   * Listen to native notifications
   */
  onNativeNotification: (handler: (payload: { title: string; body: string }) => void) => {
    return listen('native-notification', handler);
  },
};

export default desktopAPI;
