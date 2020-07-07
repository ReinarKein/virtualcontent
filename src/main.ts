import { getDomElement, delay, isJqueryEl } from './helpers';

const HTML_TYPE = 'html';
const TEXT_TYPE = 'text';
const REPLACE_MODE = 'replace';
const APPEND_MODE = 'append';
const ONSCROLL_TIMEOUT = 100;
const DEFAULT_CHUNK_SIZE = 10240;
const DEFAULT_THRESHOLD = 2;
const CHUNK_PREPROCESSOR = null;
const CHUNK_ATTR_START = "data-chunk-role='start'";

export class VirtualContent {
  private chunkLenght: number;
  private mode: typeof APPEND_MODE | typeof REPLACE_MODE;
  private threshold: number;
  private contentType: typeof HTML_TYPE | typeof TEXT_TYPE;
  private chunkPreProcessor: any;
  private renderDelay: any;
  private chunks: Element[];
  private el: HTMLDivElement;
  private heights: number[];
  private lastWidth: number;
  private leftpads: number[];
  private offsets: number[];
  private pointer: number;
  private prevOffsetToScrollableEl: number;
  private scrollableEl: HTMLElement;
  private visibles: number[];

  public static trackInstances: boolean = false;
  public static instances: VirtualContent[] = [];
  public static startTracking(): boolean {
    if (VirtualContent._instanceTrackerTimer) {
      return false;
    }

    VirtualContent._instanceTrackerTimer = setInterval(function () {
      VirtualContent.instances.forEach(function (vc) {
        if (!vc.widthHasChanged()) {
          return;
        }
        vc.recalculate();
      });
    }, 500);

    return (VirtualContent.trackInstances = true);
  }
  public static _instanceTrackerTimer: any;

  constructor(options: any = {}) {
    this.chunkLenght = options.length || DEFAULT_CHUNK_SIZE;
    this.mode = options.append ? APPEND_MODE : REPLACE_MODE;
    this.threshold = options.threshold || DEFAULT_THRESHOLD;
    this.contentType = options.type || HTML_TYPE;
    this.chunkPreProcessor = options.chunkPreProcessor || CHUNK_PREPROCESSOR;
    this.renderDelay = options.delay || ONSCROLL_TIMEOUT;

    this.chunks = [];
    this.el = document.createElement('div');
    this.heights = [];
    this.lastWidth = null;
    this.leftpads = [];
    this.offsets = [];
    this.onScroll = delay(this.onScroll.bind(this), this.renderDelay);
    this.pointer = 0;
    this.prevOffsetToScrollableEl = 0;
    this.scrollableEl = getDomElement(options.scrollableParent) || this.el;
    this.visibles = [];

    this.el.setAttribute(
      'style',
      'height:100%;overflow:auto;position:relative;word-break:break-word;',
    );
    this.scrollableEl.setAttribute('tabindex', '0');

    this.scrollableEl.style.outline = '0px';

    this.startScrollTracking();

    if (VirtualContent.trackInstances) {
      this.trackInstance();
    }
  }

  static create(options?) {
    return new VirtualContent(options);
  }

  private addFillerTo(parent, height = 0) {
    var el = document.createElement('div');

    el.setAttribute('style', `height:${height}px;`);

    parent.appendChild(el);
  }

  private calculateChunkData(chunkEl) {
    var chunkData = {
      leftPad: chunkEl.querySelector(`[${CHUNK_ATTR_START}]`).offsetLeft,
      offsetHeight: chunkEl.offsetHeight,
      offsetTop: chunkEl.offsetTop,
    };

    return chunkData;
  }

  public destroy() {
    var parentNode = this.el.parentNode;

    this.stopScrollTracking();

    this.el.innerHTML = null;
    this.chunks = null;
    this.heights = null;
    this.visibles = null;
    this.leftpads = null;
    this.scrollableEl = null;

    if (parentNode) {
      parentNode.removeChild(this.el);
    }

    if (VirtualContent.trackInstances) {
      let i = VirtualContent.instances.indexOf(this);
      VirtualContent.instances.splice(i, 1);
    }

    return this;
  }

  private getBottomFillerHeightFor(chunkIndex) {
    var heights = this.heights.slice(chunkIndex, this.chunks.length);

    if (!heights.length) {
      return 0;
    }

    return heights.reduce(function (result, value) {
      return (result += value);
    }, 0);
  }

  private getChunkElByIndex(i) {
    return this.el.querySelector(`[data-chunk-index='${i}']`);
  }

  private getChunkHeight(i) {
    return this.heights[i] || 0;
  }

  private getChunkLeftPad(chunkIndex) {
    return this.leftpads[chunkIndex] || 0;
  }

  private getChunkOffsetTop(chunkIndex) {
    return this.offsets[chunkIndex] || 0;
  }

  private getChunkOffsetTopByHeights(chunkIndex) {
    var heights;

    if (chunkIndex === 0) {
      return 0;
    }

    if (chunkIndex > this.heights.length) {
      throw new Error('Bad chunk index');
    }

    heights = this.heights.slice(0, chunkIndex);

    if (!heights.length) {
      return 0;
    }

    return heights.reduce(function (result, value) {
      return (result += value);
    }, 0);
  }

  private getChunkRangeForReplacement(pointer) {
    var min = 0;
    var max = this.chunks.length;

    var treshold = this.threshold;
    var startOffset = pointer - treshold;
    var endOffset = pointer + treshold;

    if (startOffset < min && endOffset > max) {
      return [min, max];
    }

    if (startOffset < min) {
      endOffset += Math.abs(min - startOffset);
      startOffset = min;
    }

    if (endOffset > max) {
      startOffset = startOffset - endOffset + max;
      endOffset = max;
    }

    return [Math.max(startOffset, min), Math.min(endOffset, max)];
  }

  private getCurrentPointer() {
    var limit = this.offsets.length || 0;

    for (let i = 0; i < limit; i++) {
      if (this.getChunkOffsetTop(i) > this.getScrollTopForChunks()) {
        return --i;
      }
    }

    return this.offsets.length - 1;
  }

  private getLastVisible() {
    var length = this.visibles.length;

    return length ? this.visibles[--length] : -1;
  }

  private getOffsetToScrollableEl() {
    if (this.el === this.scrollableEl) {
      return 0;
    }

    return (
      this.el.getBoundingClientRect().top +
      this.scrollableEl.scrollTop -
      this.scrollableEl.getBoundingClientRect().top
    );
  }

  private getScrollTop() {
    return this.scrollableEl.scrollTop;
  }

  private getScrollTopForChunks() {
    return this.getScrollTop() - this.getOffsetToScrollableEl();
  }

  public isHtmlContent() {
    return this.contentType === HTML_TYPE;
  }

  private needUpdate(prevPointer, nextPointer) {
    var limit, visibles;

    if (this.mode === REPLACE_MODE) {
      let prev, next;

      if (prevPointer === nextPointer) {
        return false;
      }

      prev = this.getChunkRangeForReplacement(prevPointer);
      next = this.getChunkRangeForReplacement(nextPointer);

      return prev[0] !== next[0] || prev[1] !== next[1];
    }

    visibles = this.visibles;
    limit = Math.min(nextPointer + this.threshold, this.chunks.length);

    for (; nextPointer < limit; nextPointer++) {
      if (visibles.indexOf(nextPointer) === -1) {
        return true;
      }
    }

    return false;
  }

  private onScroll(e) {
    var scrollTop = this.getScrollTop();
    var prevPointer = this.pointer;
    var nextPointer = (this.pointer = this.getCurrentPointer());

    if (this.widthHasChanged()) {
      this.recalculate();
    }

    if (!this.needUpdate(prevPointer, nextPointer)) {
      return;
    }

    this.stopScrollTracking();
    this.updateContent();
    this.scrollableEl.focus();

    if (this.mode !== APPEND_MODE) {
      this.setScrollTop(scrollTop);
    }

    this.startScrollTracking();
  }

  private preprocessChunk(chunkContent) {
    if (this.chunkPreProcessor) {
      chunkContent = this.chunkPreProcessor(chunkContent);
    }

    return chunkContent;
  }

  // TODO: write _recalculate method or add some restrictions
  private recalculate() {
    this.storeWidth(this.el.offsetWidth);
  }

  public renderTo(el) {
    if (!el) {
      throw TypeError('Unsupported element');
    }

    if (isJqueryEl(el)) {
      el = el[0];
    }

    el.appendChild(this.el);

    this.storeWidth(this.el.offsetWidth);

    if (this.chunks.length) {
      this.updateContent();
    }

    return this;
  }

  private scrollableOffsetHasChanged() {
    return this.prevOffsetToScrollableEl !== this.getOffsetToScrollableEl();
  }

  private scrollToTop() {
    this.scrollableEl.scrollTop = 0;
  }

  private setChunkElContent(chunkEl, content) {
    if (this.isHtmlContent()) {
      chunkEl.innerHTML = content;
    } else {
      chunkEl.style['white-space'] = 'pre-wrap';
      chunkEl.textContent = content;
    }
  }

  // TODO: write correct setHtml method (it's a workaround for now)
  public setHtml(html) {
    html = this.validateString(html);

    this.contentType = HTML_TYPE;
    this.chunks = this.splitString(html, this.chunkLenght);

    this.pointer = 0;
    this.heights = [];
    this.leftpads = [];
    this.offsets = [];
    this.visibles = [];

    this.el.innerHTML = '';

    this.scrollToTop();

    if (this.el.parentNode) {
      this.updateContent();
    }

    return this;
  }

  private setScrollTop(newValue) {
    this.scrollableEl.scrollTop = newValue;
  }

  public setText(str) {
    str = this.validateString(str);

    this.contentType = TEXT_TYPE;
    this.chunks = this.splitString(str, this.chunkLenght);

    this.pointer = 0;
    this.heights = [];
    this.leftpads = [];
    this.offsets = [];
    this.visibles = [];

    this.el.innerHTML = '';

    this.scrollToTop();

    if (this.el.parentNode) {
      this.updateContent();
    }

    return this;
  }

  private splitString(str, length) {
    return new Array(Math.ceil(str.length / length))
      .fill(null)
      .map(function (val, i) {
        var offset = i * length;
        return str.substring(offset, offset + length);
      });
  }

  private splitHtml(str, length) {}

  private startScrollTracking() {
    this.scrollableEl.style.overflow = 'auto';
    this.scrollableEl.addEventListener('scroll', this.onScroll);
  }

  private stopScrollTracking() {
    this.scrollableEl.removeEventListener('scroll', this.onScroll);
    this.scrollableEl.style.overflow = 'hidden';
  }

  private storeChunkData(chunkIndex, extras: any = {}) {
    var { offsetTop, offsetHeight, leftPad } = extras;

    if (typeof offsetTop === 'number' && !this.offsets[chunkIndex]) {
      this.offsets[chunkIndex] = offsetTop;
    }

    if (typeof offsetHeight === 'number' && !this.heights[chunkIndex]) {
      this.heights[chunkIndex] = offsetHeight;
    }

    if (typeof leftPad === 'number' && !this.leftpads[chunkIndex]) {
      this.leftpads[chunkIndex] = leftPad;
    }
  }

  private storeWidth(num) {
    this.lastWidth = num;
  }

  private trackInstance() {
    if (VirtualContent.instances.indexOf(this) !== -1) {
      throw new Error('Already tracked');
    }

    VirtualContent.instances.push(this);
  }

  private updateChunksDataWith(options: any = {}) {
    var offsetDelta = options.offsetDelta || 0;

    for (let i = 0; i < this.offsets.length; i++) {
      this.offsets[i] += offsetDelta;
    }
  }

  private updateContent() {
    // if (this.scrollableOffsetHasChanged()) {
    //   let offsetToScrollableEl = this.getOffsetToScrollableEl();
    //
    //   this.updateChunksDataWith({
    //     offsetDelta: offsetToScrollableEl - this.prevOffsetToScrollableEl
    //   })
    //
    //   this.prevOffsetToScrollableEl = offsetToScrollableEl;
    // }

    if (this.mode === APPEND_MODE) {
      this.updateContentWithAppend.apply(this, arguments);
    } else {
      this.updateContentWithReplace.apply(this, arguments);
    }
  }

  private updateContentWithAppend(prevPointer = 0, pointer = 0) {
    var threshold = this.threshold;
    var first = this.getLastVisible() + 1 || 0;
    var last = Math.min(pointer + threshold, this.chunks.length);
    var offsets = this.offsets;

    for (let i = first; i < last; i++) {
      let chunkEl = document.createElement('span');

      chunkEl.dataset.chunkIndex = `${i}`;

      this.setChunkElContent(chunkEl, this.preprocessChunk(this.chunks[i]));

      this.el.appendChild(chunkEl);

      offsets[i] = chunkEl.offsetTop;

      this.visibles.push(i);
    }
  }

  private updateContentWithReplace(prevPointer = 0, pointer = 0) {
    var threshold = this.threshold;
    var [startOffset, endOffset] = this.getChunkRangeForReplacement(pointer);

    var preFillerHeight = this.getChunkOffsetTop(startOffset);
    var postFillerHeight = this.getBottomFillerHeightFor(endOffset);

    this.el.innerHTML = '';
    this.visibles = [];

    this.addFillerTo(this.el, preFillerHeight);

    this.chunks.slice(startOffset, endOffset).map((content, i) => {
      var chunkEl = document.createElement('span');
      var chunkIndex = (chunkEl.dataset.chunkIndex = `${startOffset + i}`);
      var leftPad = (!i && this.getChunkLeftPad(chunkIndex)) || 0;
      var marker: HTMLSpanElement = document.createElement('span');

      marker.innerHTML = `
          <span ${CHUNK_ATTR_START} style="display:inline-block;padding-left:${leftPad}px;"></span>
        `;

      marker = marker.children[0] as HTMLSpanElement;
      content = this.preprocessChunk(content);

      chunkEl.setAttribute('style', 'position:relative; display:inline-block;');

      this.setChunkElContent(chunkEl, content);

      chunkEl.insertBefore(marker, chunkEl.children[0]);

      this.el.appendChild(chunkEl);

      this.storeChunkData(chunkIndex, this.calculateChunkData(chunkEl));

      this.visibles.push(parseInt(chunkIndex, 10));
    });

    this.addFillerTo(this.el, postFillerHeight);
  }

  private validateString(str) {
    if (typeof str === 'string') {
      return str;
    }

    if (typeof str === 'number' && !isNaN(str)) {
      return `${str}`;
    }

    if (!str) {
      return '';
    }

    throw new TypeError('Not a string');
  }

  private widthHasChanged() {
    return this.el.offsetWidth !== this.lastWidth;
  }
}
