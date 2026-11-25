(async function initPedagogicalEngine() {
  /* =========================================================
     1. AUDIO WARM-UP + MP3 TTS WITH SPEECHSYNTHESIS FALLBACK
  ========================================================= */
  let currentAudioEl = null;
  let audioSafetyTimer = null;
  let audioWarmedUp = false;

  if (!state.blockMastery) state.blockMastery = {};

  function clearAudioIndicator() {
    clearTimeout(audioSafetyTimer);
    if (typeof hideAudioToast === 'function') hideAudioToast();
    else document.getElementById('audioToast')?.classList.remove('show');
  }

  function warmUpAudioOnce() {
    if (audioWarmedUp) return;
    audioWarmedUp = true;
    try {
      if (typeof initAudio === 'function') initAudio();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0; u.lang = 'ja-JP';
        window.speechSynthesis.speak(u);
      }
    } catch (_) {}
  }
  ['pointerdown', 'touchstart', 'click'].forEach((e) =>
    document.addEventListener(e, warmUpAudioOnce, { once: true, passive: true })
  );

  function speakViaSpeechSynthesis(text, rate, label) {
    if (!('speechSynthesis' in window)) { clearAudioIndicator(); return; }
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
      const voices = window.speechSynthesis.getVoices();
      const jpVoice = voices.find((v) => v.lang === 'ja-JP' && v.localService) || voices.find((v) => v.lang.toLowerCase().startsWith('ja')) || null;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ja-JP'; if (jpVoice) u.voice = jpVoice; u.rate = rate;
      u.onend = clearAudioIndicator; u.onerror = clearAudioIndicator;
      if (typeof showAudioToast === 'function') showAudioToast(label, 5000);
      clearTimeout(audioSafetyTimer);
      audioSafetyTimer = setTimeout(clearAudioIndicator, 5500);
      window.speechSynthesis.speak(u);
    } catch (_) { clearAudioIndicator(); }
  }

  window.speakJP = function (text, rate = null, displayLabel = null) {
    if (!text) return;
    warmUpAudioOnce();
    const speed = rate || parseFloat(document.getElementById('speedSelect')?.value || '0.92');
    const label = `🔊 Reproduciendo: ${displayLabel || text}`;
    try {
      if (currentAudioEl) { currentAudioEl.onended = null; currentAudioEl.onerror = null; currentAudioEl.pause(); currentAudioEl = null; }
      if (typeof showAudioToast === 'function') showAudioToast(label, 6000);
      clearTimeout(audioSafetyTimer);
      audioSafetyTimer = setTimeout(clearAudioIndicator, 6500);
      const audio = new Audio(`/.netlify/functions/tts?q=${encodeURIComponent(text)}`);
      audio.playbackRate = Math.min(1.25, Math.max(0.65, speed));
      currentAudioEl = audio;
      audio.onended = () => { if (currentAudioEl === audio) currentAudioEl = null; clearAudioIndicator(); };
      audio.onerror = () => { if (currentAudioEl === audio) currentAudioEl = null; speakViaSpeechSynthesis(text, speed, label); };
      const p = audio.play();
      if (p && p.catch) p.catch(() => { if (currentAudioEl === audio) currentAudioEl = null; speakViaSpeechSynthesis(text, speed, label); });
    } catch (_) { speakViaSpeechSynthesis(text, speed, label); }
  };

  /* Helper to build compact kana chunks */
  const mkKana = (pairs, role = 'topic') =>
    pairs.map(([jp, romaji, noteES]) => ({ jp, romaji, role, noteES, noteEN: noteES }));

  /* =========================================================
     2. FULL TEACH-BEFORE-YOU-TEST CURRICULUM
  ========================================================= */
  const fullCurriculum = [
    // --- HIRAGANA (ALL 46 + DAKUTEN) ---
    {
      id: 'u1', isScript: true, title: '1. Vocales Puras (あいうえお)', tag: 'Hiragana 1/7',
      stage1Label: 'Etapa 1 • El Sonido (60s)', stage2Label: 'Etapa 2 • Conoce las 5 Vocales (Individuales)', stage3Label: 'Etapa 3 • Decodifica tu Primera Palabra',
      ruleES: 'Hoy no vas a memorizar gramática: vas a desbloquear 5 formas que suenan igual que en español mexicano (a, i, u, e, o). Único detalle: en la "u" (う) relaja los labios sin hacer trompita.',
      ruleEN: 'Unlock 5 shapes that sound just like Spanish vowels (a, i, u, e, o). Keep "u" (う) unrounded.',
      chunks: mkKana([
        ['あ','a','Suena "a" limpia. Gancho: una "a" con cruz arriba.'],
        ['い','i','Suena "i" limpia. Gancho: dos palitos "i"guales.'],
        ['う','u','Suena "u" relajada. Gancho: una "u" acostada.'],
        ['え','e','Suena "e" limpia. Gancho: corredor con "e"nergía.'],
        ['お','o','Suena "o" limpia. Gancho: círculo abajo como una "o".']
      ]),
      puzzlePromptES: 'Usa las 5 vocales de abajo para escribir "ai" (amor):',
      puzzlePromptEN: 'Spell "ai" (love) using the 5 vowels:',
      puzzleAnswer: ['あ','い'], puzzleDistractors: ['う','え','お']
    },
    {
      id: 'u2', isScript: true, title: '2. La "R" Suave (らりるれろ)', tag: 'Hiragana 2/7',
      stage1Label: 'Etapa 1 • El Sonido (60s)', stage2Label: 'Etapa 2 • La Fila R (らりるれろ)', stage3Label: 'Etapa 3 • Combina Vocales + Fila R',
      ruleES: 'La R japonesa es tu "r" suave de "pero" o "caro" (nunca "perro"). Combínala con las 5 vocales que ya aprendiste.',
      ruleEN: 'Japanese R is a single soft tap like Spanish "pero". Combine it with the 5 vowels.',
      chunks: mkKana([
        ['ら','ra','r suave + a. Gancho: un 5 con gorrito.'],
        ['り','ri','r suave + i. Gancho: dos cañas de río.'],
        ['る','ru','r suave + u. Gancho: un 3 con rizo abajo.'],
        ['れ','re','r suave + e. Gancho: línea que rebota afuera.'],
        ['ろ','ro','r suave + o. Gancho: como る pero sin rizo.']
      ]),
      puzzlePromptES: 'Usa solo letras que ya conoces para escribir "iro" (color):',
      puzzlePromptEN: 'Spell "iro" (color):',
      puzzleAnswer: ['い','ろ'], puzzleDistractors: ['ら','る','あ']
    },
    {
      id: 'h3', isScript: true, title: 'H3. Filas K y G (かきくけこ・がぎぐげご)', tag: 'Hiragana 3/7',
      stage1Label: 'Etapa 1 • Sonidos K y Dakuten (゛)', stage2Label: 'Etapa 2 • Escucha y Repite (K / G)', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Aprende la fila K (ka, ki, ku, ke, ko). Si agregas dos comillas arriba a la derecha (゛llamado dakuten), la K se vuelve G suave (ga, gi, gu, ge, go).',
      ruleEN: 'Learn K-row. Adding two dashes (゛dakuten) turns K into G.',
      chunks: mkKana([
        ['か','ka','k + a'],['き','ki','k + i'],['く','ku','k + u'],['け','ke','k + e'],['こ','ko','k + o'],
        ['が','ga','か + ゛ = ga'],['ぎ','gi','き + ゛ = gi'],['ぐ','gu','く + ゛ = gu'],['げ','ge','け + ゛ = ge'],['ご','go','こ + ゛ = go']
      ]),
      puzzlePromptES: 'Escribe "kore" (esto) usando letras de H3 y L2:',
      puzzlePromptEN: 'Spell "kore" (this):',
      puzzleAnswer: ['こ','れ'], puzzleDistractors: ['か','き','ろ']
    },
    {
      id: 'h4', isScript: true, title: 'H4. Filas S y Z (さしすせそ・ざじずぜぞ)', tag: 'Hiragana 4/7',
      stage1Label: 'Etapa 1 • Sonidos S y Z', stage2Label: 'Etapa 2 • Escucha y Repite (S / Z)', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila S: sa, shi (no "si"), su, se, so. Con comillas (゛) se vuelve Z/J: za, ji, zu, ze, zo.',
      ruleEN: 'S-row (note: shi) and dakuten Z-row (note: ji).',
      chunks: mkKana([
        ['さ','sa','s + a'],['し','shi','sh + i (como "sh" suave)'],['す','su','s + u'],['せ','se','s + e'],['そ','so','s + o'],
        ['ざ','za','さ + ゛'],['じ','ji','し + ゛ = ji'],['ず','zu','す + ゛'],['ぜ','ze','せ + ゛'],['ぞ','zo','そ + ゛']
      ]),
      puzzlePromptES: 'Escribe "sushi" (すし):',
      puzzlePromptEN: 'Spell "sushi":',
      puzzleAnswer: ['す','し'], puzzleDistractors: ['さ','せ','そ']
    },
    {
      id: 'h5', isScript: true, title: 'H5. Filas T y D (たちつてと・だぢづでど)', tag: 'Hiragana 5/7',
      stage1Label: 'Etapa 1 • Sonidos T y D', stage2Label: 'Etapa 2 • Escucha y Repite (T / D)', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila T: ta, chi, tsu, te, to. Con comillas (゛) se vuelve D: da, ji, zu, de, do.',
      ruleEN: 'T-row (note: chi, tsu) and dakuten D-row.',
      chunks: mkKana([
        ['た','ta','t + a'],['ち','chi','ch + i'],['つ','tsu','ts + u'],['て','te','t + e'],['と','to','t + o'],
        ['だ','da','た + ゛'],['で','de','て + ゛'],['ど','do','と + ゛']
      ]),
      puzzlePromptES: 'Escribe "desu" (です = es/soy):',
      puzzlePromptEN: 'Spell "desu":',
      puzzleAnswer: ['で','す'], puzzleDistractors: ['て','た','と']
    },
    {
      id: 'h6', isScript: true, title: 'H6. Filas N y H/B/P (なにぬねの・はひふへほ)', tag: 'Hiragana 6/7',
      stage1Label: 'Etapa 1 • Filas N, H, B y P', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: 'Fila N (na, ni, nu, ne, no) y Fila H (ha, hi, fu, he, ho). En la fila H: comillas (゛) da B (ba, bi, bu, be, bo) y circulito (゜) da P (pa, pi, pu, pe, po).',
      ruleEN: 'N-row and H-row (゛= B, ゜= P).',
      chunks: mkKana([
        ['な','na','n+a'],['に','ni','n+i'],['ぬ','nu','n+u'],['ね','ne','n+e'],['の','no','n+o'],
        ['は','ha','h+a (como partícula suena "wa")'],['ひ','hi','h+i'],['ふ','fu','f suave + u'],['へ','he','h+e'],['ほ','ho','h+o'],
        ['ば','ba','は+゛'],['べ','be','へ+゛'],['ぱ','pa','は+゜']
      ]),
      puzzlePromptES: 'Escribe "taberu" (たべる = comer):',
      puzzlePromptEN: 'Spell "taberu" (to eat):',
      puzzleAnswer: ['た','べ','る'], puzzleDistractors: ['は','に','の']
    },
    {
      id: 'h7', isScript: true, title: 'H7. Filas M, Y, W y N (まみむめも・やゆよ・わをん)', tag: 'Hiragana 7/7',
      stage1Label: 'Etapa 1 • Cierre de Hiragana (46/46)', stage2Label: 'Etapa 2 • Escucha y Repite', stage3Label: 'Etapa 3 • Escribe una Palabra',
      ruleES: '¡Últimas letras de Hiragana! Fila M (ma, mi, mu, me, mo), Y (ya, yu, yo), W (wa, wo) y la consonante final ん (n). Nota: を se usa solo como partícula y suena "o".',
      ruleEN: 'Final Hiragana rows: M, Y, W, and N.',
      chunks: mkKana([
        ['ま','ma','m+a'],['み','mi','m+i'],['む','mu','m+u'],['め','me','m+e'],['も','mo','m+o'],
        ['や','ya','y+a'],['ゆ','yu','y+u'],['よ','yo','y+o'],
        ['わ','wa','w+a'],['を','o','partícula de objeto (suena "o")'],['ん','n','n final']
      ]),
      puzzlePromptES: 'Escribe "watashi" (わたし = yo):',
      puzzlePromptEN: 'Spell "watashi" (I):',
      puzzleAnswer: ['わ','た','し'], puzzleDistractors: ['ま','も','ん']
    },

    // --- KATAKANA (ALL 46 + DAKUTEN) BEFORE LESSON 3 ---
    {
      id: 'k1', isScript: true, title: 'K1. Katakana: Vocales y K/S (ア–ソ)', tag: 'Katakana 1/3',
      stage1Label: 'Etapa 1 • ¿Por qué existe Katakana?', stage2Label: 'Etapa 2 • Escucha y Repite (ア–ソ)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: 'Katakana tiene los mismos sonidos que Hiragana, pero trazos rectos. Se usa para palabras extranjeras (como café, tacos, smartphone). El guion "ー" alarga la vocal anterior.',
      ruleEN: 'Katakana has the same sounds as Hiragana, used for foreign loanwords. "ー" extends the vowel.',
      chunks: mkKana([
        ['ア','a','a'],['イ','i','i'],['ウ','u','u'],['エ','e','e'],['オ','o','o'],
        ['カ','ka','ka'],['キ','ki','ki'],['ク','ku','ku'],['ケ','ke','ke'],['コ','ko','ko'],
        ['サ','sa','sa'],['シ','shi','shi (mira arriba)'],['ス','su','su'],['セ','se','se'],['ソ','so','so']
      ], 'object'),
      puzzlePromptES: 'Escribe "aisu" (アイス = helado/frío):',
      puzzlePromptEN: 'Spell "aisu" (iced):',
      puzzleAnswer: ['ア','イ','ス'], puzzleDistractors: ['カ','コ','シ']
    },
    {
      id: 'k2', isScript: true, title: 'K2. Katakana: T, N y H/B/P (タ–ホ)', tag: 'Katakana 2/3',
      stage1Label: 'Etapa 1 • Katakana T, N, H/B/P', stage2Label: 'Etapa 2 • Escucha y Repite (タ–ホ)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: 'Domina las filas T, N y H en Katakana (más ゛= B y ゜= P). Con esto ya puedes leer "タコス" (tacos) y "コーヒー" (café).',
      ruleEN: 'Katakana T, N, and H/B/P rows.',
      chunks: mkKana([
        ['タ','ta','ta'],['チ','chi','chi'],['ツ','tsu','tsu (mira abajo)'],['テ','te','te'],['ト','to','to'],
        ['ナ','na','na'],['ニ','ni','ni'],['ヌ','nu','nu'],['ネ','ne','ne'],['ノ','no','no'],
        ['ハ','ha','ha'],['ヒ','hi','hi'],['フ','fu','fu'],['ヘ','he','he'],['ホ','ho','ho'],
        ['ビ','bi','ヒ+゛ = bi'],['パ','pa','ハ+゜ = pa'],['フェ','fe','フ+ェ = fe']
      ], 'object'),
      puzzlePromptES: 'Escribe "takosu" (タコス = tacos):',
      puzzlePromptEN: 'Spell "takosu" (tacos):',
      puzzleAnswer: ['タ','コ','ス'], puzzleDistractors: ['テ','ト','ホ']
    },
    {
      id: 'k3', isScript: true, title: 'K3. Katakana: M, Y, R, W, N (マ–ン)', tag: 'Katakana 3/3',
      stage1Label: 'Etapa 1 • Cierre de Katakana (46/46)', stage2Label: 'Etapa 2 • Escucha y Repite (マ–ン)', stage3Label: 'Etapa 3 • Lee Katakana',
      ruleES: '¡Últimas letras de Katakana! Filas M, Y, R, W y ン (n). Ya puedes leer cualquier palabra extranjera en Japón.',
      ruleEN: 'Final Katakana rows: M, Y, R, W, and N.',
      chunks: mkKana([
        ['マ','ma','ma'],['ミ','mi','mi'],['ム','mu','mu'],['メ','me','me'],['モ','mo','mo'],
        ['ヤ','ya','ya'],['ユ','yu','yu'],['ヨ','yo','yo'],
        ['ラ','ra','ra'],['リ','ri','ri'],['ル','ru','ru'],['レ','re','re'],['ロ','ro','ro'],
        ['ワ','wa','wa'],['ン','n','n final'],['ー','—','alarga vocal']
      ], 'object'),
      puzzlePromptES: 'Escribe "ramen" (ラーメン):',
      puzzlePromptEN: 'Spell "rāmen":',
      puzzleAnswer: ['ラ','ー','メ','ン'], puzzleDistractors: ['マ','レ','ロ']
    },

    // --- AUDITED GRAMMAR LESSONS (ZERO UNTAUGHT CHARACTERS OR FORWARD LEAKS) ---
    {
      id: 'u3', title: '3. Fórmula Inglés → Katakana', tag: 'Katakana Aplicado',
      stage1Label: 'Etapa 1 • Fórmula de 4 Reglas (60s)', stage2Label: 'Etapa 2 • Decodifica Palabras Katakana', stage3Label: 'Etapa 3 • Reconocimiento Katakana',
      ruleES: 'Ahora que ya lees todo Katakana, usa estas 4 reglas para decodificar miles de palabras: 1) Sin consonantes solas (añade u/o), 2) L→R, 3) V→B, 4) Finales mudos ganan u/o.',
      ruleEN: '4 rules unlock thousands of Katakana loanwords: break clusters with u/o, L→R, V→B.',
      chunks: [
        { jp: 'スマホ', romaji: 'sumaho', role: 'object', noteES: 'Smartphone → su-ma-ho', noteEN: 'Smartphone' },
        { jp: 'テレビ', romaji: 'terebi', role: 'object', noteES: 'Television → te-re-bi (L→R, V→B)', noteEN: 'Television' },
        { jp: 'タコス', romaji: 'takosu', role: 'topic', noteES: 'Tacos → ta-ko-su (S final gana u)', noteEN: 'Tacos' }
      ],
      puzzlePromptES: 'Selecciona en orden: "Tacos" + "Smartphone"',
      puzzlePromptEN: 'Select in order: "Tacos" + "Smartphone"',
      puzzleAnswer: ['タコス','スマホ'], puzzleDistractors: ['テレビ']
    },
    {
      id: 'm1_g1', title: 'M1-1. Presentación: A は B です', tag: 'Gramática 1',
      stage1Label: 'Etapa 1 • Estructura Base (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Para decir "A es B", pon el tema (de quién hablas) seguido de は — ¡trampa de pronunciación!: se escribe は (ha) pero se pronuncia "wa". Cierra con です (es/soy, forma respetuosa).',
      ruleEN: 'Say "A is B" with は (written ha, read "wa") and polite です.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Marca de quién hablas (se escribe ha, suena "wa")', noteEN: 'Topic marker (read wa)' },
        { jp: 'がくせい', romaji: 'gakusei', role: 'object', noteES: 'Estudiante', noteEN: 'Student' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Soy / Es (forma respetuosa)', noteEN: 'Am / Is (polite)' }
      ],
      puzzlePromptES: 'Arma: "Yo soy estudiante"', puzzlePromptEN: 'Build: "I am a student"',
      puzzleAnswer: ['わたし','は','がくせい','です'], puzzleDistractors: ['せんせい']
    },
    {
      id: 'm1_g2', title: 'M1-2. Negación: じゃありません', tag: 'Gramática 2',
      stage1Label: 'Etapa 1 • Cómo Negar (60s)', stage2Label: 'Etapa 2 • Descomposición de じゃありません', stage3Label: 'Etapa 3 • Arma la Negación',
      ruleES: 'Para decir "no soy / no es", reemplaza です por じゃありません (ja + ari + masen = no es).',
      ruleEN: 'Replace です with じゃありません (ja + ari + masen) to negate.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'De quién hablas (suena "wa")', noteEN: 'Topic' },
        { jp: 'せんせい', romaji: 'sensei', role: 'object', noteES: 'Profesor', noteEN: 'Teacher' },
        { jp: 'じゃありません', romaji: 'ja arimasen', role: 'verb', noteES: 'じゃ + あり + ません = No soy / No es', noteEN: 'Am not / Is not' }
      ],
      puzzlePromptES: 'Arma: "Yo no soy profesor"', puzzlePromptEN: 'Build: "I am not a teacher"',
      puzzleAnswer: ['わたし','は','せんせい','じゃありません'], puzzleDistractors: ['です','がくせい']
    },
    {
      id: 'u4', title: '4. El Verbo Va Al Final y は / を', tag: 'Gramática 3',
      stage1Label: 'Etapa 1 • Regla de Oro (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'En japonés el verbo va SIEMPRE al final: "Yo [は] tacos [を] como". Dos trampas de pronunciación: は suena "wa", y を (que marca el objeto de la acción) suena "o". Verbo: たべる (comer) → たべます (como, respetuoso).',
      ruleEN: 'The verb always goes last. は="wa", を="o". Verb: たべる → たべます.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Se escribe ha, suena "wa"', noteEN: 'Topic (wa)' },
        { jp: 'タコス', romaji: 'takosu', role: 'object', noteES: 'Tacos (objeto)', noteEN: 'Tacos' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Se escribe wo, suena "o" (marca el objeto)', noteEN: 'Object (o)' },
        { jp: 'たべます', romaji: 'tabemasu', role: 'verb', noteES: 'De たべる (comer) → たべます (como)', noteEN: 'Eat (polite)' }
      ],
      puzzlePromptES: 'Arma poniendo el verbo al final: "Yo como tacos"', puzzlePromptEN: 'Build with verb last: "I eat tacos"',
      puzzleAnswer: ['わたし','は','タコス','を','たべます'], puzzleDistractors: ['です','スマホ']
    },
    {
      id: 'u5', title: '5. Lugar Estático (に) vs Acción (で)', tag: 'Gramática 4',
      stage1Label: 'Etapa 1 • に vs で (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'En español ambos son "en". En japonés: usa に (ni) para estar/existir en un lugar, y で (de) donde OCURRE una acción. Verbo: のむ (beber) → のみます (bebo).',
      ruleEN: 'Use に for static location and で where an action happens. のむ → のみます.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'カフェ', romaji: 'kafe', role: 'topic', noteES: 'Cafetería', noteEN: 'Cafe' },
        { jp: 'で', romaji: 'de', role: 'particle', noteES: 'En (lugar donde ocurre la acción)', noteEN: 'At (action)' },
        { jp: 'コーヒー', romaji: 'kōhī', role: 'object', noteES: 'Café', noteEN: 'Coffee' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Suena "o" (objeto)', noteEN: 'Object' },
        { jp: 'のみます', romaji: 'nomimasu', role: 'verb', noteES: 'De のむ (beber) → のみます (bebo)', noteEN: 'Drink' }
      ],
      puzzlePromptES: 'Arma: "Yo tomo café en la cafetería"', puzzlePromptEN: 'Build: "I drink coffee at the cafe"',
      puzzleAnswer: ['わたし','は','カフェ','で','コーヒー','を','のみます'], puzzleDistractors: ['に']
    },
    {
      id: 'u6', title: '6. Adjetivos -i y この vs これ', tag: 'Gramática 5',
      stage1Label: 'Etapa 1 • Adjetivos -i (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Los adjetivos que terminan en -i (como たかい = caro) se niegan quitando la "i" y poniendo くない (たかくない = no es caro). Nota: この va siempre antes de un sustantivo ("este ramen"), mientras que これ va solo ("esto").',
      ruleEN: 'i-adjectives negate with -kunai. この modifies a noun; これ stands alone.',
      chunks: [
        { jp: 'この', romaji: 'kono', role: 'topic', noteES: 'Este (+ sustantivo, diferente a これ)', noteEN: 'This (+ noun)' },
        { jp: 'ラーメン', romaji: 'rāmen', role: 'topic', noteES: 'Ramen', noteEN: 'Ramen' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'たかくない', romaji: 'takakunai', role: 'verb', noteES: 'De たかい (caro) → たかくない (no es caro)', noteEN: 'Not expensive' }
      ],
      puzzlePromptES: 'Arma: "Este ramen no es caro"', puzzlePromptEN: 'Build: "This ramen is not expensive"',
      puzzleAnswer: ['この','ラーメン','は','たかくない'], puzzleDistractors: ['たかい','これ']
    },
    {
      id: 'u7', title: '7. Pedir con ください y Contador つ', tag: 'Gramática 6',
      stage1Label: 'Etapa 1 • Cómo Pedir (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma el Pedido',
      ruleES: 'Para pedir algo usa ください (ku-da-sa-i = deme por favor). Para contar objetos generales usa el contador つ: 1 = ひとつ, 2 = ふたつ (lectura irregular: に cambia a ふたつ).',
      ruleEN: 'Order with ください. General counter: 1=ひとつ, 2=ふたつ (irregular).',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'コーヒー', romaji: 'kōhī', role: 'object', noteES: 'Café', noteEN: 'Coffee' },
        { jp: 'を', romaji: 'o', role: 'particle', noteES: 'Suena "o"', noteEN: 'Object' },
        { jp: 'ふたつ', romaji: 'futatsu', role: 'topic', noteES: 'Dos cosas (irregular de に)', noteEN: 'Two (counter)' },
        { jp: 'ください', romaji: 'kudasai', role: 'verb', noteES: 'く・だ・さ・い = Por favor deme', noteEN: 'Please give me' }
      ],
      puzzlePromptES: 'Pide: "Yo quiero dos cafés, por favor"', puzzlePromptEN: 'Order: "Two coffees, please"',
      puzzleAnswer: ['わたし','は','コーヒー','を','ふたつ','ください'], puzzleDistractors: ['ひとつ','で']
    },
    {
      id: 'u8', title: '8. Omisión del Sujeto y に (Destino)', tag: 'Gramática 7',
      stage1Label: 'Etapa 1 • Omisión y Destino (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Igual que en español dices "Mañana voy a Tokio" sin decir "yo", en japonés omite わたし cuando es obvio. Aquí に marca DESTINO ("hacia"), distinto al に de ubicación estática de la Lección 5. Verbo: いく (ir) → いきます (voy).',
      ruleEN: 'Drop obvious subjects. に marks destination here. いく → いきます.',
      chunks: [
        { jp: 'あした', romaji: 'ashita', role: 'topic', noteES: 'Mañana', noteEN: 'Tomorrow' },
        { jp: 'とうきょう', romaji: 'Tōkyō', role: 'object', noteES: 'Tokio', noteEN: 'Tokyo' },
        { jp: 'に', romaji: 'ni', role: 'particle', noteES: 'Hacia / A (destino)', noteEN: 'To (destination)' },
        { jp: 'いきます', romaji: 'ikimasu', role: 'verb', noteES: 'De いく (ir) → いきます (voy)', noteEN: 'Go (polite)' }
      ],
      puzzlePromptES: 'Arma omitiendo "yo": "Mañana voy a Tokio"', puzzlePromptEN: 'Build dropping "I": "Tomorrow I go to Tokyo"',
      puzzleAnswer: ['あした','とうきょう','に','いきます'], puzzleDistractors: ['で','を']
    },
    {
      id: 'm1_g3', title: 'M1-3. Preguntas con か', tag: 'Gramática 8',
      stage1Label: 'Etapa 1 • Partícula か (60s)', stage2Label: 'Etapa 2 • Partes de la Pregunta', stage3Label: 'Etapa 3 • Arma la Pregunta',
      ruleES: 'Agrega la letra か (ka) al final de cualquier oración con です o ます para volverla pregunta. No cambies el orden de las palabras.',
      ruleEN: 'Add か at the end of a polite sentence to make it a question.',
      chunks: [
        { jp: 'これ', romaji: 'kore', role: 'topic', noteES: 'Esto', noteEN: 'This' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'ひゃくえん', romaji: 'hyakuen', role: 'object', noteES: '100 yenes', noteEN: '100 yen' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Es', noteEN: 'Is' },
        { jp: 'か', romaji: 'ka', role: 'particle', noteES: 'Signo de pregunta', noteEN: 'Question marker' }
      ],
      puzzlePromptES: 'Pregunta: "¿Esto cuesta 100 yenes?"', puzzlePromptEN: 'Ask: "Is this 100 yen?"',
      puzzleAnswer: ['これ','は','ひゃくえん','です','か'], puzzleDistractors: ['じゃありません','この']
    },
    {
      id: 'm1_g4', title: 'M1-4. Posesión con の', tag: 'Gramática 9',
      stage1Label: 'Etapa 1 • Partícula の (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'の conecta dos sustantivos como [Dueño] の [Objeto]. Así, わたし の ほん significa "mi libro".',
      ruleEN: 'の connects [Owner] の [Item]: わたし の ほん = "my book".',
      chunks: [
        { jp: 'これ', romaji: 'kore', role: 'topic', noteES: 'Esto', noteEN: 'This' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'わたし', romaji: 'watashi', role: 'object', noteES: 'Yo (dueño)', noteEN: 'My' },
        { jp: 'の', romaji: 'no', role: 'particle', noteES: 'De (posesión)', noteEN: 'Possessive' },
        { jp: 'ほん', romaji: 'hon', role: 'object', noteES: 'Libro', noteEN: 'Book' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Es', noteEN: 'Is' }
      ],
      puzzlePromptES: 'Arma: "Esto es mi libro"', puzzlePromptEN: 'Build: "This is my book"',
      puzzleAnswer: ['これ','は','わたし','の','ほん','です'], puzzleDistractors: ['を','か']
    },
    {
      id: 'm1_g5', title: 'M1-5. Demostrativos: これ・それ・あれ', tag: 'Gramática 10',
      stage1Label: 'Etapa 1 • Distancias (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Igual que en español: これ (esto, cerca de mí), それ (eso, cerca de ti), あれ (aquello, lejos). Recuerda: これ va solo (pronombre), mientras この va antes de un sustantivo (adjetivo).',
      ruleEN: 'これ (this), それ (that), あれ (that over there). Pronouns vs この.',
      chunks: [
        { jp: 'あれ', romaji: 'are', role: 'topic', noteES: 'Aquello (lejos)', noteEN: 'That over there' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'えき', romaji: 'eki', role: 'object', noteES: 'Estación', noteEN: 'Station' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Es', noteEN: 'Is' }
      ],
      puzzlePromptES: 'Arma: "Aquello es la estación"', puzzlePromptEN: 'Build: "That over there is the station"',
      puzzleAnswer: ['あれ','は','えき','です'], puzzleDistractors: ['これ','この']
    },
    {
      id: 'm1_g6', title: 'M1-6. Partícula も (también)', tag: 'Gramática 11',
      stage1Label: 'Etapa 1 • Partícula も (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'も (mo) significa "también" y REEMPLAZA a は o を. Nunca pongas はも juntos.',
      ruleEN: 'も means "also/too" and replaces は or を.',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'Yo', noteEN: 'I' },
        { jp: 'も', romaji: 'mo', role: 'particle', noteES: 'También (reemplaza は)', noteEN: 'Also' },
        { jp: 'メキシコじん', romaji: 'Mekishikojin', role: 'object', noteES: 'Mexicano/a', noteEN: 'Mexican' },
        { jp: 'です', romaji: 'desu', role: 'verb', noteES: 'Soy', noteEN: 'Am' }
      ],
      puzzlePromptES: 'Arma: "Yo también soy mexicano"', puzzlePromptEN: 'Build: "I am also Mexican"',
      puzzleAnswer: ['わたし','も','メキシコじん','です'], puzzleDistractors: ['は','を']
    },
    {
      id: 'm1_g7', title: 'M1-7. Partícula が y Gustos (すき)', tag: 'Gramática 12',
      stage1Label: 'Etapa 1 • が y Adjetivos-na (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'La partícula が (ga) señala el sujeto específico de un estado o sentimiento. すき (gustar) es un adjetivo-na (distinto a los adjetivos-i de la Lección 6) y siempre usa が para lo que te gusta, nunca を.',
      ruleEN: 'が marks the target of すき (a na-adjective, unlike Lesson 6 i-adjectives).',
      chunks: [
        { jp: 'わたし', romaji: 'watashi', role: 'topic', noteES: 'A mí', noteEN: 'I' },
        { jp: 'は', romaji: 'wa', role: 'particle', noteES: 'Suena "wa"', noteEN: 'Topic' },
        { jp: 'すし', romaji: 'sushi', role: 'object', noteES: 'Sushi', noteEN: 'Sushi' },
        { jp: 'が', romaji: 'ga', role: 'particle', noteES: 'Marca lo que te gusta', noteEN: 'Marks liked thing' },
        { jp: 'すき です', romaji: 'suki desu', role: 'verb', noteES: 'Me gusta (adjetivo-na + です)', noteEN: 'Like' }
      ],
      puzzlePromptES: 'Arma: "Me gusta el sushi"', puzzlePromptEN: 'Build: "I like sushi"',
      puzzleAnswer: ['わたし','は','すし','が','すき です'], puzzleDistractors: ['を','も']
    },
    {
      id: 'm1_g8', title: 'M1-8. Existencia: あります vs います', tag: 'Gramática 13',
      stage1Label: 'Etapa 1 • Seres Vivos vs Objetos (60s)', stage2Label: 'Etapa 2 • Partes de la Oración', stage3Label: 'Etapa 3 • Arma la Oración',
      ruleES: 'Para decir "hay / está" en un lugar (marcado con に): usa あります para objetos, plantas y lugares; usa います para seres vivos que se mueven por sí mismos (personas y animales). Lo que existe lleva が.',
      ruleEN: 'Location takes に; existing item takes が. あります (non-living) vs います (living).',
      chunks: [
        { jp: 'こうえん', romaji: 'kōen', role: 'topic', noteES: 'Parque', noteEN: 'Park' },
        { jp: 'に', romaji: 'ni', role: 'particle', noteES: 'En (ubicación)', noteEN: 'In' },
        { jp: 'こども', romaji: 'kodomo', role: 'object', noteES: 'Niño(s)', noteEN: 'Child(ren)' },
        { jp: 'が', romaji: 'ga', role: 'particle', noteES: 'Marca quién existe', noteEN: 'Subject' },
        { jp: 'います', romaji: 'imasu', role: 'verb', noteES: 'Hay / Están (seres vivos)', noteEN: 'Exist (living)' }
      ],
      puzzlePromptES: 'Arma: "Hay niños en el parque"', puzzlePromptEN: 'Build: "There are children in the park"',
      puzzleAnswer: ['こうえん','に','こども','が','います'], puzzleDistractors: ['あります','で']
    }
  ];

  // Replace base lessons array with the audited curriculum
  lessons.length = 0;
  fullCurriculum.forEach((l) => lessons.push(l));

  /* =========================================================
     3. FLAW 3 & 5: ETAPA 3 ROMAJI FADING + ACCURATE LABELS
  ========================================================= */
  const romajiMap = {};
  lessons.forEach((l) => l.chunks.forEach((c) => { romajiMap[c.jp] = c.romaji; }));

  window.renderLessonWorkspace = function () {
    const l = lessons.find((x) => x.id === activeLessonId) || lessons[0];
    const isES = state.lang === 'es';
    const allTiles = [...l.puzzleAnswer, ...l.puzzleDistractors].sort();
    const s1 = l.stage1Label || 'Etapa 1 • Concepto (60s)';
    const s2 = l.stage2Label || 'Etapa 2 • Partes de la Oración';
    const s3 = l.stage3Label || 'Etapa 3 • Arma la Oración';
    const tapHint = l.isScript
      ? 'Toca cada bloque arriba para escuchar y repetir.'
      : 'Toca cada bloque arriba para escuchar su pronunciación y ver qué significa.';
    const zoneHint = l.isScript
      ? 'Toca las letras de abajo para formar la palabra...'
      : 'Toca los bloques de abajo para armar la oración...';

    const renderTileLabel = (t) => {
      const rom = romajiMap[t] || '';
      const mastered = (state.blockMastery[t] || 0) >= 3;
      return `<span class="jp" style="display:block;">${t}</span>${rom && !mastered ? `<span class="romaji" style="display:block;font-size:0.72rem;color:var(--muted);">${rom}</span>` : ''}`;
    };

    document.getElementById('lessonWorkspace').innerHTML = `
      <span class="tag tag-teal">${s1}</span>
      <h2 style="margin:6px 0;">${l.title}</h2>
      <p style="margin-bottom:14px;">${isES ? l.ruleES : l.ruleEN}</p>

      <span class="tag tag-amber">${s2}</span>
      <div class="anatomy-row">
        ${l.chunks.map((c, idx) => `
          <div class="chunk ${c.role}" onclick="inspectChunk('${l.id}', ${idx})">
            <span class="jp jp-main">${c.jp}</span>
            <span class="romaji">${c.romaji}</span>
          </div>
        `).join('')}
      </div>
      <div id="chunkDetail" class="card-alt" style="font-size:0.88rem; margin-bottom:16px; color:var(--muted);">
        ${tapHint}
      </div>

      <span class="tag tag-green">${s3}</span>
      <p style="font-weight:700; margin-top:6px;">${isES ? l.puzzlePromptES : l.puzzlePromptEN}</p>

      <div class="drop-zone" id="puzzleZone">
        ${puzzleSelected.length === 0 ? `<span style="color:var(--muted); font-size:0.86rem;">${zoneHint}</span>` :
          puzzleSelected.map((t, i) => `<button class="tile" onclick="removeTile(${i})">${renderTileLabel(t)}</button>`).join('')}
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
        ${allTiles.map((t) => `<button class="tile" onclick="addTile('${t}')">${renderTileLabel(t)}</button>`).join('')}
      </div>

      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-green" onclick="checkPuzzle('${l.id}')">Comprobar Orden</button>
        <button class="btn btn-outline" onclick="puzzleSelected=[]; renderLessonWorkspace();">Limpiar</button>
        <button class="btn btn-primary" onclick="speakJP('${l.puzzleAnswer.join('')}')">🔊 Escuchar Frase</button>
      </div>
      <div id="puzzleFeedback" style="margin-top:10px; font-weight:700;"></div>
    `;
  };

  window.checkPuzzle = function (lessonId) {
    const l = lessons.find((x) => x.id === lessonId);
    const ok = JSON.stringify(puzzleSelected) === JSON.stringify(l.puzzleAnswer);
    const fb = document.getElementById('puzzleFeedback');
    if (ok) {
      fb.style.color = 'var(--green)';
      fb.textContent = '✅ ¡Correcto! Dominaste esta lección.';
      speakJP(l.puzzleAnswer.join(''));
      l.puzzleAnswer.forEach((t) => { state.blockMastery[t] = (state.blockMastery[t] || 0) + 1; });
      if (!state.completedLessons.includes(lessonId)) state.completedLessons.push(lessonId);
      saveLocal(true);
      refreshAll();
    } else {
      fb.style.color = 'var(--coral)';
      fb.textContent = `❌ Casi. Respuesta esperada: ${l.puzzleAnswer.join(' ')}`;
      if (!state.leeches.includes(l.title)) { state.leeches.push(l.title); saveLocal(true); renderLeeches(); }
    }
  };

  /* =========================================================
     4. LOAD MES 1 DATA & GATE TABS 2, 3, 4 (FLAW 6)
  ========================================================= */
  let mes1 = { vocab: {}, kanji: [], stories: [] };
  try {
    const res = await fetch('/data/mes1.json');
    if (res.ok) mes1 = await res.json();
  } catch (_) {}

  const hasDone = (reqId) => !reqId || state.completedLessons.includes(reqId);

  // Gate Stories (Tab 2)
  stories.length = 0;
  mes1.stories.forEach((s) => stories.push(s));
  if (stories.length) activeStoryId = stories[0].id;

  window.renderStory = function () {
    const sel = document.getElementById('storySelector');
    const cont = document.getElementById('storyContainer');
    if (!sel || !cont) return;

    sel.innerHTML = stories.map((s) => {
      const unlocked = hasDone(s.reqLesson);
      return `<button class="pill-btn ${s.id === activeStoryId ? 'active' : ''}" onclick="activeStoryId='${s.id}'; renderStory();">
        ${unlocked ? '' : '🔒 '}${s.title}
      </button>`;
    }).join('');

    const st = stories.find((s) => s.id === activeStoryId) || stories[0];
    if (!st) return;
    if (!hasDone(st.reqLesson)) {
      const reqL = lessons.find((l) => l.id === st.reqLesson);
      cont.innerHTML = `<div class="card-alt">🔒 Completa primero <strong>${reqL ? reqL.title : st.reqLesson}</strong> en la Pestaña 1 para desbloquear esta historia sin palabras desconocidas.</div>`;
      return;
    }

    cont.innerHTML = `<div style="font-size:0.82rem;color:var(--teal);font-weight:700;margin-bottom:8px;">${st.level}</div>` +
      st.lines.map((line) => {
        const inSrs = state.srs.some((c) => c.jp === line.jp);
        return `<div class="card-alt" style="margin-bottom:10px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div class="blind-text ${blindMode ? 'hidden-text' : ''}" style="min-width:0; flex:1;" onclick="this.classList.remove('hidden-text')">
              <div class="jp" style="font-size:1.1rem; font-weight:700;">${line.jp}</div>
              <div class="romaji" style="font-size:0.84rem; color:var(--muted);">${line.romaji}</div>
              <div style="font-size:0.88rem; margin-top:4px;">${state.lang === 'es' ? line.es : line.en}</div>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px; flex-shrink:0;">
              <button class="pill-btn" onclick="speakJP('${line.jp}')">🔊</button>
              <button class="pill-btn ${inSrs ? 'saved' : 'green'}" ${inSrs ? 'disabled' : ''} onclick="addToSRS('${line.jp}','${line.romaji}','${line.es}', this)">
                ${inSrs ? '✓ En SRS' : '+SRS'}
              </button>
            </div>
          </div>
        </div>`;
      }).join('');
  };

  // Gate Stroke Practice (Tab 3) — only taught kana/kanji unlock
  const gatedDrawPool = [
    { char: 'あ', reqLesson: 'u1', romaji: 'a', hint: '3 trazos: horizontal, curva vertical, lazo final.' },
    { char: 'い', reqLesson: 'u1', romaji: 'i', hint: '2 trazos: izquierdo más largo con gancho, derecho corto.' },
    { char: 'う', reqLesson: 'u1', romaji: 'u', hint: '2 trazos: tilde arriba + curva derecha.' },
    { char: 'え', reqLesson: 'u1', romaji: 'e', hint: '2 trazos: tilde arriba + trazo en Z.' },
    { char: 'お', reqLesson: 'u1', romaji: 'o', hint: '3 trazos: horizontal, lazo vertical, punto derecho.' },
    { char: 'ら', reqLesson: 'u2', romaji: 'ra', hint: '2 trazos: tilde arriba + curva como un 5.' },
    { char: 'シ', reqLesson: 'k1', romaji: 'shi', hint: '3 trazos: dos gotas horizontales + trazo que SUBE.' },
    { char: 'ツ', reqLesson: 'k2', romaji: 'tsu', hint: '3 trazos: dos gotas verticales + trazo que BAJA.' },
    ...mes1.kanji.map((k) => ({
      char: k.char, reqLesson: k.reqLesson, romaji: `${k.romaji} • ${k.es}`,
      hint: `On: ${k.on} | Kun: ${k.kun} — Ej: ${k.words.join(' / ')} — ${k.hint}`
    }))
  ];

  window.renderCharButtons = function () {
    const unlocked = gatedDrawPool.filter((c) => hasDone(c.reqLesson));
    const el = document.getElementById('charButtons');
    if (!unlocked.length) {
      el.innerHTML = `<div class="card-alt" style="width:100%;font-size:0.86rem;">🔒 Completa la <strong>Lección 1 (Vocales Puras)</strong> para desbloquear tus primeros trazos aquí.</div>`;
      document.getElementById('ghostChar').textContent = '🔒';
      document.getElementById('drawHint').textContent = 'Los trazos se desbloquean al completar cada lección.';
      return;
    }
    if (!unlocked.some((u) => u.char === currentDrawChar?.char)) currentDrawChar = unlocked[0];
    el.innerHTML = unlocked.map((c, i) => `
      <button class="pill-btn jp ${c.char === currentDrawChar.char ? 'active' : ''}" onclick="selectGatedChar('${c.char}')">
        ${state.practicedChars.includes(c.char) ? '✓ ' : ''}${c.char}
      </button>
    `).join('');
    document.getElementById('ghostChar').textContent = currentDrawChar.char;
    document.getElementById('drawHint').textContent = `${currentDrawChar.char} (${currentDrawChar.romaji}): ${currentDrawChar.hint}`;
  };

  window.selectGatedChar = function (ch) {
    currentDrawChar = gatedDrawPool.find((c) => c.char === ch) || gatedDrawPool[0];
    clearCanvas();
    renderCharButtons();
  };

  // Gate SRS cards by Week prerequisite
  const weekReqs = ['m1_g2', 'm1_g3', 'u4', 'm1_g8'];
  Object.entries(mes1.vocab).forEach(([weekLabel, words], idx) => {
    const reqLesson = weekReqs[idx] || 'm1_g8';
    words.forEach(([jp, romaji, es, example]) => {
      if (!state.srs.some((c) => c.jp === jp)) {
        state.srs.push({ id: 'm1_' + jp, jp, romaji, es: `${es} — Ej: ${example}`, interval: 1, nextDue: 0, reqLesson });
      }
    });
  });

  window.getCourseProgress = function () {
    const totalLessons = lessons.length || 1;
    const doneLessons = state.completedLessons.filter((id) => lessons.some((l) => l.id === id)).length;
    const unlockedSrs = state.srs.filter((c) => hasDone(c.reqLesson));
    const totalSrs = unlockedSrs.length || 1;
    const masteredSrs = unlockedSrs.filter((c) => (c.interval || 1) >= 3).length;
    const pct = Math.round((doneLessons / totalLessons) * 70 + (unlockedSrs.length ? (masteredSrs / totalSrs) * 30 : 0));
    return { pct, doneLessons, totalLessons, masteredSrs, totalSrs: unlockedSrs.length, srsPct: unlockedSrs.length ? Math.round((masteredSrs / unlockedSrs.length) * 100) : 0 };
  };

  const origRenderRoadmap = window.renderRoadmapStats;
  window.renderRoadmapStats = function () {
    origRenderRoadmap();
    const hours = state.totalMinutes / 60;
    const p = window.getCourseProgress();
    const lbl = document.getElementById('loggedHoursLabel');
    if (lbl) lbl.textContent = `${hours.toFixed(1)} h (${state.totalMinutes} min) • Meta N5: 250–350 h`;
    const badge = document.getElementById('overallProgressBadge');
    if (badge) badge.textContent = `Progreso general: ${p.pct}% (${p.doneLessons}/${p.totalLessons} lecciones • ${p.masteredSrs}/${p.totalSrs} SRS)`;
    const bar = document.getElementById('hoursProgressBar');
    if (bar) bar.style.width = `${p.pct}%`;
    renderTab4LowerSections();
  };

  // Gated SRS + Persistent Tab 4 Lower Half (only taught shadowing phrases)
  window.renderSRS = function () {
    const now = Date.now();
    const unlocked = state.srs.filter((c) => hasDone(c.reqLesson));
    const due = unlocked.filter((c) => (c.nextDue || 0) <= now);
    const el = document.getElementById('srsContainer');
    if (!unlocked.length) {
      el.innerHTML = `<div class="card-alt">🔒 Completa tus primeras lecciones en la Pestaña 1 para desbloquear tarjetas SRS (así nunca repasas palabras no enseñadas).</div>`;
    } else if (!due.length) {
      el.innerHTML = `<div class="card-alt">🎉 ¡Todo al día! Tienes ${unlocked.length} tarjetas desbloqueadas.</div>`;
    } else {
      const card = due[0];
      el.innerHTML = `<div class="card-alt" style="text-align:center;">
        <small style="color:var(--muted);">Pendientes hoy: ${due.length} • Desbloqueadas: ${unlocked.length} • Intervalo: ${card.interval}d</small>
        <div style="font-size:1.1rem; font-weight:700; margin:12px 0;">"${card.es}"</div>
        ${srsRevealed ? `
          <div class="jp" style="font-size:1.35rem; font-weight:700; color:var(--teal);">${card.jp}</div>
          <div class="romaji" style="color:var(--muted); margin-bottom:12px;">${card.romaji}</div>
          <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-coral" onclick="rateSRS('${card.id}', 1)">Otra vez (1d)</button>
            <button class="btn btn-amber" onclick="rateSRS('${card.id}', 3)">Bien (3d)</button>
            <button class="btn btn-green" onclick="rateSRS('${card.id}', 7)">Fácil (7d)</button>
          </div>
        ` : `<button class="btn btn-primary" onclick="srsRevealed=true; speakJP('${card.jp}'); renderSRS();">Mostrar Respuesta + Audio</button>`}
      </div>`;
    }
    renderTab4LowerSections();
  };

  const gatedShadowing = [
    { reqLesson: 'u1', jp: 'あい', romaji: 'ai', es: 'Amor' },
    { reqLesson: 'm1_g1', jp: 'わたし は がくせい です。', romaji: 'Watashi wa gakusei desu.', es: 'Yo soy estudiante.' },
    { reqLesson: 'u4', jp: 'わたし は タコス を たべます。', romaji: 'Watashi wa takosu o tabemasu.', es: 'Yo como tacos.' },
    { reqLesson: 'u7', jp: 'わたし は コーヒー を ふたつ ください。', romaji: 'Watashi wa kōhī o futatsu kudasai.', es: 'Dos cafés, por favor.' }
  ];
  let shadowIdx = 0;

  window.renderTab4LowerSections = function () {
    const tabSrs = document.getElementById('tab-srs');
    if (!tabSrs) return;
    let wrap = document.getElementById('tab4LowerStudio');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'tab4LowerStudio'; tabSrs.appendChild(wrap); }
    const p = window.getCourseProgress();
    const availShadow = gatedShadowing.filter((s) => hasDone(s.reqLesson));
    const s = availShadow[shadowIdx % (availShadow.length || 1)];

    wrap.innerHTML = `
      <div class="card">
        <span class="tag tag-teal">Estadísticas SRS</span>
        <div style="font-size:0.9rem; margin-top:4px;">
          <strong>${p.masteredSrs}</strong> dominadas de <strong>${p.totalSrs}</strong> desbloqueadas • Progreso general: <strong>${p.pct}%</strong>
        </div>
        <div class="progress-track" style="margin-top:8px;"><div class="progress-fill" style="width:${p.srsPct}%;"></div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <span class="tag tag-teal">Shadowing • Escucha y Repite</span>
          <h3 style="margin:6px 0 8px;">Escucha y Repite</h3>
          ${s ? `
            <div class="card-alt"><div class="jp" style="font-size:1.2rem;font-weight:700;">${s.jp}</div><div class="romaji" style="font-size:0.84rem;color:var(--muted);">${s.romaji}</div><div style="font-size:0.88rem;margin-top:4px;">${s.es}</div></div>
            <div style="display:flex;gap:8px;margin-top:10px;"><button class="btn btn-primary" onclick="speakJP('${s.jp}', 0.8)">🔊 Escuchar</button><button class="btn btn-outline" onclick="shadowIdx++; renderTab4LowerSections();">Siguiente →</button></div>
          ` : `<div class="card-alt">🔒 Completa la Lección 1 para desbloquear tu primera frase de Shadowing.</div>`}
        </div>
        <div class="card">
          <span class="tag tag-amber">Prueba de Voz • Tu turno</span>
          <h3 style="margin:6px 0 8px;">Tu turno</h3>
          <div class="card-alt" id="voiceTestStatus" style="font-size:0.88rem;margin-bottom:10px;">
            ${s ? `Listo para practicar: <strong class="jp">${s.jp}</strong>` : '🔒 Completa la Lección 1 para desbloquear.'}
          </div>
          ${s ? `<button class="btn btn-primary" onclick="speakJP('${s.jp}', 0.85)">🔊 Escuchar Modelo</button>` : ''}
        </div>
      </div>`;
  };

  const origSwitchTab = window.switchTab;
  window.switchTab = function (tabId) {
    origSwitchTab(tabId);
    if (tabId === 'srs') renderTab4LowerSections();
    if (tabId === 'reading') renderStory();
    if (tabId === 'writing') renderCharButtons();
  };

  if (typeof refreshAll === 'function') refreshAll();
  renderTab4LowerSections();
})();
