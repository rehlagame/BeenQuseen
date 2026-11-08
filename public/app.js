// ( بين قوسين ) - Clean Editorial Stream Logic (Latest Article First, Followed by Previous Articles in Order)

let allArticles = [];
let currentFontSizeRem = 1.42;
let activeQuotePayload = null;
let speakingArticleId = null;

// DOM Elements
const latestArticleSection = document.getElementById('latestArticleSection');
const previousArticlesStream = document.getElementById('previousArticlesStream');
const currentEditionBadge = document.getElementById('currentEditionBadge');
const kuwaitLiveClock = document.getElementById('kuwaitLiveClock');
const nextEditionCountdown = document.getElementById('nextEditionCountdown');

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  initClockAndCountdown();
  initThemeAndFontControls();
  initQuoteModal();
  await loadArticles();
});

// 1. Live Kuwait Clock & 10:00 PM Countdown
function initClockAndCountdown() {
  function updateClock() {
    const now = new Date();
    const kwFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kuwait',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = {};
    for (const p of kwFmt.formatToParts(now)) parts[p.type] = p.value;

    const h = parseInt(parts.hour, 10);
    const m = parseInt(parts.minute, 10);
    const s = parseInt(parts.second, 10);

    kuwaitLiveClock.textContent = `${parts.hour}:${parts.minute}:${parts.second}`;

    // Calculate seconds until 22:00:00 (10:00 PM Kuwait time)
    const nowTotalSec = h * 3600 + m * 60 + s;
    const targetSec = 22 * 3600; // 22:00:00
    let diffSec = targetSec - nowTotalSec;
    if (diffSec <= 0) {
      diffSec += 24 * 3600;
    }

    const remH = String(Math.floor(diffSec / 3600)).padStart(2, '0');
    const remM = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
    const remS = String(diffSec % 60).padStart(2, '0');

    nextEditionCountdown.textContent = `${remH} ساعة : ${remM} دقيقة : ${remS} ثانية`;
  }

  updateClock();
  setInterval(updateClock, 1000);
}

// 2. Theme & Font Size Controls
function initThemeAndFontControls() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');

  themeToggleBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    if (current === 'dark') {
      html.setAttribute('data-theme', 'paper');
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'الوضع الليلي';
    } else {
      html.setAttribute('data-theme', 'dark');
      themeIcon.textContent = '🗞️';
      themeLabel.textContent = 'وضع الجريدة';
    }
  });

  document.getElementById('fontIncreaseBtn').addEventListener('click', () => {
    if (currentFontSizeRem < 1.9) {
      currentFontSizeRem = +(currentFontSizeRem + 0.1).toFixed(2);
      document.documentElement.style.setProperty('--article-font-size', `${currentFontSizeRem}rem`);
    }
  });

  document.getElementById('fontDecreaseBtn').addEventListener('click', () => {
    if (currentFontSizeRem > 1.05) {
      currentFontSizeRem = +(currentFontSizeRem - 0.1).toFixed(2);
      document.documentElement.style.setProperty('--article-font-size', `${currentFontSizeRem}rem`);
    }
  });
}

// 3. Fetch & Render All Articles (Newest first at top, previous articles ordered below)
async function loadArticles() {
  try {
    const res = await fetch('/api/articles');
    if (res.ok) {
      const data = await res.json();
      allArticles = data.articles || [];
    }
  } catch (err) {
    console.warn('API fallback to static articles.json:', err);
  }

  // Fallback to static /articles.json if serverless API returned empty
  if (!allArticles || allArticles.length === 0) {
    try {
      const staticRes = await fetch('/articles.json');
      if (staticRes.ok) {
        allArticles = await staticRes.json();
      }
    } catch (e) {
      console.error('Failed to load static articles.json:', e);
    }
  }

  renderAllArticles();
}

// Format satirical text: highlight ( ... ), « ... », and !!
function formatSatiricalText(rawText) {
  if (!rawText) return '';
  let safe = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Highlight text between parentheses ( ... )
  safe = safe.replace(/\(([^)]+)\)/g, '<span class="paren-spice">($1)</span>');
  // Highlight text between guillemets « ... »
  safe = safe.replace(/«([^»]+)»/g, '<span class="quote-spice">«$1»</span>');
  // Highlight ending exclamation marks
  safe = safe.replace(/(!+)/g, '<span class="punchline-bang">$1</span>');

  return safe;
}

function buildArticleCardHtml(article, isLatest = false) {
  const paragraphsHtml = (article.paragraphs || [])
    .map((p, idx) => {
      const dividerHtml = idx < article.paragraphs.length - 1
        ? `<div class="star-divider" aria-hidden="true"><span class="star-symbols">***</span></div>`
        : '';

      return `
        <div class="vignette-block" id="vignette-${article.id}-${p.id}">
          <div class="vignette-header">
            <span class="vignette-topic-tag">📌 ${p.topic}</span>
            <span style="font-size:0.78rem; color:var(--text-muted);">شذرة رقم (${idx + 1})</span>
          </div>
          <h3 class="vignette-subhead">${p.headline || ''}</h3>
          <p class="vignette-body">${formatSatiricalText(p.text)}</p>

          <div class="vignette-Toolbar">
            <div class="reaction-group">
              <button class="react-btn" onclick="handleReaction('${article.id}', '${p.id}', 'laugh', this)">
                😂 قفشة قاتلة <span>(${p.reactions?.laugh || 0})</span>
              </button>
              <button class="react-btn" onclick="handleReaction('${article.id}', '${p.id}', 'fire', this)">
                🔥 بالصميم <span>(${p.reactions?.fire || 0})</span>
              </button>
              <button class="react-btn" onclick="handleReaction('${article.id}', '${p.id}', 'bullseye', this)">
                🎯 علامة كاملة <span>(${p.reactions?.bullseye || 0})</span>
              </button>
            </div>
            <div class="share-group">
              <button class="btn-quote-card" onclick="openQuoteCardModal('${article.id}', '${p.id}')">
                📸 بطاقة مصورة (WhatsApp / X)
              </button>
              <button class="btn-wa-mini" onclick="shareParagraphWhatsApp('${article.id}', '${p.id}')">
                💬 واتساب
              </button>
            </div>
          </div>
        </div>
        ${dividerHtml}
      `;
    })
    .join('');

  return `
    ${isLatest ? `<div class="latest-ribbon-label">🔥 المقال الأحدث • طبعة الليلة</div>` : ''}
    <article class="newspaper-sheet ${isLatest ? 'latest-sheet' : ''}" id="article-${article.id}">
      <div class="sheet-top-bar">
        <div class="edition-pill-group">
          <span class="${isLatest ? 'edition-badge-red' : 'edition-badge-dark'}">( بين قوسين ) • العدد #${article.editionNumber}</span>
          <span class="edition-date">🗓️ ${article.kuwaitDateStr}</span>
        </div>
        <div class="audio-controls">
          <button id="audioBtn-${article.id}" class="btn-audio" onclick="toggleAudioReader('${article.id}')">
            🔊 <span>استمع للمقال بالصوت</span>
          </button>
        </div>
      </div>

      <h2 class="article-main-title">${article.title}</h2>
      <p class="article-subtitle">${article.subtitle}</p>

      <div class="vignettes-container">
        ${paragraphsHtml}
      </div>

      <div class="column-signature-box">
        <div class="sig-right">
          <span class="sig-parens">( ! )</span>
          <div>
            <div class="sig-title">عمود «بين قوسين» • العدد #${article.editionNumber}</div>
            <div class="sig-sub">يُكتب بالذكاء الاصطناعي بدون تدخل بشري • يُنشر يومياً 10:00 مساءً بتوقيت الكويت</div>
          </div>
        </div>
        <div>
          <button class="btn-quote-card" onclick="shareFullArticleWhatsApp('${article.id}')">
            📲 مشاركة المقال كاملاً عبر واتساب
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderAllArticles() {
  if (!allArticles || allArticles.length === 0) return;

  const latest = allArticles[0];
  const previous = allArticles.slice(1);

  currentEditionBadge.textContent = `العدد الأحدث #${latest.editionNumber}`;

  // Render Latest Article at top
  latestArticleSection.innerHTML = buildArticleCardHtml(latest, true);

  // Render Previous Articles in chronological order below
  if (previous.length === 0) {
    previousArticlesStream.innerHTML = `
      <div class="newspaper-sheet" style="text-align:center; padding: 28px 24px;">
        <p style="font-family:'Amiri', serif; font-size:1.3rem; color:var(--text-secondary);">
          🌟 انطلقت صفحة <strong>«( بين قوسين )»</strong> اليوم بـ <strong>العدد الافتتاحي الأول (#1)</strong> أعلاه.<br/>
          عند صدور العدد القادم غداً الساعة <strong>10:00 مساءً بتوقيت الكويت</strong>، سينتقل مقال اليوم تلقائياً إلى هذا القسم وتترتب المقالات السابقة هنا تباعاً حسب تاريخ كتابتها.
        </p>
      </div>
    `;
  } else {
    previousArticlesStream.innerHTML = previous
      .map(art => buildArticleCardHtml(art, false))
      .join('');
  }
}

// 4. Reactions Handler
window.handleReaction = async function (articleId, paragraphId, reactionType, btnEl) {
  btnEl.classList.add('reacted');
  try {
    const res = await fetch('/api/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, paragraphId, reactionType })
    });
    const data = await res.json();
    if (data.success) {
      const art = allArticles.find(a => a.id === articleId);
      const para = art?.paragraphs.find(p => p.id === paragraphId);
      if (para) {
        para.reactions = data.reactions;
        const span = btnEl.querySelector('span');
        if (span) span.textContent = `(${data.reactions[reactionType]})`;
      }
    }
  } catch (err) {
    console.error('Reaction error:', err);
  }
};

// 5. Audio Reader (Text-to-Speech in Arabic)
window.toggleAudioReader = function (articleId) {
  if (!('speechSynthesis' in window)) {
    alert('متصفحك الحالي لا يدعم القراءة الصوتية المباشرة.');
    return;
  }

  const targetBtn = document.getElementById(`audioBtn-${articleId}`);

  // If already speaking this article, stop it
  if (speakingArticleId === articleId) {
    window.speechSynthesis.cancel();
    speakingArticleId = null;
    if (targetBtn) {
      targetBtn.classList.remove('playing');
      targetBtn.innerHTML = `🔊 <span>استمع للمقال بالصوت</span>`;
    }
    return;
  }

  // Cancel any other playing audio
  window.speechSynthesis.cancel();
  document.querySelectorAll('.btn-audio').forEach(b => {
    b.classList.remove('playing');
    b.innerHTML = `🔊 <span>استمع للمقال بالصوت</span>`;
  });

  const article = allArticles.find(a => a.id === articleId);
  if (!article) return;

  const fullText = `عمود بين قوسين. ${article.title}. ` +
    article.paragraphs.map((p, i) => `الفقرة ${i + 1}: ${p.headline}. ${p.text}`).join(' ... فاصل ... ');

  const utterance = new SpeechSynthesisUtterance(fullText);
  utterance.lang = 'ar-KW';
  utterance.rate = 0.96;

  utterance.onend = () => {
    speakingArticleId = null;
    if (targetBtn) {
      targetBtn.classList.remove('playing');
      targetBtn.innerHTML = `🔊 <span>استمع للمقال بالصوت</span>`;
    }
  };

  window.speechSynthesis.speak(utterance);
  speakingArticleId = articleId;
  if (targetBtn) {
    targetBtn.classList.add('playing');
    targetBtn.innerHTML = `⏹️ <span>إيقاف القراءة الصوتية</span>`;
  }
};

// 6. Quote Card Image Generator (HTML5 Canvas) for WhatsApp / X
window.openQuoteCardModal = function (articleId, paragraphId) {
  const art = allArticles.find(a => a.id === articleId);
  const para = art?.paragraphs.find(p => p.id === paragraphId);
  if (!art || !para) return;

  activeQuotePayload = { art, para };
  const modal = document.getElementById('quoteModal');
  modal.classList.remove('hidden');
  renderQuoteCanvas(art, para);
};

function renderQuoteCanvas(art, para) {
  const canvas = document.getElementById('quoteCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // Paper Background
  ctx.fillStyle = '#fbf7ee';
  ctx.fillRect(0, 0, W, H);

  // Outer Double Newspaper Border
  ctx.strokeStyle = '#181512';
  ctx.lineWidth = 8;
  ctx.strokeRect(32, 32, W - 64, H - 64);

  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 46, W - 92, H - 92);

  // Top Header Brand: ( بين قوسين )
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 58px Cairo, sans-serif';
  ctx.fillText('( بين قوسين )', W / 2, 130);

  ctx.fillStyle = '#57524a';
  ctx.font = '600 24px "Readex Pro", sans-serif';
  ctx.fillText(`العدد #${art.editionNumber}  •  ${art.kuwaitDateStr}`, W / 2, 175);

  // Divider line
  ctx.beginPath();
  ctx.moveTo(90, 200);
  ctx.lineTo(W - 90, 200);
  ctx.strokeStyle = '#d6cbb9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Topic & Subhead
  ctx.fillStyle = '#b91c1c';
  ctx.font = '800 34px Cairo, sans-serif';
  ctx.fillText(para.headline || para.topic, W / 2, 255);

  // Wrap Paragraph Text cleanly
  ctx.fillStyle = '#161412';
  ctx.textAlign = 'right';
  const maxWidth = W - 160;
  const words = para.text.split(' ');
  const lines = [];
  let currentLine = '';

  const fontSize = para.text.length > 620 ? 29 : 33;
  const lineHeight = Math.round(fontSize * 1.65);
  ctx.font = `700 ${fontSize}px Amiri, serif`;

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  let y = 320;
  for (const line of lines.slice(0, 12)) {
    ctx.fillText(line, W - 80, y);
    y += lineHeight;
  }

  // Stars ***
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 38px monospace';
  ctx.fillText('***', W / 2, H - 140);

  // Footer Manifesto inside Card
  ctx.fillStyle = '#181512';
  ctx.fillRect(46, H - 115, W - 92, 69);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px "Readex Pro", sans-serif';
  ctx.fillText('عمود سياسي ساخر يُكتب بالذكاء الاصطناعي بدون تدخل بشري • يُنشر يومياً 10 مساءً بتوقيت الكويت', W / 2, H - 72);
}

// Share Helpers
window.shareParagraphWhatsApp = function (articleId, paragraphId) {
  const art = allArticles.find(a => a.id === articleId);
  const para = art?.paragraphs.find(p => p.id === paragraphId);
  if (!art || !para) return;

  const text = `*«( بين قوسين )» - ${para.headline}*\n\n${para.text}\n\n***\n_عمود سياسي ساخر يُكتب بالذكاء الاصطناعي بدون تدخل بشري - يُنشر يومياً 10:00 م بتوقيت الكويت_`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

window.shareFullArticleWhatsApp = function (articleId) {
  const art = allArticles.find(a => a.id === articleId) || allArticles[0];
  if (!art) return;
  const body = art.paragraphs.map(p => `*${p.headline}*\n${p.text}`).join('\n\n***\n\n');
  const text = `*( بين قوسين ) | ${art.title}*\n_${art.kuwaitDateStr}_\n\n${body}\n\n— _صفحة رقمية لعمود سياسي ساخر يُكتب بالذكاء الاصطناعي بدون تدخل بشري_`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

function initQuoteModal() {
  const quoteModal = document.getElementById('quoteModal');

  document.getElementById('closeQuoteModalBtn').addEventListener('click', () => {
    quoteModal.classList.add('hidden');
  });

  document.getElementById('downloadQuoteImgBtn').addEventListener('click', () => {
    const canvas = document.getElementById('quoteCanvas');
    const link = document.createElement('a');
    link.download = `bayn-qawsayn-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  document.getElementById('copyQuoteTextBtn').addEventListener('click', async () => {
    if (!activeQuotePayload) return;
    const { para } = activeQuotePayload;
    const text = `( بين قوسين ) - ${para.headline}\n\n${para.text}\n\n***\nعمود سياسي ساخر يُكتب بالذكاء الاصطناعي بدون تدخل بشري`;
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copyQuoteTextBtn');
    const orig = btn.textContent;
    btn.textContent = '✅ تم نسخ النص بنجاح!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });

  document.getElementById('whatsappShareBtn').addEventListener('click', () => {
    if (!activeQuotePayload) return;
    shareParagraphWhatsApp(activeQuotePayload.art.id, activeQuotePayload.para.id);
  });
}
