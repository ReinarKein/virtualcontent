/**
 * Tracking is used to detect container width changes, etc.
 */

export function isJqueryEl(el) {
  return !!el.jquery;
}

export function getDomElement(el) {
  if (!el) {
    return null;
  }

  if (typeof el === 'string') {
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

export function delay(fn, threshold) {
  var firedAt = Infinity;
  var timer;

  function delayedFn() {
    fn.apply(null, arguments);
  }

  return function () {
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(delayedFn, threshold);
  };
}

export function throttle(func, wait, options) {
  var context, args, result;
  var timeout = null;
  var previous = 0;

  if (!options) options = {};

  var later = function () {
    previous = options.leading === false ? 0 : Date.now();
    timeout = null;
    result = func.apply(context, args);

    if (!timeout) context = args = null;
  };

  return function () {
    var now = Date.now();
    if (!previous && options.leading === false) previous = now;

    var remaining = wait - (now - previous);

    context = this;
    args = arguments;

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }

      previous = now;
      result = func.apply(context, args);

      if (!timeout) context = args = null;
    } else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(later, remaining);
    }
    return result;
  };
}
