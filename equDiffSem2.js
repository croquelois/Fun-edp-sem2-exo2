var fs  = require('fs');
var sys = require('sys');
var Png = require('png').Png;
var Buffer = require('buffer').Buffer;
var max = Math.max;
var min = Math.min;
var ln = Math.log;
var sqrt = Math.sqrt;
var abs = Math.abs;
var cos = Math.cos;
var sin = Math.sin;

var SIZE = 600;
var name = "mapMin";
var rgb = new Buffer(SIZE*SIZE*3);

function drawLine (x1,y1,x2,y2,set) {
  var dx = Math.abs(x2 - x1);
  var dy = Math.abs(y2 - y1);
  var sx = (x1 < x2) ? 1 : -1;
  var sy = (y1 < y2) ? 1 : -1;
  var err = dx - dy;
  set(x1, y1);
  while (!((x1 == x2) && (y1 == y2))) {
    var e2 = err << 1;
    if(e2 > -dy){
      err -= dy;
      x1 += sx;
    }
    if(e2 < dx){
      err += dx;
      y1 += sy;
    }
    set(x1, y1);
  }
}

function drawArrow(x,y,a,r,set){
  var sx = x;
  var sy = y;
  var ex = sx + r*Math.cos(a);
  var ey = sy + r*Math.sin(a);
  var ra = a + Math.PI/8;
  var rx = ex - r/4*Math.cos(ra);
  var ry = ey - r/4*Math.sin(ra);
  var la = a - Math.PI/8;
  var lx = ex - r/4*Math.cos(la);
  var ly = ey - r/4*Math.sin(la);
  sx = Math.round(sx);
  sy = Math.round(sy);
  ex = Math.round(ex);
  ey = Math.round(ey);
  rx = Math.round(rx);
  ry = Math.round(ry);
  lx = Math.round(lx);
  ly = Math.round(ly);
  drawLine(sx,sy,ex,ey,set);
  drawLine(ex,ey,rx,ry,set);
  drawLine(ex,ey,lx,ly,set);
}

function drawRect(ox0,ox1,oy0,oy1,set){
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++)
    for (var oy=oy0; oy<=oy1; oy++)
      set(ox,oy);
}


function callFctOnRect(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,f,set){
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++) {
    for (var oy=oy0; oy<=oy1; oy++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      set(ox,oy,v[0],v[1]);
    }
  }
}

function drawZeroCrossing(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,f,set){
  var oldv;
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++) {
    for (var oy=oy0; oy<=oy1; oy++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if(oy > oy0 && oldv*v <= 0) set(ox,oy);
      oldv = v;
    }
  }
  for (var oy=oy0; oy<=oy1; oy++) {
    for (var ox=ox0; ox<=ox1; ox++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if(oy > oy0 && oldv*v <= 0) set(ox,oy);
      oldv = v;
    }
  }
}

function drawContour(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,lvl,f,set){
  var oldv;
  if(ox0 > ox1) throw Error("ox0 need to be less than ox1");
  if(oy0 > oy1) throw Error("oy0 need to be less than oy1");
  for (var ox=ox0; ox<=ox1; ox++) {
    for (var oy=oy0; oy<=oy1; oy++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if((oy > oy0) && (Math.floor(oldv/lvl) != Math.floor(v/lvl))) set(ox,oy);
      oldv = v;
    }
  }
  for (var oy=oy0; oy<=oy1; oy++) {
    for (var ox=ox0; ox<=ox1; ox++) {
      var ax = (ox-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (oy-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      if((oy > oy0) && (Math.floor(oldv/lvl) != Math.floor(v/lvl))) set(ox,oy);
      oldv = v;
    }
  }
}

function drawVectorField(ix0,ix1,iy0,iy1,ox0,ox1,oy0,oy1,hArray,f,set){
  var nbx = Math.floor((ox1-ox0)/hArray);
  var nby = Math.floor((oy1-oy0)/hArray);
  var restx = (ox1-ox0) - nbx*hArray;
  var resty = (oy1-oy0) - nby*hArray;
  for (var i=0; i<nbx; i++) {
    for (var j=0; j<nby; j++) {
      var px = restx/2 + i*hArray;
      var py = resty/2 + j*hArray;
      var ax = (px-ox0)/(ox1 - ox0);
      var ix = ix0*(1-ax) + ix1*ax;
      var ay = (py-oy0)/(oy1 - oy0);
      var iy = iy0*(1-ay) + iy1*ay;
      var v = f([ix,iy]);
      var r = norm(v);
      if(r < 10e-12) continue;
      var dx = v[0]/r;
      var dy = v[1]/r;
      var a = (dy>0?-1:1)*Math.acos(dx);
      drawArrow(Math.round(px),Math.round(py),a,hArray/2,setBlack);
    }
  }
}

function norm(v){
  var x = v[0], y = v[1];
  return sqrt(x*x+y*y);
}
function compose(f,g){ return function(x){ return f(g(x)); }; }
function normFct(f){ return function(x){ return norm(f(x)); } }
function logNormFct(f){ return function(x){ return ln(norm(f(x))); } }

function setColorFct(r,g,b){ return function(x,y){ rgb[y*SIZE*3 + x*3 + 0] = r; rgb[y*SIZE*3 + x*3 + 1] = g; rgb[y*SIZE*3 + x*3 + 2] = b; }};
function setWhite(x,y){ rgb[y*SIZE*3 + x*3 + 0] = rgb[y*SIZE*3 + x*3 + 1] = rgb[y*SIZE*3 + x*3 + 2] = 255; }
function setBlack(x,y){ rgb[y*SIZE*3 + x*3 + 0] = rgb[y*SIZE*3 + x*3 + 1] = rgb[y*SIZE*3 + x*3 + 2] = 0; }
var setRed = setColorFct(255,192,192);
var setYellow = setColorFct(255,255,192);
var setGreen = setColorFct(192,255,192);
var setBlue = setColorFct(192,192,255);
function writeBuffer(name){
  var png = new Png(rgb, SIZE, SIZE, 'rgb');
  fs.writeFileSync('./'+name+'.png', png.encodeSync().toString('binary'), 'binary');
}

function f1(v){
  var x = v[0];
  var y = v[1];
  var fx = x-y;
  var fy = 4*x*x*x - y + 3;
  return [fx,fy];
}

/* Question 6 */
function h1(v){
  var x = v[0];
  var y = v[1];
  return -x*x*x*x+x*y-3*x-0.5*y*y;
}

function f2(v){
  var x = v[0];
  var y = v[1];
  var fx = y;
  var fy = -Math.sin(x);
  return [fx,fy];
}

/* Question 6b */
function h2(v){
  var x = v[0];
  var y = v[1];
  return Math.cos(x)+0.5*y*y;
}

function setAngle(x,y,dx,dy){ 
  if(dx > 0 && dy > 0) setRed(x,y);
  else if(dx < 0 && dy > 0) setYellow(x,y);
  else if(dx > 0 && dy < 0) setGreen(x,y);
  else if(dx < 0 && dy < 0) setBlue(x,y);
}

var V = f1;
var H = h1;
var contourLvl = 1;
var h = 10;
drawRect(0,SIZE,0,SIZE,setWhite);
drawZeroCrossing(-h,h,h,-h,0,SIZE,0,SIZE,function(x){ return V(x)[0]; },setBlack);
drawZeroCrossing(-h,h,h,-h,0,SIZE,0,SIZE,function(x){ return V(x)[1]; },setBlack);
writeBuffer("exo2-q1-q2");
callFctOnRect(-h,h,h,-h,0,SIZE,0,SIZE,V,setAngle);
drawVectorField(-h,h,h,-h,0,SIZE,0,SIZE,25,V,setBlack);
//drawContour(-h,h,h,-h,0,SIZE,0,SIZE,contourLvl,logNormFct(V),setBlack);
writeBuffer("exo2-q3-q4");
drawContour(-h,h,h,-h,0,SIZE,0,SIZE,contourLvl,function(x){ var v = H(x); return (v<0?-1:1)*ln(abs(v)) },setBlack);
writeBuffer("exo2-q6");

V = f2;
H = h2;
drawRect(0,SIZE,0,SIZE,setWhite);
drawZeroCrossing(-h,h,h,-h,0,SIZE,0,SIZE,function(x){ return V(x)[0]; },setBlack);
drawZeroCrossing(-h,h,h,-h,0,SIZE,0,SIZE,function(x){ return V(x)[1]; },setBlack);
callFctOnRect(-h,h,h,-h,0,SIZE,0,SIZE,V,setAngle);
drawVectorField(-h,h,h,-h,0,SIZE,0,SIZE,25,V,setBlack);
//drawContour(-h,h,h,-h,0,SIZE,0,SIZE,contourLvl,logNormFct(f),setBlack);
writeBuffer("exo2-q5");
drawContour(-h,h,h,-h,0,SIZE,0,SIZE,contourLvl,H,setBlack);
writeBuffer("exo2-q6b");

/* Proof Q7:

define space of work

X:\mathbb{R} \rightarrow \mathbb{R}^{2} \: and \: H:\mathbb{R}^2 \rightarrow \mathbb{R}

put hamiltonien def

X'(T)
=
\begin{pmatrix}
\frac{\partial H}{\partial x2}(X(T))\\ 
-\frac{\partial H}{\partial x1}(X(T))
\end{pmatrix}

core of the proof

(H(X(t)))'=\begin{pmatrix}
\frac{\partial H}{\partial x1}(X(T))\\ 
\frac{\partial H}{\partial x2}(X(T))
\end{pmatrix}
X'(T)
=
\begin{pmatrix}
\frac{\partial H}{\partial x1}(X(T))\\ 
\frac{\partial H}{\partial x2}(X(T))
\end{pmatrix}
\begin{pmatrix}
\frac{\partial H}{\partial x2}(X(T))\\ 
-\frac{\partial H}{\partial x1}(X(T))
\end{pmatrix}
=
\frac{\partial H}{\partial x1}(X(T)) \frac{\partial H}{\partial x2}(X(T)) - \frac{\partial H}{\partial x2}(X(T)) \frac{\partial H}{\partial x1}(X(T))
=
0
\Rightarrow
H(X(t))=cst 

*/


