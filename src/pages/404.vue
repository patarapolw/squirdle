<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <h2 v-if="route.query.lang">
    LANG:
    <code>{{ route.query.lang }}</code> not Found
  </h2>
  <h2 v-else>404 not found</h2>
</template>
