/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
import { Segment } from "./Segment";
import {
  collisionCheckX,
  getFrameRange,
  getLeftValue,
  getSegmentPlaceholder,
  collisionCheckFrame,
  isContainSplitFromComma,
  findParentElementByClassName,
  getRightSideSegments,
  getLeftSideSegments,
  CLASS_NAME_TRACK_DRAG_OVER,
  CLASS_NAME_TRACK_DRAG_OVER_ERROR,
  CLASS_NAME_SEGMENT,
  CLASS_NAME_SEGMENT_HANDLE_LEFT,
  CLASS_NAME_SEGMENT_HANDLE_RIGHT,
  CLASS_NAME_SEGMENT_HANDLE,
  CLASS_NAME_SEGMENT_HANDLE_CONTAINER,
  createSegment,
  createContainer,
  removePlaceholder,
  collisionCheckFrames,
} from "./trackUtils";
import {
  ITrackArgs,
  DragingArgs,
  TRACKS_EVENT_TYPES,
  SegmentType,
  ICreateSegmentCheck,
} from "./TrackType";
import { EventHelper } from "./EventHelper";
import { TrackGroup } from "./Group";

export type TMoveFunctionArgs = {
  frameWidth: number;
  segmentDom: HTMLElement;
  framestart: number;
  frameend: number;
};

export class Track extends EventHelper {
  dom!: HTMLElement;
  trackId = "";
  trackType = "";
  group: TrackGroup | null = null;
  visibility = true;
  segments: Map<string, Segment> = new Map(); // 轨道内的 segment
  subTracks: Map<string, Track> = new Map(); // 子轨道
  parent: Track | null = null; // 父轨道
  frameWidth: number = 0;
  originFrameStart = 0; // 拖动前 framestart
  originFrameEnd = 0; // 拖动前 frameend
  disabled = false;
  coordinateLineLeft!: HTMLElement; // segment 左侧辅助线
  collapsed = false;
  isDraging = false;
  sliding = false;
  segmentHandleContainer!: HTMLElement
  createSegmentCheck?: ICreateSegmentCheck; // 外部 UE 真正添加新 segment 逻辑
  constructor({ trackId, trackType, frameWidth, createSegmentCheck }: ITrackArgs) {
    super();
    this.frameWidth = frameWidth;
    this.trackId = trackId;
    this.trackType = trackType;
    this.dom = this.createDom();
    const segmentHandleContainer = this.dom.querySelector(`.${CLASS_NAME_SEGMENT_HANDLE_CONTAINER}`);
    if (!segmentHandleContainer) {
      throw new Error(`轨道模板内缺少${CLASS_NAME_SEGMENT_HANDLE_CONTAINER}容器`);
    }
    this.segmentHandleContainer = segmentHandleContainer as HTMLElement

    if (createSegmentCheck) {
      this.createSegmentCheck = createSegmentCheck;
    }
    this.initEvent();
  }
  createDom() {
    const div = document.createElement("div");
    div.innerHTML = `
        <div class="track" data-track-id="${this.trackId}" data-track-type="${this.trackType}">
          <div class="track-placeholder"></div>
          <div class="${CLASS_NAME_SEGMENT_HANDLE_CONTAINER}"></div>
        </div>
      `;
    return div.firstElementChild as HTMLElement;
  }
  initEvent() {
    this.dom.addEventListener("mousedown", this.mousedown);
    this.dom.addEventListener("click", this.click);
    // todo: 延迟到添加至少一个 segment 后再侦听
    this.dom.addEventListener('mouseout', this.mouseout);
    document.body.addEventListener('mousemove', this.mousemove);
  }
  mouseout = () => {
    if (this.isDraging || this.sliding) return;
    const segments = this.getSegments();
    segments.forEach(segment => segment.setHover(false));
  }
  mousemove = (e: MouseEvent) => {
    if (this.isDraging || this.sliding) return;
    const rect = this.dom.getBoundingClientRect();
    const x = e.clientX - rect.left - this.dom.scrollLeft;
    const y = e.clientY - (rect.top + rect.height * .5);
    this.segments.forEach(segment => segment.setHover(false));
    if (Math.abs(y) >= 14) return;
    const frame = Math.round(x / this.frameWidth);
    const interacts = this.getInteractSegment(Array.from(this.segments.values()), frame);
    interacts.forEach(segment => segment.setHover(true));
  }
  click = (e: MouseEvent) => {
    if (this.disabled) {
      return;
    }
    let target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_LEFT)) {
      e.stopPropagation();
      return;
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_RIGHT)) {
      e.stopPropagation();
      return;
    }
    if (!target.classList.contains(CLASS_NAME_SEGMENT)) {
      let segmentDom = findParentElementByClassName(target, CLASS_NAME_SEGMENT);
      if (segmentDom) {
        const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
        if (!segment?.actived) {
          this.dispatchEvent(
            { eventType: TRACKS_EVENT_TYPES.SEGMENT_SELECTED },
            {
              segment,
            }
          );
        }
        return;
      }
    }
  };
  mousedown = (e: MouseEvent) => {
    if (this.disabled) {
      return;
    }
    let target = e.target as HTMLElement | null;
    if (!target) {
      return;
    }
    if (!target.classList.contains(CLASS_NAME_SEGMENT)) {
      let segmentDom = findParentElementByClassName(target, CLASS_NAME_SEGMENT);
      if (segmentDom) {
        const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
        if (!segment?.actived) {
          this.dispatchEvent(
            { eventType: TRACKS_EVENT_TYPES.SEGMENT_SELECTED },
            {
              segment,
            }
          );
        }
        return;
      }
    }
    if (e.button === 2) {
      if (!target.classList.contains(CLASS_NAME_SEGMENT)) {
        let segmentDom = findParentElementByClassName(
          target,
          CLASS_NAME_SEGMENT
        );
        if (segmentDom) {
          const segment = this.getSegmentById(
            segmentDom.dataset.segmentId ?? ""
          );
          this.dispatchEvent(
            { eventType: TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK },
            {
              segment,
            }
          );
          return;
        }
      }
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_LEFT)) {
      e.stopPropagation();
      this.dragHandleStart(e, target, this.leftHandleMove.bind(this), 0); ``
      return;
    }
    if (target.classList.contains(CLASS_NAME_SEGMENT_HANDLE_RIGHT)) {
      e.stopPropagation();
      this.dragHandleStart(e, target, this.rightHandleMove.bind(this), 1);
      return;
    }
  };
  // 拖动手柄拖动开始
  dragHandleStart = (
    e: MouseEvent,
    handle: HTMLElement,
    move: (args: TMoveFunctionArgs) => void,
    handleCode: number
  ) => {
    const segment = this.getSegmentById(handle.dataset.segmentId ?? '')
    if (!segment) return;
    segment.prevFrameStart = segment.framestart
    segment.prevFrameEnd = segment.frameend
    this.sliding = true;
    const segmentDom = segment.dom
    e.preventDefault();
    const left: number = getLeftValue(segmentDom) as number;
    const width = segmentDom.getBoundingClientRect().width;
    let startX = e.clientX;
    const mousemove = (e: MouseEvent) => {
      e.stopPropagation();
      const moveX = e.clientX - startX;
      const x = left + moveX;
      // 需要定位到具体某一帧的位置
      const framestart = Math.round(x / this.frameWidth);
      const frameend = Math.round((x + width) / this.frameWidth);
      move({
        frameWidth: this.frameWidth,
        framestart,
        frameend,
        segmentDom,
      });
      segment.setSlideStatus(true);
    };
    const mouseup = (e: MouseEvent) => {
      startX = e.clientX;
      const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
      if (segment) {

        //注意： 宽度调节完毕后，影响到的相关 segment 不能同时调整需要另外再调用，所以使用了新的 SEGMENTS_SET_RANGE 事件
        this.triggerSlideEndEvent(segment, handleCode);
        this.sliding = false;
        segment.setSlideStatus(false);

        // 更新关键帧
        segment.updateSegmentKeyframesFrame();
        // 检测是否有超出范围的关键帧
        segment.deleteKeyframeOutOfRange();

        segment.prevFrameStart = segment.framestart
        segment.prevFrameEnd = segment.frameend

        // segment.syncKeyframesLeftPosition();
      }
      document.body.removeEventListener("mousemove", mousemove);
      document.body.removeEventListener("mouseup", mouseup);
    };
    // 在body上侦听事件，顶级事件留给 Tracks 全局，用于冒泡处理
    document.body.addEventListener("mousemove", mousemove);
    document.body.addEventListener("mouseup", mouseup);
  };
  protected slideable(framestart: number, frameend: number) {
    const frames = frameend - framestart;
    // 判断segment可视宽度，如果过小也不能再缩小了
    if (frames * this.frameWidth < 20) {
      return false;
    }
    return true;
  }
  // segment 左侧手柄拖动
  protected leftHandleMove({
    framestart,
    segmentDom,
  }: {
    framestart: number;
    segmentDom: HTMLElement;
  }): Segment | undefined {
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
    if (!segment) return;
    const frameend = parseFloat(segmentDom.dataset.frameend ?? "0");
    if (framestart >= frameend - 2) {
      return;
    }
    if (!this.slideable(framestart, frameend)) return;
    const segments = this.getSegmentsSelf();
    // 伸缩轨道，左侧 segment frameend 设为当前调整的 segment 的 framestart
    const track = segment.parentTrack;
    if (track) {
      // 从拖动原点开始算找出最近的左侧 segment
      const segmentLeftSide = getLeftSideSegments(
        segments,
        getLeftValue(segmentDom)
      ).reverse()[0];
      // 如果是首个 segment
      if (!segmentLeftSide) {
        // 最小拖到 0
        if (framestart < 0) {
          framestart = 0;
        }
      } else {
        // 左侧有 segment 的情况，最多拖到左侧 segment 的 frameend
        const sideSegmentFrameend = segmentLeftSide.frameend;
        // 小于左侧则等于左侧
        if (framestart < sideSegmentFrameend) {
          framestart = sideSegmentFrameend;
        }
      }
      segment.setRange(framestart, frameend);
      // 左侧手柄被拖动时需要更新关键帧的 left 值以抵销相对定位导致关键帧的左右移动
      segment.syncKeyframesLeftPosition();
      this.triggerSlideEvent(segment, [], 0);
      this.setHandlesActive(segment, true)
      return segmentLeftSide;
    }
    return;
  }
  // segment 右侧手柄拖动
  protected rightHandleMove({
    frameend,
    segmentDom,
  }: {
    frameend: number;
    segmentDom: HTMLElement;
  }): Segment | undefined {
    const segment = this.getSegmentById(segmentDom.dataset.segmentId ?? "");
    const framestart = parseFloat(segmentDom.dataset.framestart ?? "0");
    if (!segment) return;
    if (frameend <= framestart + 2) return;
    if (!this.slideable(framestart, frameend)) return;
    const segments = this.getSegmentsSelf();
    // 伸缩轨道，右侧 segment framestart 设为当前调整的 segment 的 frameend
    const track = segment.parentTrack;
    if (track) {
      const segmentRightSide = getRightSideSegments(
        segments,
        getLeftValue(segmentDom)
      )[0];
      if (!segmentRightSide) {
        segment.setRange(framestart, frameend);
      } else {
        const sideBorderFrame = segmentRightSide.framestart;
        // 小于左侧则等于左侧
        if (frameend > sideBorderFrame) {
          frameend = sideBorderFrame;
          segment.setRange(framestart, frameend);
        } else {
          segment.setRange(framestart, frameend);
          this.setSegmentPosition(segmentDom, framestart, frameend);
        }
      }
      this.triggerSlideEvent(segment, [], 1);
      this.setHandlesActive(segment, true)
      return segmentRightSide;
    }
    return;
  }
  getInteractSegment(segments: Segment[], frame: number) {
    return segments.filter(segment => {
      return frame >= segment.framestart && frame <= segment.frameend
    })
  }
  getSegmentLeft(framestart: number): number {
    const frameWidth = this.frameWidth ?? 0;
    return framestart * frameWidth;
  }
  setSegmentPosition(
    segment: HTMLElement,
    framestart: number,
    frameend: number
  ) {
    const segmentLeft = this.getSegmentLeft(framestart);
    segment.style.left = `${segmentLeft}px`;
    const frames = frameend - framestart;
    segment.style.width = `${this.frameWidth * frames}px`;
  }
  protected triggerSlideEvent(
    segment: Segment,
    segments: Segment[],
    handleCode: number
  ) {
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENTS_SLIDING },
      {
        segment,
        segments,
        handleCode,
      }
    );
    return segments;
  }
  protected triggerSlideEndEvent(segment: Segment, handleCode: number) {
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENTS_SLID_END },
      {
        segment,
        handleCode,
      }
    );
  }
  triggerEvent(eventType: TRACKS_EVENT_TYPES, data: any) {
    this.dispatchEvent({ eventType }, data);
  }
  setFrameWidth(w: number) {
    this.frameWidth = w;
    const segments = this.getSegments();
    segments.forEach((segment) => segment.setFrameWidth(w));
  }
  checkCollision(copy: boolean, segment: Segment) {
    // copy 说明是非轨道内的 Segment 拖动，即拖入并新建 Segment
    // ！！！由于异步，拖入后需要检测是否发生碰撞,如果发生碰撞则需要删除
    if (copy && collisionCheckFrame(segment, this)) {
      return true;
    }
    return false;
  }
  // 删除 class 状态
  removeStatusClass() {
    const cl = this.dom.classList;
    cl.remove(CLASS_NAME_TRACK_DRAG_OVER);
    cl.remove(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
    // const placeHolder = getSegmentPlaceholder(this.dom, segme);
    // if (!placeHolder) {
    //   return;
    // }
    // placeHolder.style.opacity = "0";
  }
  // 拖动开始
  dragstart(segment: Segment) {
    this.originFrameStart = segment.framestart;
    this.originFrameEnd = segment.frameend;
    segment.prevFrameStart = segment.framestart;
    segment.prevFrameEnd = segment.frameend;
    this.segments.forEach(segment => segment.setHover(false));
    this.isDraging = true;
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.DRAG_START },
      { segment }
    );
  }
  // 拖动中
  draging({
    scrollContainer,
    segmentDom,
    segment,
  }: DragingArgs) {
    if (!segment) {
      return;
    }

    const placeHolder = getSegmentPlaceholder(this.dom, segment);
    if (!placeHolder) {
      return;
    }
    this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER);
    const trackType = this.trackType;
    const segmentType = segmentDom.dataset.segmentType ?? "";
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(trackType, segmentType)) {
      this.dom.classList.add(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
    }
    const scrollContainerX = scrollContainer.getBoundingClientRect().left;
    // 拖动中的 dom 的 rect
    const rect = segmentDom.getBoundingClientRect()
    const frameWidth: number = this.frameWidth;
    let currentFrame = Math.round((rect.left - scrollContainerX + scrollContainer.scrollLeft) / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    // 拖动时轨道内占位元素
    placeHolder.style.width = `${rect.width}px`;
    placeHolder.style.left = `${currentFrame * this.frameWidth}px`;
    // 利用各轨道内的 placeholder 与 轨道内所有现有存 segment进行x轴碰撞检测
    const getOtherSegments = this.getOtherSegments(segment.segmentId).map( segment => [segment.framestart, segment. frameend]);
    const isCollistion = collisionCheckFrames(segment.framestart,  segment.framestart+segment.frames, getOtherSegments);
    // const isCollistion = collisionCheckX(placeHolder, this.dom);
    // 占位与其它元素如果碰撞则隐藏即不允许拖动到此处
    if (isCollistion) {
      placeHolder.style.opacity = "0";
    } else {
      placeHolder.style.opacity = "1";
    }
  }
  // 拖动结束
  dragend({
    copy,
    framestart,
    segment,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
  }): Segment | null {
    this.isDraging = false;
    const placeHolder = getSegmentPlaceholder(this.dom, segment);
    if (!placeHolder) {
      return null;
    }
    placeHolder.style.left = `${segment.framestart * this.frameWidth}px`;
    placeHolder.style.opacity = "0";
    // 如果不合法，则需要删除
    const checkResult = this.checkCollision(copy, segment);
    if (checkResult) {
      return null;
    }
    // const isCollistion = collisionCheckX(placeHolder, this.dom);

    // if (isCollistion) {
    //   return null;
    // }

    // 获取拖动前的 framestart ,frameend 这些直接存储于 dom 的 dataset 内
    // 传入的 framstart 是拖动后的当前状态值
    const [fs, fd] = getFrameRange(segment.dom);

    // 记录上一次拖动时的值
    segment.prevFrameStart = fs;
    segment.prevFrameEnd = fd;
    
    const frameend = framestart + (fd - fs);
    segment.setRange(framestart, frameend);
    this.addSegment(segment);
    return segment;
  }
  hidePlaceHolder(segment: Segment) {
    const placeHolder = getSegmentPlaceholder(this.dom, segment);
    if (!placeHolder) {
      return;
    }
    // 删除 placeholder 占位
    placeHolder.parentElement?.removeChild(placeHolder);
  }
  /**
   * 预检查
   * !! 暂时不支持多拖动时跨轨道，后期可以放开
   */
  precheck(scrollContainer: HTMLElement, segmentType: string, segment: Segment, multi: boolean) {
    // 如果轨道id 与 片断内存的轨道 id 不同，则说明不能拖到这条轨道
    if (!isContainSplitFromComma(this.trackType, segmentType)) {
      return false;
    }
    // 注意：由于 UE端无法支持多 segment 此处用于禁止跨轨道拖动
    if(segment.trackId !== this.trackId && multi){
      return false;
    }
    const placeHolder = getSegmentPlaceholder(this.dom, segment);
    if (!placeHolder) {
      return false;
    }
    const scrollContainerX = scrollContainer.getBoundingClientRect().left;
    // 拖动中的 dom 的 rect
    const rect = segment.dom.getBoundingClientRect()
    const frameWidth: number = this.frameWidth;
    let currentFrame = Math.round((rect.left - scrollContainerX + scrollContainer.scrollLeft) / frameWidth);
    if (currentFrame < 0) {
      currentFrame = 0;
    }
    // 拖动时轨道内占位元素
    placeHolder.style.width = `${rect.width}px`;
    placeHolder.style.left = `${currentFrame * this.frameWidth}px`;
    const isCollistion = collisionCheckX(currentFrame, currentFrame + segment.frames, this.getOtherSegments(segment.segmentId));
    if (isCollistion) {
      return false;
    }
    return true;
  }

  // todo: 是否重用 dom
  async createSegment(
    segmentTrackId: string,
    framestart: number,
    segmentType: SegmentType
  ) {
    let virtualSegment: Segment;
    if (this.createSegmentCheck) {
      // 外部 UE 创建逻辑完成后 UI 上再创建
      const { dropable, segmentData, segmentName } = await this.createSegmentCheck(
        segmentTrackId,
        framestart,
        segmentType,
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
          frameWidth: this.frameWidth,
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
      // 用于UI调式、演示 没有 UE 状态
      const frameend = framestart + 30;
      virtualSegment = createSegment({
        trackId: segmentTrackId ?? "",
        framestart,
        frameend,
        name: "",
        segmentType,
        frameWidth: this.frameWidth,
      });
    }
    return virtualSegment;
  }
  // 将 segment 逻辑或 dom 上添加进轨道
  addSegment(segment: Segment) {
    const isAdded = this.segments.get(segment.segmentId);
    // 非从其它轨道拖入且拖动前与拖动后位置没有发生变化则什么都不做
    if (
      !segment.originParentTrack &&
      this.originFrameStart === segment.framestart &&
      this.originFrameEnd === segment.frameend
    ) {
      return null;
    }
    // segment.prevFrameStart = this.originFrameStart
    // segment.prevFrameEnd = this.originFrameEnd

    // 如果添加过了，则无需再添加, 但要触发 DRAG_END
    if (isAdded) {
      return null;
    }
    // 如果是从别的轨道拖过来的，需要从原轨道移聊
    // if (segment.originParentTrack) {
    //   this.dispatchEvent(
    //     { eventType: TRACKS_EVENT_TYPES.SEGMENT_MOVED },
    //     { segment, originTrack: segment.originParentTrack },
    //   );
    // }

    this.segments.set(segment.segmentId, segment);
    this.dom.appendChild(segment.dom);
    segment.setTrack(this);
    this.createHandles(segment);

    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_ADDED },
      { segment }
    );
    return segment;
  }
  removeSegment(segment: Segment, dispatchEvent = true) {
    segment.leftHandler && segment.leftHandler.parentElement?.removeChild(segment.leftHandler);
    segment.rightHandler && segment.rightHandler.parentElement?.removeChild(segment.rightHandler);
    this.segments.delete(segment.segmentId);
    removePlaceholder(this.dom, segment)
    segment.dom.parentElement?.removeChild(segment.dom);

    if(!dispatchEvent){
      return;
    }
    this.dispatchEvent(
      { eventType: TRACKS_EVENT_TYPES.SEGMENT_DELETED },
      {
        segment,
      }
    );
  }
  // 获取非 segmentId 之外的所有 segment
  getOtherSegments(segmentId: string) {
    const segments = this.getSegments();
    return segments.filter((segment) => segment.segmentId !== segmentId);
  }
  // 仅获取自身轨道内的 segments
  getSegmentsSelf() {
    return Array.from(this.segments.values());
  }
  // 获取自身轨道及子轨道内的所有 segmetns
  getSegments() {
    let result: Segment[] = Array.from(this.segments.values());
    return result;
  }
  getSegmentById(segmentId: string) {
    return this.getSegments().find(
      (segment) => segment.segmentId === segmentId
    );
  }
  getLastSegment() {
    // 根据 frameend 值排序后获取最后一个 Segment
    const segments = this.getSegments().sort((a, b) => {
      // b 排在 a 后
      if (a.frameend < b.frameend) {
        return -1;
      }
      // b 排在 a 前
      if (a.frameend > b.frameend) {
        return 1;
      }
      return 0;
    });
    return segments[segments.length - 1];
  }
  // 创建 segment 拖动手柄
  createHandles(segment: Segment) {
    const tmpl = `
      <div class="${CLASS_NAME_SEGMENT_HANDLE} ${CLASS_NAME_SEGMENT_HANDLE_LEFT}" data-segment-id="${segment.segmentId}"></div>
      <div class="${CLASS_NAME_SEGMENT_HANDLE} ${CLASS_NAME_SEGMENT_HANDLE_RIGHT}" data-segment-id="${segment.segmentId}"></div>
    `
    const dom = createContainer('div')
    dom.innerHTML = tmpl
    // 关联至 segment
    segment.leftHandler = Array.from(dom.children)[0] as HTMLElement;
    segment.rightHandler = Array.from(dom.children)[1] as HTMLElement;
    // 添加到轨道 segment handle container
    Array.from(dom.children).forEach(node => {
      this.segmentHandleContainer.appendChild(node);
    });
    segment.updateSegmentHandlerPos();
  }
  setHandlesActive(segment: Segment, b: boolean) {
    this.setHandleActive(segment.leftHandler, b)
    this.setHandleActive(segment.rightHandler, b)
  }
  setHandleActive(dom: HTMLElement, b: boolean) {
    b ? dom.classList.add('actived') : dom.classList.remove('actived');
  }
  setVisibility(visibility: boolean) {
    this.visibility = visibility;
    this.dom.style.visibility = this.visibility ? "visible" : "hidden";
  }
  getTracks() {
    return Array.from(this.subTracks.values());
  }
  addTrack(track: Track) {
    this.subTracks.set(track.trackId, track);
  }
  removeTrack(track: Track) {
    this.subTracks.delete(track.trackId);
  }
  // 折叠
  collapse(collapse: boolean) {
    this.collapsed = collapse;
    this.dom.style.display = collapse ? "none" : "block";
  }
  // 折叠子轨道
  collapseSubTracks(collapse: boolean) {
    this.group?.collapse(collapse);
    this.subTracks.forEach((v) => v.collapse(collapse));
  }
  destroy() {
    this.dom.removeEventListener("mousedown", this.mousedown);
    this.dom.removeEventListener("click", this.click);
    this.dom.removeEventListener("mouseout", this.click);
    this.dom.parentNode?.removeChild(this.dom);
    document.body.removeEventListener('mousemove', this.mousemove);
  }
}
