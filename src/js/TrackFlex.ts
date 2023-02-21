/**
 * TrackFlex 伸缩轨道
 */

import { Segment } from './Segment';
import { TimelineAxis } from './TimelineAxis';
import { Track } from './Track';
import { TRACKS_EVENT_TYPES, TrackArgs } from './TrackType'

interface TrackFlexArgs {
  timeline: TimelineAxis
}
const DEFAULT_SEGMENT_FRAMES = 150
export class TrackFlex extends Track {
  timeline: TimelineAxis | null  = null
  isFlex = true
  constructor(args: TrackArgs & TrackFlexArgs){
    super(args);
    this.timeline = args.timeline;
  }
  getCollisionByFrame(frame: number){
    return this.getSegments().find((segment: Segment) => {
      const segmentFramestart = segment.framestart;
      const segmentFrameend = segment.frameend;
      // 碰撞检测（通过计算开始帧与结束帧）且不是自身
      if (frame >= segmentFramestart && frame < segmentFrameend) {
        return true;
      }
      return false;
    }) ?? null;
  }
  sliceSegment(
    track: Track,
    framestart: number,
  ):[Segment|null, number]{
    let collisionSegmentFrameend = -1;
    // 过滤出重叠的 segment (在可伸展轨道)
    let segments = track.getSegments();
    // 如果只有刚拖入的 segment 则不需要额外处理
    if (segments.length === 0) {
      return [null, collisionSegmentFrameend];
    }
    const collisionSegment = this.getCollisionByFrame(framestart);
    if(collisionSegment){
      let sFramestart = collisionSegment.framestart;
      let sFrameend = collisionSegment.frameend;
      collisionSegmentFrameend = sFrameend;
      if (sFrameend > framestart && sFramestart < framestart) {
        sFrameend = framestart;
        collisionSegment.setRange(sFramestart, framestart);
      } else if (sFramestart >= framestart) {
        // 如果是完全覆盖则需要删除覆盖下的segment
        this.removeSegment(collisionSegment);
      }
    }
    return [collisionSegment, collisionSegmentFrameend];
  }
  drop({
    copy,
    framestart,
    segment,
    totalFrames,
  }: {
    copy: boolean;
    framestart: number;
    segment: Segment;
    totalFrames: number;
  }) {
    // 如果是轨道内的拖动，则不需要裁剪功能
    if(!copy){
      return;
    }
    // 裁剪轨道内的相关 segments 功能
    const segments = this.getSegments() ?? [];
    let frameend = totalFrames;
    // 如果轨道内只有一个 segment 则铺满整个轨道
    if (segments.length === 0) {
      framestart = 0;
    } else if (framestart > totalFrames) {
      // 如果是拖到了伸缩轨道最后，则往后加长
      framestart = totalFrames;
      frameend = framestart + DEFAULT_SEGMENT_FRAMES;
      this.timeline?.setTotalFrames(frameend);
    }
    segment.setRange(framestart, frameend);

    const [effectSegment, effectSegmentOriginFrameend] = this.sliceSegment(
      this,
      framestart,
    );
    this.addSegment(segment);
    if(effectSegment){
      frameend = effectSegmentOriginFrameend;
      segment.setRange(framestart, frameend);
      this.dispatchEvent({ eventType: TRACKS_EVENT_TYPES.DROP_EFFECT }, {
        segment: effectSegment,
      })
    }
    return [framestart, frameend];
  }
}