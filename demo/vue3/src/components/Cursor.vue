<script setup lang="ts">
  import IconCursor from './IconCursor.vue'
</script>
<template>
  <div class="cursor-pointer">
    <div class="cursor-pointer-hd"><IconCursor class="icon-cursor" /></div> 
    <div class="cursor-pointer-line"></div>
  </div>
</template>
<style scoped>
  .cursor-pointer{
    position: absolute;
    top: -24px;
    bottom: 0;
    left: -9px;
    z-index: 15;
    width: 20px;
    background-color: rgba(255, 255, 255, 0);
  }
  .cursor-pointer-hd{
    position: sticky;
    top: 0px;
    left: 0;
  }
  .icon-cursor{
    display: block;
    margin-left: 1px;
    width: 12px;
    height: 16px;
  }
  .cursor-pointer-line{
    position: absolute;
    left: 50%;
    top: 12px;
    bottom: 0;
    margin-left: -1px;
    /* height: 100%; */
    width: 1px;
    font-size: 0;
    background-color: white;
  }
</style>
