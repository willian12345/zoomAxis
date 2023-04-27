const createMoveDiv = (rect: DOMRect) => {
  const div = document.createElement("div");
  div.style.cssText = `position: fixed; width: ${rect.width}px; height: ${rect.height}px; left: ${rect.left}px;  top: ${rect.top}px; z-index:1000; background: rgba(198, 97, 54, 0.8); border-radius: 4px;`;
  return div;
};
const getLastSegment = (track: HTMLElement) => {
  if (!track) {
    return null;
  }
  const segmentList = Array.from(
    track.querySelectorAll(".segment")
  ) as HTMLElement[];
  if (!segmentList.length) {
    return null;
  }
  let last = segmentList[0];
  let frameend = 0;
  segmentList.forEach((s) => {
    const currentFrameend = parseInt(s.dataset.frameend ?? "0");
    if (currentFrameend > frameend) {
      frameend = currentFrameend;
      last = s;
    }
  });
  return last;
};
// 获取系数 a
const getAratioByDistanceX = (distanceX: number) => {
  distanceX = Math.abs(distanceX);
  if (distanceX < 400) {
    return 0.4;
  }
  // 距离太远高度太高会没有意义，直接返回 0
  if (distanceX > 4000) {
    return 0;
  }
  // 目标距离越远，a 系数越小
  return 1 / distanceX;
};
// 获取动画时长 ms 单位
const getDurationByDistanceX = (distanceX: number) => {
  distanceX = Math.abs(distanceX);
  // 距离小或太大
  if (distanceX < 400 || distanceX > 4000) {
    return 400;
  }
  // 根据距离调整时长
  return distanceX * 0.4;
};
export const showAnimation = async (
  delegatedDom: HTMLElement,
  targetId: string
) => {
  return new Promise((resolve) => {
    const rect = delegatedDom.getBoundingClientRect();
    let elX = rect.left;
    let elY = rect.top;
    const track = document
      .getElementById("videoEditorTimelineContainer")
      ?.querySelector(`div[data-track-id='${targetId}']`) as HTMLElement;
    if (!track || track.style.display === "none") {
      resolve(true);
      return;
    }
    let target = track; // 默认目标是目标轨道
    const segmentDom = getLastSegment(track);
    if (segmentDom) {
      target = segmentDom;
    }
    const current = createMoveDiv(rect);
    document.body.appendChild(current);
    const targetRect = target.getBoundingClientRect();
    let distanceX = targetRect.left - elX;
    let distanceY = targetRect.top - elY;
    // 如果轨道内有添加过，则目标为最后一个 segment 的结束帧位置
    if (segmentDom) {
      distanceX += targetRect.width;
    }
    const a = getAratioByDistanceX(distanceX);
    const duration = getDurationByDistanceX(distanceX);
    const b = (distanceY - a * distanceX * distanceX) / distanceX;
    let timer: number;
    let endTime = 0;
    let beginTime: number;
    function start() {
      beginTime = +new Date();
      endTime = beginTime + duration;
      timer = requestAnimationFrame(step);
    }
    function step() {
      let x = 0;
      let y = 0;
      const now: number = +new Date();
      if (now > endTime) {
        x = distanceX;
        y = distanceY;
        window.cancelAnimationFrame(timer);
        current.parentElement?.removeChild(current);
        resolve(true);
      } else {
        x = distanceX * ((now - beginTime) / duration);
        y = a * x * x + b * x;
      }
      current.style.left = `${elX + x}px`;
      current.style.top = `${elY + y}px`;
      requestAnimationFrame(step);
    }
    start();
  });
};
