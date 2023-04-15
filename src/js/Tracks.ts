import {
  TRACKS_EVENT_TYPES,
  DeleteableCheck,
  SegmentType,
  CreateSegmentCheck,
  TracksArgs,
  TracksEvent,
  TrackConfig,
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
  CLASS_NAME_SEGMENT_HANDLE,
  CLASS_NAME_SEGMENT_KEYFRAME,
  CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED,
  createSegment,
  createSegmentFake,
  getDragTrackCotainer,
  removeDragTrackContainer,
  collisionCheckX,
  getLeftValue,
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

const TRACK_EVENT_TYPES_ARRAY = [
  TRACKS_EVENT_TYPES.DRAG_END,
  TRACKS_EVENT_TYPES.DROP_EFFECT,
  TRACKS_EVENT_TYPES.SEGMENT_ADDED,
  TRACKS_EVENT_TYPES.SEGMENT_DELETED,
  TRACKS_EVENT_TYPES.SEGMENTS_SLIDED,
  TRACKS_EVENT_TYPES.SEGMENTS_SLIDE_END,
  TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK,
]
export interface Tracks {
  addEventListener<EventType extends TRACKS_EVENT_TYPES>(
    eventType: EventType,
    callback: TracksEvent
  ): void;
}
// 轨道
export class Tracks extends EventHelper {
  static DEFAULT_SEGMENT_FRAMES = DEFAULT_SEGMENT_FRAMES;
  scrollContainer!: HTMLElement;
  trackListContainer!:HTMLElement;
  timeline: TimelineAxis = {} as TimelineAxis;
  createSegmentCheck?: CreateSegmentCheck;
  deleteableCheck?: DeleteableCheck;
  ondragover: any = null;
  ondrop: any = null;
  currentSegment: HTMLElement | null = null;
  tracks: Track[] = []; // 扁平化的虚拟轨道数据
  tracksConfig: TrackConfig[] = [];
  segmentDelegate: HTMLElement = document.body;
  coordinateLines: HTMLElement[] = [];
  frameWidth = 0;
  coordinateLineLeft!: HTMLElement
  private mousedownTimer!: number;
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
    this.tracks.forEach( s => s.disabled = v)
  }
  private _adsorbable = true;
  get adsorbable () {
    return this._adsorbable;
  }
  set adsorbable(v){
    this._adsorbable = v;
  }
  constructor({
    tracks,
    scrollContainer,
    trackListContainer,
    timeline,
    segmentDelegate,
    coordinateLines,
    createSegmentCheck,
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
    this.trackListContainer = trackListContainer;
    if (segmentDelegate) {
      this.segmentDelegate = segmentDelegate;
    }
    // 辅助线
    if(coordinateLines) {
      this.coordinateLines = coordinateLines;
      this.coordinateLineLeft = coordinateLines[0]
    }
    this.frameWidth =  this.timeline.frameWidth;
    if (createSegmentCheck) {
      this.createSegmentCheck = createSegmentCheck;
    }
    if (deleteableCheck) {
      this.deleteableCheck = deleteableCheck;
    }
    this.tracksConfig = tracks;
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
    if (result) {
      // 点击 segment 时不触发向上及同级click事件
      e.stopImmediatePropagation();
    }
  }
  private mouseupHandle(e: MouseEvent) {
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
    if (!target.classList.contains(CLASS_NAME_NEW_SEGMENT)) {
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
    //@ts-ignore
    this.mousedownTimer = setTimeout(() => {
      this.dragStart(e, scrollContainer, segment);
    }, 300);
  }
  // TrackEventMap
  private delegateDispatchEvent<T extends TRACKS_EVENT_TYPES>(
    vt: Track,
    EventType: T,
    interceptor?: TracksEvent
  ) {
    vt.addEventListener(EventType, async (args) => {
      // 如有需要事件发出前可以拦一道
      const filtered = await interceptor?.(args);
      this.dispatchEvent({ eventType: EventType }, filtered ?? args);
    });
  }
  // 清空所有轨道代理事件
  private removeDelegateEvents(){
    TRACK_EVENT_TYPES_ARRAY.forEach( te=> this.removeEventListenerCallbacks(te))
  }
  private queryAllSegmentsDom(){
    return Array.from(this.scrollContainer.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)) as HTMLElement[]
  }
  private checkSegmentHandleCoordinateLine({segment, handleCode}:any):[boolean, number, number, HTMLElement | null]{
    const currentSegment: Segment|undefined = segment;
    if(!currentSegment){
      return [false, 0, 0, null];
    }
    const currentSegmentDom = currentSegment.dom;
    const allsegments = this.queryAllSegmentsDom();
    // 过滤掉自已，只对比其它
    const segmentsFiltered = allsegments.filter((sDom)=> {
      return sDom.dataset.segmentId !== currentSegment.segmentId
    })
    // 传入左|右手柄用于判断吸附位置
    const segmentHandles = Array.from(currentSegmentDom.querySelectorAll(`.${CLASS_NAME_SEGMENT_HANDLE}`)) as HTMLElement[];
    const dom = segmentHandles[handleCode];
      // 跨轨道检测 x 轴是否与其它 segment 有磁吸
    const result = checkCoordinateLine(dom, segmentsFiltered, this.frameWidth, segment);
    const [isAdsorbing, _framestart, adsorbTo, segmentDom ] = result;
    // 只要有一条轨道内的 segment 磁吸碰撞就显示垂直辅助线
    if(isAdsorbing && segmentDom){
      this.showVerticalCoordinateLine(isAdsorbing, _framestart, adsorbTo )
    }else{
      this.hideCoordinateLine();
    }
    return result
  }
  private delegateTrackEvent(vt: Track){
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DRAG_START);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DRAG_END);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.DROP_EFFECT);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_ADDED);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_SELECTED, async ({segment}) => {
      this.removeSegmentActivedStatus();
      segment?.setActived(true);
    });
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_DELETED);
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SLIDED, async (data) => {
      if(!this._adsorbable) return;
      this.checkSegmentHandleCoordinateLine(data)
    });
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENTS_SLIDE_END, async ({segment, segments, handleCode}) => {
      if(!this._adsorbable) return;
      const [isAdsorbing, _framestart, _adsorbTo, segmentDom ] = this.checkSegmentHandleCoordinateLine({segment, segments, handleCode})
      if(isAdsorbing && segmentDom && segment){
        // 根据拖动手柄的左右位置选择自动吸附位置
        if(handleCode === 0){
          segment.setRange(_framestart, segment.frameend);
        }else if(handleCode === 1){
          segment.setRange(segment.framestart, _framestart);
        }
      }
      this.hideCoordinateLine();
      console.log(segment, segments)
      return {segment, segments, handleCode}
    });
    this.delegateDispatchEvent(vt, TRACKS_EVENT_TYPES.SEGMENT_RIGHT_CLICK);
  }
  // 代理转发拦截 Track 事件
  private delegateTrackEvents() {
    this.tracks.forEach((vt) => {
      this.delegateTrackEvent(vt);
    });
  }
  private createVirtualTrack(tbc: TrackConfig) {
    const trackType = String(tbc.trackType);
    let vt = new Track({
      trackId: tbc.trackId,
      trackType,
      createSegmentCheck: this.createSegmentCheck,
      coordinateLines: this.coordinateLines,
      frameWidth: this.timeline.frameWidth,
    });
    if(tbc.subTracks){
      vt.group = new TrackGroup(vt);
      // 递归创建虚拟轨道
      tbc.subTracks.forEach((stbc: TrackConfig) => {
        const svt = this.createVirtualTrack(stbc);
        if(svt){
          vt.group?.addChild(svt);
        }
      });
      this.trackListContainer.appendChild(vt.group.dom);
    }else{
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
  
  private initTracks(tracks: TrackConfig[]) {
    const tracksArr = tracks.map((tbc: TrackConfig) => {
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
    this.on(this.scrollContainer, "click", (ev) => {
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
    this.on(this.scrollContainer, "mouseup", (e) => {
      if(this.disabled) return;
      this.mouseupHandle(e);
    });
  }
  private addNewTrackToDom(trackConfig: TrackConfig, list: TrackConfig[], parentElement: HTMLElement){
    const lastIndex = findLastIndex(list, (vt: Track) => {
      return vt.trackType === trackConfig.trackType
    })
    const prevTrackConfig = list[lastIndex + 1];
    const prevTrack = this.getTrack(prevTrackConfig.trackId)
    
    const track = new Track({
      trackId: trackConfig.trackId,
      trackType: trackConfig.trackType + '',
      createSegmentCheck: this.createSegmentCheck,
      coordinateLines: this.coordinateLines,
      frameWidth: this.timeline.frameWidth,
    });
    if(prevTrack){
      prevTrack.dom.parentElement?.insertBefore(track.dom, prevTrack.dom);
      list = [...list.slice(0, lastIndex), trackConfig, ...list.slice(lastIndex)];
    }else{
      parentElement.append(track.dom);
      list = [...list, trackConfig];
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
  addTrack(trackConfig: TrackConfig){
    const newList = this.addNewTrackToDom(trackConfig, this.tracksConfig, this.trackListContainer)
    this.tracksConfig = newList;
  }
  /**
   * 添加轨道至某一轨道组下
   * @param trackConfig 
   */
  addToTrackGroup(trackId: string, trackConfig: TrackConfig,){
    const toTrackConfig = this.tracksConfig.find( (tcg: TrackConfig) => {
      return tcg.trackId === trackId
    })
    if(!toTrackConfig?.subTracks) return;
    const toTrack = this.getTrack(toTrackConfig.trackId);
    if(!toTrack?.group?.subTracksDom) return;
    const newList = this.addNewTrackToDom(trackConfig, toTrackConfig.subTracks, toTrack.group.subTracksDom)
    toTrackConfig.subTracks = newList;
  }
  /**
   * 移除某条轨道  
   */
  removeTrack(trackId: string){
    const vt = this.getTrack(trackId);
    vt?.destroy();
    this.tracks = this.tracks.filter( vt => vt.trackId !== trackId);
  }
  // ?? deprecated
  keyframeMousedownHandle(ev: MouseEvent) {
    const target = ev.target as HTMLElement;
    if (!target) return;
    const segmentDom = findParentElementByClassName(target, CLASS_NAME_SEGMENT);
    if(!segmentDom){
      return;
    }
    // 先移除所有关键帧actived样式
    const sks = Array.from(
      segmentDom.querySelectorAll(`.${CLASS_NAME_SEGMENT_KEYFRAME}`)
    ) as HTMLElement[];
    sks.forEach((sk) => sk.classList.remove(CLASS_NAME_SEGMENT_KEYFRAME_ACTIVED));
    
    if (target.classList.contains(CLASS_NAME_SEGMENT_KEYFRAME)) {
      target.classList.add("actived");
      const segmentId = segmentDom?.dataset.segmentId;
      if(!segmentId) return;
      const segment = this.getSegmentById(segmentId);
      if(!segment){
        return;
      }
      const frame = parseInt(target.dataset.frame ?? '');
      if(!frame) return;
      this.dispatchEvent(
        { eventType: TRACKS_EVENT_TYPES.KEYFRAME_CLICK },
        {
          keyframe: segment.framestart + frame,
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
      const isCollistion = collisionCheckX(placeHolder, originTrack);
      if (!isCollistion) {
        segment.style.left = `${segmentLeft}px`;
      }
    }
  }
  private getFramestartByX(x: number): number {
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
    if (!trackId.length) {
      console.warn("注意：轨道 id 为空");
      return null;
    }
    return this.tracks.find((vt) => vt.trackId === trackId) ?? null;
  }
  getVirtualSegmentAll() {
    let result: Segment[] = [];
    for (const vt of this.tracks) {
      result = [...result, ...vt.getSegments()];
    }
    return result;
  }
  getVirtualSegment(trackId: string, segmentId: string) {
    if (!trackId.length || !segmentId.length) {
      console.warn("注意：轨道或片断 id 为空");
    }
    const virtualTrack = this.tracks.find(
      (vt) => vt.trackId === trackId
    );
    if (!virtualTrack) {
      return null;
    }
    return virtualTrack.segments.get(segmentId) ?? null;
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
  hideCoordinateLine(){
    // todo? 暂时只有一根辅助线
    // 后期增加横向辅助线
    this.coordinateLineLeft.style.display = 'none';  
    this.coordinateLineLeft.style.left = '0';  
  }
   /**
   * 
   * @param segmentDom  接近碰撞到的 segment DOM
   * @param isOnLeft 接近碰撞的 segment DOM 是否在左侧，如果是右侧，则需要将辅助线移到 segment DOM 的起始位置
   * @param adsorbTo 磁吸的位置，即 left 值
   */
   private showVerticalCoordinateLine(isAdsorbing: boolean, _framestart: number, adsorbTo: number ){
    if(!isAdsorbing){
      this.hideCoordinateLine();
    }else{
      this.coordinateLineLeft.style.left = `${adsorbTo}px`;
      this.coordinateLineLeft.style.display = `block`;  
    }
    
  }
  private showCoordinateLine(dom: HTMLElement):boolean|[boolean, number, number]{
    if(!this._adsorbable || !dom){
      return false;
    }
    // 跨轨道检测 x 轴是否与其它 segment 有磁吸
    const [isAdsorbing, _framestart, adsorbTo ] = checkCoordinateLine(dom, this.queryAllSegmentsDom(), this.frameWidth);
    // 只要有一条轨道内的 segment 磁吸碰撞就显示垂直辅助线
    if(isAdsorbing && _framestart){
      this.showVerticalCoordinateLine(isAdsorbing, _framestart, adsorbTo )
    }else{
      this.hideCoordinateLine();
    }
    return [isAdsorbing, _framestart, adsorbTo ]
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
    const tracks: HTMLElement[] = this.tracks.map((vt) => vt.dom);
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
      // 如果已知 frames 则需要设置相应的宽度
      const frames = getDatasetNumberByKey(segmentDom, 'frames');
      if(frames > 0){
        segmentCopy.style.width = `${frames * this.frameWidth}px`;
      }
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
      // 移除所胡轨道碰撞前的状态
      this.tracks.forEach((vt) => {
        vt.removeStatusClass();
      });
      this.hideCoordinateLine();
      // Y 轴碰撞
      const collisionTrack = trackCollisionCheckY(
        this.tracks,
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
      if(collisionTrack ){
        this.showCoordinateLine(dragTrackContainer);
      }
      // 拖动容器形变
      if (isCopy) {
        // 如果是复制，则需要形变成标准轨道内 segment 形状
        if (collisionTrack) {
          const trackHeight = collisionTrack.dom.getBoundingClientRect().height;
          dragTrackContainer.style.left = `${e.clientX}px`;
          dragTrackContainer.style.top = `${e.clientY - trackHeight * .5}px`;
          dragTrackContainer.style.height = `${trackHeight}px`;
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
      let framestart = this.getFramestartByX(x);
      const segmentTypeStr = segmentDom.dataset.segmentType ?? "0";
      const segmentTrackId = segmentDom.dataset.trackId ?? "";
      const segmentId = segmentDom.dataset.segmentId ?? "";
      this.tracks.forEach(async (vt) => {
        vt.dom.classList.remove(CLASS_NAME_TRACK_DRAG_OVER);
        vt.dom.classList.remove(CLASS_NAME_TRACK_DRAG_OVER_ERROR);
        if (isCloseEnouphToY(vt.dom, e.clientY)) {
          // 预先检测是否是相同轨道，以及有没有发生碰撞
          const r = vt.precheck(segmentTypeStr);
          vt.hidePlaceHolder();
          if(!r){ 
            return;
          }
          if(this._adsorbable){
            const [ isAdsorbing, _framestart ] = checkCoordinateLine(dragTrackContainer, Array.from(this.scrollContainer.querySelectorAll(`.${CLASS_NAME_SEGMENT}`)) as HTMLElement[], this.frameWidth);
            if(isAdsorbing){
              framestart = _framestart
            }
          }
          
          // 如果是新建
          let segment: Segment | null;
          if(!segmentId){
            segment = await vt.createSegment(segmentTrackId, framestart, parseInt(segmentTypeStr));
            if(!segment){
              return;
            }
          }else{
            segment = vt.getSegmentById(segmentId) ?? null;
            // 判定是从其它轨道拖入的
            if(!segment){
              segment = await vt.createSegment(vt.trackId, framestart, parseInt(segmentTypeStr));
              if(!segment){
                return;
              }
              segment.origionSegmentId = segmentId;
              segment.origionTrackId = segmentTrackId;
              segment.origionParentTrack = this.getTrack(segmentTrackId)
            }
          }
          vt.pointerup({
            copy: isCopy,
            framestart,
            segment,
          });
          // 如果有原父级轨道，说明是从原父级轨道拖过来的，需要删除原父级轨道内的 segment
          if(segment && segment.origionSegmentId){
            this.deleteSegment(segment.origionTrackId, segment.origionSegmentId);
          }
        }
      });
      this.hideCoordinateLine();
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
    return segment
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
    const segment = track.getLastSegment()
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
    const virtualTrack = this.getTrack(trackId);
    if (!virtualTrack) return;
    const segment = await virtualTrack.createSegment(
      trackId,
      framestart,
      segmentType
    );
    if (!segment) return;
    if (virtualTrack instanceof TrackFlex) {
      virtualTrack.pointerup({
        copy: true,
        framestart: this.timeline.currentFrame,
        segment,
      });
    } else {
      virtualTrack.addSegment(segment);
      segment.setRange(
        segment.framestart,
        segment.frameend
      );
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
    const segments = this.getVirtualSegmentAll();
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
  split(segment: Segment, newSegmentId?: string) {
    const currentFrame = this.timeline.currentFrame;
    const framestart = segment.framestart;
    const frameend = segment.frameend;
    // 当前帧必须在进行分割的 segment 内
    if(currentFrame <= framestart || currentFrame >= frameend){
      return false;
    }
    const newSegment = createSegment({
      trackId: segment.trackId,
      segmentId: newSegmentId,
      framestart: currentFrame,
      frameend: segment.frameend,
      name: segment.name,
      segmentType: segment.segmentType,
      extra: segment.extra,
      frameWidth: this.timeline.frameWidth,
    });
    // 将新分割出的 segment 添加至轨道
    segment.parentTrack?.addSegment(newSegment);
    segment.setRange(framestart, currentFrame);
    return true;
  }
  width() {
    return this.timeline.totalFrames * this.timeline.frameWidth;
  }
  destroy() {
    removeDragTrackContainer();
    this.tracks.forEach((vt) => vt.destroy());
    for (let { ele, eventName, listener, options } of this.bindedEventArray) {
      ele.removeEventListener(eventName, listener, options);
    }
  }
}
