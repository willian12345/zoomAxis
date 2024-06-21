<script setup lang="ts">
import { onMounted, onUnmounted, ref, Ref } from "vue";
import Cursor from "./components/Cursor.vue";

import {
  Tracks, Segment, TimelineAxis, TIMELINE_AXIS_EVENT_TYPE, CursorPointer,
  CURSOR_POINTER_EVENT_TYPE, TRACKS_EVENT_TYPES, TTrackConfig
} from "../../zoomAxis/js/index";

import { tracksData } from './assets/tracksData';
const tracks: Ref<TTrackConfig[]> = ref(tracksData);
let timeline: TimelineAxis;
let trackCursor: CursorPointer;
let segmentTracks: Tracks;
let stageWidth = ref(920);
const scrollContentWidth = ref(920);
let trackWidth = ref(920);
const scrollContainerRef = ref<HTMLElement | null>(null);
const trackHeaderListRef = ref<HTMLElement | null>(null);
const cursorRef = ref<InstanceType<typeof Cursor> | null>(null);
const scrollContentRef = ref<HTMLElement | null>(null);
const trackListContainer = ref<HTMLElement | null>(null);
const segmentItemListRef = ref<HTMLElement | null>(null);
let currentSegment: Segment | null = null;
let ctrlDown = false;

const roundNumber = (value: number, n: number) => {
  return Math.round(value * Math.pow(10, n)) / Math.pow(10, n);
};

// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  timeline?.scrollLeft(-dom.scrollLeft);
  if (trackHeaderListRef.value) {
    trackHeaderListRef.value.scrollTop = dom.scrollTop;
  }
};


const syncTrackWidth = () => {
  const trackItemWidth = segmentTracks.width();
  trackWidth.value =
    trackItemWidth < stageWidth.value ? stageWidth.value : trackItemWidth;
};
const syncByZoom = (zoom: number) => {
  // 根据缩放比较，减小滚动宽度
  if (zoom) {
    const prevLeft = trackCursor.left;
    timeline?.zoom(zoom);
    segmentTracks?.zoom();
    syncTrackWidth();
    // 根据帧数变更游标位置
    if (trackCursor) {
      trackCursor.syncPositon();
    }
    // 如果滚动宽度大于舞台宽度，则需要滚动相应的距离保证指针位置不变
    const scrollWidth = scrollContainerRef.value?.scrollWidth ?? 0;
    const clientWidth = scrollContainerRef.value?.clientWidth ?? 0;
    if (scrollWidth > clientWidth) {
      scrollContainerRef.value!.scrollLeft = scrollContainerRef.value!.scrollLeft + (trackCursor.left - prevLeft)
    }
  }
};
let zoomRatio = 1;

const zoom = (isZoomIn: boolean) => {
  const zoomStep = 0.01;
  const v = roundNumber(
    isZoomIn
      ? zoomRatio - zoomStep
      : zoomRatio + zoomStep,
    2
  );
  if (v < 0.1 || v > 2) {
    return zoomRatio;
  }
  return v;
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  if (!ctrlDown) {
    return;
  }
  e.stopPropagation();
  e.preventDefault();
  
  zoomRatio = e.deltaY > 0 ? zoom(true) : zoom(false);
  syncByZoom(zoomRatio);
};
document.addEventListener('keydown', (e: KeyboardEvent) => {
  ctrlDown = e.ctrlKey;
})
document.addEventListener('keyup', (e: KeyboardEvent) => {
  ctrlDown = false;
})
const handlePlay = () => {
  if (timeline.currentFrame === timeline.totalFrames) {
    timeline.play(0);
    return;
  }
  if (timeline.playing) {
    timeline.pause();
  } else {
    timeline.play();
  }

};



const initApp = () => {
  if (
    !cursorRef.value?.$el ||
    !scrollContentRef.value ||
    !trackListContainer.value ||
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
    tickMarks: 960*2,
    totalFrames: 960,
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
      // console.log(frame);
      timeline?.setCurrentFrame(frame);
    }
  );

  // 初始化轨道
  segmentTracks = new Tracks({
    scrollContainer,
    trackListContainer: trackListContainer.value,
    tracks: tracks.value,
    timeline,
    segmentDelegate: segmentItemList,
  });
  segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_ADDED, () => {
    syncTrackWidth();
  });
  segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_SELECTED, (e) => {
    console.log('选中', e, segmentTracks.multiSegmentDraging)
  });
  segmentTracks.addEventListener(
    TRACKS_EVENT_TYPES.DRAG_END,
    async (e) => {
      console.log('拖动结束：', e)
    }
  );
  segmentTracks.addEventListener(
    TRACKS_EVENT_TYPES.SEGMENT_MULTI_SELECT_START,
    async (e) => {
      console.log('多选', e)
    }
  );

  segmentTracks.addEventListener(TRACKS_EVENT_TYPES.FRAME_JUMP, (e) => {
    const jumptoFrame = (e.frame > timeline.totalFrames) ? timeline.totalFrames : e.frame
    timeline.setCurrentFrame(jumptoFrame)
    trackCursor.sync();
  });

  segmentTracks.addEventListener(
    TRACKS_EVENT_TYPES.SEGMENT_DELETED,
    async (e) => {
      console.log('删除', e)
    }
  );
  segmentTracks.addEventListener(
    TRACKS_EVENT_TYPES.SEGMENT_MOVED,
    async (e) => {
      console.log('跨轨道拖动', e)
    }
  );



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
const toggleAdsorbable = () => {
  segmentTracks.adsorbable = !segmentTracks.adsorbable;
};

let tempTrackId: string;
const handleAddByClick = (segmentTypes: string, trackType?: string) => {
  const trackId = Math.random() + 'newTrack';
  tempTrackId = trackId
  const newTrack = {
    trackId: trackId,
    trackText: Math.random() + '',
    segmentTypes,
    trackType: trackType ?? 'normal'
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
    segmentTypes: '2',
    trackType: 'normal'
  };
  segmentTracks?.addToTrackGroup('a', newTrack);
  tracks.value = segmentTracks.tracksConfig;
}
const testRemoveTrack = () => {
  segmentTracks?.removeTrack(tempTrackId);
  tracks.value = segmentTracks.tracksConfig;
}
const testdestroy = () => {
  segmentTracks.destroy()
}

const handleAddKeyframe = () => {
  if (!currentSegment || !timeline) {
    console.log('请先选择一个segment');
    return;
  }
  segmentTracks.addKeyframe(currentSegment.segmentId, timeline?.currentFrame - currentSegment.framestart)
}

const handleSegmentDelete = () => {
  if (!currentSegment) {
    console.log('请先选择一个segment');
    return;
  }
  segmentTracks.deleteSegment(currentSegment.trackId, currentSegment.segmentId);
  currentSegment = null;
}



onMounted(() => {
  initApp();
});
</script>

<template>
  <div class="wrapper">
    <div className="btns">
      <button @click="splitHandler">分割</button>
      <button @click="toggleAdsorbable">辅助线吸附</button>
      <button @click="handlePlay">播放</button>
      <button @click="testAddToTrack">往某个组内添加轨道</button>
      <button @click="testRemoveTrack">删除组内添加的轨道</button>
      <button @click="testdestroy">destroy</button>
      <button @click="handleAddKeyframe">添加关键帧</button>
      <button @click="handleSegmentDelete">删除当前 segment</button>
    </div>
    <div class="segment-list px-8" ref="segmentItemListRef">
      <div class="segment-item pl-2" style="background-color: #C66136;" data-segment-type="1">
        拖我
        <button @click.stop="handleAddByClick('1')">+</button>
      </div>
      <div class="segment-item" data-segment-type="2">
        拖我
        <button @click="handleAddByClick('2', 'segmentOverlap')">+</button>
      </div>
      <div class="segment-item" data-segment-type="3">
        拖我（一）
        <button @click="handleAddByClick('3')">+</button>
      </div>
      <div class="segment-item" data-segment-type="11">
        拖我
        <button @click="handleAddByClick('11')">+</button>
      </div>
      <div class="segment-item segment-item-flex" data-segment-type="10" data-track-id="c">
        拖我
      </div>
    </div>
    <div class="timeline-container" @wheel="handleWheel">
      <div class="track-header-list" ref="trackHeaderListRef">
        <div class="track-operation">
          <div v-for="track in tracks" :key="track.trackId">
            <div class="track-operation-item-group cursor-pointer" :key="track.trackId" v-if="track.subTracks">
              <div class="track-operation-item flex items-center">
                <div class="mr-2">
                  <svg class="text-white" fill="rgba(255,255,255, 0.5)" width="12" height="12" viewBox="0 0 12 12"
                    data-v-f2ec87fa="" style="transform: rotate(0deg);">
                    <path fill-rule="evenodd" clip-rule="evenodd"
                      d="M5.57574 8.4247L1.57574 4.4247L2.42427 3.57617L6 7.15191L9.57574 3.57617L10.4243 4.4247L6.42426 8.4247L6 8.84896L5.57574 8.4247Z">
                    </path>
                  </svg>
                </div>
                {{ track.trackText }}
              </div>
              <div class="track-operation-item" v-for="(subTrack, index) in track.subTracks" :key="index">
                {{ subTrack.trackText }}
              </div>
              <div class="track-gutter"></div>
            </div>
            <div class="track-operation-item" v-else>
              {{ track.trackText }}
            </div>
          </div>
        </div>
      </div>
      <div class="webkit-scrollbar scroll-container" @scroll="handleScroll" ref="scrollContainerRef"
        :style="{ width: `${scrollContentWidth}px` }">
        <div class="timeline-markers" :style="{ width: `${stageWidth}px` }">
          <div id="canvasStage"></div>
        </div>
        <div class="scroll-content" ref="scrollContentRef">
          <div class="track-list" :style="{ width: `${trackWidth}px` }">
            <div ref="trackListContainer"></div>
          </div>
          <Cursor ref="cursorRef" />
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="less">
@markHeight: 24px;
@trackHeight: 28px;
@timelineContainerHeight: 240px;

.btn {
  // width: 20px;
  // height: 10px;
  background-color: aliceblue;
}

.track-drag-container {
  pointer-events: none;
  position: fixed;
  z-index: 20;
  left: 0;
  top: 0;
  width: 100vw;
  height: 100vh;
  border-radius: 4px;
  // background-color: rgba(aquamarine, 0.8);
}

.wrapper {
  padding: 0;
}

.timeline-container {
  display: flex;
  position: relative;
  margin: 180px 0;
  width: 100%;
  height: 240px;
  overflow: hidden;
  background-color: #0f0c0c;
}

.timeline-markers {
  position: sticky;
  left: 0;
  top: 0;
  width: 100%;
  line-height: 1;
  z-index: 10;
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

.track-header-list {
  height: 240px;
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

  .track-operation-item-group {
    .track-operation-item {
      padding-left: 2em;
    }
  }
}

.segment-wrapper {
  height: @trackHeight;
  pointer-events: all;
  position: absolute;
}

.track-list,
.track-drag-container {
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
    top: 2px;
    right: 0;
    bottom: 0;
    z-index: 1;
    height: 24px;
    overflow: hidden;
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
  top: 2px;
  width: 4px;
  height: 100%;
  z-index: 2;
  pointer-events: initial;
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

.segment:hover,
.segment.actived,
.segment.sliding {
  .segment-handle {
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

.rectangle-capture {
  display: none;
  position: absolute;
  z-index: 10;
  pointer-events: none;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  border: 1px solid rgba(white, .1);
  background-color: rgba(white, .2);
}

.segment-handle-container {
  position: relative;
  top: 1px;
  pointer-events: none;
  z-index: 3;
  height: 24px;

  .segment-handle.actived {
    background-color: rgba(255, 255, 255, 0.8);
  }
}

.segment-keyframe {
  // display: none;
  position: absolute;
  left: 0;
  top: 50%;
  width: 8px;
  height: 8px;
  z-index: 1;
  transform: translate(calc(-50% - 1px), -50%);
  border-radius: 1px;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 8px;
    height: 8px;
    transform-origin: 50% 50%;
    transform: rotate(45deg);
    background: #FFFFFF;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
}

.segment-keyframe.actived {
  &::after {
    background: #FAA700;
  }
}

.segment.actived .segment-keyframe {
  display: block;
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

.track-gutter {
  margin: 8px 0 10px;
  height: 1px;
  width: 100%;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.04);
}

.segment-renderer {
  display: flex;
  height: 24px;
  overflow: hidden;
  align-items: center;
}
</style>
