/* global chrome */
import { STORAGE_KEYS } from './constants.js'

/**
 * Clase para manejar el almacenamiento de la extensión
 */
export class StorageManager {
  /**
   * Guarda datos en el almacenamiento local de Chrome
   * @param {object} data - Datos a guardar
   * @returns {Promise<void>}
   */
  static async save(data) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Obtiene datos del almacenamiento local
   * @param {string|string[]} keys - Claves a obtener
   * @returns {Promise<object>}
   */
  static async get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(data)
        }
      })
    })
  }

  /**
   * Elimina datos del almacenamiento
   * @param {string|string[]} keys - Claves a eliminar
   * @returns {Promise<void>}
   */
  static async remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Guarda el estado de grabación
   * @param {boolean} isRecording - Si está grabando
   * @param {Array} events - Eventos grabados
   * @param {boolean} hasRecording - Si tiene grabación
   */
  static async saveRecordingState(isRecording, events = [], hasRecording = false) {
    return this.save({
      [STORAGE_KEYS.IS_RECORDING]: isRecording,
      [STORAGE_KEYS.RECORDED_EVENTS]: events,
      [STORAGE_KEYS.HAS_RECORDING]: hasRecording,
    })
  }

  /**
   * Obtiene el estado de grabación
   * @returns {Promise<object>}
   */
  static async getRecordingState() {
    const data = await this.get([
      STORAGE_KEYS.IS_RECORDING,
      STORAGE_KEYS.RECORDED_EVENTS,
      STORAGE_KEYS.HAS_RECORDING,
    ])

    return {
      isRecording: data[STORAGE_KEYS.IS_RECORDING] || false,
      events: data[STORAGE_KEYS.RECORDED_EVENTS] || [],
      hasRecording: data[STORAGE_KEYS.HAS_RECORDING] || false,
    }
  }

  /**
   * Guarda la sesión actual
   * @param {object} session - Datos de la sesión
   */
  static async saveSession(session) {
    console.log('💾 STORAGE: Guardando sesión con', session?.timeline?.length || 0, 'entradas')
    console.log('💾 STORAGE: Datos completos de sesión:', session)

    const result = await this.save({
      [STORAGE_KEYS.CURRENT_SESSION]: session,
    })

    console.log('💾 STORAGE: Sesión guardada exitosamente')
    return result
  }

  /**
   * Obtiene la sesión actual
   * @returns {Promise<object|null>}
   */
  static async getSession() {
    const data = await this.get([STORAGE_KEYS.CURRENT_SESSION])
    return data[STORAGE_KEYS.CURRENT_SESSION] || null
  }

  /**
   * Limpia todos los datos de almacenamiento
   * @returns {Promise<void>}
   */
  static async clearAll() {
    return this.save({
      [STORAGE_KEYS.IS_RECORDING]: false,
      [STORAGE_KEYS.RECORDED_EVENTS]: [],
      [STORAGE_KEYS.HAS_RECORDING]: false,
      [STORAGE_KEYS.CURRENT_SESSION]: null,
    })
  }
}
