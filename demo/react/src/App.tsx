import { useEffect, useRef, useState } from "react";
import "./App.css";
import Cursor from "./components/Cursor";

function App() {
  const [count, setCount] = useState(0);
  const cursorRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const scrollContentRef = useRef(null);
  let zoomRatio = 1;
  const zoomIn = () => {
    zoomRatio += 0.1;
  };
  const zoomOut = () => {
    zoomRatio -= 0.1;
  };
  // 滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.deltaY > 0 ? zoomOut() : zoomIn();
    if (zoomRatio <= 0.1 || zoomRatio >= 1.4) {
      return;
    }
    syncByZoom(zoomRatio)
  };

  useEffect(()=> {
    
  })
  return (
    <div className="App">
      <div className="wrapper">
        <div className="segment-list">
          <div className="segment-item">拖我</div>
          <div className="segment-item">拖我</div>
          <div className="segment-item">拖我</div>
          <div className="segment-item">拖我</div>
          <div className="segment-item segment-item-stretch">
            拖我
            <em>(伸缩轨道)</em>
          </div>
        </div>
        <div className="timeline-container">
          <div className="track-operation">
            <div className="track-operation-item">普通轨道</div>
            <div className="track-operation-item">普通轨道</div>
            <div className="track-operation-item">伸缩轨道</div>
          </div>
          <div className="webkit-scrollbar scroll-container" ref={scrollContainerRef}>
            <div className="timeline-markers">
              <div id="canvasStage"></div>
            </div>
            <div className="scroll-content"  ref={scrollContentRef}>
              <div className="track-list">
                <div className="track">
                  <div className="track-placeholder"></div>
                </div>
                <div className="track">
                  <div className="track-placeholder"></div>
                </div>
                <div className="track track-stretch">
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
