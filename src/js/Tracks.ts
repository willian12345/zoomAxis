import {
  TRACKS_EVENT_TYPES,
  DeleteableCheck,
  SegmentType,
  DropableCheck,
  TracksArgs,
  TracksEvent,
  TrackBasicConfig,
} from "./TrackType";

import { TimelineAxis } from "./TimelineAxis";
import { Track } from "./Track";
import { Segment } from "./Segment";
import { EventHelper } from "./EventHelper";

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
  findParentElementByClassName,
  getFrameRange,
  findEndestSegmentOnTrack,
} from "./trackUtils";
import { TrackFlex } from "./TrackFlex";

const DEFAULT_SEGMENT_FRAMES = 150;
export interface Tracks {
  addEventListener<EventType extends TRACKS_EVENT_TYPES>(
    eventType: EventType,
    callback: TracksEvent
  ): void;
}
// 轨道
export class Tracks extends EventHelper {
  static DEFAULT_SEGMENT_FRAMES = DEFAULT_SEGMENT_FRAMES;
  protected scrollContainer: HTMLElement = {} as HTMLElement;
  protected dragoverClass = "dragover";
  protected dragoverErrorClass = "dragover-error";
  timeline: TimelineAxis = {} as TimelineAxis;
  dropableCheck?: DropableCheck;
  deleteableCheck?: DeleteableCheck;
  ondragover: any = null;
  ondrop: any = null;
  currentSegment: HTMLElement | null = null;
  virtualTracks: Track[] = []; // 扁平化的虚拟轨道数据
  segmentDelegate: HTMLElement = document.body;
  coordinateLines: HTMLElement[] = [];
  private mousedownTimer = 0;
  private bindedEventArray: {
    ele: HTMLElement;
    eventName: keyof HTMLElementEventMap;
    listener: any;
    options?: any;
  }[] = [];
  private _disabled = false;
  get disabled(){
    return this._disabled
  };
  set disabled(v){
    this._disabled = v;
    this.virtualTracks.forEach( s => s.disabled = v)
  }

  constructor({
    tracks,
    scrollContainer,
    timeline,
    segmentDelegate,
    coordinateLines,
    dropableCheck,
    deleteableCheck,
    ondragover,
    ondrop,
  }: TracksArgs) {
    super();
    if (!timeline || !scrollContainer) {
      return;
    }
    this.timeline = timeline;
    this.scrollContainer = scrollContainer;
    if (segmentDelegate) {
      this.segmentDelegate = segmentDelegate;
    }
    // 辅助线
    if(coordinateLines) {
      this.coordinateLines = coordinateLines;
    }
    if (dropableCheck) {
      this.dropableCheck = dropableCheck;
    }
    if (deleteableCheck) {
      this.deleteableCheck = deleteableCheck;
    }
    this.initTracks(tracks);
    this.ondragover = ondragover;
    this.ondrop = ondrop;

    this.initEvent();
    return this;
  }
  private checkClickedOnSegment(e: MouseEvent) {
    let target = e.target as HTMLElement | null;
    if (!target) {
      return null;
    }
    // 找到事件对应的 segment 元素，如果当前不是，则冒泡往上找
    if (!target.classList.contains("segment")) {
      target = findParentElementByClassName(target, "segment");
    }
    if (target) {
      return target;
    }
    return null;
  }
  private clickHandle(e: MouseEvent) {
    const result = this.checkClickedOnSegment(e);
    if (result) {
      e.stopPropagation();
    }
  }
  private mouseupHandle() {
    this.clearTimer();
  }
  private clearTimer() {
    if (this.mousedownTimer) {
      clearTimeout(this.mousedownTimer);
    }
  }
  private mousedownHandle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (this?.timeline?.playing) {
      return;
    }
    const result = this.checkClickedOnSegment(e);
    if (result && this.scrollContainer) {
      this.segmentDragStart(e, this.scrollContainer, result);
    }
  }
  private mousedownDelegateHandle(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    // 右健点击忽略
    if (ev.button === 2) {
      return;
    }
    if (!target) {
      return;
    }
    if (!target.classList.contains("segment-item")) {
      return;
    }
    this.dragStart(ev, this.scrollContainer, target, true);
  }
  private segmentDragStart(
    e: MouseEvent,
    scrollContainer: HTMLElement,
    segment: HTMLElement
  ) {
    this.clearTimer();
    this.mousedownTimer = setTimeout(() => {
      this.dragStart(e, scrollContainer, segment);
    }, 300);
  }
  private delegateDispatchEvent(
    vt: Track,
    EventType: TRACKS_EVENT_TYPES,
    interceptor?: (...args) => Promise<void>
  ) {
    vt.addEventListener(EventType, async (args) => {
      // 如有需要事件发出前可以拦一道
      await interceptor?.(args);
      this.dispatchEvent({ eventType: EventType }, args);
    });
  }
  // 代理 Track 事件
  private delegateTrackEvents() {
    this.virtualTracks.forEach((vt) => {
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DRAG_END);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DROP_EFFECT);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_ADDED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_SELECTED, async ({segment}) => {
        this.removeSegmentActivedStatus();
        segment.setActived(true);
      });
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_DELETED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SLIDED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SLIDE_END);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK);
    });
  }
  private createVirtualTrack(tbc: TrackBasicConfig) {
    const isFlex = tbc.flexiable;
    const trackType = String(tbc.trackType);
    let vt: Track | null = null;
    if (isFlex) {
      vt = new TrackFlex({
        dom: tbc.dom,
        trackType,
        coordinateLines: this.coordinateLines,
        frameWidth: this.timeline.frameWidth,
        totalFrames: this.timeline.totalFrames,
      });
    } else {
      vt = new Track({
        dom: tbc.dom,
        trackType,
        frameWidth: this.timeline.frameWidth,
      });
    }
    if (tbc.subTracks) {
      // 递归创建虚拟轨道
      tbc.subTracks.forEach((stbc: TrackBasicConfig) => {
        const svt = this.createVirtualTrack(stbc);
        vt?.addTrack(svt);
      });
    }
    return vt;
  }
  private getPlainTracks(tracks: Track[], result: Track[] = []) {
    for (let track of tracks) {
      result.push(track);
      const sub = track.getTracks();
      if (sub.length) {
        this.getPlainTracks(sub, result);
      }
    }
    return result;
  }
  private initTracks(tracks: TrackBasicConfig[]) {
    const trackTree = tracks.map((tbc: TrackBasicConfig) => {
      return this.createVirtualTrack(tbc);
    });
    // 存储扁平结构的虚拟轨道方便处理
    const plain = this.getPlainTracks(trackTree);
    this.virtualTracks = plain;
    // 代理 Track 事件至 Tracks
    this.delegateTrackEvents();
  }
  // 代理 HTMLElement 事件，以便 destroy 时正确清除
  private on<T extends keyof HTMLElementEventMap>(
    ele: HTMLElement,
    eventName: T,
    listener: (this: HTMLElement, ev: HTMLElementEventMap[T]) => any,
    options?: boolean | AddEventListenerOptions
  ) {
    ele.addEventListener(eventName, listener, options);
    this.bindedEventArray.push({
      ele,
      eventName,
      listener,
      options,
    });
  }
  private initEvent() {
    // 关键帧点击事件
    this.on(this.scrollContainer, "click", (ev) =>{
      if(this.disabled) return;
      this.keyframeMousedownHandle(ev)
    });
    // 滚动区域 click 击事件
    this.on(this.scrollContainer, "click", (ev) => {
      this.clickHandle(ev);
    });
    // 代理素材列表 segment 可拖入项 鼠标事件
    this.on(this.segmentDelegate, "mousedown", (ev) =>{
      if(this.disabled) return;
      this.mousedownDelegateHandle(ev);
    });
    // 代理 轨道内 segment 鼠标事件
    this.on(this.scrollContainer, "mousedown", (ev) =>{
      if(this.disabled) return;
      this.mousedownHandle(ev)
    });
    this.on(this.scrollContainer, "mouseup", () => {
      if(this.disabled) return;
      this.mouseupHandle();
    });
  }
  keyframeMousedownHandle(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (!target) return;
    const segment = findParentElementByClassName(target, "segment");
    if (segment) {
      const sks = Array.from(
        segment.querySelectorAll(".segment-keyframe")
      ) as HTMLElement[];
      sks.forEach((sk) => sk.classList.remove("actived"));
    }
    if (target.classList.contains("segment-keyframe")) {
      target.classList.add("actived");
      ev.stopPropagation();
      this.dispatchEvent(
        { eventType: TRACKS_EVENT_TYPES.KEYFRAME_CLICK },
        {
          keyframe: target.dataset.frame,
        }
      );
    }
  }
  async deleteSegment(trackId: string, segmentId: string) {
    let result = true;
    const virtualSegment = this.getVirtualSegment(trackId, segmentId);
    if (!virtualSegment) return;
    if (this.deleteableCheck) {
      result = await this.deleteableCheck(trackId, segmentId);
      if (!result) {
        console.warn("删除失败");
        return result;
      }
      if (!virtualSegment) {
        return result;
      }
    }
    virtualSegment?.parentTrack?.removeSegment(virtualSegment);
    return result;
  }
  async deleteSegments(segments: Segment[]) {
    for (let segment of segments) {
      if (segment.parentTrack?.trackId) {
        await this.deleteSegment(
          segment.parentTrack.trackId,
          segment.segmentId
        );
      }
    }
  }
  removeSegmentActivedStatus() {
    const virtualSegments = this.getVirtualSegmentAll();
    virtualSegments.forEach((vs) => vs.setActived(false));
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
  protected async createSegment(
    segmentTrackId: string,
    framestart: number,
    segmentType: SegmentType
  ) {
    let virtualSegment: Segment | null = null;
    if (this.dropableCheck) {
      const { dropable, segmentData, segmentName } = await this.dropableCheck(
        segmentTrackId,
        framestart
      );
      if (dropable && segmentData) {
        framestart = segmentData.startFrame;
        virtualSegment = createSegment({
          trackId: segmentData.trackId ?? "",
          segmentId: segmentData.sectionId,
          framestart: framestart,
          frameend: segmentData.endFrame,
          name: segmentName,
          segmentType,
          frameWidth: this.timeline.frameWidth,
          extra: segmentData,
        });
      } else {
        this.dispatchEvent(
          { eventType: TRACKS_EVENT_TYPES.SEGMENT_ADDED },
          { error: { eventType: TRACKS_EVENT_TYPES.SEGMENT_ADDED } }
        );
        return null;
      }
    } else {
      const frameend = framestart + 30;
      virtualSegment = createSegment({
        trackId: segmentTrackId ?? "",
        framestart,
        frameend,
        name: "",
        segmentType,
        frameWidth: this.timeline.frameWidth,
      });
    }
    return virtualSegment;
  }
  private getFramestartByX(x: number): number {
    const frameWidth: number = this.timeline?.frameWidth ?? 0;
    let currentFrame = Math.round(x / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    return currentFrame;
  }
  protected async getSegment(
    copy: boolean,
    segment: HTMLElement,
    segmentTrackId: string,
    framestart: number,
    segmentType: SegmentType
  ): Promise<Segment | null> {
    if (copy) {
      return await this.createSegment(segmentTrackId, framestart, segmentType);
    } else {
      return this.getVirtualSegment(
        segment.dataset.trackId ?? "",
        segment.dataset.segmentId ?? ""
      );
    }
  }
  async removeSegment(segment: HTMLElement) {
    const trackId = segment.dataset.trackId ?? "";
    const segmentId = segment.dataset.segmentId ?? "";
    this.deleteSegment(trackId, segmentId);
  }
  getVirtualTrack(trackId: string): Track | TrackFlex | null {
    if (!trackId.length) {
      console.warn("注意：轨道 id 为空");
      return null;
    }
    return this.virtualTracks.find((vt) => vt.trackId === trackId) ?? null;
  }
  getVirtualSegmentAll() {
    let result: Segment[] = [];
    for (const vt of this.virtualTracks) {
      result = [...result, ...vt.getSegments()];
    }
    return result;
  }
  getVirtualSegment(trackId: string, segmentId: string) {
    if (!trackId.length || !segmentId.length) {
      console.warn("注意：轨道或片断 id 为空");
    }
    const virtualTrack = this.virtualTracks.find(
      (vt) => vt.trackId === trackId
    );
    if (!virtualTrack) {
      return null;
    }
    return virtualTrack.segments.get(segmentId) ?? null;
  }
  // 获取某条轨道内的所有 segments
  getSegmentsByTrackId(trackId: string): Segment[] {
    const track = this.getVirtualTrack(trackId);
    if (!track) return [];
    return track.getSegments();
  }
  getTracks() {
    return this.virtualTracks.map((vt) => vt.dom);
  }
  getTrackById(trackId: string) {
    return this.getTracks().find((track: HTMLElement) =>
      isContainSplitFromComma(track.dataset.trackId ?? "", trackId)
    );
  }
  dragStart(
    e: MouseEvent,
    scrollContainer: HTMLElement,
    segmentDom: HTMLElement,
    isCopy: boolean = false
  ) {
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    // 获取所有轨道
    const tracks: HTMLElement[] = this.virtualTracks.map((vt) => vt.dom);
    // 全局拖动容器
    const dragTrackContainer = getDragTrackCotainer() as HTMLElement;
    // 拖动前原轨道
    let originTrack: HTMLElement | null = isCopy
      ? null
      : segmentDom.parentElement;
    let startX = e.clientX;
    let startY = e.clientY;
    const { left, top } = segmentDom.getBoundingClientRect();
    dragTrackContainer.style.left = `${left}px`;
    dragTrackContainer.style.top = `${top}px`;
    let segmentCopy: HTMLElement;
    const segmentRect = segmentDom.getBoundingClientRect();
    // 如果拖动是复制
    if (isCopy) {
      segmentCopy = createSegmentFake(segmentRect);
      dragTrackContainer.appendChild(segmentCopy);
    } else {
      // 将 segment 暂时放到 dragTracContainer 内
      dragTrackContainer.appendChild(segmentDom);
    }

    if (!isCopy) {
      const virtualSegment = this.getSegmentById(
        segmentDom.dataset.segmentId ?? ""
      );
      const track = virtualSegment?.parentTrack;
      virtualSegment && track?.pointerdown(virtualSegment);
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
      this.virtualTracks.forEach((vt) => vt.removeStatusClass());
      // Y 轴碰撞
      const collisionTrack = trackCollisionCheckY(
        this.virtualTracks,
        e.clientY
      );
      // 轨道内 x 轴 移动判断
      collisionTrack?.pointermove({
        isCopy,
        scrollContainerX,
        segment: segmentDom,
        dragTrackContainerRect,
        tracks,
      });

      // 拖动容器形变
      // todo: 外部指定容器变形大小
      if (isCopy) {
        // 如果是复制，则需要形变成标准轨道内 segment 形状
        if (collisionTrack) {
          dragTrackContainer.style.left = `${e.clientX}px`;
          dragTrackContainer.style.top = `${e.clientY - 14}px`;
          dragTrackContainer.style.height = "24px";
        } else {
          // 没有碰到轨道，则变回原来的形状
          dragTrackContainer.style.height = `${segmentRect.height}px`;
        }
      }
      if (
        e.clientY > scrollContainerRect.top &&
        e.clientY <= scrollContainerRect.bottom
      ) {
        this.dispatchEvent(
          { eventType: TRACKS_EVENT_TYPES.DRAGING_OVER },
          { pointerEvent: e }
        );
      }
      startX = e.clientX;
      startY = e.clientY;
    };

    const mouseup = async (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;
      const { left } = dragTrackContainer.getBoundingClientRect();
      dragTrackContainer.style.transition = "none";

      // x = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
      const x = left - scrollContainerRect.left + scrollContainerScrollLeft;
      const framestart = this.getFramestartByX(x);
      const segmentTypeStr = segmentDom.dataset.segmentType ?? "0";
      const segmentTrackId = segmentDom.dataset.trackId ?? "";
      this.virtualTracks.forEach(async (vt) => {
        vt.dom.classList.remove(this.dragoverClass);
        vt.dom.classList.remove(this.dragoverErrorClass);
        if (isCloseEnouphToY(vt.dom, e.clientY)) {
          const virtualSegment = await this.getSegment(
            isCopy,
            segmentDom,
            segmentTrackId,
            framestart,
            parseInt(segmentTypeStr)
          );
          if (!virtualSegment) return;
          vt.pointerup({
            copy: isCopy,
            framestart,
            segment: virtualSegment,
          });
        }
      });

      // 如果没有跨轨道拖动成功，则 x 轴移动
      setTimeout(() => {
        if (dragTrackContainer.children.length) {
          // 如果是复制
          if (isCopy) {
            dragTrackContainer.removeChild(segmentCopy);
          }
          if (originTrack) {
            this.putSegmentBack(
              segmentDom,
              getLeftValue(segmentDom),
              originTrack
            );
          }
        }
      }, 0);

      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }
  getSegmentById(segmentId: string) {
    for (let track of this.virtualTracks) {
      const segment = track.segments.get(segmentId);
      if (segment) {
        return segment;
      }
    }
    return null;
  }
  addKeyframe(segmentId: string, frame: number) {
    this.getSegmentById(segmentId)?.addKeyframe(frame);
  }
  deleteKeyframe(segmentId: string, frame: number) {
    this.getSegmentById(segmentId)?.deleteKeyframe(frame);
  }
  deleteAllKeyframe(segmentId: string) {
    this.getSegmentById(segmentId)?.deleteKeyframeAll();
  }
  deleteKeyframeOutOfRange(segmentId: string) {
    return this.getSegmentById(segmentId)?.deleteKeyframeOutOfRange();
  }
  // 主动选中 segment
  selectSegment(segmentId: string) {
    const segment = this.getSegmentById(segmentId);
    if (!segment) {
      return;
    }
    if (segment.actived) {
      return;
    }
    this.removeSegmentActivedStatus();
    segment.setActived(true);
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_SELECTED },
      {
        segment,
      }
    );
  }
  addSegmentByTrackId(segmentConstructInfo: {
    trackId: string;
    segmentId: string;
    name: string;
    framestart: number;
    frameend: number;
    segmentType: SegmentType;
  }) {
    const track = this.getVirtualTrack(segmentConstructInfo.trackId);
    if (!track) {
      return;
    }
    const segment = createSegment({
      ...segmentConstructInfo,
      frameWidth: this.timeline.frameWidth,
    });
    segment.setRange(segment.framestart, segment.frameend);
    track.addSegment(segment);
  }
  getEndestSegmentFrameRange(trackId: string): [number, number] {
    let track = this.getTrackById(trackId);
    if (!track) {
      return [-1, -1];
    }
    const [segment] = findEndestSegmentOnTrack(track);
    if (segment) {
      return getFrameRange(segment);
    }
    return [0, 0];
  }
  async addSegmentWithFramestart(
    trackId: string,
    segmentType: SegmentType,
    framestart: number
  ) {
    if (framestart === undefined) return;
    const virtualTrack = this.getVirtualTrack(trackId);
    if (!virtualTrack) return;
    const virtualSegment = await this.createSegment(
      trackId,
      framestart,
      segmentType
    );
    if (!virtualSegment) return;
    if (virtualTrack instanceof TrackFlex) {
      virtualTrack.pointerup({
        copy: true,
        framestart: this.timeline.currentFrame,
        segment: virtualSegment,
      });
    } else {
      virtualTrack.addSegment(virtualSegment);
      virtualSegment.setRange(
        virtualSegment.framestart,
        virtualSegment.frameend
      );
    }
  }
  // 帧位置更新
  zoom() {
    if (!this.scrollContainer || !this.timeline) {
      return;
    }
    const frameWidth = this.timeline.frameWidth;
    this.virtualTracks.forEach((track) => track.setFrameWidth(frameWidth));
    const segments = this.getVirtualSegmentAll();
    segments.forEach((segment) => segment.setFrameWidth(frameWidth));
  }
  setTotalFrames(n: number) {
    this.virtualTracks.forEach((vt) => {
      if (vt instanceof TrackFlex) {
        vt.setTotalFrames(n);
      }
    });
  }
  width() {
    return this.timeline.totalFrames * this.timeline.frameWidth;
  }
  destroy() {
    this.virtualTracks.forEach((vt) => vt.destroy());
    for (let { ele, eventName, listener, options } of this.bindedEventArray) {
      ele.removeEventListener(eventName, listener, options);
    }
  }
}
