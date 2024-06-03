import React, {
  Ref,
  useEffect,
  useRef,
  useState,
} from "react";
import "./App.css";
import Cursor from "./components/Cursor";
import { TimelineAxis, TIMELINE_AXIS_EVENT_TYPE } from "../../zoomAxis/js/TimelineAxis";
import { CursorPointer, CURSOR_POINTER_EVENT_TYPE } from "../../zoomAxis/js/CursorPointer";
import { TRACKS_EVENT_TYPES, TTrackConfig } from "../../zoomAxis/js/TrackType";
import { findEndestSegment } from "../../zoomAxis/js/trackUtils";
import { Tracks } from "../../zoomAxis/js/Tracks";
import { Segment } from "../../zoomAxis/js/Segment";

let timeline: TimelineAxis | null;
let trackCursor: CursorPointer;
let segmentTracks: Tracks;
let isCtrlDown = false
const handleKeyUp = () => {
  isCtrlDown = false
  window.removeEventListener('keyup', handleKeyUp);
}
const handleKeyDown = (e: KeyboardEvent) => {
  if(e.key === 'Control'){
    isCtrlDown = true
  }
  window.addEventListener('keyup', handleKeyUp);
}
let zoomRatio = 1;
let currentSegment:Segment | null = null;
function App() {
  console.log('render')
  const cursorRef = useRef<HTMLDivElement|null>(null);
  const trackHeaderListRef = useRef<HTMLDivElement|null>(null);
  const trackListContainer = useRef<HTMLDivElement|null>(null);
  const trackListRef = useRef<HTMLDivElement|null>(null);
  const segmentItemListRef = useRef<HTMLDivElement|null>(null);
  const scrollContainerRef = useRef<HTMLDivElement|null>(null);
  const scrollContentRef = useRef<HTMLDivElement|null>(null);
  const timelineContainer = useRef<HTMLDivElement|null>(null);
  const [stageWidth, setStageWidth] = useState(920);
  const trackScrollWidthRef = useRef(920);
  const [trackScrollWidth, setTrackScrollWidth] = useState(920);
  const [scrollContentWidth, setScrollContentWidth] = useState(920);
  const [trackWidth, setTrackWidth] = useState(920);
  const [tracks, setTracks] = useState<TTrackConfig[]>([
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
  ])
  
  const syncTrackWidth = () => {
    const trackItemWidth = segmentTracks.width();
    // 需要用 useRef 获取最新值
    trackScrollWidthRef.current = (trackItemWidth < stageWidth) ? stageWidth : trackItemWidth;
    // 会导致重新渲染
    setTrackScrollWidth(trackScrollWidthRef.current);
    setTrackWidth(trackItemWidth < stageWidth ? stageWidth : trackItemWidth);
    
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
    const st = scrollContainerRef.current?.scrollTop ?? 0;
    const trackHeadersEl = trackHeaderListRef.current;
    // 竖向滚动带动轨道头部竖向滚动
    if(trackHeadersEl){
      trackHeadersEl.scrollTop = st
    }
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
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    if(!isCtrlDown) return;
    e.deltaY > 0 ? zoomOut() : zoomIn();
    syncByZoom(zoomRatio);
  };
  // 滚动 timeline  x 轴
  const scrollTimelineX =(pointerX: number) => {
    const dom = scrollContainerRef.current as HTMLElement | null
    if (!dom){
      return;
    }
    if (trackScrollWidthRef.current <= stageWidth) {
      return;
    }
    // 修正 pointerX 值
    const scrollContainerLeft = dom.getBoundingClientRect().left;
    pointerX -= scrollContainerLeft
    if(pointerX < stageWidth - 50 && pointerX > 50){
      return ;
    }
    let direct = 0;
    if(pointerX >= stageWidth - 50){
      direct = 1
    }else if(pointerX < 150){
      direct = -1
    }
    // 根据当前帧滚动滚动条
    dom.scrollLeft += (40 * direct);
  };

  


  const initApp = () => {
    if (
      !cursorRef.current ||
      !scrollContentRef.current ||
      !scrollContainerRef.current ||
      !trackListRef.current
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
      tickMarks: 500,
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
        // console.log(e);
        timeline?.setCurrentFrame(e.frame);
      }
    );
    // 初始化轨道
    segmentTracks = new Tracks({
      scrollContainer,
      tracks,
      trackListContainer: trackListRef.current,
      timeline,
      segmentDelegate: segmentItemList,
    });
    segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_ADDED, (event) => {
      console.log(event, 'added');
    })
    segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_SELECTED, (event) => {
      console.log('SEGMENT_SELECTED', event);
      currentSegment = event.segment ?? null
    });
    segmentTracks.addEventListener(TRACKS_EVENT_TYPES.SEGMENT_DELETED, (event) => {
      console.log(event);
    });
    segmentTracks.addEventListener(TRACKS_EVENT_TYPES.DRAGING_OVER, (e) => {
      if(e.pointerEvent){
        scrollTimelineX(e.pointerEvent?.clientX);
      }
    })
    syncTrackWidth();
  };
  const add = (trackId: string) => {
    segmentTracks?.addSegmentWithFramestart(trackId, 1, timeline?.currentFrame ?? 0);
  }
  const splitHandler = () => {
    currentSegment && segmentTracks.split(currentSegment);
  }
  const toggleMagnet = () => {
    segmentTracks.adsorbable = !segmentTracks.adsorbable;
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
    setTracks([...segmentTracks.tracksConfig]);
  }
  useEffect(() => {
    initApp();
    timelineContainer.current?.addEventListener('wheel', handleWheel);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      timelineContainer.current?.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const TrackHeaderItem = ({track}: {track?: TTrackConfig}) => {
    if(track?.subTracks?.length){
      return <div
        className="track-operation-item-group cursor-pointer"
        key={track.trackId}
      >
        <div className="track-operation-item flex items-center">
          <div
            className="mr-2"
          >
            <svg className="text-white" fill="rgba(255,255,255, 0.5)" width="12" height="12" viewBox="0 0 12 12" data-v-f2ec87fa=""><path fillRule="evenodd" clipRule="evenodd" d="M5.57574 8.4247L1.57574 4.4247L2.42427 3.57617L6 7.15191L9.57574 3.57617L10.4243 4.4247L6.42426 8.4247L6 8.84896L5.57574 8.4247Z"></path></svg>
          </div>
          { track.trackText }
        </div>
        {track.subTracks?.map((subTrack, index) => 
          <div
            className="track-operation-item"
            key={index}
          >
            { subTrack.trackText }
          </div>
        )}
        <div className="track-gutter"></div>
      </div>
    }

    return (
      <div 
        className="track-operation-item"
        key={track?.trackId}
      >
        { track?.trackText }
      </div>
    )
    
  }

  return (
    <div className="App">
      <div className="wrapper">
        <div className="btns"><button onClick={splitHandler}>分割</button><button onClick={toggleMagnet}>辅助线吸附</button></div>
        <div className="segment-list" ref={segmentItemListRef}>
          <div className="segment-item" style={{backgroundColor: '#C66136'}} data-segment-type={"1"}>
            拖我
            <button className="btn" onClick={()=> handleAddByClick('1')}>+</button>
          </div>
          <div className="segment-item" data-segment-type={"2"}>
            拖我
            <button onClick={()=> handleAddByClick('2')}>+</button>
          </div>
          <div className="segment-item" data-segment-type={"3"}>
            拖我（一）
            <button className="btn" onClick={()=> handleAddByClick('3')}>+</button>
          </div>
          <div className="segment-item" data-segment-type={"4"}>
            拖我
            <button className="btn" onClick={()=> handleAddByClick('4')}>+</button>
          </div>
          {/* <div
            className="segment-item segment-item-flex"
            data-segment-type="5"
            data-track-id="c"
          >
            拖我
          </div> */}
        </div>
        
        <div className="timeline-container" ref={timelineContainer} >
          <div className="track-header-list" ref={trackHeaderListRef}>
            <div className="track-operation">
              {tracks.map((track)=> 
                <TrackHeaderItem key={track.trackId} track={track} />
              )}
            </div>
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
            >
              <div
                className="track-list"
                style={{ width: `${trackWidth}px` }}
              >
                <div ref={trackListRef}></div>
              </div>
              <Cursor ref={cursorRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
