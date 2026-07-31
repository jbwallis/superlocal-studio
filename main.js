/* Superlocal Studio
 * Halftone cloud field, rasterised from photographs of the sky over San Francisco.
 * The wordmark is only visible where a cloud passes over it.
 */
(function () {
  'use strict';

  var bg = document.getElementById('clouds');
  var rv = document.getElementById('reveal');
  if (!bg || !rv) return;

  var bgCtx = bg.getContext('2d');
  var rvCtx = rv.getContext('2d');
  var off = document.createElement('canvas');
  var offCtx = off.getContext('2d', { willReadFrequently: true });
  var txt = document.createElement('canvas');
  var txtCtx = txt.getContext('2d');

  var contentEl = document.querySelector('.section-k');

  var DOT = 6;                 // halftone grid pitch, px
  var MAXR = DOT * 0.5;
  var LINEH = 1.85;            // wordmark block height, in font sizes
  var W, H, NW, NH, baseCy;
  var cy = null, curFs = null, fsSmooth = null;

  var CLOUDS = [
    { src: 'images/clouds/cloudA.png', w: 520, h: 377 },
    { src: 'images/clouds/cloudB.png', w: 520, h: 352 },
    { src: 'images/clouds/cloudC.png', w: 384, h: 154 },
    { src: 'images/clouds/cloudD.png', w: 505, h: 448 }
  ];
  var COUNT = 27;
  var instances = [];
  var bandOrder = [];

  function inkColor() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--cloud').trim() || '#1a1917';
  }
  var ink = inkColor();

  /* ---- wordmark ---- */

  function metrics() {
    var fs = Math.min(172, Math.max(60, W * 0.115));
    return { fs: Math.min(fs, H * 0.20), cx: W / 2 };
  }

  function drawText(fs) {
    if (typeof fs !== 'number' || !isFinite(fs)) fs = metrics().fs;
    txt.width = W; txt.height = H;
    txtCtx.clearRect(0, 0, W, H);
    baseCy = H * 0.40;
    txtCtx.fillStyle = ink;
    txtCtx.textAlign = 'center';
    txtCtx.textBaseline = 'middle';
    txtCtx.font = 'italic ' + fs + "px 'Grenze', Georgia, serif";
    txtCtx.fillText('superlocal', W / 2, baseCy - fs * 0.44);
    txtCtx.fillText('studio', W / 2, baseCy + fs * 0.44);
    curFs = fs;
  }

  /* The wordmark centres itself in whatever open band is left above the
     content, shrinking so it always fits inside that band. */
  function targetCy() {
    var gap = contentEl ? contentEl.getBoundingClientRect().top : H;
    return Math.min(H * 0.40, gap / 2);
  }
  function wantFs() {
    var gap = Math.max(0, contentEl ? contentEl.getBoundingClientRect().top : H);
    return Math.max(44, Math.min(metrics().fs, gap * 0.86 / LINEH));
  }

  /* ---- cloud field ---- */

  function shuffleBands() {
    bandOrder = [];
    for (var i = 0; i < COUNT; i++) bandOrder.push(i);
    for (var j = bandOrder.length - 1; j > 0; j--) {
      var r = Math.floor(Math.random() * (j + 1));
      var t = bandOrder[j]; bandOrder[j] = bandOrder[r]; bandOrder[r] = t;
    }
  }

  function spawn(i, x) {
    var s = CLOUDS[[0, 1, 3, 2, 1, 0, 3, 2, 1][i % 9]];
    var scale = 0.8 + Math.random() * 0.6;
    var band = (bandOrder[i] + 0.5) / COUNT;
    return {
      sp: s,
      scale: scale,
      x: x,
      y: H * (0.04 + band * 0.94 + (Math.random() - 0.5) * 0.06) - s.h * scale * 0.5,
      vx: 0.05 + Math.random() * 0.12
    };
  }

  function layout() {
    if (!(W > 0 && H > 0)) return;   // nothing sensible to place yet
    shuffleBands();
    instances = [];
    var m = metrics();
    txtCtx.font = 'italic ' + m.fs + "px 'Grenze', Georgia, serif";
    var wordW = txtCtx.measureText('superlocal').width;

    // opening cloud: parked just left of the wordmark, overlapping its first letters
    var s0 = CLOUDS[0], sc0 = 1.3;
    instances.push({
      sp: s0, scale: sc0,
      x: (m.cx - wordW / 2 + m.fs * 0.65) - s0.w * sc0,
      y: H * 0.40 - s0.h * sc0 * 0.5,
      vx: 0.06 + Math.random() * 0.06
    });
    for (var i = 1; i < COUNT; i++) {
      instances.push(spawn(i, (i / COUNT) * (W + 900) - 400 + (Math.random() - 0.5) * 260));
    }
  }

  /* ---- scroll gusts ---- */

  var boost = 0;
  var lastY = window.scrollY || window.pageYOffset || 0;
  var MAX_BOOST = 7;

  window.addEventListener('scroll', function () {
    var y = window.scrollY || window.pageYOffset || 0;
    boost = Math.min(MAX_BOOST, boost + Math.abs(y - lastY) * 0.09);
    lastY = y;
  }, { passive: true });

  window.addEventListener('wheel', function (e) {
    boost = Math.min(MAX_BOOST, boost + Math.abs(e.deltaY) * 0.018);
  }, { passive: true });

  window.addEventListener('touchmove', function () {
    boost = Math.min(MAX_BOOST, boost + 0.7);
  }, { passive: true });

  function advance() {
    var m = 1 + boost;
    for (var k = 0; k < instances.length; k++) {
      var it = instances[k];
      it.x += it.vx * m;
      var w = it.sp.w * it.scale;
      if (it.x - w > W) {
        it.x = -w - Math.random() * 500;
        it.y = H * (0.04 + Math.random() * 0.94) - it.sp.h * it.scale * 0.5;
        it.vx = 0.05 + Math.random() * 0.12;
      }
    }
    boost *= 0.92;
    if (boost < 0.001) boost = 0;
  }

  /* ---- sizing ---- */

  function resize() {
    var oldW = W || 0, oldH = H || 0;
    W = bg.width = rv.width = window.innerWidth;
    H = bg.height = rv.height = window.innerHeight;
    NW = off.width = Math.ceil(W / DOT);
    NH = off.height = Math.ceil(H / DOT);
    if (instances.length) {
      if (oldH > 0 && oldW > 0) {
        // keep the field spread across the new viewport
        var ky = H / oldH, kx = W / oldW;
        for (var i = 0; i < instances.length; i++) {
          instances[i].y *= ky; instances[i].x *= kx;
        }
      } else {
        // previous dimensions were unusable — place the field afresh
        layout();
      }
    }
    drawText();
    cy = null; fsSmooth = null;
    maybeStart();
  }

  /* ---- frame ---- */

  function render() {
    // clouds are composited at grid resolution — 1/36th the pixels of the viewport
    offCtx.clearRect(0, 0, NW, NH);
    for (var k = 0; k < instances.length; k++) {
      var it = instances[k];
      offCtx.drawImage(it.sp.img, it.x / DOT, it.y / DOT,
        it.sp.w * it.scale / DOT, it.sp.h * it.scale / DOT);
    }
    var px = offCtx.getImageData(0, 0, NW, NH).data;

    bgCtx.clearRect(0, 0, W, H);
    bgCtx.fillStyle = ink;
    bgCtx.globalAlpha = 0.55;
    bgCtx.beginPath();
    for (var gy = 0; gy < NH; gy++) {
      var yy = gy * DOT + MAXR;
      for (var gx = 0; gx < NW; gx++) {
        var r = MAXR * (px[(gy * NW + gx) * 4 + 3] / 255);
        if (r > 0.25) {
          var xx = gx * DOT + MAXR;
          bgCtx.moveTo(xx + r, yy);
          bgCtx.arc(xx, yy, r, 0, 6.2832);
        }
      }
    }
    bgCtx.fill();
    bgCtx.globalAlpha = 1;

    var fw = wantFs();
    fsSmooth = (fsSmooth === null) ? fw : fsSmooth + (fw - fsSmooth) * 0.14;
    if (curFs === null || Math.abs(fsSmooth - curFs) > 0.75) drawText(fsSmooth);

    var t = targetCy();
    cy = (cy === null) ? t : cy + (t - cy) * 0.14;

    rvCtx.setTransform(1, 0, 0, 1, 0, 0);
    rvCtx.globalCompositeOperation = 'source-over';
    rvCtx.clearRect(0, 0, W, H);
    rvCtx.drawImage(txt, 0, Math.round(cy - baseCy));
    rvCtx.globalCompositeOperation = 'destination-in';
    rvCtx.imageSmoothingEnabled = true;
    rvCtx.drawImage(off, 0, 0, NW, NH, 0, 0, W, H);
    rvCtx.globalCompositeOperation = 'source-over';

    advance();
    requestAnimationFrame(render);
  }

  /* ---- boot ---- */

  var loaded = 0, imagesReady = false, started = false;

  /* Start only once the sprites are decoded and the viewport has real
     dimensions; either can arrive first. */
  function maybeStart() {
    if (started || !imagesReady || !(W > 0 && H > 0)) return;
    if (!instances.length) layout();
    if (!instances.length) return;
    started = true;
    requestAnimationFrame(render);
  }

  CLOUDS.forEach(function (c) {
    c.img = new Image();
    c.img.onload = function () {
      if (++loaded === CLOUDS.length) { imagesReady = true; maybeStart(); }
    };
    c.img.src = c.src;
  });

  window.addEventListener('resize', resize);
  resize();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { drawText(); });
  }

  new MutationObserver(function () { ink = inkColor(); drawText(curFs); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---- inquiry form ----
     Posts to Netlify Forms in the background so the page never reloads.
     Without JS the form still submits natively to Netlify's own thank-you page. */

  var form = document.querySelector('form.inquiry');
  if (form) {
    var statusEl = form.querySelector('.status');
    var button = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) return;      // let the browser show its own hints
      e.preventDefault();

      var data = new URLSearchParams(new FormData(form)).toString();
      button.disabled = true;
      statusEl.className = 'status';
      statusEl.textContent = 'sending…';

      fetch(form.getAttribute('action') || '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: data
      }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var sent = document.createElement('div');
        sent.className = 'sent';
        sent.setAttribute('role', 'status');
        sent.innerHTML = '<strong>Thanks — message sent.</strong>' +
          '<span>I read everything myself and will reply from jack@superlocal.studio.</span>';
        form.replaceWith(sent);
      }).catch(function () {
        button.disabled = false;
        statusEl.className = 'status error';
        statusEl.textContent = 'Could not send — please email jack@superlocal.studio directly.';
      });
    });
  }

  /* ---- gallery reveal ---- */

  var pieces = [].slice.call(document.querySelectorAll('.piece'));
  if (pieces.length) {
    var still = !('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still) {
      pieces.forEach(function (p) { p.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      pieces.forEach(function (p) { io.observe(p); });
    }
  }
})();
