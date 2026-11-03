/* Browser audio adapters. No audio or microphone permission is requested on import. */
let activeUtterance = null;

const contractions = {
  "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is',
  "it's": 'it is', "we're": 'we are', "they're": 'they are',
  "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not',
  "don't": 'do not', "doesn't": 'does not', "didn't": 'did not',
  "can't": 'cannot', "won't": 'will not', "wouldn't": 'would not',
  "shouldn't": 'should not', "couldn't": 'could not', "haven't": 'have not',
  "hasn't": 'has not', "hadn't": 'had not', "i've": 'i have', "we've": 'we have',
  "they've": 'they have', "you've": 'you have', "i'll": 'i will',
  "you'll": 'you will', "he'll": 'he will', "she'll": 'she will',
  "we'll": 'we will', "they'll": 'they will', "let's": 'let us',
  "that's": 'that is', "there's": 'there is', "what's": 'what is',
};

/** Normalize punctuation, Unicode quotes and unambiguous common contractions. */
export function normalizeSpeech(text = '') {
  return String(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\b[a-z]+'[a-z]+\b/g, (word) => contractions[word] || word)
    .replace(/\bcannot\b/g, 'can not')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Ordered word alignment; this compares a transcript, never acoustic phonemes. */
export function compareSpeech(expected, actual) {
  const wanted = normalizeSpeech(expected).split(' ').filter(Boolean);
  const heard = normalizeSpeech(actual).split(' ').filter(Boolean);
  // Bound table size even when a browser returns an unexpectedly huge transcript.
  const a = wanted.slice(0, 300);
  const b = heard.slice(0, 300);
  const table = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? 1 + table[i + 1][j + 1] : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const matched = [], missing = [], extra = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { matched.push(a[i]); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) { missing.push(a[i++]); }
    else { extra.push(b[j++]); }
  }
  missing.push(...a.slice(i), ...wanted.slice(300));
  extra.push(...b.slice(j), ...heard.slice(300));
  const denominator = wanted.length + heard.length;
  return { score: denominator ? Math.round(200 * matched.length / denominator) : 0, missing, extra, matched };
}

export function stopSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
  activeUtterance = null;
}

/** Must be called from a user gesture on Safari. Returns the utterance, or null. */
export function speak(text, { rate = 0.85, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    onError?.('متصفحك لا يدعم النطق الصوتي. جرّب Safari أو متصفحاً حديثاً.');
    return null;
  }
  if (!String(text || '').trim()) { onError?.('لا يوجد نص للاستماع إليه.'); return null; }
  stopSpeech();
  const utterance = new window.SpeechSynthesisUtterance(String(text));
  utterance.lang = 'en-US';
  utterance.rate = Math.min(1.5, Math.max(0.4, Number(rate) || 0.85));
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.lang === 'en-US') || voices.find(v => /^en[-_]/i.test(v.lang));
  if (voice) utterance.voice = voice;
  utterance.onend = () => { if (activeUtterance === utterance) activeUtterance = null; onEnd?.(); };
  utterance.onerror = (event) => {
    if (activeUtterance === utterance) activeUtterance = null;
    if (!['canceled', 'interrupted'].includes(event.error)) {
      onError?.(event.error === 'network' ? 'تعذّر تحميل الصوت. قد يحتاج صوت الجهاز إلى الإنترنت أو إلى تنزيله من الإعدادات.' : 'تعذّر تشغيل النطق. تحقق من صوت الجهاز وحاول مرة أخرى.');
    }
  };
  activeUtterance = utterance;
  try { window.speechSynthesis.speak(utterance); return utterance; }
  catch { activeUtterance = null; onError?.('تعذّر تشغيل الصوت في هذا المتصفح. أعد الضغط على زر الاستماع.'); return null; }
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

const recognitionErrors = {
  'not-allowed': 'لم يُسمح باستخدام الميكروفون أو خدمة التعرف. اسمح بالميكروفون من إعدادات الموقع في Safari، وتحقق من إعدادات الإملاء.',
  'service-not-allowed': 'خدمة التعرف على الكلام غير متاحة أو غير مسموح بها في إعدادات المتصفح.',
  'audio-capture': 'تعذّر الوصول إلى الميكروفون. تحقق من اتصاله ومن أنه غير مستخدم في تطبيق آخر.',
  'no-speech': 'لم يُلتقط كلام واضح. اقترب من الميكروفون وحاول مجدداً في مكان هادئ.',
  'network': 'تحتاج خدمة التعرف على الكلام إلى اتصال بالإنترنت. يمكنك تسجيل صوتك والاستماع إليه بدلاً من ذلك.',
  'language-not-supported': 'التعرف باللغة الإنجليزية غير متاح على هذا الجهاز.',
};

/** Mount independent listening, transcript practice and genuine local recording. */
export function mountSpeechPractice(container, expected) {
  if (!container || typeof window === 'undefined') return () => {};
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const canRecord = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
  const secure = window.isSecureContext;
  let disposed = false, recognition = null, recognizing = false, recorder = null, stream = null;
  let recordedURL = null, timer = null, requesting = false, requestVersion = 0;
  let lastTranscript = '', recognitionFailed = false, evaluated = false;
  container.innerHTML = `
    <div class="speech-practice" dir="rtl">
      <div class="speech-target" dir="ltr" lang="en">${escapeHTML(expected)}</div>
      <div class="speech-actions" style="display:flex;flex-wrap:wrap;gap:8px;margin-block:16px">
        <button type="button" class="btn btn-primary" data-audio="listen">◖ استمع للنطق</button>
        <button type="button" class="btn btn-secondary" data-audio="slow">استماع بطيء</button>
        <button type="button" class="btn btn-secondary" data-audio="recognize" ${!Recognition || !secure ? 'disabled' : ''}>◉ اختبر كلامك</button>
        <button type="button" class="btn btn-secondary" data-audio="record" ${!canRecord || !secure ? 'disabled' : ''}>🎙 سجّل صوتك</button>
        <button type="button" class="btn btn-secondary" data-audio="stop" disabled>إيقاف</button>
      </div>
      <p class="audio-status" role="status" aria-live="polite">استمع أولاً، ثم اقرأ بصوت واضح. يمكنك إعادة التدريب بلا حدود.</p>
      <p class="speech-support" style="font-size:12px;line-height:1.8;color:var(--muted,#777)">${!secure ? 'الميكروفون يحتاج اتصال HTTPS أو التشغيل على localhost.' : !Recognition ? 'التعرف على الكلام غير مدعوم هنا. استخدم التسجيل للاستماع إلى نفسك؛ لن نعطي درجة نطق وهمية.' : 'التعرف على الكلام قد يرسل الصوت إلى خدمة المتصفح ويحتاج إلى الإنترنت. التسجيل اليدوي يبقى على جهازك.'}${!canRecord ? ' تسجيل الصوت غير مدعوم في هذا المتصفح.' : ''}</p>
      <div class="speech-transcript" hidden><small>ما تعرّف عليه المتصفح:</small><p dir="ltr" lang="en"></p></div>
      <div class="speech-result" aria-live="polite" hidden></div>
      <div class="speech-recording" hidden><p>تسجيلك — قارن نطقك بالصوت الأصلي</p><audio controls preload="metadata" style="width:100%"></audio><a class="btn btn-secondary" data-audio="download" download="my-english-practice.webm">تنزيل التسجيل</a></div>
      <p class="speech-disclaimer" style="font-size:12px;line-height:1.8;color:var(--muted,#777)">المقارنة تقيس تطابق الكلمات التي تعرّف عليها المتصفح مع النص فقط. لا تقيس مخارج الحروف أو جودة اللكنة؛ وقد يخطئ التعرف حتى مع نطق صحيح.</p>
    </div>`;
  const el = selector => container.querySelector(selector);
  const status = el('.audio-status'), result = el('.speech-result');
  const recordButton = el('[data-audio="record"]'), recognizeButton = el('[data-audio="recognize"]');
  const stopButton = el('[data-audio="stop"]'), recordingPanel = el('.speech-recording');
  const audio = el('audio'), download = el('[data-audio="download"]');

  const setStatus = message => { if (!disposed) status.textContent = message; };
  const stopTracks = () => { stream?.getTracks().forEach(track => track.stop()); stream = null; };
  const restoreControls = () => {
    if (disposed) return;
    recordButton.disabled = !canRecord || !secure || recognizing;
    recognizeButton.disabled = !Recognition || !secure || requesting || recorder?.state === 'recording';
    stopButton.disabled = !recognizing && !requesting && recorder?.state !== 'recording' && !activeUtterance;
  };
  const showComparison = () => {
    if (disposed || !lastTranscript.trim() || evaluated) return;
    evaluated = true;
    const comparison = compareSpeech(expected, lastTranscript);
    result.hidden = false;
    result.innerHTML = `<div class="speech-score" style="font-weight:800;font-size:24px;margin-block:12px">${comparison.score}٪ <span style="font-size:14px;font-weight:500">تطابق الكلمات</span></div>
      <p>${comparison.score === 100 ? 'تعرّف المتصفح على جميع الكلمات بالترتيب. استمع لتسجيلك لتراجع الإيقاع والنبر.' : 'استمع إلى النص مجدداً ببطء، ثم تدرّب على الكلمات التالية.'}</p>
      ${comparison.missing.length ? `<p>كلمات لم يلتقطها كما هي: <b dir="ltr" lang="en">${escapeHTML(comparison.missing.join(' · '))}</b></p>` : ''}
      ${comparison.extra.length ? `<p>كلمات إضافية أو مختلفة سمعها المتصفح: <b dir="ltr" lang="en">${escapeHTML(comparison.extra.join(' · '))}</b></p>` : ''}
      <p style="font-size:13px">${comparison.score < 100 ? 'قسّم الجملة إلى كلمات، وانطق النهايات بوضوح. لا ترفع صوتك كثيراً، وحافظ على مسافة ثابتة من الميكروفون.' : 'جرّب تكرار الجملة بسرعة طبيعية، مع وصل الكلمات والمحافظة على وضوحها.'}</p>`;
    setStatus('اكتملت مقارنة النص. يمكنك المحاولة من جديد متى شئت.');
  };
  const stopRecording = () => {
    clearTimeout(timer); timer = null;
    if (recorder?.state === 'recording') {
      recorder.stop();
      stopTracks();
      recordButton.textContent = '🎙 سجّل صوتك';
      recordButton.classList.remove('recording');
      setStatus('انتهى التسجيل. استمع إلى صوتك وقارنه بالمثال.');
    }
    restoreControls();
  };
  const stopAll = () => {
    requestVersion++; requesting = false;
    stopSpeech();
    try { recognition?.stop(); } catch { /* Recognition may have already ended. */ }
    stopRecording();
    restoreControls();
  };
  const listen = rate => {
    stopAll();
    audio.pause();
    setStatus(rate < 0.8 ? 'استمع إلى النطق البطيء…' : 'استمع إلى النطق الإنجليزي…');
    const utterance = speak(expected, { rate, onEnd: () => { setStatus('انتهى النطق. حان دورك للتدريب.'); restoreControls(); }, onError: message => { setStatus(message); restoreControls(); } });
    stopButton.disabled = !utterance;
  };
  const startRecognition = () => {
    if (!Recognition || !secure || recognizing || requesting || recorder?.state === 'recording') return;
    stopSpeech(); audio.pause();
    try { recognition?.abort(); } catch { /* Previous session may already be stopped. */ }
    recognition = new Recognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    lastTranscript = ''; recognitionFailed = false; evaluated = false;
    result.hidden = true;
    const transcriptBox = el('.speech-transcript');
    transcriptBox.hidden = true;
    recognition.onstart = () => {
      recognizing = true;
      recognizeButton.classList.add('recording');
      recognizeButton.textContent = '◉ الميكروفون يستمع…';
      setStatus('تحدث الآن بالإنجليزية. سيتوقف التعرف عند نهاية الجملة.');
      restoreControls();
    };
    recognition.onresult = event => {
      if (disposed) return;
      lastTranscript = Array.from(event.results, item => item[0].transcript).join(' ');
      transcriptBox.hidden = false;
      transcriptBox.querySelector('p').textContent = lastTranscript;
      if (Array.from(event.results).every(item => item.isFinal)) showComparison();
    };
    recognition.onerror = event => {
      recognitionFailed = true;
      if (event.error !== 'aborted') setStatus(recognitionErrors[event.error] || 'تعذّر التعرف على الكلام. حاول مجدداً أو استخدم التسجيل اليدوي.');
    };
    recognition.onend = () => {
      recognizing = false;
      if (disposed) return;
      recognizeButton.classList.remove('recording');
      recognizeButton.textContent = '◉ اختبر كلامك';
      if (!recognitionFailed) {
        if (lastTranscript.trim()) showComparison();
        else setStatus('لم يصل نص من خدمة التعرف. حاول مجدداً أو سجّل صوتك للاستماع إليه.');
      }
      restoreControls();
    };
    recognizing = true;
    restoreControls();
    try { recognition.start(); }
    catch { recognizing = false; setStatus('تعذّر بدء التعرف. انتظر لحظة وتحقق من إذن الميكروفون ثم أعد المحاولة.'); restoreControls(); }
  };
  const startRecording = async () => {
    if (!canRecord || !secure || recognizing || requesting) return;
    if (recorder?.state === 'recording') { stopRecording(); return; }
    stopSpeech(); audio.pause();
    requesting = true;
    const version = ++requestVersion;
    setStatus('اسمح بالميكروفون لبدء تسجيلك.');
    restoreControls();
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (disposed || version !== requestVersion) { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(type => window.MediaRecorder.isTypeSupported?.(type));
      recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
      const sessionRecorder = recorder;
      const chunks = [];
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        if (disposed) return;
        if (!chunks.length) { setStatus('التسجيل فارغ. حاول مرة أخرى وتحدث بعد ظهور رسالة التسجيل.'); return; }
        if (recordedURL) URL.revokeObjectURL(recordedURL);
        const blob = new Blob(chunks, { type: sessionRecorder.mimeType || mimeType || 'audio/webm' });
        recordedURL = URL.createObjectURL(blob);
        audio.src = recordedURL;
        download.href = recordedURL;
        download.download = `my-english-practice.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`;
        recordingPanel.hidden = false;
        restoreControls();
      };
      recorder.onerror = () => { stopRecording(); stopTracks(); setStatus('حدث خطأ أثناء التسجيل. أعد المحاولة وتحقق من توفر الميكروفون.'); };
      recorder.start();
      requesting = false;
      recordButton.textContent = '■ إنهاء التسجيل';
      recordButton.classList.add('recording');
      setStatus('جارٍ تسجيل صوتك… اضغط «إنهاء التسجيل» عند الانتهاء. الحد الأقصى للتسجيل الواحد ٢٥ ثانية؛ يمكنك التكرار بلا حدود.');
      timer = setTimeout(stopRecording, 25000);
      restoreControls();
    } catch (error) {
      if (disposed || version !== requestVersion) return;
      requesting = false;
      stopTracks();
      setStatus(error?.name === 'NotAllowedError' ? 'لم يُسمح بالميكروفون. افتح إعدادات الموقع في Safari واسمح بالوصول إليه.' : error?.name === 'NotFoundError' ? 'لم يُعثر على ميكروفون متاح على هذا الجهاز.' : 'تعذّر بدء التسجيل. تحقق من الميكروفون وإعدادات المتصفح.');
      restoreControls();
    }
  };
  const onClick = event => {
    const button = event.target.closest('[data-audio]');
    if (!button || !container.contains(button) || button.disabled) return;
    switch (button.dataset.audio) {
      case 'listen': listen(0.85); break;
      case 'slow': listen(0.6); break;
      case 'recognize': startRecognition(); break;
      case 'record': void startRecording(); break;
      case 'stop': stopAll(); setStatus('تم إيقاف الصوت والتسجيل. يمكنك بدء تدريب جديد.'); break;
    }
  };
  container.addEventListener('click', onClick);
  return () => {
    disposed = true;
    requestVersion++;
    clearTimeout(timer);
    stopSpeech();
    if (recognition) {
      recognition.onstart = recognition.onresult = recognition.onend = recognition.onerror = null;
      try { recognition.abort(); } catch { /* Already stopped. */ }
    }
    if (recorder?.state === 'recording') recorder.stop();
    stopTracks();
    audio.pause();
    audio.removeAttribute('src');
    if (recordedURL) URL.revokeObjectURL(recordedURL);
    container.removeEventListener('click', onClick);
  };
}
