import { StorageManager } from '../utils/storage.js'
import { generateUniqueId } from '../utils/helpers.js'
import { EXTENSION_CONFIG } from '../utils/constants.js'

/**
 * Clase para gestionar sesiones y timeline
 */
export class SessionManager {
  constructor() {
    this.currentSession = null
    this.timeline = []
  }

  /**
   * Inicializa una nueva sesión
   * @returns {Promise<object>} - La nueva sesión creada
   */
  async initializeSession() {
    const sessionId = new Date().toISOString()
    this.currentSession = {
      sessionId,
      timeline: [],
      startTime: Date.now(),
    }

    console.log('Nueva sesión iniciada:', sessionId)

    // Guardar la sesión recién iniciada
    await StorageManager.saveSession(this.currentSession)
    return this.currentSession
  }

  /**
   * Restaura una sesión existente desde el almacenamiento
   * @returns {Promise<object|null>} - La sesión restaurada o null
   */
  async restoreSession() {
    const savedSession = await StorageManager.getSession()

    if (savedSession) {
      this.currentSession = savedSession
      this.timeline = savedSession.timeline || []
      console.log('Sesión restaurada con', this.timeline.length, 'entradas')
      return savedSession
    }

    return null
  }

  /**
   * Guarda una entrada en el timeline
   * @param {object} entry - Entrada a guardar
   * @returns {Promise<object>} - La entrada guardada
   */
  async saveTimelineEntry(entry) {
    if (!this.currentSession) {
      await this.initializeSession()
    }

    // Buscar si existe una entrada reciente del mismo dominio (últimas 2 horas)
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    const existingEntryIndex = this.timeline.findIndex(
      (existing) =>
        existing.domain === entry.domain &&
        existing.timestamp >= twoHoursAgo &&
        Math.abs(existing.endTime - entry.timestamp) < 10 * 60 * 1000, // Dentro de 10 minutos del final de la entrada anterior
    )

    if (existingEntryIndex !== -1) {
      // Consolidar con entrada existente
      const existingEntry = this.timeline[existingEntryIndex]
      console.log(`Consolidando entrada existente para ${entry.domain}`)

      // Actualizar información de la entrada existente
      existingEntry.endTime = entry.endTime
      existingEntry.duration += entry.duration
      existingEntry.title = entry.title || existingEntry.title // Usar el título más reciente
      existingEntry.url = entry.url || existingEntry.url // Usar la URL más reciente
      existingEntry.screenshot = entry.screenshot || existingEntry.screenshot // Usar screenshot más reciente
      existingEntry.favicon = entry.favicon || existingEntry.favicon

      console.log(
        `Entrada consolidada: ${existingEntry.domain} - ${Math.round(existingEntry.duration / 60000)} minutos total`,
      )

      // Guardar en almacenamiento
      await this.saveToStorage()
      return existingEntry
    } else {
      // Crear nueva entrada
      // Agregar ID único si no tiene
      if (!entry.id) {
        entry.id = generateUniqueId()
      }

      // Agregar timestamp si no tiene
      if (!entry.timestamp) {
        entry.timestamp = Date.now()
      }

      // Agregar a timeline y mantener límite de entradas
      this.timeline.unshift(entry)
      if (this.timeline.length > EXTENSION_CONFIG.MAX_TIMELINE_ENTRIES) {
        this.timeline = this.timeline.slice(0, EXTENSION_CONFIG.MAX_TIMELINE_ENTRIES)
      }

      // Actualizar la sesión
      this.currentSession.timeline = this.timeline

      // Guardar en almacenamiento
      await this.saveToStorage()

      console.log(
        `Nueva entrada creada: ${entry.domain} - ${Math.round(entry.duration / 60000)} minutos`,
      )
      return entry
    }
  }

  /**
   * Guarda el timeline en el almacenamiento
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    if (!this.currentSession) return

    this.currentSession.timeline = this.timeline
    await StorageManager.saveSession(this.currentSession)
    console.log('Timeline guardado en almacenamiento, entradas:', this.timeline.length)
  }

  /**
   * Obtiene el timeline actual
   * @returns {Array} - Array de entradas del timeline
   */
  getTimeline() {
    return this.timeline || []
  }

  /**
   * Obtiene la sesión actual
   * @returns {object|null} - La sesión actual
   */
  getCurrentSession() {
    if (!this.currentSession) {
      console.warn('getCurrentSession: No hay sesión actual')
      return { sessionId: null, timeline: [] }
    }

    // Asegurar que la sesión tenga la estructura correcta
    const session = {
      sessionId: this.currentSession.sessionId || null,
      timeline: Array.isArray(this.currentSession.timeline) ? this.currentSession.timeline : [],
      startTime: this.currentSession.startTime || Date.now(),
    }

    console.log('getCurrentSession: Devolviendo sesión con', session.timeline.length, 'entradas')
    return session
  }

  /**
   * Limpia el timeline actual
   * @returns {Promise<void>}
   */
  async clearTimeline() {
    console.log('🟢 SESSION: clearTimeline() llamado')
    console.log('🟢 SESSION: Timeline antes de limpiar:', this.timeline?.length || 0, 'entradas')
    console.log('🟢 SESSION: Sesión antes de limpiar:', this.currentSession)

    this.timeline = []
    console.log('🟢 SESSION: Timeline limpiado en memoria')

    if (this.currentSession) {
      this.currentSession.timeline = []
      console.log('🟢 SESSION: Timeline limpiado en currentSession')
      await this.saveToStorage()
      console.log('🟢 SESSION: Datos guardados en storage')
    }

    console.log('🟢 SESSION: Timeline después de limpiar:', this.timeline?.length || 0, 'entradas')
    console.log('🟢 SESSION: Timeline limpiado completamente')
  }

  /**
   * Consolida entradas cercanas del mismo dominio
   * @returns {Promise<boolean>} - true si se realizaron consolidaciones
   */
  async consolidateEntries() {
    if (!this.timeline || this.timeline.length < 2) {
      return false
    }

    let consolidationOccurred = false

    // Ordenar cronológicamente
    const sortedTimeline = [...this.timeline].sort((a, b) => {
      const aTime = typeof a.timestamp === 'number' ? a.timestamp : 0
      const bTime = typeof b.timestamp === 'number' ? b.timestamp : 0
      return aTime - bTime
    })

    // Asegurar que todas las entradas tengan endTime
    for (const entry of sortedTimeline) {
      if (!entry.endTime) {
        entry.endTime = entry.timestamp + (entry.duration || 0)
      }
    }

    // Buscar entradas consecutivas para el mismo dominio con pequeñas brechas
    for (let i = 0; i < sortedTimeline.length - 1; i++) {
      const current = sortedTimeline[i]
      const next = sortedTimeline[i + 1]

      // Si son del mismo dominio y están separadas por menos de 30 segundos
      if (current.domain === next.domain && Math.abs(next.timestamp - current.endTime) < 30000) {
        console.log(
          `Consolidando entradas para ${current.domain}: ${current.title} + ${next.title}`,
        )

        // Extender la primera entrada y eliminar la segunda
        current.endTime = next.endTime
        current.duration = current.endTime - current.timestamp

        // Usar el título más descriptivo
        if (next.title && next.title.length > current.title.length) {
          current.title = next.title
        }

        // Eliminar la entrada siguiente
        sortedTimeline.splice(i + 1, 1)
        i-- // Retroceder para verificar consolidaciones adicionales
        consolidationOccurred = true
      }
    }

    // Si se realizaron consolidaciones, actualizar
    if (consolidationOccurred) {
      this.timeline = sortedTimeline
      this.currentSession.timeline = this.timeline
      await this.saveToStorage()
      console.log('Timeline consolidado para evitar fragmentación')
    }

    return consolidationOccurred
  }

  /**
   * Obtiene estadísticas del timeline
   * @returns {object} - Estadísticas del timeline
   */
  getStats() {
    const timeline = this.getTimeline()

    const totalDuration = timeline.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const uniqueDomains = new Set(timeline.map((entry) => entry.domain)).size

    return {
      totalEntries: timeline.length,
      totalDuration,
      uniqueDomains,
      averageDuration: timeline.length > 0 ? totalDuration / timeline.length : 0,
    }
  }

  /**
   * Busca la entrada más reciente de un dominio específico
   * @param {string} domain - Dominio a buscar
   * @returns {object|null} - La entrada más reciente o null
   */
  async findRecentEntry(domain) {
    if (!this.timeline || this.timeline.length === 0) {
      return null
    }

    // Buscar la entrada más reciente del dominio (últimas 2 horas)
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000

    return (
      this.timeline.find((entry) => entry.domain === domain && entry.timestamp >= twoHoursAgo) ||
      null
    )
  }
}
