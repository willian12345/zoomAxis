import {
  TRACKS_EVENT_CALLBACK_TYPES,
  TracksEventCallback,
  DeleteableCheck,
  SegmentType,
  DropableCheck,
  TracksArgs,
  DragingArgs,
  DropArgs,
  SegmentBasicInfo,
} from "./TrackType";

import { CursorPointer } from "./CursorPointer";
import { TimelineAxis } from "./TimelineAxis";

import {
  createSegment,
  createSegmentFake,
  getDragTrackCotainer,
  collisionCheckX,
  getLeftValue,
  trackCollisionCheckY,
  isCloseEnouphToY,
  getSegmentPlaceholder,
  isContainSplitFromComma,
  getDatasetNumberByKey,
  sortByLeftValue,
  createSegmentName,
  findParentElementByClassName,
  collisionCheckFrame,
  getFrameRange,
} from "./trackUtils";
// 轨道
export abstract class Tracks {
  abstract destroy(): void;
  private dragEndCallback: Set<TracksEventCallback> | null = null;
  private segmentsChangedCallback: Set<TracksEventCallback> | null = null;
  protected segmentsSlidedCallback: Set<TracksEventCallback> | null = null;
  protected segmentDropEffectCallback: Set<TracksEventCallback> | null = null;
  protected scrollContainer: HTMLElement = {} as HTMLElement;
  protected dragoverClass = "dragover";
  protected dragoverErrorClass = "dragover-error";
  protected trackCursor: CursorPointer = {} as CursorPointer;
  timeline: TimelineAxis = {} as TimelineAxis;
  dropableCheck?: DropableCheck;
  deleteableCheck?: DeleteableCheck;
  ondragover: any = null;
  ondrop: any = null;
  framestart = 0;
  frameend = 0;
  frames = 0;
  currentSegment: HTMLElement | null = null;
  constructor({
    trackCursor,
    scrollContainer,
    timeline,
    dropableCheck,
    deleteableCheck,
    ondragover,
    ondrop,
  }: TracksArgs) {
    if (!timeline || !scrollContainer || !trackCursor) {
      return;
    }
    this.timeline = timeline;
    this.trackCursor = trackCursor;
    this.scrollContainer = scrollContainer;

    if (dropableCheck) {
      this.dropableCheck = dropableCheck;
    }
    if (deleteableCheck) {
      this.deleteableCheck = deleteableCheck;
    }
    this.ondragover = ondragover;
    this.ondrop = ondrop;

    this.initEvent();
    return this;
  }
  private initEvent() {
    // 点击轨道外部时清除选中过的 segment 状态
    document.addEventListener(
      "mouseup",
      this.removeSegmentActivedStatus.bind(this)
    );
    // Delete 键删除当前选中的 segment
    document.addEventListener("keydown", this.removeActivedSegment.bind(this));
  }
  addListener(event, callback) { }
  addEventListener(
    eventType: TRACKS_EVENT_CALLBACK_TYPES,
    callback: TracksEventCallback
  ) {
    if (eventType === TRACKS_EVENT_CALLBACK_TYPES.DRAG_END) {
      if (!this.dragEndCallback) {
        this.dragEndCallback = new Set();
      }
      this.dragEndCallback.add(callback);
      return;
    }
    if (eventType === TRACKS_EVENT_CALLBACK_TYPES.SEGMENTS_CHANGED) {
      if (!this.segmentsChangedCallback) {
        this.segmentsChangedCallback = new Set();
      }
      this.segmentsChangedCallback.add(callback);
    }
    if (eventType === TRACKS_EVENT_CALLBACK_TYPES.DROP_EFFECT) {
      if (!this.segmentDropEffectCallback) {
        this.segmentDropEffectCallback = new Set();
      }
      this.segmentDropEffectCallback.add(callback);
    }
    if (eventType === TRACKS_EVENT_CALLBACK_TYPES.SEGMENTS_SLIDED) {
      if (!this.segmentsSlidedCallback) {
        this.segmentsSlidedCallback = new Set();
      }
      this.segmentsSlidedCallback.add(callback);
    }
  }
  removeActivedSegment(event: KeyboardEvent) {
    if (event.key !== "Delete") {
      return;
    }
    this.deleteActivedSegment();
  }
  removeSegmentActivedStatus() {
    this.scrollContainer?.querySelectorAll(".segment").forEach((segment) => {
      segment.classList.remove("actived");
    });
  }
  async deleteActivedSegment() {
    const activedSegment: HTMLElement = this.scrollContainer?.querySelector(
      ".segment.actived"
    ) as HTMLElement;
    if (!activedSegment) {
      return;
    }
    if (this.deleteableCheck) {
      const trackId = activedSegment?.dataset.trackId;
      const segmentId = activedSegment.dataset.segmentId;
      if (trackId && segmentId) {
        const result = await this.deleteableCheck(trackId, segmentId);
        if (!result) {
          console.warn("删除失败");
          return;
        }
      }
    }
    const trackDom = findParentElementByClassName(activedSegment, "track");
    // 如果是可伸缩轨道删除，则需要重新伸缩其它segment填满轨道
    if (trackDom) {
      const deletedFramestart = getDatasetNumberByKey(
        activedSegment,
        "framestart"
      );
      const deletedFrameend = getDatasetNumberByKey(activedSegment, "frameend");
      const frames = deletedFrameend - deletedFramestart;
      if (this.isStretchTrack(trackDom)) {
        const segments: HTMLElement[] = Array.from(
          trackDom.querySelectorAll(".segment")
        );
        const segmentRightSide: HTMLElement | undefined =
          this.getRightSideSegments(segments, getLeftValue(activedSegment))[0];
        // 如果右侧有 segment 则将右侧segment 起始帧移到被删除segment的起始帧
        if (segmentRightSide) {
          let framestart = getDatasetNumberByKey(
            segmentRightSide,
            "framestart"
          );
          const frameend = getDatasetNumberByKey(segmentRightSide, "frameend");
          framestart = framestart - frames;
          this.setSegmentPosition(segmentRightSide, framestart, frameend);
          segmentRightSide.dataset.framestart = `${framestart}`;
        } else {
          // 右侧没有且左侧有，则将左侧 segment 结束帧移到被删除 segment 结束帧
          const segmentLeftSide: HTMLElement | undefined =
            this.getLeftSideSegments(
              segments,
              getLeftValue(activedSegment)
            ).reverse()[0];
          console.log(segmentLeftSide);
          if (segmentLeftSide) {
            const framestart = getDatasetNumberByKey(
              segmentLeftSide,
              "framestart"
            );
            let frameend = getDatasetNumberByKey(segmentLeftSide, "frameend");
            frameend = frameend + frames;
            this.setSegmentPosition(segmentLeftSide, framestart, frameend);
            segmentLeftSide.dataset.frameend = `${frameend}`;
          }
        }
      }
      activedSegment.parentElement?.removeChild(activedSegment);
    }
  }
  unMounted() {
    document.removeEventListener("mousedown", this.removeSegmentActivedStatus);
    document.removeEventListener("keydown", this.removeActivedSegment);
    this.destroy();
  }
  private putSegmentBack(
    segment: HTMLElement,
    segmentLeft: number,
    originTrack: HTMLElement
  ) {
    if (originTrack) {
      originTrack.appendChild(segment);
      const placeHolder = getSegmentPlaceholder(originTrack);
      if (!placeHolder) {
        return;
      }
      placeHolder.style.opacity = "0";
      const [isCollistion] = collisionCheckX(placeHolder, originTrack);
      if (!isCollistion) {
        segment.style.left = `${segmentLeft}px`;
      }
    }
  }
  private async copySegment(segmentTrackId: string, framestart: number) {
    let dom: HTMLElement | null = null;
    if (this.dropableCheck) {
      const { dropable, segmentData, segmentName } = await this.dropableCheck(
        segmentTrackId,
        framestart
      );
      if (dropable && segmentData) {
        dom = createSegment(SegmentType.BODY_ANIMATION);
        dom.appendChild(createSegmentName(segmentName));
        framestart = segmentData.startFrame;
        dom.dataset.framestart = `${framestart}`;
        dom.dataset.frameend = `${segmentData.endFrame}`;
        dom.dataset.frames = `${segmentData.endFrame - framestart}`;
        dom.dataset.segmentId = segmentData.sectionId ?? "";
        dom.dataset.trackId = segmentData.trackId ?? "";
      }else{
        return null;
      }
    } else {
      dom = createSegment(SegmentType.BODY_ANIMATION);
      const frameend = framestart + 30;
      dom.dataset.framestart = `${framestart}`;
      dom.dataset.frameend = `${frameend}`;
      dom.dataset.trackId = segmentTrackId ?? "";
    }
    return dom;
  }
  private getFramestartByX(x: number): number {
    const frameWidth: number = this.timeline?.frameWidth ?? 0;
    let currentFrame = Math.round(x / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    return currentFrame;
  }
  private getSegmentLeft(framestart: number): number {
    const frameWidth = this.timeline?.frameWidth ?? 0;
    return framestart * frameWidth;
  }
  protected isStretchTrack(track: HTMLElement) {
    const isStretchTrack = track.classList.contains("track-stretch");
    return isStretchTrack;
  }
  protected isStretchSegment(segment: HTMLElement) {
    return segment.classList.contains("segment-stretch");
  }
  private async getSegment(
    copy: boolean,
    segment: HTMLElement,
    segmentTrackId: string,
    framestart: number
  ): Promise<HTMLElement | null> {
    if (copy) {
      return await this.copySegment(segmentTrackId, framestart);
    } else {
      if (!segment.dataset.trackId) {
        segment.dataset.trackId = "";
      }
      return segment;
    }
  }
  async removeSegment(segment: HTMLElement) {
    const trackId = segment.dataset.trackId;
    const segmentId = segment.dataset.segmentId;
    if (trackId && segmentId && this.deleteableCheck) {
      const result = await this.deleteableCheck(trackId, segmentId);
      if (!result) {
        console.warn("删除失败");
        return;
      }
    }
    segment.parentNode?.removeChild(segment);
  }
  private sliceSegment(
    track: HTMLElement,
    currentSegmentId: string,
    framestart: number,
    frameend: number
  ): [HTMLElement|null, number] {
    let result: HTMLElement|null = null;
    let collisionSegmentFrameend = -1;
    // 过滤出重叠的 segment (在可伸展轨道)
    let segments = Array.from<HTMLElement>(track.querySelectorAll(".segment"));
    // 如果只有刚拖入的 segment 则不需要额外处理
    if (segments.length === 1) {
      return [result, collisionSegmentFrameend];
    }
    const collisionSegment = segments.find((segment: HTMLElement) => {
      const [segmentFramestart, segmentFrameend] = getFrameRange(segment);
      // 碰撞检测（通过计算开始帧与结束帧）且不是自身
      if (framestart >= segmentFramestart && framestart < segmentFrameend) {
        return true;
      }
      return false;
    }) ?? null;
    if(collisionSegment){
      let [ sFramestart, sFrameend] = getFrameRange(collisionSegment);
      collisionSegmentFrameend = sFrameend;
      if (sFrameend > framestart && sFramestart < framestart) {
        sFrameend = framestart;
        collisionSegment.dataset.frameend = `${framestart}`;
        this.setSegmentPosition(collisionSegment, sFramestart, sFrameend);
      } else if (sFramestart > framestart) {
        // 如果是完全覆盖则需要删除覆盖下的segment
        this.removeSegment(collisionSegment);
      }
    }
    return [collisionSegment, collisionSegmentFrameend];
  }
  getSegmentsByTrack(track: HTMLElement): HTMLElement[] {
    return Array.from<HTMLElement>(track.querySelectorAll(".segment"));
  }
  getTracks(){
    return Array.from<HTMLElement>(this.scrollContainer.querySelectorAll(".track"));
  }
  getTrackById(trackId: string){
    return this.getTracks().find((track: HTMLElement) => isContainSplitFromComma(track.dataset.trackId ?? '', trackId));
  }
  setSegmentPosition(
    segment: HTMLElement,
    framestart: number,
    frameend: number
  ) {
    const segmentLeft = this.getSegmentLeft(framestart);
    segment.style.left = `${segmentLeft}px`;
    const frames = frameend - framestart;
    if (this.timeline) {
      segment.style.width = `${this.timeline?.frameWidth * frames}px`;
    }
  }
  private dropToStretchTrack(
    track: HTMLElement,
    currentSegment: HTMLElement,
    framestart: number
  ) {
    track.appendChild(currentSegment);
    const totalFrames = this.timeline?.totalFrames ?? 0;
    let frameend = totalFrames;
    // 如果轨道内只有一个 segment 则铺满整个轨道
    if (track.querySelectorAll(".segment").length === 1) {
      framestart = 0;
    } else if (framestart > totalFrames) {
      // 如果是拖到了伸缩轨道最后，则往后加长
      framestart = totalFrames;
      // todo: 伸缩轨道增长暂定为 150 帧
      frameend = framestart + 300;
      this.timeline?.setTotalFrames(frameend);
    }
    currentSegment.dataset.framestart = String(framestart);
    currentSegment.dataset.frameend = String(frameend);
    currentSegment.dataset.trackId = track.dataset.trackId ?? "";
    const segmentId = currentSegment.dataset.segmentId ?? "";
    this.setSegmentPosition(currentSegment, framestart, frameend);

    const [effectSegment, effectSegmentOriginFrameend] = this.sliceSegment(
      track,
      segmentId,
      framestart,
      frameend
    );
    if(!effectSegment){
      return
    }
    frameend = effectSegmentOriginFrameend;
    currentSegment.dataset.frameend = String(frameend);
    this.setSegmentPosition(currentSegment, framestart, frameend);
    const [effectedFramestart, effectedFrameend] = getFrameRange(effectSegment)
    const result = {
      trackId: effectSegment.dataset.trackId ?? "",
      segmentId: effectSegment.dataset.segmentId ?? "",
      startFrame:effectedFramestart,
      endFrame: effectedFrameend,
      track,
      segment: effectSegment,
    };
    this.segmentDropEffectCallback?.forEach((cb) => {
      cb({
        segments: [result],
        eventType: TRACKS_EVENT_CALLBACK_TYPES.DROP_EFFECT,
      });
    });
    this.framestart = framestart;
    this.frameend = frameend;
  }
  // 获取相对于 leftValue 右侧所有 segment
  getRightSideSegments(segments: HTMLElement[], leftValue: number) {
    return segments
      .filter((segment) => {
        const segmentX = getLeftValue(segment);
        return leftValue < segmentX;
      })
      .sort(sortByLeftValue);
  }
  // 获取相对于 leftValue 左侧所有 segment
  getLeftSideSegments(segments: HTMLElement[], leftValue: number) {
    return segments
      .filter((segment) => {
        const segmentX = getLeftValue(segment);
        return (
          leftValue > segmentX + segment.getBoundingClientRect().width * 0.5
        );
      })
      .sort(sortByLeftValue);
  }
  getLeftSideSegmentsInTrack(track: HTMLElement, leftValue: number) {
    const segments = Array.from(
      track.querySelectorAll(".segment")
    ) as HTMLElement[];
    return this.getLeftSideSegments(segments, leftValue);
  }
  getRightSideSegmentsInTrack(track: HTMLElement, leftValue: number) {
    const segments = Array.from(
      track.querySelectorAll(".segment")
    ) as HTMLElement[];
    return this.getRightSideSegments(segments, leftValue);
  }
  // 伸缩轨道内拖动
  private collisionXstretch(
    isCopySegment: boolean,
    currentSegment: HTMLElement,
    placeholder: HTMLElement,
    collisionTrack: HTMLElement,
    isdrop?: boolean
  ) {
    if (isCopySegment) {
      return;
    }
    let segments = Array.from(
      collisionTrack.querySelectorAll(".segment")
    ) as HTMLElement[];
    const placeholderLeft = getLeftValue(placeholder);
    const onRightSegments = this.getRightSideSegments(
      segments,
      placeholderLeft
    );
    const onLeftSegments = this.getLeftSideSegments(segments, placeholderLeft);
    for (let segment of onLeftSegments) {
      const segmentFramestart = getDatasetNumberByKey(segment, "framestart");
      const segmentFrameend = getDatasetNumberByKey(segment, "frameend");
      // 如果左侧片断的左侧有空格(this.framestart 空格开始帧，this.frameend 空格结束帧)
      if (segmentFramestart > this.framestart) {
        // 向左移动一个片断
        const framestartMoved = segmentFramestart - this.frames;
        const frameendMoved = segmentFrameend - this.frames;
        this.setSegmentPosition(segment, framestartMoved, frameendMoved);
        segment.dataset.framestart = `${framestartMoved}`;
        segment.dataset.frameend = `${frameendMoved}`;
        this.framestart = frameendMoved;
        this.frameend = frameendMoved + this.frames;
        this.triggerDragEnd(segment, collisionTrack);
      }
    }
    // 判断右侧片断时，需要先将片断反转从右边头上开始判断一步步向右移动
    for (let segment of onRightSegments.reverse()) {
      const segmentFramestart = getDatasetNumberByKey(segment, "framestart");
      const segmentFrameend = getDatasetNumberByKey(segment, "frameend");
      // 如果右侧片断的右侧有空格(this.framestart 空格开始帧，this.frameend 空格结束帧)
      if (segmentFramestart < this.framestart) {
        // 向右移动一个片断
        const framestartMoved = segmentFramestart + this.frames;
        const frameendMoved = segmentFrameend + this.frames;
        this.setSegmentPosition(segment, framestartMoved, frameendMoved);
        segment.dataset.framestart = `${framestartMoved}`;
        segment.dataset.frameend = `${frameendMoved}`;
        this.framestart = segmentFramestart;
        this.frameend = segmentFramestart + this.frames;
        this.triggerDragEnd(segment, collisionTrack);
      }
    }

    if (isdrop) {
      this.setSegmentPosition(currentSegment, this.framestart, this.frameend);
      currentSegment.dataset.framestart = `${this.framestart}`;
      currentSegment.dataset.frameend = `${this.frameend}`;
    }
  }
  private draging({
    e,
    isCopySegment,
    scrollContainerX,
    segment,
    dragTrackContainerRect,
    tracks,
  }: DragingArgs) {
    const [collisionY, collisionTrack] = trackCollisionCheckY(
      tracks,
      e.clientY
    );
    if (collisionTrack) {
      // 离轨道足够近
      let placeHolder = getSegmentPlaceholder(collisionTrack);
      collisionTrack.classList.add(this.dragoverClass);
      const trackId = collisionTrack.dataset.trackId ?? "";
      const segmentTrackId = segment.dataset.trackId ?? "";
      // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
      if (!isContainSplitFromComma(trackId, segmentTrackId)) {
        collisionTrack.classList.add(this.dragoverErrorClass);
      }
      if (!placeHolder) {
        return;
      }
      const x = dragTrackContainerRect.left + scrollContainerX;
      // 拖动时轨道内占位元素
      placeHolder.style.width = `${dragTrackContainerRect.width}px`;
      placeHolder.style.left = `${x}px`;
      const isStretchTrack = this.isStretchTrack(collisionTrack);
      if (isStretchTrack) {
        this.collisionXstretch(
          isCopySegment,
          segment,
          placeHolder,
          collisionTrack
        );
      } else {
        // 利用各轨道内的 placeholder 与 轨道内所有现有存 segment进行x轴碰撞检测
        const [isCollistion] = collisionCheckX(placeHolder, collisionTrack);
        // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
        if (isCollistion) {
          placeHolder.style.opacity = "0";
        } else {
          placeHolder.style.opacity = "1";
        }
      }
    } else {
      // 没发生碰撞则恢复所有默认状态
      tracks.forEach((track) => {
        let placeHolder = getSegmentPlaceholder(track);
        if (placeHolder) {
          placeHolder.style.opacity = "0";
        }
        track.classList.remove(this.dragoverClass);
        track.classList.remove(this.dragoverErrorClass);
      });
    }

    return collisionY;
  }
  // todo: 暂时先用这种方式实现首尾不让用户拖动
  private updateSliderHandler(track: HTMLElement) {
    if (this.isStretchTrack(track)) {
      const segments = this.getSegmentsByTrack(track).sort(sortByLeftValue);
      const handles = Array.from<HTMLElement>(
        track.querySelectorAll(".segment-handle-left, .segment-handle-right")
      );
      // 如果只有一个 segment 则不允许左右手柄拖动
      if (segments.length === 1) {
        handles.forEach((handle) => {
          handle.style.pointerEvents = "none";
        });
      } else {
        handles.forEach((handle) => {
          handle.style.pointerEvents = "initial";
        });
        const first = segments[0];
        if (first) {
          const handle = first.querySelector(
            ".segment-handle-left"
          ) as HTMLElement;
          handle.style.pointerEvents = "none";
        }
        const last = segments[segments.length - 1];
        if (last) {
          const handle = last.querySelector(
            ".segment-handle-right"
          ) as HTMLElement;
          handle.style.pointerEvents = "none";
        }
      }
    }
  }
  private triggerDragEnd(segment: HTMLElement, track: HTMLElement) {
    const segmentId = segment.dataset.segmentId ?? "";
    const trackId = segment.dataset.trackId ?? "";
    const startFrame = getDatasetNumberByKey(segment, "framestart");
    const endFrame = getDatasetNumberByKey(segment, "frameend");
    // 拖动放回原处是异步，拖完也要延时
    setTimeout(() => {
      this.updateSliderHandler(track);
      // 拖完后触发回调
      this.dragEndCallback?.forEach((cb) =>
        cb({
          segments: [
            {
              segment,
              track,
              trackId,
              segmentId,
              startFrame,
              endFrame,
            },
          ],
          eventType: TRACKS_EVENT_CALLBACK_TYPES.DRAG_END,
        })
      );
    }, 2);
  }
  private async drop({
    e,
    x,
    segment,
    track,
    tracks,
    isCopySegment,
  }: DropArgs) {
    let framestart = this.getFramestartByX(x);
    const placeHolder = getSegmentPlaceholder(track);
    if (!placeHolder) {
      return;
    }
    let dom: HTMLElement | null = null;
    // 轨道 id
    const trackId = track.dataset.trackId ?? "";
    const segmentTrackId = segment.dataset.trackId ?? "";
    // 轨道 id 必须相同才能拖动进去
    if (!isContainSplitFromComma(trackId, segmentTrackId)) {
      placeHolder.style.opacity = "0";
      return;
    }
    const [isCollistion, magnet, magnetTo] = collisionCheckX(
      placeHolder,
      track
    );

    dom = await this.getSegment(
      isCopySegment,
      segment,
      segmentTrackId,
      framestart
    );
    this.currentSegment = dom;
    placeHolder.style.opacity = "0";
    if (!dom) {
      return;
    }

    const stretchTrack = this.isStretchTrack(track);

    // 如果是伸展轨道
    if (stretchTrack) {
      isCopySegment && this.dropToStretchTrack(track, dom, framestart);
      this.triggerDragEnd(dom, track);
      return;
    }
    // 拖动复制入轨时，需要再次判断放入轨道成功后帧数范围是不是产生碰撞
    if (isCopySegment && collisionCheckFrame(dom, track)) {
      console.log("frame collision");
      this.deleteableCheck &&
        this.deleteableCheck(trackId, dom.dataset.segmentId ?? "");
      return;
    }
    // 普通轨道
    if (!isCollistion || magnet) {
      track.appendChild(dom);
      // 如果 x 轴磁吸，则需要根据磁吸的 segment 重新计算 framestart 与 segmentLeft 值
      if (magnet && magnetTo) {
        const magnetToRect: DOMRect = magnetTo.getBoundingClientRect();
        const magnetLeft: number = getLeftValue(magnetTo);
        const x = magnetLeft + magnetToRect.width;
        framestart = this.getFramestartByX(x);
        // segmentLeft = this.getSegmentLeft(framestart);
      }
      let fs = getDatasetNumberByKey(dom, "framestart");
      let fd = getDatasetNumberByKey(dom, "frameend");
      const frameend = framestart + (fd - fs);
      this.setSegmentPosition(dom, framestart, frameend);
      dom.dataset.framestart = `${framestart}`;
      dom.dataset.frameend = `${frameend}`;
    }
    this.triggerDragEnd(dom, track);
  }
  dragStart(
    e: MouseEvent,
    trackCursor: InstanceType<typeof CursorPointer>,
    scrollContainer: HTMLElement,
    segment: HTMLElement,
    isCopySegment: boolean = false
  ) {
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    // 获取所有轨道
    const tracks: HTMLElement[] = Array.from(
      document.querySelectorAll(".track")
    );
    // 全局拖动容器
    const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
    // 拖动前原轨道
    let originTrack: HTMLElement | null = isCopySegment
      ? null
      : segment.parentElement;
    let startX = e.clientX;
    let startY = e.clientY;
    const { left, top } = segment.getBoundingClientRect();
    dragTrackContainer.style.left = `${left}px`;
    dragTrackContainer.style.top = `${top}px`;
    let segmentCopy: HTMLElement;
    const segmentRect = segment.getBoundingClientRect();
    // 如果拖动是复制
    if (isCopySegment) {
      segmentCopy = createSegmentFake(segmentRect);
      dragTrackContainer.appendChild(segmentCopy);
    } else {
      // 将 segment 暂时放到 dragTracContainer 内
      dragTrackContainer.appendChild(segment);
    }

    if (!isCopySegment) {
      this.framestart = getDatasetNumberByKey(segment, "framestart");
      this.frameend = getDatasetNumberByKey(segment, "frameend");
      this.frames = this.frameend - this.framestart;
      // console.log(this.framestart, this.frameend, this.frames);
    }

    // 高度变为正在拖动的 segment 高度
    dragTrackContainer.style.height = `${segmentRect.height}px`;
    setTimeout(() => {
      dragTrackContainer.style.transition = "height .2s ease .1s";
    }, 0);

    const scrollContainerRect = scrollContainer.getBoundingClientRect();

    const mousemove = (e: MouseEvent) => {
      // 拖动时拖动的是 dragTrackContainer
      const movedX = e.clientX - startX;
      const movedY = e.clientY - startY;
      const dragTrackContainerRect = dragTrackContainer.getBoundingClientRect();
      let left = dragTrackContainerRect.left + movedX;
      let top = dragTrackContainerRect.top + movedY;
      dragTrackContainer.style.left = `${left}px`;
      dragTrackContainer.style.top = `${top}px`;
      const scrollContainerX =
        scrollContainer.scrollLeft - scrollContainerRect.left;
      const collisionY = this.draging({
        e,
        isCopySegment,
        scrollContainerX,
        segment,
        dragTrackContainerRect,
        tracks,
      });
      // 拖动容器形变
      if (isCopySegment) {
        // 如果是复制，则需要形变成标准轨道内 segment 形状
        if (collisionY) {
          dragTrackContainer.style.left = `${e.clientX}px`;
          dragTrackContainer.style.top = `${e.clientY - 14}px`;
          dragTrackContainer.style.height = "24px";
        } else {
          dragTrackContainer.style.height = `${segmentRect.height}px`;
        }
      }
      // 游标禁止交互
      trackCursor.enable = false;
      startX = e.clientX;
      startY = e.clientY;
    };

    const mouseup = (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;
      const { left } = dragTrackContainer.getBoundingClientRect();
      dragTrackContainer.style.transition = "none";
      // x = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
      const x = left - scrollContainerRect.left + scrollContainerScrollLeft;

      // 判断所有轨道与鼠标当前Y轴距离
      tracks.forEach(async (track) => {
        track.classList.remove(this.dragoverClass);
        track.classList.remove(this.dragoverErrorClass);
        // 如果足够近代表用户想拖到此轨道上
        if (isCloseEnouphToY(track, e.clientY)) {
          this.drop({ e, x, segment, track, tracks, isCopySegment });
        }
        const stretchTrack = this.isStretchTrack(track);

        // 如果是伸展轨道
        if (!isCopySegment && stretchTrack) {
          this.setSegmentPosition(segment, this.framestart, this.frameend);
          segment.dataset.framestart = `${this.framestart}`;
          segment.dataset.frameend = `${this.frameend}`;
        }
      });

      // 如果没有跨轨道拖动成功，则 x 轴移动
      setTimeout(() => {
        if (dragTrackContainer.children.length) {
          // 如果是复制
          if (isCopySegment) {
            // todo 如果是放入轨道后才能获取帧数，则需要在此处另外碰撞检测，如果碰撞则删除拖入的 segment
            // const track = findParentElementByClassName(segment, '.track') as HTMLElement;
            // console.log(segment, track, 3333)
            // const [isCollistion]  = collisionCheckX(segment, track);
            // if(isCollistion){
            //   segment.parentElement?.removeChild(segment);
            // }
            dragTrackContainer.removeChild(segmentCopy);
          }
          if (originTrack) {
            this.putSegmentBack(segment, getLeftValue(segment), originTrack);
            this.triggerDragEnd(segment, originTrack);
          }
        }
        // 重新允许游标交互
        trackCursor.enable = true;
      }, 0);
      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }
  addSegmentByTrackId(
    segment: {
      trackId: string;
      segmentId: string;
      name: string;
      framestart: number;
      frameend: number;
    },
    type?: SegmentType
  ) {
    const tracks: HTMLElement[] = Array.from(
      document.querySelectorAll(".track")
    );
    for (let track of tracks) {
      const dataTrackId = track.dataset.trackId ?? "";
      if (isContainSplitFromComma(dataTrackId, segment.trackId)) {
        const dom = createSegment(type);
        const segmentName = createSegmentName(segment.name);
        dom.appendChild(segmentName);
        this.setSegmentPosition(dom, segment.framestart, segment.frameend);
        dom.dataset.framestart = `${segment.framestart}`;
        dom.dataset.frameend = `${segment.frameend}`;
        dom.dataset.segmentId = `${segment.segmentId}`;
        dom.dataset.trackId = `${segment.trackId}`;
        track.appendChild(dom);
        // 更新是否可拖动手柄
        if (this.isStretchTrack(track)) {
          this.updateSliderHandler(track);
        }
      }
    }
  }
}
