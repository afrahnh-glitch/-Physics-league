/* ⚡ دوري الفيزياء — نسخة مستقلة (بدون Google). البيانات تُحفظ على الجهاز نفسه. */
(function () {
  'use strict';

  var LS_KEY = 'physicsLeague.v1';
  var CATS = ['تعلم', 'مشاركة', 'تعاون', 'انضباط'];
  var CAT_TITLES = { 'تعلم': '🧠 التعلم', 'مشاركة': '🙋‍♀️ المشاركة', 'تعاون': '🤝 التعاون', 'انضباط': '🎯 الانضباط' };
  var BADGE_NAMES = {
    weekly_champion: ['🏆', 'بطل الأسبوع'],
    thinkers: ['🧠', 'فصل المفكرات'],
    physics_class: ['⚡', 'فصل الفيزياء'],
    team_spirit: ['🤝', 'روح الفريق'],
    most_improved: ['📈', 'أكبر تطور'],
    disciplined: ['🎯', 'الفصل المنضبط']
  };

  /* ---------------- الحالة والتخزين ---------------- */
  function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function builtinDefaults() {
    return {
      v: 1,
      classes: ['2/1', '2/2', '2/3', '2/4'].map(function (n, i) { return { id: 'c' + (i + 1), name: n, offset: 0, sessionsDone: 0 }; }),
      pointTypes: [
        ['solve', '⚡', 'حل مسألة', 'تعلم', 2], ['answer', '🧠', 'إجابة مميزة', 'تعلم', 1],
        ['discover', '🔎', 'اكتشاف خطأ', 'تعلم', 2], ['apply', '💡', 'تطبيق فيزيائي', 'تعلم', 2],
        ['question', '⭐', 'سؤال مميز', 'مشاركة', 1], ['active', '💬', 'مشاركة فعالة', 'مشاركة', 1],
        ['idea', '💡', 'فكرة مميزة', 'مشاركة', 2], ['collab', '🤝', 'تعاون ممتاز', 'تعاون', 1],
        ['teamwork', '👥', 'عمل جماعي مميز', 'تعاون', 2], ['help', '🌟', 'مساعدة الفريق', 'تعاون', 1],
        ['discipline', '🎯', 'انضباط', 'انضباط', 1], ['commitment', '⏱️', 'التزام', 'انضباط', 1],
        ['perfect', '🏆', 'حصة مثالية', 'انضباط', 3]
      ].map(function (r) { return { id: r[0], emoji: r[1], name: r[2], category: r[3], points: r[4] }; }),
      levels: [
        { min: 0, name: 'مستكشفات الفيزياء', emoji: '🌱' }, { min: 50, name: 'الباحثات', emoji: '🔭' },
        { min: 100, name: 'العالمات الناشئات', emoji: '⚡' }, { min: 200, name: 'عالمات الفيزياء', emoji: '🚀' },
        { min: 300, name: 'أسطورة الفيزياء', emoji: '👑' }
      ],
      log: [], sessions: [], active: null
    };
  }

  function freshState() {
    return window.SEED ? JSON.parse(JSON.stringify(window.SEED)) : builtinDefaults();
  }

  function valid(o) {
    return o && Array.isArray(o.classes) && Array.isArray(o.pointTypes) && Array.isArray(o.levels) && Array.isArray(o.log);
  }

  var S;
  try { var raw = localStorage.getItem(LS_KEY); S = raw ? JSON.parse(raw) : null; } catch (e) { S = null; }
  if (!valid(S)) { S = freshState(); }
  if (!Array.isArray(S.sessions)) S.sessions = [];
  if (S.active === undefined) S.active = null;

  var saveWarned = false;
  function save() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
    catch (e) { if (!saveWarned) { saveWarned = true; toast('⚠️ تعذّر الحفظ على الجهاز. صدّري نسخة احتياطية من الإعدادات.', 'error'); } }
  }
  save();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }

  var ui = { view: 'board' };

  /* ---------------- حسابات ---------------- */
  function cls(id) { return S.classes.filter(function (c) { return c.id === id; })[0]; }
  function typeById(id) { return S.pointTypes.filter(function (p) { return p.id === id; })[0]; }
  function activeLog() { return S.log.filter(function (e) { return !e.v; }); }

  function totalOf(c) {
    var t = Number(c.offset) || 0;
    S.log.forEach(function (e) { if (!e.v && e.c === c.id) t += e.pts; });
    return t;
  }
  function sortedLevels() { return S.levels.slice().sort(function (a, b) { return a.min - b.min; }); }
  function levelFor(total) {
    var lv = sortedLevels(), res = lv[0];
    for (var i = 0; i < lv.length; i++) { if (total >= lv[i].min) res = lv[i]; }
    return res || { name: '', emoji: '' };
  }
  function sessionPoints(sid) {
    var t = 0; S.log.forEach(function (e) { if (!e.v && e.s === sid) t += e.pts; }); return t;
  }
  function weekStart(offsetWeeks) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay() + (offsetWeeks || 0) * 7); // الأسبوع يبدأ الأحد
    return d;
  }
  function sumsBetween(from, to) {
    var m = {};
    S.log.forEach(function (e) {
      if (e.v) return; var t = new Date(e.t);
      if (t >= from && t < to) m[e.c] = (m[e.c] || 0) + e.pts;
    });
    return m;
  }

  function computeBoard() {
    var rows = S.classes.map(function (c) { var t = totalOf(c); return { id: c.id, name: c.name, total: t, lvl: levelFor(t) }; });
    rows.sort(function (a, b) { return b.total - a.total; });
    var top = rows[0] ? rows[0].total : 0;
    var target = Math.max(400, (Math.ceil(top / 100) + 1) * 100);

    var ws = weekStart(0), we = new Date(ws); we.setDate(we.getDate() + 7);
    var ps = weekStart(-1);
    var weekly = sumsBetween(ws, we), prev = sumsBetween(ps, ws);

    var catTot = {};
    S.log.forEach(function (e) { if (e.v) return; (catTot[e.c] = catTot[e.c] || {})[e.cat] = ((catTot[e.c] || {})[e.cat] || 0) + e.pts; });

    function best(valFn, minVal) {
      var b = null, bv = -Infinity;
      S.classes.forEach(function (c) { var v = valFn(c); if (v > bv) { bv = v; b = c; } });
      return b && bv > minVal ? b.name : null;
    }
    var badges = [
      ['weekly_champion', best(function (c) { return weekly[c.id] || 0; }, 0)],
      ['thinkers', best(function (c) { return (catTot[c.id] || {})['تعلم'] || 0; }, 0)],
      ['physics_class', rows[0] ? rows[0].name : null],
      ['team_spirit', best(function (c) { return (catTot[c.id] || {})['تعاون'] || 0; }, 0)],
      ['most_improved', best(function (c) { return (weekly[c.id] || 0) - (prev[c.id] || 0); }, 0)],
      ['disciplined', best(function (c) { return (catTot[c.id] || {})['انضباط'] || 0; }, 0)]
    ].map(function (b) { return { emoji: BADGE_NAMES[b[0]][0], name: BADGE_NAMES[b[0]][1], holder: b[1] }; });

    var last = null;
    for (var i = S.log.length - 1; i >= 0; i--) { if (!S.log[i].v) { last = S.log[i]; break; } }
    return { rows: rows, target: target, badges: badges, last: last };
  }

  /* ---------------- أدوات عامة ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function relTime(iso) {
    var s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 90) return 'منذ لحظات';
    function unit(n, one, two, few, many) { return n === 1 ? 'منذ ' + one : n === 2 ? 'منذ ' + two : n <= 10 ? 'منذ ' + n + ' ' + few : 'منذ ' + n + ' ' + many; }
    var m = Math.floor(s / 60); if (m < 60) return unit(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
    var h = Math.floor(m / 60); if (h < 24) return unit(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
    var d = new Date(iso); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
  }
  function toast(msg, type) {
    var box = document.getElementById('toast-container'); if (!box) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.innerHTML = msg; box.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 2200);
  }

  /* ---------------- العمليات ---------------- */
  function startSession(cid) {
    var c = cls(cid); if (!c) return toast('⚠️ اختاري فصلًا.', 'error');
    if (S.active) endSession(true);
    var sid = uid('s'), no = (Number(c.sessionsDone) || 0) + 1;
    S.sessions.push({ id: sid, c: c.id, start: new Date().toISOString(), end: null, no: no });
    S.active = { sid: sid, cid: c.id, no: no };
    save(); toast('🎓 بدأت الحصة: ' + esc(c.name) + ' (حصة رقم ' + no + ')'); render();
  }

  function endSession(silent) {
    var a = S.active; if (!a) return;
    var total = sessionPoints(a.sid), c = cls(a.cid);
    S.sessions.forEach(function (s) { if (s.id === a.sid) s.end = new Date().toISOString(); });
    if (c) c.sessionsDone = (Number(c.sessionsDone) || 0) + 1;
    S.active = null; save();
    if (!silent) { toast('🏁 انتهت الحصة — مجموع نقاطها: ' + total); render(); }
  }

  function addPoint(typeId) {
    var a = S.active; if (!a) return toast('⚠️ لا توجد حصة نشطة. اضغطي «بدء الحصة» أولًا.', 'error');
    var pt = typeById(typeId), c = cls(a.cid); if (!pt || !c) return toast('⚠️ نوع النقطة غير معروف.', 'error');
    var before = totalOf(c);
    S.log.push({ id: uid('l'), t: new Date().toISOString(), c: c.id, p: pt.id, lb: pt.emoji + ' ' + pt.name, cat: pt.category, pts: pt.points, s: a.sid, sn: a.no, v: 0 });
    save();
    var after = totalOf(c), lvB = levelFor(before), lvA = levelFor(after);
    var el = document.getElementById('sessionPointsVal'); if (el) el.textContent = sessionPoints(a.sid);
    toast('✨ +' + pt.points + ' نقطة<br>' + esc(pt.emoji) + ' ' + esc(pt.name) + '<br>' + esc(c.name) + ' → ' + after + ' ⚡');
    if (lvA.name !== lvB.name) {
      setTimeout(function () { toast('🚀 ترقية!<br>' + esc(c.name) + ' وصل إلى مستوى:<br><b>' + esc(lvA.emoji) + ' ' + esc(lvA.name) + '</b>', 'levelup'); }, 350);
    }
  }

  function undoLast() {
    var a = S.active, e = null;
    if (a) { for (var i = S.log.length - 1; i >= 0; i--) { if (!S.log[i].v && S.log[i].s === a.sid) { e = S.log[i]; break; } } }
    if (!e) return toast('لا يوجد شيء للتراجع عنه في هذه الحصة.', 'error');
    if (!confirm('↩️ هل تريدين التراجع عن آخر نقطة (' + e.lb + ' +' + e.pts + ')؟')) return;
    e.v = 1; save(); toast('↩️ تم التراجع عن: ' + esc(e.lb)); render();
  }

  /* ---------------- النسخ الاحتياطي ---------------- */
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
  }
  function stamp() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function exportJson() { download('physics-league-backup-' + stamp() + '.json', JSON.stringify(S, null, 1), 'application/json'); }
  function exportCsv() {
    var rows = [['التاريخ', 'الوقت', 'الفصل', 'الإنجاز', 'التصنيف', 'النقاط', 'الحصة', 'الحالة']];
    S.log.forEach(function (e) {
      var d = new Date(e.t), c = cls(e.c);
      rows.push([pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(), d.getHours() + ':' + pad(d.getMinutes()), c ? c.name : '—', e.lb, e.cat, e.pts, 'حصة ' + e.sn, e.v ? 'ملغى' : 'نشط']);
    });
    var csv = rows.map(function (r) { return r.map(function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    download('physics-league-log-' + stamp() + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
  }
  function importJson(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var o = JSON.parse(r.result);
        if (!valid(o)) throw new Error('bad');
        if (!confirm('سيتم استبدال كل البيانات الحالية بالنسخة المستوردة. متأكدة؟')) return;
        S = o; if (!Array.isArray(S.sessions)) S.sessions = []; if (S.active === undefined) S.active = null;
        save(); toast('✅ تم استيراد النسخة الاحتياطية'); render();
      } catch (e) { toast('❌ الملف غير صالح.', 'error'); }
    };
    r.readAsText(file);
  }
  function resetAll() {
    if (!confirm('سيتم مسح كل النقاط والإعدادات والعودة للبداية. متأكدة؟')) return;
    if (!confirm('تأكيد أخير: هذا الإجراء لا يمكن التراجع عنه (إلا من نسخة احتياطية).')) return;
    S = freshState(); save(); toast('تمت إعادة الضبط'); render();
  }

  /* ---------------- العرض ---------------- */
  function renderBoard() {
    var b = computeBoard(), medals = ['🥇', '🥈', '🥉'], h = '';
    h += '<div class="section-heading">من يتصدر دوري الفيزياء؟</div><div class="leaderboard">';
    if (!b.rows.length) h += '<div class="empty-box">لا يوجد فصول بعد. أضيفي فصولك من «الإعدادات».</div>';
    b.rows.forEach(function (c, i) {
      var pct = Math.max(0, Math.min(100, Math.round(c.total / b.target * 100)));
      h += '<div class="leader-card' + (i < 3 ? ' top-' + (i + 1) : '') + '">' +
        '<div class="leader-top"><span class="leader-rank">' + (medals[i] || '#' + (i + 1)) + '</span><span class="leader-name">' + esc(c.name) + '</span></div>' +
        '<div class="leader-points">⚡ ' + c.total + ' نقطة</div>' +
        '<div class="progress-outer"><div class="progress-inner" style="width:' + pct + '%"></div></div>' +
        '<div class="leader-meta"><span class="meta-pill level-pill">' + esc(c.lvl.emoji) + ' ' + esc(c.lvl.name) + '</span></div></div>';
    });
    h += '</div><div class="section-heading">✨ آخر إنجاز</div><div class="card last-achievement-card">';
    if (b.last) {
      var lc = cls(b.last.c);
      h += '<div class="achv-class">' + esc(lc ? lc.name : '—') + '</div><div class="achv-line">' + esc(b.last.lb) + ' +' + b.last.pts + '</div><div class="achv-time">' + relTime(b.last.t) + '</div>';
    } else h += '<div class="empty-box">لا توجد إنجازات بعد</div>';
    h += '</div><div class="section-heading">🏅 إنجازات الأسبوع</div><div class="card badges-card">';
    b.badges.forEach(function (x) {
      h += '<div class="badge-row"><span class="badge-label">' + x.emoji + ' ' + esc(x.name) + '</span><span class="badge-holder">' + (x.holder ? esc(x.holder) : 'لم يُحسم بعد') + '</span></div>';
    });
    return h + '</div>';
  }

  function renderAdd() {
    var a = S.active, h = '<div class="section-heading">⚡ إضافة إنجاز</div><div class="card session-card">';
    if (!a) {
      if (!S.classes.length) return h + '<div class="empty-box">أضيفي فصلًا من «الإعدادات» أولًا.</div></div>';
      h += '<label class="field-label" for="classSelect">الفصل الحالي</label><select id="classSelect">' +
        S.classes.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('') +
        '</select><button class="btn btn-start" data-act="start">🎓 بدء الحصة</button></div>' +
        '<div class="empty-box">اختاري الفصل واضغطي «بدء الحصة» لبدء إضافة النقاط ⚡</div>';
      return h;
    }
    var c = cls(a.cid);
    h += '<div class="session-live"><div class="session-live-label">🎓 الحصة الحالية</div><div class="session-live-class">' + esc(c ? c.name : '—') +
      '</div><div class="session-live-status">🟢 نشطة — حصة رقم ' + a.no + '</div><div class="session-live-points">نقاط هذه الحصة: <b id="sessionPointsVal">' + sessionPoints(a.sid) + '</b></div></div>' +
      '<button class="btn btn-end" data-act="end">🏁 إنهاء الحصة</button></div>';
    CATS.forEach(function (cat) {
      var types = S.pointTypes.filter(function (p) { return p.category === cat; });
      if (!types.length) return;
      h += '<div class="category-block"><div class="category-title">' + CAT_TITLES[cat] + '</div><div class="points-grid">';
      types.forEach(function (p) {
        h += '<button class="point-btn" data-act="point" data-id="' + esc(p.id) + '"><span class="emoji">' + esc(p.emoji) + '</span><span class="name">' + esc(p.name) + '</span><span class="val">+' + p.points + '</span></button>';
      });
      h += '</div></div>';
    });
    return h + '<button class="btn btn-undo" data-act="undo">↩️ تراجع عن آخر نقطة</button>';
  }

  function inp(scope, id, field, val, type, extra, cl) {
    return '<input class="inp' + (cl ? ' ' + cl : '') + '" ' + (extra || '') + ' type="' + (type || 'text') + '" value="' + esc(val) + '" data-scope="' + scope + '" data-id="' + esc(id) + '" data-field="' + field + '">';
  }

  function renderSettings() {
    var h = '<div class="section-heading">🏫 الفصول</div><div class="card">';
    S.classes.forEach(function (c) {
      h += '<div class="set-row">' + inp('class', c.id, 'name', c.name, 'text', 'aria-label="اسم الفصل"') +
        '<label class="mini">رصيد سابق' + inp('class', c.id, 'offset', c.offset || 0, 'number', 'inputmode="numeric"') + '</label>' +
        '<button class="icon-btn" data-act="del-class" data-id="' + esc(c.id) + '" aria-label="حذف">🗑️</button></div>';
    });
    h += '<button class="btn btn-secondary" data-act="add-class">➕ إضافة فصل</button><div class="hint">«رصيد سابق» نقاط افتتاحية تُضاف لمجموع الفصل (اتركيه 0 عادةً).</div></div>';

    h += '<div class="section-heading">⚡ أنواع النقاط وقيمها</div><div class="card">';
    S.pointTypes.forEach(function (p) {
      h += '<div class="set-row">' + inp('type', p.id, 'emoji', p.emoji, 'text', 'maxlength="4"', 'emo') +
        inp('type', p.id, 'name', p.name) +
        '<select class="inp sel" data-scope="type" data-id="' + esc(p.id) + '" data-field="category">' +
        CATS.map(function (c) { return '<option' + (c === p.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' +
        inp('type', p.id, 'points', p.points, 'number', 'inputmode="numeric"') +
        '<button class="icon-btn" data-act="del-type" data-id="' + esc(p.id) + '" aria-label="حذف">🗑️</button></div>';
    });
    h += '<button class="btn btn-secondary" data-act="add-type">➕ إضافة نوع نقطة</button></div>';

    h += '<div class="section-heading">🚀 المستويات</div><div class="card">';
    sortedLevels().forEach(function (l, i) {
      h += '<div class="set-row"><label class="mini">من نقطة' + inp('level', i, 'min', l.min, 'number', 'inputmode="numeric"') + '</label>' +
        inp('level', i, 'emoji', l.emoji, 'text', 'maxlength="4"', 'emo') + inp('level', i, 'name', l.name) +
        '<button class="icon-btn" data-act="del-level" data-id="' + i + '" aria-label="حذف">🗑️</button></div>';
    });
    h += '<button class="btn btn-secondary" data-act="add-level">➕ إضافة مستوى</button><div class="hint">أول مستوى يجب أن يبدأ من 0.</div></div>';

    h += '<div class="section-heading">💾 النسخ الاحتياطي</div><div class="card">' +
      '<div class="hint" style="margin:0 0 8px">بياناتك محفوظة على هذا الجهاز. صدّري نسخة احتياطية بين فترة وأخرى.</div>' +
      '<button class="btn btn-start" data-act="export-json">⬇️ تصدير نسخة احتياطية (JSON)</button>' +
      '<button class="btn btn-secondary" data-act="export-csv">📄 تصدير سجل النقاط (CSV / Excel)</button>' +
      '<button class="btn btn-secondary" data-act="import">⬆️ استيراد نسخة احتياطية</button>' +
      '<input type="file" id="importFile" accept=".json,application/json" hidden>' +
      '<button class="btn btn-danger" data-act="reset">⚠️ إعادة ضبط كل شيء</button></div>';
    return h;
  }

  function render() {
    var app = document.getElementById('app');
    var tabs = [['board', '🏆 لوحة المنافسة'], ['add', '⚡ إضافة نقاط'], ['settings', '⚙️ الإعدادات']];
    var h = '<div class="app-header"><div class="app-title">⚡ دوري الفيزياء</div><div class="app-subtitle">PHYSICS CHALLENGE</div><div class="app-teacher">أ. أفراح الحربي</div></div><div class="tab-bar">' +
      tabs.map(function (t) { return '<button class="tab-btn' + (ui.view === t[0] ? ' active' : '') + '" data-act="tab" data-id="' + t[0] + '">' + t[1] + '</button>'; }).join('') + '</div>';
    h += ui.view === 'board' ? renderBoard() : ui.view === 'add' ? renderAdd() : renderSettings();
    app.innerHTML = h;
  }

  /* ---------------- الأحداث ---------------- */
  var lastTap = {};
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t) return;
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (act === 'point') { // منع الضغط المزدوج غير المقصود
      var now = Date.now(); if (lastTap[id] && now - lastTap[id] < 350) return; lastTap[id] = now;
    }
    switch (act) {
      case 'tab': ui.view = id; render(); window.scrollTo(0, 0); break;
      case 'start': startSession(document.getElementById('classSelect').value); break;
      case 'end': endSession(); break;
      case 'point': addPoint(id); break;
      case 'undo': undoLast(); break;
      case 'add-class': S.classes.push({ id: uid('c'), name: 'فصل جديد', offset: 0, sessionsDone: 0 }); save(); render(); break;
      case 'del-class':
        var c = cls(id);
        if (c && confirm('حذف الفصل «' + c.name + '» مع كل نقاطه وسجله؟')) {
          S.classes = S.classes.filter(function (x) { return x.id !== id; });
          S.log = S.log.filter(function (e) { return e.c !== id; });
          S.sessions = S.sessions.filter(function (x) { return x.c !== id; });
          if (S.active && S.active.cid === id) S.active = null;
          save(); render();
        } break;
      case 'add-type': S.pointTypes.push({ id: uid('p'), emoji: '⭐', name: 'إنجاز جديد', category: 'تعلم', points: 1 }); save(); render(); break;
      case 'del-type':
        var p = typeById(id);
        if (p && confirm('حذف «' + p.name + '»؟ (النقاط المسجلة سابقًا تبقى كما هي)')) { S.pointTypes = S.pointTypes.filter(function (x) { return x.id !== id; }); save(); render(); }
        break;
      case 'add-level': var lv = sortedLevels(); S.levels.push({ min: (lv.length ? lv[lv.length - 1].min : 0) + 100, name: 'مستوى جديد', emoji: '⭐' }); save(); render(); break;
      case 'del-level':
        var sl = sortedLevels(); if (sl.length <= 1) { toast('لا بد من مستوى واحد على الأقل.', 'error'); break; }
        S.levels = sl.filter(function (x, i) { return i !== Number(id); }); save(); render(); break;
      case 'export-json': exportJson(); break;
      case 'export-csv': exportCsv(); break;
      case 'import': document.getElementById('importFile').click(); break;
      case 'reset': resetAll(); break;
    }
  });

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t.id === 'importFile') { if (t.files && t.files[0]) importJson(t.files[0]); return; }
    var scope = t.getAttribute('data-scope'); if (!scope) return;
    var id = t.getAttribute('data-id'), f = t.getAttribute('data-field'), v = t.value;
    var num = (f === 'min' || f === 'points' || f === 'offset');
    if (num) { v = parseInt(v, 10); if (isNaN(v)) v = 0; if (f === 'points' && v < 0) v = 0; }
    if (scope === 'class') { var c = cls(id); if (c) c[f] = num ? v : (v.trim() || c.name); }
    else if (scope === 'type') { var p = typeById(id); if (p) p[f] = num ? v : (v.trim() || p[f]); }
    else if (scope === 'level') {
      var sl = sortedLevels(), l = sl[Number(id)];
      if (l) { l[f] = num ? v : (v.trim() || l[f]); S.levels = sl; }
    }
    save();
    if (scope === 'level' && f === 'min') render();
  });

  document.addEventListener('visibilitychange', function () { if (!document.hidden && ui.view === 'board') render(); });
  setInterval(function () { if (ui.view === 'board' && !document.hidden) render(); }, 60000);

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(function () { });
  }

  render();
})();
