// ============================================================================
// Trilingual Interface & Localization Engine (Arabic · English · Deutsch)
// Ensures exact 1:1 translation of all UI labels, dynamic phrases, and
// bidirectional RTL (Arabic) / LTR (English & German) layout synchronization.
// ============================================================================

const LANG_STORAGE_KEY = 'chunk-trainer-lang';
const SUPPORTED_LANGS = ['ar', 'en', 'de'];

let currentLang = 'ar';
try {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) {
    currentLang = saved;
  }
} catch {}

// Exact Phrase Dictionary: Maps Arabic strings to exact [English, German]
const EXACT_PHRASES = new Map([
  // Brand & Topbar Navigation
  ['دفتر الشانكس', ['Chunk Notebook', 'Chunk-Heft']],
  ['ألماني من A1 لـ C1', ['German from A1 to C1', 'Deutsch von A1 bis C1']],
  ['الرئيسية', ['Home', 'Startseite']],
  ['المكتبة المصورة', ['Visual Library', 'Bildbibliothek']],
  ['المراجعة', ['Review', 'Wiederholung']],
  ['التقدم', ['Progress', 'Fortschritt']],
  ['الإنجازات', ['Achievements', 'Erfolge']],
  ['الطريقة', ['Method', 'Methode']],
  ['تشيل مود', ['Chill Mode', 'Chill-Modus']],
  ['ابدأ سلسلتك', ['Start your streak', 'Starte deine Serie']],
  ['لسه مفيش أيام متواصلة', ['No active streak yet', 'Noch keine aktive Serie']],
  ['الإعدادات', ['Settings', 'Einstellungen']],
  ['الصوت', ['Sound', 'Ton']],
  ['كتم / تشغيل الصوت', ['Mute / Unmute Sound', 'Ton ein- / ausschalten']],
  ['الصوت مكتوم — اضغط للتشغيل', ['Sound muted — click to unmute', 'Ton stumm — zum Einschalten klicken']],
  ['المؤثرات الصوتية مفعلة — اضغط للكتم', ['Sound effects on — click to mute', 'Soundeffekte aktiv — zum Stummschalten klicken']],
  ['تم تفعيل المؤثرات الصوتية 🔊', ['Sound effects enabled 🔊', 'Soundeffekte aktiviert 🔊']],
  ['تم كتم الصوت 🔇', ['Sound muted 🔇', 'Ton stummgeschaltet 🔇']],

  // Home Screen
  ['جلسة النهاردة', ["Today's Session", 'Heutige Sitzung']],
  ['كمّل', ['Continue', 'Mach weiter,']],
  ['من حيث وقفت', ['where you left off', 'wo du aufgehört hast']],
  ['اللي جاي جاهز', ['Up Next is Ready', 'Der nächste Chunk ist bereit']],
  ['ابدأ أول Chunk', ['Start Your First Chunk', 'Starte deinen ersten Chunk']],
  ['التطبيق بيحفظ كل خطوة وكل إنتاج — تقفل وترجع بعد أسبوع، هتلاقي نفسك واقف في نفس المكان بالظبط.', [
    'Every step and production is auto-saved — close the app and come back a week later to pick up right where you left off.',
    'Jeder Schritt und jede Produktion wird automatisch gespeichert — schließe die App und mach jederzeit genau dort weiter.',
  ]],
  ['افتح الجلسة', ['Open Session', 'Sitzung öffnen']],
  ['المكتبة المصورة (619 لوحة)', ['Visual Library (619 Boards)', 'Bildbibliothek (619 Tafeln)']],
  ['شوف المستويات', ['Browse Levels', 'Stufen ansehen']],
  ['أرقامك النهاردة', ["Today's Stats", 'Deine Zahlen heute']],
  ['مستحق للمراجعة', ['Due for Review', 'Zur Wiederholung fällig']],
  ['مستحق', ['due', 'fällig']],
  ['صفّي', ['all clear', 'alles erledigt']],
  ['إنتاجات النهاردة', ["Today's Productions", 'Heutige Produktionen']],
  ['جمل متقنة', ['Mastered Chunks', 'Gemeisterte Chunks']],
  ['هدفك اليومي', ['Daily Goal', 'Tagesziel']],
  ['خلصت هدف النهاردة', ['Daily Goal Completed!', 'Tagesziel erreicht!']],
  ['المستويات', ['CEFR Levels', 'GER-Stufen']],
  ['اختار مستوى، والبرنامج يمشي معاك جملة جملة على 6 خطوات.', [
    'Choose a level and master German sentence by sentence through the 6-step method.',
    'Wähle eine Stufe und meistere Deutsch Satz für Satz mit der 6-Schritte-Methode.',
  ]],
  ['ابدأ المراجعة', ['Start Review', 'Wiederholung starten']],
  ['مفيش مستحق', ['Nothing due', 'Nichts fällig']],
  ['لسه جديد', ['Not started', 'Noch neu']],
  ['الطريقة كاملة + جدول التكرار', ['Full Method + Spaced Schedule', 'Vollständige Methode + Wiederholungsplan']],
  ['اختبر نفسك: استدعاء، سرعة، كلام', ['Test yourself: recall, speed, speaking', 'Teste dich: Abruf, Tempo, freies Sprechen']],
  ['متقن ومراجعته جاية', ['Mastered — scheduled for review', 'Gemeistert — Wiederholung geplant']],

  // Level Names & Descriptions
  ['الأساسيات', ['Foundations', 'Grundlagen']],
  ['البناء الأولي', ['Elementary Building', 'Grundlegender Aufbau']],
  ['التعبير المستقل', ['Independent Expression', 'Selbstständiger Ausdruck']],
  ['الطلاقة', ['Fluency', 'Gewandtheit']],
  ['الإتقان', ['Mastery', 'Meisterschaft']],
  ['التواصل اليومي', ['Everyday Communication', 'Alltagskommunikation']],
  ['الاستقلالية', ['Independent Expression', 'Selbstständige Sprachverwendung']],
  ['الطلاقة المتقدمة', ['Advanced Fluency', 'Fortgeschrittene Gewandtheit']],
  ['الإتقان الأكاديمي والمهني', ['Academic & Professional Mastery', 'Fachkundige Sprachkenntnisse']],
  ['📐 المستويات والقواعد', ['📐 Levels & Grammar', '📐 Stufen & Grammatik']],
  ['💬 الكلمات والتعبيرات', ['💬 Vocab & Idioms', '💬 Wortschatz & Idiome']],
  ['🏛️ الأساطير والتاريخ', ['🏛️ Mythology & History', '🏛️ Mythologie & Geschichte']],
  ['🧠 الفلسفة وعلم النفس', ['🧠 Philosophy & Psychology', '🧠 Philosophie & Psychologie']],
  ['🎬 الأدب والثقافة والفن', ['🎬 Literature & Culture', '🎬 Literatur & Kultur']],
  ['أساسيات الكلام اليومي: طلبات، تعريف بنفسك، وأسئلة بسيطة.', [
    'Everyday essentials: polite requests, introducing yourself, and simple questions.',
    'Grundlagen des Alltags: Bitten, sich vorstellen und einfache Fragen.',
  ]],
  ['تمدّد في الحياة اليومية: مواعيد، سفر، شغل، وخطط قريبة.', [
    'Expanding daily life: appointments, travel, work, and near-future plans.',
    'Erweiterter Alltag: Termine, Reisen, Arbeit und nächste Pläne.',
  ]],
  ['تعبر عن رأيك وتشرح أسبابك في مواقف مألوفة.', [
    'Expressing opinions and explaining reasons in familiar situations.',
    'Meinungen äußern und Gründe in vertrauten Situationen erklären.',
  ]],
  ['تناقش موضوعات مركبة بطلاقة ودقة أعلى.', [
    'Discussing complex topics with higher fluency and precision.',
    'Komplexe Themen flüssig und präzise diskutieren.',
  ]],
  ['صياغات دقيقة للمناقشات والأفكار المعقدة.', [
    'Nuanced academic and professional formulations for complex arguments.',
    'Präzise Formulierungen für anspruchsvolle Diskussionen und komplexe Ideen.',
  ]],

  // 6 Stages
  ['افهم', ['Understand', 'Verstehen']],
  ['انطق', ['Speak', 'Sprechen']],
  ['درّب', ['Produce', 'Produzieren']],
  ['اختبر', ['Test', 'Testen']],
  ['التنويع', ['Vary', 'Variieren']],
  ['افهم الـChunk', ['Understand the Chunk', 'Chunk verstehen']],
  ['انطقه بصوت عالي', ['Speak it Out Loud', 'Laut aussprechen']],
  ['درّب عليه 30 إنتاج', ['Practice 30 Productions', '30 Produktionen üben']],
  ['اختبر نفسك', ['Test Yourself', 'Teste dich selbst']],
  ['المرحلة الختامية: غيّر كل مرة', ['Finale: Vary Every Time', 'Finale: Jedes Mal variieren']],
  ['اقرأ، افهم المعنى، شوف الوظيفة', ['Read, grasp the meaning, identify its function', 'Lesen, Bedeutung erfassen, Funktion erkennen']],
  ['بطيء، طبيعي، وبعدين من غير ما تبص', ['Slow, natural speed, then blind from memory', 'Langsam, natürlich und dann frei aus dem Gedächtnis']],
  ['10 + 5 + 5 + 5 + 5 على أيام', ['10 + 5 + 5 + 5 + 5 spaced across days', '10 + 5 + 5 + 5 + 5 verteilt über mehrere Tage']],
  ['استدعاء سريع، سرعة، كلام مرتجل', ['Active recall, speed sprint, spontaneous speech', 'Schneller Abruf, Sprint, freies Sprechen']],
  ['5 تنويعات شاملة لقالب المجموعة', ['5 comprehensive variations across group patterns', '5 umfassende Variationen der Gruppenmuster']],

  // Visual Library Hub
  ['مركز المحتوى المصور · Abdo & Friends Hub', ['Visual Content Center · Abdo & Friends Hub', 'Visuelles Wissenszentrum · Abdo & Friends Hub']],
  ['المكتبة', ['Comprehensive', 'Umfassende']],
  ['المصورة الشاملة', ['Visual Library', 'Bildbibliothek']],
  ['كل الأقسام', ['All Categories', 'Alle Kategorien']],
  ['🌟 كل الأقسام', ['🌟 All Categories', '🌟 Alle Kategorien']],
  ['المستويات والقواعد', ['Levels & Grammar', 'Stufen & Grammatik']],
  ['الكلمات والتعبيرات', ['Vocab & Idioms', 'Wortschatz & Idiome']],
  ['الأساطير والتاريخ', ['Mythology & History', 'Mythologie & Geschichte']],
  ['الفلسفة وعلم النفس', ['Philosophy & Psychology', 'Philosophie & Psychologie']],
  ['الأدب والثقافة والفن', ['Literature & Culture', 'Literatur & Kultur']],
  ['تقدمك في المكتبة', ['Your Library Progress', 'Dein Bibliotheksfortschritt']],
  ['إجمالي اللوحات', ['Total Visual Boards', 'Gesamtanzahl Tafeln']],
  ['لوحة', ['boards', 'Tafeln']],
  ['تمت قراءتها', ['Marked as Read', 'Als gelesen markiert']],
  ['في المفضلة', ['In Favorites', 'Unter Favoriten']],
  ['محفوظة', ['saved', 'gespeichert']],
  ['نسبة القراءة', ['Completion Rate', 'Lesefortschritt']],
  ['كل المستويات', ['All Levels', 'Alle Stufen']],
  ['الكل', ['All', 'Alle']],
  ['كل الموضوعات', ['All Topics', 'Alle Themen']],
  ['تكبير وقراءة', ['Zoom & Read', 'Vergrößern & Lesen']],
  ['مقروء', ['Read', 'Gelesen']],
  ['تمت قراءته', ['Marked Read', 'Gelesen']],
  ['علّم كمقروء', ['Mark as Read', 'Als gelesen markieren']],
  ['مفضلة', ['Favorite', 'Favorit']],
  ['المفضلة', ['Favorites', 'Favoriten']],
  ['عرض كل المكتبة', ['Show Entire Library', 'Gesamte Bibliothek anzeigen']],
  ['مفيش نتائج مطابقة للفلتر الحالي', ['No visual boards match the current filter', 'Keine Tafeln entsprechen dem aktuellen Filter']],
  ['جرّب تغيّر القسم أو المستوى أو تمسح كلمة البحث علشان تشوف كل البطاقات المصورة.', [
    'Try switching the category, level, or clearing the search box to see all visual boards.',
    'Wechsle die Kategorie oder Stufe oder lösche die Suche, um alle Tafeln zu sehen.',
  ]],
  ['تمت الإزالة من المفضلة', ['Removed from Favorites', 'Aus Favoriten entfernt']],
  ['تم الحفظ في المفضلة ✨', ['Saved to Favorites ✨', 'Zu Favoriten hinzugefügt ✨']],

  // Level Screen
  ['كمّل من غير المتقن', ['Continue Unfinished', 'Unvollendete fortsetzen']],
  ['متقن', ['Mastered', 'Gemeistert']],
  ['شغال عليه', ['In Progress', 'In Arbeit']],
  ['جديد', ['New', 'Neu']],
  ['الشرح المصور', ['Visual Guides', 'Bildtafeln']],
  ['فتح في المكتبة ↗', ['Open in Library ↗', 'In Bibliothek öffnen ↗']],
  ['متقنة بالكامل 🏆', ['Fully Mastered 🏆', 'Vollständig gemeistert 🏆']],
  ['5 تنويعات جاهزة ✓', ['5 Variations Ready ✓', '5 Variationen fertig ✓']],
  ['قيد التدريب', ['In Training', 'Im Training']],
  ['مجموعة جديدة', ['New Group', 'Neue Gruppe']],
  ['التنويعات جاهزة ✓', ['Variations Done ✓', 'Variationen fertig ✓']],
  ['المرحلة الختامية ⚡', ['Group Finale ⚡', 'Gruppenfinale ⚡']],
  ['إخفاء الجمل ▲', ['Hide Sentences ▲', 'Sätze ausblenden ▲']],

  // Practice Screen
  ['اقرأ الجملة، افهم معناها بالعربي، وحدد وظيفتها قبل أي تدريب.', [
    'Read the sentence, understand its meaning, and identify its communicative function before drilling.',
    'Lies den Satz, verstehe seine Bedeutung und bestimme seine Funktion vor dem Training.',
  ]],
  ['غطّي المعنى الأول... جرّب تفهمه بنفسك', ['Meaning hidden... try to understand it first', 'Bedeutung verdeckt... versuche es zuerst selbst zu verstehen']],
  ['شوف المعنى', ['Reveal Meaning', 'Bedeutung zeigen']],
  ['اقرأ الجملة بصوت واطي', ['Read the sentence quietly', 'Lies den Satz leise durch']],
  ['مرة واحدة كفاية — المهم تفهمها مش تحفظها', ['Once is enough — focus on understanding, not memorizing', 'Einmal genügt — Verstehen kommt vor dem Auswendiglernen']],
  ['افهم المعنى بالعربي', ['Understand the meaning', 'Verstehe die genaue Bedeutung']],
  ['شوف الترجمة وقارنها باللي فهمته', ['Check the translation and compare it with your guess', 'Prüfe die Übersetzung und vergleiche sie mit deinem Verständnis']],
  ['اعرف الوظيفة', ['Identify the function', 'Erkenne die Satzfunktion']],
  ['رأي؟ مقارنة؟ سبب؟ رد؟', ['Opinion? Comparison? Reason? Reply?', 'Meinung? Vergleich? Grund? Antwort?']],
  ['راقب ترتيب الكلمات', ['Observe the word order', 'Achte auf die Wortstellung (Satzbau)']],
  ['شوف إيه الثابت وإيه اللي بيتغير', ['Notice the fixed chunk template vs. the variable slot', 'Erkenne das feste Satzmuster und den variablen Teil']],
  ['وظيفة الجملة في الكلام', ['Communicative Function', 'Funktion des Satzes']],
  ['رأي', ['Opinion', 'Meinung']],
  ['مقارنة', ['Comparison', 'Vergleich']],
  ['سبب', ['Reason', 'Grund']],
  ['نتيجة', ['Result', 'Folge']],
  ['طلب', ['Request', 'Bitte']],
  ['رفض', ['Refusal', 'Ablehnung']],
  ['رد', ['Reply', 'Antwort']],
  ['اقتراح', ['Suggestion', 'Vorschlag']],
  ['افتح خريطة الكلمات', ['Open Word Map', 'Wortkarte öffnen']],
  ['خريطة الجملة', ['Sentence Word Map', 'Satzstruktur-Karte']],
  ['فهمت — يلا ننطقها', ['Understood — Let’s Speak It', 'Verstanden — Jetzt aussprechen']],
  ['اسمعه ببطء', ['Listen Slowly', 'Langsam anhören']],
  ['اسمعه طبيعي', ['Listen Natural', 'Natürlich anhören']],
  ['ردد في نفس الوقت', ['Shadow Along', 'Gleichzeitig mitsprechen']],
  ['1 · ببطء', ['1 · Slowly', '1 · Langsam']],
  ['2 · بسرعة طبيعية', ['2 · Natural Speed', '2 · Natürliches Tempo']],
  ['3 · من غير ما تبص', ['3 · Blind Recall', '3 · Ohne hinzusehen']],
  ['سجّل صوتك وقارنه (اختياري)', ['Record & compare your voice (optional)', 'Stimme aufnehmen & vergleichen (optional)']],
  ['ابدأ التسجيل', ['Start Recording', 'Aufnahme starten']],
  ['مسار الجملة', ['Chunk Path', 'Chunk-Pfad']],
  ['وقت الجلسة', ['Session Time', 'Sitzungszeit']],
  ['إنتاجات الجملة', ['Chunk Productions', 'Chunk-Produktionen']],
  ['آخر حفظ', ['Last Saved', 'Zuletzt gespeichert']],
  ['شوف القايمة كلها', ['View Full Level List', 'Gesamte Stufenliste']],
  ['محفوظ تلقائيًا', ['Auto-saved', 'Automatisch gespeichert']],

  // Review Screen
  ['مراجعة النهاردة', ["Today's Review", 'Heutige Wiederholung']],
  ['فاضل شغل بسيط وتبقى في السليم', ['A quick review session to lock in your memory', 'Noch eine kurze Wiederholung für dein Langzeitgedächtnis']],
  ['مفيش حاجة مستحقة النهاردة', ['Nothing Due Today!', 'Heute ist nichts fällig!']],
  ['مستحق النهاردة', ['Due Today', 'Heute fällig']],
  ['مفيش مراجعة مستحقة', ['No Reviews Due Right Now', 'Keine Wiederholungen fällig']],
  ['المراجعة بتظهر لوحدها في مواعيدها. تقدر تفتح جملة جديدة أو تراجع حاجة من المستويات.', [
    'Reviews appear automatically on schedule. You can start a new chunk or browse the levels.',
    'Wiederholungen erscheinen automatisch nach Zeitplan. Starte einen neuen Chunk oder wähle eine Stufe.',
  ]],
  ['افتح الجملة الحالية', ['Open Current Chunk', 'Aktuellen Chunk öffnen']],
  ['شوف تقدمك', ['View Your Progress', 'Fortschritt ansehen']],
  ['قايمة المراجعة', ['Review Queue', 'Wiederholungsliste']],
  ['مراجعة جملة متقنة', ['Mastered Chunk Review', 'Gemeisterten Chunk wiederholen']],
  ['إنتاج مستحق', ['Scheduled Production', 'Fällige Produktion']],
  ['استدعاء مؤجل', ['Delayed Recall', 'Verzögerter Abruf']],
  ['شوف الجملة', ['Show Sentence', 'Satz anzeigen']],
  ['نسيتها', ['Forgot', 'Vergessen']],
  ['تقريبًا', ['Almost', 'Fast']],
  ['عرفتها', ['Got It', 'Gewusst']],

  // Stats Screen
  ['تقدمك', ['Your Progress', 'Dein Fortschritt']],
  ['كل رقم هنا اتحسب من شغلك', ['Every metric is calculated directly from your real practice', 'Jede Zahl basiert direkt auf deinem echten Training']],
  ['التقدم بيتحفظ في ملف على جهازك — مفيش سيرفر ومفيش حساب.', [
    'Your progress is stored 100% locally on your device — no server, no account required.',
    'Dein Fortschritt wird lokal auf deinem Gerät gespeichert — kein Server, kein Konto nötig.',
  ]],
  ['صدّر', ['Export', 'Exportieren']],
  ['استورد', ['Import', 'Importieren']],
  ['إنتاج إجمالي', ['Total Productions', 'Gesamtproduktionen']],
  ['جملة متقنة', ['Mastered Chunks', 'Gemeisterte Chunks']],
  ['وقت تدريب تقديري', ['Estimated Practice Time', 'Geschätzte Trainingszeit']],
  ['أطول سلسلة', ['Longest Streak', 'Längste Serie']],
  ['نشاطك آخر 12 أسبوع', ['Activity Over Last 12 Weeks', 'Deine Aktivität der letzten 12 Wochen']],
  ['جدول تتبع مواعيد المراجعات (Spaced Repetition)', ['Spaced Repetition Schedule Tracker', 'Spaced-Repetition-Zeitplan']],
  ['كل المراجعات مجدولة', ['All Reviews Scheduled', 'Alle Wiederholungen geplant']],
  ['صفحة المراجعة', ['Review Page', 'Zur Wiederholung']],
  ['آخر حركة', ['Recent Activity', 'Letzte Aktivitäten']],
  ['لسه مفيش حركة — افتح أول جملة وابدأ.', ['No activity yet — open your first chunk and begin.', 'Noch keine Aktivität — öffne deinen ersten Chunk.']],

  // Trophies Screen
  ['خزانة الإنجازات والتحفيز اللحظي', ['Trophy Cabinet & Real-Time Gamification', 'Trophäenschrank & Echtzeit-Motivation']],
  ['إنجازاتك المعتمدة ونقاط الإتقان', ['Verified Achievements & Mastery XP', 'Deine Auszeichnungen & Meisterungs-XP']],
  ['استخراج شهادة مستوى', ['Generate Level Certificate', 'Stufenzertifikat erstellen']],
  ['أوسمة مكتملة في الخزانة', ['Unlocked Badges in Cabinet', 'Freigeschaltete Abzeichen']],
  ['أطول سلسلة متواصلة', ['Current Active Streak', 'Aktuelle Tages-Serie']],
  ['شهادات المهارة المعتمدة', ['Verified Skill Certificates', 'Zertifizierte Sprachnachweise']],
  ['شهادات قابلة للطباعة والحفظ (A1 إلى C1)', ['Printable & Saveable Certificates (A1 to C1)', 'Druck- & speicherbare Zertifikate (A1 bis C1)']],
  ['عرض وطباعة الشهادة', ['View & Print Certificate', 'Zertifikat anzeigen & drucken']],
  ['كمّل الشروط الأول (100 شانك)', ['Complete 100 Chunks First', 'Zuerst 100 Chunks meistern']],

  // Method Screen
  ['الـChunk يبقى تلقائي في الكلام', ['Making German Chunks Automatic in Speech', 'Wie Chunks im Gespräch automatisch werden']],
  ['مش مجرد حفظ — 6 خطوات لكل جملة، وجدول تكرار بيخليها تثبت.', [
    'Not rote memorization — 6 deliberate steps per sentence plus spaced repetition.',
    'Kein stures Auswendiglernen — 6 gezielte Schritte pro Satz mit verteilter Wiederholung.',
  ]],
  ['ابدأ جلسة', ['Start Session', 'Sitzung starten']],
  ['كبّر الصورة', ['Zoom Poster', 'Bild vergrößern']],
  ['جدول الـ30 إنتاج', ['The 30-Production Schedule', 'Der 30-Produktionen-Zeitplan']],
  ['ظبط هدفك اليومي', ['Configure Daily Goal', 'Tagesziel anpassen']],

  // Settings Screen
  ['خلي البرنامج على مزاجك', ['Customize Your Experience', 'Passe die App an deine Bedürfnisse an']],
  ['كل حاجة هنا بتتحفظ فورًا على جهازك.', ['All changes are saved immediately on your device.', 'Alle Einstellungen werden sofort lokal gespeichert.']],
  ['التفضيلات', ['Preferences & Language', 'Einstellungen & Sprache']],
  ['اليومي والواجهة', ['Daily Goals, Theme & Interface Language', 'Tagesziel, Design & Oberflächensprache']],
  ['الوضع الليلي', ['Dark Mode', 'Dunkelmodus']],
  ['ألوان هادية للعين في المذاكرة بالليل', ['Eye-friendly dark palette for night study sessions', 'Augenschonende dunkle Farben für das Lernen am Abend']],
  ['تجربة الصوتيات الاستوديو', ['Studio Sound Experience', 'Studio-Klangwelt']],
  ['مؤثرات تفاعلية وماريمبا موسيقية (Tone.js & snd-lib)', [
    'Interactive tactile audio & marimba chimes (Tone.js & snd-lib)',
    'Interaktive Soundeffekte & Marimba-Klänge (Tone.js & snd-lib)',
  ]],
  ['اختر المستويات اللي حابب تتدرب عليها. كروت فردية، تشغيل نطق تلقائي، وتمارين سريعة خفيفة مع إمكانية إدراج أي جملة في جدول التكرار المتباعد بنقرة واحدة.', [
    'Pick the levels you want to practice: single cards, auto-play German pronunciation, quick light drills, and one-click Spaced Repetition scheduling.',
    'Wähle deine Trainingsstufen: einzelne Karten, automatische Sprachausgabe, kurze Übungen und Ein-Klick-Wiederholungsplan.',
  ]],
  ['تقدر تختار مستوى واحد أو أكثر في نفس الجلسة:', [
    'You can select one or multiple levels for this session:',
    'Du kannst eine oder mehrere Stufen für diese Sitzung auswählen:',
  ]],
  ['تجاوز الجمل اللي أتممت فيها كل تمارين التشيل مود مسبقاً.', [
    'Skip chunks where you have already completed all Chill Mode exercises.',
    'Überspringe Chunks, deren Chill-Modus-Übungen bereits abgeschlossen sind.',
  ]],
  ['كل عمود أسبوع (من السبت للجمعة) وكل مربع يوم — لونه بيكبر مع عدد الإنتاجات.', [
    'Each column is a week (Sat–Fri) and each cell is a day — deeper color means more productions.',
    'Jede Spalte ist eine Woche (Sa–Fr), jedes Feld ein Tag — intensivere Farbe bedeutet mehr Produktionen.',
  ]],
  ['مواعيد دقيقة بالعدّ التنازلي المباشر للمراحل الأربع لكل جملة نشطة', [
    'Exact live countdown schedules across all 4 spaced-repetition stages for every active chunk',
    'Exakte Live-Countdowns für alle 4 Spaced-Repetition-Stufen jedes aktiven Chunks',
  ]],
  ['المؤثرات الصوتية العامة', ['Master Sound Effects', 'Allgemeine Soundeffekte']],
  ['مستوى صوت المؤثرات', ['Sound Effects Volume', 'Lautstärke der Soundeffekte']],
  ['تنبيهات ومواعيد المراجعة', ['Review Alerts & Reminders', 'Wiederholungs-Benachrichtigungen']],
  ['إشعارات ويندوز للمراجعة', ['Windows Desktop Notifications', 'Windows-Benachrichtigungen']],
  ['المنبه الصوتي الخفيف (تيت تيت)', ['Gentle Review Chime', 'Sanfter Wiederholungs-Ton']],
  ['تجربة الإشعار والصوت', ['Test Notification & Chime', 'Benachrichtigung & Ton testen']],
  ['الصوت الألماني', ['German Speech Engine (TTS)', 'Deutsche Sprachausgabe (TTS)']],
  ['تشغيل الصوت', ['Enable German TTS', 'Sprachausgabe aktivieren']],
  ['سرعة النطق الافتراضية', ['Default Speech Rate', 'Standard-Sprechtempo']],
  ['محرك النطق', ['Voice Engine', 'Stimmenauswahl']],
  ['جرّب الصوت', ['Test German Voice', 'Stimme testen']],
  ['اسمع', ['Listen', 'Anhören']],
  ['التعرف الصوتي الذكي (Whisper AI)', ['Local Speech Recognition (Whisper AI)', 'Lokale Spracherkennung (Whisper AI)']],
  ['البيانات', ['Local Data & Backups', 'Lokale Daten & Backups']],
  ['افتح فولدر البيانات', ['Open Data Folder', 'Datenordner öffnen']],
  ['صدّر نسخة', ['Export Backup', 'Backup exportieren']],
  ['استورد نسخة', ['Import Backup', 'Backup importieren']],
  ['مسح كل التقدم', ['Reset All Progress', 'Gesamten Fortschritt zurücksetzen']],
  ['مسح', ['Reset', 'Zurücksetzen']],
  ['عن التطبيق', ['About the App', 'Über die App']],
  ['شوف المنهج', ['View Method', 'Methode ansehen']],
  ['دفتر الشانكس — نسخة محلية بالكامل', ['Chunk Notebook — 100% Local & Offline', 'Chunk-Heft — 100 % lokal & offline']],
  ['1500 جملة من A1 لـ C1، مقسمة 5 مستويات، بمسار 6 خطوات ومكتبة مصورة شاملة.', [
    '1,500 German chunks from A1 to C1 across 5 CEFR levels, 6-step mastery path, and 619 visual learning boards.',
    '1.500 deutsche Chunks von A1 bis C1 in 5 GER-Stufen, 6-Schritte-Methode und 619 visuelle Lehrtafeln.',
  ]],
  ['لغة الواجهة · Interface Language · Sprache', ['Interface Language', 'Oberflächensprache']],
  ['تبديل فوري ودقيق للواجهة بالكامل بين العربية والإنجليزية والألمانية', [
    'Switch the entire application interface instantly between Arabic, English, and German.',
    'Wechsle die gesamte App-Oberfläche sofort zwischen Arabisch, Englisch und Deutsch.',
  ]],
  ['عدد الإنتاجات اللي عايز تخلصها في اليوم. الافتراضي 25.', [
    'Number of sentence productions to complete per day (default: 25).',
    'Anzahl der täglichen Satzproduktionen (Standard: 25).',
  ]],
  ['أصوات التفاعل، الإنجازات، التمرير، والمؤقتات.', [
    'Tactile clicks, achievement chimes, step progression, and timers.',
    'Klickgeräusche, Erfolgs-Signale, Schritt-Feedback und Timer.',
  ]],
  ['محمي بواسطة Limiter (-2dB) وReverb هادئ لمنع أي إزعاج لسماعات الرأس.', [
    'Protected by a -2dB Limiter and soft reverb for comfortable headphone listening.',
    'Geschützt durch einen -2dB-Limiter und sanften Hall für angenehmes Hören.',
  ]],
  ['معاينة واختبار أصوات الإنجازات والمؤقتات', ['Preview & Test Achievement & Timer Sounds', 'Erfolgs- & Timer-Klänge testen']],
  ['رنة الخطوة (Set/Step)', ['Step Chime', 'Schritt-Klang']],
  ['انتهاء المؤقت (Rest Chime)', ['Rest Timer Chime', 'Timer-Ende']],
  ['اكتمال الجلسة (Session Complete)', ['Session Complete', 'Sitzung abgeschlossen']],
  ['إنجاز قياسي جديد (New PR Fanfare)', ['New Record Fanfare', 'Neuer Rekord']],
  ['⬆️ تدرج صاعد (580Hz)', ['⬆️ Step Up (580Hz)', '⬆️ Aufwärts (580Hz)']],
  ['⬇️ تدرج هابط (420Hz)', ['⬇️ Step Down (420Hz)', '⬇️ Abwärts (420Hz)']],
  ['🪵 نقرة تحذير هادئة (Soft Thud)', ['🪵 Soft Warning Thud', '🪵 Sanfter Hinweis']],
  ['إشعارات نظام ويندوز والمنبه الصوتي اللطيف في مواعيد التكرار المتباعد', [
    'Windows desktop alerts and gentle audio chime when spaced-repetition reviews become due.',
    'Windows-Benachrichtigungen und sanfter Ton bei fälligen Wiederholungen.',
  ]],
  ['إشعار مكتبي هادئ يظهر تلقائيًا عند وصول موعد أي مراجعة مجدولة للمراحل الأربع', [
    'Quiet desktop notification shown automatically when any of the 4 SR stages is due.',
    'Dezente Desktop-Benachrichtigung, sobald eine der 4 Wiederholungsstufen fällig ist.',
  ]],
  ['نغمتين هادئتين خفيفتين جداً (880Hz / 987Hz) مع كل إشعار بدون أي إزعاج', [
    'Two soft tones (880Hz / 987Hz) played gently with every review alert.',
    'Zwei sanfte Töne (880Hz / 987Hz) bei jeder fälligen Erinnerung.',
  ]],
  ['تجربة الإشعار والمنبه الصوتي', ['Test Notification & Chime', 'Benachrichtigung & Ton testen']],
  ['اختبر صوت المنبه اللطيف وشكل إشعار ويندوز فوراً للتأكد من عملهم', [
    'Preview the gentle chime and Windows desktop notification immediately.',
    'Teste den sanften Erinnerungston und die Desktop-Benachrichtigung sofort.',
  ]],
  ['نطق الجمل بصوت ويندوز المدمج (SpeechSynthesis)', ['Built-in Windows German speech synthesis', 'Integrierte deutsche Windows-Sprachausgabe']],
  ['تشغيل نطق الجمل الألمانية تلقائياً وعبر أزرار الاستماع بمحرك ويندوز.', [
    'Play German sentence pronunciation via the built-in Windows speech engine.',
    'Spielt deutsche Sätze über die integrierte Windows-Sprachausgabe ab.',
  ]],
  ['0.75 للبطيء و1.00 للطبيعي.', ['0.75 for slow playback, 1.00 for natural speed.', '0.75 für langsam, 1.00 für normales Tempo.']],
  ['اختار الصوت الألماني المناسب من أصوات ويندوز المتاحة.', ['Select your preferred German voice from installed Windows voices.', 'Wähle deine bevorzugte deutsche Windows-Stimme.']],
  ['افتراضي (ويندوز)', ['Default (Windows)', 'Standard (Windows)']],
  ['افتراضي', ['Default', 'Standard']],
  ['جملة تجريبية: Ich möchte einen Kaffee.', ['Sample sentence: Ich möchte einen Kaffee.', 'Beispielsatz: Ich möchte einen Kaffee.']],
  ['تفريغ نطقك الألماني محلياً على جهازك 100% بدون إنترنت لحماية خصوصيتك', [
    'Transcribe your spoken German 100% offline on your own device for complete privacy.',
    'Transkribiert dein gesprochenes Deutsch zu 100 % lokal und offline auf deinem Gerät.',
  ]],
  ['البرنامج الأساسي يعمل بكامل مميزاته بدون Whisper. الميزة دي اختيارية لتحويل صوتك لنص تلقائياً أثناء التدريب على تنويع الجمل.', [
    'The core app works fully without Whisper. This optional module converts your voice to German text during variation drills.',
    'Die Haupt-App funktioniert komplett ohne Whisper. Dieses optionale Modul wandelt deine Sprache bei Variationsübungen in Text um.',
  ]],
  ['🚀 خفيف وسريع', ['🚀 Fast & Lightweight', '🚀 Schnell & leicht']],
  ['النموذج الخفيف (Base)', ['Lightweight Model (Base)', 'Leichtes Modell (Base)']],
  ['~142 MB فقط', ['~142 MB only', 'Nur ~142 MB']],
  ['💎 دقة فائقة', ['💎 Maximum Accuracy', '💎 Höchste Genauigkeit']],
  ['النموذج الاحترافي (Turbo v3)', ['Pro Model (Turbo v3)', 'Profi-Modell (Turbo v3)']],
  ['تقدمك محفوظ في ملف JSON على جهازك', ['Your progress is safely stored as a local JSON file with automatic backups', 'Dein Fortschritt wird lokal als JSON-Datei mit automatischen Backups gespeichert']],
  ['مكان الملف', ['File Location', 'Speicherort']],
  ['تقدم ملفات Obsidian القديمة', ['Legacy Obsidian Progress', 'Alter Obsidian-Fortschritt']],
  ['استيراد', ['Import', 'Importieren']],
  ['هيمسح كل الخطوات والإنتاجات والمراجعات. خد نسخة احتياطية الأول.', [
    'Clears all completed steps, productions, and reviews. An automatic backup is saved first.',
    'Löscht alle Schritte, Produktionen und Wiederholungen. Zuvor wird ein Backup angelegt.',
  ]],
  ['اختصارات سريعة', ['Quick Shortcuts', 'Tastenkürzel']],
  ['Esc: خروج من الجلسة · Alt + ← / →: تنقّل بين الخطوات. كل حاجة بتتحفظ تلقائيًا.', [
    'Esc: Close modal/session · Alt + ← / →: Switch steps. Everything auto-saves atomically.',
    'Esc: Schließen · Alt + ← / →: Schritte wechseln. Alles wird automatisch gespeichert.',
  ]],
  ['نصيحة الاستمرار', ['Consistency Tip', 'Lerntipp']],
  ['5–10 جمل في الجلسة الواحدة أحسن من 30 مرة واحدة. المراجعة اليومية أهم من الجلسات الطويلة.', [
    '5–10 chunks per session beats 30 in one sitting. Short daily reviews build lasting fluency.',
    '5–10 Chunks pro Sitzung sind besser als 30 auf einmal. Tägliches Wiederholen zählt am meisten.',
  ]],
  ['ملاحظة أمان', ['Privacy Note', 'Datenschutz']],
  ['مفيش أي بيانات بتطلع من الجهاز. التسجيل الصوتي (لو استخدمته) بيتمسح أول ما تقفل الجلسة.', [
    'Zero data leaves your device. Any voice recording is discarded as soon as you close the session.',
    'Keine Daten verlassen dein Gerät. Sprachaufnahmen werden beim Schließen der Sitzung sofort gelöscht.',
  ]],

  // Chill Mode (تشيل مود)
  ['تشيل مود · جلسة تدريب خفيفة ومريحة', ['Chill Mode · Low-Friction Relaxed Session', 'Chill-Modus · Entspannte Trainingssitzung']],
  ['تعلّم بروقان ومن غير ضغط', ['Learn calmly at your own pace', 'Lerne entspannt und ohne Druck']],
  ['المستويات المطلوبة للتدريب', ['Select Levels to Practice', 'Stufen für das Training auswählen']],
  ['اختيار الكل', ['Select All', 'Alle auswählen']],
  ['التركيز على غير المكتمل فقط', ['Focus on unfinished chunks only', 'Nur noch nicht abgeschlossene Chunks']],
  ['الجمل المستحقة للتكرار المتباعد الآن', ['Only Spaced-Repetition Due Chunks', 'Nur fällige Wiederholungs-Chunks']],
  ['ابدأ جلسة التشيل مود', ['Start Chill Session', 'Chill-Sitzung starten']],
  ['تغيير المستويات', ['Change Levels', 'Stufen ändern']],
  ['مكتمل في تشيل مود ✓', ['Completed in Chill Mode ✓', 'Im Chill-Modus erledigt ✓']],
  ['طمس للتسميع', ['Blur for Recall', 'Zum Abrufen ausblenden']],
  ['إظهار الألماني', ['Reveal German', 'Deutsch anzeigen']],
  ['ببطء', ['Slow', 'Langsam']],
  ['طبيعي', ['Natural', 'Normal']],
  ['اضغط للكشف', ['Click to reveal', 'Zum Aufdecken klicken']],
  ['المعنى بالعربي:', ['Meaning:', 'Bedeutung:']],
  ['1. اقرأ الجملة بصوت واطي', ['1. Read quietly', '1. Leise lesen']],
  ['2. اسمع وانطق ببطء', ['2. Listen & speak slowly', '2. Langsam nachsprechen']],
  ['3. انطق بسرعة طبيعية', ['3. Speak at natural speed', '3. Im normalen Tempo sprechen']],
  ['4. قولها من غير ما تبص', ['4. Speak from memory (blind)', '4. Frei aus dem Gedächtnis']],
  ['5. استدعاء سريع', ['5. Quick active recall', '5. Schneller Abruf']],
  ['+1 افتكرتها صح', ['+1 Recalled Correctly', '+1 Richtig erinnert']],
  ['اكشف الألماني', ['Reveal German', 'Deutsch zeigen']],
  ['إعادة المحاولة', ['Try Again', 'Erneut versuchen']],
  ['+ إدراج في جدول التكرار المتباعد', ['+ Enroll in Spaced Repetition', '+ In Wiederholungsplan aufnehmen']],
  ['مستحقة للمراجعة الآن', ['Due for Review Now', 'Jetzt zur Wiederholung fällig']],
  ['تمت المراجعة وافتكرتها', ['Reviewed & Recalled', 'Wiederholt & gewusst']],
  ['إلغاء الجدولة', ['Cancel Schedule', 'Zeitplan abbrechen']],
  ['السابق', ['Previous', 'Zurück']],
  ['التالي', ['Next', 'Weiter']],
  ['إنهاء الجلسة', ['End Session', 'Sitzung beenden']],

  // Drills (drills.js)
  ['استدعاء سريع', ['Quick Active Recall', 'Schneller Abruf']],
  ['اقرا المعنى، وقول الجملة بالألماني قبل ما تظهر', ['Read the meaning and say the German sentence before revealing it', 'Lies die Bedeutung und sprich den deutschen Satz, bevor du ihn aufdeckst']],
  ['شوف الجملة بدري', ['Reveal Early', 'Früher zeigen']],
  ['عرفت', ['Got It', 'Gewusst']],
  ['لأ، نسيتها', ['Forgot It', 'Vergessen']],
  ['استدعاء تمام', ['Recall Passed!', 'Abruf bestanden!']],
  ['محتاج تكرار أكتر', ['Needs More Practice', 'Braucht mehr Übung']],
  ['تمام', ['Done', 'Fertig']],
  ['سباق الـ60 ثانية', ['60-Second Production Sprint', '60-Sekunden-Sprint']],
  ['الهدف: 5 جمل على الأقل في الدقيقة', ['Target: At least 5 sentences in 1 minute', 'Ziel: Mindestens 5 Sätze in 1 Minute']],
  ['+1 جملة جديدة', ['+1 New Sentence', '+1 Neuer Satz']],
  ['كلام مرتجل', ['Spontaneous Speaking', 'Freies Sprechen']],
  ['خلصت', ['Finished', 'Fertig']],
  ['إلغاء', ['Cancel', 'Abbrechen']],
  ['أيوة', ['Yes', 'Ja']],

  // Stats, Review, Trophies, Method extra phrases
  ['السلسلة الحالية المتواصلة', ['Current Active Streak', 'Aktuelle Tages-Serie']],
  ['أكثر', ['More', 'Mehr']],
  ['أقل', ['Less', 'Weniger']],
  ['يوم فيه إنتاج', ['Active Days', 'Aktive Tage']],
  ['متوسط الإنتاج في اليوم النشط', ['Avg. Productions / Active Day', 'Ø Produktionen / aktivem Tag']],
  ['أفضل يوم لسه جاي', ['Best day is yet to come', 'Bester Tag kommt noch']],
  ['ساعة', ['hrs', 'Std.']],
  ['دقيقة', ['min', 'Min.']],
  ['يوم', ['days', 'Tage']],
  ['أيام', ['days', 'Tage']],
  ['النشطة', ['Active', 'Aktiv']],
  ['المستحقة', ['Due', 'Fällig']],
  ['المكتملة', ['Completed', 'Abgeschlossen']],
  ['الجملة (Chunk)', ['Chunk Sentence', 'Chunk (Satz)']],
  ['الموعد القادم', ['Next Review', 'Nächster Termin']],
  ['خطة المراحل (1-4)', ['Stages Plan (1–4)', 'Stufenplan (1–4)']],
  ['إجراء', ['Action', 'Aktion']],
  ['مستحق الآن', ['Due Now', 'Jetzt fällig']],
  ['أتمت بنجاح ✅', ['Completed ✅', 'Erfolgreich ✅']],
  ['راجع', ['Review', 'Wiederholen']],
  ['مكتمل', ['Done', 'Fertig']],
  ['متقنة', ['Mastered', 'Gemeistert']],
  ['شغال عليها', ['Learning', 'In Arbeit']],
  ['لسه جديدة', ['New', 'Neu']],
  ['تم الإنجاز بنجاح ✓', ['Unlocked ✓', 'Freigeschaltet ✓']],
  ['قيد التدريب والتكرار', ['In Progress', 'In Arbeit']],
  ['الإتقان', ['Mastery', 'Meisterung']],
  ['التدريب والتنويع', ['Practice & Variation', 'Training & Variation']],
  ['السلاسل', ['Streaks', 'Serien']],
  ['المرحلة', ['Stage', 'Stufe']],
  ['عدد الجمل', ['Sentences', 'Anzahl Sätze']],
  ['إمتى', ['When', 'Wann']],
  ['الجلسة الأولى', ['First Session', 'Erste Sitzung']],
  ['بعد عدة ساعات', ['After a few hours', 'Nach einigen Stunden']],
  ['اليوم التالي', ['Next Day', 'Nächster Tag']],
  ['بعد 3 أيام', ['After 3 Days', 'Nach 3 Tagen']],
  ['بعد 7 أيام', ['After 7 Days', 'Nach 7 Tagen']],
  ['نفس اليوم', ['Same day', 'Am selben Tag']],
  ['بعد 24 ساعة', ['After 24 hours', 'Nach 24 Stunden']],
  ['مراجعة', ['Review', 'Wiederholung']],
  ['مراجعة نهائية', ['Final review', 'Abschluss-Wiederholung']],
  ['غيّر الفاعل', ['Change Subject', 'Subjekt ändern']],
  ['غيّر الزمن', ['Change Tense', 'Zeitform ändern']],
  ['غيّر الكلمات', ['Change Vocabulary', 'Wörter austauschen']],
  ['غيّر الموقف', ['Change Context', 'Situation ändern']],
  ['حاول تقولها قبل ما تفتح الإجابة', ['Try saying it aloud before revealing the answer', 'Versuche den Satz zuerst aus dem Kopf zu sprechen']],
  ['بعد يوم', ['In 1 day', 'In 1 Tag']],
  ['فاصل أطول شوية', ['Slightly longer interval', 'Etwas längeres Intervall']],
  ['فاصل أطول', ['Longer interval', 'Längeres Intervall']],
  ['لسه محتاجة مراجعة', ['Needs more review', 'Braucht Wiederholung']],
  ['هترجع تاني', ['Will return soon', 'Kommt bald wieder']],
  ['طلعت من غير مراجعة', ['Recalled cleanly', 'Ohne Hilfe gewusst']],
  ['خلصت مراجعة النهاردة', ["Today's Review Complete!", 'Heutige Wiederholung erledigt!']],
  ['رجوع للرئيسية', ['Back to Home', 'Zur Startseite']],
  ['حدّث القايمة', ['Refresh Queue', 'Liste aktualisieren']],
  ['تخطّى', ['Skip', 'Überspringen']],
  ['تم', ['Done', 'Erledigt']],
  ['إنتاج', ['Produce', 'Produktion']],
  ['مؤجل', ['Delayed', 'Verzögert']],
  ['جارٍ تحميل المكتبة المصورة...', ['Loading Visual Library...', 'Bildbibliothek wird geladen...']],
  ['تم استرجاع تقدمك تلقائيًا من آخر نسخة احتياطية سليمة 🛡️', [
    'Your progress was automatically recovered from the latest healthy backup 🛡️',
    'Dein Fortschritt wurde automatisch aus dem letzten intakten Backup wiederhergestellt 🛡️',
  ]],
  // 25 Library Topic Descriptions
  ['أساسيات تكوين الجمل، الأفعال المنفصلة، حروف الجر، والماضي البسيط والمركب', [
    'Sentence basics, separable verbs, prepositions, and Perfekt/Präteritum past tenses',
    'Grundlagen des Satzbaus, trennbare Verben, Präpositionen sowie Perfekt & Präteritum',
  ]],
  ['الروابط المتقدمة، المبني للمجهول، وتراكيب المستوى المتوسط وفوق المتوسط', [
    'Advanced connectors, passive voice, and intermediate-to-upper sentence structures',
    'Konnektoren, Passivformen und Satzstrukturen der Mittelstufe (B1–B2)',
  ]],
  ['التعبيرات الأكاديمية، الكلام غير المباشر (Konjunktiv I)، وتراكيب المستوى المتقدم', [
    'Academic phrasing, indirect speech (Konjunktiv I), and C1-level structures',
    'Akademische Wendungen, indirekte Rede (Konjunktiv I) und C1-Strukturen',
  ]],
  ['خرائط ذهنية وجداول مقارنة لأهم قواعد اللغة الألمانية بالعربي', [
    'Mind maps and comparison tables for essential German grammar rules',
    'Mindmaps und Vergleichstabellen zu den wichtigsten deutschen Grammatikregeln',
  ]],
  ['بطاقات مصورة للكلمات المتشابهة والفروق الدقيقة مع الأمثلة', [
    'Illustrated cards explaining confusingly similar German words and subtle nuances',
    'Bildkarten zu verwechselbaren Wörtern und feinen Bedeutungsunterschieden',
  ]],
  ['تعبيرات جاهزة للكتابة والمحادثة والامتحانات', [
    'Ready-to-use expressions for writing, speaking, and Goethe/Telc exams',
    'Fertige Redemittel für Schreiben, Sprechen und Prüfungen',
  ]],
  ['تعبيرات عامية، اختصارات الكلام، وجداول ثنائية اللغة للحياة اليومية', [
    'Colloquial expressions, spoken contractions, and everyday bilingual tables',
    'Umgangssprachliche Ausdrücke, Verkürzungen und Alltagstabellen',
  ]],
  ['مصطلحات، جمل، ودليل العمليات في بيئة العمل وخدمة العملاء', [
    'Workplace vocabulary, phrases, and operations guide for German customer service',
    'Fachbegriffe, Sätze und Leitfaden für den deutschsprachigen Kundenservice',
  ]],
  ['قصص سيزيف، نارسيس، وأبطال الأساطير اليونانية بالألمانية', [
    'Stories of Sisyphus, Narcissus, and Greek mythological heroes in German',
    'Geschichten von Sisyphos, Narziss und Helden der griechischen Mythologie',
  ]],
  ['رموز وآلهة وأساطير مصر القديمة مصورة ومشروحة بالألمانية', [
    'Symbols, deities, and myths of Ancient Egypt illustrated in German',
    'Symbole, Götter und Mythen des Alten Ägypten auf Deutsch erklärt',
  ]],
  ['محطات وشخصيات من التاريخ المصري القديم والحديث بالألمانية', [
    'Key milestones and figures of ancient and modern Egyptian history in German',
    'Meilensteine und Persönlichkeiten der ägyptischen Geschichte auf Deutsch',
  ]],
  ['سلسلة مصورة متسلسلة (مثل رحلة موسى والخضر) بلغة ألمانية سلسة', [
    'Illustrated serialized stories (e.g., Musa & Al-Khidr) in clear German',
    'Illustrierte Bildergeschichten (z. B. Musa & al-Khidr) in klarem Deutsch',
  ]],
  ['أحداث تاريخية وتحولات سياسية كبرى مشروحة بالألمانية', [
    'Major historical events and political turning points explained in German',
    'Wichtige historische Ereignisse und politische Wendepunkte auf Deutsch',
  ]],
  ['مفاهيم الفلسفة السياسية والدولة والمجتمع', [
    'Core concepts of political philosophy, statecraft, and society',
    'Grundbegriffe der politischen Philosophie, Staat und Gesellschaft',
  ]],
  ['سلاسل مصورة عن الدماغ، الإدراك، الانفصال، والصحة النفسية', [
    'Illustrated series on the brain, perception, dissociation, and mental health',
    'Bildserien über Gehirn, Wahrnehmung, Dissoziation und psychische Gesundheit',
  ]],
  ['مدارس الفلسفة، المنطق، والأسئلة الوجودية الكبرى بالألمانية', [
    'Schools of philosophy, logic, and major existential questions in German',
    'Philosophische Strömungen, Logik und große Lebensfragen auf Deutsch',
  ]],
  ['تقاطع علم النفس مع الفلسفة وفهم الذات', [
    'Where psychology meets philosophy and self-understanding',
    'Schnittstelle zwischen Psychologie, Philosophie und Selbsterkenntnis',
  ]],
  ['مفاهيم الوجود والكون وما وراء الطبيعة', [
    'Concepts of being, existence, and metaphysics',
    'Begriffe des Seins, der Existenz und der Metaphysik',
  ]],
  ['كيف نفرق بين العلم الحقيقي والخرافات والعلوم الزائفة', [
    'Distinguishing real scientific method from myths and pseudoscience',
    'Wie man echte Wissenschaft von Mythen und Pseudowissenschaft unterscheidet',
  ]],
  ['كيف يتعلم الدماغ ويبني الذاكرة طويلة المدى', [
    'How the brain learns and builds durable long-term memory',
    'Wie das Gehirn lernt und dauerhaftes Langzeitgedächtnis aufbaut',
  ]],
  ['تحليل حبكات وشخصيات الأعمال الدرامية والسينمائية بالألمانية', [
    'Plot and character analyses of films and series in German',
    'Handlungs- und Charakteranalysen bekannter Filme und Serien auf Deutsch',
  ]],
  ['قراءات وملخصات مصورة لأهم الروايات والأعمال الأدبية', [
    'Illustrated summaries and readings of classic world novels',
    'Illustrierte Zusammenfassungen bedeutender Romane und Literaturwerke',
  ]],
  ['قصائد واقتباسات أدبية وفلسفية مختارة', [
    'Selected literary and philosophical poems and quotes',
    'Ausgewählte literarische und philosophische Gedichte und Zitate',
  ]],
  ['ملامح الثقافة والحياة الاجتماعية في ألمانيا', [
    'Highlights of German culture, traditions, and everyday social life',
    'Einblicke in die deutsche Kultur und das gesellschaftliche Leben',
  ]],
  ['موضوعات عامة ومناقشات ثقافية بالألمانية', [
    'General topics and cultural discussions in German',
    'Allgemeine Themen und kulturelle Diskussionen auf Deutsch',
  ]],
  // Tooltips & Controls
  ['تصغير (-)', ['Zoom Out (-)', 'Verkleinern (-)']],
  ['إعادة الضبط', ['Reset Zoom', 'Zurücksetzen']],
  ['تكبير (+)', ['Zoom In (+)', 'Vergrößern (+)']],
  ['حفظ في المفضلة', ['Save to Favorites', 'Zu Favoriten hinzufügen']],
  ['إزالة من المفضلة', ['Remove from Favorites', 'Aus Favoriten entfernen']],
  ['إلغاء علامة المقروء', ['Unmark as Read', 'Als ungelesen markieren']],
  ['إغلاق (Esc)', ['Close (Esc)', 'Schließen (Esc)']],
  ['السابق (سهم يمين)', ['Previous', 'Vorherige']],
  ['التالي (سهم يسار)', ['Next', 'Nächste']],
  ['رجوع للرئيسية', ['Back to Home', 'Zurück zur Startseite']],
  ['سلسلة الأيام المتواصلة', ['Active Day Streak', 'Aktive Tages-Serie']],
  ['استمع لنطق الجملة (VoiceStudio)', ['Listen to German pronunciation', 'Deutsche Aussprache anhören']],
]);

// Regex rules for dynamic Arabic strings with embedded numbers/variables
const REGEX_RULES = [
  {
    re: /^([A-Z]\d)\s+—\s+(.+)$/,
    en: (_, lv, title) => `${lv} — ${translateText(title.trim(), 'en')}`,
    de: (_, lv, title) => `${lv} — ${translateText(title.trim(), 'de')}`,
  },
  {
    re: /^(\d+)\s+يوم متواصل$/,
    en: (_, n) => `${n} day streak`,
    de: (_, n) => `${n} Tage Serie`,
  },
  {
    re: /^راجع\s+(\d+)\s+مستحق$/,
    en: (_, n) => `Review ${n} Due`,
    de: (_, n) => `${n} Fällige wiederholen`,
  },
  {
    re: /^الخطوة\s+(\d+)\s+من\s+(\d+)\s+·\s+(.+)$/,
    en: (_, s, tot, title) => `Step ${s} of ${tot} · ${translateText(title, 'en')}`,
    de: (_, s, tot, title) => `Schritt ${s} von ${tot} · ${translateText(title, 'de')}`,
  },
  {
    re: /^فاضل\s+(\d+)\s+إنتاج من الخطة$/,
    en: (_, n) => `${n} productions remaining in plan`,
    de: (_, n) => `Noch ${n} Produktionen im Plan`,
  },
  {
    re: /^(\d+)\s+جملة\s+·\s+(\d+)\s+مجموعة منوعة$/,
    en: (_, c, g) => `${c} chunks · ${g} diverse groups`,
    de: (_, c, g) => `${c} Chunks · ${g} gemischte Gruppen`,
  },
  {
    re: /^(\d+)\s+متقن$/,
    en: (_, n) => `${n} mastered`,
    de: (_, n) => `${n} gemeistert`,
  },
  {
    re: /^(\d+)\s+شغال عليه$/,
    en: (_, n) => `${n} in progress`,
    de: (_, n) => `${n} in Arbeit`,
  },
  {
    re: /^من\s+([\d,]+)$/,
    en: (_, n) => `of ${n}`,
    de: (_, n) => `von ${n}`,
  },
  {
    re: /^المجموعة\s+(\d+)$/,
    en: (_, n) => `Group ${n}`,
    de: (_, n) => `Gruppe ${n}`,
  },
  {
    re: /^قالب:\s*(.+)$/,
    en: (_, p) => `Pattern: ${p}`,
    de: (_, p) => `Muster: ${p}`,
  },
  {
    re: /^قالب الجملة:\s*(.+)$/,
    en: (_, p) => `Sentence Pattern: ${p}`,
    de: (_, p) => `Satzmuster: ${p}`,
  },
  {
    re: /^(\d+)\s+جملة مقسمة إلى\s+(\d+)\s+مجموعة منوعة$/,
    en: (_, c, g) => `${c} Chunks organized into ${g} Interleaved Groups`,
    de: (_, c, g) => `${c} Chunks aufgeteilt in ${g} abwechslungsreiche Gruppen`,
  },
  {
    re: /^مجموعات منوعة تدمج قوالب وتراكيب مختلفة لتجنب التكرار الرتيب، مع شرح مصور بالعربي ومرحلة ختامية من 5 تنويعات لكل مجموعة\.$/,
    en: () => 'Interleaved groups combine varied sentence patterns to prevent rote monotony, complete with visual grammar boards and a 5-variation group finale.',
    de: () => 'Abwechslungsreiche Gruppen kombinieren verschiedene Satzmuster gegen Monotonie — inklusive visueller Grammatiktafeln und einem 5-Variationen-Finale.',
  },
  {
    re: /^📐 شرح مصور بالعربي ·\s*(.+)$/,
    en: (_, lv) => `📐 Visual Guides · ${lv}`,
    de: (_, lv) => `📐 Visuelle Grammatiktafeln · ${lv}`,
  },
  {
    re: /^لوحات القواعد وتراكيب الجمل والكلمات للمستوى\s+(.+)$/,
    en: (_, lv) => `Visual Grammar, Sentence Structure & Vocab Boards for Level ${lv}`,
    de: (_, lv) => `Visuelle Grammatik-, Satzbau- & Wortschatztafeln für Stufe ${lv}`,
  },
  {
    re: /^(\d+)\s+لوحة مصورة تشرح قواعد وتراكيب ومفردات\s+([A-Z]\d)\s+بالعربي مع أمثلة جاهزة — اضغط على أي لوحة لتكبيرها فوراً\.$/,
    en: (_, n, lv) => `${n} illustrated boards explaining ${lv} grammar, sentence patterns, and vocabulary with ready examples — click any board to zoom in.`,
    de: (_, n, lv) => `${n} illustrierte Lehrtafeln zu ${lv}-Grammatik, Satzbau und Wortschatz mit Beispielen — klicke auf eine Tafel zum Vergrößern.`,
  },
  {
    re: /^عرض كل اللوحات\s*\((\d+)\)$/,
    en: (_, n) => `Show All Boards (${n})`,
    de: (_, n) => `Alle Tafeln zeigen (${n})`,
  },
  {
    re: /^المجموعات المنوعة\s*\((\d+)\)$/,
    en: (_, n) => `Groups (${n})`,
    de: (_, n) => `Gruppen (${n})`,
  },
  {
    re: /^كل الجمل\s*\((\d+)\)$/,
    en: (_, n) => `All Chunks (${n})`,
    de: (_, n) => `Alle Sätze (${n})`,
  },
  {
    re: /^(\d+)\s+قوالب مختلفة$/,
    en: (_, n) => `${n} distinct patterns`,
    de: (_, n) => `${n} verschiedene Muster`,
  },
  {
    re: /^(\d+)\s+من\s+(\d+)\s+جمل متقنة$/,
    en: (_, a, b) => `${a} of ${b} chunks mastered`,
    de: (_, a, b) => `${a} von ${b} Chunks gemeistert`,
  },
  {
    re: /^ابدأ تدريب المجموعة\s*\((\d+)\s+جمل\)$/,
    en: (_, n) => `Train Group (${n} Chunks)`,
    de: (_, n) => `Gruppe trainieren (${n} Sätze)`,
  },
  {
    re: /^عرض الجمل\s*\((\d+)\)\s*▼$/,
    en: (_, n) => `Show Chunks (${n}) ▼`,
    de: (_, n) => `Sätze zeigen (${n}) ▼`,
  },
  {
    re: /^ابدأ بالترتيب\s*\(([^)]+)\)$/,
    en: (_, id) => `Start in Order (${id})`,
    de: (_, id) => `Der Reihe nach (${id})`,
  },
  {
    re: /^(\d+)\s+مجموعة(?: منوعة| قوالب) تحت الفلتر ده$/,
    en: (_, n) => `${n} groups match this filter`,
    de: (_, n) => `${n} Gruppen entsprechen diesem Filter`,
  },
  {
    re: /^(\d+)\s+لوحة مصورة(?: تحت الفلتر ده)?$/,
    en: (_, n) => `${n} visual boards`,
    de: (_, n) => `${n} Bildtafeln`,
  },
  {
    re: /^(\d+)\s+جملة تحت الفلتر ده$/,
    en: (_, n) => `${n} chunks match this filter`,
    de: (_, n) => `${n} Chunks entsprechen diesem Filter`,
  },
  {
    re: /^عرض المزيد\s*\((\d+)\s+(?:بطاقة متبقية|فاضل)\)$/,
    en: (_, n) => `Load More (${n} remaining)`,
    de: (_, n) => `Mehr laden (${n} verbleibend)`,
  },
  {
    re: /^غير مقروء\s*\((\d+)\)$/,
    en: (_, n) => `Unread (${n})`,
    de: (_, n) => `Ungelesen (${n})`,
  },
  {
    re: /^مقروء\s*\((\d+)\)$/,
    en: (_, n) => `Read (${n})`,
    de: (_, n) => `Gelesen (${n})`,
  },
  {
    re: /^المفضلة\s*\((\d+)\)$/,
    en: (_, n) => `Favorites (${n})`,
    de: (_, n) => `Favoriten (${n})`,
  },
  {
    re: /^لوحات شرح قواعد المستوى\s*\(([^)]+)\)$/,
    en: (_, lv) => `Level ${lv} Visual Grammar Boards`,
    de: (_, lv) => `Visuelle Grammatiktafeln (${lv})`,
  },
  {
    re: /^(\d+)\s+لوحة تعليمية مصورة مقسمة إلى\s+(\d+)\s+قسماً ومرتبطة بالمستويات.+$/,
    en: (_, tot, top) => `${tot} illustrated German learning boards across ${top} topics mapped to CEFR levels (A1–C1): sentence structure, word distinctions, Greek & Egyptian mythology, prophet stories, philosophy, and psychology.`,
    de: (_, tot, top) => `${tot} illustrierte Lehrtafeln in ${top} Themenbereichen für die Stufen A1 bis C1: Satzbau, Grammatik, Wortunterschiede, griechische & ägyptische Mythologie, Philosophie und Psychologie.`,
  },
  // Library topic titles & descriptions
  {
    re: /^مستوى A1 – A2$/,
    en: () => 'Level A1 – A2 Foundation',
    de: () => 'Stufe A1 – A2 Grundlagen',
  },
  {
    re: /^مستوى B1 – B2$/,
    en: () => 'Level B1 – B2 Intermediate',
    de: () => 'Stufe B1 – B2 Mittelstufe',
  },
  {
    re: /^مستوى C1 المتقدم$/,
    en: () => 'Level C1 Advanced',
    de: () => 'Stufe C1 Oberstufe',
  },
  {
    re: /^قواعد الألمانية الشاملة \(Grammatik\)$/,
    en: () => 'Comprehensive Grammar (Grammatik)',
    de: () => 'Umfassende Grammatik',
  },
  {
    re: /^كلمات وفروق لغوية \(Neue Wörter\)$/,
    en: () => 'Vocabulary & Nuances (Neue Wörter)',
    de: () => 'Wortschatz & Nuancen (Neue Wörter)',
  },
  {
    re: /^تعبيرات واصطلاحات \(Redemittel & Idiome\)$/,
    en: () => 'Expressions & Idioms (Redemittel)',
    de: () => 'Redemittel & Idiome',
  },
  {
    re: /^لغة الشارع والحياة اليومية \(Umgangssprache\)$/,
    en: () => 'Everyday & Street German (Umgangssprache)',
    de: () => 'Alltags- & Umgangssprache',
  },
  {
    re: /^ألماني العمل وخدمة العملاء \(Kundenservice\)$/,
    en: () => 'Workplace & Customer Service German',
    de: () => 'Berufsdeutsch & Kundenservice',
  },
  {
    re: /^الأساطير اليونانية \(Griechische Mythologie\)$/,
    en: () => 'Greek Mythology (Griechische Mythologie)',
    de: () => 'Griechische Mythologie',
  },
  {
    re: /^الأساطير المصرية القديمة \(Ägyptische Mythologie\)$/,
    en: () => 'Ancient Egyptian Mythology',
    de: () => 'Ägyptische Mythologie',
  },
  {
    re: /^تاريخ مصر الحضاري \(Ägyptische Geschichte\)$/,
    en: () => 'Egyptian Cultural History',
    de: () => 'Ägyptische Geschichte',
  },
  {
    re: /^قصص الأنبياء والحكمة \(Prophetengeschichten\)$/,
    en: () => 'Prophet Stories & Wisdom',
    de: () => 'Prophetengeschichten',
  },
  {
    re: /^التاريخ والسياسة \(Geschichte & Politik\)$/,
    en: () => 'History & Politics',
    de: () => 'Geschichte & Politik',
  },
  {
    re: /^النظريات السياسية \(Politik & Theorie\)$/,
    en: () => 'Political Theory',
    de: () => 'Politik & Theorie',
  },
  {
    re: /^علم النفس والأعصاب \(Psychologie & Neuro\)$/,
    en: () => 'Psychology & Neuroscience',
    de: () => 'Psychologie & Neurowissenschaft',
  },
  {
    re: /^الفلسفة والتفكير النقدي \(Philosophie\)$/,
    en: () => 'Philosophy & Critical Thinking',
    de: () => 'Philosophie & Kritisches Denken',
  },
  {
    re: /^الفلسفة النفسية \(Psycho-Philosophie\)$/,
    en: () => 'Psycho-Philosophy',
    de: () => 'Psycho-Philosophie',
  },
  {
    re: /^الميتافيزيقا والأنطولوجيا \(Metaphysik\)$/,
    en: () => 'Metaphysics & Ontology',
    de: () => 'Metaphysik & Ontologie',
  },
  {
    re: /^العلم الزائف والتفكير العلمي \(Pseudowissenschaft\)$/,
    en: () => 'Pseudoscience & Scientific Method',
    de: () => 'Pseudowissenschaft',
  },
  {
    re: /^خوارزميات ومنهجيات التعلم \(Lern-Algorithmen\)$/,
    en: () => 'Learning Algorithms & Memory',
    de: () => 'Lern-Algorithmen',
  },
  {
    re: /^أفلام ومسلسلات \(Filme & Serien\)$/,
    en: () => 'Films & Series Analysis',
    de: () => 'Filme & Serien',
  },
  {
    re: /^الأدب والروايات العالمية \(Literatur & Romane\)$/,
    en: () => 'World Literature & Novels',
    de: () => 'Literatur & Romane',
  },
  {
    re: /^اقتباسات وشعر \(Zitate & Poesie\)$/,
    en: () => 'Quotes & Poetry',
    de: () => 'Zitate & Poesie',
  },
  {
    re: /^الثقافة والمجتمع الألماني \(Deutsche Kultur\)$/,
    en: () => 'German Culture & Society',
    de: () => 'Deutsche Kultur',
  },
  {
    re: /^موضوعات متنوعة \(Themen\)$/,
    en: () => 'General Themes (Themen)',
    de: () => 'Allgemeine Themen',
  },
  // Card titles
  {
    re: /^تراكيب جمل ([A-Z]\d)(?: الأساسية)? \(([A-Z]\d - Satzbau)\) — لوحة (\d+)$/,
    en: (_, lv, tag, n) => `${tag} Sentence Structure — Board #${n}`,
    de: (_, lv, tag, n) => `${tag} Satzmuster — Tafel #${n}`,
  },
  {
    re: /^ملخص قواعد وتراكيب A2 — جزء (\d+)$/,
    en: (_, n) => `A2 Grammar & Sentence Structure Summary — Part ${n}`,
    de: (_, n) => `A2 Grammatik- & Satzbau-Übersicht — Teil ${n}`,
  },
  {
    re: /^الفرق بين الجملة الأساسية والفرعية \(Hauptsatz & Nebensatz\)$/,
    en: () => 'Main Clause vs. Subordinate Clause (Hauptsatz & Nebensatz)',
    de: () => 'Unterschied zwischen Hauptsatz & Nebensatz',
  },
  {
    re: /^صيغة الأمر في الألمانية \(Der Imperativ A1–A2\) — لوحة (\d+)$/,
    en: (_, n) => `The Imperative in German (Der Imperativ A1–A2) — Board #${n}`,
    de: (_, n) => `Der Imperativ im Deutschen (A1–A2) — Tafel #${n}`,
  },
  {
    re: /^الماضي المركب مع sein و haben \(Perfekt A1–A2\) — لوحة (\d+)$/,
    en: (_, n) => `Present Perfect with sein & haben (Perfekt A1–A2) — Board #${n}`,
    de: (_, n) => `Perfekt mit sein & haben (A1–A2) — Tafel #${n}`,
  },
  {
    re: /^حروف الجر الزمنية \(um \/ am \/ im \/ seit \/ vor\) — جزء (\d+)$/,
    en: (_, n) => `Temporal Prepositions (um / am / im / seit / vor) — Part ${n}`,
    de: (_, n) => `Temporale Präpositionen (um / am / im / seit / vor) — Teil ${n}`,
  },
  {
    re: /^تراكيب جمل B1 والروابط \(B1 - Satzbau\) — لوحة (\d+)$/,
    en: (_, n) => `B1 Sentence Structure & Connectors (B1 - Satzbau) — Board #${n}`,
    de: (_, n) => `B1 Satzbau & Konnektoren — Tafel #${n}`,
  },
  {
    re: /^تراكيب جمل B2 والمبني للمجهول \(B2 - Satzbau\) — لوحة (\d+)$/,
    en: (_, n) => `B2 Sentence Structure & Passive Voice (B2 - Satzbau) — Board #${n}`,
    de: (_, n) => `B2 Satzbau & Passiv — Tafel #${n}`,
  },
  {
    re: /^تراكيب جمل C1 والكلام غير المباشر \(C1 - Satzbau\) — لوحة (\d+)$/,
    en: (_, n) => `C1 Sentence Structure & Indirect Speech (C1 - Satzbau) — Board #${n}`,
    de: (_, n) => `C1 Satzbau & Indirekte Rede (Konjunktiv I) — Tafel #${n}`,
  },
  {
    re: /^دليل خدمة العملاء بالألمانية — فصل (\d+)(.*)$/,
    en: (_, n, rest) => `German Customer Service Operations Guide — Chapter ${n}${rest}`,
    de: (_, n, rest) => `Leitfaden Kundenservice auf Deutsch — Kapitel ${n}${rest}`,
  },
  {
    re: /^جدول تعبيرات الحياة اليومية \(ألماني - عربي\) — لوحة (\d+)$/,
    en: (_, n) => `Everyday German Expressions Table — Board #${n}`,
    de: (_, n) => `Alltagsausdrücke-Tabelle (Deutsch - Arabisch) — Tafel #${n}`,
  },
  {
    re: /^قاموس تعبيرات الشارع والاختصارات اليومية — صفحة (\d+)$/,
    en: (_, n) => `Colloquial Contractions & Street German Glossary — Page ${n}`,
    de: (_, n) => `Umgangssprachliche Verkürzungen & Partikeln — Seite ${n}`,
  },
  {
    re: /^مصطلحات الشباب ولغة الشارع الألمانية — جزء (\d+)$/,
    en: (_, n) => `Modern Youth & Street German Slang — Part ${n}`,
    de: (_, n) => `Jugendsprache & Street-Deutsch Glossar — Teil ${n}`,
  },
  {
    re: /^مقارنة أزمنة الماضي في الألمانية — لوحة (\d+)$/,
    en: (_, n) => `German Past Tenses Comparison — Board #${n}`,
    de: (_, n) => `Vergleich der deutschen Vergangenheitsformen — Tafel #${n}`,
  },
  {
    re: /^(.+) — (?:لوحة تعليمية|بطاقة) #(\d+)(?: \(صفحة (\d+)\))?$/,
    en: (_, topic, num, page) => `${translateText(topic.trim(), 'en')} — Board #${num}${page ? ` (Page ${page})` : ''}`,
    de: (_, topic, num, page) => `${translateText(topic.trim(), 'de')} — Tafel #${num}${page ? ` (Seite ${page})` : ''}`,
  },
  {
    re: /^عرض البطاقات التعليمية(?:\s+\(مستوى ([A-Z]\d)\))?$/,
    en: (_, lv) => `Showing Visual Learning Boards${lv ? ` (Level ${lv})` : ''}`,
    de: (_, lv) => `Visuelle Lehrtafeln${lv ? ` (Stufe ${lv})` : ''}`,
  },
  {
    re: /^— اضغط على أي بطاقة لتكبيرها وقراءتها بوضوح كامل مع التنقل بالأسهم$/,
    en: () => '— Click any board to open the full-screen zoomable reader with keyboard arrow navigation',
    de: () => '— Klicke auf eine Tafel für die Vollbild-Ansicht mit Zoom und Pfeiltasten-Navigation',
  },
  {
    re: /^(.+) · بطاقة (\d+) من (\d+)$/,
    en: (_, topic, cur, tot) => `${translateText(topic.trim(), 'en')} · Board ${cur} of ${tot}`,
    de: (_, topic, cur, tot) => `${translateText(topic.trim(), 'de')} · Tafel ${cur} von ${tot}`,
  },
  {
    re: /^—\s*(.+)$/,
    en: (_, rest) => `— ${translateText(rest.trim(), 'en')}`,
    de: (_, rest) => `— ${translateText(rest.trim(), 'de')}`,
  },
  {
    re: /^الإصدار\s+([\d.]+)(.*)$/,
    en: (_, ver, rest) => `Version ${ver}${rest}`,
    de: (_, ver, rest) => `Version ${ver}${rest}`,
  },
  {
    re: /^(\d+)\s+من\s+(\d+)\s+متقن$/,
    en: (_, a, b) => `${a} of ${b} mastered`,
    de: (_, a, b) => `${a} von ${b} gemeistert`,
  },
  {
    re: /^(\d+)\s+شغال عليه\s+·\s+(\d+)\s+مستحق$/,
    en: (_, l, d) => `${l} in progress · ${d} due`,
    de: (_, l, d) => `${l} in Arbeit · ${d} fällig`,
  },
  {
    re: /^(\d+)\s+النهاردة$/,
    en: (_, n) => `${n} today`,
    de: (_, n) => `${n} heute`,
  },
  {
    re: /^(\d+)\s+مستحق الآن$/,
    en: (_, n) => `${n} due now`,
    de: (_, n) => `${n} jetzt fällig`,
  },
  {
    re: /^(\d+)\s+مفتوح$/,
    en: (_, n) => `${n} unlocked`,
    de: (_, n) => `${n} freigeschaltet`,
  },
  {
    re: /^(\d+)\s+قيد الإنجاز$/,
    en: (_, n) => `${n} in progress`,
    de: (_, n) => `${n} in Arbeit`,
  },
  {
    re: /^(\d+)\s+جملة متقنة$/,
    en: (_, n) => `${n} mastered chunks`,
    de: (_, n) => `${n} gemeisterte Chunks`,
  },
  {
    re: /^الكل\s*\((\d+)\)$/,
    en: (_, n) => `All (${n})`,
    de: (_, n) => `Alle (${n})`,
  },
  {
    re: /^المحققة\s*\((\d+)\)$/,
    en: (_, n) => `Unlocked (${n})`,
    de: (_, n) => `Freigeschaltet (${n})`,
  },
  {
    re: /^قيد الإنجاز\s*\((\d+)\)$/,
    en: (_, n) => `In Progress (${n})`,
    de: (_, n) => `In Arbeit (${n})`,
  },
  {
    re: /^فاضل\s+(\d+)\s+لإتاحة الشهادة$/,
    en: (_, n) => `${n} more chunks to unlock certificate`,
    de: (_, n) => `Noch ${n} Chunks bis zum Zertifikat`,
  },
  {
    re: /^(\d+)\s+شانك متقن من\s+(\d+)\s+\((\d+)%\)$/,
    en: (_, a, b, p) => `${a} of ${b} chunks mastered (${p}%)`,
    de: (_, a, b, p) => `${a} von ${b} Chunks gemeistert (${p}%)`,
  },
  {
    re: /^كارت\s+(\d+)\s+من\s+(\d+)$/,
    en: (_, a, b) => `Card ${a} of ${b}`,
    de: (_, a, b) => `Karte ${a} von ${b}`,
  },
  {
    re: /^(\d+)\s+من\s+(\d+)\s+تمارين$/,
    en: (_, a, b) => `${a} of ${b} exercises`,
    de: (_, a, b) => `${a} von ${b} Übungen`,
  },
  {
    re: /^(\d+)\s*\/\s*(\d+)\s+مكتملة$/,
    en: (_, a, b) => `${a} / ${b} completed`,
    de: (_, a, b) => `${a} / ${b} erledigt`,
  },
  {
    re: /^خطوة\s+(\d+)\s+من\s+(\d+)$/,
    en: (_, a, b) => `Step ${a} of ${b}`,
    de: (_, a, b) => `Schritt ${a} von ${b}`,
  },
  {
    re: /^جلسة 1 \((\d+)\/10\)$/,
    en: (_, n) => `Session 1 (${n}/10)`,
    de: (_, n) => `Sitzung 1 (${n}/10)`,
  },
  {
    re: /^المجموعة الختامية للمستوى 🌟 \((\d+) جمل\)$/,
    en: (_, n) => `Level Capstone Group 🌟 (${n} chunks)`,
    de: (_, n) => `Abschlussgruppe 🌟 (${n} Sätze)`,
  },
  {
    re: /^جملة جاهزة في جلسة التشيل مود الحالية \(من أصل (\d+)\)$/,
    en: (_, total) => `chunks ready in this Chill session (out of ${total})`,
    de: (_, total) => `Chunks bereit für diese Chill-Sitzung (von ${total})`,
  },
  {
    re: /^(\d+)\s+من\s+(\d+)$/,
    en: (_, a, b) => `${a} of ${b}`,
    de: (_, a, b) => `${a} von ${b}`,
  },
];

// Placeholder translations
const PLACEHOLDERS = new Map([
  [
    'ابحث عن موضوع، مستوى (A1, A2, B1, B2, C1)، أساطير، قواعد، أو اسم سلسلة...',
    [
      'Search by topic, level (A1, A2, B1, B2, C1), mythology, grammar, or series...',
      'Suche nach Thema, Stufe (A1–C1), Mythologie, Grammatik oder Serie...',
    ],
  ],
  [
    'دوّر برقم المجموعة أو بالقالب أو بالألماني أو بالعربي',
    [
      'Search by group number, sentence pattern, German, or meaning...',
      'Suche nach Gruppennummer, Satzmuster oder Text...',
    ],
  ],
]);

export function translateText(rawStr, lang = currentLang) {
  if (lang === 'ar' || !rawStr) return rawStr;
  const trimmed = rawStr.trim();
  if (!trimmed) return rawStr;

  const langIdx = lang === 'en' ? 0 : 1;

  if (EXACT_PHRASES.has(trimmed)) {
    const translated = EXACT_PHRASES.get(trimmed)[langIdx];
    return rawStr.replace(trimmed, translated);
  }

  for (const rule of REGEX_RULES) {
    const match = trimmed.match(rule.re);
    if (match) {
      const fn = lang === 'en' ? rule.en : rule.de;
      const translated = fn(...match);
      return rawStr.replace(trimmed, translated);
    }
  }

  return rawStr;
}

/**
 * Translates all text nodes and input placeholders inside a root DOM element
 * when the interface language is English ('en') or German ('de'), while keeping
 * original Arabic values stored in weak memory so switching back to 'ar' is instant and lossless.
 */
const origTextNodeMap = new WeakMap();

export function applyDOMLocalization(root = document.body) {
  if (!root) return;
  const lang = currentLang;

  // Update document attributes & page title
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.lang = lang;
  document.title = lang === 'en' ? 'Chunk Notebook — German A1 to C1' : lang === 'de' ? 'Chunk-Heft — Deutsch A1 bis C1' : 'دفتر الشانكس';

  // Update language switcher pill state in topbar
  document.querySelectorAll('[data-lang-switch]').forEach((btn) => {
    const active = btn.dataset.langSwitch === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  // Walk text nodes
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG') return NodeFilter.FILTER_REJECT;
      // Do not alter German example sentences (.de) except pattern chips
      if (parent.classList.contains('de') && !parent.classList.contains('chip')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    if (!origTextNodeMap.has(node)) {
      origTextNodeMap.set(node, node.nodeValue);
    }
    const orig = origTextNodeMap.get(node);
    const nextVal = lang === 'ar' ? orig : translateText(orig, lang);
    if (node.nodeValue !== nextVal) {
      node.nodeValue = nextVal;
    }
  }

  // Translate placeholders, titles, and aria-labels
  root.querySelectorAll?.('input[placeholder], textarea[placeholder]').forEach((el) => {
    if (!el.dataset.origPlaceholder) {
      el.dataset.origPlaceholder = el.getAttribute('placeholder') || '';
    }
    const orig = el.dataset.origPlaceholder;
    if (lang === 'ar') {
      el.setAttribute('placeholder', orig);
    } else if (PLACEHOLDERS.has(orig)) {
      el.setAttribute('placeholder', PLACEHOLDERS.get(orig)[lang === 'en' ? 0 : 1]);
    } else {
      el.setAttribute('placeholder', translateText(orig, lang));
    }
  });

  root.querySelectorAll?.('[title]').forEach((el) => {
    if (!el.dataset.origTitle) {
      el.dataset.origTitle = el.getAttribute('title') || '';
    }
    const orig = el.dataset.origTitle;
    el.setAttribute('title', lang === 'ar' ? orig : translateText(orig, lang));
  });

  root.querySelectorAll?.('[aria-label]').forEach((el) => {
    if (!el.dataset.origAriaLabel) {
      el.dataset.origAriaLabel = el.getAttribute('aria-label') || '';
    }
    const orig = el.dataset.origAriaLabel;
    el.setAttribute('aria-label', lang === 'ar' ? orig : translateText(orig, lang));
  });
}

export function getLang() {
  return currentLang;
}

export function setLang(nextLang, onAfterChange = null) {
  if (!SUPPORTED_LANGS.includes(nextLang)) return;
  currentLang = nextLang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLang);
  } catch {}
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.lang = currentLang;
  if (typeof onAfterChange === 'function') {
    onAfterChange(currentLang);
  }
  applyDOMLocalization(document.body);
}

export function initI18n(onRouteRefresh) {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.lang = currentLang;

  // Observe DOM mutations inside #view, #modal-root, #toast-root, and #lib-lightbox-portal
  let rafId = null;
  const observer = new MutationObserver(() => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyDOMLocalization(document.body);
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document.addEventListener('click', (event) => {
    const langBtn = event.target.closest('[data-lang-switch]');
    if (langBtn) {
      const targetLang = langBtn.dataset.langSwitch;
      setLang(targetLang, onRouteRefresh);
    }
  });

  applyDOMLocalization(document.body);
}
