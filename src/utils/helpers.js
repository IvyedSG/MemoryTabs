/**
 * Extrae el dominio de una URL
 * @param {string} url - La URL de la cual extraer el dominio
 * @returns {string|null} - El dominio o null si es inválido
 */
export function extractDomain(url) {
  try {
    if (!url) return null
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (e) {
    console.error('Error al extraer dominio:', e)
    return null
  }
}

/**
 * Genera un ID único basado en timestamp y random
 * @returns {string} - ID único
 */
export function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * Verifica si una URL es válida para seguimiento
 * @param {string} url - La URL a verificar
 * @returns {boolean} - true si es válida para seguimiento
 */
export function isValidUrl(url) {
  if (!url) return false

  // URLs que no queremos rastrear
  const invalidPatterns = [
    /^chrome:\/\//,
    /^chrome-extension:\/\//,
    /^about:blank$/,
    /^moz-extension:\/\//,
    /^edge-extension:\/\//,
  ]

  return !invalidPatterns.some((pattern) => pattern.test(url))
}

/**
 * Verifica si una pestaña es válida para seguimiento
 * @param {object} tab - Objeto de pestaña de Chrome
 * @returns {boolean} - true si es válida
 */
export function isValidTab(tab) {
  return tab && tab.url && isValidUrl(tab.url)
}

/**
 * Compara dos URLs para determinar si representan la misma página
 * @param {string} url1 - Primera URL
 * @param {string} url2 - Segunda URL
 * @returns {boolean} - true si son la misma página
 */
export function isSamePage(url1, url2) {
  if (!url1 || !url2) return false

  try {
    const a = new URL(url1)
    const b = new URL(url2)

    // Si son dominios diferentes, no son la misma página
    if (a.hostname !== b.hostname) return false

    // Si son exactamente iguales
    if (url1 === url2) return true

    // Casos especiales para diferentes plataformas
    if (a.hostname === 'x.com' || a.hostname === 'twitter.com') {
      const pathA = a.pathname.split('/').filter((p) => p)
      const pathB = b.pathname.split('/').filter((p) => p)

      if (pathA.length >= 1 && pathB.length >= 1 && pathA[0] === pathB[0]) {
        // Para tweets específicos, comparar el ID del tweet
        if (
          pathA.length > 2 &&
          pathB.length > 2 &&
          pathA[1] === 'status' &&
          pathB[1] === 'status'
        ) {
          return pathA[2] === pathB[2]
        }
        return true
      }
    }

    // Para YouTube, comparar video IDs
    if (a.hostname.includes('youtube.com') && b.hostname.includes('youtube.com')) {
      const videoIdA = new URLSearchParams(a.search).get('v')
      const videoIdB = new URLSearchParams(b.search).get('v')
      if (videoIdA && videoIdB && videoIdA === videoIdB) {
        return true
      }
    }

    // Comparar los primeros dos segmentos del path
    const pathA = a.pathname.split('/').slice(0, 2).join('/')
    const pathB = b.pathname.split('/').slice(0, 2).join('/')

    return pathA === pathB
  } catch {
    return false
  }
}

/**
 * Formatea una duración en milisegundos a formato legible
 * @param {number} ms - Duración en milisegundos
 * @returns {string} - Duración formateada
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`
  }

  return `${seconds}s`
}

/**
 * Formatea una duración de forma corta
 * @param {number} ms - Duración en milisegundos
 * @returns {string} - Duración formateada corta
 */
export function formatDurationShort(ms) {
  if (!ms || ms < 0) return '0s'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(ms / 60000)

  if (minutes < 1) {
    return `${seconds}s`
  }

  if (minutes < 60) {
    return `${minutes}min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`
}

/**
 * Formatea un timestamp a hora legible
 * @param {number} timestamp - Timestamp en milisegundos
 * @returns {string} - Hora formateada o placeholder si es inválida
 */
export function formatTime(timestamp) {
  try {
    // Verificar si realmente tenemos un valor
    if (timestamp === undefined || timestamp === null) {
      console.log('Timestamp nulo o indefinido:', timestamp)
      return '--:--'
    }

    // Convertir a número si es un string
    let timeValue = timestamp
    if (typeof timestamp === 'string') {
      timeValue = parseInt(timestamp, 10)
    }

    // Crear el objeto Date
    const date = new Date(timeValue)

    // Verificar que sea una fecha válida y con una hora razonable
    if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
      console.log('Timestamp inválido:', timestamp, '→ Date:', date)
      return '--:--'
    }

    // Formatear la hora correctamente
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    console.error('Error al formatear tiempo:', error, 'Timestamp:', timestamp)
    return '--:--'
  }
}

/**
 * Formatea una fecha completa
 * @param {number} timestamp - Timestamp en milisegundos
 * @returns {string} - Fecha formateada
 */
export function formatDate(timestamp) {
  try {
    if (!timestamp) return '--'

    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return '--'

    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch (error) {
    console.error('Error al formatear fecha:', error)
    return '--'
  }
}

/**
 * Obtiene la fecha en formato YYYY-MM-DD para un timestamp
 * @param {number} timestamp - Timestamp en milisegundos
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
export function getDateKey(timestamp) {
  try {
    if (!timestamp) return null
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return null

    return date.toISOString().split('T')[0]
  } catch (error) {
    console.error('Error al obtener date key:', error)
    return null
  }
}

/**
 * Obtiene el nombre del día relativo (Hoy, Ayer, etc.)
 * @param {string} dateKey - Fecha en formato YYYY-MM-DD
 * @returns {string} - Nombre del día
 */
export function getRelativeDayName(dateKey) {
  try {
    if (!dateKey) return 'Fecha desconocida'

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayKey = getDateKey(today.getTime())
    const yesterdayKey = getDateKey(yesterday.getTime())

    if (dateKey === todayKey) return 'Hoy'
    if (dateKey === yesterdayKey) return 'Ayer'

    // Para fechas más antiguas, mostrar fecha completa
    const date = new Date(dateKey + 'T00:00:00')
    const diffTime = Math.abs(today - date)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'long' })
    } else {
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: today.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
      })
    }
  } catch (error) {
    console.error('Error al obtener nombre de día relativo:', error)
    return 'Fecha desconocida'
  }
}

/**
 * Agrupa entradas del timeline por día
 * @param {Array} timeline - Array de entradas
 * @returns {Array} - Array de objetos con fecha y entradas
 */
export function groupTimelineByDay(timeline) {
  try {
    if (!Array.isArray(timeline) || timeline.length === 0) {
      return []
    }

    // Ordenar por timestamp descendente (más reciente primero)
    const sortedTimeline = [...timeline].sort((a, b) => b.timestamp - a.timestamp)

    // Agrupar por día
    const grouped = {}

    sortedTimeline.forEach((entry) => {
      const dateKey = getDateKey(entry.timestamp)
      if (dateKey) {
        if (!grouped[dateKey]) {
          grouped[dateKey] = {
            dateKey,
            dayName: getRelativeDayName(dateKey),
            entries: [],
          }
        }
        grouped[dateKey].entries.push(entry)
      }
    })

    // Convertir a array y ordenar por fecha (más reciente primero)
    return Object.values(grouped).sort((a, b) => b.dateKey.localeCompare(a.dateKey))
  } catch (error) {
    console.error('Error al agrupar timeline por día:', error)
    return []
  }
}

/**
 * Filtra entradas del timeline por texto de búsqueda
 * @param {Array} timeline - Array de entradas
 * @param {string} searchText - Texto de búsqueda
 * @returns {Array} - Array filtrado
 */
export function filterTimeline(timeline, searchText) {
  try {
    if (!Array.isArray(timeline) || !searchText || searchText.trim() === '') {
      return timeline
    }

    const search = searchText.toLowerCase().trim()

    return timeline.filter((entry) => {
      // Buscar en título
      const title = (entry.title || '').toLowerCase()
      if (title.includes(search)) return true

      // Buscar en dominio
      const domain = (entry.domain || '').toLowerCase()
      if (domain.includes(search)) return true

      // Buscar en URL
      const url = (entry.url || '').toLowerCase()
      if (url.includes(search)) return true

      return false
    })
  } catch (error) {
    console.error('Error al filtrar timeline:', error)
    return timeline
  }
}

/**
 * Resalta términos de búsqueda en un texto
 * @param {string} text - Texto original
 * @param {string} searchTerm - Término a resaltar
 * @returns {string} - Texto con términos resaltados
 */
export function highlightSearchTerm(text, searchTerm) {
  try {
    if (!text || !searchTerm || searchTerm.trim() === '') {
      return text || ''
    }

    const search = searchTerm.trim()
    const regex = new RegExp(`(${search})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>')
  } catch (error) {
    console.error('Error al resaltar término:', error)
    return text || ''
  }
}

/**
 * Debounce function para limitar la frecuencia de ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función con debounce aplicado
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Verifica si una URL es capturable para screenshots
 * @param {string} url - La URL a verificar
 * @returns {boolean} - true si la URL es capturable
 */
export function isCapturableUrl(url) {
  try {
    if (!url || typeof url !== 'string') return false

    // URLs que no se pueden capturar
    const nonCapturablePatterns = [
      'chrome://',
      'chrome-extension://',
      'moz-extension://',
      'about:',
      'edge://',
      'opera://',
      'devtools://',
      'view-source:',
      'data:',
      'javascript:',
      'mailto:',
      'tel:',
      'file://',
    ]

    return !nonCapturablePatterns.some((pattern) => url.startsWith(pattern))
  } catch (error) {
    console.error('Error verificando URL capturable:', error)
    return false
  }
}
