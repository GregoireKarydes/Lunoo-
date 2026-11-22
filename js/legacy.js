/* Lunoo — compatibilité avec les vieilles tablettes (iPad sous iOS 12, ex. iPad mini 2/3, iPad Air 1).
   Script classique (pas un module), écrit en ES5, chargé avant l'appli. Ne fait rien sur un navigateur récent.
   1. Événements « pointer » (pointerdown/move/up/cancel) recréés à partir des événements tactiles.
   2. « gap » des conteneurs flex, que Safari < 14.1 ignore : remplacé par des marges.
   3. Blob.text() / Blob.arrayBuffer() (import d'une sauvegarde). */
(function () {
  'use strict';
  var doc = document;

  /* ---------- 1. Pointer events ---------- */
  if (!window.PointerEvent && 'ontouchstart' in window) {
    // Éléments marqués « touch-action: none » dans app.css : le doigt peut y bouger sans que ce soit un défilement.
    var NO_SCROLL = '.parent-corner, .hold-btn, .ds[data-jump], .night-hold, .drag-handle';
    var SLOP = 10; // px avant de considérer que le doigt fait défiler la page
    var active = {}; // identifiant du doigt -> { target, x0, y0, cancelled, noScroll }

    var closest = function (el, sel) {
      while (el && el.nodeType === 1) {
        if ((el.matches || el.webkitMatchesSelector).call(el, sel)) return el;
        el = el.parentNode;
      }
      return null;
    };

    var fire = function (type, target, t, te, primary) {
      var ev = doc.createEvent('Event');
      ev.initEvent(type, true, true);
      ev.pointerId = t.identifier + 2; // 1 est réservé à la souris
      ev.pointerType = 'touch';
      ev.isPrimary = primary;
      ev.button = type === 'pointermove' ? -1 : 0;
      ev.buttons = type === 'pointerdown' || type === 'pointermove' ? 1 : 0;
      ev.clientX = t.clientX; ev.clientY = t.clientY;
      ev.pageX = t.pageX; ev.pageY = t.pageY;
      ev.screenX = t.screenX; ev.screenY = t.screenY;
      ev.width = ev.height = 1; ev.pressure = ev.buttons ? 0.5 : 0;
      var pd = ev.preventDefault;
      ev.preventDefault = function () {
        pd.call(ev);
        // Comme « touch-action: none » : un pointermove annulé empêche le défilement (glisser-déposer).
        if (type === 'pointermove' && te.cancelable) te.preventDefault();
      };
      target.dispatchEvent(ev);
      return ev;
    };

    doc.addEventListener('touchstart', function (te) {
      for (var i = 0; i < te.changedTouches.length; i++) {
        var t = te.changedTouches[i];
        var target = t.target.nodeType === 1 ? t.target : t.target.parentNode;
        active[t.identifier] = { target: target, x0: t.clientX, y0: t.clientY, cancelled: false, noScroll: !!closest(target, NO_SCROLL) };
        fire('pointerdown', target, t, te, te.touches.length === 1);
      }
    }, { capture: true, passive: true });

    doc.addEventListener('touchmove', function (te) {
      for (var i = 0; i < te.changedTouches.length; i++) {
        var t = te.changedTouches[i], a = active[t.identifier];
        if (!a || a.cancelled) continue;
        if (a.noScroll && te.cancelable) te.preventDefault();
        var ev = fire('pointermove', a.target, t, te, true);
        // Le doigt fait défiler la page : un vrai navigateur envoie pointercancel (fin des appuis longs).
        if (!a.noScroll && !ev.defaultPrevented &&
            (Math.abs(t.clientX - a.x0) > SLOP || Math.abs(t.clientY - a.y0) > SLOP)) {
          a.cancelled = true;
          fire('pointercancel', a.target, t, te, true);
        }
      }
    }, { capture: true, passive: false });

    var finish = function (type) {
      return function (te) {
        for (var i = 0; i < te.changedTouches.length; i++) {
          var t = te.changedTouches[i], a = active[t.identifier];
          if (!a) continue;
          delete active[t.identifier];
          if (!a.cancelled) fire(type, a.target, t, te, true);
        }
      };
    };
    doc.addEventListener('touchend', finish('pointerup'), { capture: true, passive: true });
    doc.addEventListener('touchcancel', finish('pointercancel'), { capture: true, passive: true });
  }

  /* ---------- 3. Blob.text / arrayBuffer ---------- */
  if (window.Blob && !Blob.prototype.text) {
    var read = function (blob, how) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(r.result); };
        r.onerror = function () { reject(r.error); };
        r[how](blob);
      });
    };
    Blob.prototype.text = function () { return read(this, 'readAsText'); };
    if (!Blob.prototype.arrayBuffer) Blob.prototype.arrayBuffer = function () { return read(this, 'readAsArrayBuffer'); };
  }

  /* ---------- 2. gap dans les conteneurs flex ---------- */
  var flexGapWorks = function () {
    var f = doc.createElement('div');
    f.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    f.appendChild(doc.createElement('div'));
    f.appendChild(doc.createElement('div'));
    doc.body.appendChild(f);
    var ok = f.scrollHeight === 1;
    doc.body.removeChild(f);
    return ok;
  };

  var startGapFix = function () {
    if (flexGapWorks()) return;
    doc.documentElement.className += ' no-flex-gap';

    // Une règle CSS par valeur rencontrée ; spécificité faible (un attribut) pour ne pas écraser les marges « auto ».
    var sheet = doc.createElement('style');
    doc.head.appendChild(sheet);
    var made = {};
    var attrFor = function (side, px) {
      var key = side + px;
      if (!made[key]) {
        made[key] = true;
        sheet.appendChild(doc.createTextNode('[data-g' + side + '="' + px + '"]{margin-' +
          { l: 'left', r: 'right', t: 'top', b: 'bottom' }[side] + ':' + px + 'px}'));
      }
      return 'data-g' + side;
    };
    var SIDES = ['data-gl', 'data-gr', 'data-gt', 'data-gb'];

    var clear = function () {
      var old = doc.querySelectorAll('[data-gl],[data-gr],[data-gt],[data-gb]');
      for (var i = 0; i < old.length; i++) for (var j = 0; j < SIDES.length; j++) old[i].removeAttribute(SIDES[j]);
    };

    var inFlow = function (el) {
      var s = getComputedStyle(el);
      return s.display !== 'none' && s.position !== 'absolute' && s.position !== 'fixed';
    };

    var apply = function () {
      clear();
      var all = doc.body.getElementsByTagName('*');
      for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.ownerSVGElement || el.tagName.toLowerCase() === 'svg') continue;
        var cs = getComputedStyle(el);
        if (cs.display !== 'flex' && cs.display !== 'inline-flex') continue;
        var rg = parseFloat(cs.rowGap) || 0, cg = parseFloat(cs.columnGap) || 0;
        if (!rg && !cg) continue;
        // Les enfants « en flux », y compris les bouts de texte nus (ex. icône + texte dans un bouton).
        var items = [], kids = [];
        for (var k = 0; k < el.childNodes.length; k++) {
          var n = el.childNodes[k];
          if (n.nodeType === 1 && inFlow(n)) { items.push(n); kids.push(n); }
          else if (n.nodeType === 3 && /\S/.test(n.nodeValue)) items.push(n);
        }
        if (items.length < 2) continue;
        var dir = cs.flexDirection, column = dir.indexOf('column') === 0, rev = dir.indexOf('reverse') > 0;
        var mainGap = column ? rg : cg, crossGap = column ? cg : rg;
        var mainSide = column ? (rev ? 'b' : 't') : (rev ? 'r' : 'l');
        var afterSide = { l: 'r', r: 'l', t: 'b', b: 't' }[mainSide];
        var j;
        if (mainGap) for (j = 1; j < items.length; j++) {
          // Espace avant l'élément ; si c'est du texte, on met l'espace après l'élément précédent.
          if (items[j].nodeType === 1) items[j].setAttribute(attrFor(mainSide, mainGap), mainGap);
          else if (items[j - 1].nodeType === 1) items[j - 1].setAttribute(attrFor(afterSide, mainGap), mainGap);
        }
        if (kids.length < 2) continue;
        if (cs.flexWrap === 'nowrap' || column || !crossGap) continue;
        // Retour à la ligne : pas d'espace en début de ligne, et un espace vertical sur les lignes suivantes.
        var top0 = kids[0].offsetTop, prev = top0, crossSide = cs.flexWrap === 'wrap-reverse' ? 'b' : 't';
        for (j = 1; j < kids.length; j++) {
          var top = kids[j].offsetTop;
          if (top > prev + 1 && mainGap) kids[j].removeAttribute('data-g' + mainSide);
          if (top > top0 + 1) kids[j].setAttribute(attrFor(crossSide, crossGap), crossGap);
          prev = top;
        }
      }
    };

    var queued = false;
    var schedule = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; apply(); });
    };
    new MutationObserver(schedule).observe(doc.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', function () { setTimeout(schedule, 300); });
    schedule();
  };

  if (doc.body) startGapFix();
  else doc.addEventListener('DOMContentLoaded', startGapFix);
})();
