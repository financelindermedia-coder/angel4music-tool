// ============================================================
// canvas.js — Angel for Music Video Generator
// Rendering: Background, Ring-Visualizer, Waveform, Cover, Text
// ============================================================

const N = 100;
let bars = Array.from({ length: N }, (_, i) => ({
  h: 0, target: 0, ph: Math.random() * Math.PI * 2
}));
let T = 0;
let tab = 'yt';
let genre = 'balladen';
let cov = null, bgImg = null, bgVidSrc = null;
const bgVidEl = document.getElementById('bgVidEl');
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

// ── File handlers ─────────────────────────────────────────────
function hCover(inp) {
  const f = inp.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    cov = img;
    document.getElementById('cl').textContent = '✓ ' + f.name.slice(0, 18);
    document.getElementById('cz').classList.add('ok');
    chk(); rd();
  };
  img.src = URL.createObjectURL(f);
}

function hBgImg(inp) {
  const f = inp.files[0]; if (!f) return;
  const img = new Image();
  img.onload = () => {
    bgImg = img; bgVidSrc = null; bgVidEl.src = '';
    document.getElementById('bil').textContent = '✓ ' + f.name.slice(0, 16);
    document.getElementById('biz').classList.add('ok');
    document.getElementById('bvz').classList.remove('ok');
    document.getElementById('bvl').textContent = 'Hintergrund-Video';
    rd();
  };
  img.src = URL.createObjectURL(f);
}

function hBgVid(inp) {
  const f = inp.files[0]; if (!f) return;
  bgVidSrc = URL.createObjectURL(f);
  bgImg = null;
  bgVidEl.src = bgVidSrc;
  bgVidEl.load();
  bgVidEl.addEventListener('loadeddata', () => {
    document.getElementById('bvl').textContent = '✓ ' + f.name.slice(0, 16);
    document.getElementById('bvz').classList.add('ok');
    document.getElementById('biz').classList.remove('ok');
    document.getElementById('bil').textContent = 'Hintergrund-Bild';
    rd();
  }, { once: true });
}

function hText(inp) {
  const f = inp.files[0]; if (!f) return;
  const ext = f.name.split('.').pop().toLowerCase();

  if (ext === 'txt') {
    const r = new FileReader();
    r.onload = e => setLyrics(e.target.result, f.name);
    r.readAsText(f, 'UTF-8');

  } else if (ext === 'textclipping') {
    const r = new FileReader();
    r.onload = e => {
      // bplist binary: UTF-8 text is embedded after the metadata header
      const raw = new TextDecoder('utf-8', { fatal: false }).decode(e.target.result);
      // The lyrics follow the last metadata key (ends with _<text>)
      // Find the first real line: skip binary chars and known metadata tokens
      const lines = raw.split(/\r?\n/);
      const cleaned = lines
        .map(l => l.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '').trim())
        .filter(l => l.length > 0)
        // Skip the bplist header line(s) that contain UTI metadata
        .filter(l => !l.match(/^bplist|public\.|com\.apple\.|webarchive|\\u[0-9a-f]{4}/i))
        // Remove leading underscores from first line (bplist artifact)
        .map((l, i) => i === 0 ? l.replace(/^_+/, '') : l);
      setLyrics(cleaned.join('\n'), f.name);
    };
    r.readAsArrayBuffer(f);

  } else if (ext === 'rtf') {
    const r = new FileReader();
    r.onload = e => {
      setLyrics(parseRtf(e.target.result), f.name);
    };
    r.readAsText(f, 'UTF-8');

  } else if (ext === 'docx') {
    parseDocx(f).then(text => setLyrics(text, f.name))
      .catch(() => alert('DOCX konnte nicht gelesen werden.'));

  } else {
    alert('Format nicht unterstützt. Bitte .txt, .textClipping, .rtf oder .docx verwenden.');
  }
}

function setLyrics(text, filename) {
  document.getElementById('lyrics').value = text.trim();
  document.getElementById('txl').textContent = '✓ ' + filename.slice(0, 20);
  document.getElementById('txz').classList.add('ok');
}

function parseRtf(rtf) {
  // Handle \uN? unicode escapes first
  let t = rtf.replace(/\\u(-?\d+)\??/g, (_, n) => {
    const code = parseInt(n); return String.fromCharCode(code < 0 ? code + 65536 : code);
  });
  // Remove RTF groups ({\*...} and nested braces)
  let prev = '';
  while (prev !== t) { prev = t; t = t.replace(/\{[^{}]*\}/g, ''); }
  // Paragraph breaks
  t = t.replace(/\\par[d ]?/g, '\n');
  t = t.replace(/\\line\b/g, '\n');
  // Remove all remaining control words and symbols
  t = t.replace(/\\[a-z*]+[-]?\d* ?/gi, '');
  t = t.replace(/[{}\\]/g, '');
  // Clean up whitespace
  return t.replace(/\r\n|\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function parseDocx(file) {
  // JSZip must be loaded (added in generator.html)
  if (typeof JSZip === 'undefined') throw new Error('JSZip nicht geladen');
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file('word/document.xml').async('string');
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  // w:p = paragraph, w:t = text run, w:br = line break
  const lines = [];
  doc.querySelectorAll('w\\:p, p').forEach(para => {
    const parts = [];
    para.querySelectorAll('w\\:t, t').forEach(t => parts.push(t.textContent));
    lines.push(parts.join(''));
  });
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function setGenre(g, el) {
  genre = g;
  document.querySelectorAll('.gp').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function sw(t2, el) {
  tab = t2;
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('yv').style.display = t2 === 'yt' ? 'block' : 'none';
  document.getElementById('tv').style.display = t2 === 'tt' ? 'block' : 'none';
  document.getElementById('sqv').style.display = t2 === 'sq' ? 'block' : 'none';
  document.getElementById('refrainRow').style.display = t2 === 'sq' ? 'block' : 'none';
  rd();
}

// ── Static redraw ─────────────────────────────────────────────
function rd() {
  document.getElementById('slBlurV').textContent = document.getElementById('slBlur').value + 'px';
  document.getElementById('slBrightV').textContent = document.getElementById('slBright').value + '%';
  for (let i = 0; i < N; i++) bars[i].h = 0.1 + 0.1 * Math.sin(T + bars[i].ph);
  if (tab === 'yt') dYT();
  else if (tab === 'tt') dTT();
  else if (tab === 'sq') dSQ();
}

// ── Refrain helpers ───────────────────────────────────────────
function setRefrainNow() {
  const t = window.aud ? window.aud.currentTime : 0;
  document.getElementById('refrainInput').value = fmt(t);
  document.getElementById('refrainHint').textContent = '✓ Gesetzt bei ' + fmt(t);
}

function getRefrainSeconds() {
  const val = document.getElementById('refrainInput').value.trim();
  if (!val || val === '0:00') return 0;
  const parts = val.split(':');
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  return parseFloat(val) || 0;
}

// ── Background ────────────────────────────────────────────────
function drawBg(ctx, W, H) {
  const src = bgVidSrc ? bgVidEl : (bgImg || cov);
  if (!src) { ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, W, H); return; }
  const blur = parseInt(document.getElementById('slBlur').value);
  const bright = parseInt(document.getElementById('slBright').value) / 100;
  let sw2 = src.videoWidth || src.naturalWidth || W;
  let sh2 = src.videoHeight || src.naturalHeight || H;
  const scale = Math.max(W / sw2, H / sh2) * 1.12;
  const dw = sw2 * scale, dh = sh2 * scale;
  const ox = (W - dw) / 2, oy = (H - dh) / 2;
  ctx.save();
  ctx.filter = 'blur(' + blur + 'px) brightness(' + bright + ') saturate(1.25)';
  ctx.drawImage(src, ox, oy, dw, dh);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 0, W, H);
}

// ── Ring Visualizer ───────────────────────────────────────────
function drawRing(ctx, cx, cy, R, pulse) {
  const vR = R * pulse;
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 - Math.PI / 2;
    const bh = bars[i].h;
    const len = bh * 60 + 3;
    const x1 = cx + Math.cos(ang) * (vR - 1), y1 = cy + Math.sin(ang) * (vR - 1);
    const x2 = cx + Math.cos(ang) * (vR + len), y2 = cy + Math.sin(ang) * (vR + len);
    ctx.save();
    ctx.strokeStyle = '#e8a820'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.globalAlpha = 0.18 + bh * 0.82;
    ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = bh * 32 + 10;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.globalAlpha = 0.07 + bh * 0.3; ctx.lineWidth = 5; ctx.shadowBlur = bh * 14 + 4;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  }
  ctx.save(); ctx.strokeStyle = '#e8a820'; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.2;
  ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(cx, cy, vR, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
}

// ── Cover ─────────────────────────────────────────────────────
function drawCover(ctx, cx, cy, S, pulse) {
  const cs = S * pulse;
  ctx.save(); ctx.beginPath(); ctx.roundRect(cx - cs / 2, cy - cs / 2, cs, cs, 10); ctx.clip();
  ctx.drawImage(cov, cx - cs / 2, cy - cs / 2, cs, cs); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(232,168,32,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(cx - cs / 2, cy - cs / 2, cs, cs, 10); ctx.stroke(); ctx.restore();
}

// ── Waveform ──────────────────────────────────────────────────
function drawWave(ctx, cx, wW, cy, maxH) {
  const half = Math.floor(N / 2);
  const segW = wW / half;
  const startX = cx - wW / 2;
  for (let i = 0; i < half; i++) {
    const bh = bars[i].h;
    const h = bh * maxH + 2;
    const xc = startX + i * segW + segW * 0.5;
    const w = Math.max(1.2, segW * 0.42);
    ctx.save(); ctx.fillStyle = '#e8a820'; ctx.globalAlpha = 0.16 + bh * 0.84;
    ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = bh * 22 + 6;
    ctx.beginPath(); ctx.roundRect(xc - w / 2, cy - h / 2, w, h, 1); ctx.fill(); ctx.restore();
  }
}

// ── Text helpers ──────────────────────────────────────────────
function wrapText(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const t2 = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t2).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t2;
  }
  if (cur) lines.push(cur); return lines;
}

function drawProgress(ctx, cx, y, progW, aud, scale) {
  const s = scale || 1;
  const barH = 5 * s;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath(); ctx.roundRect(cx - progW / 2, y, progW, barH, 2); ctx.fill();
  const pct = aud ? aud.currentTime / (aud.duration || 1) : 0;
  if (pct > 0) {
    ctx.fillStyle = '#e8a820'; ctx.shadowColor = '#ffcc44'; ctx.shadowBlur = 6 * s;
    ctx.beginPath(); ctx.roundRect(cx - progW / 2, y, progW * pct, barH, 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = Math.round(11 * s) + 'px Inter';
  ctx.textAlign = 'center';
  ctx.fillText((aud ? fmt(aud.currentTime) : '0:00') + ' / ' + (aud ? fmt(aud.duration || 0) : '0:00'), cx, y + 22 * s);
  ctx.textAlign = 'left';
}

// ── YouTube 16:9 — 1920×1080 ──────────────────────────────────
function dYT() {
  const cv = document.getElementById('yc');
  const ctx = cv.getContext('2d');
  const W = 1920, H = 1080;
  ctx.clearRect(0, 0, W, H);
  drawBg(ctx, W, H);
  if (!cov) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.font = '32px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Cover & MP3 laden für Vorschau', W / 2, H / 2); ctx.textAlign = 'left'; return;
  }
  const cx = W / 2;
  const RING_R = 265, COVER_S = 460;
  const pulse = 1 + 0.022 * Math.sin(T * 1.8);
  const coverY = RING_R + 30;
  const waveY  = coverY + RING_R + 50;
  const WAVE_H = 100;
  const titleY = waveY + WAVE_H / 2 + 140;
  const progY  = titleY + 160;

  drawRing(ctx, cx, coverY, RING_R, pulse);
  drawCover(ctx, cx, coverY, COVER_S, pulse);
  drawWave(ctx, cx, W * 0.82, waveY, WAVE_H);

  const title = (document.getElementById('sT').value || 'MY SONG').toUpperCase();
  ctx.font = 'bold 104px "Bebas Neue",sans-serif';
  const lines = wrapText(ctx, title, W * 0.86);
  ctx.save(); ctx.textAlign = 'center';
  lines.forEach((ln, i) => {
    ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 32;
    ctx.font = 'bold 104px "Bebas Neue",sans-serif';
    ctx.fillText(ln, cx, titleY + i * 108);
  });
  ctx.restore();
  drawProgress(ctx, cx, progY, 560, window.aud, 2);
}

// ── TikTok 9:16 — 1080×1920 ───────────────────────────────────
function dTT() {
  const cv = document.getElementById('tc');
  const ctx = cv.getContext('2d');
  const W = 1080, H = 1920;
  ctx.clearRect(0, 0, W, H);
  drawBg(ctx, W, H);
  if (!cov) return;
  const cx = W / 2;
  const RING_R = 304, COVER_S = 432;
  const pulse = 1 + 0.022 * Math.sin(T * 1.8);
  const coverY = RING_R + 75;
  const waveY  = coverY + RING_R + 69;
  const WAVE_H = 149;
  const titleY = waveY + WAVE_H / 2 + 144;
  const progY  = titleY + 192;

  drawRing(ctx, cx, coverY, RING_R, pulse);
  drawCover(ctx, cx, coverY, COVER_S, pulse);
  drawWave(ctx, cx, W * 0.88, waveY, WAVE_H);

  const title = (document.getElementById('sT').value || 'MY SONG').toUpperCase();
  ctx.font = 'bold 117px "Bebas Neue",sans-serif';
  const lines = wrapText(ctx, title, W - 117);
  ctx.save(); ctx.textAlign = 'center';
  lines.forEach((ln, i) => {
    ctx.fillStyle = i === 0 ? '#ffffff' : '#e8a820';
    ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 37;
    ctx.font = 'bold 117px "Bebas Neue",sans-serif';
    ctx.fillText(ln, cx, titleY + i * 133);
  });
  ctx.restore();
  drawProgress(ctx, cx, progY, 560, window.aud, 2.67);
}

// ── Instagram/Square 1:1 — 1080×1080 ─────────────────────────
function dSQ() {
  const cv = document.getElementById('sqc');
  const ctx = cv.getContext('2d');
  const W = 1080, H = 1080;
  ctx.clearRect(0, 0, W, H);

  // Background: blurred cover (or bgImg/bgVid if loaded)
  const src = bgVidSrc ? bgVidEl : (bgImg || cov);
  if (src) {
    const blur = parseInt(document.getElementById('slBlur').value);
    const bright = parseInt(document.getElementById('slBright').value) / 100;
    let sw2 = src.videoWidth || src.naturalWidth || W;
    let sh2 = src.videoHeight || src.naturalHeight || H;
    const scale = Math.max(W / sw2, H / sh2) * 1.12;
    const dw = sw2 * scale, dh = sh2 * scale;
    ctx.save();
    ctx.filter = 'blur(' + blur + 'px) brightness(' + bright + ') saturate(1.2)';
    ctx.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, H);
  }

  if (!cov) {
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '32px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Cover laden für Vorschau', W / 2, H / 2);
    ctx.textAlign = 'left';
    return;
  }

  // Cover centered, square, ~89% of canvas
  const S = 960;
  const cx = W / 2, cy = H / 2;
  const radius = 22;

  // Schatten hinter dem Cover
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 90;
  ctx.shadowOffsetY = 18;
  ctx.beginPath();
  ctx.roundRect(cx - S / 2, cy - S / 2, S, S, radius);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.restore();

  // Cover Bild
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(cx - S / 2, cy - S / 2, S, S, radius);
  ctx.clip();
  ctx.drawImage(cov, cx - S / 2, cy - S / 2, S, S);
  ctx.restore();

  // Feiner Gold-Rahmen
  ctx.save();
  ctx.strokeStyle = 'rgba(232,168,32,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(cx - S / 2, cy - S / 2, S, S, radius);
  ctx.stroke();
  ctx.restore();
}
