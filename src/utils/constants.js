// Constantes globales de la aplicación
export const EXTENSION_CONFIG = {
  MAX_TIMELINE_ENTRIES: 100,
  MIN_DURATION_TO_SAVE: 5000, // 5 segundos (solo evita clics accidentales)
  CONSOLIDATION_INTERVAL: 60000, // 1 minuto
  PERIODIC_SAVE_INTERVAL: 300000, // 5 minutos
  DEBUG_LOG_INTERVAL: 30000, // 30 segundos
  SCREENSHOT_UPDATE_INTERVAL: 120000, // 2 minutos
}

export const RECORDING_ACTIONS = {
  RECORDING_STARTED: 'recordingStarted',
  RECORDING_STOPPED: 'recordingStopped',
  GET_RECORDING_STATE: 'getRecordingState',
  CLEAR_RECORDING: 'clearRecording',
  GET_TIMELINE_DATA: 'getTimelineData',
  CLEAR_TIMELINE_DATA: 'clearTimelineData',
  FORCE_REFRESH_ACTIVE_TAB: 'forceRefreshActiveTab',
}

export const STORAGE_KEYS = {
  IS_RECORDING: 'isRecording',
  RECORDED_EVENTS: 'recordedEvents',
  HAS_RECORDING: 'hasRecording',
  CURRENT_SESSION: 'currentSession',
  EXTENSION_SETTINGS: 'extensionSettings',
}

export const URL_PATTERNS = {
  CHROME_INTERNAL: /^chrome:\/\//,
  CHROME_EXTENSION: /^chrome-extension:\/\//,
  NEW_TAB: /^chrome:\/\/newtab\//,
  ABOUT_BLANK: /^about:blank$/,
}
