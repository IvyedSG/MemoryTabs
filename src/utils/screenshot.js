/* global chrome */
import { isCapturableUrl } from './helpers.js'

/**
 * Clase para manejar capturas de pantalla
 */
export class ScreenshotManager {
  static enabled = true // Por defecto están habilitados

  /**
   * Establece si los screenshots están habilitados
   * @param {boolean} enabled - Si los screenshots están habilitados
   */
  static setEnabled(enabled) {
    console.log(`ScreenshotManager.setEnabled: ${this.enabled} -> ${enabled}`)
    this.enabled = enabled
    console.log(`ScreenshotManager estado actualizado: ${this.enabled}`)
  }

  /**
   * Verifica si los screenshots están habilitados
   * @returns {boolean}
   */
  static isEnabled() {
    return this.enabled
  }

  /**
   * Captura una screenshot de la pestaña visible
   * @param {number} tabId - ID de la pestaña
   * @param {number} windowId - ID de la ventana
   * @returns {Promise<string|null>} - Data URL de la imagen o null si falla
   */
  static async capture(tabId, windowId) {
    console.log(
      `Screenshot.capture called - enabled: ${this.enabled}, tabId: ${tabId}, windowId: ${windowId}`,
    )

    // Si los screenshots están deshabilitados, devolver null
    if (!this.enabled) {
      console.log('Screenshots deshabilitados por configuración - NO se capturará')
      return null
    }

    // Solo intentar capturar si tenemos un windowId válido y es un número
    if (!windowId || typeof windowId !== 'number' || windowId === -1) {
      console.log('No se puede capturar screenshot: ventana no válida o no es un número')
      return null
    }

    // Verificar que la pestaña esté activa en la ventana antes de capturar
    try {
      const activeTab = await new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, windowId: windowId }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
            return
          }
          resolve(tabs && tabs.length > 0 ? tabs[0] : null)
        })
      })

      if (!activeTab || activeTab.id !== tabId) {
        console.log(`Pestaña ${tabId} no está activa en ventana ${windowId}, omitiendo screenshot`)
        return null
      }

      // Verificar que la pestaña esté completamente cargada
      if (activeTab.status !== 'complete') {
        console.log(
          `Pestaña ${tabId} aún está cargando (status: ${activeTab.status}), omitiendo screenshot`,
        )
        return null
      }

      // Verificar que la URL sea capturable
      const url = activeTab.url || ''
      if (!isCapturableUrl(url)) {
        console.log(`URL no capturable: ${url}, omitiendo screenshot`)
        return null
      }

      console.log(`Verificado: pestaña ${tabId} está activa y lista, procediendo con captura`)
    } catch (error) {
      console.log('Error verificando pestaña activa:', error.message)
      return null
    }

    return new Promise((resolve) => {
      // Opciones para la captura (calidad reducida para ahorrar espacio)
      const options = {
        format: 'jpeg',
        quality: 50,
      }

      // Timeout para evitar que la captura se cuelgue
      const timeoutId = setTimeout(() => {
        console.log('Timeout al capturar screenshot, resolviendo con null')
        resolve(null)
      }, 5000) // 5 segundos timeout

      try {
        chrome.tabs.captureVisibleTab(windowId, options, (dataUrl) => {
          clearTimeout(timeoutId)

          if (chrome.runtime.lastError) {
            const error = chrome.runtime.lastError.message || chrome.runtime.lastError.toString()

            // Manejar errores específicos
            if (error.includes('activeTab') || error.includes('permission')) {
              console.log('Permisos de activeTab no disponibles, continuando sin screenshot')
              resolve(null)
              return
            }

            if (error.includes('image readback failed') || error.includes('readback failed')) {
              console.log(
                'Error de lectura de imagen (readback failed), probablemente la página no está lista',
              )
              resolve(null)
              return
            }

            if (
              error.includes('Cannot access') ||
              error.includes('Cannot capture') ||
              error.includes('not supported') ||
              error.includes('not available')
            ) {
              console.log('No se puede acceder a la pestaña para captura:', error)
              resolve(null)
              return
            }

            if (
              error.includes('Extension context invalidated') ||
              error.includes('context invalidated')
            ) {
              console.log('Contexto de extensión invalidado, omitiendo captura')
              resolve(null)
              return
            }

            console.error('Error al capturar screenshot:', error)
            resolve(null)
            return
          }

          if (!dataUrl) {
            console.log('Captura de screenshot no produjo datos')
            resolve(null)
            return
          }

          console.log(
            `Screenshot capturado para pestaña ${tabId}, tamaño: ${Math.round(dataUrl.length / 1024)}KB`,
          )
          resolve(dataUrl)
        })
      } catch (error) {
        clearTimeout(timeoutId)
        console.error('Excepción al capturar screenshot:', error)
        resolve(null)
      }
    })
  }

  /**
   * Valida si se pueden capturar screenshots
   * @returns {Promise<boolean>}
   */
  static async validatePermissions() {
    return new Promise((resolve) => {
      chrome.permissions.contains(
        {
          permissions: ['activeTab', 'tabs'],
          origins: ['<all_urls>'],
        },
        (hasPermissions) => {
          if (hasPermissions) {
            console.log('Permisos para capturas de pantalla confirmados')
          } else {
            console.warn('No se tienen todos los permisos necesarios para capturas de pantalla')
          }
          resolve(hasPermissions)
        },
      )
    })
  }

  /**
   * Comprime una imagen en base64
   * @param {string} dataUrl - Data URL de la imagen
   * @param {number} quality - Calidad de compresión (0-1)
   * @returns {Promise<string>} - Imagen comprimida
   */
  static async compress(dataUrl, quality = 0.3) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Reducir el tamaño de la imagen
        const maxWidth = 400
        const maxHeight = 300

        let { width, height } = img

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(compressedDataUrl)
      }

      img.onerror = () => {
        console.error('Error al comprimir imagen')
        resolve(dataUrl) // Devolver la original si falla
      }

      img.src = dataUrl
    })
  }
}
