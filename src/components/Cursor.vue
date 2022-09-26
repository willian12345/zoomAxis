<script setup lang="ts">
  import IconCursor from './IconCursor.vue'
</script>
<template>
  <div class="cursor-pointer">
    <IconCursor class="icon-cursor" />
    <div class="cursor-pointer-line"></div>
  </div>
</template>
<style scoped>
  .cursor-pointer{
    position: absolute;
    width: 20px;
    height: 140px;
    background-color: rgba(255, 255, 255, 0);
    overflow-y: hidden;
  }
  .icon-cursor{
    position: absolute;
    top: 0px;
    left: 50%;
    margin-left: -8px;
    width: 12px;
    height: 16px;
  }
  .cursor-pointer-line{
    position: absolute;
    left: 50%;
    top: 16px;
    margin-left: -1px;
    height: 100%;
    width: 1px;
    font-size: 0;
    background-color: white;
  }
</style>