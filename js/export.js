// ============================================================
// export.js — Angel for Music Video Generator
// Single export (current tab) + Full package (ZIP)
// ============================================================

let exporting = false;

// ── Core: record one canvas, return Blob ─────────────────────
async function recordVideo(isYT) {
  setupAudio();
  if (!audioCtx) throw new Error('Audio konnte nicht initialisiert werden.');
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  const cv = document.getElementById(isYT ? 'yc' : 'tc');

  if (playing) { window.aud.pause(); playing = false; cancelAnimationFrame(anim); }
  window.aud.currentTime = 0;
  window.aud.volume = 0; // stumm während Export
  await new Promise(r => setTimeout(r, 200));
  if (bgVidSrc) { bgVidEl.currentTime = 0; }

  const canvasStream = cv.captureStream(30);
  mediaStreamDest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));

  const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  // TikTok: max 30 Sekunden
  const endTime = isYT
    ? window.aud.duration - 0.15
    : Math.min(30, window.aud.duration - 0.15);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const rec = new MediaRecorder(canvasStream, { mimeType: mime, videoBitsPerSecond: 4000000 });
    rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      window.aud.volume = 1; // Lautstärke wiederherstellen
      resolve(new Blob(chunks, { type: mime }));
    };
    rec.onerror = e => { window.aud.volume = 1; reject(e); };

    rec.start(200);
    window.aud.play();
    if (bgVidSrc) bgVidEl.play();

    function recLoop() {
      T += 0.035;
      if (analyserNode && dataArr) {
        analyserNode.getByteFrequencyData(dataArr);
        for (let i = 0; i < N; i++) {
          const idx = Math.floor(i * dataArr.length / N);
          bars[i].target = dataArr[idx] / 255;
          bars[i].h += (bars[i].target - bars[i].h) * 0.22;
        }
      }
      isYT ? dYT() : dTT();
      if (!window.aud.ended && window.aud.currentTime < endTime) {
        anim = requestAnimationFrame(recLoop);
      } else {
        setTimeout(() => rec.stop(), 400);
      }
    }
    recLoop();
  });
}

// ── Single export (aktiver Tab) ───────────────────────────────
async function startExport() {
  if (exporting || !window.aud || !cov) return;
  const isYT = tab === 'yt';
  exporting = true;
  document.getElementById('eb').disabled = true;
  document.getElementById('eb').textContent = '⏳ Exportiert…';
  document.getElementById('allBtn').disabled = true;
  setDot('rec', (isYT ? 'YouTube 1920×1080' : 'TikTok 1080×1920') + ' — Aufnahme läuft…');

  try {
    const blob = await recordVideo(isYT);
    const nm = sanitizeTitle(document.getElementById('sT').value || 'angel4music');
    downloadBlob(blob, nm + (isYT ? '_youtube_1920x1080' : '_tiktok_1080x1920') + '.webm');
    setDot('ok', '✓ Export fertig — Download gestartet!');
  } catch (e) {
    setDot('ok', '⚠ Fehler: ' + e.message);
    console.error(e);
  } finally {
    exporting = false;
    document.getElementById('eb').disabled = false;
    document.getElementById('eb').textContent = '⬇ Video exportieren';
    document.getElementById('allBtn').disabled = false;
    if (bgVidSrc) bgVidEl.pause();
    cancelAnimationFrame(anim);
    rd();
  }
}

// ── Square 1:1 aufnehmen ab Refrain, max 29s ─────────────────
async function recordSquare(startSec) {
  setupAudio();
  if (!audioCtx) throw new Error('Audio konnte nicht initialisiert werden.');
  if (audioCtx.state === 'suspended') await audioCtx.resume();

  const cv = document.getElementById('sqc');
  if (playing) { window.aud.pause(); playing = false; cancelAnimationFrame(anim); }
  window.aud.currentTime = startSec;
  window.aud.volume = 0;
  await new Promise(r => setTimeout(r, 200));
  if (bgVidSrc) { bgVidEl.currentTime = 0; }

  const canvasStream = cv.captureStream(30);
  mediaStreamDest.stream.getAudioTracks().forEach(t => canvasStream.addTrack(t));
  const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

  const endTime = Math.min(startSec + 29, window.aud.duration - 0.15);

  return new Promise((resolve, reject) => {
    const chunks = [];
    const rec = new MediaRecorder(canvasStream, { mimeType: mime, videoBitsPerSecond: 4000000 });
    rec.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => { window.aud.volume = 1; resolve(new Blob(chunks, { type: mime })); };
    rec.onerror = e => { window.aud.volume = 1; reject(e); };

    rec.start(200);
    window.aud.play();
    if (bgVidSrc) bgVidEl.play();

    function recLoop() {
      T += 0.035;
      dSQ();
      if (!window.aud.ended && window.aud.currentTime < endTime) {
        anim = requestAnimationFrame(recLoop);
      } else {
        setTimeout(() => rec.stop(), 400);
      }
    }
    recLoop();
  });
}

// ── Alles exportieren: YouTube + TikTok + Square + Beschreibung → ZIP
async function exportAll() {
  if (exporting || !window.aud || !cov) return;
  if (typeof JSZip === 'undefined') { alert('JSZip nicht geladen — Seite neu laden.'); return; }

  exporting = true;
  const allBtn = document.getElementById('allBtn');
  allBtn.disabled = true;
  document.getElementById('eb').disabled = true;

  const nm = sanitizeTitle(document.getElementById('sT').value || 'angel4music');
  const zip = new JSZip();
  const folder = zip.folder(nm);
  const refrainSec = getRefrainSeconds();
  const totalSteps = refrainSec !== null ? 4 : 3;
  let step = 1;

  try {
    // YouTube
    setDot('rec', step + '/' + totalSteps + ' — YouTube 1920×1080 aufnehmen…');
    allBtn.textContent = '⏳ ' + step + '/' + totalSteps + ' YouTube…';
    const ytBlob = await recordVideo(true);
    folder.file(nm + '_youtube_1920x1080.webm', ytBlob);
    step++;

    await new Promise(r => setTimeout(r, 600));

    // TikTok
    setDot('rec', step + '/' + totalSteps + ' — TikTok 1080×1920 aufnehmen…');
    allBtn.textContent = '⏳ ' + step + '/' + totalSteps + ' TikTok…';
    const ttBlob = await recordVideo(false);
    folder.file(nm + '_tiktok_1080x1920.webm', ttBlob);
    step++;

    await new Promise(r => setTimeout(r, 600));

    // Instagram Square (nur wenn Refrain-Zeit gesetzt)
    if (refrainSec !== null) {
      setDot('rec', step + '/' + totalSteps + ' — Instagram 1080×1080 (29s ab ' + fmt(refrainSec) + ')…');
      allBtn.textContent = '⏳ ' + step + '/' + totalSteps + ' Instagram…';
      const sqBlob = await recordSquare(refrainSec);
      folder.file(nm + '_instagram_1080x1080_29s.webm', sqBlob);
      step++;
      await new Promise(r => setTimeout(r, 400));
    }

    // Beschreibung + ZIP
    folder.file('beschreibung.txt', buildBeschreibung());
    setDot('ok', step + '/' + totalSteps + ' — ZIP wird gepackt…');
    allBtn.textContent = '⏳ ' + step + '/' + totalSteps + ' ZIP…';
    const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    downloadBlob(zipBlob, nm + '.zip');
    setDot('ok', '✓ ' + nm + '.zip — Download gestartet!');

  } catch (e) {
    setDot('ok', '⚠ Fehler: ' + e.message);
    console.error(e);
  } finally {
    exporting = false;
    allBtn.disabled = false;
    allBtn.textContent = '📦 Alles exportieren';
    document.getElementById('eb').disabled = false;
    if (bgVidSrc) bgVidEl.pause();
    cancelAnimationFrame(anim);
    rd();
  }
}

// ── Helpers ───────────────────────────────────────────────────
function buildBeschreibung() {
  if (window._aiData && window._aiData.title) {
    return 'TITEL:\n' + window._aiData.title +
           '\n\nBESCHREIBUNG:\n' + window._aiData.desc +
           '\n\nHASHTAGS:\n' + window._aiData.tags;
  }
  const songTitle = document.getElementById('sT').value || 'Unbekannter Song';
  return 'TITEL:\n' + songTitle + ' – Angel for Music | Official Audio\n\n' +
         '(Noch keine KI-Beschreibung generiert)\n\nGenre: ' + (genre || 'balladen');
}

function sanitizeTitle(t) {
  return t.trim()
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
