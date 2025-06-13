<template>
  <div class="space-y-3">
    <!-- Lista de entradas del timeline -->
    <div class="space-y-3">
      <TimelineEntry v-for="entry in timeline" :key="entry.id || entry.timestamp" :entry="entry"
        @visit="$emit('visit', entry.url)" />
    </div>

    <!-- Estado vacío -->
    <div v-if="timeline.length === 0" class="text-center py-8">
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
  </div>
</template>

<script setup>
import TimelineEntry from './TimelineEntry.vue';

defineProps({
  timeline: {
    type: Array,
    default: () => []
  }
});

defineEmits(['visit']);
</script>
