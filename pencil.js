/**
 * @param {HTMLCanvasElement} canvas
 * @param {object} [options]
 * @param {number} [options.pixelSize] defaults to 1px
 * @class
 */
var Pencil = function(canvasElem, options) {
  options = options || {};
  
  this._currentPixel = undefined;
  this._mousedown = false;
  this._pixelSize = options.pixelSize || 1;
  this._color = options.color || 'black';
  this._canvasElem = canvasElem;
  
  this._pixels = {};
  
  var that = this;
  canvasElem.addEventListener('mousedown', function(e) {
    that._mousedownFn(e);
  });
  window.addEventListener('mouseup', function(e) {
    that._mouseupFn(e);
  });
  window.addEventListener('mousemove', function(e) {
    that._mousemoveFn(e);
  });
};

/**
 * Runs Bresenham's line algorithm on two coordinates to determine pixels that
 * make up a line between them
 * @param {object} c0
 * @param {object} c1
 * @returns {object[]} an array of pixel coordinates
 */
Pencil.bres = function(c0, c1) {
  var pixels = [];
  
  var lt = c0.x < c1.x;
  var x0 = lt ? c0.x : c1.x;
  var y0 = lt ? c0.y : c1.y;
  var x1 = lt ? c1.x : c0.x;
  var y1 = lt ? c1.y : c0.y;
  
  var ySign = y0 < y1 ? 1 : -1;
  if(x0 === x1) {
    // draw a vertical line
    for(var y = y0; y !== (y1 + ySign); y += ySign) {
      pixels.push({x: x0, y: y});
    }
    return pixels;
  }
  
  var err = 0;
  var deltaErr = Math.abs((y1 - y0) / (x1 - x0));
  var y = y0;
  var xSign = x0 < x1 ? 1 : -1;
  for(var x = x0; x !== (x1 + xSign); x += xSign) {
    pixels.push({x: x, y: y});
    err += deltaErr;
    var prevX = x;
    var prevY = y;
    while(Math.abs(err) > 0.5 && y !== y1) {
      if(prevX !== x || prevY !== y) {
        pixels.push({x: x, y: y});
        prevX = x;
        prevY = y;
      }
      y += ySign;
      err -= 1;
    }
  }
  return pixels;
};

/**
 * @param {string} color
 */
Pencil.prototype.setColor = function(color) {
  this._color = color;
};

/**
 * @param {number} pixelSize
 */
Pencil.prototype.setPixelSize = function(pixelSize) {
  this._pixelSize = pixelSize;
  this._redraw();
};

Pencil.prototype._clearCanvas = function() {
  var canvas = this._canvasElem;
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
};

/**
 * Erases all the pixels on the canvas
 */
Pencil.prototype.clear = function() {
  this._clearCanvas();
  this._pixels = {};
};

Pencil._copyPixels = function(pixels) {
  var copy = {};
  for(var x in pixels) {
    x = parseInt('' + x);
    copy[x] = {};
    for(var y in pixels[x]) {
      y = parseInt('' + y);
      copy[x][y] = pixels[x][y];
    }
  }
  return copy;
};

/**
 * @param {object} pixels A hash of pixel colors formatted as
 * pixels[x][y] = color
 */
Pencil.prototype.loadPixels = function(pixels) {
  this._pixels = Pencil._copyPixels(pixels);
  this._redraw();
};

/**
 * @returns {object} an object representing the canvas's current
 * state. Individual pixel colors can be read via [x][y] accessors
 */
Pencil.prototype.getPixels = function() {
  return Pencil._copyPixels(this._pixels);
};

Pencil.prototype._redraw = function() {
  this._clearCanvas();
  for(var x in this._pixels) {
    for(var y in this._pixels[x]) {
      this._renderPixel({x: x, y: y});
    }
  }
};

/**
 * @param {MouseEvent} e
 * @returns {object}
 */
Pencil.prototype._getCoordFromEvent = function(e) {
  var rect = this._canvasElem.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
};

/**
 * @param {MouseEvent} e
 * @returns {object}
 */
Pencil.prototype._getPixelFromEvent = function(e) {
  var coord = this._getCoordFromEvent(e);
  return {
    x: Math.floor(coord.x / this._pixelSize),
    y: Math.floor(coord.y / this._pixelSize)
  };
};

/**
 * @param {object} pxCoord
 */
Pencil.prototype._renderPixel = function(pxCoord) {
  var color = this._pixels[pxCoord.x][pxCoord.y];
  var context = this._canvasElem.getContext('2d');
  context.fillStyle = color;
  context.fillRect(
    this._pixelSize * pxCoord.x,
    this._pixelSize * pxCoord.y,
    this._pixelSize, this._pixelSize);
};

/**
 * Writes and renders a given pixel based on the current color
 * @param {object} pxCoord
 */
Pencil.prototype._drawPixel = function(pxCoord) {
  // if the pixel we're asked to draw is out of range,
  // just ignore it
  if(pxCoord.x * this._pixelSize >= this._canvasElem.width ||
     pxCoord.y * this._pixelSize >= this._canvasElem.height) {
    return;
  }
  if(!this._pixels[pxCoord.x]) {
    this._pixels[pxCoord.x] = {};
  }
  this._pixels[pxCoord.x][pxCoord.y] = this._color;
  this._renderPixel(pxCoord);
};

Pencil.prototype._mousedownFn = function(e) {
  this._mousedown = true;
  this._currentPixel = this._getPixelFromEvent(e);
  this._drawPixel(this._currentPixel);
};

Pencil.prototype._mousemoveFn = function(e) {
  if(this._mousedown !== true) { return; }
  var pixel = this._getPixelFromEvent(e);
  var prevPixel = this._currentPixel;
  
  var path = Pencil.bres(pixel, prevPixel);
  for(var i = 0; i < path.length; i++) {
    this._drawPixel(path[i]);
  }
  
  this._currentPixel = pixel;
};

Pencil.prototype._mouseupFn = function(e) {
  this._mousedown = false;
};