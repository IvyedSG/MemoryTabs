/* global chrome */
import { SessionManager } from '../models/SessionManager.js'
import { TabManager } from '../models/TabManager.js'
import { StorageManager } from '../utils/storage.js'
import { ScreenshotManager } from '../utils/screenshot.js'
import { RECORDING_ACTIONS, EXTENSION_CONFIG } from '../utils/constants.js'

console.log('Memory Tabs background script loaded')

/**
 * Clase principal del background script
 */
class BackgroundService {
  constructor() {
    this.sessionManager = new SessionManager()
    this.tabManager = new TabManager(this.sessionManager)
    this.isRecording = false
    this.recordedEvents = []
    this.intervals = []

    this.initialize()
  }

  /**
   * Inicializa el servicio de background
   */
  async initialize() {
    console.log('Cargando estado guardado...')

    try {
      // Restaurar estado de grabación
      const recordingState = await StorageManager.getRecordingState()
      this.isRecording = recordingState.isRecording
      this.recordedEvents = recordingState.events

      // Restaurar o crear sesión
      const restored = await this.sessionManager.restoreSession()
      if (!restored) {
        console.log('No hay sesión guardada, creando nueva')
        await this.sessionManager.initializeSession()
      } else {
        console.log('Sesión restaurada con', restored.timeline?.length || 0, 'entradas')
      }

      // Inicializar gestión de pestañas
      await this.tabManager.initializeWithCurrentTabs()

      // Validar permisos para screenshots
      await ScreenshotManager.validatePermissions()

      // Cargar configuración guardada
      await this.loadSettings()

      // Configurar listeners de eventos
      this.setupEventListeners()

      // Configurar intervalos periódicos
      this.setupPeriodicTasks()

      console.log('Background service inicializado correctamente')
    } catch (error) {
      console.error('Error inicializando background service:', error)
    }
  }

  /**
   * Configura los listeners de eventos de Chrome
   */
  setupEventListeners() {
    // Eventos de pestañas
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.tabManager.onTabActivated(activeInfo.tabId)
    })

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      this.tabManager.onTabUpdated(tabId, changeInfo)
    })

    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabManager.onTabRemoved(tabId)
    })

    // Eventos de ventanas
    chrome.windows.onFocusChanged.addListener((windowId) => {
      this.tabManager.onWindowFocusChanged(windowId)
    })

    // Mensajes del popup y content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse)
      return true // Indica que la respuesta será asíncrona
    })

    // Instalación/actualización de extensión
    chrome.runtime.onInstalled.addListener(() => {
      this.handleExtensionInstalled()
    })

    // Suspensión de extensión
    chrome.runtime.onSuspend.addListener(() => {
      this.handleExtensionSuspend()
    })
  }

  /**
   * Configura las tareas periódicas
   */
  setupPeriodicTasks() {
    // Consolidación periódica de entradas
    const consolidationInterval = setInterval(() => {
      this.sessionManager.consolidateEntries()
    }, EXTENSION_CONFIG.CONSOLIDATION_INTERVAL)
    this.intervals.push(consolidationInterval)

    // Verificación periódica de estado (SIN guardado automático)
    const statusCheckInterval = setInterval(() => {
      if (!this.tabManager.getActiveTabInfo().domain) {
        // Si no hay pestaña activa, intentar reinicializar
        console.log('No hay pestaña activa registrada, intentando reinicializar')
        this.tabManager.initializeWithCurrentTabs()
      } else {
        // Solo loggear estado actual para debugging
        const activeInfo = this.tabManager.getActiveTabInfo()
        const now = Date.now()
        let totalTime = activeInfo.accumulatedTime
        if (activeInfo.isActive) {
          totalTime += now - activeInfo.lastActiveTime
        }
        console.log(
          `Estado actual: ${activeInfo.domain} - ${Math.round(totalTime / 60000)} minutos acumulados`,
        )
      }
    }, 60000) // Verificar cada minuto
    this.intervals.push(statusCheckInterval)

    // Actualización periódica de screenshots
    const screenshotInterval = setInterval(async () => {
      const activeInfo = this.tabManager.getActiveTabInfo()
      if (activeInfo && activeInfo.tabId && activeInfo.windowId) {
        const now = Date.now()
        const duration = now - activeInfo.startTime

        // Si lleva más de 2 minutos activa, actualizar el screenshot
        if (duration > EXTENSION_CONFIG.SCREENSHOT_UPDATE_INTERVAL) {
          console.log('Actualizando screenshot de pestaña activa por larga duración')
          await this.tabManager.captureScreenshot()
        }
      }
    }, EXTENSION_CONFIG.SCREENSHOT_UPDATE_INTERVAL)
    this.intervals.push(screenshotInterval)

    // Log de estado para debugging
    const debugInterval = setInterval(() => {
      this.tabManager.logCurrentState()
    }, EXTENSION_CONFIG.DEBUG_LOG_INTERVAL)
    this.intervals.push(debugInterval)
  }

  /**
   * Maneja los mensajes recibidos
   * @param {object} message - El mensaje recibido
   * @param {object} sender - Información del emisor
   * @param {function} sendResponse - Función para enviar respuesta
   */
  async handleMessage(message, sender, sendResponse) {
    console.log('Background recibió mensaje:', message)
    console.log('Acción específica:', message.action, 'Tipo:', typeof message.action)

    // Asegurar que el tab manager esté inicializado
    if (!this.tabManager.isInitialized()) {
      await this.tabManager.initializeWithCurrentTabs()
    }

    try {
      switch (message.action) {
        case RECORDING_ACTIONS.RECORDING_STARTED:
          await this.handleRecordingStarted(message, sendResponse)
          break

        case RECORDING_ACTIONS.RECORDING_STOPPED:
          await this.handleRecordingStopped(message, sendResponse)
          break

        case RECORDING_ACTIONS.GET_RECORDING_STATE:
          await this.handleGetRecordingState(sendResponse)
          break

        case RECORDING_ACTIONS.CLEAR_RECORDING:
          await this.handleClearRecording(sendResponse)
          break

        case RECORDING_ACTIONS.GET_TIMELINE_DATA:
          await this.handleGetTimelineData(sendResponse)
          break

        case RECORDING_ACTIONS.CLEAR_TIMELINE_DATA:
          await this.handleClearTimelineData(sendResponse)
          break

        case RECORDING_ACTIONS.FORCE_REFRESH_ACTIVE_TAB:
          await this.handleForceRefreshActiveTab(sendResponse)
          break

        case 'updateSettings':
          console.log('✅ Caso updateSettings reconocido, procesando...')
          await this.handleUpdateSettings(message, sendResponse)
          break

        default:
          console.warn('Acción no reconocida:', message.action)
          console.log('Mensaje completo:', message)
          sendResponse({ error: 'Acción no reconocida' })
      }
    } catch (error) {
      console.error('Error manejando mensaje:', error)
      sendResponse({ error: error.message })
    }
  }

  /**
   * Maneja el inicio de grabación
   */
  async handleRecordingStarted(message, sendResponse) {
    this.isRecording = true
    this.recordedEvents = []

    await StorageManager.saveRecordingState(true, [], false)
    console.log('Estado de grabación guardado (iniciado)')

    sendResponse({ status: 'success' })
  }

  /**
   * Maneja el fin de grabación
   */
  async handleRecordingStopped(message, sendResponse) {
    this.isRecording = false
    this.recordedEvents = message.data || []

    await StorageManager.saveRecordingState(false, this.recordedEvents, true)
    console.log('Estado de grabación guardado (detenido)', this.recordedEvents.length)

    sendResponse({ status: 'success' })
  }

  /**
   * Obtiene el estado de grabación
   */
  async handleGetRecordingState(sendResponse) {
    const state = await StorageManager.getRecordingState()
    console.log('Enviando estado de grabación:', state)
    sendResponse(state)
  }

  /**
   * Limpia la grabación
   */
  async handleClearRecording(sendResponse) {
    this.recordedEvents = []
    await StorageManager.saveRecordingState(false, [], false)
    sendResponse({ status: 'success' })
  }

  /**
   * Obtiene datos del timeline
   */
  async handleGetTimelineData(sendResponse) {
    try {
      const session = this.sessionManager.getCurrentSession()
      console.log('Enviando respuesta de timeline, entradas:', session?.timeline?.length || 0)
      sendResponse({
        session: session || { sessionId: null, timeline: [] },
      })
    } catch (error) {
      console.error('Error obteniendo datos del timeline:', error)
      sendResponse({ error: 'Error obteniendo datos del timeline: ' + error.message })
    }
  }

  /**
   * Limpia datos del timeline
   */
  async handleClearTimelineData(sendResponse) {
    try {
      console.log('🔥 BACKGROUND: Limpiando datos de timeline...')
      console.log(
        '🔥 BACKGROUND: Sesión actual antes de limpiar:',
        this.sessionManager.currentSession,
      )
      console.log(
        '🔥 BACKGROUND: Timeline actual antes de limpiar:',
        this.sessionManager.timeline?.length || 0,
        'entradas',
      )

      await this.sessionManager.clearTimeline()
      console.log('🔥 BACKGROUND: clearTimeline() ejecutado')

      await this.sessionManager.initializeSession()
      console.log('🔥 BACKGROUND: initializeSession() ejecutado')

      // Reiniciar tiempo de pestaña activa si existe
      const activeInfo = this.tabManager.getActiveTabInfo()
      if (activeInfo.domain) {
        activeInfo.startTime = Date.now()
        console.log('🔥 BACKGROUND: startTime reiniciado para pestaña activa')
      } else {
        await this.tabManager.initializeWithCurrentTabs()
        console.log('🔥 BACKGROUND: tabManager reinicializado')
      }

      console.log(
        '🔥 BACKGROUND: Timeline después de limpiar:',
        this.sessionManager.timeline?.length || 0,
        'entradas',
      )
      console.log('🔥 BACKGROUND: Sesión después de limpiar:', this.sessionManager.currentSession)

      sendResponse({ status: 'success' })
    } catch (error) {
      console.error('🔥 BACKGROUND: Error limpiando datos del timeline:', error)
      sendResponse({ error: 'Error limpiando datos: ' + error.message })
    }
  }

  /**
   * Fuerza actualización de pestaña activa
   */
  async handleForceRefreshActiveTab(sendResponse) {
    try {
      console.log('Forzando actualización de pestaña activa')

      return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          try {
            if (tabs.length > 0) {
              await this.tabManager.updateActiveTabInfo(tabs[0].id)
              sendResponse({ status: 'success' })
            } else {
              sendResponse({ error: 'No hay pestaña activa' })
            }
          } catch (error) {
            console.error('Error actualizando pestaña activa:', error)
            sendResponse({ error: 'Error actualizando pestaña: ' + error.message })
          }
          resolve()
        })
      })
    } catch (error) {
      console.error('Error en handleForceRefreshActiveTab:', error)
      sendResponse({ error: 'Error forzando actualización: ' + error.message })
    }
  }

  /**
   * Carga la configuración guardada
   */
  async loadSettings() {
    try {
      console.log('🔧 Cargando configuración inicial...')
      const result = await StorageManager.get(['extensionSettings'])
      console.log('🔧 Resultado del storage:', result)

      if (result.extensionSettings) {
        console.log('✅ Configuración encontrada:', result.extensionSettings)

        // Aplicar configuración de screenshots
        if (result.extensionSettings.disableScreenshots !== undefined) {
          ScreenshotManager.setEnabled(!result.extensionSettings.disableScreenshots)
          console.log(
            '📸 Screenshots',
            result.extensionSettings.disableScreenshots ? 'DESHABILITADOS' : 'HABILITADOS',
          )
        }
      } else {
        console.log('⚠️ No hay configuración guardada, usando valores por defecto')
        console.log('📸 Screenshots habilitados por defecto')
      }
    } catch (error) {
      console.error('❌ Error cargando configuración:', error)
    }
  }

  /**
   * Maneja la actualización de configuración
   * @param {object} message - Mensaje recibido
   * @param {function} sendResponse - Función para enviar respuesta
   */
  async handleUpdateSettings(message, sendResponse) {
    try {
      console.log('Actualizando configuración:', message.settings)

      // Guardar configuración en storage
      await StorageManager.save({ extensionSettings: message.settings })

      // Aplicar configuración inmediatamente
      if (message.settings.disableScreenshots !== undefined) {
        ScreenshotManager.setEnabled(!message.settings.disableScreenshots)
        console.log(
          'Screenshots',
          message.settings.disableScreenshots ? 'deshabilitados' : 'habilitados',
        )
      }

      sendResponse({ status: 'success' })
    } catch (error) {
      console.error('Error actualizando configuración:', error)
      sendResponse({ status: 'error', message: error.message })
    }
  }

  /**
   * Maneja la instalación de la extensión
   */
  async handleExtensionInstalled() {
    console.log('Extension instalada/actualizada')

    await StorageManager.clearAll()
    console.log('Estado inicializado en instalación')

    await this.sessionManager.initializeSession()

    // Dar tiempo para que Chrome se estabilice antes de inicializar pestañas
    setTimeout(() => {
      this.tabManager.initializeWithCurrentTabs()
    }, 1000)
  }

  /**
   * Maneja la suspensión de la extensión
   */
  async handleExtensionSuspend() {
    console.log('Extensión suspendida, guardando estado final')

    // Limpiar intervalos
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals = []

    // Guardar la última entrada activa
    await this.tabManager.saveCurrentEntry(true)
  }
}

// Inicializar el servicio
new BackgroundService()
