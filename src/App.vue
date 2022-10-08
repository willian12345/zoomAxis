<script setup lang="ts">
import { onMounted, ref } from "vue";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "./js/TimelineAxis";
import { debounce } from 'lodash-es'
import Cursor from "./components/Cursor.vue";

let timelineAxis: TimelineAxis | null;
let initScrollContentWidth = 3240;
let stageWidth = 1040;
const scrollContentWidth = ref(initScrollContentWidth);
const scrollContainerRef = ref(null);
const cursorRef = ref<InstanceType<typeof Cursor> | null>(null);
const scrollContentRef = ref(null);
const trackListRef = ref<HTMLElement | null>(null);
const CLOSE_ENOUPH_DISTANCE = 20; // 距离是否够近
let segmentDragging = false;
// 左右滚动
const handleScroll = (e: UIEvent) => {
  if (!e) {
    return;
  }
  const dom = e.target as HTMLElement;
  const scrollRatio = dom.scrollLeft / (dom.scrollWidth - stageWidth); // 滚动比例
  console.log(dom.scrollLeft);
  timelineAxis?.scrollLeft(-dom.scrollLeft);
};
// 滚轮缩放
const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  e.deltaY > 0 ? timelineAxis?.zoomIn() : timelineAxis?.zoomOut();
  console.log(timelineAxis?.markWidth);
  if (timelineAxis?.zoomRatio) {
    const scaleWidth = initScrollContentWidth * timelineAxis?.zoomRatio;
    scrollContentWidth.value =
      scaleWidth >= stageWidth ? scaleWidth : stageWidth;
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
  const leftBoundary = 0;
  // 游标拖动
  cursorDom.addEventListener("mousedown", (e: MouseEvent) => {
    e.preventDefault();
    let startX = e.clientX;
    const handleMouseup = (e: MouseEvent) => {
      e.stopPropagation();
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
    if (segmentDragging) {
      return;
    }
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
const collisionCheck = () => {
  
}
const getLeftValue = (dom: HTMLElement|undefined) => {
  if(!dom){
    return 0
  }
  return parseFloat(dom.style.left) ?? 0
}
const isYCloseEnouph = (track: HTMLElement, mouseY: number) => {
  const trackRect = track.getBoundingClientRect();
  const distanceY = Math.abs(trackRect.top + trackRect.height * 0.5 - mouseY);
  return distanceY < CLOSE_ENOUPH_DISTANCE;
};


const isXCloseEnouph = debounce((
  dragContainerRect: DOMRect,
  dragSegment: HTMLElement,
  track: HTMLElement,
  mouseX: number
) => {
  const segments: HTMLElement[] = Array.from(
    track.querySelectorAll(".segment")
  );
  const segmentsLength = segments.length
  if (!segmentsLength) {
    return;
  }
  // console.log(segments)
  segments.forEach((segment, index) => {
    const segmentRect = segment.getBoundingClientRect();
    // x 轴碰撞检测
    if (
      (dragContainerRect.left >= segmentRect.left - dragContainerRect.width &&
        dragContainerRect.left <= segmentRect.right) 
    ) {
      // 如果碰撞发生则说明拖动的 segment 与当前轨道上的当前 segment 有重叠
      // 后半边碰撞
      let allRightSiblings: HTMLElement[] = []
      if (
        dragContainerRect.left >= segmentRect.left + (segmentRect.width * .5) && dragContainerRect.left <= segmentRect.right
      ) {
        // 靠右
        // 获取所有拖动位置右侧的 segments
        allRightSiblings = segments.filter(( sg ) => {
          return sg.getBoundingClientRect().left > dragContainerRect.left;
        })
        allRightSiblings = allRightSiblings.sort((a:HTMLElement, b: HTMLElement)=> {
          return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        })
        console.log('右',allRightSiblings);
        const ns = allRightSiblings.at(0);
        if(ns){
          const nsLeft =  getLeftValue(ns)
          console.log(nsLeft)
          // 需要空间
          const spaceNeed = getLeftValue(segment) + segmentRect.width + dragContainerRect.width;
          // 剩余空间
          const spaceLeft = spaceNeed - nsLeft;
          if(spaceLeft > 0){
            // 如果空间不够，需要所有右侧的 segment 向右挤
            allRightSiblings.forEach( sb => {
              sb.style.left = `${getLeftValue(sb) + Math.abs(spaceLeft)}px`
            })
          }
        }
      }else if(dragContainerRect.left + dragContainerRect.width < segmentRect.left + (segmentRect.width * .5)){
        // 靠左
        allRightSiblings = segments.filter(( sg ) => {
          return sg.getBoundingClientRect().left + sg.getBoundingClientRect().width > dragContainerRect.left
        })
        .sort((a:HTMLElement, b: HTMLElement)=> {
          return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        })
        const allLeft = segments.filter(( sg ) => {
          return sg.getBoundingClientRect().left + sg.getBoundingClientRect().width <= dragContainerRect.left
        })
        .sort((a:HTMLElement, b: HTMLElement)=> {
          return a.getBoundingClientRect().left - b.getBoundingClientRect().left;
        })
        // const allLeftSiblings = segments.filter(( sg ) => {
        //   return sg.getBoundingClientRect().left + sg.getBoundingClientRect().width <= dragContainerRect.left
        // })
        console.log('左', allRightSiblings);
        const ns = allRightSiblings.at(0);
        const prev = allLeft.at(-1);
        if(ns){
          const nsLeft = getLeftValue(ns);
          const prevLeft = getLeftValue(prev);
          // 需要空间
          const spaceNeed = dragContainerRect.width;
          const prevWidth = prev?.getBoundingClientRect()?.width ?? 0
          // 剩余空间  = 需求宽度 - 后与前之间的间隔
          const spaceLeft = spaceNeed - (nsLeft - prevLeft - prevWidth);
          if(spaceLeft > 0){
            allRightSiblings.forEach( sb => {
              sb.style.left = `${getLeftValue(sb) + Math.abs(spaceLeft)}px`
            })
          }
        }
      }
    }
  });
}, 200);
const initTrackItem = (trackItem: HTMLElement, tracks: HTMLElement[]) => {
  if (!trackListRef.value || !scrollContainerRef.value) {
    return;
  }
  const trackListRects = trackListRef.value?.getBoundingClientRect();
  const scrollContainerDom: HTMLElement = scrollContainerRef.value;
  // 全局拖动容器
  const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
  let originTrack: HTMLElement | null = null;
  
  // 可拖动片断
  const segments:HTMLElement[] = Array.from(trackItem.querySelectorAll(".segment"));
  segments.forEach((segment)=> {
    segment.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();

      let startX = e.clientX;
      let startY = e.clientY;
      // 拖动前原轨道
      originTrack = segment.parentElement;
      const { left, top } = segment.getBoundingClientRect();
      dragTrackContainer.style.left = `${left}px`;
      dragTrackContainer.style.top = `${top}px`;
      // 将 segment 暂时放到 dragTracContainer 内
      dragTrackContainer.appendChild(segment);

      const handleMouseup = (e: MouseEvent) => {
        e.stopPropagation();
        startX = e.clientX;
        startY = e.clientY;
        const { left, top } = dragTrackContainer.getBoundingClientRect();
        const scrollLeft = scrollContainerDom.scrollLeft;
        const segmentLeft = left - trackListRects.left + scrollLeft; // segmentLeft = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
        // 判断所有轨道与鼠标当前Y轴距离
        tracks.forEach((track) => {
          track.classList.remove("dragover");
          // 如果小于 10 则代表用户想拖到此轨道上
          if (isYCloseEnouph(track, e.clientY)) {
            segment.style.left = `${segmentLeft}px`;
            track.appendChild(segment);
          }
        });
        // 如果没有跨轨道拖动成功，则 x 轴移动
        setTimeout(() => {
          if (dragTrackContainer.children.length) {
            originTrack?.appendChild(segment);
            segment.style.left = `${segmentLeft}px`;
          }
        }, 0);
        segmentDragging = false;
        document.removeEventListener("mouseup", handleMouseup);
        document.removeEventListener("mousemove", handleMousemove);
      };
      const handleMousemove = (e: MouseEvent) => {
        // 拖动时拖动的是 dragTrackContainer
        const movedX = e.clientX - startX;
        const movedY = e.clientY - startY;
        const dragTrackContainerRect = dragTrackContainer.getBoundingClientRect();
        let left = dragTrackContainerRect.left + movedX;
        let top = dragTrackContainerRect.top + movedY;
        dragTrackContainer.style.left = `${left}px`;
        dragTrackContainer.style.top = `${top}px`;
        tracks.forEach((track) => {
          // 离轨道足够近
          if (isYCloseEnouph(track, e.clientY)) {
            tracks.forEach((element: HTMLElement) => {
              element.classList.remove("dragover");
            });
            track.classList.add("dragover");
            isXCloseEnouph(dragTrackContainerRect, segment, track, e.clientX);
          }
        });
        segmentDragging = true;

        startX = e.clientX;
        startY = e.clientY;
      };
      document.addEventListener("mouseup", handleMouseup);
      document.addEventListener("mousemove", handleMousemove);
    });
  })
  
};
const initTracks = () => {
  const tracks: HTMLElement[] = Array.from(document.querySelectorAll(".track"));
  tracks.forEach((trackItem) => {
    initTrackItem(trackItem, tracks);
  });
};
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
  timelineAxis.addEventListener(
    TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME,
    function (this: TimelineAxis, curentFrame, eventType) {
      console.log(this, curentFrame, eventType);
      const frameWidth = this.markWidth ?? 0;
      const frameRate = this.frameRate;
      const left = curentFrame * frameWidth - frameWidth;
      cursorDom.style.transform = `translateX(${left}px)`;
    }
  );

  initTracks();
  initCursor();
};

onMounted(() => {
  initApp();
});
</script>

<template>
  <div class="wrapper">
    <div class="timeline-container" @wheel.ctrl="handleWheel">
      <div class="track-operation">
        <div class="track-operation-item"></div>
      </div>
      <div
        class="webkit-scrollbar scroll-container"
        @scroll="handleScroll"
        ref="scrollContainerRef"
      >
        <div class="timeline-markers">
          <div id="canvasStage"></div>
        </div>
        <div
          class="scroll-content"
          ref="scrollContentRef"
          :style="{ width: `${scrollContentWidth}px` }"
        >
          <!-- :style="{ width: `${stageWidth}px` }" -->
          <div class="track-list" ref="trackListRef">
            <div class="track">
              <div class="track-placeholder"></div>
              <div
                class="segment segment-action"
                :style="{ width: `164px`, left: '0px' }"
              ></div>
              <div
                class="segment segment-action"
                :style="{ width: `100px`, left: '300px' }"
              ></div>
              <div
                class="segment segment-action"
                :style="{ width: `60px`, left: '400px' }"
              ></div>
            </div>
            <div class="track">
              <div class="track-placeholder"></div>
              <div
                class="segment segment-action"
                :style="{ width: `80px`, left: '0px' }"
              ></div>
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
  background-color: rgba(aquamarine, 0.8);
}
.wrapper {
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
    background-color: rgba(white, 0.15);
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
    background-color: rgba(aquamarine, 0.04);
  }
}
</style>
