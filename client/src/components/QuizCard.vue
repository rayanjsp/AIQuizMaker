<script setup>
import { getDifficultyColor } from '@/utils/difficultyHelpers';

const props = defineProps({
  quiz: { type: Object, required: true }
});
const emit = defineEmits(['open']);
</script>

<template>
  <div
    @click="emit('open', quiz)"
    class="bg-white rounded-xl shadow-sm hover:shadow-md transition border border-gray-100 p-6 flex flex-col cursor-pointer group"
  >
    <div class="flex justify-between items-start mb-4">
      <span :class="`px-2 py-1 rounded text-xs font-semibold ${getDifficultyColor(quiz.difficulty)}`">
        {{ quiz.difficulty }}
      </span>
      <span class="text-xs text-gray-400">{{ new Date(quiz.createdAt).toLocaleDateString() }}</span>
    </div>
    <h3 class="text-lg font-bold text-gray-800 mb-2 truncate group-hover:text-blue-600 transition">{{ quiz.title }}</h3>
    <p class="text-sm text-gray-500 mb-4 flex-grow">Sujet : {{ quiz.topic }}</p>
    <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
      <span class="text-sm text-gray-600">❓ {{ quiz.questions?.length || 0 }} Questions</span>
    </div>
  </div>
</template>
