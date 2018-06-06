"use strict";

(function () {
  const HTML_TYPE           = "html";
  const TEXT_TYPE           = "text";
  const REPLACE_MODE        = "replace";
  const APPEND_MODE         = "append";

  const ONSCROLL_TIMEOUT    = 100;
  const DEFAULT_CHUNK_SIZE  = 10240;
  const DEFAULT_THRESHOLD   = 2;

  const CHUNK_PREPROCESSOR  = null;

  const CHUNK_ATTR_START  = "data-chunk-role='start'";


  /**
   * @class VirtualContent
   *
   * @method destroy
   * @method renderTo
   * @method setHtml
   * @method setText
   *
   */
  class VirtualContent {

    constructor (options = {}) {
      this._chunkLenght       = options.length || DEFAULT_CHUNK_SIZE;
      this._mode              = options.append ? APPEND_MODE : REPLACE_MODE;
      this._threshold         = options.threshold || DEFAULT_THRESHOLD;
      this._contentType       = options.type || HTML_TYPE;
      this._chunkPreProcessor = options.chunkPreProcessor || CHUNK_PREPROCESSOR;
      this._renderDelay       = options.delay || ONSCROLL_TIMEOUT;

      this._chunks          = [];
      this._el              = document.createElement("div");
      this._heights         = [];
      this._lastWidth       = null;
      this._leftpads        = [];
      this._offsets         = [];
      this._onScroll        = delay(this._onScroll.bind(this), this._renderDelay);
      this._pointer         = 0;
      this._prevOffsetToScrollableEl = 0;
      this._scrollableEl    = getDomElement(options.scrollableParent) || this._el;
      this._visibles        = [];

      this._el.setAttribute("style", "overflow:auto;position:relative;word-break:break-word;");
      this._scrollableEl.setAttribute("tabindex", 0);

      this._scrollableEl.style.outline = "0px";

      this._startScrollTracking();

      if (VirtualContent._trackInstances) {
        this._trackInstance();
      }
    }

    static create (options) {
      return new VirtualContent(options);
    }

    _addFillerTo (parent, height = 0) {
      var el = document.createElement("div");

      el.setAttribute("style", `height:${height}px;`);

      parent.appendChild(el);
    }

    _calculateChunkData (chunkEl) {
      var chunkData = {
        leftPad       : chunkEl.querySelector(`[${CHUNK_ATTR_START}]`).offsetLeft,
        offsetHeight  : chunkEl.offsetHeight,
        offsetTop     : chunkEl.offsetTop
      };

      return chunkData;
    }

    destroy () {
      var parentNode = this._el.parentNode;

      this._stopScrollTracking();

      this._el.innerHTML  = null;
      this._chunks        = null;
      this._heights       = null;
      this._visibles      = null;
      this._leftpads      = null;
      this._scrollableEl  = null;


      if (parentNode) {
        parentNode.removeChild(this._el);
      }

      if (VirtualContent._trackInstances) {
        let i = VirtualContent.instances.indexOf(this);
        VirtualContent.instances.splice(i, 1);
      }

      return this;
    }

    _getBottomFillerHeightFor (chunkIndex) {
      var heights = this._heights.slice(chunkIndex, this._chunks.length);

      if (!heights.length) {
        return 0;
      }

      return heights.reduce(function (result, value) {
        return result += value;
      }, 0);
    }

    _getChunkElByIndex (i) {
      return this._el.querySelector(`[data-chunk-index='${i}']`);
    }

    _getChunkHeight (i) {
      return this._heights[i] || 0;
    }

    _getChunkLeftPad (chunkIndex) {
      return this._leftpads[chunkIndex] || 0;
    }

    _getChunkOffsetTop (chunkIndex) {
      return this._offsets[chunkIndex] || 0;
    }

    _getChunkOffsetTopByHeights (chunkIndex) {
      var heights;

      if (chunkIndex === 0) {
        return 0;
      }

      if (chunkIndex > this._heights.length) {
        throw new Error("Bad chunk index");
      }

      heights = this._heights.slice(0, chunkIndex);

      if (!heights.length) {
        return 0;
      }

      return heights.reduce(function (result, value) {
        return result += value;
      }, 0);
    }

    _getChunkRangeForReplacement (pointer) {
      var min         = 0;
      var max         = this._chunks.length;

      var treshold    = this._threshold;
      var startOffset = pointer - treshold;
      var endOffset   = pointer + treshold;

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

    _getCurrentPointer () {
      var limit = this._offsets.length || 0;

      for (let i = 0; i<limit; i++) {
        if (this._getChunkOffsetTop(i) > this._getScrollTopForChunks()) {
          return --i;
        }
      }

      return this._offsets.length - 1;
    }

    _getLastVisible () {
      var length = this._visibles.length;

      return length ? this._visibles[--length] : -1;
    }

    _getOffsetToScrollableEl () {
      if (this._el === this._scrollableEl) {
        return 0;
      }

      return (this._el.getBoundingClientRect().top + this._scrollableEl.scrollTop) - this._scrollableEl.getBoundingClientRect().top;
    }

    _getScrollTop () {
      return this._scrollableEl.scrollTop;
    }

    _getScrollTopForChunks () {
      return this._getScrollTop() - this._getOffsetToScrollableEl();
    }

    isHtmlContent () {
      return this._contentType === HTML_TYPE;
    }

    _needUpdate (prevPointer, nextPointer) {
      var limit, visibles;

      if (this._mode === REPLACE_MODE) {
        let prev, next;

        if (prevPointer === nextPointer) {
          return false;
        }

        prev = this._getChunkRangeForReplacement(prevPointer);
        next = this._getChunkRangeForReplacement(nextPointer);

        return (prev[0] !== next[0]) || (prev[1] !== next[1]);
      }

      visibles  = this._visibles;
      limit     = Math.min(nextPointer + this._threshold, this._chunks.length);

      for ( ; nextPointer < limit; nextPointer++) {
        if (visibles.indexOf(nextPointer) === -1) {
          return true;
        }
      }

      return false;
    }

    _onScroll (e) {
      var scrollTop   = this._getScrollTop();
      var prevPointer = this._pointer;
      var nextPointer = this._pointer = this._getCurrentPointer();

      if (this._widthHasChanged()) {
        this._recalculate();
      }

      if (!this._needUpdate(prevPointer, nextPointer)) {
        return;
      }

      this._stopScrollTracking();
      this._updateContent(prevPointer, nextPointer);
      this._scrollableEl.focus();

      if (this._mode !== APPEND_MODE) {
        this._setScrollTop(scrollTop);
      }

      this._startScrollTracking();
    }

    _preprocessChunk (chunkContent) {
      if (this._chunkPreProcessor) {
        chunkContent = this._chunkPreProcessor(chunkContent);
      }

      return chunkContent;
    }

    // TODO: write _recalculate method or add some restrictions
    _recalculate () {
      this._storeWidth(this._el.offsetWidth);
    }

    renderTo (el) {
      if (!el) {
        throw TypeError("Unsupported element");
      }

      if (isJqueryEl(el)) {
        el = el[0];
      }

      el.appendChild(this._el);

      this._storeWidth(this._el.offsetWidth);

      if (this._chunks.length) {
        this._updateContent();
      }

      return this;
    }

    _scrollableOffsetHasChanged () {
      return this._prevOffsetToScrollableEl !== this._getOffsetToScrollableEl();
    }

    _scrollToTop () {
      this._scrollableEl.scrollTop = 0;
    }

    _setChunkElContent (chunkEl, content) {
      if (this.isHtmlContent()) {
        chunkEl.innerHTML = content;
      } else {
        chunkEl.style["white-space"] = "pre-wrap"
        chunkEl.textContent = content;
      }
    }

    // TODO: write correct setHtml method (it's a workaround for now)
    setHtml (html) {
      html = this._validateString(html);

      this._contentType = HTML_TYPE;
      this._chunks      = this._splitString(html, this._chunkLenght);

      this._pointer   = 0;
      this._heights   = [];
      this._leftpads  = [];
      this._offsets   = [];
      this._visibles  = [];

      this._el.innerHTML = "";

      this._scrollToTop();

      if (this._el.parentNode) {
        this._updateContent();
      }

      return this;
    }

    _setScrollTop (newValue) {
      this._scrollableEl.scrollTop = newValue;
    }

    setText (str) {
      str = this._validateString(str);

      this._contentType = TEXT_TYPE;
      this._chunks      = this._splitString(str, this._chunkLenght);

      this._pointer   = 0;
      this._heights   = [];
      this._leftpads  = [];
      this._offsets   = [];
      this._visibles  = [];

      this._el.innerHTML = "";

      this._scrollToTop();

      if (this._el.parentNode) {
        this._updateContent();
      }

      return this;
    }

    _splitString (str, length) {
      return (new Array(Math.ceil(str.length/length))).fill(null).map(function (val, i) {
        var offset = i * length;
        return str.substring(offset, offset + length);
      });
    }

    _startScrollTracking () {
      this._scrollableEl.style.overflow = "auto";
      this._scrollableEl.addEventListener("scroll", this._onScroll);
    }

    _stopScrollTracking () {
      this._scrollableEl.removeEventListener("scroll", this._onScroll);
      this._scrollableEl.style.overflow = "hidden";
    }

    _storeChunkData (chunkIndex, extras = {}) {
      var {offsetTop, offsetHeight, leftPad} = extras;

      if (typeof offsetTop === "number" && !this._offsets[chunkIndex]) {
        this._offsets[chunkIndex] = offsetTop;
      }

      if (typeof offsetHeight === "number" && !this._heights[chunkIndex]) {
        this._heights[chunkIndex] = offsetHeight;
      }

      if (typeof leftPad === "number" && !this._leftpads[chunkIndex]) {
        this._leftpads[chunkIndex] = leftPad;
      }
    }

    _storeWidth (num) {
      this._lastWidth = num;
    }

    _trackInstance () {
      if (VirtualContent.instances.indexOf(this) !== -1) {
        throw new Error("Already tracked");
      }

      VirtualContent.instances.push(this);
    }

    _updateChunksDataWith (options = {}) {
      var offsetDelta = options.offsetDelta || 0;

      for (let i=0; i<this._offsets.length; i++) {
        this._offsets[i] += offsetDelta;
      }
    }

    _updateContent () {
      // if (this._scrollableOffsetHasChanged()) {
      //   let offsetToScrollableEl = this._getOffsetToScrollableEl();
      //
      //   this._updateChunksDataWith({
      //     offsetDelta: offsetToScrollableEl - this._prevOffsetToScrollableEl
      //   })
      //
      //   this._prevOffsetToScrollableEl = offsetToScrollableEl;
      // }

      if (this._mode === APPEND_MODE) {
        this._updateContentWithAppend.apply(this, arguments);
      } else {
        this._updateContentWithReplace.apply(this, arguments);
      }
    }

    _updateContentWithAppend (prevPointer = 0, pointer = 0) {
      var threshold       = this._threshold;
      var first           = this._getLastVisible() + 1 || 0;
      var last            = Math.min(pointer + threshold, this._chunks.length);
      var offsets         = this._offsets;

      for (let i = first; i < last; i++) {
        let chunkEl = document.createElement("span");

        chunkEl.dataset.chunkIndex  = i;

        this._setChunkElContent(chunkEl, this._preprocessChunk(this._chunks[i]));

        this._el.appendChild(chunkEl);

        offsets[i] = chunkEl.offsetTop;

        this._visibles.push(i);
      }
    }

    _updateContentWithReplace (prevPointer = 0, pointer = 0) {
      var threshold                 = this._threshold;
      var [startOffset, endOffset]  = this._getChunkRangeForReplacement(pointer);

      var preFillerHeight   = this._getChunkOffsetTop(startOffset);
      var postFillerHeight  = this._getBottomFillerHeightFor(endOffset);

      this._el.innerHTML  = "";
      this._visibles      = [];

      this._addFillerTo(this._el, preFillerHeight);

      this._chunks.slice(startOffset, endOffset).map((content, i) => {
        var chunkEl     = document.createElement("span");
        var chunkIndex  = chunkEl.dataset.chunkIndex = startOffset + i;
        var leftPad     = (!i && this._getChunkLeftPad(chunkIndex)) || 0;
        var marker      = document.createElement("span");

        marker.innerHTML = `
          <span ${CHUNK_ATTR_START} style="display:inline-block;padding-left:${leftPad}px;"></span>
        `;

        marker  = marker.children[0];
        content = this._preprocessChunk(content);

        chunkEl.setAttribute("style", "position:relative; display:inline-block;");

        this._setChunkElContent(chunkEl, content)

        chunkEl.insertBefore(marker, chunkEl.children[0]);

        this._el.appendChild(chunkEl);

        this._storeChunkData(chunkIndex, this._calculateChunkData(chunkEl));

        this._visibles.push(chunkIndex);
      });

      this._addFillerTo(this._el, postFillerHeight);
    }

    _validateString (str) {
      if (typeof str === "string") {
        return str;
      }

      if (typeof str === "number" && !isNaN(str)) {
        return `${str}`;
      }

      if (!str) {
        return "";
      }

      throw new TypeError("Not a string");
    }

    _widthHasChanged () {
      return this._el.offsetWidth !== this._lastWidth;
    }

  }

  /**
   * Tracking is used to detect container width changes, etc.
   */

  VirtualContent._trackInstances  = false;
  VirtualContent.instances        = [];
  VirtualContent.startTracking    = function () {
    if (VirtualContent._instanceTrackerTimer) {
      return false;
    }

    VirtualContent._instanceTrackerTimer = setInterval(function () {
      VirtualContent.instances.forEach(function (vc) {
        if (!vc._widthHasChanged()) {
          return;
        }
        vc._recalculate();
      });
    }, 500);

    return VirtualContent._trackInstances = true;
  };

  function isJqueryEl (el) {
    return !!el.jquery;
  }

  function getDomElement (el) {
    if (!el) {
      return null;
    }

    if (typeof el === "string") {
      return document.querySelector(el);
    }

    if (el.constructor === HTMLElement) {
      return el;
    }

    if (isJqueryEl(el)) {
      return el[0];
    }

    return null;
  }

  function delay (fn, treshold) {
    var firedAt = Infinity;
    var timer;

    function delayedFn () {
      fn.apply(null, arguments);
    }

    return function () {
      if (timer !== undefined) {
        clearTimeout(timer);
      }

      timer = setTimeout(delayedFn, treshold);
    };
  }

  function throttle (func, wait, options) {
    var context, args, result;
    var timeout   = null;
    var previous  = 0;

    if (!options) options = {};

    var later = function () {
      previous  = options.leading === false ? 0 : Date.now();
      timeout   = null;
      result    = func.apply(context, args);

      if (!timeout) context = args = null;
    };

    return function () {
      var now = Date.now()
      ;
      if (!previous && options.leading === false) previous = now;

      var remaining = wait - (now - previous);

      context = this;
      args    = arguments;

      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        previous  = now;
        result    = func.apply(context, args);

        if (!timeout) context = args = null;

      } else if (!timeout && options.trailing !== false) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  }


  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = VirtualContent;
  } else if (typeof define === "function" && define.amd) {
    define(VirtualContent);
  }
  if (typeof window !== "undefined") {
    window.VC = VirtualContent;
  }
})();
