<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ZoomAxis } from "./js/ZoomAxis";
import Cursor from "./components/Cursor.vue";

let zoomAxis: ZoomAxis | null;
let initScrollContentWidth = 12000;
const totalTime = 20;
const scrollContentWidth = ref(initScrollContentWidth);
const cursorRef = ref(null);
const timelineContainerRef = ref(null);
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  const scrollRatio = dom.scrollLeft / (dom.scrollWidth - 1040); // 滚动比例
  zoomAxis?.scrollByRatio(scrollRatio);
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault()
  e.deltaY > 0 ? zoomAxis?.zoomIn() : zoomAxis?.zoomOut();
  if (zoomAxis?.zoomRatio) {
    scrollContentWidth.value = initScrollContentWidth * zoomAxis?.zoomRatio;
  }
};

function getTranslateXY(element: HTMLElement) {
    const style = window.getComputedStyle(element)
    const matrix = new DOMMatrixReadOnly(style.transform)
    return {
        translateX: matrix.m41,
        translateY: matrix.m42
    }
}

// 初始化游标
const initCursor = () => {
  if (!cursorRef.value || !timelineContainerRef.value) {
    return;
  }
  const cursorDom: HTMLElement = cursorRef.value;
  const containerDom: HTMLElement = timelineContainerRef.value
  const rightBorder = 1040 + cursorDom.offsetWidth
  // 游标拖动
  cursorDom.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault()
    let startX = e.clientX;
    const handleMouseup = (e: MouseEvent) => {
      startX = e.clientX;
      document.removeEventListener("mouseup", handleMouseup);
      document.removeEventListener("mousemove", handleMousemove);
    };
    const handleMousemove = (e: MouseEvent) => {
      const movedX = e.clientX - startX;
      const { translateX } = getTranslateXY(cursorDom)
      let x = translateX + movedX
      if(x < 0){
        x = 0
      }else if(x > rightBorder){
        x = rightBorder
      }
      cursorDom.style.transform = `translateX(${x}px)`
      startX = e.clientX;
    };
    document.addEventListener("mouseup", handleMouseup);
    cursorDom.addEventListener('mouseup', handleMouseup);
    document.addEventListener("mousemove", handleMousemove);
  });
  // 滚动区域点击
  containerDom.addEventListener("mousedown", (e: MouseEvent) => {
    let x = e.clientX - containerDom.getBoundingClientRect().left
    if(x < 0){
        x = 0
      }else if(x > rightBorder){
        x = rightBorder
      }
    cursorDom.style.transform = `translateX(${x}px)`
  })
};

onMounted(() => {
  zoomAxis = new ZoomAxis({
    el: "canvasStage",
    totalTime,
  });

  initCursor();
});
</script>

<template>
  <div class="timeline-container" @wheel="handleWheel">
    <div class="timeline-ruler">
      <div id="canvasStage"></div>
    </div>
    <div class="scroll-container" @scroll="handleScroll">
      <div
        class="scroll-content"
        ref="timelineContainerRef"
        :style="{ width: `${scrollContentWidth}px` }"
      ></div>
    </div>
    <div class="cursor" ref="cursorRef">
      <Cursor />
    </div>
  </div>
</template>

<style scoped>
.timeline-container {
  position: relative;
  margin: 40px;
  width: 100vh;
  height: 80px;
}
.timeline-ruler {
  width: 1040px;
  background-color: #242424;
  pointer-events: none;
}
.scroll-container {
  width: 1040px;
  height: 80px;
  overflow-y: hidden;
  overflow-x: auto;
}
.scroll-content {
  width: 12000px;
  height: 100px;
  background: rgba(255, 255, 255, 0.5);
}
.cursor {
  position: absolute;
  top: 0px;
  left: -10px;
  z-index: 1;
}
</style>
