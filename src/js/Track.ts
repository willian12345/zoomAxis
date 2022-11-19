/**
 * Track 基础 dom 结构
 * <div class="track">
 *  <div class="track-placeholder"></div>
 *  <div class="segment"></div>
 * </div>
 */
interface TrackArgs {
  trackClass?: string
  trackPlaceholderClass?: string
}
export class Track {
  dom = {} as HTMLElement
  id = ''
  trackClass = ''
  trackPlaceholderClass = ''
  constructor({ 
    trackClass = 'track', 
    trackPlaceholderClass = 'track-placeholder' 
  }: TrackArgs) {
    this.trackClass = trackClass
    this.trackPlaceholderClass = trackPlaceholderClass
    this.dom = this.createDom();
  }
  private createDom(): HTMLElement {
    const div = document.createElement('div');
    div.innerHTML = `
      div class="${this.trackClass}">
        <div class="${this.trackPlaceholderClass}"></div>
      </div>
      `;
    return div.firstElementChild as HTMLElement;
  }
}