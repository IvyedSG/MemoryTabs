/* global chrome */
import { extractDomain, isValidTab, generateUniqueId } from '../utils/helpers.js'
import { ScreenshotManager } from '../utils/screenshot.js'
import { EXTENSION_CONFIG } from '../utils/constants.js'

/**
 * Clase para gestionar información de pestañas activas
 */
export class TabManager {
  constructor(sessionManager) {
    this.sessionManager = sessionManager
    this.activeTabInfo = {
      tabId: null,
      windowId: null,
      url: null,
      domain: null,
      title: null,
      favicon: null,
      screenshot: null,
      startTime: null,
      accumulatedTime: 0,
      lastActiveTime: null,
      isActive: false,
    }
    this.hasInitialized = false
    // Agregar throttling para screenshots - aumentado para evitar conflictos
    this.lastScreenshotTime = 0
    this.screenshotThrottle = 3000 // Mínimo 3 segundos entre capturas
  }

  /**
   * Inicializa el gestor con la pestaña activa actual
   */
  async initializeWithCurrentTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs.length === 0) {
          console.log('No se encontraron pestañas activas en la ventana actual')
          resolve(false)
          return
        }

        const activeTab = tabs[0]
        console.log(`Inicializando con pestaña activa: ${activeTab.id} - ${activeTab.url}`)

        if (!isValidTab(activeTab)) {
          console.log('Pestaña activa no es válida para seguimiento')
          resolve(false)
          return
        }

        await this.updateActiveTabInfo(activeTab.id)
        this.hasInitialized = true
        resolve(true)
      })
    })
  }

  /**
   * Actualiza la información de la pestaña activa
   * @param {number} tabId - ID de la pestaña
   * @returns {Promise<void>}
   */
  async updateActiveTabInfo(tabId) {
    try {
      // Obtener el ID de la ventana correctamente
      let windowId
      try {
        const tabInfo = await this.getTabInfo(tabId)
        windowId = tabInfo.windowId
      } catch (err) {
        console.error('Error obteniendo información de ventana:', err)
        return
      }

      // Guardar entrada anterior si existe y es diferente dominio
      if (this.activeTabInfo.domain && this.activeTabInfo.startTime) {
        const now = Date.now()
        // Guardar el tiempo acumulado antes de cambiar
        if (this.activeTabInfo.isActive) {
          this.activeTabInfo.accumulatedTime += now - this.activeTabInfo.lastActiveTime
        }

        // Verificar si estamos cambiando de dominio
        const currentTab = await this.getTabInfo(tabId)
        if (currentTab && currentTab.url) {
          const newDomain = extractDomain(currentTab.url)
          if (newDomain !== this.activeTabInfo.domain) {
            console.log(
              `Cambiando de dominio: ${this.activeTabInfo.domain} -> ${newDomain}, consolidando entrada anterior`,
            )
            // Capturar screenshot de la pestaña anterior antes de cambiar
            const previousTabId = this.activeTabInfo.tabId
            if (previousTabId && !this.activeTabInfo.screenshot) {
              console.log(
                `Intentando capturar screenshot de pestaña ${previousTabId} en ventana ${windowId}`,
              )
              try {
                this.activeTabInfo.screenshot = await this.screenshotManager.capture(
                  previousTabId,
                  windowId,
                )
              } catch (error) {
                console.warn('No se pudo capturar screenshot de pestaña anterior:', error.message)
              }
            }
            // Solo guardar si cumple con el tiempo mínimo
            await this.saveCurrentEntry(false)
          }
        }
      }

      // Obtener información de la nueva pestaña activa
      const tab = await this.getTabInfo(tabId)
      if (!isValidTab(tab)) {
        console.log('Pestaña no trackeable:', tab?.url)
        return
      }

      const url = tab.url
      const domain = extractDomain(url)
      const title = tab.title || 'Sin título'
      const favicon = tab.favIconUrl || null

      // Comprobar si estamos en el mismo dominio o uno nuevo
      const isSameDomain = domain === this.activeTabInfo.domain

      console.log(`Actualizando información de pestaña ${tabId}: "${title}" - ${url}`)

      // Si es un nuevo dominio, reiniciar el contador
      if (!isSameDomain) {
        // Siempre crear nueva sesión para nuevo dominio
        // La consolidación se manejará al guardar en SessionManager
        this.activeTabInfo = {
          tabId,
          windowId,
          url,
          domain,
          title,
          favicon,
          screenshot: null,
          startTime: Date.now(),
          accumulatedTime: 0,
          lastActiveTime: Date.now(),
          isActive: true,
        }
        console.log(`Nuevo dominio detectado: ${domain}, iniciando nueva sesión de tiempo`)
      } else {
        // Si es el mismo dominio, actualizar información pero mantener tiempo acumulado
        this.activeTabInfo.tabId = tabId
        this.activeTabInfo.windowId = windowId
        this.activeTabInfo.url = url
        this.activeTabInfo.title = title
        this.activeTabInfo.favicon = favicon
        this.activeTabInfo.lastActiveTime = Date.now()
        this.activeTabInfo.isActive = true
      }

      // Capturar screenshot solo si tenemos un windowId válido
      // Esperar un poco para asegurar que la página se haya cargado
      setTimeout(async () => {
        await this.captureScreenshot()
        console.log(
          `Información de pestaña activa actualizada: ${title} (${domain}) Screenshot: ${this.activeTabInfo.screenshot ? 'Capturado' : 'No disponible'}`,
        )
      }, 500) // Esperar 500ms antes de capturar
    } catch (error) {
      console.error('Error al actualizar información de pestaña activa:', error)
    }
  }

  /**
   * Obtiene información de una pestaña
   * @param {number} tabId - ID de la pestaña
   * @returns {Promise<object>} - Información de la pestaña
   */
  async getTabInfo(tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(tab)
        }
      })
    })
  }

  /**
   * Captura un screenshot de la pestaña activa
   * @returns {Promise<void>}
   */
  async captureScreenshot() {
    try {
      // Throttling para evitar capturas muy frecuentes
      const now = Date.now()
      if (now - this.lastScreenshotTime < this.screenshotThrottle) {
        console.log('Screenshot throttled - esperando antes de la siguiente captura')
        return
      }
      this.lastScreenshotTime = now

      if (!this.activeTabInfo.windowId || typeof this.activeTabInfo.windowId !== 'number') {
        console.log('No se puede capturar screenshot: windowId inválido')
        return
      }

      console.log(
        `Intentando capturar screenshot de pestaña ${this.activeTabInfo.tabId} en ventana ${this.activeTabInfo.windowId}`,
      )

      // Verificar que la pestaña sigue siendo válida y activa antes de capturar
      try {
        // Obtener información actual de la pestaña
        const currentTab = await this.getTabInfo(this.activeTabInfo.tabId)
        if (!currentTab) {
          console.log('Pestaña no existe, omitiendo captura de screenshot')
          return
        }

        // Verificar estado de carga de la pestaña
        if (currentTab.status !== 'complete') {
          console.log(
            `Pestaña aún está cargando (status: ${currentTab.status}), omitiendo captura de screenshot`,
          )
          return
        }

        // Verificar que la URL no haya cambiado
        if (currentTab.url !== this.activeTabInfo.url) {
          console.log('URL de pestaña cambió, omitiendo captura de screenshot')
          console.log(`Expected: ${this.activeTabInfo.url}`)
          console.log(`Current: ${currentTab.url}`)
          return
        }

        // Verificar que la pestaña esté activa en su ventana
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, windowId: this.activeTabInfo.windowId }, resolve)
        })

        if (!tabs || tabs.length === 0 || tabs[0].id !== this.activeTabInfo.tabId) {
          console.log('Pestaña no está activa en su ventana, omitiendo captura de screenshot')
          return
        }

        // Esperar un poco más para asegurar que la página esté completamente renderizada
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error) {
        console.log('Error verificando pestaña, omitiendo captura de screenshot:', error.message)
        return
      }

      try {
        const screenshot = await ScreenshotManager.capture(
          this.activeTabInfo.tabId,
          this.activeTabInfo.windowId,
        )
        // Actualizar screenshot independientemente del resultado
        // Si es null (error o deshabilitado), mantener screenshot anterior si existe
        if (screenshot) {
          this.activeTabInfo.screenshot = screenshot
          console.log('Screenshot capturado y actualizado exitosamente')
        } else {
          console.log('No se pudo capturar screenshot, manteniendo screenshot anterior si existe')
        }
      } catch (screenshotError) {
        console.log('Error específico al capturar screenshot:', screenshotError.message)
        // No actualizar el screenshot en caso de error, mantener el anterior
      }
    } catch (error) {
      console.error('Error general al capturar screenshot:', error)
      // Continuar sin screenshot, no interrumpir el flujo principal
    }
  }

  /**
   * Guarda la entrada actual en el timeline
   * @param {boolean} forceSave - Forzar guardado independientemente de la duración
   * @returns {Promise<object|null>} - La entrada guardada o null
   */
  async saveCurrentEntry(forceSave = false) {
    if (!this.activeTabInfo || !this.activeTabInfo.domain) return null

    const now = Date.now()
    // Calcular duración acumulada más tiempo actual si la pestaña está activa
    let totalDuration = this.activeTabInfo.accumulatedTime
    if (this.activeTabInfo.isActive && this.activeTabInfo.lastActiveTime) {
      totalDuration += now - this.activeTabInfo.lastActiveTime
    }

    console.log(
      `Evaluando guardado para ${this.activeTabInfo.domain}:`,
      `\n  - Tiempo acumulado: ${Math.round(this.activeTabInfo.accumulatedTime / 1000)}s`,
      `\n  - Tiempo en sesión actual: ${this.activeTabInfo.isActive && this.activeTabInfo.lastActiveTime ? Math.round((now - this.activeTabInfo.lastActiveTime) / 1000) : 0}s`,
      `\n  - Tiempo total: ${Math.round(totalDuration / 1000)}s (${Math.round(totalDuration / 60000)} min)`,
      `\n  - Umbral mínimo: ${Math.round(EXTENSION_CONFIG.MIN_DURATION_TO_SAVE / 1000)}s`,
      `\n  - ForceSave: ${forceSave}`,
      `\n  - ¿Cumple umbral?: ${totalDuration >= EXTENSION_CONFIG.MIN_DURATION_TO_SAVE}`,
    )

    // Solo guardar si duró al menos el tiempo mínimo o si se fuerza
    if (
      (totalDuration >= EXTENSION_CONFIG.MIN_DURATION_TO_SAVE || forceSave) &&
      this.activeTabInfo.domain &&
      this.activeTabInfo.url
    ) {
      // Si no tenemos screenshot y la pestaña sigue siendo la activa, intentar capturar
      if (!this.activeTabInfo.screenshot && this.activeTabInfo.isActive) {
        await this.captureScreenshot()
      }

      const entry = {
        id: generateUniqueId(),
        timestamp: this.activeTabInfo.startTime,
        endTime: now,
        url: this.activeTabInfo.url,
        domain: this.activeTabInfo.domain,
        title: this.activeTabInfo.title || '',
        favicon: this.activeTabInfo.favicon || '',
        duration: totalDuration,
        screenshot: this.activeTabInfo.screenshot || '',
      }

      console.log(
        `Guardando entrada para ${entry.domain} con duración de ${Math.round(totalDuration / 1000)} segundos (${Math.round(totalDuration / 60000)} minutos)`,
      )
      console.log(
        `Timestamp guardado: ${entry.timestamp} (${new Date(entry.timestamp).toLocaleString()})`,
      )

      // Guardar en el session manager
      return await this.sessionManager.saveTimelineEntry(entry)
    } else {
      console.log(
        `No se guarda entrada para ${this.activeTabInfo.domain}: duración insuficiente (${Math.round(totalDuration / 1000)}s < ${Math.round(EXTENSION_CONFIG.MIN_DURATION_TO_SAVE / 1000)}s)`,
      )
    }

    return null
  }

  /**
   * Maneja cuando una pestaña se vuelve activa
   * @param {number} tabId - ID de la pestaña activada
   */
  async onTabActivated(tabId) {
    console.log('Pestaña activada:', tabId)
    await this.updateActiveTabInfo(tabId)
  }

  /**
   * Maneja cuando una pestaña se actualiza
   * @param {number} tabId - ID de la pestaña
   * @param {object} changeInfo - Información de cambios
   */
  async onTabUpdated(tabId, changeInfo) {
    console.log(`Pestaña actualizada: ${tabId}`, changeInfo)

    // Ignorar actualizaciones menores que no afectan a la navegación
    if (!changeInfo.url && changeInfo.status !== 'complete') return

    // Si es la pestaña activa, actualizar su información
    if (this.activeTabInfo && this.activeTabInfo.tabId === tabId) {
      if (changeInfo.url) {
        await this.updateActiveTabInfo(tabId)
      } else if (changeInfo.status === 'complete') {
        await this.updateActiveTabInfo(tabId)
      }
    }
  }

  /**
   * Maneja cuando una pestaña se cierra
   * @param {number} tabId - ID de la pestaña cerrada
   */
  async onTabRemoved(tabId) {
    console.log('Pestaña cerrada:', tabId)

    if (this.activeTabInfo && this.activeTabInfo.tabId === tabId) {
      await this.saveCurrentEntry(false) // No forzar guardado, respetar tiempo mínimo
      this.resetActiveTabInfo()

      // Intentar encontrar una nueva pestaña activa
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs.length > 0) {
          await this.updateActiveTabInfo(tabs[0].id)
        }
      })
    }
  }

  /**
   * Maneja cuando cambia el foco de la ventana
   * @param {number} windowId - ID de la ventana con foco
   */
  async onWindowFocusChanged(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      // El navegador perdió el foco
      console.log('Navegador perdió el foco')
      if (this.activeTabInfo && this.activeTabInfo.isActive) {
        const now = Date.now()
        // Acumular el tiempo hasta este momento
        this.activeTabInfo.accumulatedTime += now - this.activeTabInfo.lastActiveTime
        this.activeTabInfo.isActive = false
        console.log(
          `Acumulado tiempo para ${this.activeTabInfo.domain}: ${Math.round(this.activeTabInfo.accumulatedTime / 1000)}s`,
        )
      }
    } else {
      // El navegador recuperó el foco
      console.log('Navegador recuperó el foco')
      if (this.activeTabInfo) {
        this.activeTabInfo.isActive = true
        this.activeTabInfo.lastActiveTime = Date.now()
      }
    }
  }

  /**
   * Resetea la información de la pestaña activa
   */
  resetActiveTabInfo() {
    this.activeTabInfo = {
      tabId: null,
      windowId: null,
      url: null,
      domain: null,
      title: null,
      favicon: null,
      screenshot: null,
      startTime: null,
      accumulatedTime: 0,
      lastActiveTime: null,
      isActive: false,
    }
  }

  /**
   * Obtiene la información de la pestaña activa actual
   * @returns {object} - Información de la pestaña activa
   */
  getActiveTabInfo() {
    return this.activeTabInfo
  }

  /**
   * Verifica si el gestor ha sido inicializado
   * @returns {boolean} - true si ha sido inicializado
   */
  isInitialized() {
    return this.hasInitialized
  }

  /**
   * Log del estado actual para debugging
   */
  logCurrentState() {
    if (this.activeTabInfo && this.activeTabInfo.domain) {
      const now = Date.now()
      let totalTime = this.activeTabInfo.accumulatedTime

      if (this.activeTabInfo.isActive) {
        totalTime += now - this.activeTabInfo.lastActiveTime
      }

      console.log(`
      Estado actual de tiempo:
      Dominio: ${this.activeTabInfo.domain}
      Título: ${this.activeTabInfo.title}
      Tiempo acumulado: ${Math.round(this.activeTabInfo.accumulatedTime / 1000)}s (${Math.round(this.activeTabInfo.accumulatedTime / 60000)}min)
      Pestaña activa: ${this.activeTabInfo.isActive ? 'Sí' : 'No'}
      Tiempo en sesión actual: ${this.activeTabInfo.isActive ? Math.round((now - this.activeTabInfo.lastActiveTime) / 1000) : 0}s
      Tiempo total: ${Math.round(totalTime / 1000)}s (${Math.round(totalTime / 60000)}min)
    `)
    }
  }
}
