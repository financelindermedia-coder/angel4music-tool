// ============================================================
// ai-description.js — Angel for Music Video Generator
// KI-Beschreibung + Hashtags via OpenAI (ChatGPT) API
// ============================================================

const GENRE_META = {
  balladen: {
    de: 'emotionale Ballade / Schlager',
    tags: '#AngelForMusic #Balladen #Schlager #Herzschmerz #Deutsch #RainerEngel #NewMusic #MusicVideo #Liebe #Gefühle #Singer #Songwriter'
  },
  wiesn: {
    de: 'Volksmusik / Oktoberfest / Wiesn',
    tags: '#AngelForMusic #Oktoberfest #Wiesn #VolksMusik #Bayern #Prost #Schlager #RainerEngel #Party #Stimmung #Volksfest #Gaudi'
  },
  hard: {
    de: 'Rock / Hardrock / deutschsprachiger Rock',
    tags: '#AngelForMusic #Rock #HardRock #GermanRock #RainerEngel #MusicVideo #NewRelease #Heavy #Metal #RockDeutsch #Gitarre #Riff'
  }
};

function getApiKey() {
  return localStorage.getItem('a4m_openai_key') || '';
}

function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) return;
  localStorage.setItem('a4m_openai_key', key);
  document.getElementById('apiKeySaved').textContent = '✓ Gespeichert';
  setTimeout(() => document.getElementById('apiKeySaved').textContent = '', 2000);
}

function loadSavedApiKey() {
  const saved = getApiKey();
  if (saved) {
    document.getElementById('apiKeyInput').value = saved;
    document.getElementById('apiKeySaved').textContent = '✓ API-Key geladen';
    setTimeout(() => document.getElementById('apiKeySaved').textContent = '', 2000);
  }
}

async function generateAI() {
  const apiKey = getApiKey();
  if (!apiKey) {
    alert('Bitte erst den OpenAI API-Key eingeben und speichern!');
    document.getElementById('apiKeyInput').focus();
    return;
  }

  const btn = document.getElementById('aiBtn');
  const status = document.getElementById('aiStatus');
  btn.disabled = true; btn.textContent = '⏳ Generiere…'; status.textContent = '';

  const title = document.getElementById('sT').value || 'Unbekannter Song';
  const lyrics = document.getElementById('lyrics').value || '';
  const gm = GENRE_META[genre] || GENRE_META.balladen;

  const prompt = `Du bist YouTube-Manager für den Musikkanal "Angel for Music" von Rainer Engel aus Deutschland.

Erstelle YouTube-Metadaten für diesen Song:
- Titel: "${title}"
- Genre: ${gm.de}
- Songtext: ${lyrics ? '"' + lyrics.slice(0, 800) + '"' : 'nicht angegeben, schätze aus dem Titel'}

Antworte NUR mit diesem JSON-Objekt, kein Markdown, keine Erklärung:
{
  "youtube_titel": "Song-Titel – Angel for Music | Official Audio",
  "beschreibung": "5-8 Sätze emotionale Beschreibung auf Deutsch.\\n\\n🎵 Überall streamen: [LINK]\\nSpotify: [LINK] | Apple Music: [LINK] | YouTube Music: [LINK]\\n\\n🎸 Über Angel for Music:\\nAngel for Music ist das Musikprojekt von Rainer Engel – authentische Musik mit Herz und Leidenschaft.\\n\\n📱 Folge uns:\\nInstagram: [LINK] | TikTok: [LINK] | Facebook: [LINK]",
  "hashtags": "12-15 relevante Hashtags als ein String getrennt durch Leerzeichen"
}`;

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || 'API Fehler');
    if (!data.choices || !data.choices[0]) throw new Error('Keine Antwort von API');
    let raw = data.choices[0].message.content;
    raw = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    showAIResult(parsed, gm.tags);
  } catch (e) {
    status.textContent = '⚠ Fehler: ' + e.message;
    console.error(e);
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ Beschreibung generieren';
  }
}

function showAIResult(p, fallbackTags) {
  const tags = (p.hashtags || fallbackTags).split(/\s+/).filter(t => t.startsWith('#'));

  document.getElementById('aiTitleOut').innerHTML =
    '<strong style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">YouTube Titel</strong><br>' +
    '<span style="font-size:14px;font-weight:600">' + esc(p.youtube_titel || '') + '</span>';

  document.getElementById('aiDescOut').innerHTML =
    '<strong style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Beschreibung</strong><br>' +
    '<span>' + esc(p.beschreibung || '').replace(/\n/g, '<br>') + '</span>';

  document.getElementById('aiTagsOut').innerHTML =
    '<strong style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888">Hashtags</strong><br>' +
    tags.map(t => '<span class="tag">' + esc(t) + '</span>').join(' ');

  document.getElementById('aiResult').classList.add('show');
  document.getElementById('copyBtn').style.display = 'inline-flex';

  window._aiData = {
    title: p.youtube_titel,
    desc: p.beschreibung,
    tags: tags.join(' ')
  };
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function copyAll() {
  if (!window._aiData) return;
  const d = window._aiData;
  const txt = 'TITEL:\n' + d.title + '\n\nBESCHREIBUNG:\n' + d.desc + '\n\nHASHTAGS:\n' + d.tags;
  navigator.clipboard.writeText(txt).then(() => {
    document.getElementById('aiStatus').textContent = '✓ In Zwischenablage kopiert!';
    setTimeout(() => document.getElementById('aiStatus').textContent = '', 2500);
  });
}
