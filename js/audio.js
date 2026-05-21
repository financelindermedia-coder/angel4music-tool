// ============================================================
// audio.js — Angel for Music Video Generator
// Audio pipeline: Preview + Export (single AudioContext)
// ============================================================

let audioCtx = null, sourceNode = null, analyserNode = null;
let mediaStreamDest = null, dataArr = null;
let playing = false, anim = null;

// Exposed globally so canvas.js drawProgress can read time
window.aud = null;

function hMP3(inp) {
  const f = inp.files[0]; if (!f) return;
  if (window.aud) { window.aud.pause(); window.aud.src = ''; }
  // Reset audio context so it can be re-created for new file
  audioCtx = null; sourceNode = null; analyserNode = null;
  mediaStreamDest = null; dataArr = null;

  window.aud = new Audio(URL.createObjectURL(f));
  window.aud.addEventListener('loadedmetadata', () => {
    document.getElementById('ml').textContent = '✓ ' + f.name.slice(0, 18);
    document.getElementById('mz').classList.add('ok');
    chk();
  });
  window.aud.addEventListener('timeupdate', () => {
    if (!window.aud.duration) return;
    document.getElementById('pg').style.width = (window.aud.currentTime / window.aud.duration * 100) + '%';
    document.getElementById('td').textContent = fmt(window.aud.currentTime) + ' / ' + fmt(window.aud.duration);
  });
  window.aud.addEventListener('ended', () => {
    playing = false;
    cancelAnimationFrame(anim);
    if (bgVidSrc) bgVidEl.pause();
    setDot('ok', 'Fertig');
    document.getElementById('pb').textContent = '▶ Vorschau';
    rd();
  });
}

function setupAudio() {
  if (audioCtx || !window.aud) return;
  try {
    audioCtx = new AudioContext();
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 256;
    dataArr = new Uint8Array(analyserNode.frequencyBinCount);
    mediaStreamDest = audioCtx.createMediaStreamDestination();
    sourceNode = audioCtx.createMediaElementSource(window.aud);
    sourceNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);   // speakers (preview)
    analyserNode.connect(mediaStreamDest);          // recorder (export)
  } catch (e) { console.warn('AudioCtx error:', e); }
}

function chk() {
  const ok = cov && window.aud;
  document.getElementById('pb').disabled = !ok;
  document.getElementById('eb').disabled = !ok;
  document.getElementById('allBtn').disabled = !ok;
  document.getElementById('addToBatchBtn').disabled = !ok;
  if (ok) setDot('ok', 'Bereit!');
}

function setDot(state, msg) {
  const d = document.getElementById('dot');
  d.className = 'dot' + (state === 'ok' ? ' ok' : state === 'rec' ? ' rec' : '');
  document.getElementById('stxt').textContent = msg;
}

function tPlay() {
  if (!window.aud || !cov) return;
  if (playing) {
    window.aud.pause(); playing = false;
    cancelAnimationFrame(anim);
    if (bgVidSrc) bgVidEl.pause();
    setDot('ok', 'Pausiert');
    document.getElementById('pb').textContent = '▶ Vorschau';
    rd();
  } else {
    setupAudio();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    window.aud.play(); playing = true;
    if (bgVidSrc) { bgVidEl.currentTime = 0; bgVidEl.play(); }
    setDot('ok', 'Spielt ab…');
    document.getElementById('pb').textContent = '⏸ Pause';
    loop();
  }
}

function loop() {
  T += 0.035;
  if (analyserNode && dataArr) {
    analyserNode.getByteFrequencyData(dataArr);
    for (let i = 0; i < N; i++) {
      const idx = Math.floor(i * dataArr.length / N);
      bars[i].target = dataArr[idx] / 255;
      bars[i].h += (bars[i].target - bars[i].h) * 0.22;
    }
  } else {
    for (let i = 0; i < N; i++) bars[i].h = 0.15 + 0.2 * Math.sin(T * 2 + bars[i].ph);
  }
  tab === 'yt' ? dYT() : dTT();
  if (playing) anim = requestAnimationFrame(loop);
}
