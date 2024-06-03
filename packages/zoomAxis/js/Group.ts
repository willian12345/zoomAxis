import { Track } from "./Track";

export class TrackGroup{
  dom!: HTMLElement;
  isCollapsed = false;
  mainTrack!: Track;
  subTracks: Track[] = [];
  subTracksDom!:HTMLElement;
  constructor(track: Track){
    this.mainTrack = track;
    this.dom = this.createDom();
    this.subTracksDom = this.dom.querySelector('.track-sub-track') as HTMLElement;
    this.dom.insertBefore(track.dom,  this.subTracksDom);
  }
  collapse(collapse: boolean){
    this.isCollapsed = collapse;
    this.subTracksDom.style.display = collapse ? "none" : "block";
  }
  createDom(){
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="track-group">
        <div class="track-sub-track"></div>
        <div class="track-gutter"></div>
      </div>
    `;
    return div.firstElementChild as HTMLElement;
  }
  addChild(track: Track){
    this.subTracksDom.append(track.dom);
    this.subTracks.push(track);
    this.mainTrack.addTrack(track);
  }
}