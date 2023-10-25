import {
  TRACKS_EVENT_TYPES,
  IDeleteSegmentCheck,
  SegmentType,
  ICreateSegmentCheck,
  ITracksArgs,
  ITracksEvent,
  TTrackConfig,
} from "./TrackType";

import { TimelineAxis } from "./TimelineAxis";
import { Track } from "./Track";
import { Segment } from "./Segment";
import { TrackGroup } from "./Group";
import { EventHelper } from "./EventHelper";

import {
  CLASS_NAME_NEW_SEGMENT,
  CLASS_NAME_TRACK_DRAG_OVER,
  CLASS_NAME_TRACK_DRAG_OVER_ERROR,
  CLASS_NAME_SEGMENT,
  SEGMENT_OFFSET_TOP,
  createSegment,
  getDragTrackCotainer,
  removeDragTrackContainer,
  trackCollisionCheckY,
  isCloseEnouphToY,
  getSegmentPlaceholder,
  findParentElementByClassName,
  checkCoordinateLine,
  getDatasetNumberByKey,
  DEFAULT_SEGMENT_FRAMES,
  findLastIndex,
} from "./trackUtils";
import { TrackFlex } from "./TrackFlex";
import { TrackChildOverlap } from "./TrackChildOverlap";

const TRACK_EVENT_TYPES_ARRAY = [
  TRACKS_EVENT_TYPES.DRAG_END,
  TRACKS_EVENT_TYPES.DROP_EFFECT,
  TRACKS_EVENT_TYPES.SEGMENT_ADDED,
  TRACKS_EVENT_TYPES.SEGMENT_DELETED,
  TRACKS_EVENT_TYPES.SEGMENTS_SLIDING,
  TRACKS_EVENT_TYPES.SEGMENTS_SLID_END,
  TRACKS_EVENT_TYPES.SEGMENTS_SET_RANGE,
  TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK,
  TRACKS_EVENT_TYPES.KEYFRAME_MOVE_END,
  TRACKS_EVENT_TYPES.KEYFRAME_CLICK,
  TRACKS_EVENT_TYPES.KEYFRAME_MOVE_START,
  TRACKS_EVENT_TYPES.KEYFRAME_MOVING,
  TRACKS_EVENT_TYPES.KEYFRAME_SKIP,
  TRACKS_EVENT_TYPES.FRAME_JUMP,
];
export interface Tracks {
  addEventListener<EventType extends TRACKS_EVENT_TYPES>(
    eventType: EventType,
    callback: ITracksEvent
  ): void;
}
// 轨道
export class Tracks extends EventHelper {
  static DEFAULT_SEGMENT_FRAMES = DEFAULT_SEGMENT_FRAMES;
  scrollContainer!: HTMLElement;
  trackListContainer!: HTMLElement;
  timeline: TimelineAxis = {} as TimelineAxis;
  createSegmentCheck?: ICreateSegmentCheck;
  deleteSegmentCheck?: IDeleteSegmentCheck;
  ondragover: any = null;
  ondrop: any = null;
  currentSegment: HTMLElement | null = null;
  tracks: Track[] = []; // 扁平化的虚拟轨道数据
  tracksConfig: TTrackConfig[] = [];

  // 外部可拖入轨道的元素事件代理，默认为 document.body
  segmentDelegate: HTMLElement = document.body;
  coordinateLines: HTMLElement[] = [];
  frameWidth = 0;
  // 垂直辅助线
  coordinateLineVerical!: HTMLElement;
  // 选框
  rectangle!: HTMLElement;
  private mousedownTimer!: number;
  private bindedEventArray: {
    ele: HTMLElement|Document;
    eventName: keyof HTMLElementEventMap;
    listener: any;
    options?: any;
  }[] = [];

  // 禁用开关
  private _disabled = false;
  get disabled() {
    return this._disabled;
  }
  set disabled(v) {
    this._disabled = v;
    this.tracks.forEach((s) => (s.disabled = v));
  }
  // 吸附开关
  private _adsorbable = true;
  get adsorbable() {
    return this._adsorbable;
  }
  set adsorbable(v) {
    this._adsorbable = v;
  }
  // 关键帧是否在移动状态
  keyframeMoving = false;
  // 选框方式多选
  rectangleDraging = false;
  rectangleDragStart = [0, 0];
  rectangleDragEnd = [0, 0];
  // 按 shift 健可单击多选
  shiftKey = false;
  // 是否为多选拖动
  isMultiDrag = false;
  // 被选框框选中的
  SelectedSegments: Map<
    string,
    { segment: Segment; rect: DOMRect; originTrack: HTMLElement | null }
  > = new Map();
  constructor({
    tracks,
    scrollContainer,
    trackListContainer,
    timeline,
    segmentDelegate,
    createSegmentCheck,
    deleteSegmentCheck,
  }: ITracksArgs) {
    super();
    if (!timeline || !scrollContainer) {
      return;
    }
    this.timeline = timeline;
    this.scrollContainer = scrollContainer;
    this.trackListContainer = trackListContainer;
    if (segmentDelegate) {
      this.segmentDelegate = segmentDelegate;
    }
    // 辅助线
    this.initCoordinateLines();
    // 矩形选框
    this.initRectangle();
    // 帧宽
    this.frameWidth = this.timeline.frameWidth;
    // segment 添加检测
    if (createSegmentCheck) {
      this.createSegmentCheck = createSegmentCheck;
    }
    // segment 删除检测
    if (deleteSegmentCheck) {
      this.deleteSegmentCheck = deleteSegmentCheck;
    }
    // tracks 轨道配置参数
    this.tracksConfig = tracks;
    // 生成轨道
    this.initTracks(tracks);
    // 事件初始化
    this.initEvent();

    return this;
  }
  private initCoordinateLines() {
    const div = document.createElement("div");
    div.className = "coordinate-line";
    this.trackListContainer.parentNode?.appendChild(div);
    //
    this.coordinateLineVerical = div;
  }
  private initRectangle() {
    const div = document.createElement("div");
    div.className = "rectangle-capture";
    this.trackListContainer.parentNode?.appendChild(div);
    //
    this.rectangle = div;
  }
  private checkClickedOnSegment(e: MouseEvent) {
    let target = e.target as HTMLElement | null;
    if (!target) {
      return null;
    }
    // 找到事件对应的 segment 元素，如果当前不是，则冒泡往上找
    if (!target.classList.contains(CLASS_NAME_SEGMENT)) {
      target = findParentElementByClassName(target, CLASS_NAME_SEGMENT);
    }
    if (target) {
      return target;
    }
    return null;
  }
  private clickHandle(e: MouseEvent) {
    const result = this.checkClickedOnSegment(e);
    // 点击 segment 时不触发向上及同级click事件
    if (result) {
      e.stopImmediatePropagation();
      return;
    }
    // 正在拖动关键帧
    if (this.keyframeMoving) {
      return;
    }

    const x = this.getX(e.clientX, this.scrollContainer);
    let frame = Math.round(x / this.frameWidth);
    this.dispatchEvent({ eventType: TRACKS_EVENT_TYPES.FRAME_JUMP }, { frame });
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
    // 鼠标落在非 segment 上
    if (!result) {
      this.removeSegmentActivedStatus();
      this.dispatchRectangleDraging(e);
    } else if (result) {
      // 如果没有按住 shift 键，则清掉框选(多选)
      if (this.shiftKey) {
        this.getActivedSegments().forEach((segment) =>
          this.updateSelectedSegment(segment)
        );
        this.isMultiDrag = true;
      }
      // 鼠标落在 segment 上
      this.dragStart(e, this.scrollContainer, result);
    }
  }
  // 获取选框框选坐标,宽高
  private getRectangleRect() {
    const left = Math.min(this.rectangleDragStart[0], this.rectangleDragEnd[0]);
    const top = Math.min(this.rectangleDragStart[1], this.rectangleDragEnd[1]);
    const width = Math.abs(
      this.rectangleDragStart[0] - this.rectangleDragEnd[0]
    );
    const height = Math.abs(
      this.rectangleDragStart[1] - this.rectangleDragEnd[1]
    );
    const right = left + width;
    const bottom = top + height;
    return [left, top, width, height, right, bottom];
  }
  // 拖动创建选框框选
  private dispatchRectangleDraging(e: MouseEvent) {
    this.isMultiDrag = false;
    this.rectangleDraging = true;
    this.rectangleDragStart = this.getCoordinate(e.x, e.y);
    const [left, top] = this.getRectangleRect();
    this.rectangle.style.display = "block";
    this.rectangle.style.left = `${left}px`;
    this.rectangle.style.top = `${top}px`;

    const mousemove = (e: MouseEvent) => {
      if (!this.rectangleDraging) {
        return;
      }
      this.rectangleDragEnd = this.getCoordinate(e.x, e.y);
      const [left, top, width, height, right, bottom] = this.getRectangleRect();
      this.rectangle.style.left = `${left}px`;
      this.rectangle.style.top = `${top}px`;
      this.rectangle.style.width = `${width}px`;
      this.rectangle.style.height = `${height}px`;
      this.checkSelected(left, top, right, bottom);
    };
    const mouseup = () => {
      this.rectangleDraging = false;
      this.rectangle.style.display = "none";
      this.rectangle.style.width = `0`;
      this.rectangle.style.height = `0`;
      this.rectangleDragStart = [0, 0];
      this.rectangleDragEnd = [0, 0];
      // 如果有框选选中的
      if (this.SelectedSegments.size) {
        this.isMultiDrag = true;
      }
      document.removeEventListener("mousemove", mousemove);
      document.removeEventListener("mouseup", mouseup);
    };
    // 注意：当为框选事件时，不往外触发 mouseup 事件 轨道容器外部的 mouseup 事件可用于取消选中状态之类的用途
    const containerMouseup = (e: MouseEvent) => {
      const [width, height] = this.getRectangleRect();
      if (width > 2 && height > 2) {
        e.stopPropagation();
      }
      mouseup();
      this.trackListContainer.removeEventListener("mouseup", containerMouseup);
    };
    document.addEventListener("mousemove", mousemove);
    // this.trackListContainer.addEventListener('mouseup', containerMouseup)
    document.addEventListener("mouseup", mouseup);
  }
  private getCollisionTracks(top: number, bottom: number) {
    let selectedTrack: Map<string, Track> = new Map();
    // 轨道碰撞检测
    for (let track of this.tracks) {
      const offsetTop = track.dom.offsetTop;
      const offsetBottom = offsetTop + track.dom.offsetHeight;
      if (
        (offsetTop >= top && offsetBottom <= bottom) ||
        (bottom >= offsetTop && bottom <= offsetBottom) ||
        (top >= offsetTop && top <= offsetBottom)
      ) {
        selectedTrack.set(track.trackId, track);
      }
    }
    return selectedTrack;
  }
  private checkSelected(
    left: number,
    top: number,
    right: number,
    bottom: number
  ) {
    for (let track of this.tracks) {
      track.getSegments().forEach((segment) => {
        segment.setActived(false);
      });
    }

    const selectedTrack = this.getCollisionTracks(top, bottom);

    const framestart = Math.round(left / this.frameWidth);
    const frameend = Math.round(right / this.frameWidth);
    this.SelectedSegments.clear();
    // 轨道内 segment 碰撞检测
    for (let [_key, track] of selectedTrack) {
      track.getSegments().forEach((segment) => {
        if (
          (framestart <= segment.framestart && frameend >= segment.frameend) ||
          (frameend > segment.framestart && framestart < segment.framestart) ||
          (framestart > segment.framestart && framestart < segment.frameend)
        ) {
          segment.setActived(true);
          this.updateSelectedSegment(segment);
        }
      });
    }
  }
  private updateSelectedSegment(segment: Segment) {
    const s = {
      segment,
      rect: segment.dom.getBoundingClientRect(),
      originTrack: segment.dom.parentElement,
    };
    this.SelectedSegments.set(segment.segmentId, s);
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
    if (!target.classList.contains(CLASS_NAME_NEW_SEGMENT)) {
      return;
    }
    // 从外部拖入
    this.removeSegmentActivedStatus();
    this.dragStart(ev, this.scrollContainer, target, true);
  }

  // TrackEventMap
  private delegateDispatchEvent<T extends TRACKS_EVENT_TYPES>(
    vt: Track,
    EventType: T,
    interceptor?: ITracksEvent
  ) {
    vt.addEventListener(EventType, async (args) => {
      // 如有需要事件发出前可以拦一道
      const filtered = await interceptor?.(args);
      this.dispatchEvent({ eventType: EventType }, filtered ?? args);
    });
  }
  // 清空所有轨道代理事件
  private removeDelegateEvents() {
    TRACK_EVENT_TYPES_ARRAY.forEach((te) =>
      this.removeEventListenerCallbacks(te)
    );
  }
  private queryAllSegmentsDom() {
    return Array.from(
      this.scrollContainer.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)
    ) as HTMLElement[];
  }
  private checkSegmentHandleCoordinateLine({
    segment,
    handleCode,
  }: any): [boolean, number, number, HTMLElement | null] {
    const currentSegment: Segment | undefined = segment;
    if (!currentSegment) {
      return [false, 0, 0, null];
    }
    // const currentSegmentDom = currentSegment.dom;
    const allsegments = this.queryAllSegmentsDom();
    // 过滤掉自已，只对比其它
    const segmentsFiltered = allsegments.filter((sDom) => {
      return sDom.dataset.segmentId !== currentSegment.segmentId;
    });

    // 传入左|右手柄用于判断吸附位置
    const segmentHandles = [
      currentSegment.leftHandler,
      currentSegment.rightHandler,
    ] as HTMLElement[];
    const dom = segmentHandles[handleCode];
    // 跨轨道检测 x 轴是否与其它 segment 有磁吸
    const result = checkCoordinateLine(
      dom,
      segmentsFiltered,
      this.frameWidth,
      segment
    );
    const [isAdsorbing, _framestart, adsorbTo, segmentDom] = result;
    // 只要有一条轨道内的 segment 磁吸碰撞就显示垂直辅助线
    if (isAdsorbing && segmentDom) {
      this.showVerticalCoordinateLine(isAdsorbing, _framestart, adsorbTo);
    } else {
      this.hideCoordinateLine();
    }
    return result;
  }
  private delegateTrackEvent(vt: Track) {
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DRAG_START);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DRAG_END);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DROP_EFFECT);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_ADDED);
    this.delegateDispatchEvent(
      vt,
      TRACKS_EVENT_TYPES.SEGMENT_SELECTED,
      async ({ segment }) => {
        if (!this.shiftKey) {
          this.removeSegmentActivedStatus();
        }
        segment?.setActived(true);
      }
    );
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_DELETED);
    this.delegateDispatchEvent(
      vt,
      TRACKS_EVENT_TYPES.SEGMENTS_SLIDING,
      async (data) => {
        if (!this._adsorbable) return;
        this.checkSegmentHandleCoordinateLine(data);
      }
    );
    // 手柄拖动判断吸附
    this.delegateDispatchEvent(
      vt,
      TRACKS_EVENT_TYPES.SEGMENTS_SLID_END,
      async ({ segment, segments, handleCode }) => {
        if (!this._adsorbable) return;
        const [isAdsorbing, _framestart, _adsorbTo, segmentDom] =
          this.checkSegmentHandleCoordinateLine({
            segment,
            segments,
            handleCode,
          });
        if (isAdsorbing && segmentDom && segment) {
          // 根据拖动手柄的左右位置选择自动吸附位置
          // 可能存在拖动左手柄吸附到右侧 segment 的 framestart帧，导致总帧数为 0
          // 可能存在拖动右手柄吸附到左侧 segment 的 frameend 帧, 导致总帧数为 0
          // 所以拖柄吸附后需要判断总帧数大于 1 ，否则不吸附
          if (handleCode === 0 && segment.frameend - _framestart > 1) {
            segment.setRange(_framestart, segment.frameend);
          } else if (handleCode === 1 && _framestart - segment.framestart > 1) {
            segment.setRange(segment.framestart, _framestart);
          }
        }
        this.hideCoordinateLine();
        return { segment, segments, handleCode };
      }
    );
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SET_RANGE);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.KEYFRAME_MOVING, () => {
      this.keyframeMoving = true;
    });
    this.delegateDispatchEvent(
      vt,
      TRACKS_EVENT_TYPES.KEYFRAME_MOVE_END,
      (e) => {
        setTimeout(() => {
          this.keyframeMoving = false;
        }, 200);

        return e;
      }
    );
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.KEYFRAME_CLICK);
  }
  // 代理转发拦截 Track 事件
  private delegateTrackEvents() {
    this.tracks.forEach((vt) => {
      this.delegateTrackEvent(vt);
    });
  }
  private createVirtualTrack(tbc: TTrackConfig) {
    const trackType = String(tbc.trackType);
    const TrackClass = tbc.childOverlapable ? TrackChildOverlap : Track;
    let vt = new TrackClass({
      trackId: tbc.trackId,
      trackType,
      createSegmentCheck: this.createSegmentCheck,
      frameWidth: this.timeline.frameWidth,
    });
    if (tbc.subTracks) {
      vt.group = new TrackGroup(vt);
      if (tbc.collapsed) {
        vt.group.collapse(true);
      }
      // 递归创建虚拟轨道
      tbc.subTracks.forEach((stbc: TTrackConfig) => {
        const svt = this.createVirtualTrack(stbc);
        if (svt) {
          vt.group?.addChild(svt);
        }
      });
      this.trackListContainer.appendChild(vt.group.dom);
    } else {
      this.trackListContainer.appendChild(vt.dom);
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

  private initTracks(tracks: TTrackConfig[]) {
    const tracksArr = tracks.map((tbc: TTrackConfig) => {
      return this.createVirtualTrack(tbc);
    });
    // 存储扁平结构的虚拟轨道方便处理
    const plain = this.getPlainTracks(tracksArr);
    this.tracks = plain;
    // 代理 Track 事件至 Tracks
    this.delegateTrackEvents();
  }
  // 代理 HTMLElement 事件，以便 destroy 时正确清除
  private on<T extends keyof HTMLElementEventMap>(
    ele: HTMLElement|Document,
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
    // 滚动区域 click 击事件
    this.on(this.scrollContainer, "click", (e) => {
      this.clickHandle(e);
    });
    // 代理素材列表 segment 可拖入项 鼠标事件
    this.on(this.segmentDelegate, "mousedown", (e) => {
      if (this.disabled) return;
      this.mousedownDelegateHandle(e);
    });
    // 代理 轨道内 segment 鼠标事件
    this.on(this.scrollContainer, "mousedown", (e) => {
      if (this.disabled) return;
      this.mousedownHandle(e);
    });
    this.on(this.scrollContainer, "mouseup", () => {
      if (this.disabled) return;
      this.mouseupHandle();
    });
    this.on(document, "keydown", (e) => {
      if (e.shiftKey) {
        this.shiftKey = true;
      }
    });
    this.on(document, "keyup", (e) => {
      if (!e.shiftKey) {
        this.shiftKey = false;
      }
    });
  }
  // 获取相对于轨道上 x 位置
  private getX(mouseX: number, scrollContentDom?: HTMLElement) {
    scrollContentDom = scrollContentDom ?? this.scrollContainer;
    let x =
      mouseX -
      scrollContentDom.getBoundingClientRect().left +
      scrollContentDom.scrollLeft;
    const boundaryMax =
      scrollContentDom.scrollLeft + scrollContentDom.scrollWidth;
    const boundaryMin = 0;
    if (x < boundaryMin) {
      x = boundaryMin;
    } else if (x > boundaryMax) {
      x = boundaryMax;
    }
    return x;
  }
  // 获取相对于轨道上 y 位置
  private getY(mouseY: number, scrollContentDom?: HTMLElement) {
    scrollContentDom = scrollContentDom ?? this.scrollContainer;
    let y =
      mouseY -
      scrollContentDom.getBoundingClientRect().top +
      scrollContentDom.scrollTop;
    const boundaryMax =
      scrollContentDom.scrollTop + scrollContentDom.scrollHeight;
    const boundaryMin = 0;
    if (y < boundaryMin) {
      y = boundaryMin;
    } else if (y > boundaryMax) {
      y = boundaryMax;
    }
    return y;
  }
  // 获取鼠标相对于轨道窗口的坐标位置
  private getCoordinate(x: number, y: number) {
    return [this.getX(x), this.getY(y)];
  }
  private addNewTrackToDom(
    trackConfig: TTrackConfig,
    list: TTrackConfig[],
    parentElement: HTMLElement,
    parentTrack?: Track
  ) {
    const lastIndex = findLastIndex(list, (vt: Track) => {
      return vt.trackType === trackConfig.trackType;
    });
    // 获取插入位置后的轨道用于insertBefore
    const prevTrackConfig = lastIndex === -1 ? null : list[lastIndex + 1];
    const prevTrack = this.getTrack(prevTrackConfig?.trackId ?? "");

    const track = new Track({
      trackId: trackConfig.trackId,
      trackType: trackConfig.trackType + "",
      createSegmentCheck: this.createSegmentCheck,
      frameWidth: this.timeline.frameWidth,
    });
    if (parentTrack) {
      track.parent = parentTrack;
    }
    if (prevTrack) {
      prevTrack.dom.parentElement?.insertBefore(track.dom, prevTrack.dom);
      // list = [...list.slice(0, lastIndex + 1), trackConfig, ...list.slice(lastIndex + 1)];
      // 相同最后一个 TrackType 相同元素位置后添加
      list.splice(lastIndex + 1, 0, trackConfig);
    } else {
      parentElement.append(track.dom);
      // 最后位置添加
      list.splice(list.length, 0, trackConfig);
      // list = [...list, trackConfig];
    }
    this.tracks.push(track);
    // 代理 Track 事件至 Tracks
    this.delegateTrackEvent(track);
    return list;
  }
  /**
   * 添加轨道至一级
   * @param trackConfig
   */
  addTrack(trackConfig: TTrackConfig) {
    this.addNewTrackToDom(
      trackConfig,
      this.tracksConfig,
      this.trackListContainer
    );
  }
  /**
   * 添加轨道至某一轨道组下
   * @param trackConfig
   */
  addToTrackGroup(trackId: string, trackConfig: TTrackConfig) {
    const toTrackConfig = this.tracksConfig.find((tcg: TTrackConfig) => {
      return tcg.trackId === trackId;
    });
    if (!toTrackConfig?.subTracks) return;
    const toTrack = this.getTrack(toTrackConfig.trackId);
    if (!toTrack?.group?.subTracksDom) return;
    this.addNewTrackToDom(
      trackConfig,
      toTrackConfig.subTracks,
      toTrack.group.subTracksDom,
      toTrack
    );
    console.log(this.tracksConfig);
  }
  private removeTrackInConfigs(trackId: string, list: TTrackConfig[]) {
    const parentTrackConfig = list.find((tc) => tc.trackId === trackId);
    if (!parentTrackConfig) {
      return;
    }
    const index = list.findIndex((tc) => tc.trackId === trackId) ?? -1;
    if (index !== -1) {
      list.splice(index, 1);
    }
  }
  /**
   * 移除某条轨道
   */
  removeTrack(trackId: string) {
    const vt = this.getTrack(trackId);
    if (!vt) return;
    const parentTrack = vt.parent;
    if (parentTrack) {
      const parentTrackConfig = this.tracksConfig.find(
        (tc) => tc.trackId === parentTrack.trackId
      );
      if (!parentTrackConfig?.subTracks) {
        return;
      }
      this.removeTrackInConfigs(trackId, parentTrackConfig.subTracks);
    } else {
      this.removeTrackInConfigs(trackId, this.tracksConfig);
    }
    this.tracks = this.tracks.filter((vt) => vt.trackId !== trackId);
    vt.destroy();
    console.log(this.tracksConfig);
  }
  getTracksConfig() {
    return this.tracksConfig;
  }

  async deleteSegment(trackId: string, segmentId: string) {
    let result = true;
    const segment = this.getSegment(trackId, segmentId);
    if (!segment) return;
    if (this.deleteSegmentCheck) {
      result = await this.deleteSegmentCheck(trackId, segmentId);
      if (!result) {
        console.warn("删除失败");
        return result;
      }
      if (!segment) {
        return result;
      }
    }
    segment?.parentTrack?.removeSegment(segment);
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
    this.SelectedSegments.clear();
    this.getActivedSegments().forEach((segment) => {
      segment.setActived(false);
      this.dispatchEvent(
        { eventType: TRACKS_EVENT_TYPES.SEGMENT_DESELECT },
        { segment: segment }
      );
    });
  }

  // 将拖动的 segment 放回轨道内
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
      segment.style.left = `${segmentLeft}px`;
    }
  }
  private getFramestart(x: number): number {
    const frameWidth: number = this.timeline?.frameWidth ?? 0;
    let currentFrame = Math.round(x / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    return currentFrame;
  }

  async removeSegment(segment: HTMLElement) {
    const trackId = segment.dataset.trackId ?? "";
    const segmentId = segment.dataset.segmentId ?? "";
    this.deleteSegment(trackId, segmentId);
  }
  getTrack(trackId: string): Track | TrackFlex | null {
    if (!trackId?.length) {
      return null;
    }
    return this.tracks.find((vt) => vt.trackId === trackId) ?? null;
  }
  getSegments() {
    let result: Segment[] = [];
    for (const vt of this.tracks) {
      result = [...result, ...vt.getSegments()];
    }
    return result;
  }
  getSegment(trackId: string, segmentId: string) {
    // if (!trackId.length || !segmentId.length) {
    //   console.warn("注意：轨道或片断 id 为空");
    // }
    const track = this.tracks.find((vt) => vt.trackId === trackId);
    if (!track) {
      return null;
    }
    return track.segments.get(segmentId) ?? null;
  }
  getActivedSegments() {
    return this.getSegments().filter((segment) => segment.actived);
  }
  // 获取某条轨道内的所有 segments
  getSegmentsByTrackId(trackId: string): Segment[] {
    const track = this.getTrack(trackId);
    if (!track) return [];
    return track.getSegments();
  }
  getTracks() {
    return this.tracks.map((vt) => vt.dom);
  }
  hideCoordinateLine() {
    // todo? 暂时只有一根辅助线
    // 后期增加横向辅助线
    this.coordinateLineVerical.style.display = "none";
    this.coordinateLineVerical.style.left = "0";
  }
  /**
   *
   * @param segmentDom  接近碰撞到的 segment DOM
   * @param isOnLeft 接近碰撞的 segment DOM 是否在左侧，如果是右侧，则需要将辅助线移到 segment DOM 的起始位置
   * @param adsorbTo 磁吸的位置，即 left 值
   */
  private showVerticalCoordinateLine(
    isAdsorbing: boolean,
    _framestart: number,
    adsorbTo: number
  ) {
    if (!isAdsorbing) {
      this.hideCoordinateLine();
    } else {
      this.coordinateLineVerical.style.left = `${adsorbTo}px`;
      this.coordinateLineVerical.style.display = `block`;
    }
  }
  private showCoordinateLine(
    dom: HTMLElement
  ): boolean | [boolean, number, number] {
    if (!this._adsorbable || !dom) {
      return false;
    }
    // 跨轨道检测 x 轴是否与其它 segment 有磁吸
    const [isAdsorbing, _framestart, adsorbTo] = checkCoordinateLine(
      dom,
      this.queryAllSegmentsDom(),
      this.frameWidth
    );
    // 只要有一条轨道内的 segment 磁吸碰撞就显示垂直辅助线
    if (isAdsorbing && _framestart) {
      this.showVerticalCoordinateLine(isAdsorbing, _framestart, adsorbTo);
    } else {
      this.hideCoordinateLine();
    }
    return [isAdsorbing, _framestart, adsorbTo];
  }
  // segment 拖动开始
  dragStart(
    e: MouseEvent,
    scrollContainer: HTMLElement,
    segmentDom: HTMLElement,
    isCreateNew: boolean = false
  ) {
    // segment 拖拽
    if (!scrollContainer) {
      return;
    }
    // 获取所有轨道
    const tracks: HTMLElement[] = this.tracks.map((vt) => vt.dom);
    // 全局拖动层容器
    const dragTrackContainer = getDragTrackCotainer() as HTMLElement;

    let startX = e.clientX;
    let startY = e.clientY;

    // 从外部列表拖入需要新建的 segment
    let segmentCopy: Segment;
    const segmentRect = segmentDom.getBoundingClientRect();
    const segmentTypeStr = segmentDom.dataset.segmentType ?? "0";
    const segmentTrackId = segmentDom.dataset.trackId ?? "";
    const segmentId = segmentDom.dataset.segmentId ?? "";
    // 如果是外部拖入轨道 生成 segment
    if (isCreateNew) {
      const frames = getDatasetNumberByKey(segmentDom, "frames");
      // 如果拖动的已知 frames 则需要设置相应的frameend 否则 默认为 6 帧
      segmentCopy = createSegment({
        segmentType: parseInt(segmentTypeStr),
        frameWidth: this.frameWidth,
        framestart: 0,
        frameend: (frames > 0) ? frames : 6,
      });
      segmentCopy.dom.style.height = `${segmentRect.height}px`;
      
      // 将外部拖入轨道的也视为 segment 拖动
      this.SelectedSegments.set("NEW_SEGMENT", {
        segment: segmentCopy,
        rect: segmentRect,
        originTrack: null,
      });

      // 高度变为正在拖动的 segment 高度，因为它的样式可能与轨道内高度不一致
      segmentCopy.dom.style.height = `${segmentRect.height}px`;
      setTimeout(() => {
        // 用于形变动画
        segmentCopy.dom.style.transition = "height .2s ease .1s";
      }, 0);
    } else {
      // 轨道内普通 segment 的拖动
      const segment = this.getSegment(segmentTrackId, segmentId);
      if (!segment) return;
      this.SelectedSegments.set(segmentId, {
        segment,
        rect: segmentRect,
        originTrack: segmentDom.parentElement,
      });

      for (let [_, segmentSelected] of this.SelectedSegments) {
        this.updateSelectedSegment(segmentSelected.segment);
      }
    }

    // 轨道内拖动将 segment 暂时放到 dragTracContainer 内
    this.SelectedSegments.forEach(({ segment, rect }) => {
      // 将拖动的 dom 左上角定位到拖动开始开始的相对位置
      segment.dom.style.left = `${startX - (startX - rect.x)}px`;
      segment.dom.style.top = `${startY - (startY - rect.y)}px`;
      dragTrackContainer.appendChild(segment.dom);
      segment?.parentTrack?.dragstart(segment);
    });

    const scrollContainerRect = scrollContainer.getBoundingClientRect();

    const mousemove = (e: MouseEvent) => {
      // 移除所胡轨道碰撞前的状态
      this.tracks.forEach((vt) => {
        vt.removeStatusClass();
      });
      this.hideCoordinateLine();
      
      // 多选移动

      for (let [, selectedSegment] of this.SelectedSegments) {
        let domY = e.y - (startY - selectedSegment.rect.y);
        const dom = selectedSegment.segment.dom;
        dom.style.left = `${e.x - (startX - selectedSegment.rect.x)}px`;
        dom.style.top = `${domY}px`;

        // Y 轴碰撞
        const collisionTrack = trackCollisionCheckY(
          this.tracks,
          this.SelectedSegments.size > 1 ? domY : e.y
        );
        this.tracks.forEach( vt => {
          // hidePlaceHolder()
        })
        // 轨道内 x 轴 移动判断
        collisionTrack?.draging({
          isCreateNew,
          scrollContainer,
          segmentDom: dom,
          tracks,
          segmentId: selectedSegment.segment.segmentId,
        });

        // 拖动容器形变
        if (isCreateNew) {
          // 如果是新建，则需要形变成标准轨道内 segment 形状
          if (collisionTrack) {
            const trackHeight =
              collisionTrack.dom.getBoundingClientRect().height;
            dom.style.height = `${trackHeight}px`;
          } else {
            // 没有碰到轨道，则变回原来的形状
            dom.style.height = `${segmentRect.height}px`;
          }
        }
        if (collisionTrack) {
          this.showCoordinateLine(dom);
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
    };

    const mouseup = async (e: MouseEvent) => {
      e.stopPropagation();
      startX = e.clientX;
      startY = e.clientY;
      const scrollContainerScrollLeft = scrollContainer.scrollLeft;

      for (let [, { segment, originTrack }] of this.SelectedSegments) {
        const dom = segment.dom;
        const { left, y } = dom.getBoundingClientRect();
        // x = 拖动示意 left - 轨道总体 left 偏移 + 轨道容器 left 滚动偏移
        const x = left - scrollContainerRect.left + scrollContainerScrollLeft;
        const checkY = this.SelectedSegments.size > 1 ? y : e.y;
        let framestart = this.getFramestart(x);
        const segmentTypeStr = dom.dataset.segmentType ?? "0";
        const segmentTrackId = dom.dataset.trackId ?? "";
        const segmentId = dom.dataset.segmentId ?? "";
        dom.style.top = `${SEGMENT_OFFSET_TOP}px`;

        // 新建 segment
        let newSegment: Segment | null = null;
        // 轨道内异步动作命令
        const actions = this.tracks.map(async (vt) => {
          vt.dom.classList.remove(CLASS_NAME_TRACK_DRAG_OVER);
          vt.dom.classList.remove(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
          if (isCloseEnouphToY(vt.dom, checkY)) {
            // 预先检测是否是相同轨道，以及有没有发生碰撞
            const r = vt.precheck(segmentTypeStr, segment.segmentId);
            vt.hidePlaceHolder(segment.segmentId);
            if (!r) {
              return;
            }
            if (this._adsorbable) {
              // 计算吸附与否及对应 framestart 位置
              const [isAdsorbing, _framestart] = checkCoordinateLine(
                dom,
                Array.from(
                  this.scrollContainer.querySelectorAll(
                    `.${CLASS_NAME_SEGMENT}`
                  )
                ) as HTMLElement[],
                this.frameWidth
              );
              if (isAdsorbing) {
                framestart = _framestart;
              }
            }
            // 纯新建
            if (!segmentId) {
              newSegment = await vt.createSegment(
                vt.trackId,
                framestart,
                parseInt(segmentTypeStr)
              );
              if (!newSegment) {
                return;
              }
            } else {
              // 非新建
              newSegment = vt.getSegmentById(segmentId) ?? null;
              if (!newSegment) {
                // 判定是从其它轨道拖入的
                newSegment = await vt.createSegment(
                  vt.trackId,
                  framestart,
                  parseInt(segmentTypeStr)
                );
                if (!newSegment) {
                  return;
                }
                newSegment.originSegmentId = segmentId;
                newSegment.originTrackId = segmentTrackId;
                newSegment.originParentTrack = this.getTrack(segmentTrackId);
              }
            }
            dom.parentNode?.removeChild(dom);
            // 拖动完毕后加入进具体轨道内
            vt.dragend({
              copy: isCreateNew,
              framestart,
              segment: newSegment,
            });
            // 如果有原父级轨道，说明是从原父级轨道拖过来的，需要删除原父级轨道内的 segment
            if (newSegment?.originSegmentId) {
              this.deleteSegment(
                newSegment.originTrackId,
                newSegment.originSegmentId
              );
              newSegment.originParentTrack = null;
              newSegment.originSegmentId = "";
              newSegment.originTrackId = "";
              originTrack = null;
            }
          }
        });

        // 等待所有轨道异步判断新建完毕
        await Promise.all(actions);

        // 如果没有跨轨道拖放成功
        if (originTrack) {
          // 放回原轨道
          this.putSegmentBack(
            dom,
            segment.framestart * this.frameWidth,
            originTrack
          );
          // 拖完后触发回调
          this.dispatchEvent(
            { eventType: TRACKS_EVENT_TYPES.DRAG_END },
            { segment: this.getSegmentById(segmentId) }
          );
        }
        // 没有 segmentId 且没有新建成功，说明是从外部拖入创建且未成功创建，需要触发 DRAG_END
        if (!segmentId && !newSegment) {
          // 拖完后触发回调
          this.dispatchEvent({ eventType: TRACKS_EVENT_TYPES.DRAG_END });
        }
      }

      dragTrackContainer.style.transition = "none";

      // 清空临时放在全局拖动层容器内容
      setTimeout(() => {
        if (this.SelectedSegments.size) {
          this.SelectedSegments.forEach(({ segment }) => {
            // 如果是复制
            if (segment.dom.parentElement === dragTrackContainer) {
              dragTrackContainer.removeChild(segment.dom);
            }
          });
        }

        if (!this.isMultiDrag) {
          this.SelectedSegments.clear();
        }
      }, 0);
      if (segmentCopy) {
        const newSegmentTmp =
          this.SelectedSegments.get("NEW_SEGMENT")?.segment.dom;
        newSegmentTmp?.parentElement?.removeChild(newSegmentTmp);
        segmentCopy.dom.parentElement?.removeChild(segmentCopy.dom);
      }

      this.hideCoordinateLine();

      document.removeEventListener("mouseup", mouseup);
      document.removeEventListener("mousemove", mousemove);
    };
    document.addEventListener("mousemove", mousemove);
    document.addEventListener("mouseup", mouseup);
  }
  getSegmentById(segmentId: string) {
    for (let track of this.tracks) {
      const segment = track.segments.get(segmentId);
      if (segment) {
        return segment;
      }
    }
    return;
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
  setSegmentActived(segmentId: string) {
    const segment = this.getSegmentById(segmentId);
    if (!segment) {
      return;
    }
    if (segment.actived) {
      return;
    }
    this.removeSegmentActivedStatus();
    segment.setActived(true);
    return segment;
  }
  // 主动选中 segment
  selectSegment(segmentId: string) {
    const segment = this.setSegmentActived(segmentId);
    if (!segment) {
      return;
    }
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
    const track = this.getTrack(segmentConstructInfo.trackId);
    if (!track) {
      return null;
    }
    const segment = createSegment({
      ...segmentConstructInfo,
      frameWidth: this.timeline.frameWidth,
    });
    segment.setRange(segment.framestart, segment.frameend);
    track.addSegment(segment);
    return segment;
  }
  /**
   * 获取轨道内最后一个 segment 的帧范围
   * @param trackId
   * @returns
   */
  getEndestSegmentFrameRange(trackId: string): [number, number] {
    let track = this.getTrack(trackId);
    if (!track) {
      return [-1, -1];
    }
    const segment = track.getLastSegment();
    if (segment) {
      return [segment.framestart, segment.frameend];
    }
    return [0, 0];
  }
  /**
   * 当前帧添加新的 segment
   * @param trackId
   * @param segmentType
   * @param framestart
   * @returns
   */
  async addSegmentWithFramestart(
    trackId: string,
    segmentType: SegmentType,
    framestart: number
  ) {
    if (framestart === undefined) return;
    const track = this.getTrack(trackId);
    if (!track) return;
    const segment = await track.createSegment(
      trackId,
      framestart,
      segmentType
    );
    if (!segment) return;
    if (track instanceof TrackFlex) {
      track.pointerup({
        copy: true,
        framestart: this.timeline.currentFrame,
        segment,
      });
    } else {
      track.addSegment(segment);
      segment.setRange(segment.framestart, segment.frameend);
    }
  }
  // 帧位置更新
  zoom() {
    if (!this.scrollContainer || !this.timeline) {
      return;
    }
    const frameWidth = this.timeline.frameWidth;
    this.frameWidth = frameWidth;
    this.tracks.forEach((track) => track.setFrameWidth(frameWidth));
    const segments = this.getSegments();
    segments.forEach((segment) => segment.setFrameWidth(frameWidth));
  }
  /**
   * 设置总帧数
   * @param n
   */
  setTotalFrames(n: number) {
    this.tracks.forEach((vt) => {
      if (vt instanceof TrackFlex) {
        vt.setTotalFrames(n);
      }
    });
  }
  /**
   * 分割 segment
   * @param segment
   * @param newSegmentId 如果不传,自动创建一个
   * @returns
   */
  split(segmentFrom: Segment, newSegmentId?: string, extra?: any) {
    const currentFrame = this.timeline.currentFrame;
    const framestart = segmentFrom.framestart;
    const frameend = segmentFrom.frameend;
    // 当前帧必须在进行分割的 segment 内
    if (currentFrame <= framestart || currentFrame >= frameend) {
      return false;
    }
    const newSegment = createSegment({
      trackId: segmentFrom.trackId,
      segmentId: newSegmentId,
      framestart: currentFrame,
      frameend: segmentFrom.frameend,
      name: segmentFrom.name,
      segmentType: segmentFrom.segmentType,
      extra,
      frameWidth: this.timeline.frameWidth,
    });
    // 将新分割出的 segment 添加至轨道
    segmentFrom.parentTrack?.addSegment(newSegment);
    segmentFrom.setRange(framestart, currentFrame);
    segmentFrom.parentTrack?.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENTS_SET_RANGE },
      {
        segment: segmentFrom,
      }
    );
    return true;
  }
  width() {
    return this.timeline.totalFrames * this.timeline.frameWidth;
  }
  destroy() {
    removeDragTrackContainer();
    this.removeDelegateEvents();
    this.tracks.forEach((track) => track.destroy());
    for (let { ele, eventName, listener, options } of this.bindedEventArray) {
      ele.removeEventListener(eventName, listener, options);
    }
  }
}
