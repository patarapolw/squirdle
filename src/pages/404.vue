<script setup lang="ts">
import { useRoute } from 'vue-router'
import { t } from '../assets'

const route = useRoute()

const vLangNotFound = t('LangNotFound', 'Language: {{LANG}} not found').split('{{LANG}}')
</script>

<template>
  <h2 v-if="route.query.lang">
    {{ vLangNotFound[0] }}
    <code>{{ route.query.lang }}</code>
    {{ vLangNotFound[1] }}
  </h2>
  <h2 v-else>{{ t('404') }}</h2>
</template>
