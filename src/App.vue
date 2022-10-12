<script setup lang="ts">
import { onMounted, ref, Ref } from "vue";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "./js/TimelineAxis";
import Cursor from "./components/Cursor.vue";
import { TrackCursor } from './js/cursor'

let timelineAxis: TimelineAxis | null;
let initScrollContentWidth:number = 3240;
let stageWidth = 1040;
const scrollContentWidth = ref(1040);
const scrollContainerRef = ref<HTMLElement|null>(null);
const cursorRef = ref<InstanceType<typeof Cursor> | null>(null);
const scrollContentRef = ref<HTMLElement | null>(null);
const trackListRef = ref<HTMLElement | null>(null);
const segmentItemListRef = ref<HTMLElement | null>(null);
const CLOSE_ENOUPH_DISTANCE = 10; // 距离是否够近
let trackCursor: InstanceType<typeof TrackCursor>;
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  const scrollRatio = dom.scrollLeft / (dom.scrollWidth - stageWidth); // 滚动比例
  timelineAxis?.scrollLeft(-dom.scrollLeft);
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  return;
  e.deltaY > 0 ? timelineAxis?.zoomIn() : timelineAxis?.zoomOut();
  if (timelineAxis?.zoomRatio) {
    const scaleWidth = initScrollContentWidth * timelineAxis?.zoomRatio;
    scrollContentWidth.value =
      scaleWidth >= stageWidth ? scaleWidth : stageWidth;
  }
};






const handlePlay = () => {
  timelineAxis?.paused ? timelineAxis?.play() : timelineAxis?.pause();
};
const createDragTrackContainer = () => {
  const div = document.createElement("div");
  div.className = "track-drag-container";
  document.body.appendChild(div);
  return div;
};
const getDragTrackCotainer = () => {
  let div =
    Array.from(document.body.children).find((element) => {
      return element.className === "track-drag-container";
    }) ?? createDragTrackContainer();
  return div;
};

const getLeftValue = (dom: HTMLElement | undefined) => {
  if (!dom) {
    return 0;
  }
  return parseFloat(dom.style.left) ?? 0;
};
// 创建 segment 点位器
const createSegmentPlaceHolder = () => {
  const dom = document.createElement("div");
  dom.className = "segment-placeholder";
  return dom;
};
// 获取轨道内 segment 占位器
const getSegmentPlaceholder = (track: HTMLElement) => {
  const trackPlaceholder: HTMLElement | null =
    track.querySelector(".track-placeholder");
  let dom;
  if (trackPlaceholder) {
    dom = trackPlaceholder.querySelector(".segment-placeholder") as HTMLElement;
    if (!dom) {
      dom = createSegmentPlaceHolder();
      trackPlaceholder?.appendChild(dom);
    }
  }
  return dom;
};
// 离Y轴是否足够近
const isCloseEnouphToY = (tracks:HTMLElement[],track: HTMLElement, mouseY: number) => {
  const trackRect = track.getBoundingClientRect();
  const distanceY = Math.abs(trackRect.top + trackRect.height * 0.5 - mouseY);
  return distanceY < CLOSE_ENOUPH_DISTANCE;
};

// 轨道内 segment x 轴横向碰撞检测
const collisionCheckX = (placeholder: HTMLElement, track: HTMLElement) => {
  const placeholderRect = placeholder.getBoundingClientRect();
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(".segment")
  );
  const segmentsLength = segments.length;
  if (!segmentsLength) {
    return false;
  }
  for (let segment of segments) {
    const segmentRect = segment.getBoundingClientRect();
    // placeholder与 segment 都属于轨道内，left 值取 style内的值 即相对坐标
    const segmentLeft = getLeftValue(segment);
    const placeholderLeft = getLeftValue(placeholder);
    // x 轴碰撞检测
    if (
      placeholderLeft + placeholderRect.width > segmentLeft &&
      placeholderLeft < segmentLeft + segmentRect.width
    ) {
      return true;
    }
  }
  return false;
};
// 轨道 y 轴 碰撞检测
const trackCollisionCheckY = (dragTrackContainerRect: DOMRect, tracks: HTMLElement[], scrollContainerX: number, mouseY: number) => {
  let collision = false
  tracks.forEach((track) => {
    // 离轨道足够近
    const placeHolder = getSegmentPlaceholder(track);
    if (isCloseEnouphToY(tracks, track, mouseY)) {
      if (!placeHolder) {
        return;
      }
      tracks.forEach((element: HTMLElement) => {
        element.classList.remove("dragover");
      });
      track.classList.add("dragover");
      // 拖动时轨道内占位元素
      placeHolder.style.width = `${dragTrackContainerRect.width}px`;
      placeHolder.style.left = `${dragTrackContainerRect.left + scrollContainerX}px`;
      const isCollistion = collisionCheckX(placeHolder, track);
      // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
      if (isCollistion) {
        placeHolder.style.opacity = "0";
      } else {
        placeHolder.style.opacity = "1";
      }
      collision = true
    } else {
      if (placeHolder) {
        placeHolder.style.opacity = "0";
      }
    }
  });
  return collision
}

// segment 拖拽
const dragStart = async (e: MouseEvent, segment: HTMLElement, isCopySegment:boolean = false) => {
  if(!scrollContainerRef.value){
    return
  }
  const scrollContainer: HTMLElement = scrollContainerRef.value
  if (!trackListRef.value || !scrollContainerRef.value) {
    return;
  }
  // 获取所有轨道
  const tracks: HTMLElement[] = Array.from(document.querySelectorAll(".track"));
  // 全局拖动容器
  const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
  // 拖动前原轨道
  let originTrack: HTMLElement | null =  isCopySegment? null : segment.parentElement;
  let startX = e.clientX;
  let startY = e.clientY;
  const { left, top } = segment.getBoundingClientRect();
  dragTrackContainer.style.left = `${left}px`;
  dragTrackContainer.style.top = `${top}px`;
  let segmentCopy: HTMLElement;
  const segmentRect = segment.getBoundingClientRect();;
  // 如果拖动是复制
  if(isCopySegment){
    segmentCopy = createSegmentFake(segmentRect);
    dragTrackContainer.appendChild(segmentCopy);
  }else{
    // 将 segment 暂时放到 dragTracContainer 内
    dragTrackContainer.appendChild(segment);
  }
  // 高度变为正在拖动的 segment 高度
  dragTrackContainer.style.height = `${segmentRect.height}px`;
  setTimeout(()=> {
    dragTrackContainer.style.transition = 'height .2s ease .1s';  
  }, 0);
  
  
  const scrollContainerRect = scrollContainer.getBoundingClientRect();
  
  const mousemove = (e: MouseEvent) => {
    // 拖动时拖动的是 dragTrackContainer
    const movedX = e.clientX - startX;
    const movedY = e.clientY - startY;
    const dragTrackContainerRect =
      dragTrackContainer.getBoundingClientRect();
    let left = dragTrackContainerRect.left + movedX;
    let top = dragTrackContainerRect.top + movedY;
    dragTrackContainer.style.left = `${left}px`;
    dragTrackContainer.style.top = `${top}px`;
    const scrollContainerScrollLeft = scrollContainer.scrollLeft;
    const scrollContainerX = scrollContainerScrollLeft - scrollContainerRect.left;
    const isCollisionY = trackCollisionCheckY(dragTrackContainerRect, tracks, scrollContainerX, e.clientY);
    if(isCopySegment){
      // 如果是复制，则需要形变成标准轨道内 segment 形状
      if(isCollisionY){
        dragTrackContainer.style.left = `${e.clientX}px`;
        dragTrackContainer.style.top = `${e.clientY- 14}px`;
        dragTrackContainer.style.height = '24px';
      }else{
        dragTrackContainer.style.height = `${segmentRect.height}px`;
      }
    }
    trackCursor.enable = false;
    startX = e.clientX;
    startY = e.clientY;
  };
  
  const mouseup = (e: MouseEvent) => {
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    const scrollContainerScrollLeft = scrollContainer.scrollLeft;
    const { left, top } = dragTrackContainer.getBoundingClientRect();
    dragTrackContainer.style.transition = 'none';
    // segmentLeft = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
    const segmentLeft = left - scrollContainerRect.left + scrollContainerScrollLeft;
    // 判断所有轨道与鼠标当前Y轴距离
    tracks.forEach((track) => {
      // 如果足够近代表用户想拖到此轨道上
      if (isCloseEnouphToY(tracks, track, e.clientY)) {
        const placeHolder = getSegmentPlaceholder(track);
        if(!placeHolder){
          return
        }
        placeHolder.style.opacity = "0";
        const isCollistion = collisionCheckX(placeHolder, track);
        if (!isCollistion) {
          let dom
          if(isCopySegment){
            dom = createSegment(SegmentType.BODY_ANIMATION);
          }else{
            dom = segment;
          }
          dom.style.left = `${segmentLeft}px`;
          track.appendChild(dom);
        }
      }
    });
    // 如果没有跨轨道拖动成功，则 x 轴移动
    setTimeout(() => {
      if (dragTrackContainer.children.length) {
        // 如果是复制
        if(isCopySegment){
          dragTrackContainer.removeChild(segmentCopy);
        }
        if(!originTrack){
          return
        }
        originTrack.appendChild(segment);
        
        const placeHolder = getSegmentPlaceholder(originTrack);
        if(!placeHolder){
          return
        }
        placeHolder.style.opacity = "0";
        const isCollistion = collisionCheckX(placeHolder, originTrack);
        if (!isCollistion) {
          segment.style.left = `${segmentLeft}px`;
        }
      }
      trackCursor.enable = true;
    }, 0);
    
    document.removeEventListener("mouseup", mouseup);
    document.removeEventListener("mousemove", mousemove);
  };
  document.addEventListener('mousemove', mousemove);
  document.addEventListener('mouseup', mouseup);
}

const initTracks = () => {
  if(!scrollContainerRef.value){
    return
  }
  const scrollContainer: HTMLElement = scrollContainerRef.value;
  if (!trackListRef.value || !scrollContainerRef.value) {
    return;
  }
  if(timelineAxis){
    // 根据帧数算出滚动内容宽度
    scrollContentWidth.value = timelineAxis.totalFrames * timelineAxis.frameWidth;
  }
  const mousedown = (e: MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement
    if(!target){
      return
    }
    if(!target.classList.contains('segment')){
      return
    }
    const segment = target;
    dragStart(e, segment)
  }
  // 代理 segment 鼠标事件
  scrollContainer.addEventListener('mousedown', mousedown)
};
const createSegmentFake = (rect: DOMRect) => {
  const dom = document.createElement("div");
  dom.className = 'segment-fake';
  dom.style.width = `${rect.width}px`;
  dom.style.borderRadius = '4px';
  return dom;
}
enum SegmentType {
  BODY_ANIMATION,
  FACE_ANIMATION,
}
// 创建 segment
const createSegment = (type: SegmentType) => {
  const dom = document.createElement('div');
  dom.className = 'segment segment-action';
  dom.style.width = '80px';
  dom.style.height = '24px';
  dom.style.left = '0';
  return dom;
}
const initSegmentItemList = () => {
  // 轨道，轨道容器，可拖入轨道列表
  if (!segmentItemListRef.value) {
    return;
  }
  const segmentItemList: HTMLElement = segmentItemListRef.value;
  
  const mousedown = (e: MouseEvent) => {
    e.preventDefault();
    const target = e.target as HTMLElement;
    if(!target){
      return
    }
    if(!target.classList.contains('segment-item')){
      return
    }
    const segment = target
    dragStart(e, segment, true)
  }
  segmentItemList.addEventListener('mousedown', mousedown);
}
// 最右侧 segment 片断
const findEndestSegment = () => {
  let end: HTMLElement|null = null;
  let max: number = 0;
  const segments: HTMLElement[] = Array.from(document.querySelectorAll('.segment'))
  segments.forEach((segment) => {
    const right = segment.getBoundingClientRect().right
    if(right > max){
      max = right
      end = segment
    }
  })
  return end;
}
const initApp = () => {
  if (!cursorRef.value?.$el || !scrollContentRef.value) {
    return;
  }
  const cursorDom: HTMLElement = cursorRef.value.$el;

  // 初始化时间轴
  timelineAxis = new TimelineAxis({
    el: "canvasStage",
    totalMarks: 500,
    totalFrames: 100,
  });
  timelineAxis.addEventListener(
    TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME,
    function (this: TimelineAxis, curentFrame, eventType) {
      console.log(curentFrame, eventType, this.frameRate);
      const frameWidth = this.markWidth ?? 0;
      const frameRate = this.frameRate;
      const left = curentFrame * frameWidth - frameWidth;
      cursorDom.style.transform = `translateX(${left}px)`;
    }
  );
  
  // 初始化轨道
  initTracks();
  // 初始化可拖 segment 片断
  initSegmentItemList();
  // 初始化游标
  trackCursor = new TrackCursor(scrollContentRef.value as HTMLElement, cursorDom);
  
};

onMounted(() => {
  initApp();
});
</script>

<template>
  <div class="wrapper">
    <div class="segment-item-list" ref="segmentItemListRef">
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
      <div class="webkit-scrollbar scroll-container" @scroll="handleScroll" ref="scrollContainerRef">
        <div class="timeline-markers">
          <div id="canvasStage"></div>
        </div>
        <div class="scroll-content" ref="scrollContentRef" :style="{ width: `${scrollContentWidth}px` }">
          <!-- :style="{ width: `${stageWidth}px` }" -->
          <div class="track-list" ref="trackListRef">
            <div class="track">
              <div class="track-placeholder">
                <!-- <div class="segment-placeholder"></div> -->
              </div>
              <div class="segment segment-action" :style="{ width: `164px`, left: '0px' }"></div>
              <div class="segment segment-action" :style="{ width: `100px`, left: '300px' }"></div>
              <div class="segment segment-action" :style="{ width: `60px`, left: '400px' }"></div>
            </div>
            <div class="track">
              <div class="track-placeholder"></div>
              <div class="segment segment-action" :style="{ width: `80px`, left: '0px' }"></div>
            </div>
          </div>
        </div>
        <Cursor ref="cursorRef" />
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
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

  .actived {
    .segment {
      border: 1px solid white;
    }
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
.segment-item-list{
  display: flex;
  gap: 20px;
  .segment-item{
    width: 80px;
    height: 80px;
    border-radius: 4px;
    background-color: bisque;
  }
}
.segment-fake{
  width: 100%;
  height: 100%;
  background-color: #c66136;
  opacity: .8;
}
</style>
