import {
  TRACKS_EVENT_TYPES,
  DeleteableCheck,
  SegmentType,
  DropableCheck,
  TracksArgs,
  TracksEvent,
} from "./TrackType";

import { CursorPointer } from "./CursorPointer";
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
  sortByLeftValue,
  findParentElementByClassName,
  getFrameRange,
  findEndestSegmentOnTrack,
  isFlexTrack,
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
export abstract class Tracks extends EventHelper {
  static DEFAULT_SEGMENT_FRAMES = DEFAULT_SEGMENT_FRAMES;
  abstract destroy(): void;
  protected scrollContainer: HTMLElement = {} as HTMLElement;
  protected dragoverClass = "dragover";
  protected dragoverErrorClass = "dragover-error";
  protected trackCursor: CursorPointer = {} as CursorPointer;
  timeline: TimelineAxis = {} as TimelineAxis;
  dropableCheck?: DropableCheck;
  deleteableCheck?: DeleteableCheck;
  ondragover: any = null;
  ondrop: any = null;
  currentSegment: HTMLElement | null = null;
  virtualTracks: (Track)[] = [];
  constructor({
    trackCursor,
    scrollContainer,
    timeline,
    dropableCheck,
    deleteableCheck,
    ondragover,
    ondrop,
  }: TracksArgs) {
    super();
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
    this.initTracks();

    this.ondragover = ondragover;
    this.ondrop = ondrop;

    this.initEvent();
    return this;
  }
  private delegateDispatchEvent(vt: Track, EventType: TRACKS_EVENT_TYPES, interceptor?: () => Promise<void>){
    vt.addEventListener(EventType, async (args) => {
      // 如有需要事件发出前可以拦一道
      await interceptor?.();
      this.dispatchEvent(
        { eventType: EventType },
        args
      )
    })
  }
  // 代理 Track 事件
  private delegateTrackEvents () {
    this.virtualTracks.forEach( vt => {
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DRAG_END);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DROP_EFFECT);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_ADDED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_SELECTED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_DELETED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SLIDED);
      this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SLIDE_END);
    })
  }
  private initTracks() {
    const arr = Array.from(
      this.scrollContainer.querySelectorAll(".track")
    ) as HTMLElement[];
    this.virtualTracks = arr.map((trackDom) => {
      const isFlex = isFlexTrack(trackDom);
      if (isFlex) {
        return new TrackFlex({
          dom: trackDom,
          frameWidth: this.timeline.frameWidth,
          totalFrames: this.timeline.totalFrames,
        });
      }
      return new Track({
        dom: trackDom,
        frameWidth: this.timeline.frameWidth,
      });
    });
    // 代理 Track 事件至 Tracks
    this.delegateTrackEvents();
  }
  private initEvent() {
    // 点击轨道外部时清除选中过的 segment 状态
    // Delete 键删除当前选中的 segment
    document.addEventListener("keydown", this.removeActivedSegment.bind(this));
    this.scrollContainer.addEventListener(
      "click",
      this.keyframeMousedownHandle.bind(this)
    );
  }
  keyframeMousedownHandle(e: MouseEvent) {
    const target = e.target as HTMLElement;
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
      e.stopPropagation();
      this.dispatchEvent(
        { eventType: TRACKS_EVENT_TYPES.KEYFRAME_CLICK },
        {
          keyframe: target.dataset.frame,
        }
      );
    }
  }
  private async deleteSegment(trackId: string, segmentId: string) {
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
  removeActivedSegment(event: KeyboardEvent) {
    if (event.key !== "Delete") {
      return;
    }
    this.deleteActivedSegment();
  }
  removeSegmentActivedStatus() {
    const virtualSegments = this.getVirtualSegmentAll();
    virtualSegments.forEach((vs) => vs.setActived(false));
  }
  // 删除当前选中的
  async deleteActivedSegment() {
    const activedSegmentDom: HTMLElement = this.scrollContainer?.querySelector(
      ".segment.actived"
    ) as HTMLElement;
    if (!activedSegmentDom) {
      return;
    }
    const activedSegment = this.getVirtualSegmentById(
      activedSegmentDom.dataset.segmentId ?? ""
    );
    if (!activedSegment) return;
    this.deleteSegment(activedSegment.trackId, activedSegment.segmentId);
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
  private getSegmentLeft(framestart: number): number {
    const frameWidth = this.timeline?.frameWidth ?? 0;
    return framestart * frameWidth;
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
  getSegmentsByTrack(track: HTMLElement): HTMLElement[] {
    return Array.from<HTMLElement>(track.querySelectorAll(".segment"));
  }
  getTracks() {
    return this.virtualTracks.map((vt) => vt.dom);
  }
  getTrackById(trackId: string) {
    return this.getTracks().find((track: HTMLElement) =>
      isContainSplitFromComma(track.dataset.trackId ?? "", trackId)
    );
  }
  getSegmentBySegmentIdOnTrack(segmentId: string, track: HTMLElement) {
    return this.getSegmentsByTrack(track).find(
      (segment) => segment.dataset.segmentId === segmentId
    );
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
  // 获取相对于 leftValue 右侧所有 segment
  getRightSideSegments(segments: Segment[], leftValue: number) {
    return segments
      .filter((segment) => {
        const segmentX = getLeftValue(segment.dom);
        return leftValue < segmentX;
      })
      .sort(sortByLeftValue);
  }
  // 获取相对于 leftValue 左侧所有 segment
  getLeftSideSegments(segments: Segment[], leftValue: number) {
    return segments
      .filter((segment) => {
        const segmentX = getLeftValue(segment.dom);
        // ？？ 是否拖动手柄时也使用此判断 todo
        const _leftValue =
          segmentX + segment.dom.getBoundingClientRect().width * 0.5;
        return leftValue > _leftValue;
      })
      .sort(sortByLeftValue);
  }
  getLeftSideSegmentsInTrack(track: Track, leftValue: number) {
    const segments = track.getSegments();
    return this.getLeftSideSegments(segments, leftValue);
  }
  getRightSideSegmentsInTrack(track: Track, leftValue: number) {
    const segments = track.getSegments();
    return this.getRightSideSegments(segments, leftValue);
  }
  protected triggerSelected(segment: Segment) {
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_SELECTED },
      {
        segment,
      }
    );
  }
  dragStart(
    e: MouseEvent,
    trackCursor: InstanceType<typeof CursorPointer>,
    scrollContainer: HTMLElement,
    segmentDom: HTMLElement,
    isCopy: boolean = false
  ) {
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    let pointerEnter = false;
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
      const virtualSegment = this.getVirtualSegmentById(
        segmentDom.dataset.segmentId ?? ""
      );
      const track = virtualSegment?.parentTrack
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
      this.virtualTracks.forEach( vt => vt.removeStatusClass())
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
      })

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
      // 游标禁止交互
      trackCursor.enable = false;
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
            this.putSegmentBack(segmentDom, getLeftValue(segmentDom), originTrack);
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
  getVirtualSegmentById(segmentId: string) {
    for (let track of this.virtualTracks) {
      const segment = track.segments.get(segmentId);
      if (segment) {
        return segment;
      }
    }
    return null;
  }
  addKeyframe(segmentId: string, frame: number) {
    this.getVirtualSegmentById(segmentId)?.addKeyframe(frame);
  }
  deleteKeyframe(segmentId: string, frame: number) {
    this.getVirtualSegmentById(segmentId)?.deleteKeyframe(frame);
  }
  deleteAllKeyframe(segmentId: string) {
    this.getVirtualSegmentById(segmentId)?.deleteKeyframeAll();
  }
  deleteKeyframeOutOfRange(segmentId: string) {
    return this.getVirtualSegmentById(segmentId)?.deleteKeyframeOutOfRange();
  }
  select(segmentId: string) {
    const virtualSegment = this.getVirtualSegmentById(segmentId);
    if (!virtualSegment) {
      return;
    }
    if (virtualSegment.actived) {
      return;
    }
    this.removeSegmentActivedStatus();
    virtualSegment.setActived(true);
    this.triggerSelected(virtualSegment);
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
    track.addSegment(segment)
  }
  // 获取轨道结束帧最靠右边的 segment
  // 注意：有可能最右边的有多个
  getMaxFrameendSegments() {
    const segments = this.getVirtualSegmentAll();
    const result: Segment[] = [];
    let maxFrameend = 0;
    segments.forEach((segment) => {
      if (segment.frameend >= maxFrameend) {
        result.push(segment);
        maxFrameend = segment.frameend;
      }
    });
    return result;
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
    const track = this.getTrackById(trackId);
    if (!track) return;
    const virtualTrack = this.getVirtualTrack(trackId);
    if (!virtualTrack) return;
    const virtualSegment = await this.createSegment(
      trackId,
      framestart,
      segmentType
    );
    if (!virtualSegment) return;
    if(virtualTrack instanceof TrackFlex){
      virtualTrack.pointerup({
        copy: true,
        framestart: this.timeline.currentFrame,
        segment: virtualSegment,
      });
    }else{
      virtualTrack.addSegment(virtualSegment);
      virtualSegment.setRange(virtualSegment.framestart, virtualSegment.frameend);
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
  setTotalFrames(n: number){
    this.virtualTracks.forEach( vt => {
      if(vt instanceof TrackFlex){
        vt.setTotalFrames(n);
      }
    });
  }
  width() {
    return this.timeline.totalFrames * this.timeline.frameWidth;
  }
  unMounted() {
    this.virtualTracks.forEach( vt => vt.destroy());
    document.removeEventListener("mousedown", this.removeSegmentActivedStatus);
    document.removeEventListener("keydown", this.removeActivedSegment);
    this.destroy();
  }
}
