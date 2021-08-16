export const make = (tagName, data) => {
  let el;
  if (tagName === "svg" || tagName === "use") {
    el = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  } else {
    el = document.createElement(tagName);
  }
  if (data) {
    if (
      Array.isArray(data) ||
      data instanceof Node ||
      "object" !== typeof data
    ) {
      return makeAppend(el, data), el;
    }
    if (data.append) {
      makeAppend(el, data.append);
    }
    if (data.attr) {
      for (let [name, value] of Object.entries(data.attr)) {
        setAttribute(el, name, value);
      }
    }
    if (data.style) {
      Object.assign(el.style, data.style);
    }
    if (data.repeat) {
      while (data.repeat[0]--) {
        el.append(make(data.repeat[1], data.repeat[2]));
      }
    }
    if (data.parent) {
      data.parent.append(el);
    }
  }
  return el;
};

export const makeAppend = (el, data) => {
  if (Array.isArray(data)) {
    for (let row of data) {
      el.append(Array.isArray(row) ? make(...row) : row);
    }
  } else {
    el.append(data);
  }
};

export const setAttribute = (el, name, value) => {
  if (el === "svg" || el == "use") {
    return el.setAttributeNS(name, value);
  }
  if (
    Array.isArray(value) ||
    "object" === typeof value ||
    "function" === typeof value
  ) {
    el[name] = value;
  } else {
    el.setAttribute(name === "className" ? "class" : name, value);
  }
};

export const removeAttribute = (el, name) => {
  if ("string" === typeof name) {
    el.removeAttribute(name);
  }
};

export const purge = (el, amt) => {
  let dir = amt < 0 ? "firstChild" : "lastChild";
  amt = Math.abs(amt);
  while (amt--) {
    el.removeChild(el[dir]);
  }
};

export const getClosestSibling = (elem, selector, dir = "next") => {
  var direction;
  if (dir === "prev") {
    direction = "previousElementSibling";
  } else {
    direction = "nextElementSibling";
  }
  let sibling = elem[direction];
  while (sibling) {
    if (sibling.matches(selector)) {
      return sibling;
    }
    sibling = sibling[direction];
  }
};
