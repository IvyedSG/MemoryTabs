/* global chrome */
import { formatTime, formatDuration, formatDurationShort } from '../utils/helpers.js'
import { RECORDING_ACTIONS } from '../utils/constants.js'

/**
 * Composable para manejar la comunicación con el background script
 */
export function useBackgroundCommunication() {
  /**
   * Envía un mensaje al background script
   * @param {object} message - Mensaje a enviar
   * @returns {Promise<any>} - Respuesta del background
   */
  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(response)
        }
      })
    })
  }

  /**
   * Obtiene los datos del timeline
   * @returns {Promise<object>} - Datos del timeline
   */
  async function getTimelineData() {
    try {
      console.log('Solicitando datos de timeline...')
      const response = await sendMessage({ action: RECORDING_ACTIONS.GET_TIMELINE_DATA })
      console.log('Respuesta recibida:', response)

      // Verificar si hay error en la respuesta
      if (response && response.error) {
        throw new Error(response.error)
      }

      console.log('Recibidas', response.session?.timeline?.length || 0, 'entradas de timeline')
      return response
    } catch (error) {
      console.error('Error en getTimelineData:', error)
      throw error
    }
  }

  /**
   * Limpia los datos del timeline
   * @returns {Promise<object>} - Respuesta del background
   */
  async function clearTimelineData() {
    try {
      const response = await sendMessage({ action: RECORDING_ACTIONS.CLEAR_TIMELINE_DATA })

      // Verificar si hay error en la respuesta
      if (response && response.error) {
        throw new Error(response.error)
      }

      return response
    } catch (error) {
      console.error('Error en clearTimelineData:', error)
      throw error
    }
  }

  /**
   * Obtiene el estado de grabación
   * @returns {Promise<object>} - Estado de grabación
   */
  async function getRecordingState() {
    return await sendMessage({ action: RECORDING_ACTIONS.GET_RECORDING_STATE })
  }

  /**
   * Inicia la grabación
   * @returns {Promise<object>} - Respuesta del background
   */
  async function startRecording() {
    return await sendMessage({ action: RECORDING_ACTIONS.RECORDING_STARTED })
  }

  /**
   * Detiene la grabación
   * @param {Array} events - Eventos grabados
   * @returns {Promise<object>} - Respuesta del background
   */
  async function stopRecording(events = []) {
    return await sendMessage({
      action: RECORDING_ACTIONS.RECORDING_STOPPED,
      data: events,
    })
  }

  /**
   * Limpia la grabación
   * @returns {Promise<object>} - Respuesta del background
   */
  async function clearRecording() {
    return await sendMessage({ action: RECORDING_ACTIONS.CLEAR_RECORDING })
  }

  /**
   * Fuerza la actualización de la pestaña activa
   * @returns {Promise<object>} - Respuesta del background
   */
  async function forceRefreshActiveTab() {
    try {
      const response = await sendMessage({ action: RECORDING_ACTIONS.FORCE_REFRESH_ACTIVE_TAB })

      // Verificar si hay error en la respuesta
      if (response && response.error) {
        throw new Error(response.error)
      }

      return response
    } catch (error) {
      console.error('Error en forceRefreshActiveTab:', error)
      throw error
    }
  }

  return {
    getTimelineData,
    clearTimelineData,
    getRecordingState,
    startRecording,
    stopRecording,
    clearRecording,
    forceRefreshActiveTab,
  }
}

/**
 * Composable para formateo de datos
 */
export function useFormatting() {
  return {
    formatTime,
    formatDuration,
    formatDurationShort,
  }
}

/**
 * Composable para estadísticas del timeline
 */
export function useTimelineStats() {
  /**
   * Calcula estadísticas del timeline
   * @param {Array} timeline - Array de entradas del timeline
   * @returns {object} - Estadísticas calculadas
   */
  function calculateStats(timeline) {
    if (!timeline || timeline.length === 0) {
      return {
        sitesCount: 0,
        totalDuration: 0,
        averageDuration: 0,
        longestSession: null,
        mostVisitedDomain: null,
      }
    }

    const totalDuration = timeline.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const uniqueDomains = new Set(timeline.map((entry) => entry.domain))

    // Encontrar la sesión más larga
    const longestSession = timeline.reduce((longest, current) => {
      return (current.duration || 0) > (longest?.duration || 0) ? current : longest
    }, null)

    // Encontrar el dominio más visitado
    const domainCounts = {}
    timeline.forEach((entry) => {
      if (entry.domain) {
        domainCounts[entry.domain] = (domainCounts[entry.domain] || 0) + 1
      }
    })

    const mostVisitedDomain =
      Object.entries(domainCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || null

    return {
      sitesCount: uniqueDomains.size,
      totalDuration,
      averageDuration: totalDuration / timeline.length,
      longestSession,
      mostVisitedDomain,
      totalEntries: timeline.length,
    }
  }

  /**
   * Agrupa entradas por dominio
   * @param {Array} timeline - Array de entradas del timeline
   * @returns {object} - Entradas agrupadas por dominio
   */
  function groupByDomain(timeline) {
    if (!timeline) return {}

    return timeline.reduce((groups, entry) => {
      const domain = entry.domain || 'unknown'
      if (!groups[domain]) {
        groups[domain] = []
      }
      groups[domain].push(entry)
      return groups
    }, {})
  }

  /**
   * Filtra timeline por fecha
   * @param {Array} timeline - Array de entradas del timeline
   * @param {Date} startDate - Fecha de inicio
   * @param {Date} endDate - Fecha de fin
   * @returns {Array} - Timeline filtrado
   */
  function filterByDate(timeline, startDate, endDate) {
    if (!timeline) return []

    return timeline.filter((entry) => {
      const entryDate = new Date(entry.timestamp)
      return entryDate >= startDate && entryDate <= endDate
    })
  }

  return {
    calculateStats,
    groupByDomain,
    filterByDate,
  }
}

/**
 * Composable para manejo de fecha y tiempo
 */
export function useDatetime() {
  /**
   * Obtiene la fecha actual formateada
   * @returns {string} - Fecha formateada
   */
  function getCurrentDate() {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  /**
   * Obtiene la hora actual formateada
   * @returns {string} - Hora formateada
   */
  function getCurrentTime() {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  /**
   * Verifica si una fecha es hoy
   * @param {number} timestamp - Timestamp a verificar
   * @returns {boolean} - true si es hoy
   */
  function isToday(timestamp) {
    const today = new Date()
    const date = new Date(timestamp)

    return today.toDateString() === date.toDateString()
  }

  /**
   * Obtiene tiempo relativo (ej: "hace 5 minutos")
   * @param {number} timestamp - Timestamp
   * @returns {string} - Tiempo relativo
   */
  function getRelativeTime(timestamp) {
    const now = Date.now()
    const diffMs = now - timestamp

    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'Ahora mismo'
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`

    return new Date(timestamp).toLocaleDateString('es-ES')
  }

  return {
    getCurrentDate,
    getCurrentTime,
    isToday,
    getRelativeTime,
  }
}
