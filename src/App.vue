<script setup lang="ts">
import { onMounted, ref } from "vue";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "./js/TimelineAxis";
import Cursor from "./components/Cursor.vue";
import { isStaticProperty } from "@vue/compiler-core";

let timelineAxis: TimelineAxis | null;
let initScrollContentWidth = 1040;
let stageWidth = 1040;
const scrollContentWidth = ref(initScrollContentWidth);
const cursorRef = ref<InstanceType<typeof Cursor> |null>(null);
const scrollContentRef = ref(null);
const trackListRef = ref<HTMLElement|null>(null);
const currentCursorFrame = 0;
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  const scrollRatio = dom.scrollLeft / (dom.scrollWidth - stageWidth); // 滚动比例
  console.log(dom.scrollLeft)
  timelineAxis?.scrollLeft(-dom.scrollLeft);
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  e.deltaY > 0 ? timelineAxis?.zoomIn() : timelineAxis?.zoomOut();
  console.log(timelineAxis?.markWidth)
  if (timelineAxis?.zoomRatio) {
    const scaleWidth = initScrollContentWidth * timelineAxis?.zoomRatio;
    scrollContentWidth.value = (scaleWidth >= stageWidth) ? scaleWidth : stageWidth
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

const handlePlay = () => {
  timelineAxis?.paused ? timelineAxis?.play() : timelineAxis?.pause()
}
const createDragTrackContainer = () => {
  const div = document.createElement('div')
  div.className = 'track-drag-container'
  document.body.appendChild(div)
  return div
}
const getDragTrackCotainer = () => {
  let div = Array.from(document.body.children).find(element => {
    return element.className === 'track-drag-container'
  }) ?? createDragTrackContainer();
  return div
}
const initTrackItem = (trackItem: HTMLElement, tracks: HTMLElement[]) => {
  if(!trackListRef.value){
    return
  }
  const trackListRects = trackListRef.value?.getBoundingClientRect();
  const dragTrackContainer = getDragTrackCotainer() as HTMLElement
  const trackPlaceHolder = trackItem.querySelector('.track-placeholder') as HTMLElement
  const trackItemRect = trackItem.getBoundingClientRect()
  let originTrack:HTMLElement|null = null
  const segment = trackItem.querySelector('.segment') as HTMLElement
  segment.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    let startX = e.clientX;
    let startY = e.clientY;
    originTrack = segment.parentElement
    const { left, top } = segment.getBoundingClientRect()
    dragTrackContainer.style.left = `${left}px`; 
    dragTrackContainer.style.top = `${top}px`;
    dragTrackContainer.appendChild(segment)
    const handleMouseup = (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const movedX = e.clientX - startX;
      console.log(movedX)
      tracks.forEach( track => {
        track.classList.remove('dragover')
        const trackRect = track.getBoundingClientRect()
        const distanceY = Math.abs(trackRect.top + (trackRect.height * .5) - e.clientY)
        if(distanceY < 10){
          const {left, top} = dragTrackContainer.getBoundingClientRect()
          segment.style.left = `${left - trackListRects.left}px`
          track.appendChild(segment)
          console.log(track)
        }
      })
      if(dragTrackContainer.children.length){
        originTrack?.appendChild(segment)
      }
      document.removeEventListener("mouseup", handleMouseup);
      document.removeEventListener("mousemove", handleMousemove);
    };
    const handleMousemove = (e: MouseEvent) => {
      const movedX = e.clientX - startX;
      const movedY = e.clientY - startY;
      const {left, top} = dragTrackContainer.getBoundingClientRect()
      let x = left + movedX;
      let y = top + movedY;
      dragTrackContainer.style.left = `${x}px`; 
      dragTrackContainer.style.top = `${y}px`;
      tracks.forEach( track => {
        const trackRect = track.getBoundingClientRect()
        const distanceY = Math.abs(trackRect.top + (trackRect.height * .5) - e.clientY)
        if(distanceY < 10){
          tracks.forEach((element: HTMLElement) => {
            element.classList.remove('dragover')
          });
          track.classList.add('dragover')
        }
      })
      
      startX = e.clientX;
      startY = e.clientY;
    };
    document.addEventListener("mouseup", handleMouseup);
    document.addEventListener("mousemove", handleMousemove);
  });
}
const initTracks = () => {
  const tracks: HTMLElement[] = Array.from(document.querySelectorAll('.track'))
  tracks.forEach(trackItem => {
    initTrackItem(trackItem, tracks)
  })
}
const initApp = () => {
  if (!cursorRef.value?.$el || !scrollContentRef.value) {
    return;
  }
  const cursorDom: HTMLElement = cursorRef.value.$el;
  timelineAxis = new TimelineAxis({
    el: "canvasStage",
    totalMarks: 500,
    totalFrames: 10,
  });
  timelineAxis.addEventListener(TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME, function(this:TimelineAxis, curentFrame, eventType){
    console.log(this, curentFrame, eventType)
    const frameWidth = this.markWidth ?? 0
    const frameRate = this.frameRate
    const left = curentFrame * frameWidth - frameWidth
    cursorDom.style.transform = `translateX(${left}px)`;
  })


  // initCursor();
  initTracks();
}

onMounted(() => {
  initApp()
});
</script>

<template>
  <div class="wrapper">
    <div class="timeline-container" @wheel.ctrl="handleWheel">
      <div class="track-operation">
        <div class="track-operation-item">

        </div>
      </div>
      <div class="webkit-scrollbar scroll-container" @scroll="handleScroll">
        <div class="timeline-markers">
          <div id="canvasStage"></div>
        </div>
        <div
          class="scroll-content"
          ref="scrollContentRef"
        >
          <!-- :style="{ width: `${scrollContentWidth}px` }" -->
          <!-- :style="{ width: `${stageWidth}px` }" -->
          <div class="track-list" ref="trackListRef" >
            <div class="track">
              <div class="track-placeholder"></div>
              <div class="segment segment-action" :style="{width: `164px`}"></div>
            </div>
            <div class="track actived">
              <div class="track-placeholder"></div>
              <div class="segment segment-action" :style="{width: `80px`}"></div>
            </div>
          </div>
        </div>
        <Cursor ref="cursorRef" />
      </div>
      
    </div>
    <button @click="handlePlay">play</button>
  </div>
</template>

<style lang="less">
@markHeight: 24px;
@trackHeight: 28px;
.track-drag-container {
  pointer-events: none;
  position: fixed;
  z-index: 9;
  left: 0;
  top: 0;
  height: 24px;
  border-radius: 4px;
  background-color:rgba(aquamarine, .8);
}
.wrapper{
  padding: 40px;
}
.timeline-container {
  display: flex;
  position: relative;
  margin: 180px 40px;
  width: 100vh;
  height: 180px;
}
.timeline-markers {
  position: sticky;
  left: 0;
  top: 0;
  width: 100%;
  line-height: 1;
  z-index: 2;
  background-color: #242424;
  pointer-events: none;
}
.scroll-container {
  position: relative;
  flex: 1;
  height: 100%;
  overflow-y: hidden;
  overflow-x: auto;
  overflow-x: overlay;
}
.scroll-content {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  // background: rgba(255, 255, 255, 0.5);
}
.track-operation{
  padding-top: @markHeight;
  flex-basis: 120px;
  .track-operation-item{
    background-color: rgba(white, .05);
    height: @markHeight;  
  }
}
.segment-wrapper{
  height: @trackHeight;
  pointer-events: all;
  position: absolute;
}
.track-list{
  padding-top: @markHeight;
  .track{
    pointer-events: none;
    position: relative;
    width: 100%;
    height: @trackHeight;
    background-color: rgba(white, .15);
  }
  .track{
    margin-bottom: 2px;
  }
  .track-placeholder{
    bottom: 0;
    left: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    top: 0;
  }
  
  .segment{
    position: absolute;
    left: 0;
    top: 1px;
    right: 0;
    bottom: 0;
    z-index: 100;
    height: 24px;
    border-radius: 4px;
    pointer-events: all;
    border: 1px solid transparent;
  }
  .segment-action{
    background-color: #C66136;
  }
  .actived{
    .segment{
      border: 1px solid white;
    }
  }
  .dragover{
    background-color: rgba(aquamarine, .04);
  }
}
</style>
