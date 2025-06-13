<template>
  <div
    class="bg-white rounded-lg border border-slate-200 p-3 hover:border-sky-300 hover:shadow-sm transition-all duration-200">
    <!-- Header con tiempo y dominio -->
    <div class="flex items-start justify-between mb-2">
      <div class="flex items-center gap-2 flex-1">
        <!-- Favicon -->
        <div class="w-4 h-4 flex-shrink-0">
          <img v-if="entry.favicon" :src="entry.favicon" :alt="entry.domain"
            class="w-full h-full rounded-sm object-cover" @error="handleFaviconError" />
          <div v-else class="w-full h-full bg-slate-300 rounded-sm flex items-center justify-center">
            <svg class="w-2 h-2 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd"
                d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118C6.004 2.857 4.192 1.5 2.5 1.5A3.5 3.5 0 0 0-1 5v.5c0 2.982 2.616 5.397 5.83 5.498zm6.488 0h1.946C13.366 7.546 13.66 6.122 14.114 4.882 14.996 2.857 16.808 1.5 18.5 1.5A3.5 3.5 0 0 1 22 5v.5c0 2.982-2.616 5.397-5.83 5.498z"
                clip-rule="evenodd" />
            </svg>
          </div>
        </div>

        <!-- Información principal -->
        <div class="flex-1 min-w-0">
          <p
            class="text-sm font-medium text-slate-800 line-clamp-2 leading-tight"
            :title="entry.title"
            v-html="highlightedTitle"
          ></p>
          <p
            class="text-xs text-slate-500 truncate"
            v-html="highlightedDomain"
          ></p>
        </div>
      </div>

      <!-- Tiempo y duración -->
      <div class="text-right flex-shrink-0 ml-2">
        <p class="text-xs text-slate-600">{{ formatTime(entry.timestamp) }}</p>
        <p class="text-xs font-medium text-sky-600">{{ formatDurationShort(entry.duration) }}</p>
      </div>
    </div>

    <!-- Screenshot preview -->
    <div v-if="entry.screenshot" class="mb-2">
      <img :src="entry.screenshot" :alt="entry.title"
        class="w-full h-20 object-cover rounded border border-slate-200 cursor-pointer hover:border-sky-300 transition-colors"
        @click="openScreenshotInNewTab" />
    </div>

    <!-- Botones de acción -->
    <div class="flex gap-2">
      <button v-if="entry.screenshot" @click="openScreenshotInNewTab"
        class="flex-1 py-1.5 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
        Ver captura
      </button>
      <button @click="visitUrl"
        class="flex-1 py-1.5 px-3 text-xs bg-sky-100 hover:bg-sky-200 text-sky-700 rounded transition-colors">
        Visitar
      </button>
    </div>
  </div>
</template>

<script setup>
/* global chrome */
import { computed } from 'vue';
import { useFormatting } from '../composables/usePopup.js';
import { highlightSearchTerm } from '../utils/helpers.js';

const props = defineProps({
  entry: {
    type: Object,
    required: true
  },
  searchTerm: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['visit']);

const { formatTime, formatDurationShort } = useFormatting();

// Texto resaltado para búsqueda
const highlightedTitle = computed(() => {
  const title = props.entry.title || props.entry.domain || 'Sin título';
  return highlightSearchTerm(title, props.searchTerm);
});

const highlightedDomain = computed(() => {
  return highlightSearchTerm(props.entry.domain || '', props.searchTerm);
});

/**
 * Maneja errores de carga de favicon
 */
function handleFaviconError(event) {
  event.target.style.display = 'none';
}

/**
 * Abre el screenshot en una nueva pestaña
 */
function openScreenshotInNewTab() {
  if (props.entry.screenshot) {
    chrome.tabs.create({ url: props.entry.screenshot });
  }
}

/**
 * Emite evento para visitar URL
 */
function visitUrl() {
  emit('visit', props.entry.url);
}
</script>
