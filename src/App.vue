<script setup lang="ts">
import { onMounted, ref } from "vue";
import { TimelineAxis } from "./js/TimelineAxis";
import Cursor from "./components/Cursor.vue";

let timelineAxis: TimelineAxis | null;
let initScrollContentWidth = 36000;
const totalTime = 2;
const scrollContentWidth = ref(initScrollContentWidth);
const cursorRef = ref<InstanceType<typeof Cursor> |null>(null);
const scrollContentRef = ref(null);
const currentCursorFrame = 0;
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  const scrollRatio = dom.scrollLeft / (dom.scrollWidth - 1040); // 滚动比例
  timelineAxis?.scrollByRatio(scrollRatio);
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  e.deltaY > 0 ? timelineAxis?.zoomIn() : timelineAxis?.zoomOut();
  if (timelineAxis?.zoomRatio) {
    scrollContentWidth.value = initScrollContentWidth * timelineAxis?.zoomRatio;
  }
};

function getTranslateXY(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const matrix = new DOMMatrixReadOnly(style.transform);
  return {
    translateX: matrix.m41,
    translateY: matrix.m42,
  };
}

// 初始化游标
const initCursor = () => {
  if (!cursorRef.value?.$el || !scrollContentRef.value) {
    return;
  }
  const cursorDom: HTMLElement = cursorRef.value.$el;
  const scrollContentDom: HTMLElement = scrollContentRef.value;
  const cursorWidth = cursorDom.getBoundingClientRect().width;
  const rightBoundary = scrollContentDom.offsetWidth - 1;
  const leftBoundary = 0
  // 游标拖动
  cursorDom.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    let startX = e.clientX;
    const handleMouseup = (e: MouseEvent) => {
      startX = e.clientX;
      document.removeEventListener("mouseup", handleMouseup);
      document.removeEventListener("mousemove", handleMousemove);
    };
    const handleMousemove = (e: MouseEvent) => {
      const movedX = e.clientX - startX;
      const { translateX } = getTranslateXY(cursorDom);
      let x = translateX + movedX;
      if (x < leftBoundary) {
        x = leftBoundary;
      } else if (x > rightBoundary) {
        x = rightBoundary;
      }
      cursorDom.style.transform = `translateX(${x}px)`;
      startX = e.clientX;
    };
    document.addEventListener("mouseup", handleMouseup);
    cursorDom.addEventListener("mouseup", handleMouseup);
    document.addEventListener("mousemove", handleMousemove);
  });
  // 滚动区域点击
  scrollContentDom.addEventListener("mouseup", (e: MouseEvent) => {
    let x = e.clientX - scrollContentDom.getBoundingClientRect().left;
    if (x < leftBoundary) {
      x = leftBoundary;
    } else if (x > rightBoundary) {
      x = rightBoundary;
    }
    cursorDom.style.transform = `translateX(${x}px)`;
  });
};

const handlePlay = ()=> {
  timelineAxis?.paused ? timelineAxis?.play() : timelineAxis?.pause()
  
}

onMounted(() => {
  timelineAxis = new TimelineAxis({
    el: "canvasStage",
    totalTime,
  });

  initCursor();
});
</script>

<template>
  <div class="wrapper">
    <div class="timeline-container" @wheel.ctrl="handleWheel">
      <div class="webkit-scrollbar scroll-container" @scroll="handleScroll">
        <div class="timeline-ruler">
          <div id="canvasStage"></div>
        </div>
        <div
          class="scroll-content"
          ref="scrollContentRef"
          :style="{ width: `${scrollContentWidth}px` }"
        ></div>
        <Cursor ref="cursorRef" />
        
      </div>
      
    </div>
    <button @click="handlePlay">play</button>
  </div>
</template>

<style scoped>
.wrapper{
  padding: 40px;
}
.timeline-container {
  position: relative;
  margin: 180px 40px;
  width: 100vh;
  height: 180px;
}
.timeline-ruler {
  position: sticky;
  left: 0;
  top: 0;
  width: 1040px;
  z-index: 2;
  background-color: #242424;
  pointer-events: none;
}
.scroll-container {
  position: relative;
  left: 0;
  top: 0;
  right: 0;
  width: 1040px;
  height: 100%;
  overflow-y: hidden;
  overflow-x: auto;
  overflow-x: overlay;
}
.scroll-content {
  position: absolute;
  left: 0;
  top: 0;
  width: 12000px;
  height: 100%;
  background: rgba(255, 255, 255, 0.5);
}
</style>
