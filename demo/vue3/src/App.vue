<script setup lang="ts">
import { onMounted, onUnmounted, ref, Ref } from "vue";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "./js/TimelineAxis";
import Cursor from "./components/Cursor.vue";
import { CursorPointer, CURSOR_POINTER_EVENT_TYPE } from "./js/cursorPointer";
import { TRACKS_EVENT_CALLBACK_TYPES, DropableArgs } from "./js/trackType";
import { findEndestSegment } from "./js/trackUtils";
import { SegmentTracks } from "./js/SegmentTracks";
import { SegmentTracksOut } from "./js/SegmentTracksOut";

let timeline: TimelineAxis | null;
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
  timeline?.scrollLeft(-dom.scrollLeft);
};

let zoomRatio = 1;

const zoomIn = () => {
  zoomRatio += 0.1;
};
const zoomOut = () => {
  zoomRatio -= 0.1;
};
const syncByZoom = (zoom: number) => {
  // 根据缩放比较，减小滚动宽度
  if (zoom) {
    timeline?.zoom(zoom);
    segmentTracks?.scaleX(zoom);
    // 根据帧数变更游标位置
    if (trackCursor) {
      trackCursor.sync();
    }
  }
}
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  e.deltaY > 0 ? zoomOut() : zoomIn();
  if (zoomRatio <= 0.1 || zoomRatio >= 1.4) {
    return;
  }
  syncByZoom(zoomRatio)
};

const handlePlay = () => {
  if (!timeline) {
    return;
  }
  if (timeline.currentFrame === timeline.totalFrames) {
    timeline.play(0);
    return;
  }
  timeline?.play();
};

// 增加轨道内容宽度
const addTrackWidth = (trackCursor: CursorPointer) => {
  const [segment, right] = findEndestSegment();
  if (!segment) {
    return;
  }
  if (scrollContentWidth.value < right) {
    scrollContentWidth.value = right + 800;
    trackCursor.refresh();
  }
};

const initApp = () => {
  if (
    !cursorRef.value?.$el ||
    !scrollContentRef.value ||
    !scrollContainerRef.value
  ) {
    return;
  }
  // 轨道，轨道容器，可拖入轨道列表
  if (!segmentItemListRef.value) {
    return;
  }
  const segmentItemList: HTMLElement = segmentItemListRef.value;

  const cursor: HTMLElement = cursorRef.value.$el;
  const scrollContainer: HTMLElement = scrollContainerRef.value;
  const scrollContent: HTMLElement = scrollContentRef.value;
  stageWidth.value = scrollContainer.getBoundingClientRect().width;
  scrollContentWidth.value = stageWidth.value;

  // 初始化时间轴
  timeline = new TimelineAxis({
    el: "canvasStage",
    totalMarks: 500,
    totalFrames: 1220,
    stageWidth: stageWidth.value,
  });

  timeline.addEventListener(TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME, () => {
    trackCursor.sync();
  });
  // 初始化游标
  trackCursor = new CursorPointer(scrollContent, cursor, timeline);
  trackCursor.addEventListener(
    CURSOR_POINTER_EVENT_TYPE.CURSOR_UPDATE,
    (currentFrame) => {
      console.log(currentFrame);
      timeline?.setCurrentFrame(currentFrame);
    }
  );

  // 初始化轨道
  segmentTracks = new SegmentTracks({ trackCursor, scrollContainer, timeline });
  segmentTracks.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.DRAG_END, () => {
    addTrackWidth(trackCursor);
  });

  // 初始化轨道外可拖 segment 片断
  segmentTracksOut = new SegmentTracksOut({
    trackCursor,
    scrollContainer,
    segmentDelegete: segmentItemList,
    timeline,
  });
  segmentTracksOut.addEventListener(
    TRACKS_EVENT_CALLBACK_TYPES.DRAG_END,
    (a,b,c) => {
      setTimeout(() => {
        addTrackWidth(trackCursor);
      }, 0);
    }
  );
};

onMounted(() => {
  initApp();
});
onUnmounted(()=> {
  segmentTracks.unMounted();
})
</script>

<template>
  <div class="wrapper">
    <div class="segment-list" ref="segmentItemListRef">
      <div class="segment-item">拖我</div>
      <div class="segment-item">拖我</div>
      <div class="segment-item">拖我</div>
      <div class="segment-item">拖我</div>
      <div class="segment-item">拖我</div>
    </div>
    <div class="timeline-container" @wheel.ctrl="handleWheel">
      <div class="track-operation">
        <div class="track-operation-item">普通轨道</div>
        <div class="track-operation-item">普通轨道</div>
        <div class="track-operation-item">伸缩轨道</div>
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
          <div
            class="track-list"
            ref="trackListRef"
            :style="{ width: `${scrollContentWidth}px` }"
          >
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
            </div>
            <div class="track track-stretch">
              <div class="track-placeholder"></div>
            </div>
          </div>
        </div>
        <Cursor ref="cursorRef" />
      </div>
    </div>
    <div style="display: flex; gap: 10px">
      <button @click="handlePlay">play</button>
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
  background-color: #0f0c0c;
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
  border-right: 1px solid black;
  background-color: rgba(white, .01);
  .track-operation-item {
    margin-bottom: 2px;
    padding-left: 6px;
    font-size: 12px;
    height: @trackHeight;
    line-height: @trackHeight;
    color: rgba(255, 255, 255, .5);
    background-color: rgba(white, 0.05);
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

  .actived.segment {
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
    display: flex;
    align-items: center;
    justify-content: center;
    width: 80px;
    height: 80px;
    border-radius: 4px;
    color: green;
    background-color: bisque;
    cursor: move;
  }
}

.segment-fake {
  width: 100%;
  height: 100%;
  background-color: #c66136;
  opacity: 0.8;
}
.segment-name {
  padding: 0 6px;
  font-size: 11px;
  color: white;
  text-overflow: ellipsis;
  overflow: hidden;
  line-height: 24px;
  pointer-events: none;
}
.segment-handle {
  position: absolute;
  width: 4px;
  height: 100%;
  z-index: 2;
  cursor: col-resize;
  background-color: rgba(255, 255, 255, 0);
}
.segment-handle-left {
  left: 0;
}
.segment-handle-right {
  right: 0;
}
</style>
