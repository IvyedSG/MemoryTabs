<template>
  <div class="w-[400px] h-[600px] relative flex flex-col overflow-hidden bg-slate-50 text-slate-800">
    <!-- Fondo claro con patrón sutil -->
    <div class="absolute inset-0 -z-10 bg-gradient-to-br from-sky-50 to-slate-100 overflow-hidden">
      <div
        class="absolute inset-0 opacity-20 bg-[radial-gradient(circle,theme(colors.sky.200)_1px,transparent_1px)] bg-[length:20px_20px]">
      </div>
    </div>

    <!-- Header -->
    <header class="p-4 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <h1 class="text-xl font-semibold text-slate-800">Linetabs</h1>
          <p class="text-sm text-slate-500">{{ formattedDate }}</p>
        </div>
        <div class="flex gap-6">
          <div class="flex flex-col items-center">
            <span class="text-lg font-bold text-slate-800">{{ stats.sitesCount }}</span>
            <span class="text-xs text-slate-500">Sitios</span>
          </div>
          <div class="flex flex-col items-center">
            <span class="text-lg font-bold text-slate-800">{{ formatDuration(stats.totalDuration) }}</span>
            <span class="text-xs text-slate-500">Tiempo</span>
          </div>
        </div>
      </div>
    </header>

    <!-- Tabs -->
    <div class="flex border-b border-slate-200 bg-white/80">
      <button @click="activeTab = 'timeline'"
        :class="['flex-1 py-3 text-sm font-medium', activeTab === 'timeline' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-500 hover:text-slate-700']">
        Cronología
      </button>
      <button @click="activeTab = 'settings'"
        :class="['flex-1 py-3 text-sm font-medium', activeTab === 'settings' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-500 hover:text-slate-700']">
        Configuración
      </button>
    </div>

    <!-- Contenido principal -->
    <main class="flex-1 overflow-y-auto bg-slate-50/80 backdrop-blur-sm">
      <!-- Vista de Cronología -->
      <div v-if="activeTab === 'timeline'" class="p-4">
        <TimelineView :timeline="timeline" @visit="visitUrl" />
      </div>

      <!-- Vista de Configuración -->
      <div v-else-if="activeTab === 'settings'" class="p-4 space-y-4">

        <!-- Gestión de Datos -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                clip-rule="evenodd" />
            </svg>
            Gestión de Datos
          </h3>

          <div class="space-y-2">
            <div class="flex justify-between items-center py-1.5">
              <div>
                <div class="text-sm font-medium text-slate-800">Limpiar Historial</div>
                <div class="text-xs text-slate-500">Eliminar todas las entradas guardadas</div>
              </div>
              <button @click="showClearConfirmation" :disabled="clearingData"
                class="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white rounded text-xs font-medium transition-colors">
                {{ clearingData ? 'Limpiando...' : 'Limpiar' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Información del Sistema -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd" />
            </svg>
            Información
          </h3>

          <div class="space-y-1">
            <div class="flex justify-between items-center py-1">
              <span class="text-sm text-slate-600">Versión</span>
              <span class="text-sm font-medium text-slate-800">1.0.0</span>
            </div>

            <div class="flex justify-between items-center py-1">
              <span class="text-sm text-slate-600">Umbral mínimo</span>
              <span class="text-sm font-medium text-slate-800">5 segundos</span>
            </div>

            <div class="flex justify-between items-center py-1">
              <span class="text-sm text-slate-600">Estado</span>
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 bg-green-400 rounded-full"></div>
                <span class="text-sm font-medium text-green-700">Activo</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Configuración Avanzada -->
        <div>
          <h3 class="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <svg class="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clip-rule="evenodd" />
            </svg>
            Configuración
          </h3>

          <div class="space-y-2">
            <div class="flex justify-between items-center py-1.5">
              <div>
                <div class="text-sm font-medium text-slate-800">Registros sin screenshots</div>
                <div class="text-xs text-slate-500">Solo guardar timeline sin capturas de pantalla</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="settings.disableScreenshots" @change="saveSettings"
                  class="sr-only peer">
                <div
                  class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500">
                </div>
              </label>
            </div>
          </div>
        </div>

      </div>
    </main>

    <!-- Modal de confirmación para limpiar -->
    <div v-if="showConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
        <div class="flex items-center mb-4">
          <svg class="w-6 h-6 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
          <h3 class="text-lg font-semibold text-slate-800">Confirmar Limpieza</h3>
        </div>

        <p class="text-sm text-slate-600 mb-6">
          ¿Estás seguro de que quieres <strong>eliminar todo el historial</strong>?
          Esta acción no se puede deshacer.
        </p>

        <div class="flex gap-3 justify-end">
          <button @click="cancelClear"
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button @click="confirmClear" :disabled="clearingData"
            class="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded text-sm font-medium transition-colors">
            {{ clearingData ? 'Limpiando...' : 'Confirmar' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/* global chrome */
import { computed, ref, onMounted, onUnmounted } from 'vue';
import TimelineView from '../components/TimelineView.vue';
import { useBackgroundCommunication, useFormatting, useTimelineStats, useDatetime } from '../composables/usePopup.js';

// Composables
const { getTimelineData, clearTimelineData } = useBackgroundCommunication();
const { formatDuration } = useFormatting();
const { calculateStats } = useTimelineStats();
const { getCurrentDate } = useDatetime();

// Estado reactivo
const activeTab = ref('timeline');
const timeline = ref([]);
const loading = ref(true);
const clearingData = ref(false);
const showConfirmModal = ref(false);
const settings = ref({
  disableScreenshots: false
});
let refreshInterval = null;

// Fecha formateada
const formattedDate = computed(() => getCurrentDate());

// Estadísticas computadas
const stats = computed(() => calculateStats(timeline.value));

/**
 * Obtiene los datos del timeline desde el background
 */
async function fetchTimelineData() {
  try {
    loading.value = true;
    console.log('Solicitando datos del timeline...');

    // Verificar que chrome.runtime esté disponible
    if (!chrome || !chrome.runtime) {
      throw new Error('Chrome extension API no disponible');
    }

    const response = await getTimelineData();
    console.log('Respuesta recibida:', response);

    // Verificar si hay error en la respuesta
    if (response && response.error) {
      console.error('Error en respuesta del background:', response.error);
      timeline.value = [];
      return;
    }

    // Verificar estructura válida de respuesta
    if (response && response.session) {
      if (Array.isArray(response.session.timeline)) {
        // Ordenar entradas por timestamp (más recientes primero)
        timeline.value = [...response.session.timeline].sort((a, b) => b.timestamp - a.timestamp);
        console.log('Timeline cargado correctamente, entradas:', timeline.value.length);
      } else {
        console.warn('Timeline no es un array válido:', response.session.timeline);
        timeline.value = [];
      }
    } else {
      console.warn('Respuesta sin estructura de sesión válida:', response);
      timeline.value = [];
    }
  } catch (error) {
    console.error('Error obteniendo datos del timeline:');
    console.error('Error details:', error);
    console.error('Error message:', error?.message || 'Unknown error');
    console.error('Error stack:', error?.stack || 'No stack trace');
    timeline.value = [];

    // Solo mostrar alerta para errores graves, no para timeouts normales
    if (error?.message && !error.message.includes('Extension context invalidated')) {
      console.warn('Mostrando error al usuario:', error.message);
    }
  } finally {
    loading.value = false;
  }
}

/**
 * Muestra el modal de confirmación para limpiar
 */
function showClearConfirmation() {
  console.log('Mostrando modal de confirmación para limpiar');
  showConfirmModal.value = true;
}

/**
 * Cancela la operación de limpieza
 */
function cancelClear() {
  console.log('Operación de limpieza cancelada');
  showConfirmModal.value = false;
}

/**
 * Confirma y ejecuta la limpieza
 */
function confirmClear() {
  console.log('Usuario confirmó limpieza, ejecutando...');
  showConfirmModal.value = false;
  clearTimelineHandler();
}

/**
 * Limpia todos los datos del timeline
 */
async function clearTimelineHandler() {
  console.log('CLEAR: Iniciando proceso de limpieza...');

  // Prevenir múltiples ejecuciones
  if (clearingData.value) {
    console.log('CLEAR: Ya se está ejecutando, ignorando...');
    return;
  }

  try {
    clearingData.value = true;
    console.log('CLEAR: Enviando comando de limpieza al background...');

    const response = await clearTimelineData();
    console.log('CLEAR: Respuesta recibida del background:', response);

    if (response && response.error) {
      console.error('CLEAR: Error en respuesta del background:', response.error);
      alert('Error: ' + response.error);
      return;
    }

    // Limpiar timeline local inmediatamente
    timeline.value = [];
    console.log('CLEAR: Timeline local limpiado');

    // Mostrar mensaje de éxito temporal
    showSuccessMessage();

    // Refrescar datos después de un breve delay para verificar
    setTimeout(async () => {
      console.log('CLEAR: Verificando que la limpieza fue efectiva...');
      await fetchTimelineData();
      console.log('CLEAR: Verificación completada - entradas restantes:', timeline.value.length);
    }, 500);

  } catch (error) {
    console.error('CLEAR: Error durante el proceso:', error);
    alert('Error limpiando datos: ' + error.message);
  } finally {
    clearingData.value = false;
    console.log('CLEAR: Proceso finalizado');
  }
}

/**
 * Muestra un mensaje de éxito temporal
 */
function showSuccessMessage() {
  // Crear un elemento de notificación temporal
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
  notification.textContent = '¡Historial limpiado exitosamente!';
  notification.style.zIndex = '9999';

  document.body.appendChild(notification);

  // Remover después de 3 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

/**
 * Visita una URL abriendo una nueva pestaña
 * @param {string} url - URL a visitar
 */
function visitUrl(url) {
  if (url) {
    chrome.tabs.create({ url: url });
  }
}

/**
 * Carga la configuración desde el almacenamiento
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['extensionSettings']);
    console.log('Configuración cargada desde storage:', result);
    if (result.extensionSettings) {
      settings.value = { ...settings.value, ...result.extensionSettings };
      console.log('Configuración aplicada:', settings.value);
    }
  } catch (error) {
    console.error('Error cargando configuración:', error);
  }
}

/**
 * Guarda la configuración en el almacenamiento
 */
async function saveSettings() {
  try {
    console.log('Guardando configuración:', settings.value);
    await chrome.storage.local.set({ extensionSettings: settings.value });

    // Enviar mensaje al background para actualizar la configuración
    const response = await chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings.value
    });
    console.log('Respuesta del background:', response);
  } catch (error) {
    console.error('Error guardando configuración:', error);
  }
}

// Lifecycle hooks
onMounted(() => {
  fetchTimelineData();
  loadSettings();
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>
