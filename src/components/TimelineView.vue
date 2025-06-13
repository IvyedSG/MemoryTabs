<template>
  <div class="space-y-3">
    <!-- Buscador -->
    <div class="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 pb-3 mb-3 -mx-4 px-4">
      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchText"
          type="text"
          placeholder="Buscar por título o dominio..."
          class="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white/80 placeholder-slate-400 transition-all duration-200"
        />
        <div v-if="searchText" class="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            @click="clearSearch"
            class="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-100"
            title="Limpiar búsqueda"
          >
            <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Contador de resultados -->
      <div v-if="searchText && filteredTimeline.length !== timeline.length" class="text-xs text-slate-500 mt-2 flex items-center gap-1">
        <svg class="h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {{ filteredTimeline.length }} de {{ timeline.length }} entradas
      </div>
    </div>

    <!-- Timeline agrupado por días -->
    <div v-if="groupedTimeline.length > 0" class="space-y-6">
      <div v-for="dayGroup in groupedTimeline" :key="dayGroup.dateKey" class="space-y-3">
        <!-- Separador de día -->
        <div class="flex items-center gap-3 py-2">
          <div class="flex-shrink-0">
            <div class="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-sm font-medium">
              {{ dayGroup.dayName }}
            </div>
          </div>
          <div class="flex-1 h-px bg-slate-200"></div>
          <div class="text-xs text-slate-500 font-medium">
            {{ dayGroup.entries.length }} {{ dayGroup.entries.length === 1 ? 'página' : 'páginas' }}
          </div>
        </div>

        <!-- Entradas del día -->
        <div class="space-y-3 ml-3">
          <TimelineEntry
            v-for="entry in dayGroup.entries"
            :key="entry.id || entry.timestamp"
            :entry="entry"
            :search-term="searchText"
            @visit="$emit('visit', entry.url)"
          />
        </div>
      </div>
    </div>

    <!-- Estado vacío -->
    <div v-else-if="timeline.length === 0" class="text-center py-8">
      <div class="text-slate-400 mb-2">
        <svg class="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd" />
        </svg>
      </div>
      <p class="text-slate-500">No hay entradas en el timeline</p>
      <p class="text-xs text-slate-400 mt-1">Las páginas visitadas aparecerán aquí</p>
    </div>

    <!-- Estado sin resultados de búsqueda -->
    <div v-else-if="searchText && filteredTimeline.length === 0" class="text-center py-8">
      <div class="text-slate-400 mb-2">
        <svg class="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clip-rule="evenodd" />
        </svg>
      </div>
      <p class="text-slate-500">No se encontraron resultados</p>
      <p class="text-xs text-slate-400 mt-1">Intenta con otros términos de búsqueda</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import TimelineEntry from './TimelineEntry.vue';
import { groupTimelineByDay, filterTimeline } from '../utils/helpers.js';

const props = defineProps({
  timeline: {
    type: Array,
    default: () => []
  }
});

defineEmits(['visit']);

// Estado del buscador
const searchText = ref('');

// Timeline filtrado por búsqueda
const filteredTimeline = computed(() => {
  return filterTimeline(props.timeline, searchText.value);
});

// Timeline agrupado por días
const groupedTimeline = computed(() => {
  return groupTimelineByDay(filteredTimeline.value);
});

// Función para limpiar búsqueda
const clearSearch = () => {
  searchText.value = '';
};
</script>
