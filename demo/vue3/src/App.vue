<script setup lang="ts">
import { onMounted, onUnmounted, ref, Ref } from "vue";
import {
  TimelineAxis,
  TIMELINE_AXIS_EVENT_TYPE,
} from "../../../src/js/TimelineAxis";
import Cursor from "./components/Cursor.vue";
import {
  CursorPointer,
  CURSOR_POINTER_EVENT_TYPE,
} from "../../../src/js/cursorPointer";
import {
  TRACKS_EVENT_TYPES,
  TTrackConfig,
} from "../../../src/js/trackType";
import { Tracks } from "../../../src/js/Tracks";
import { Segment } from "../../../src/js/Segment";

let timeline: TimelineAxis | null;
let trackCursor: CursorPointer;
let segmentTracks: Tracks;
let stageWidth = ref(920);
const scrollContentWidth = ref(920);
let trackWidth = ref(920);
const scrollContainerRef = ref<HTMLElement | null>(null);
const trackHeaderListRef = ref<HTMLElement | null>(null);
const cursorRef = ref<InstanceType<typeof Cursor> | null>(null);
const scrollContentRef = ref<HTMLElement | null>(null);
const trackListRef = ref<HTMLElement | null>(null);
const segmentItemListRef = ref<HTMLElement | null>(null);
let currentSegment: Segment | null = null;
let ctrlDown = false;
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  timeline?.scrollLeft(-dom.scrollLeft);
  if(trackHeaderListRef.value){
    trackHeaderListRef.value.scrollTop = dom.scrollTop;
  }
};

let zoomRatio = 1;

const zoomIn = () => {
  if (zoomRatio >= 1.4) {
    zoomRatio = 1.4;
    return;
  }
  zoomRatio += 0.1;
};
const zoomOut = () => {
  if (zoomRatio <= 0.1) {
    zoomRatio = 0.1;
    return;
  }
  zoomRatio -= 0.1;
};
const syncTrackWidth = () => {
  const trackItemWidth = segmentTracks.width();
  trackWidth.value =
    trackItemWidth < stageWidth.value ? stageWidth.value : trackItemWidth;
};
const syncByZoom = (zoom: number) => {
  // 根据缩放比较，减小滚动宽度
  if (zoom) {
    timeline?.zoom(zoom);
    segmentTracks?.zoom();
    syncTrackWidth();
    // 根据帧数变更游标位置
    if (trackCursor) {
      trackCursor.sync();
    }
  }
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  if(!ctrlDown){
    return; 
  }
  e.stopPropagation();
  e.preventDefault();
  e.deltaY > 0 ? zoomOut() : zoomIn();
  syncByZoom(zoomRatio);
};
document.addEventListener('keydown', (e: KeyboardEvent) => {
  ctrlDown = e.ctrlKey;
})
document.addEventListener('keyup', (e: KeyboardEvent) => {
  ctrlDown = false;
})
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



const tracks: Ref<TTrackConfig[]> = ref([
  {
    trackId: 'a',
    trackText: '轨道组',
    trackType: '1',
    color: '#C66136',
    subTracks: [
      {
        trackId: 'a1',
        trackText: '轨道组轨道一',
        color: '#6C4ACD',
        trackType: '2',
        childOverlapable: true,
      },
      {
        trackId: 'a2',
        trackText: '轨道组轨道二',
        color: '#4767E8',
        trackType: '3',
      },
    ]
  },
  {
    trackId: 'b',
    trackType: '4',
    color: '#6C4ACD',
    trackText: '普通轨道一',
  },
  {
    trackId: 'c',
    trackType: '5',
    color: '#46A9CB',
    trackText: '普通轨道二',
  },
]);
const initApp = () => {
  if (
    !cursorRef.value?.$el ||
    !scrollContentRef.value ||
    !trackListRef.value ||
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
  trackWidth.value = stageWidth.value;

  // 初始化时间轴
  timeline = new TimelineAxis({
    el: "canvasStage",
    tickMarks: 500,
    totalFrames: 1220,
    stageWidth: stageWidth.value,
  });

  timeline.addEventListener(TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME, () => {
    trackCursor.sync();
  });
  // 初始化游标
  trackCursor = new CursorPointer(scrollContent, cursor, timeline);
  trackCursor.addEventListener(
    CURSOR_POINTER_EVENT_TYPE.UPDATE,
    ({ frame }) => {
      console.log(frame);
      timeline?.setCurrentFrame(frame);
    }
  );

  // 初始化轨道
  segmentTracks = new Tracks({
    scrollContainer,
    trackListContainer: trackListRef.value,
    tracks: tracks.value,
    timeline,
    segmentDelegate: segmentItemList,
  });
  segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_ADDED, () => {
    syncTrackWidth();
  });
  // 滚动 timeline  x 轴
  const scrollTimelineX = (pointerX: number) => {
    if (!scrollContainerRef.value) {
      return;
    }
    if (trackWidth.value <= stageWidth.value) {
      return;
    }
    // 修正 pointerX 值
    const scrollContainerLeft =
      scrollContainerRef.value.getBoundingClientRect().left;
    pointerX -= scrollContainerLeft;
    if (pointerX < stageWidth.value - 50 && pointerX > 50) {
      return;
    }
    let direct = 0;
    if (pointerX >= stageWidth.value - 50) {
      direct = 1;
    } else if (pointerX <= 50) {
      direct = -1;
    }
    const dom = scrollContainerRef.value as HTMLElement;
    // 根据当前帧滚动滚动条
    if (dom) {
      dom.scrollLeft += 40 * direct;
    }
  };
  segmentTracks.addEventListener(TRACKS_EVENT_TYPES.DRAGING_OVER, (e) => {
    if (e.pointerEvent) {
      scrollTimelineX(e.pointerEvent?.clientX);
    }
  });
  segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_SELECTED, (e) => {
    currentSegment = e.segment ?? null;
  });
};
const splitHandler = () => {
  currentSegment && segmentTracks.split(currentSegment);
};
const toggleMagnet = () => {
  segmentTracks.adsorbable = !segmentTracks.adsorbable;
};
const handleClick = (track: TTrackConfig) => {

}
let tempTrackId: string;
const handleAddByClick = (trackType: string) => {
  const trackId = Math.random() + 'newTrack';
  tempTrackId = trackId
  const newTrack = {
    trackId: trackId,
    trackText: Math.random() + '',
    trackType,
  };
  segmentTracks?.addTrack(newTrack);
  tracks.value = segmentTracks.tracksConfig;
}
const testAddToTrack = () => {
  const trackId = Math.random() + 'newTrack';
  tempTrackId = trackId;
  const newTrack = {
    trackId: trackId,
    trackText: Math.random() + '',
    trackType: '2',
  };
  segmentTracks?.addToTrackGroup('a', newTrack);
  tracks.value = segmentTracks.tracksConfig;
}
const testRemoveTrack = () => {
  segmentTracks?.removeTrack(tempTrackId);
  tracks.value = segmentTracks.tracksConfig;
}
onMounted(() => {
  initApp();
});
</script>

<template>
  <div class="wrapper">
    <div className="btns">
      <button @click="splitHandler">分割</button>
      <button @click="toggleMagnet">辅助线吸附</button>
      <button @click="handlePlay">播放</button>
      <button @click="testAddToTrack">往某个组内添加轨道</button>
      <button @click="testRemoveTrack">删除组内添加的轨道</button>
    </div>
    <div class="segment-list" ref="segmentItemListRef">
      <div class="segment-item" style="background-color: #C66136;" data-segment-type="1">
        拖我
        <button class="btn" @click.stop="handleAddByClick('1')">+</button>
      </div>
      <div class="segment-item" data-segment-type="2">
        拖我
        <button @click="handleAddByClick('1')">+</button>
      </div>
      <div class="segment-item" data-segment-type="3">
        拖我（一）
        <button class="btn" @click="handleAddByClick('3')">+</button>
      </div>
      <div class="segment-item" data-segment-type="4">
        拖我
        <button class="btn" @click="handleAddByClick('4')">+</button>
      </div>
      <div
        class="segment-item segment-item-flex"
        data-segment-type="5"
        data-track-id="c"
      >
        拖我
        <em>(伸缩轨道)</em>
      </div>
    </div>
    <div class="timeline-container" @wheel="handleWheel">
      <div class="track-header-list" ref="trackHeaderListRef">
        <div class="track-operation">
          <div v-for="track in tracks" :key="track.trackId">
            <div
              class="track-operation-item-group cursor-pointer"
              :key="track.trackId"
              v-if="track.subTracks"
            >
              <div class="track-operation-item flex items-center">
                <div
                  class="mr-2"
                >
                  <svg class="text-white" fill="rgba(255,255,255, 0.5)" width="12" height="12" viewBox="0 0 12 12" data-v-f2ec87fa="" style="transform: rotate(0deg);"><path fill-rule="evenodd" clip-rule="evenodd" d="M5.57574 8.4247L1.57574 4.4247L2.42427 3.57617L6 7.15191L9.57574 3.57617L10.4243 4.4247L6.42426 8.4247L6 8.84896L5.57574 8.4247Z"></path></svg>
                </div>
                {{ track.trackText }}
              </div>
              <div
                  class="track-operation-item"
                  v-for="(subTrack, index) in track.subTracks"
                  :key="index"
                >
                  {{ subTrack.trackText }}
              </div>
              <div class="track-gutter"></div>
            </div>
            <div 
              class="track-operation-item"
              v-else
            >
              {{ track.trackText }}
            </div>
          </div>
        </div>
      </div>
      <div
        class="webkit-scrollbar scroll-container"
        @scroll="handleScroll"
        ref="scrollContainerRef"
        :style="{ width: `${scrollContentWidth}px` }"
      >
        <div class="timeline-markers" :style="{ width: `${stageWidth}px` }">
          <div id="canvasStage"></div>
        </div>
        <div
          class="scroll-content"
          ref="scrollContentRef"
        >
        <!-- :style="{ width: `${scrollContentWidth}px` }" -->
          <div
            class="track-list"
            ref="trackListRef"
            :style="{ width: `${trackWidth}px` }"
          >
          </div>
          <div className="coordinate-line"></div>
          <Cursor ref="cursorRef" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less">
@markHeight: 24px;
@trackHeight: 28px;
@timelineContainerHeight: 200px;
.btn{
  width: 20px;
  height: 10px;
  background-color: aliceblue;
}
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
  height: 200px;
  overflow: hidden;
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
  overflow: overlay;
  min-height: @timelineContainerHeight;
}

.scroll-content {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
}

.track-header-list{
  height: 200px;
  overflow: hidden;
}
.track-operation {
  padding-top: @markHeight;
  flex-basis: 120px;
  border-right: 1px solid black;
  background-color: rgba(white, 0);
  height: 400px;
  .track-operation-item {
    margin-bottom: 2px;
    padding-left: 6px;
    font-size: 12px;
    height: @trackHeight;
    line-height: @trackHeight;
    color: rgba(255, 255, 255, 0.5);
    background-color: rgba(255, 255, 255, 0.04);
  }
  .track-operation-item-group{
    .track-operation-item{
      padding-left: 2em;
    }
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
    // pointer-events: none;
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
  svg {
    width: 1em;
    height: 1em;
    fill: currentColor;
    overflow: hidden;
    font-size: inherit;
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

.track.dragover {
  background-color: rgba(white, 0.08);
}
.track.dragover-error {
  background-color: rgba(red, 0.08);
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
    user-select: none;
  }
  .segment-item-stretch {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    em {
      font-size: 8px;
    }
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
  border-radius: 4px 0 0 4px;
}
.segment-handle-right {
  right: 0;
  border-radius: 0 4px 4px 0;
}
.segment:hover, .segment.actived, .segment.sliding {
  .segment-handle{
    background-color: rgba(255, 255, 255, 0.8);
  }
}
.coordinate-line {
  display: none;
  position: absolute;
  z-index: 10;
  pointer-events: none;
  left: 0;
  top: 0;
  width: 1px;
  height: 100%;
  font-size: 0;
  background-color: #00b6c2;
}

.segment-handle-container{
  position: relative;
  top: 1px;
  height: 24px;
  .segment-handle.actived{
    background-color: rgba(255, 255, 255, 0.8);
  }
}


// 工具按钮
.btns {
  padding: 40px 0;
  display: flex;
  gap: 20px;
}
button {
  padding: 4px 6px;
}

.track-gutter{
  margin: 8px 0 10px;
  height: 1px;
  width: 100%;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
}
.segment-renderer{
  display: flex;
  height: 24px;
  overflow: hidden;
  align-items: center;
}
</style>
