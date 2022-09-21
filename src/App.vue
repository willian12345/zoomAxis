<script setup lang="ts">
  import { onMounted, ref } from 'vue';
  import { ZoomAxis } from './js/ZoomAxis'

  let zoomAxis: ZoomAxis|null;
  let initScrollContentWidth = 12000
  const scrollContentWidth = ref(initScrollContentWidth)
  // 左右滚动
  const handleScroll = (e: UIEvent) => {
    if(!e){
      return
    }
    const dom = e.target as HTMLElement
    const scrollRatio = dom.scrollLeft / (dom.scrollWidth - 1040)
    const axisLeft = scrollRatio * (20 * 80 * 10)
    zoomAxis?.scrollX(-axisLeft)
  }
  // 滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    e.deltaY > 0 ? zoomAxis?.zoomIn() : zoomAxis?.zoomOut()
    if(zoomAxis?.zoomRatio){
      scrollContentWidth.value = initScrollContentWidth * zoomAxis?.zoomRatio
      console.log(zoomAxis?.zoomRatio, scrollContentWidth.value)
    }
  }
  
  onMounted(()=> {
    zoomAxis = new ZoomAxis('canvasStage')
  })
  
</script>

<template>
  <div class="ruler-container" @wheel="handleWheel">
    <div class="ruler">
      <canvas class="canvas-stage" id="canvasStage" height="48"></canvas>  
    </div>
    <div class="scroll-container" @scroll="handleScroll">
      <div class="scroll-content" :style="{width: `${scrollContentWidth}px`}"></div>
    </div>
  </div>
  
</template>

<style scoped>
  .ruler-container{
    padding: 40px;
    width:  100vh;
    height:  80px;
  }
  .ruler{
    width: 1040px;
    background-color: #242424;
  }
  .canvas-stage{
    width: 100%;
    height: 24px;
    vertical-align: middle;
  }
  .scroll-container{
    width:  100vh;
    height:  80px;
    overflow-y: hidden;
    overflow-x: auto;
  }
  .scroll-content{
    width: 12000px;
    height: 100px;
    background: rgba(255, 255, 255, .5);
  }
</style>
