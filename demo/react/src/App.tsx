import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import "./App.css";
import Cursor from "./components/Cursor";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "../../../src/js/TimelineAxis";
import { CursorPointer, CURSOR_POINTER_EVENT_TYPE } from "../../../src/js/CursorPointer";
import { TRACKS_EVENT_CALLBACK_TYPES } from "../../../src/js/TrackType";
import { findEndestSegment } from "../../../src/js/trackUtils";
import { SegmentTracks } from "../../../src/js/SegmentTracks";

let timeline: TimelineAxis | null;
let trackCursor: CursorPointer;
let segmentTracks: SegmentTracks;
let isCtrlDown = false
const handleKeyUp = () => {
  isCtrlDown = false
  window.removeEventListener('keyup', handleKeyUp);
}
const handleKeyDown = (e: KeyboardEvent) => {
  console.log(e.key)
  if(e.key === 'Control'){
    isCtrlDown = true
  }
  window.addEventListener('keyup', handleKeyUp);
}
let zoomRatio = 1;
function App() {
  const cursorRef = useRef(null);
  const segmentItemListRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const scrollContentRef = useRef(null);
  const [stageWidth, setStageWidth] = useState(920);
  const [trackScrollWidth, setTrackScrollWidth] = useState(920);
  const [scrollContentWidth, setScrollContentWidth] = useState(920);
  const syncTrackWidth = () => {
    const trackItemWidth = segmentTracks.width()
    const w = (trackItemWidth < stageWidth) ? stageWidth : trackItemWidth;
    setTrackScrollWidth(w);
  }
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
  // 左右滚动
  const handleScroll = (e: React.UIEvent<HTMLDivElement, UIEvent>) => {
    if (!e) {
      return;
    }
    const dom = e.target as HTMLElement;
    timeline?.scrollLeft(-dom.scrollLeft);
  };
  // 标尺放大(镜头拉近)
  const zoomIn = () => {
    if (zoomRatio >= 1.4) {
      zoomRatio = 1.4;
      return;
    }
    zoomRatio += 0.1;
  };
  const zoomOut = () => {
    if (zoomRatio <= 0.1) {
      zoomRatio = 0.1
      return
    }
    zoomRatio -= 0.1;
  };
  // 增加轨道内容宽度
  const addTrackWidth = (trackCursor: CursorPointer) => {
    const [segment, right] = findEndestSegment();
    if (!segment) {
      return;
    }
    if (scrollContentWidth < right) {
      setScrollContentWidth(right + 800);
      trackCursor.refresh();
    }
  };
  
  // 滚轮缩放
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // e.preventDefault();
    e.deltaY > 0 ? zoomOut() : zoomIn();
    syncByZoom(zoomRatio);
  };

  const initApp = () => {
    if (
      !cursorRef.current ||
      !scrollContentRef.current ||
      !scrollContainerRef.current
    ) {
      return;
    }
    // 轨道，轨道容器，可拖入轨道列表
    if (!segmentItemListRef.current) {
      return;
    }

    if (timeline) {
      return;
    }
    const segmentItemList: HTMLElement = segmentItemListRef.current;
    const cursor: HTMLElement = cursorRef.current;
    const scrollContainer: HTMLElement = scrollContainerRef.current;
    const scrollContent: HTMLElement = scrollContentRef.current;
    const width = scrollContainer.getBoundingClientRect().width;
    setStageWidth(width);
    
    // 初始化时间轴
    timeline = new TimelineAxis({
      el: "canvasStage",
      totalMarks: 500,
      totalFrames: 1220,
      stageWidth: stageWidth,
    });
    // console.log(timeline)
    timeline.addEventListener(TIMELINE_AXIS_EVENT_TYPE.ENTER_FRAME, () => {
      trackCursor.sync();
    });
    // // 初始化游标
    trackCursor = new CursorPointer(scrollContent, cursor, timeline);
    trackCursor.addEventListener(
      CURSOR_POINTER_EVENT_TYPE.UPDATE,
      (e) => {
        console.log(e);
        timeline?.setCurrentFrame(e.frame);
      }
    );

    // 初始化轨道
    segmentTracks = new SegmentTracks({
      trackCursor,
      scrollContainer,
      timeline,
      segmentDelegate: segmentItemList,
    });
    segmentTracks.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.DRAG_END, (event) => {
      console.log(event, 'dragend');
    })
    segmentTracks.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.SEGMENT_ADDED, (event) => {
      console.log(event, 'added');
    })
    segmentTracks.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.DROP_EFFECT, (event) => {
      console.log('DROP_EFFECT', event);
    });
    segmentTracks.addEventListener(TRACKS_EVENT_CALLBACK_TYPES.SEGMENTS_SLIDED, (event) => {
      // console.log(segments);
    });
  };
  const add = (trackId: string) => {
    segmentTracks?.addSegmentWithFramestart(trackId, 1, timeline?.currentFrame ?? 0);
  }
  window.addEventListener('keydown', handleKeyDown);
  useEffect(() => {
    initApp();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);
  return (
    <div className="App">
      <div className="wrapper">
        <div className="segment-list" ref={segmentItemListRef}>
          <div className="segment-item" data-segment-type="0">拖我</div>
          <div className="segment-item" data-segment-type="0">拖我</div>
          <div className="segment-item" data-segment-type="0">拖我</div>
          <div className="segment-item" data-segment-type="0">拖我</div>
          <div className="segment-item segment-item-stretch" data-segment-type="1" data-track-id="c">
            拖我
            <em>(伸缩轨道)</em>
            <button onClick={()=> add('c')}> add </button>
          </div>
        </div>
        <div className="timeline-container" onWheel={(e) => handleWheel(e)}>
          <div className="track-operation">
            <div className="track-operation-item">普通轨道</div>
            <div className="track-operation-item">普通轨道</div>
            <div className="track-operation-item">伸缩轨道</div>
          </div>
          <div
            className="webkit-scrollbar scroll-container"
            ref={scrollContainerRef}
            onScroll={(e) => handleScroll(e)}
          >
            <div
              className="timeline-markers"
              style={{ width: `${stageWidth}px` }}
            >
              <div id="canvasStage"></div>
            </div>
            <div
              className="scroll-content"
              ref={scrollContentRef}
              style={{ width: `${scrollContentWidth}px` }}
              >
              <div
                className="track-list"
                style={{ width: `${trackScrollWidth}px` }}
              >
                <div className="track" data-track-id="a" data-track-type="0">
                  <div className="track-placeholder"></div>
                </div>
                <div className="track" data-track-id="b" data-track-type="0">
                  <div className="track-placeholder"></div>
                </div>
                <div className="track track-stretch track-flexible" data-track-id="c" data-track-type="1">
                  <div className="track-placeholder"></div>
                </div>
              </div>
            </div>
            <Cursor ref={cursorRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
