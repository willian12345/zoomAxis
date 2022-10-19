<script setup lang="ts">
import { onMounted, ref, Ref } from "vue";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "./js/TimelineAxis";
import Cursor from "./components/Cursor.vue";
import { CursorPointer, CURSOR_POINTER_EVENT_TYPE } from "./js/cursorPointer";
import {
  TRACKS_EVENT_CALLBACK_TYPES,
  DropableArgs,
} from "./js/trackType";
import { findEndestSegment } from './js/trackUtils'
import { SegmentTracks } from './js/SegmentTracks'
import { SegmentTracksOut } from './js/SegmentTracksOut'


let timelineAxis: TimelineAxis | null;
let trackCursor: CursorPointer;
let segmentTracks: SegmentTracks;
let segmentTracksOut: SegmentTracksOut;
let stageWidth = ref(920);
const scrollContentWidth = ref(920);
const scrollContainerRef = ref<HTMLElement | null>(null);
const cursorRef = ref<InstanceType<typeof Cursor> | null>(null);
const scrollContentRef = ref<HTMLElement | null>(null);
const trackListRef = ref<HTMLElement | null>(null);
const segmentItemListRef = ref<HTMLElement | null>(null);
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  timelineAxis?.scrollLeft(-dom.scrollLeft);
};

let zoomRatio = 1;

const zoomIn = () => {
  zoomRatio += .1
}
const zoomOut = () => {
  zoomRatio -= .1
}
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  e.deltaY > 0 ? zoomOut() : zoomIn();
  if(zoomRatio < 0.2 || zoomRatio > 1.4){
    return
  }
  // scrollContentWidth.value = scrollContentUnscaledWidth * zoomRatio;
  // 根据缩放比较，减小滚动宽度
  if (timelineAxis?.zoomRatio) {
    timelineAxis.zoom(zoomRatio);
    segmentTracks?.scaleX(zoomRatio);
    // 根据帧数变更游标位置
    if(trackCursor){
      trackCursor.syncLeft()
    }
  }
};

const handlePlay = () => {
  if(!timelineAxis){
    return;
  }
  if(timelineAxis.currentFrame === timelineAxis.totalFrames){
    timelineAxis.play(0)
    return
  }
  timelineAxis?.paused ? timelineAxis?.play() : timelineAxis?.pause();
};

// 增加轨道内容宽度
const addTrackWidth = (trackCursor: CursorPointer) => {
  const [segment, right] = findEndestSegment();
  if(!segment){
    return
  }
  if(scrollContentWidth.value < right){
    scrollContentWidth.value = right + 800
    trackCursor.refresh();
  }
}

// 用于判断是否可拖动的条件
const dropableCheck = function (startFrame: number) {
  return new Promise<DropableArgs>(async (resolve, reject) => {
    resolve({dropable: true, endFrame: startFrame + 30})
  });
};

const initApp = () => {
  if (!cursorRef.value?.$el || !scrollContentRef.value || !scrollContainerRef.value) {
    return;
  }
  // 轨道，轨道容器，可拖入轨道列表
  if (!segmentItemListRef.value) {
    return;
  }
  const segmentItemList: HTMLElement = segmentItemListRef.value;

  const cursor: HTMLElement = cursorRef.value.$el;
  const scrollContainer: HTMLElement = scrollContainerRef.value
  const scrollContent: HTMLElement = scrollContentRef.value
  stageWidth.value = scrollContainer.getBoundingClientRect().width;
  scrollContentWidth.value = stageWidth.value
  
  // 初始化时间轴
  timelineAxis = new TimelineAxis({
    el: "canvasStage",
    totalMarks: 500,
    totalFrames: 30,
    stageWidth: stageWidth.value,
  });

  let a = (+ new Date())
  timelineAxis.addEventListener(
    TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME,
    function (this: TimelineAxis, curentFrame, eventType) {
      console.log(this.spaceTimeSecond, this.frameRate, this.markWidth)
      // 当前帧 * mark 周期 / ( 帧频 * mark 周期倍数 )
      const left = curentFrame * (this.spacecycle / (this.frameRate * this.spaceTimeSecond)) * this.markWidth;
      cursor.style.transform = `translateX(${left}px)`;
      if(this.currentFrame === 0){
        a = (+ new Date())
      }
      // console.log(this.currentFrame, +new Date() - a);
    }
  );
  // 初始化游标
  trackCursor = new CursorPointer(
    scrollContent,
    cursor,
    timelineAxis,
  );
  trackCursor.addEventListener(CURSOR_POINTER_EVENT_TYPE.CURSOR_UPDATE, (currentFrame) => {
    console.log(currentFrame)
    timelineAxis?.setCurrentFrame(currentFrame)
  })
  
  // 初始化轨道
  segmentTracks = new SegmentTracks({trackCursor, scrollContainer, timelineAxis})
  segmentTracks.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.DRAG_END, () => {
    addTrackWidth(trackCursor);
  })
  
  
  // 初始化轨道外可拖 segment 片断
  segmentTracksOut = new SegmentTracksOut({trackCursor, scrollContainer, segmentDelegete: segmentItemList, timelineAxis, dropableCheck});
  segmentTracksOut.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.DRAG_END, () => {
    setTimeout(() => {
      addTrackWidth(trackCursor);  
    }, 0);
  })
};

onMounted(() => {
  initApp();
});
</script>

<template>
  <div class="wrapper">
    <div class="segment-list" ref="segmentItemListRef">
      <div class="segment-item"></div>
      <div class="segment-item"></div>
      <div class="segment-item"></div>
      <div class="segment-item"></div>
      <div class="segment-item"></div>
    </div>
    <div class="timeline-container" @wheel.ctrl="handleWheel">
      <div class="track-operation">
        <div class="track-operation-item"></div>
      </div>
      <div
        class="webkit-scrollbar scroll-container"
        @scroll="handleScroll"
        ref="scrollContainerRef"
      >
        <div class="timeline-markers" :style="{ width: `${stageWidth}px` }">
          <div id="canvasStage"></div>
        </div>
        <div
          class="scroll-content"
          ref="scrollContentRef"
          :style="{ width: `${scrollContentWidth}px` }"
        >
          <!-- :style="{ width: `${stageWidth}px` }" -->
          <div class="track-list" ref="trackListRef" :style="{ width: `${scrollContentWidth}px` }">
            <div class="track">
              <div class="track-placeholder">
                <!-- <div class="segment-placeholder"></div> -->
              </div>
              <!-- <div
                class="segment segment-action"
                data-width="164"
                data-left="0"
                :style="{ width: `164px`, left: '0px' }"
              ></div>
              <div
                class="segment segment-action"
                data-width="100"
                data-left="300"
                :style="{ width: `100px`, left: '300px' }"
              ></div>
              <div
                class="segment segment-action"
                data-width="60"
                data-left="400"
                :style="{ width: `60px`, left: '400px' }"
              ></div> -->
            </div>
            <div class="track">
              <div class="track-placeholder"></div>
              <!-- <div
                class="segment segment-action"
                data-width="80"
                data-left="0"
                :style="{ width: `80px`, left: '0px' }"
              ></div> -->
            </div>
          </div>
        </div>
        <Cursor ref="cursorRef" />
      </div>
    </div>
    <div style="display: flex; gap: 10px">
      <button @click="handlePlay">play</button>
      <button @click="findEndestSegment">最右侧片断</button>
    </div>
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
  min-height: 24px;
  border-radius: 4px;
  background-color: rgba(aquamarine, 0.8);
}

.wrapper {
  padding: 100px 40px 0;
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

.track-operation {
  padding-top: @markHeight;
  flex-basis: 120px;

  .track-operation-item {
    background-color: rgba(white, 0.05);
    height: @markHeight;
  }
}

.segment-wrapper {
  height: @trackHeight;
  pointer-events: all;
  position: absolute;
}

.track-list {
  padding-top: @markHeight;
  width: 100%;
  .track {
    pointer-events: none;
    position: relative;
    width: 100%;
    height: @trackHeight;
    background-color: rgba(white, 0.04);
  }

  .track {
    margin-bottom: 2px;
  }

  .track-placeholder {
    bottom: 0;
    left: 0;
    overflow: hidden;
    position: absolute;
    right: 0;
    top: 0;
  }

  .segment {
    position: absolute;
    left: 0;
    top: 1px;
    right: 0;
    bottom: 0;
    z-index: 1;
    height: 24px;
    border-radius: 4px;
    pointer-events: all;
    border: 1px solid transparent;
  }

  .segment-action {
    background-color: #c66136;
  }

  .actived.segment{
    border: 1px solid white;
  }

  .dragover {
    background-color: rgba(white, 0.08);
  }

  .segment-placeholder {
    position: absolute;
    z-index: 1;
    width: 0;
    height: 100%;
    border-radius: 4px;
    background-color: rgba(aquamarine, 0.3);
  }
}

.segment-list {
  display: flex;
  gap: 20px;

  .segment-item {
    width: 80px;
    height: 80px;
    border-radius: 4px;
    background-color: bisque;
  }
}

.segment-fake {
  width: 100%;
  height: 100%;
  background-color: #c66136;
  opacity: 0.8;
}
</style>
