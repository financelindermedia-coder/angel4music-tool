// ============================================================
// batch.js — Angel for Music Video Generator
// Batch-Warteschlange: mehrere Songs auf einmal exportieren
// ============================================================

window.batchQueue = [];
let wakeLock = null;

async function acquireWakeLock() {
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) {
      console.warn('Wake Lock nicht verfügbar:', e);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

function notifyDone(songCount, zipName) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('✅ Angel for Music — Batch fertig!', {
      body: songCount + ' Songs exportiert → ' + zipName,
      icon: ''
    });
  }
  // Akustisches Signal
  try {
    const ctx = new AudioContext();
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.25);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.3);
    });
  } catch (e) {}
}

function addToBatch() {
  if (!window.aud || !cov) {
    alert('Bitte zuerst MP3 und Cover laden!');
    return;
  }
  const item = {
    id: Date.now(),
    title: document.getElementById('sT').value || 'Unbekannter Song',
    genre: genre,
    blur: document.getElementById('slBlur').value,
    bright: document.getElementById('slBright').value,
    refrainInput: document.getElementById('refrainInput').value || '0:00',
    mp3Url: window.aud.src,
    covImg: cov,
    bgImgEl: bgImg,
    bgVidUrl: bgVidSrc,
    aiData: window._aiData ? { ...window._aiData } : null
  };
  window.batchQueue.push(item);
  renderBatchList();
}

function removeFromBatch(id) {
  window.batchQueue = window.batchQueue.filter(i => i.id !== id);
  renderBatchList();
}

function clearBatch() {
  if (!window.batchQueue.length) return;
  if (!confirm('Alle ' + window.batchQueue.length + ' Songs aus der Liste entfernen?')) return;
  window.batchQueue = [];
  renderBatchList();
}

function renderBatchList() {
  const list = document.getElementById('batchList');
  const btn = document.getElementById('batchExportBtn');
  const addBtn = document.getElementById('addToBatchBtn');
  const count = window.batchQueue.length;

  btn.textContent = count > 0
    ? '🎬 Batch exportieren (' + count + ' Song' + (count > 1 ? 's' : '') + ')'
    : '🎬 Batch exportieren';
  btn.disabled = count === 0;

  if (addBtn) addBtn.textContent = count > 0
    ? '➕ Hinzufügen (' + count + ')'
    : '➕ Zur Batch-Liste';

  if (count === 0) {
    list.innerHTML = '<div style="font-size:12px;color:#555;padding:6px 0">Noch leer — MP3 + Cover laden und auf "➕ Zur Batch-Liste" klicken.</div>';
    return;
  }

  list.innerHTML = window.batchQueue.map((item, idx) => `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:0.5px solid #252525">
      <span style="font-size:11px;color:#555;min-width:18px;text-align:right">${idx + 1}</span>
      <img src="${item.covImg.src}" style="width:32px;height:32px;border-radius:4px;object-fit:cover;flex-shrink:0">
      <span style="flex:1;font-size:13px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escB(item.title)}</span>
      <span style="font-size:11px;color:#666;flex-shrink:0">${item.genre}</span>
      ${item.refrainInput !== '0:00' ? '<span style="font-size:11px;color:#c8860a;flex-shrink:0">⏱ ' + escB(item.refrainInput) + '</span>' : ''}
      <button onclick="removeFromBatch(${item.id})" style="background:none;border:none;color:#555;cursor:pointer;font-size:16px;padding:0 4px;line-height:1" title="Entfernen">×</button>
    </div>
  `).join('');
}

function escB(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function batchExport() {
  const queue = window.batchQueue;
  if (!queue || queue.length === 0) return;
  if (exporting) return;
  if (typeof JSZip === 'undefined') { alert('JSZip nicht geladen — Seite neu laden.'); return; }

  exporting = true;
  const batchBtn = document.getElementById('batchExportBtn');
  const addBtn = document.getElementById('addToBatchBtn');
  batchBtn.disabled = true;
  if (addBtn) addBtn.disabled = true;
  document.getElementById('allBtn').disabled = true;
  document.getElementById('eb').disabled = true;

  // PC-Schlaf verhindern + Benachrichtigungsberechtigung holen
  await acquireWakeLock();
  await requestNotificationPermission();

  // Aktuellen Zustand sichern
  const saved = {
    aud: window.aud,
    cov: cov,
    bgImg: bgImg,
    bgVidSrc: bgVidSrc,
    genre: genre,
    title: document.getElementById('sT').value,
    blur: document.getElementById('slBlur').value,
    bright: document.getElementById('slBright').value,
    refrain: document.getElementById('refrainInput').value,
    aiData: window._aiData
  };

  const masterZip = new JSZip();

  try {
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      const nm = sanitizeTitle(item.title);
      const folder = masterZip.folder(nm);
      const label = 'Song ' + (i + 1) + '/' + queue.length + ' — ' + item.title;

      // Zustand auf diesen Song setzen
      cov = item.covImg;
      bgImg = item.bgImgEl;
      bgVidSrc = item.bgVidUrl;
      if (item.bgVidUrl) { bgVidEl.src = item.bgVidUrl; bgVidEl.load(); }
      genre = item.genre;
      window._aiData = item.aiData;
      document.getElementById('sT').value = item.title;
      document.getElementById('slBlur').value = item.blur;
      document.getElementById('slBright').value = item.bright;
      document.getElementById('refrainInput').value = item.refrainInput;

      // Neues Audio-Element für diesen Song
      window.aud = new Audio(item.mp3Url);
      await new Promise((res, rej) => {
        window.aud.addEventListener('loadedmetadata', res, { once: true });
        window.aud.addEventListener('error', rej, { once: true });
      });

      // Audio-Kontext zurücksetzen (wird in recordVideo neu erstellt)
      audioCtx = null; sourceNode = null; analyserNode = null;
      mediaStreamDest = null; dataArr = null;

      // YouTube
      setDot('rec', label + ' — YouTube…');
      batchBtn.textContent = '⏳ ' + (i + 1) + '/' + queue.length + ' YouTube…';
      const ytBlob = await recordVideo(true);
      folder.file(nm + '_youtube_1920x1080.webm', ytBlob);

      await new Promise(r => setTimeout(r, 400));

      // TikTok
      setDot('rec', label + ' — TikTok…');
      batchBtn.textContent = '⏳ ' + (i + 1) + '/' + queue.length + ' TikTok…';
      const ttBlob = await recordVideo(false);
      folder.file(nm + '_tiktok_1080x1920.webm', ttBlob);

      // Instagram Square (wenn Refrain gesetzt)
      if (item.refrainInput && item.refrainInput !== '0:00') {
        await new Promise(r => setTimeout(r, 400));
        setDot('rec', label + ' — Instagram…');
        batchBtn.textContent = '⏳ ' + (i + 1) + '/' + queue.length + ' Instagram…';
        const refrainSec = parseRefrainStr(item.refrainInput);
        const sqBlob = await recordSquare(refrainSec);
        folder.file(nm + '_instagram_1080x1080_29s.webm', sqBlob);
      }

      // Beschreibung
      folder.file('beschreibung.txt', buildBeschreibung());

      await new Promise(r => setTimeout(r, 300));
    }

    // ZIP erstellen & herunterladen
    setDot('ok', 'ZIP wird erstellt…');
    batchBtn.textContent = '⏳ ZIP…';
    const zipBlob = await masterZip.generateAsync({ type: 'blob', compression: 'STORE' });
    const date = new Date().toISOString().slice(0, 10);
    const zipName = 'a4m_batch_' + date + '_' + queue.length + 'songs.zip';
    downloadBlob(zipBlob, zipName);
    setDot('ok', '✓ Batch fertig — ' + queue.length + ' Songs exportiert!');
    notifyDone(queue.length, zipName);

  } catch (e) {
    setDot('ok', '⚠ Fehler bei Batch: ' + e.message);
    releaseWakeLock();
    console.error(e);
  } finally {
    // Ursprünglichen Zustand wiederherstellen
    window.aud = saved.aud;
    cov = saved.cov;
    bgImg = saved.bgImg;
    bgVidSrc = saved.bgVidSrc;
    genre = saved.genre;
    window._aiData = saved.aiData;
    document.getElementById('sT').value = saved.title;
    document.getElementById('slBlur').value = saved.blur;
    document.getElementById('slBright').value = saved.bright;
    document.getElementById('refrainInput').value = saved.refrain;

    audioCtx = null; sourceNode = null; analyserNode = null;
    mediaStreamDest = null; dataArr = null;

    releaseWakeLock();
    exporting = false;
    renderBatchList();
    batchBtn.disabled = false;
    if (addBtn) addBtn.disabled = false;
    document.getElementById('allBtn').disabled = false;
    document.getElementById('eb').disabled = false;
    if (bgVidSrc) bgVidEl.pause();
    cancelAnimationFrame(anim);
    rd();
  }
}

function parseRefrainStr(val) {
  if (!val || val === '0:00') return 0;
  const parts = val.split(':');
  return parts.length === 2 ? parseInt(parts[0]) * 60 + parseFloat(parts[1]) : parseFloat(val) || 0;
}
