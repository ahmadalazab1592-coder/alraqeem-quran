import React, { useState, useMemo, useEffect } from 'react';
import { Book, Quote, Type, Calculator, LayoutGrid,Mail, Sparkles, BookOpen, ArrowLeft, ChevronRight, ChevronLeft, X, BookmarkPlus, Save, Trash2, Eye, MessageSquare, Edit3, Scale, Hash, Layers, Search, BarChart3, AlertCircle, ListFilter, Library, Network, Users, Sun, Moon, Info, CheckCircle2, Star, Globe, Crown, Heart, Cloud, User, Clock, ScrollText , Share2, Download , GitMerge, AlertTriangle, Copy } from 'lucide-react';

// استدعاء قواعد البيانات من الملفات المنفصلة
import quranDatabase from './data/quran.json';
import encyclopediaDataRaw from './data/encyclopedia.json';

// تأمين قراءة بيانات الموسوعة للتوافق مع مختلف بيئات البناء (Vite, Webpack, etc.)
const encyclopediaData = Array.isArray(encyclopediaDataRaw) 
  ? encyclopediaDataRaw 
  : (encyclopediaDataRaw && Array.isArray(encyclopediaDataRaw.default) ? encyclopediaDataRaw.default : []);

// ==========================================
// 1. الخوارزمية والمنطق
// ==========================================
const letterValues = {
  'ا': 1, 'ى': 1, 'ء': 1, 'أ': 1, 'إ': 1, 'ٱ': 1, 'ؤ': 5, 
  'ل': 2, 'ن': 3, 'م': 4, 'و': 5, 
  'ي': 6, 'ئ': 6, 'ی': 6, 'ࢨ': 6, '\u066E': 6, 
  'ه': 7, 'ة': 7, 'ر': 8, 'ب': 9, 'ك': 10, 'ت': 11, 'ع': 12,
  'ف': 13, 'ق': 14, 'س': 15, 'د': 16, 'ذ': 17, 'ح': 18,
  'ج': 19, 'خ': 20, 'ش': 21, 'ص': 22, 'ض': 23, 'ز': 24,
  'ث': 25, 'ط': 26, 'غ': 27, 'ظ': 28
};

const exceptionRoots = ['قرءان', 'سيء', 'جءر', 'الءن','ءابا',
   'هنيء', 'مريء', 'تكء', 'فءد', 'خطيء', 'يسء', 'فمالء', 'مشءم', 'يستءخر', 'شيء','شىء', 'بريء', 'برىء','خبء', 'دفء'];
const badEndings = ['في', 'من', 'على', 'الى', 'إلى', 'عن', 'ثم', 'أو', 'ان', 'إن', 'أن', 'لا', 'ما', 'لم', 'لن', 'هل', 'بل', 'قد', 'لقد', 'حتى', 'الا', 'إلا', 'لكن', 'إنما', 'كأن'];
const yaExceptions = [
  'يحى','تحى','نحى','أحى','هداى','خزى','محياى','مثواى','رءيى','إيى',
  'ٱثنى', 'وبنى','بنى','يبنى', 'يؤذى',  'عصاى', 'رءياى', 'إياى', 'بشراى', 
  'امرأتى',
          
     'دحىها', 'طحىها','هدىهم', 'شى', 'تلىها','مأوىك','مأوىه','تتلقىهم','اتىه',  
     'يدى', 'التورىة','ٱصطفىك', 'تورىة'
];
// قائمة الكلمات الديناميكية التي تُحسب ألفاً (1) إذا سُبقت بفتح، وياءً (6) إذا سُبقت بكسر أو سكون
const conditionalYaWords = [
  'بغى', 'هدى', 'سعى', 'ابى', 'أبى', 'اتى', 'أتى',   
  'رضى','خشى','ولى','ـعلى','غنى','عمى','قرى','قوى','صلى','فترى', 
  'انى', 'أنى','إنى',  'طفى',
];
const alifExceptions = [ 'موسى', 'عيسى', 'يحيى'];

const stripDiacritics = (text) => text.replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');

const processWord = (rawWord) => {
  let cleanWord = stripDiacritics(rawWord);
  
  // 🌟 استبقاء الشدة فقط: هذه الدالة تنظف الكلمة من كل التشكيل باستثناء الشدة (ّ)
  let wordWithShadda = rawWord.replace(/[\u064B-\u0650\u0652-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');

  let totalValue = 0;
  let letterCount = 0;
  let strictLetters = ""; 
// 🌟 القاعدة العبقرية لحذف الهمزة الممدودة أو المحصورة (مثل: الآخرة، ءامن)
     // 🌟 1. التقاط الهمزة المحصورة بين اللام والألف الصريحة (مثل: الآخرة)
      cleanWord = cleanWord.replace(/لءا|لأا|لآ/g, 'لا');
      
      // 🌟 2. اصطياد الهمزة في مشتقات (لآيات/لآية) التي اختفت ألفها الخنجرية برمجياً
      // يبحث عن (ل + همزة + ي + ت/ة/ا) ويستبدلها بإسقاط الهمزة
      cleanWord = cleanWord.replace(/ل[ءأآ](ي)(ت|ة|ا)/g, 'لا$1$2');
      // 🌟 قاعدة عامة وذكية لحذف الهمزة المسبوقة بياء (مثل: سىء، سيء، شيء، بريء، هنيء)
      // الكود يبحث عن (ي أو ى) يليها مباشرة (ء)، ويقوم بحذف الهمزة مع الاحتفاظ بالياء
      cleanWord = cleanWord.replace(/([يى])ء/g, '$1');
      // 🌟 حماية كلمات "مد الفرق" (همزة الاستفهام المتبوعة بألف الوصل)
      // هذه الكلمات (ءالله، ءالذكرين، ءالان) لا تُحذف همزتها لأنها همزة استفهام أصلية
      let isInterrogativeHamza = /^(و|ف|ب|ك|ي|يا)?(ءالله|ءالذكرين|ءالان|ءالآن)/.test(cleanWord);
      
      if (!isInterrogativeHamza) {
          // إذا لم تكن الكلمة من كلمات الاستفهام المحمية، طبق قاعدة حذف الهمزة المعتادة (مثل: ءامن، ءادم)
          cleanWord = cleanWord.replace(/^(و|ف|ب|ك|ي|يا)?(ءا|أا|آ)/, '$1ا');
      }
// 🌟 معالجة الكلمات الاستثنائية التي تحذف همزتها (مثل: شيء، دفء، بريء)
      // تنظيف الكلمة من الفواصل غير المرئية أو الكشيدة التي قد تمنع التعرف عليها
      let searchWord = cleanWord.replace(/[\u200B-\u200D\uFEFFـ]/g, '');
      
      if (exceptionRoots.some(root => searchWord.includes(root))) {
          // نحذف الهمزة
          cleanWord = cleanWord.replace('ء', '');
          
          // تأمين حرف الياء: إذا أدى حذف الهمزة إلى بقاء (ى) في نهاية الكلمة، نحولها لـ (ي)
          if (cleanWord.endsWith('ى')) {
              cleanWord = cleanWord.slice(0, -1) + 'ي';
          }
      }
  // 🌟 التقاط الكسرة أو السكون أو الألف الخنجرية (الحل الجذري المنيع)
  let hasKasraOrSukunBeforeYa = false;
  let hasSukunOnYa = false;
  let hasDaggerAlifOnYa = false; 

  // نبحث عن مكان الـ (ى) الأخيرة في الكلمة المشكلة لعزلها عن أي تعقيدات في النهاية (مثل الهمزة أو التنوين)
  let lastYaIndex = rawWord.lastIndexOf('ى');
  if (lastYaIndex !== -1) {
      // نقسم الكلمة إلى نصفين: ما قبل الياء، وما بعد الياء (بما في ذلك الياء نفسها)
      let textBeforeYa = rawWord.substring(0, lastYaIndex);
      let textAfterYa = rawWord.substring(lastYaIndex);
      
      // 1. فحص الكسرة أو السكون قبل الياء مباشرة
      hasKasraOrSukunBeforeYa = /[\u0650\u0652\u06DF\u06E1]\u0651?$/.test(textBeforeYa) || /\u0651[\u0650\u0652\u06DF\u06E1]$/.test(textBeforeYa);
      
      // 2. فحص السكون على الياء نفسها
      hasSukunOnYa = /^ى[\u064B-\u065F\u06E1\u06ED]*[\u0652\u06DF\u06E1]/.test(textAfterYa);

      // 3. فحص الألف الخنجرية على الياء
      hasDaggerAlifOnYa = /^ى[\u064B-\u065F\u06E1\u06ED]*ٰ/.test(textAfterYa);
  }

  let isYaException = yaExceptions.some(exc => cleanWord.includes(exc));
  
  // 🌟 القاعدة الديناميكية الشاملة لكل الكلمات الشرطية (محتفظ بها كما هي ببرمجتك الأصلية)
  const matchedConditionalWord = conditionalYaWords.find(cw => cleanWord.includes(cw));
      
  if (matchedConditionalWord && cleanWord.endsWith('ى')) {
      let indexOfYa = rawWord.lastIndexOf('ى');
      if (indexOfYa !== -1) {
          let j = indexOfYa - 1;
          let diacriticsBeforeYa = '';
          while (j >= 0 && /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/.test(rawWord[j])) {
              diacriticsBeforeYa = rawWord[j] + diacriticsBeforeYa;
              j--;
          }
          if (diacriticsBeforeYa.includes('\u064E') || diacriticsBeforeYa.includes('\u064B') || diacriticsBeforeYa.includes('\u0670')) { 
              isYaException = false; 
          } else {
              isYaException = true; 
          }
      }
  }

  // 🌟 الحل الجذري للشدة
  let hasShaddaOnYa = wordWithShadda.includes('ىّ') || wordWithShadda.includes('يّ');

  let isAlifException = alifExceptions.includes(cleanWord);
  
  // 🌟 سطر القرار النهائي
  let treatYaAs6 = (hasKasraOrSukunBeforeYa || hasSukunOnYa || isYaException || hasShaddaOnYa) && !isAlifException;

  // 🌟 حلقة التكرار المبسطة والنظيفة
  for (let i = 0; i < cleanWord.length; i++) {
    let char = cleanWord[i];
    
    if (char === 'ى') {
        let isMiddleYa = (i < cleanWord.length - 1);
        
        if (isMiddleYa) {
            // نبرة في المنتصف = 6 فوراً
            totalValue += 6;
            letterCount++;
            strictLetters += char;
        } else {
            // الـ (ى) في نهاية الكلمة
            if (hasDaggerAlifOnYa) {
                // متطرفة وعليها ألف خنجرية = 1
                totalValue += 1;
                letterCount++;
                strictLetters += char;
            } else if (treatYaAs6) {
                // متطرفة وينطبق عليها شروط الكسر/السكون/الاستثناء = 6
                totalValue += 6;
                letterCount++;
                strictLetters += char;
            } else {
                // متطرفة ولم ينطبق عليها شيء (أي قبلها فتحة) = 1
                totalValue += 1;
                letterCount++;
                strictLetters += char;
            }
        }
    } else if (letterValues[char] !== undefined) {
      totalValue += letterValues[char];
      letterCount++;
      strictLetters += char;
    }
  }

  return { value: totalValue, letterCount: letterCount, cleanText: strictLetters };
};
// قائمة الكلمات الاستثنائية التي تبدأ بـ (أو) ويجب فلقها إلى كلمتين
const splitExceptionsList = ['أولم', 'أوليس', 'أوءاباؤنا', 'أولما', 'أوكلما', 'أوأمن'];

const splitCompoundUthmani = (word) => {
  const clean = stripDiacritics(word);
  
  // إذا كانت الكلمة ضمن قائمة الاستثناءات
  if (splitExceptionsList.includes(clean)) {
    let baseCount = 0;
    let splitPos = word.length;
    
    for (let i = 0; i < word.length; i++) {
      // حساب الحروف الأساسية فقط (تجاهل التشكيل)
      if (!/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/.test(word[i])) {
        baseCount++;
      }
      
      // القطع بعد الحرف الأساسي الثاني (الألف والواو)
      if (baseCount === 2) {
        let j = i + 1;
        // تضمين أي تشكيل يخص حرف الواو قبل القطع
        while (j < word.length && /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/.test(word[j])) {
          j++;
        }
        splitPos = j;
        break;
      }
    }
    
    // إرجاع الكلمة مقسومة بمسافة حقيقية
    if (splitPos < word.length) {
        return word.substring(0, splitPos) + ' ' + word.substring(splitPos);
    }
  }
  return word;
};
// ==========================================
// 2. هيكل أقسام الموسوعة الشامل
// ==========================================
const encyclopediaCategories = [
  { id: 'muddathir', title: 'إعجاز سورة المدثر ومعجزة العدد 19', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'تطبيقات عملية ومباشرة على منظومة الرقم 19 وتحدي سورة المدثر.' },
  { id: 'numerical_values', title: 'القيم العددية للآيات وتطابقها مع الرقم 19', icon: Hash, color: 'text-emerald-600', bg: 'bg-emerald-600/10', desc: 'حساب الجُمَّل القرآني وتطابقه المبهر مع مضاعفات العدد 19.' },
  { id: 'complete_topics', title: 'تكامل النصوص القرآنية والموضوعات الكاملة', icon: Network, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'أمثلة على الترابط الموضوعي والعددي بين نصوص وموضوعات القرآن.' },
  { id: 'huroof', title: 'إعجاز الحروف والفواتح النورانية', icon: Sun, color: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', desc: 'أسرار الحروف المقطعة في فواتح السور وعلاقاتها الرقمية.' },
  { id: 'prophets_names_metrics', title: 'إعجاز تكرار أسماء الأنبياء', icon: Users, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10', desc: 'المنظومة الإحصائية الدقيقة لذكر أسماء الأنبياء في السياق القرآني.' },
  { id: 'prophets_stories', title: 'إعجاز قصص الأنبياء والمرسلين', icon: BookOpen, color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'التوازنات الرقمية داخل قصص الأنبياء وأحداثها المتعاقبة.' },
  { id: 'cosmic_facts', title: 'الإعجاز في الحقائق الكونية والطبيعية', icon: Globe, color: 'text-cyan-500', bg: 'bg-cyan-500/10', desc: 'الدلالات الرقمية المتعلقة بالكون والطبيعة والمخلوقات.' },
  { id: 'divine_attributes', title: 'إعجاز صفات الله تعالى والتنزيه', icon: Crown, color: 'text-[#d4af37]', bg: 'bg-[#d4af37]/10', desc: 'المنظومة الإحصائية والموازين الدقيقة في أسماء الله الحسنى وصفاته.' },
  { id: 'letter_count_time', title: 'إعجاز المجموع الكلي للحروف (توافقات زمنية)', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'الارتباط بين أعداد الحروف والتوافقات الزمنية أو الفلكية.' },
  { id: 'word_count', title: 'إعجاز المجموع الكلي للكلمات (توافقات زمنية)', icon: BarChart3, color: 'text-violet-500', bg: 'bg-violet-500/10', desc: 'الارتباط بين أعداد الكلمات والدلالات الزمنية والفلكية وغيرها.' },
  { id: 'word_frequency_pairs', title: 'التناظر العددي في تكرار الكلمات والجذور', icon: Layers, color: 'text-indigo-500', bg: 'bg-indigo-500/10', desc: 'التساوي المبهر في تكرار الكلمات، مرادفاتها، أو أضدادها.' },
  { id: 'word_symmetry', title: 'التناظر الدلالي والعددي في أركان الجمل"كلمات و حروف"', icon: Scale, color: 'text-cyan-600', bg: 'bg-cyan-600/10', desc: 'التعادل الرقمي بين أجزاء الجملة القرآنية المتقابلة.' },
  { id: 'quranic_orthography', title: 'إعجاز ومقاصد الرسم القرآني المتمايز', icon: Edit3, color: 'text-slate-600', bg: 'bg-slate-600/10', desc: 'أسرار الحذف والزيادة في الرسم العثماني وعلاقتها بالمعنى والرقم.' },
  { id: 'surah_count', title: 'توافق عدد سور القرآن الكريم (114)', icon: Book, color: 'text-indigo-400', bg: 'bg-indigo-400/10', desc: 'الروابط الرقمية المذهلة التي تشير وتؤكد على عدد سور القرآن.' },
  { id: 'misc', title: 'أمثلة متنوعة', icon: Library, color: 'text-slate-500', bg: 'bg-slate-500/10', desc: 'مساحة مخصصة لنماذج وأبواب إعجازية وتأملات فريدة ومتنوعة.' },
];

const segmentColors = [
  { bg: 'bg-indigo-500/10', text: 'text-indigo-900 dark:text-indigo-100', border: 'border-b-2 border-indigo-400', badge: 'bg-indigo-500 text-white', badgeBorder: 'border-indigo-400' }, 
  { bg: 'bg-[#d4af37]/10', text: 'text-[#8a6d1c] dark:text-[#fdf6e3]', border: 'border-b-2 border-[#d4af37]', badge: 'bg-[#d4af37] text-white', badgeBorder: 'border-[#d4af37]' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-900 dark:text-emerald-100', border: 'border-b-2 border-emerald-400', badge: 'bg-emerald-500 text-white', badgeBorder: 'border-emerald-400' }, 
  { bg: 'bg-cyan-500/10', text: 'text-cyan-900 dark:text-cyan-100', border: 'border-b-2 border-cyan-400', badge: 'bg-cyan-500 text-white', badgeBorder: 'border-cyan-400' }, 
];

const AYAHS_PER_PAGE = 30;

// ==========================================
// 3. التطبيق الأساسي
// ==========================================
export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('quran_theme');
    return saved !== null ? JSON.parse(saved) : true;
  });
// 🌟 حالات الفهرس الشامل والمفضلات
  const [isFullIndexOpen, setIsFullIndexOpen] = useState(false);
  const [favoriteSurahs, setFavoriteSurahs] = useState(() => {
    const saved = localStorage.getItem('quran_favorite_surahs');
    return saved ? JSON.parse(saved) : [];
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  useEffect(() => {
    localStorage.setItem('quran_favorite_surahs', JSON.stringify(favoriteSurahs));
  }, [favoriteSurahs]);

  const toggleFavoriteSurah = (surahId, e) => {
    e.stopPropagation(); // لمنع فتح السورة عند النقر على النجمة فقط
    setFavoriteSurahs(prev => 
      prev.includes(surahId) ? prev.filter(id => id !== surahId) : [...prev, surahId]
    );
  };

  const t = useMemo(() => ({
    bg: isDarkMode ? "bg-[#020617]" : "bg-slate-50",
    panel: isDarkMode ? "bg-slate-900" : "bg-white",
    input: isDarkMode ? "bg-slate-950" : "bg-slate-100",
    border: isDarkMode ? "border-slate-800" : "border-slate-200",
    borderFocus: isDarkMode ? "border-slate-700" : "border-slate-300",
    text: isDarkMode ? "text-slate-50" : "text-slate-900", // ضمان النص الأسود في النهار
    textMuted: isDarkMode ? "text-slate-400" : "text-slate-600",
    btn: isDarkMode ? "bg-slate-800 text-white border-slate-700" : "bg-white text-slate-900 border-slate-200 shadow-sm", // خلفية صلبة
    btnHover: isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-50",
    quranText: isDarkMode ? "text-slate-400" : "text-[#0f5132]",
    quranInactive: isDarkMode ? "text-slate-700" : "text-slate-400",
    headerBg: isDarkMode ? "bg-[#020617]/90" : "bg-white/90",
    bottomBg: isDarkMode ? "bg-[#020617]/95" : "bg-white/95",
  }), [isDarkMode]);

  const [activeTab, setActiveTab] = useState('main'); 
  const [activeEncycCategory, setActiveEncycCategory] = useState(null);
  const [activeSurahId, setActiveSurahId] = useState(() => {
    const savedSurah = localStorage.getItem('quran_last_surah');
    return savedSurah ? parseInt(savedSurah) : 1;
  });

  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = localStorage.getItem('quran_last_page');
    return savedPage ? parseInt(savedPage) : 1;
  });

  const [isSurahModalOpen, setIsSurahModalOpen] = useState(false);
  const [surahSearchQuery, setSurahSearchQuery] = useState('');
  const [isGlobalSearchModalOpen, setIsGlobalSearchModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);
  const [hasActiveSearch, setHasActiveSearch] = useState(false);
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState(false); 

  const [selectionMode, setSelectionMode] = useState('word');
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [selectedAyahs, setSelectedAyahs] = useState(new Set());
  const [baseSelectionIndices, setBaseSelectionIndices] = useState([]);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartId, setDragStartId] = useState(null);
  const [dragMoved, setDragMoved] = useState(false); 

  const [statsData, setStatsData] = useState(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(null); 
  const [discoveries, setDiscoveries] = useState([]);
  const [activeDiscoveryIndex, setActiveDiscoveryIndex] = useState(0);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isDeepSearchConfigOpen, setIsDeepSearchConfigOpen] = useState(false);
  const [deepSearchType, setDeepSearchType] = useState('both'); 
  const [isDeepSearching, setIsDeepSearching] = useState(false);

  const [ayahMiraclesModalData, setAyahMiraclesModalData] = useState(null);
  const [savedDiscoveries, setSavedDiscoveries] = useState([]);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Cairo:wght@400;700;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    try {
        const saved = localStorage.getItem('quran_saved_final_v2');
        if (saved) setSavedDiscoveries(JSON.parse(saved));
    } catch (e) { }
  }, []);

  useEffect(() => {
    localStorage.setItem('quran_theme', JSON.stringify(isDarkMode));
    // في حال كنت تعتمد على كلاسات خارجية، هذا يحافظ على توافق النظام
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('quran_last_surah', activeSurahId);
    localStorage.setItem('quran_last_page', currentPage);
  }, [activeSurahId, currentPage]);

  useEffect(() => {
    try { localStorage.setItem('quran_saved_final_v2', JSON.stringify(savedDiscoveries)); } catch(e) {}
  }, [savedDiscoveries]);

  const scrollToResults = () => {
    const panel = document.getElementById('results-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
// 🌟 دالة للتمرير التلقائي لأسفل نحو الآية المحددة بعد إغلاق الإحصاءات
  const scrollToLastSelection = () => {
    let targetAyah = null;
    
    if (selectedAyahs.size > 0) {
      // إذا كان التحديد بالآيات، نأخذ أول آية محددة
      targetAyah = Math.min(...Array.from(selectedAyahs));
    } else if (selectedWords.size > 0) {
      // إذا كان التحديد بالكلمات، نستخرج رقم الآية من أول كلمة محددة
      const firstWordId = Array.from(selectedWords)[0];
      targetAyah = parseInt(firstWordId.split('-')[0]);
    }

    if (targetAyah) {
      setTimeout(() => {
        const ayahElement = document.getElementById(`ayah-${targetAyah}`);
        if (ayahElement) {
          ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100); // تأخير بسيط لضمان اختفاء لوحة الإحصاءات أولاً
    }
  };
  const currentSurah = useMemo(() => {
    return quranDatabase.find(s => parseInt(s.id) === parseInt(activeSurahId)) || quranDatabase[0];
  }, [activeSurahId]);

  const currentSurahAyahs = useMemo(() => {
    return currentSurah.ayahs.map(ayah => {
      
      // معالجة النص وفصل الكلمات الاستثنائية بمسافة برمجية
      const processedText = ayah.text.split(/\s+/).map(w => splitCompoundUthmani(w)).join(' ');

      return {
        id: `${currentSurah.id}-${ayah.id}`,
        surah: currentSurah.name,
        number: parseInt(ayah.number),
        text: processedText // استخدام النص المعالج بدلاً من النص الأصلي
      };
    });
  }, [currentSurah]);
  
  const totalPages = Math.ceil(currentSurahAyahs.length / AYAHS_PER_PAGE);
  const paginatedAyahs = useMemo(() => {
    const startIndex = (currentPage - 1) * AYAHS_PER_PAGE;
    return currentSurahAyahs.slice(startIndex, startIndex + AYAHS_PER_PAGE);
  }, [currentSurahAyahs, currentPage]);

 const flatWords = useMemo(() => {
    let index = 0;
    const arr = [];
    
    // 1. حصر علامات الوقف باستخدام الرموز القرآنية (Unicode) التي تكتب فوق النص
    // بدلاً من استخدام الحروف العادية (لا، م، ج) التي تتقاطع وتُحذف مع كلمات القرآن الأصلية
    const stopMarks = [
      'ۖ', 'ۗ', 'ۚ', 'ۛ', 'ۙ', 'ۘ', 'ۜ', '۩', '۞', '۝', '؏'
    ];

    currentSurahAyahs.forEach(ayah => {
      const words = ayah.text.split(' ');
      
      words.forEach((word, wIdx) => {
        // تنظيف الكلمة مؤقتاً من أي تشكيل لضمان دقة الاستكشاف
        const cleanWordForCheck = stripDiacritics(word).trim();
        
        // 2. الاستكشاف والتجاوز: إذا كان الجزء المقروء مجرد علامة وقف (فوق النص) أو فارغاً، نتجاوزه
        if (cleanWordForCheck === '' || stopMarks.includes(word.trim())) {
            return; 
        }

        const processed = processWord(word);
        
        // تأمين إضافي: استبعاد الكلمات التي لا تحتوي على حروف أبجدية حقيقية
        if (processed.cleanText.length === 0) return;

        arr.push({
          flatIndex: index++, 
          ayahId: ayah.number, 
          wordIndex: wIdx, 
          wordId: `${ayah.number}-${wIdx}`,
          text: word, 
          cleanText: processed.cleanText, 
          value: processed.value, 
          letterCount: processed.letterCount
        });
      });
    });
    return arr;
  }, [currentSurahAyahs]);

  const flatWordIds = useMemo(() => flatWords.map(fw => fw.wordId), [flatWords]);

  const getSearchScope = () => {
    if (selectedWords.size > 0) {
       const filtered = flatWords.filter(fw => selectedWords.has(fw.wordId));
       return filtered.sort((a, b) => a.flatIndex - b.flatIndex);
    }
    if (selectedAyahs.size > 0) {
       const filtered = flatWords.filter(fw => selectedAyahs.has(fw.ayahId));
       return filtered.sort((a, b) => a.flatIndex - b.flatIndex);
    }
    return flatWords; 
  };
  // 🌟 دالة لنسخ النص القرآني المحدد
  const handleCopySelectedText = () => {
    const scope = getSearchScope();
    if (scope.length === 0) return;
    const textToCopy = scope.map(fw => fw.text).join(' ');
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert('تم نسخ النص القرآني بنجاح!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('عذراً، حدث خطأ أثناء النسخ.');
    });
  };

  const getDiscoveryTextSnippet = (segment) => flatWords.slice(segment.startIndex, segment.endIndex + 1).map(fw => fw.text).join(' ');

  const handleGlobalSearch = (query) => {
    setGlobalSearchQuery(query);
    if (!query.trim()) { setGlobalSearchResults([]); return; }
    
    const cleanQuery = stripDiacritics(query);
    const results = [];
    for (const surah of quranDatabase) {
        for (const ayah of surah.ayahs) {
            const cleanAyah = stripDiacritics(ayah.text);
            if (cleanAyah.includes(cleanQuery)) {
                results.push({
                    surahId: parseInt(surah.id),
                    surahName: surah.name,
                    ayahNumber: parseInt(ayah.number),
                    text: ayah.text
                });
            }
            if (results.length > 60) break;
        }
        if (results.length > 60) break;
    }
    setGlobalSearchResults(results);
  };

  const goToGlobalResult = (result) => {
    setActiveSurahId(result.surahId);
    const targetPage = Math.ceil(result.ayahNumber / AYAHS_PER_PAGE);
    setCurrentPage(targetPage);
    setIsGlobalSearchModalOpen(false); // إخفاء النافذة فقط
    
    // تم إيقاف تصفير البحث للاحتفاظ بالنتائج
    // setGlobalSearchQuery('');
    // setGlobalSearchResults([]);

    setSelectionMode('ayah');
    setSelectedAyahs(new Set([result.ayahNumber]));
    setSelectedWords(new Set());
    setBaseSelectionIndices([]);
    setStatsData(null);
    setDiscoveries([]);

    setHasActiveSearch(true); // 🌟 إخبار التطبيق أن هناك بحثاً نشطاً

    setTimeout(() => {
      const ayahElement = document.getElementById(`ayah-${result.ayahNumber}`);
      if (ayahElement) {
        ayahElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  const clearSelection = () => {
    setSelectedWords(new Set());
    setSelectedAyahs(new Set());
    setBaseSelectionIndices([]);
    setStatsData(null);
    setDiscoveries([]);
    setDiscoveryMode(null);
  };

  const handleCalculateStats = () => {
    const scope = getSearchScope();
    if (scope.length === 0) return;
    let words = scope.length; let letters = 0; let value = 0;
    scope.forEach(fw => { letters += fw.letterCount; value += fw.value; });
    setStatsData({
       words, letters, value,
       is19Letters: letters % 19 === 0 && letters > 0,
       is19Value: value % 19 === 0 && value > 0,
       segments: [{ startIndex: scope[0].flatIndex, endIndex: scope[scope.length - 1].flatIndex, sum: value, letterCount: letters }]
    });
    setDiscoveries([]); 
    setTimeout(scrollToResults, 100);
  };

  const openDeepSearchConfig = () => {
     if (!statsData) return;
     setIsDeepSearchConfigOpen(true);
  };

  const executeDeepSearch = () => {
    if (!statsData) return;
    setIsDeepSearchConfigOpen(false);
    setIsDeepSearching(true);
    setTimeout(() => {
      const targetValue = statsData.value;
      const targetLetters = statsData.letters;

      const startPage = Math.max(1, currentPage - 3);
      const endPage = Math.min(totalPages, currentPage + 3);

      const startAyahIdx = (startPage - 1) * AYAHS_PER_PAGE;
      const endAyahIdx = endPage * AYAHS_PER_PAGE;

      const ayahsInRange = currentSurahAyahs.slice(startAyahIdx, endAyahIdx);
      const ayahNumbersInRange = new Set(ayahsInRange.map(a => a.number));
      const scopeWords = flatWords.filter(fw => ayahNumbersInRange.has(fw.ayahId));

      if (scopeWords.length === 0) {
        setIsDeepSearching(false);
        return;
      }

      let results = [];
      const scopeStartIndex = scopeWords[0].flatIndex;
      const scopeEndIndex = scopeWords[scopeWords.length - 1].flatIndex;

      const selectedStart = statsData.segments[0].startIndex;
      const selectedEnd = statsData.segments[0].endIndex;

      for (let start = scopeStartIndex; start <= scopeEndIndex; start++) {
        let currentSum = 0;
        let currentLetters = 0;
        for (let end = start; end <= scopeEndIndex; end++) {
          const fw = flatWords[end];
          currentSum += fw.value;
          currentLetters += fw.letterCount;

          if (start === selectedStart && end === selectedEnd) continue;

          let isMatch = false;
          let matchType = '';

          if (deepSearchType === 'letters' && currentLetters === targetLetters) {
             isMatch = true;
             matchType = 'الحروف';
          } else if (deepSearchType === 'value' && currentSum === targetValue) {
             isMatch = true;
             matchType = 'القيمة';
          } else if (deepSearchType === 'both') {
             if (currentLetters === targetLetters && currentSum === targetValue) {
                 isMatch = true;
                 matchType = 'الحروف والقيمة معاً';
             } else if (currentLetters === targetLetters) {
                 isMatch = true;
                 matchType = 'الحروف';
             } else if (currentSum === targetValue) {
                 isMatch = true;
                 matchType = 'القيمة';
             }
          }

          if (isMatch) {
            if (currentLetters > 2) {
                results.push({
                  type: 'deep_search',
                  metricValue: matchType.includes('القيمة') ? currentSum : currentLetters,
                  matchType: matchType,
                  segments: [
                    { startIndex: selectedStart, endIndex: selectedEnd, sum: targetValue, letterCount: targetLetters, isPrimary: true },
                    { startIndex: start, endIndex: end, sum: currentSum, letterCount: currentLetters, isPrimary: false }
                  ]
                });
            }
          }

          if (deepSearchType === 'both') {
              if (currentSum > targetValue && currentLetters > targetLetters) break;
          } else if (deepSearchType === 'letters' && currentLetters > targetLetters) {
              break;
          } else if (deepSearchType === 'value' && currentSum > targetValue) {
              break;
          }
        }
      }

      if (results.length > 0) {
        results.sort((a, b) => {
           if (a.matchType === 'الحروف والقيمة معاً' && b.matchType !== 'الحروف والقيمة معاً') return -1;
           if (a.matchType !== 'الحروف والقيمة معاً' && b.matchType === 'الحروف والقيمة معاً') return 1;
           return 0;
        });

        setDiscoveries(results);
        setDiscoveryMode('deep_search');
        setActiveDiscoveryIndex(0);
      } else {
         alert(`لم يتم العثور على أي متطابقات في النطاق المحيط (من صفحة ${startPage} إلى ${endPage}) لنوع البحث المختار.`);
      }

      setIsDeepSearching(false);
      setTimeout(scrollToResults, 100);
    }, 400); 
  };

  const runDiscovery = (mode) => {
    setShowToolsMenu(false);
    setIsDiscovering(true);
    setStatsData(null);
    setDiscoveryMode(mode);
    setTimeout(() => {
      const scope = getSearchScope();
      if (scope.length === 0) { setIsDiscovering(false); return; }

      let results = [];
      const scopeStartIndex = scope[0].flatIndex;
      const scopeEndIndex = scope[scope.length - 1].flatIndex;

      for (let start = scopeStartIndex; start <= scopeEndIndex; start++) {
        let currentSum = 0;
        let currentLetters = 0;
        for (let end = start; end <= scopeEndIndex; end++) {
          const fw = flatWords[end];
          currentSum += fw.value;
          currentLetters += fw.letterCount;
          
          if (currentLetters < 10) continue; 
          if (badEndings.includes(fw.cleanText)) continue;

          if (mode === '19_letters' && currentLetters % 19 === 0) {
             results.push({ type: mode, metricValue: currentLetters, segments: [{ startIndex: start, endIndex: end, length: end - start + 1, sum: currentSum, letterCount: currentLetters }], is19: true });
          }
          else if (mode === '19_values' && currentSum % 19 === 0) {
             results.push({ type: mode, metricValue: currentSum, segments: [{ startIndex: start, endIndex: end, length: end - start + 1, sum: currentSum, letterCount: currentLetters }], is19: true });
          }
          else if (mode === 'balance_letters' || mode === 'balance_values') {
             results.push({ startIndex: start, endIndex: end, length: end - start + 1, sum: currentSum, letterCount: currentLetters });
          }
        }
      }

      if (mode === 'balance_letters' || mode === 'balance_values') {
        const groups = {};
        results.forEach(seg => {
           const key = mode === 'balance_letters' ? seg.letterCount : seg.sum;
           if (!groups[key]) groups[key] = [];
           groups[key].push(seg);
        });
        let finalResults = [];
        Object.keys(groups).forEach(key => {
          let segments = groups[key].sort((a, b) => a.endIndex - b.endIndex);
          let nonOverlappingSegments = [];
          let lastEndIndex = -1;
          for (let seg of segments) {
            if (seg.startIndex > lastEndIndex) {
              nonOverlappingSegments.push(seg);
              lastEndIndex = seg.endIndex;
            }
          }
          if (nonOverlappingSegments.length > 1) {
            finalResults.push({
              type: mode, metricValue: parseInt(key), segments: nonOverlappingSegments,
              is19: mode === 'balance_values' ? parseInt(key) % 19 === 0 : parseInt(key) % 19 === 0
            });
          }
        });
        results = finalResults.sort((a, b) => b.metricValue - a.metricValue);
      } else {
        results.sort((a, b) => b.metricValue - a.metricValue);
      }

      setDiscoveries(results);
      setActiveDiscoveryIndex(0);
      setIsDiscovering(false);
      
      setTimeout(scrollToResults, 100);
    }, 600);
  };

  const handleDragStart = (wordId) => {
    if (selectionMode !== 'word' || discoveries.length > 0) return;
    setIsDragging(true);
    setDragStartId(wordId);
    setDragMoved(false); 

    let currentIndices = [];
    if (selectedWords.size > 0) {
        currentIndices = Array.from(selectedWords).map(id => flatWordIds.indexOf(id));
        setBaseSelectionIndices(currentIndices);
    } else {
        setBaseSelectionIndices([]);
    }
  };

  const handleDragEnter = (wordId) => {
    if (!isDragging || selectionMode !== 'word') return;
    if (wordId !== dragStartId) setDragMoved(true);

    const dragStartIndex = flatWordIds.indexOf(dragStartId);
    const currentIndex = flatWordIds.indexOf(wordId);

    const dragMin = Math.min(dragStartIndex, currentIndex);
    const dragMax = Math.max(dragStartIndex, currentIndex);

    const newSelection = new Set();
    
    // إضافة التحديدات السابقة للحفاظ على التحديد المتقطع
    baseSelectionIndices.forEach(idx => newSelection.add(flatWordIds[idx]));

    // إضافة التحديد الحالي بناءً على السحب
    for (let i = dragMin; i <= dragMax; i++) {
        newSelection.add(flatWordIds[i]);
    }

    setSelectedWords(newSelection);
    setStatsData(null);
  };

  const handleDragEnd = () => { setIsDragging(false); setDragStartId(null); };

  const handleTouchMove = (e) => {
    if (!isDragging || selectionMode !== 'word') return;
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element && element.getAttribute('data-wordid')) {
        handleDragEnter(element.getAttribute('data-wordid'));
    }
  };
  
  const handleWordClick = (wordId) => {
    if (selectionMode !== 'word' || discoveries.length > 0) return;
    if (dragMoved) return; 

    const newSelection = new Set(selectedWords);
    if (newSelection.has(wordId)) {
        newSelection.delete(wordId);
    } else {
        newSelection.add(wordId);
    }
    setSelectedWords(newSelection);
    setStatsData(null);
  };

  const handleAyahClick = (ayahId) => {
    if (selectionMode !== 'ayah' || discoveries.length > 0) return;
    const newSelection = new Set(selectedAyahs);
    if (newSelection.has(ayahId)) newSelection.delete(ayahId); else newSelection.add(ayahId);
    setSelectedAyahs(newSelection); setStatsData(null);
  };

  const openCommentModal = () => {
    setCommentText('');
    setIsCommentModalOpen(true);
  };

  const saveDiscovery = () => {
    let dataToSave;
    if (statsData) dataToSave = { id: Date.now(), type: 'stats', metricValue: statsData.value, segments: statsData.segments, comment: commentText };
    else dataToSave = { id: Date.now(), ...discoveries[activeDiscoveryIndex], comment: commentText };
    setSavedDiscoveries(prev => [dataToSave, ...prev]);
    setIsCommentModalOpen(false); setStatsData(null); setDiscoveries([]);
  };

  const getCategoryDetails = (catIdOrTitle) => {
      if (!catIdOrTitle) return encyclopediaCategories[0];
      const searchStr = String(catIdOrTitle).toLowerCase();
      return encyclopediaCategories.find(c => 
          c.id.toLowerCase() === searchStr || 
          c.title.toLowerCase() === searchStr || 
          c.title.toLowerCase().includes(searchStr) || 
          searchStr.includes(c.title.toLowerCase())
      ) || encyclopediaCategories[0];
  };

  const isReadingMode = discoveries.length === 0 && !statsData;

  return (
    <div 
      className={`flex flex-col h-[100dvh] w-full ${t.bg} ${t.text} overflow-hidden relative transition-colors duration-300 ${isReadingMode ? 'reading-mode' : ''}`} 
      style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}
      onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchEnd={handleDragEnd}
    >
      <div className="fixed inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: `radial-gradient(${isDarkMode ? '#ffffff' : '#000000'} 1px, transparent 1px)`, backgroundSize: '30px 30px' }}></div>

      {/* الموديلات والنوافذ المنبثقة */}
      {ayahMiraclesModalData && (
         <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in-up">
            <div className={`${t.panel} border border-[#d4af37]/40 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-[0_0_50px_rgba(212,175,55,0.15)] flex flex-col overflow-hidden`}>
               <div className={`flex justify-between items-center p-5 border-b ${t.border}`}>
                  <h3 className={`text-xl font-bold ${t.text} flex items-center`}>
                    <Sparkles className="w-5 h-5 ml-2 text-[#d4af37] animate-pulse"/> 
                    إعجاز الآية ({ayahMiraclesModalData[0].ayahNumbers.join(', ')})
                  </h3>
                  <button onClick={() => setAyahMiraclesModalData(null)} className={`${t.textMuted} hover:${t.text} ${t.input} p-2 rounded-xl`}><X className="w-5 h-5"/></button>
               </div>
               <div className="overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  {ayahMiraclesModalData.map((miracle, idx) => {
                     const catDetails = getCategoryDetails(miracle.categoryId);
                     return (
                       <div key={idx} className={`${t.input} border ${t.border} rounded-2xl p-5 shadow-sm relative overflow-hidden group`}>
                         <div className={`absolute top-0 right-0 w-1 h-full ${catDetails.bg.replace('/10', '')} opacity-50`}></div>
                         <div className="flex items-center gap-2 mb-3">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded border ${catDetails.color} ${t.border} ${t.panel}`}>{catDetails.title}</span>
                         </div>
                         <h4 className={`text-lg font-bold ${t.text} mb-3`}>{miracle.title}</h4>
                         <div className={`${t.panel} border ${t.border} p-4 rounded-xl mb-4 text-center`}>
                            <p className="font-['Amiri_Quran'] text-xl leading-loose text-[#d4af37]">"{miracle.quranText}"</p>
                         </div>
                         <span className={`inline-block ${t.panel} ${t.textMuted} text-xs font-bold px-3 py-1.5 rounded-lg border ${t.border} mb-3`}>
                            {miracle.metricType}: <span className={catDetails.color}>{miracle.metricValue}</span>
                         </span>
                         <p className={`${t.textMuted} text-sm leading-relaxed`}>{miracle.explanation}</p>
                       </div>
                     );
                  })}
               </div>
            </div>
         </div>
      )}

      {isDeepSearchConfigOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className={`${t.panel} border border-indigo-500/50 rounded-3xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(99,102,241,0.2)] animate-fade-in-up`}>
               <div className={`flex justify-between items-center mb-6 border-b ${t.border} pb-4`}>
                <h3 className={`text-xl font-bold ${t.text} flex items-center`}><Search className="w-5 h-5 ml-2 text-indigo-400"/> تحديد نوع المطابقة</h3>
                <button onClick={() => setIsDeepSearchConfigOpen(false)} className={`${t.textMuted} hover:${t.text} ${t.input} p-2 rounded-xl`}><X className="w-5 h-5"/></button>
              </div>
              <p className={`${t.textMuted} text-sm mb-5 text-center`}>بماذا ترغب أن يتطابق النص الجديد مع النص الأساسي؟</p>
              
              <div className="space-y-3 mb-6">
                <button onClick={() => setDeepSearchType('letters')} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${deepSearchType === 'letters' ? 'bg-cyan-900/30 border-cyan-500 text-cyan-600 dark:text-cyan-400' : `${t.input} ${t.border} ${t.text} hover:${t.borderFocus}`}`}>
                   <span className={`font-bold flex items-center`}><Type className="w-4 h-4 ml-2"/> تطابق في عدد الحروف فقط</span>
                   {deepSearchType === 'letters' && <CheckCircle2 className="w-5 h-5"/>}
                </button>
                <button onClick={() => setDeepSearchType('value')} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${deepSearchType === 'value' ? 'bg-[#d4af37]/10 border-[#d4af37] text-[#8a6d1c] dark:text-[#d4af37]' : `${t.input} ${t.border} ${t.text} hover:${t.borderFocus}`}`}>
                   <span className={`font-bold flex items-center`}><Hash className="w-4 h-4 ml-2"/> تطابق في القيمة العددية فقط</span>
                   {deepSearchType === 'value' && <CheckCircle2 className="w-5 h-5"/>}
                </button>
                <button onClick={() => setDeepSearchType('both')} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${deepSearchType === 'both' ? 'bg-indigo-900/30 border-indigo-500 text-indigo-700 dark:text-indigo-400' : `${t.input} ${t.border} ${t.text} hover:${t.borderFocus}`}`}>
                   <span className={`font-bold flex items-center`}><Layers className="w-4 h-4 ml-2"/> ابحث عن كلاهما (الحروف أو القيمة)</span>
                   {deepSearchType === 'both' && <CheckCircle2 className="w-5 h-5"/>}
                </button>
              </div>

              <button onClick={executeDeepSearch} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex justify-center items-center">
                 <Search className="w-5 h-5 ml-2" /> بدء التمشيط
              </button>
            </div>
         </div>
      )}

      {isSurahModalOpen && (
         <div className="fixed inset-0 z-[70] flex items-start justify-center pt-20 bg-black/80 backdrop-blur-md p-4">
          <div className={`${t.panel} border ${t.borderFocus} rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-xl font-bold ${t.text}`}>البحث عن سورة</h3>
              <button onClick={() => setIsSurahModalOpen(false)} className={`${t.textMuted} hover:${t.text} ${t.input} p-2 rounded-xl`}><X className="w-5 h-5"/></button>
            </div>
            <input 
              type="text" placeholder="اكتب اسم السورة..." value={surahSearchQuery} onChange={(e) => setSurahSearchQuery(e.target.value)}
              className={`w-full ${t.input} border ${t.borderFocus} ${t.text} rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-[#d4af37]`} autoFocus
            />
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-2">
               {quranDatabase.filter(s => stripDiacritics(s.name).includes(stripDiacritics(surahSearchQuery))).map(s => {
                // 🌟 التحقق: هل هذه السورة هي المفتوحة حالياً؟
                const isActive = activeSurahId === s.id;

                return (
                <button 
                  key={s.id} 
                  onClick={() => { setActiveSurahId(s.id); setCurrentPage(1); setIsSurahModalOpen(false); clearSelection(); setSurahSearchQuery(''); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }}
                  // 🌟 تطبيق التظليل الذهبي المضيء للسورة النشطة، وإبقاء التنسيق العادي للباقي
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all border ${
                    isActive 
                      ? "bg-[#d4af37]/20 border-[#d4af37]/50 shadow-[0_0_10px_rgba(212,175,55,0.15)]" 
                      : `${t.btn} ${t.btnHover} border-transparent`
                  }`}
                >
                  <span 
                    className={`font-bold text-lg pt-1 ${isActive ? "text-[#d4af37]" : t.text}`} 
                    style={{ fontFamily: "'Amiri Quran', serif" }}
                  >
                    سورة {s.name}
                  </span>
                  <span className={`text-xs font-sans ${isActive ? "text-[#d4af37]/80" : t.textMuted}`}>
                    {s.total_ayahs} آية
                  </span>
                </button>
              )})}
            </div>
          </div>
        </div>
      )}
{isFullIndexOpen && (
         <div className="fixed inset-0 z-[80] flex flex-col bg-black/60 backdrop-blur-xl p-4 md:p-8 animate-fade-in-up overflow-hidden">
            <div className={`flex justify-between items-center mb-6 pb-4 border-b border-white/10`}>
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-white flex items-center tracking-wide">
                  <LayoutGrid className="ml-3 w-6 h-6 text-[#d4af37]" /> الفهرس <span className="text-[#d4af37] mr-2">الشامل</span>
                </h2>
                <p className="text-slate-300 text-sm mt-1">اختر السورة المطلوبة أو قم بتمييز سورك المفضلة بنجمة للوصول السريع.</p>
              </div>
              <button onClick={() => setIsFullIndexOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-2xl transition-colors backdrop-blur-md"><X className="w-6 h-6"/></button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 pb-20">
               {/* 🌟 قسم السور المفضلة (يظهر فقط إذا كان هناك مفضلات) */}
               {favoriteSurahs.length > 0 && (
                 <div className="mb-8 bg-white/5 p-5 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]">
                   <h3 className="text-[#d4af37] font-bold mb-4 flex items-center text-lg"><Star className="ml-2 w-5 h-5 fill-[#d4af37]" /> سور قيد البحث (المفضلة)</h3>
                   <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                     {favoriteSurahs.map(id => {
                       const s = quranDatabase.find(surah => surah.id === id);
                       if (!s) return null;
                       return (
                         <div key={`fav-${s.id}`} onClick={() => { setActiveSurahId(s.id); setCurrentPage(1); setIsFullIndexOpen(false); clearSelection(); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} className="bg-slate-900/50 hover:bg-slate-800/80 border border-[#d4af37]/30 hover:border-[#d4af37] rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-1 group flex justify-between items-center shadow-sm">
                           <div>
                             <span className="font-bold text-lg text-white block mb-1" style={{ fontFamily: "'Amiri Quran', serif" }}>{s.name}</span>
                             <span className="text-xs text-slate-400 font-sans">{s.total_ayahs} آية</span>
                           </div>
                           <button onClick={(e) => toggleFavoriteSurah(s.id, e)} className="p-2 bg-black/20 rounded-xl hover:scale-110 transition-transform">
                             <Star className="w-5 h-5 text-[#d4af37] fill-[#d4af37]" />
                           </button>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}

               {/* 🌟 قسم كل السور */}
               <div>
                 <h3 className="text-white font-bold mb-4 flex items-center text-lg"><Book className="ml-2 w-5 h-5" /> المصحف كاملاً (114 سورة)</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
                    {quranDatabase.map(s => {
                      const isFav = favoriteSurahs.includes(s.id);
                      // 🌟 التحقق: هل هذه السورة هي النشطة/المفتوحة حالياً؟
                      const isActive = activeSurahId === s.id;

                      return (
                        <div 
                          key={s.id} 
                          onClick={() => { setActiveSurahId(s.id); setCurrentPage(1); setIsFullIndexOpen(false); clearSelection(); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} 
                          // 🌟 تطبيق التنسيق الشرطي هنا للبطاقة بالكامل
                          className={`border rounded-2xl p-4 cursor-pointer transition-all hover:-translate-y-1 group flex justify-between items-center shadow-sm backdrop-blur-sm ${
                            isActive
                              ? "bg-gradient-to-r from-[#d4af37]/20 to-[#d4af37]/5 border-[#d4af37]/60 shadow-[0_0_15px_rgba(212,175,55,0.15)]" // السورة المحددة (ذهبي مع إضاءة)
                              : "bg-slate-900/40 hover:bg-slate-800/80 border-white/5 hover:border-cyan-500/50" // السور العادية
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className={`text-[10px] px-2 py-0.5 rounded-md ${isActive ? "bg-[#d4af37]/20 text-[#d4af37]" : "bg-slate-800 text-slate-400"}`}>
                                 {s.id}
                               </span>
                               <span 
                                 className={`font-bold text-lg block transition-colors ${isActive ? "text-[#d4af37]" : "text-white group-hover:text-cyan-400"}`} 
                                 style={{ fontFamily: "'Amiri Quran', serif" }}
                               >
                                 {s.name}
                               </span>
                            </div>
                            <span className={`text-xs font-sans ${isActive ? "text-[#d4af37]/80" : "text-slate-400"}`}>
                              {s.total_ayahs} آية
                            </span>
                          </div>
                          <button onClick={(e) => toggleFavoriteSurah(s.id, e)} className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                            <Star className={`w-4 h-4 ${isFav ? 'text-[#d4af37] fill-[#d4af37]' : 'text-slate-500'}`} />
                          </button>
                        </div>
                      );
                    })}
                 </div>
               </div>
            </div>
         </div>
      )}
      {isGlobalSearchModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center pt-10 bg-black/80 backdrop-blur-md p-4">
          <div className={`${t.panel} border border-cyan-500/50 rounded-2xl p-6 w-full max-w-3xl shadow-[0_0_40px_rgba(6,182,212,0.15)] animate-fade-in-up flex flex-col max-h-[85vh]`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-cyan-500 flex items-center"><Search className="ml-2 w-5 h-5"/> بحث شامل في المصحف</h3>
              <button onClick={() => setIsGlobalSearchModalOpen(false)} className={`${t.textMuted} hover:${t.text} ${t.input} p-2 rounded-xl`}><X className="w-5 h-5"/></button>
            </div>
            <input 
              type="text" placeholder="ابحث عن أي كلمة أو عبارة في القرآن (بدون تشكيل)..." value={globalSearchQuery} onChange={(e) => handleGlobalSearch(e.target.value)}
              className={`w-full ${t.input} border ${t.borderFocus} ${t.text} rounded-xl px-4 py-4 focus:outline-none focus:border-cyan-500 text-lg shadow-inner`} autoFocus
            />
            <div className="mt-4 flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {globalSearchQuery.trim() === '' ? (
                 <div className={`text-center ${t.textMuted} py-10`}>اكتب كلمة للبدء بالبحث في جميع السور...</div>
              ) : globalSearchResults.length === 0 ? (
                 <div className={`text-center ${t.textMuted} py-10`}>لا توجد نتائج مطابقة لبحثك.</div>
              ) : (
                globalSearchResults.map((result, idx) => (
                  <button key={idx} onClick={() => goToGlobalResult(result)} className={`w-full text-right ${t.btn} ${t.btnHover} border ${t.borderFocus} hover:border-cyan-500/50 p-4 rounded-xl transition-all`}>
                    <div className="flex justify-between items-center mb-2">
                       <span className={`text-sm font-bold ${t.input} px-3 py-1 rounded-lg text-cyan-500 border ${t.borderFocus} pt-1.5`} style={{ fontFamily: "'Amiri Quran', serif" }}>سورة {result.surahName} - آية {result.ayahNumber}</span>
                    </div>
                    <p className={`font-['Amiri_Quran'] text-xl leading-loose ${t.quranText}`}>{result.text}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {isCommentModalOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className={`${t.panel} border border-[#d4af37]/50 rounded-2xl p-6 w-full max-w-lg shadow-[0_0_50px_rgba(212,175,55,0.2)] animate-fade-in-up`}>
            <h3 className="text-xl font-bold text-[#d4af37] mb-3 flex items-center"><MessageSquare className="ml-2 w-5 h-5" /> حفظ في المكتبة</h3>
            <textarea className={`w-full h-32 ${t.input} border ${t.borderFocus} rounded-xl p-4 ${t.text} focus:outline-none focus:border-[#d4af37] transition-all resize-none mb-4 custom-scrollbar text-base`} placeholder="اكتب تأملاتك حول هذا الاستكشاف (لماذا يعتبر إعجازاً؟)..." value={commentText} onChange={(e) => setCommentText(e.target.value)} />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsCommentModalOpen(false)} className={`px-5 py-2 rounded-xl ${t.btn} font-bold`}>إلغاء</button>
              <button onClick={saveDiscovery} className="px-6 py-2 rounded-xl bg-gradient-to-l from-[#d4af37] to-[#b48f27] text-white font-bold shadow-lg flex items-center"><Save className="w-4 h-4 ml-2" /> حفظ التأملات</button>
            </div>
          </div>
        </div>
      )}

      {isMethodologyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 md:p-8 w-full max-w-4xl shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-fade-in-up max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
               <h3 className="text-xl md:text-2xl font-bold text-cyan-400 flex items-center"><Info className="ml-2 w-6 h-6" /> عن التطبيق ومنهجية الحساب</h3>
               <button onClick={() => setIsMethodologyModalOpen(false)} className="text-slate-500 hover:text-white bg-slate-950 rounded-full p-2"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-5 text-slate-300 text-sm md:text-base leading-relaxed">
              {/* 🌟 القسم الافتتاحي: الآيات القرآنية ومقولة المهندس */}
      <div className="flex flex-col gap-10 mt-2 mb-12 pb-10 border-b border-white/10">
        
        {/* 🌟 1. قسم الآيات القرآنية */}
        <div className="text-center px-2 md:px-6">
          <div className="inline-flex justify-center items-center w-12 h-12 rounded-full bg-[#d4af37]/10 mb-6 border border-[#d4af37]/20 shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            <Book className="w-6 h-6 text-[#d4af37]" />
          </div>
          
          {/* البسملة */}
          <h3 className="text-xl md:text-3xl text-[#d4af37] font-bold text-center mb-6 tracking-wide drop-shadow-md" style={{ fontFamily: "'Amiri Quran', serif" }}>
            بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
          </h3>

          <p className="text-lg md:text-2xl text-slate-100 leading-[2.2] md:leading-[2.5] font-bold text-center mb-8" style={{ fontFamily: "'Amiri Quran', serif" }}>
            " وَإِذَا سَمِعُوا۟ مَاۤ أُنزِلَ إِلَى ٱلرَّسُولِ تَرَىٰۤ أَعۡیُنَهُمۡ تَفِیضُ مِنَ ٱلدَّمۡعِ مِمَّا عَرَفُوا۟ مِنَ ٱلۡحَقِّۖ یَقُولُونَ رَبَّنَاۤ ءَامَنَّا فَٱكۡتُبۡنَا مَعَ ٱلشَّـٰهِدِینَ (٨٣) وَمَا لَنَا لَا نُؤۡمِنُ بِٱللَّهِ وَمَا جَاۤءَنَا مِنَ ٱلۡحَقِّ وَنَطۡمَعُ أَن یُدۡخِلَنَا رَبُّنَا مَعَ ٱلۡقَوۡمِ ٱلصَّـٰلِحِینَ (٨٤) فَأَثَـٰبَهُمُ ٱللَّهُ بِمَا قَالُوا۟ جَنَّـٰتࣲ تَجۡرِی مِن تَحۡتِهَا ٱلۡأَنۡهَـٰرُ خَـٰلِدِینَ فِیهَاۚ وَذَ ٰ⁠لِكَ جَزَاۤءُ ٱلۡمُحۡسِنِینَ (٨٥) "
          </p>
          <span className="inline-block px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 border border-[#d4af37]/40 rounded-xl text-[#d4af37] text-sm font-bold shadow-lg">
            [سُورَةُ المَائـِدَةِ: ٨٣-٨٥]
          </span>
        </div>

        {/* 🌟 2. بطاقة مقولة المهندس عدنان الرفاعي */}
        <div className="relative p-6 md:p-10 bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-3xl border border-[#d4af37]/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.25)] backdrop-blur-xl group overflow-hidden mx-auto max-w-5xl">
          
          {/* أيقونة اقتباس كبيرة وشفافة في الخلفية */}
          <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <Quote className="w-32 h-32 text-[#d4af37]" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* شريط علوي ذهبي صغير */}
            <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent rounded-full mb-8"></div>
            
            <p className="text-base md:text-xl text-slate-200 leading-relaxed font-medium mb-10 text-justify md:text-center" style={{ lineHeight: '2.2', fontFamily: "'Amiri Quran', serif" }}>
              "هذه النظرية هي نداء لجميع البشر بمختلف لغاتهم ومعتقداتهم ، للنظر إلى الحقيقة
              وللنظر إلى جزءٍ بسيط جداً من صفات المنهج الإلهي السليم البعيد عن أيدي
              التحريف .. وبعد أن ينظروا إلى ذلك ، فإنَّ هذه النظرية هي دعوة لهم لمقارنة مناهجهم مع هذا المنهج السليم وصفاته .. وبعد ذلك فإنَّ هذه النظرية هي نداء لهم لاتباع ما ستختاره عقوُلهم وفطرتهم التي فطرهم الله تعالى عليها ، لأنهم – حين ذلك – سيكونون قد عرفوا الحقيقة."
            </p>
            
            {/* التوقيع */}
            <div className="flex items-center gap-4 w-full max-w-sm mx-auto">
              <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent to-[#d4af37]/60"></div>
              <div className="flex flex-col items-center px-2">
                <span className="text-[#d4af37] font-bold text-lg tracking-wide whitespace-nowrap">المهندس عدنان الرفاعي</span>
                <span className="text-slate-400 text-sm mt-1 font-serif">بقلمه</span>
              </div>
              <div className="flex-grow h-[1px] bg-gradient-to-l from-transparent to-[#d4af37]/60"></div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-8 p-6 bg-slate-900/40 border border-white/10 rounded-2xl text-center shadow-lg backdrop-blur-md transition-all hover:border-cyan-500/30">
    <h4 className="text-sm text-slate-400 mb-2 font-sans">إعداد وتصميم</h4>
    
    <p 
        className="text-2xl font-bold bg-gradient-to-r from-[#d4af37] to-cyan-400 bg-clip-text text-transparent mb-4" 
        style={{ fontFamily: "'Amiri Quran', serif" }}
    >
        أحمد طلعت
    </p>
    
    <a 
        href="mailto:ahmadalazab2022@gmail.com" 
        className="inline-flex items-center justify-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 bg-cyan-900/20 px-4 py-2 rounded-xl transition-colors"
        dir="ltr"
    >
        <Mail className="w-4 h-4" />
        ahmadalazab2022@gmail.com
    </a>
</div>
      {/* 🌟 نهاية القسم الافتتاحي (هنا تبدأ نصوصك القديمة) */}
               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-[#d4af37]"></div>
                  <h4 className="text-[#d4af37] font-bold mb-2 text-lg flex items-center"><Search className="w-5 h-5 ml-2"/> فكرة التطبيق</h4>
                  <p>يهتم هذا التطبيق بعرض واستخراج نماذج <span className="text-white font-bold">الإعجاز العددي في القرآن الكريم</span>، سواء بتعداد الكلمات، أو الحروف، أو عبر استخراج القيم العددية للنصوص القرآنية لكشف التوازنات والروابط الرياضية المذهلة.</p>
               </div>
               
               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden mt-4">
                  <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500"></div>
                  <h4 className="text-indigo-400 font-bold mb-3 text-lg flex items-center"><Book className="w-5 h-5 ml-2"/> نسخة المصحف المعتمدة</h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                     يعتمد هذا التطبيق في إحصاءاته وحساباته حصرياً وبشكل صارم على النص القرآني الموافق لـ <span className="text-white font-bold bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">مصحف المدينة المنورة (طبعة مجمع الملك فهد)</span>، وذلك وفقاً لـ <span className="text-[#d4af37] font-bold">رواية حفص عن عاصم</span>.
أي اختلافات طفيفة في أعداد الحروف مقارنة بتطبيقات أخرى تعود إلى الالتزام الدقيق بقواعد الرسم العثماني لهذه النسخة المحددة.
</p>
               </div>

               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-cyan-500"></div>
                  <h4 className="text-cyan-400 font-bold mb-3 text-lg flex items-center"><Calculator className="w-5 h-5 ml-2"/> المعيار القرآني للقيم العددية</h4>
                  <p className="mb-4">خلافاً للطرق البشرية الوضعية، يعتمد هذا التطبيق على <span className="text-white font-bold">معايير قرآنية بحتة ومجردة</span>.
حيث تُعطى القيم العددية للحروف بناءً على <span className="text-emerald-400 font-bold">الترتيب التنازلي لمرات ورودها في القرآن الكريم</span>.</p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-center text-xs md:text-sm font-bold" dir="ltr">
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">1</span> ا/أ/إ/ٱ/ء/ى</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">2</span> ل</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">3</span> ن</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">4</span> م</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">5</span> و / ؤ</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center text-[11px] md:text-xs"><span className="text-cyan-400 mb-1 text-sm">6</span> ي / ئ / النبرة</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">7</span> هـ / ة</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">8</span> ر</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">9</span> ب</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">10</span> ك</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">11</span> ت</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">12</span> ع</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">13</span> ف</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">14</span> ق</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">15</span> س</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">16</span> د</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">17</span> ذ</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">18</span> ح</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">19</span> ج</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">20</span> خ</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">21</span> ش</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">22</span> ص</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">23</span> ض</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">24</span> ز</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">25</span> ث</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">26</span> ط</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">27</span> غ</span>
                    <span className="bg-slate-800/80 rounded-lg p-2 border border-slate-600 text-white shadow-sm flex flex-col justify-center"><span className="text-cyan-400 mb-1">28</span> ظ</span>
                  </div>
               </div>

               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-1 h-full bg-rose-500"></div>
                  <h4 className="text-rose-400 font-bold mb-3 text-lg flex items-center"><Info className="w-5 h-5 ml-2"/> قاعدة الهمزة وحالاتها الدقيقة</h4>
                  <p className="mb-4 text-sm leading-relaxed">لضمان التطابق التام مع الرسم العثماني للمصحف الشريف، يعتمد التطبيق القواعد الاستثنائية التالية في الحساب:</p>
                  <div className="space-y-4">
                     <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <h5 className="text-[#d4af37] font-bold text-sm mb-2">1. الهمزة المحمولة (ذات الكرسي):</h5>
                        <p className="text-slate-300 text-sm">تُحسب بناءً على الحرف الحامل لها وتُعتبر حرفاً أصيلاً يأخذ قيمة الكرسي (أ، إ، ؤ، ئ، والهمزة تحت النبرة).</p>
                     </div>
                     <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                        <h5 className="text-[#d4af37] font-bold text-sm mb-2">2. الهمزة المفردة (على السطر):</h5>
                        <p className="text-slate-300 text-sm mb-3">هناك أمثلة وحالات كثيرة لا تُعتبر فيها الهمزة المفردة (ء) حرفاً أصيلاً، بل مجرد علامة ضبط تُتجاهل برمجياً في الحساب، وتشمل:</p>
                        <ul className="list-none space-y-3 text-slate-300 text-sm">
                           <li className="flex items-start"><span className="text-rose-400 ml-2 mt-1">•</span><div><strong className="text-white">في وسط الكلمة (بدون نبرة):</strong><br/><span className="text-slate-400 text-xs">أمثلة: (السيءات، يجءرون، تجءروا، الءن، هنيءا، مريءا، متكءين، يتكءون، أفءدتهم، أفءدة، يستءخرون، خطيءة، خطءا، خطيءتهم، ليسءوا، فمالءون، المشءمة).</span></div></li>
                           <li className="flex items-start"><span className="text-rose-400 ml-2 mt-1">•</span><div><strong className="text-white">في بداية الكلمة (على السطر):</strong><br/><span className="text-slate-400 text-xs">أمثلة: (ءامن، ءامنوا، ءامنا، ءادم، قرءان، القرءان، ءاخر، ءاخرين، ءاخرنا).
وتتميز بأنها تسقط عند دخول حرف ملتصق بالكلمة لأنها ليست حرفاً أصيلاً.</span></div></li>
                           <li className="flex items-start"><span className="text-rose-400 ml-2 mt-1">•</span><div><strong className="text-white">في نهاية الكلمة:</strong><br/><span className="text-slate-400 text-xs">أمثلة: (شيء، بريء، الخبء، دفء).
والسبب أنه بدخول حرف على نهاية الكلمة (التنوين) يسقط الكرسي وتكتب بدون نبرة مثل: (شيءا، بريءا).</span></div></li>
                        </ul>
                     </div>
                  </div>
               </div>

               <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 relative overflow-hidden mt-4">
                  <div className="absolute top-0 right-0 w-1 h-full bg-[#d4af37]"></div>
                  <h4 className="text-white font-bold mb-3 text-lg">تنويه ورد الفضل لأهله</h4>
                  <p className="text-slate-400 text-sm leading-relaxed mb-5">
                     إن امتلاء القرآن الكريم بآلاف النماذج من هذه الروابط المذهلة، هو دلالة يقينية ورياضية قاطعة على <span className="text-cyan-400 font-bold">عدم تغيير أي حرف من القرآن</span> (لا بالزيادة ولا بالنقصان)، وإلا لاختلت وانهارت كل هذه المنظومة الرقمية العظيمة.
</p>
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-[#d4af37]/30 inline-block text-right w-full">
                     <p className="text-slate-300 text-sm leading-relaxed">
                        <span className="text-[#d4af37] font-bold">شكر وتقدير: </span> 
                        تعود أصول هذه النظرية ومنهجية الحساب المعجزة، واستنباط الأمثلة المذكورة في هذه المنظومة إلى الأبحاث والدراسات المعمقة التي قدمها <span className="text-white font-bold px-1 text-base">المهندس / عدنان الرفاعي</span>.
نسأل الله أن يجعل هذا العمل الجليل في ميزان حسناته وأن ينفع به.
</p>
                  </div>
               </div>
            </div>
            
            <div className="mt-6 flex justify-end">
               <button onClick={() => setIsMethodologyModalOpen(false)} className="px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all shadow-md">اكتشف الآن</button>
            </div>
          </div>
        </div>
        
      )}
      
      {/* -------------------- شريط القائمة الرئيسي (يظهر فقط في شاشة المصحف) -------------------- */}
      {activeTab === 'main' && (
        <div className={`sticky top-0 z-40 ${t.headerBg} backdrop-blur-xl border-b ${t.border} px-4 md:px-8 py-2 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300`}>
           <div className="text-center md:text-right flex items-center gap-4">
              <div>
                 <h1 className="text-2xl font-bold text-white">
   الرَّقِيم <span className="text-sm text-cyan-400 font-normal">منظومة الأعداد في القرآن الكريم</span>
</h1>
                 <p className={`${t.textMuted} text-[10px] md:text-xs flex items-center mt-1`}>
                   {selectedWords.size > 0 || selectedAyahs.size > 0 ? <><AlertCircle className="w-3 h-3 text-cyan-500 ml-1"/> البحث: يدوي</> : <><BookOpen className="w-3 h-3 text-[#d4af37] ml-1"/> البحث: كامل الصفحة</>}
                 </p>
              </div>
              <button onClick={() => setIsFullIndexOpen(true)} className={`${t.btn} ${t.btnHover} p-2.5 rounded-xl transition-all shadow-sm`} title="الفهرس الشامل">
  <LayoutGrid className="w-5 h-5 text-indigo-500" />
</button>
              <button onClick={() => setIsSurahModalOpen(true)} className={`${t.btn} ${t.btnHover} text-sm rounded-xl px-5 py-2.5 transition-colors font-bold shadow-sm flex items-center`}>
                <span className="font-bold text-lg pt-1" style={{ fontFamily: "'Amiri Quran', serif" }}>سورة {currentSurah.name}</span>
                <span className={`text-xs ${t.textMuted} mr-2 font-sans`}>({currentSurah.total_ayahs} آية)</span>
              </button>
           </div>
           
           <div className="flex items-center flex-wrap justify-center gap-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`${t.btn} ${t.btnHover} p-2.5 rounded-xl transition-all shadow-sm`} title="تغيير المظهر">
                 {isDarkMode ? <Sun className="w-5 h-5 text-[#d4af37]" /> : <Moon className="w-5 h-5 text-indigo-600" />}
             </button>
             <button onClick={() => setIsMethodologyModalOpen(true)} className={`${t.btn} ${t.btnHover} px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm`}>
                <Info className="w-4 h-4 text-cyan-500" /> <span className="hidden md:inline">عن التطبيق</span>
             </button>
             <button onClick={() => setIsGlobalSearchModalOpen(true)} className={`${t.btn} ${t.btnHover} px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm`}>
                <Search className="w-4 h-4 text-cyan-500" /> <span className="hidden md:inline">بحث</span>
             </button>
             <button onClick={() => setActiveTab('encyclopedia')} className={`${t.btn} ${t.btnHover} px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm`}>
                <Library className="w-4 h-4 text-[#d4af37]" /> <span className="hidden md:inline">الموسوعة</span>
              </button>
           </div>
        </div>
      )}
{/* 🌟 الشريط الفرعي لنتائج البحث (يظهر فقط إذا كان هناك بحث نشط وفي شاشة المصحف) */}
        {hasActiveSearch && activeTab === 'main' && (
            <div className={`w-full bg-cyan-900/95 backdrop-blur-md text-white px-4 md:px-8 py-2.5 flex justify-between items-center text-xs md:text-sm border-b border-cyan-700/50 sticky top-[72px] z-30 shadow-sm`}>
                <span className="font-bold flex items-center">
                    <Search className="w-4 h-4 ml-2 text-cyan-300"/> أنت تتصفح نتيجة بحث عن: <span className="text-cyan-300 mr-1">"{globalSearchQuery}"</span>
                </span>
                <div className="flex items-center gap-2 md:gap-3">
                    <button onClick={() => setIsGlobalSearchModalOpen(true)} className="font-bold bg-cyan-700 hover:bg-cyan-600 px-3 md:px-4 py-1.5 rounded-lg transition-colors shadow-sm flex items-center"><Layers className="w-4 h-4 ml-1"/> العودة للقائمة</button>
                    <button onClick={() => { setHasActiveSearch(false); setGlobalSearchQuery(''); setGlobalSearchResults([]); }} className="font-bold bg-red-500/20 text-red-200 hover:bg-red-500/40 hover:text-white px-2 md:px-3 py-1.5 rounded-lg transition-colors flex items-center" title="إغلاق البحث"><X className="w-4 h-4 md:ml-1"/> <span className="hidden md:inline">إغلاق</span></button>
                </div>
            </div>
        )}
      {/* -------------------- منطقة المحتوى القابلة للتمرير -------------------- */}
      <div id="main-scroll-container" className={`flex-grow overflow-y-auto custom-scrollbar relative ${activeTab === 'main' ? 'pb-40' : 'pb-10'}`} onTouchMove={handleTouchMove}>
        
        {/* الشاشة 1: المصحف الأساسي */}
        {activeTab === 'main' && (
          <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 relative z-10 animate-fade-in-up">
            
            {/* أزرار الصفحات العلوية */}
            {totalPages > 1 && (
               <div className={`flex justify-center items-center gap-4 ${t.panel} p-3 rounded-2xl border ${t.border} w-fit mx-auto shadow-sm`}>
                 <button onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); clearSelection(); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} disabled={currentPage === 1} className={`${t.input} p-2 rounded-lg ${t.text} ${t.btnHover} disabled:opacity-30 border ${t.borderFocus}`}><ChevronRight className="w-5 h-5"/></button>
                 <span className={`text-sm font-bold ${t.textMuted}`}>صفحة {currentPage} من {totalPages}</span>
                 <button onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); clearSelection(); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} disabled={currentPage === totalPages} className={`${t.input} p-2 rounded-lg ${t.text} ${t.btnHover} disabled:opacity-30 border ${t.borderFocus}`}><ChevronLeft className="w-5 h-5"/></button>
               </div>
            )}

            {/* لوحة الإحصاء اليدوي */}
            {statsData && discoveries.length === 0 && (
               <div id="results-panel" className={`${t.panel} border ${t.borderFocus} rounded-2xl p-5 shadow-lg animate-fade-in-up`}>
                  <div className={`flex justify-between items-center mb-4 border-b ${t.border} pb-3`}>
                   <h3 className={`font-bold ${t.text} flex items-center`}><BarChart3 className="w-5 h-5 ml-2 text-[#d4af37]"/> إحصاء النص</h3>
                   <button onClick={() => { setStatsData(null); scrollToLastSelection(); }} className={`${t.textMuted} hover:${t.text}`}><X className="w-5 h-5"/></button>
                 </div>
                 <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className={`${t.input} p-4 rounded-xl text-center border ${t.borderFocus}`}><p className={`${t.textMuted} text-xs mb-1`}>الكلمات</p><p className={`text-xl md:text-2xl font-bold ${t.text}`}>{statsData.words}</p></div>
                    <div className={`${t.input} p-4 rounded-xl text-center border ${statsData.is19Letters ? 'border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : t.borderFocus}`}><p className={`${t.textMuted} text-xs mb-1`}>الحروف</p><p className={`text-xl md:text-2xl font-bold ${statsData.is19Letters ? 'text-[#d4af37]' : t.text}`}>{statsData.letters}</p>{statsData.is19Letters && <span className="text-[10px] font-bold text-[#d4af37] block mt-1 bg-[#d4af37]/10 rounded-md py-0.5">19 × {statsData.letters/19}</span>}</div>
                    <div className={`${t.input} p-4 rounded-xl text-center border ${statsData.is19Value ? 'border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]' : t.borderFocus}`}><p className={`${t.textMuted} text-xs mb-1`}>القيمة</p><p className={`text-xl md:text-2xl font-bold ${statsData.is19Value ? 'text-[#d4af37]' : t.text}`}>{statsData.value}</p>{statsData.is19Value && <span className="text-[10px] font-bold text-[#d4af37] block mt-1 bg-[#d4af37]/10 rounded-md py-0.5">19 × {statsData.value/19}</span>}</div>
                 </div>
                 <div className="flex flex-col md:flex-row gap-3">
                   {(statsData.is19Letters || statsData.is19Value) && (
                     <button onClick={() => openCommentModal()} className="flex-1 bg-[#d4af37] hover:bg-[#b48f27] text-white font-bold py-3 rounded-xl flex justify-center items-center shadow-md"><BookmarkPlus className="w-5 h-5 ml-2" /> حفظ الإعجاز</button>
                   )}
                   <button onClick={openDeepSearchConfig} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex justify-center items-center transition-colors shadow-md">
                     <Search className="w-5 h-5 ml-2" /> بحث عن متطابقات (±3 صفحات)
                   </button>
                 </div>
               </div>
            )}

            {/* لوحة الاستكشاف والتمشيط الذكي */}
            {discoveries.length > 0 && (
               <div id="results-panel" className={`${t.panel} border ${t.borderFocus} rounded-2xl p-4 md:p-5 mb-8 shadow-lg animate-fade-in-up overflow-hidden`}>
                <div className={`flex flex-col md:flex-row justify-between items-center w-full mb-4 pb-4 border-b ${t.border} gap-4`}>
                  <span className={`font-bold text-sm px-4 py-2 rounded-xl flex items-center ${t.text} ${t.input} border ${t.borderFocus}`}>
                    {discoveryMode === 'deep_search' ? (
                       <><Layers className="w-4 h-4 ml-2 text-indigo-500" /> نتائج البحث العميق ({discoveries.length})</>
                    ) : (
                       <>
                         {discoveryMode === '19_letters' && <Scale className="w-4 h-4 ml-2 text-emerald-500" />}
                         {discoveryMode === '19_values' && <Hash className="w-4 h-4 ml-2 text-emerald-500" />}
                         {(discoveryMode === 'balance_letters' || discoveryMode === 'balance_values') && <Scale className="w-4 h-4 ml-2 text-cyan-500" />}
                         {discoveryMode === '19_letters' ? 'حروف مضاعفات 19' : discoveryMode === '19_values' ? 'قيم مضاعفات 19' : discoveryMode === 'balance_letters' ? 'توازن الحروف' : 'توازن القيم'}
                         ({discoveries.length})
                       </>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => openCommentModal()} className="rounded-xl flex items-center text-xs px-4 py-2 font-bold transition-all bg-[#d4af37] text-white hover:bg-[#b48f27]"><BookmarkPlus className="w-4 h-4 ml-1" /> حفظ وتأمل</button>
                    <button onClick={() => { setDiscoveries([]); scrollToLastSelection(); }} className={`${t.textMuted} hover:${t.text} ${t.input} rounded-xl p-2`}><X className="w-5 h-5" /></button>
                  </div>
                </div>
                
                <div className="flex items-start justify-center gap-2 md:gap-4 w-full">
                  <button onClick={() => setActiveDiscoveryIndex(prev => Math.min(prev + 1, discoveries.length - 1))} disabled={activeDiscoveryIndex === discoveries.length - 1} className={`p-2 md:p-3 ${t.input} ${t.textMuted} rounded-xl hover:${t.text} disabled:opacity-30 border ${t.borderFocus} mt-2`}><ChevronRight className="w-5 h-5" /></button>
                  <div className="flex-1 w-full">
                    <div className="text-center mb-3">
                       <span className={`inline-block ${t.input} ${t.textMuted} text-xs px-3 py-1 rounded-full font-bold tracking-wider mb-2 border ${t.border}`}>
                           نتيجة {activeDiscoveryIndex + 1} من {discoveries.length}
                       </span>
                       {discoveryMode === 'deep_search' && (
                         <div className={`${t.input} border ${t.border} rounded-lg p-2 inline-block mx-auto text-sm ${t.textMuted} mr-2`}>
                           نوع التطابق المكتشف: 
                           <strong className={`ml-2 px-2 py-0.5 rounded ${discoveries[activeDiscoveryIndex].matchType.includes('الحروف') && discoveries[activeDiscoveryIndex].matchType.includes('القيمة') ? 'bg-indigo-500/20 text-indigo-600' : discoveries[activeDiscoveryIndex].matchType === 'الحروف' ? 'bg-cyan-500/20 text-cyan-600' : 'bg-[#d4af37]/20 text-[#d4af37]'}`}>
                             {discoveries[activeDiscoveryIndex].matchType}
                           </strong>
                         </div>
                       )}
                    </div>
                    
                    <div className={discoveryMode === 'deep_search' ? "grid grid-cols-1 md:grid-cols-2 gap-4 w-full" : "flex flex-col gap-4 w-full"}>
                      {discoveries[activeDiscoveryIndex].segments.map((seg, idx) => {
                        const color = segmentColors[idx % segmentColors.length];
                        const matchType = discoveries[activeDiscoveryIndex].matchType || '';
                        
                        const highlightLetters = discoveryMode === 'deep_search' && (matchType === 'الحروف' || matchType === 'الحروف والقيمة معاً');
                        const highlightValue = discoveryMode === 'deep_search' && (matchType === 'القيمة' || matchType === 'الحروف والقيمة معاً');

                        return (
                          <div key={idx} className={`flex flex-col gap-4 p-4 md:p-5 rounded-2xl border ${discoveryMode === 'deep_search' ? (seg.isPrimary ? `border-indigo-500/50 ${isDarkMode ? 'bg-indigo-950/20' : 'bg-indigo-50/50'}` : `${t.borderFocus} ${t.input}`) : `${t.borderFocus} ${t.input}`} relative h-full`}>
                             <div className={`flex items-center gap-3 flex-wrap border-b ${t.border} pb-3`}>
                                {discoveryMode === 'deep_search' ? (
                                   <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${seg.isPrimary ? 'bg-indigo-600 text-white' : 'bg-slate-500 text-white'}`}>
                                     {seg.isPrimary ? 'النص الأساسي المكتشف' : 'النص المتطابق'}
                                   </span>
                                ) : (
                                   (discoveryMode === 'balance_letters' || discoveryMode === 'balance_values') && <span className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${color.badge}`}>النص {idx + 1}</span>
                                )}
                                
                                <span className={`text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg border transition-colors ${highlightLetters ? 'bg-cyan-500/20 text-cyan-600 border-cyan-500/50' : `${t.textMuted} ${t.panel} ${t.borderFocus}`}`}>
                                   {seg.letterCount} حرف
                                </span>
                                <span className={`text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg border transition-colors ${highlightValue ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/50' : `${t.textMuted} ${t.panel} ${t.borderFocus}`}`}>
                                   قيمة {seg.sum}
                                </span>
                                {discoveryMode === '19_letters' && <span className="text-xs md:text-sm font-bold text-emerald-600 bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30">19 × {seg.letterCount / 19}</span>}
                                {discoveryMode === '19_values' && <span className="text-xs md:text-sm font-bold text-emerald-600 bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30">19 × {seg.sum / 19}</span>}
                             </div>
                             <p className={`font-['Amiri_Quran'] text-2xl md:text-3xl leading-[4.5rem] md:leading-[5rem] ${t.quranText} pt-2 pb-2 px-2 overflow-visible`}>"{getDiscoveryTextSnippet(seg)}"</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <button onClick={() => setActiveDiscoveryIndex(prev => Math.max(prev - 1, 0))} disabled={activeDiscoveryIndex === 0} className={`p-2 md:p-3 ${t.input} ${t.textMuted} rounded-xl hover:${t.text} disabled:opacity-30 border ${t.borderFocus} mt-2`}><ChevronLeft className="w-5 h-5" /></button>
                </div>
              </div>
            )}

            {/* النص القرآني المصفح */}
            <div className={`text-justify leading-[4.5rem] md:leading-[5.5rem] ${isDarkMode ? t.panel : 'bg-[#fdf6e3] border-[#e8d89e]'} p-6 md:p-10 rounded-3xl shadow-md border select-none`} style={{ fontFamily: "'Amiri Quran', serif", fontSize: '2rem' }}>
              
              {currentPage === 1 && activeSurahId !== 1 && activeSurahId !== 9 && (
                <div className={`text-center mb-10 pb-8 border-b ${t.border}`}>
                  <span className="text-[#d4af37] opacity-90 pointer-events-none select-none" style={{ fontSize: '2.5rem' }}>
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </span>
                </div>
              )}

              {paginatedAyahs.map((ayah) => {
                const words = ayah.text.split(' ');
                // 🌟 نظام المطابقة المدرع للآيات الإعجازية
                const ayahMiracles = encyclopediaData.filter(ex => {
                   if (!ex.surahId || !ex.ayahNumbers) return false;
                   const sId = parseInt(ex.surahId);
                   const aNums = Array.isArray(ex.ayahNumbers) ? ex.ayahNumbers.map(Number) : [];
                   return sId === parseInt(activeSurahId) && aNums.includes(parseInt(ayah.number));
                });
                const hasMiracle = ayahMiracles.length > 0;

                return (
                  <span key={ayah.id} id={`ayah-${ayah.number}`} className={`inline transition-all duration-300 ${hasMiracle ? 'miracle-ayah-wrapper cursor-pointer' : ''}`}>
                    {words.map((word, index) => {
                      const fw = flatWords.find(f => f.ayahId === ayah.number && f.wordIndex === index);
                      if (!fw) return <span key={index}>{word} </span>;
                      
                      const isWordSelected = selectedWords.has(fw.wordId) || selectedAyahs.has(ayah.number);
                      let segmentIndex = -1; let isStartOfSegment = false; let isEndOfSegment = false; 
                      let wordColorClass = ""; 

                      if (discoveries.length > 0) {
                        const activeSegments = discoveries[activeDiscoveryIndex].segments;
                        segmentIndex = activeSegments.findIndex(seg => fw.flatIndex >= seg.startIndex && fw.flatIndex <= seg.endIndex);
                        if (segmentIndex !== -1) { 
                           isStartOfSegment = fw.flatIndex === activeSegments[segmentIndex].startIndex;
                           isEndOfSegment = fw.flatIndex === activeSegments[segmentIndex].endIndex; 
                        } 
                        else { wordColorClass = t.quranInactive; }
                      } else if (statsData) {
                         const seg = statsData.segments[0];
                         if (fw.flatIndex >= seg.startIndex && fw.flatIndex <= seg.endIndex) { segmentIndex = 0; isStartOfSegment = fw.flatIndex === seg.startIndex; isEndOfSegment = fw.flatIndex === seg.endIndex; } 
                         else { wordColorClass = t.quranInactive; }
                      } else if (selectedWords.size > 0 || selectedAyahs.size > 0) {
                         if (!isWordSelected) wordColorClass = t.quranInactive;
                      }

                      let styleClasses = `inline-block mx-[2px] px-1.5 transition-all duration-200 ${hasMiracle ? 'miracle-word relative' : ''} `;
                      let badgeElement = null;

                      if (segmentIndex !== -1) {
                         let color;
                         if (discoveryMode === 'deep_search') {
                            color = discoveries[activeDiscoveryIndex].segments[segmentIndex].isPrimary ? segmentColors[0] : segmentColors[1];
                         } else {
                            color = segmentColors[segmentIndex % segmentColors.length];
                         }
                         
                         styleClasses += `${color.bg} ${color.text} ${color.border} font-bold `;
                         if (isStartOfSegment && (discoveryMode === 'balance_letters' || discoveryMode === 'balance_values' || discoveryMode === 'deep_search')) {
                           styleClasses += `rounded-tr-lg rounded-br-none border-r-2 `;
                           badgeElement = <span className={`absolute flex items-center justify-center text-[10px] font-sans font-black w-5 h-5 rounded-full -top-4 -right-2 shadow-sm border-2 ${color.badge} ${color.badgeBorder}`}>{segmentIndex + 1}</span>;
                         } else if (isStartOfSegment) { styleClasses += `rounded-tr-lg rounded-br-none border-r-2 `; }
                         if (isEndOfSegment) { styleClasses += `rounded-tl-lg rounded-bl-none border-l-2 `; }
                      } else if (isWordSelected) { 
   styleClasses += isDarkMode 
     ? 'bg-[#d4af37]/20 text-[#d4af37] rounded-lg border-b-2 border-[#d4af37] ' 
     : 'bg-[#d1e7dd] text-[#0f5132] rounded-lg border-b-2 border-[#badbcc] ';
}
                      else if (selectionMode === 'word' && discoveries.length === 0 && !statsData) { styleClasses += 'cursor-pointer rounded-lg hover:text-[#d4af37]'; }
                      
                      return (
                        <span key={index} data-wordid={fw.wordId} onMouseDown={() => handleDragStart(fw.wordId)} onMouseEnter={() => handleDragEnter(fw.wordId)} onTouchStart={() => handleDragStart(fw.wordId)} onClick={() => handleWordClick(fw.wordId)} className={`${styleClasses} ${wordColorClass || t.quranText} ${wordColorClass === '' ? 'relative z-10 ' : ''}`}>
                          {badgeElement} {word}
                        </span>
                      );
                    })}
                    
                    {/* النجمة المتوهجة */}
                    {hasMiracle && discoveries.length === 0 && !statsData && (
                        <span 
                           onClick={() => setAyahMiraclesModalData(ayahMiracles)}
                           className="inline-flex items-center justify-center mx-1 cursor-pointer hover:scale-125 transition-transform"
                           title="انقر لاكتشاف الإعجاز"
                        >
                           <Star className="w-6 h-6 text-[#d4af37] fill-[#d4af37] animate-pulse drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]" />
                        </span>
                    )}

                    <span onClick={() => handleAyahClick(ayah.number)} className={`inline-block mx-3 text-[#d4af37] text-2xl cursor-pointer hover:scale-110 transition-transform ${(discoveries.length > 0 || statsData) ? 'opacity-30' : 'opacity-90'}`}>
                      ﴿{ayah.number}﴾
                    </span>
                  </span>
                );
              })}
            </div>

            {/* أزرار الصفحات السفلية */}
            {totalPages > 1 && (
               <div className={`flex justify-center items-center gap-4 ${t.panel} p-3 rounded-2xl border ${t.border} w-fit mx-auto mt-6 shadow-sm`}>
                 <button onClick={() => { setCurrentPage(prev => Math.max(prev - 1, 1)); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} disabled={currentPage === 1} className={`${t.input} p-2 rounded-lg ${t.text} ${t.btnHover} disabled:opacity-30 border ${t.borderFocus}`}><ChevronRight className="w-5 h-5"/></button>
                 <span className={`text-sm font-bold ${t.textMuted}`}>صفحة {currentPage} من {totalPages}</span>
                 <button onClick={() => { setCurrentPage(prev => Math.min(prev + 1, totalPages)); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} disabled={currentPage === totalPages} className={`${t.input} p-2 rounded-lg ${t.text} ${t.btnHover} disabled:opacity-30 border ${t.borderFocus}`}><ChevronLeft className="w-5 h-5"/></button>
               </div>
            )}
          </div>
        )}

        {/* -------------------- الشاشة 2: موسوعة الإعجاز -------------------- */}
        {activeTab === 'encyclopedia' && (
          <div className="flex flex-col min-h-full animate-fade-in-up">
             {/* شريط علوي خاص بالموسوعة - يحل محل الرئيسي */}
             {!activeEncycCategory ? (
                 <div className={`sticky top-0 z-40 ${t.headerBg} backdrop-blur-xl border-b ${t.border} px-4 md:px-8 py-4 shadow-sm flex justify-between items-center transition-all duration-300`}>
                   <div>
                     <h2 className={`text-2xl md:text-3xl font-black ${t.text} tracking-wide`}>
                       <span className="text-[#d4af37]">موسوعة</span> الإعجاز
                     </h2>
                     <p className={`${t.textMuted} text-xs md:text-sm mt-1`}>نماذج وأمثلة مختارة من كنوز المنظومة  الرقمية ....."للإطلاع على كل الأمثلة يرجى العودة لكتب المهندس عدنان الرفاعي".</p>
                   </div>
                   <button onClick={() => setActiveTab('main')} className={`flex items-center ${t.btn} ${t.btnHover} font-bold px-4 md:px-5 py-2.5 rounded-xl transition-all shadow-sm`}>
                     <ArrowLeft className="mr-2 w-4 h-4 rotate-180" /> <span className="hidden md:inline">العودة للمصحف</span>
                   </button>
                 </div>
             ) : (
                 <div className={`sticky top-0 z-40 ${t.headerBg} backdrop-blur-xl border-b ${t.border} px-4 md:px-8 py-4 shadow-sm flex justify-between items-center transition-all duration-300`}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${activeEncycCategory.bg}`}>
                        <activeEncycCategory.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeEncycCategory.color}`} />
                      </div>
                      <div>
                        <h2 className={`text-xl md:text-2xl font-bold ${t.text} line-clamp-1`}>{activeEncycCategory.title}</h2>
                      </div>
                    </div>
                    <button onClick={() => setActiveEncycCategory(null)} className={`flex items-center ${t.btn} ${t.btnHover} font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition-all shadow-sm text-sm md:text-base`}>
                      <ArrowLeft className="mr-1 md:mr-2 w-4 h-4 rotate-180" /> <span className="hidden md:inline">العودة للأقسام</span>
                    </button>
                 </div>
             )}
             
             {/* محتوى الموسوعة */}
             <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex-grow relative z-10">
                 {!activeEncycCategory ? (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mt-4">
                     {encyclopediaCategories.map(cat => {
                       const count = encyclopediaData.filter(ex => {
                          if (!ex.categoryId) return false;
                          const catStr = String(ex.categoryId).toLowerCase();
                          return catStr === cat.id.toLowerCase() || catStr === cat.title.toLowerCase() || cat.title.toLowerCase().includes(catStr) || catStr.includes(cat.title.toLowerCase());
                       }).length;

                       return (
                         <div key={cat.id} onClick={() => setActiveEncycCategory(cat)} className={`${t.panel} border ${t.border} hover:${t.borderFocus} rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 shadow-sm hover:shadow-md group relative overflow-hidden`}>
                            <div className={`absolute top-0 left-0 w-full h-1 ${cat.bg.replace('/10', '')} opacity-50`}></div>
                            <div className="flex justify-between items-start mb-4">
                               <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.bg}`}>
                                  <cat.icon className={`w-6 h-6 ${cat.color}`} />
                               </div>
                               {count > 0 && (
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${cat.color} ${t.borderFocus} ${t.input}`}>
                                    {count} أمثلة
                                  </span>
                               )}
                            </div>
                            <h3 className={`text-xl font-bold ${t.text} mb-2 group-hover:text-[#d4af37] transition-colors`}>{cat.title}</h3>
                            <p className={`${t.textMuted} text-sm leading-relaxed`}>{cat.desc}</p>
                         </div>
                       );
                     })}
                   </div>
                 ) : (
                   <div className={`${t.panel} border ${t.border} rounded-3xl p-6 md:p-10 shadow-md mt-4`}>
                     {(() => {
                        const categoryExamples = encyclopediaData.filter(ex => {
                            if (!ex.categoryId) return false;
                            const catStr = String(ex.categoryId).toLowerCase();
                            return catStr === activeEncycCategory.id.toLowerCase() || catStr === activeEncycCategory.title.toLowerCase() || activeEncycCategory.title.toLowerCase().includes(catStr) || catStr.includes(activeEncycCategory.title.toLowerCase());
                        });
                        
                        if (categoryExamples.length === 0) {
                          return (
                            <div className={`py-20 border-2 border-dashed ${t.borderFocus} rounded-2xl text-center ${t.input}`}>
                               <Library className={`w-12 h-12 ${t.textMuted} mx-auto mb-4 opacity-50`} />
                               <h3 className={`text-xl font-bold ${t.text} mb-2`}>لا توجد أمثلة بعد</h3>
                               <p className={`${t.textMuted} max-w-md mx-auto text-sm`}>ستظهر الأمثلة هنا بمجرد إضافتك لها في قاعدة البيانات.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {categoryExamples.map((example, idx) => (
                              <div key={idx} className={`${t.input} border ${t.border} rounded-2xl p-6 shadow-sm hover:${t.borderFocus} transition-all relative overflow-hidden group flex flex-col h-full`}>
                                <div className={`absolute top-0 right-0 w-1 h-full ${activeEncycCategory.bg.replace('/10', '')} opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                                
                                <div className="flex justify-between items-start mb-4">
                                   <h3 className={`text-lg md:text-xl font-bold ${t.text} flex items-start leading-snug`}>
                                     <Sparkles className={`w-5 h-5 ml-2 mt-1 shrink-0 ${activeEncycCategory.color}`} />
                                     {example.title}
                                   </h3>
                                   {example.surahId && example.ayahNumbers && example.ayahNumbers.length > 0 && (
                                      <span className={`text-[10px] ${t.panel} border ${t.borderFocus} ${t.textMuted} px-2 py-1 rounded whitespace-nowrap`}>آية {example.ayahNumbers.join(', ')}</span>
                                   )}
                                </div>
                                 
                                <div className={`${t.panel} border ${t.borderFocus} p-5 rounded-xl mb-4 text-center`}>
                                  <p className="font-['Amiri_Quran'] text-2xl md:text-3xl leading-[4.5rem] text-[#d4af37]">
                                     "{example.quranText}"
                                  </p>
                                </div>
                                 
                                <div className="flex flex-wrap gap-2 mb-4">
                                  <span className={`${t.panel} ${t.textMuted} text-sm font-bold px-4 py-2 rounded-lg border ${t.borderFocus}`}>
                                     {example.metricType}: <span className={activeEncycCategory.color}>{example.metricValue}</span>
                                  </span>
                                </div>
                                 
                                <p className={`${t.text} text-sm leading-relaxed mb-6 flex-grow opacity-90`}>
                                  {example.explanation}
                                </p>
                                 
                                <div className={`border-t ${t.border} pt-4 mt-auto`}>
                                  <p className={`${t.textMuted} text-xs flex items-center`}>
                                    <BookOpen className="w-4 h-4 ml-1 shrink-0" />
                                    <span className="truncate" title={example.reference}>المصدر: {example.reference}</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                     })()}
                   </div>
                 )}
             </div>
          </div>
        )}

        {/* -------------------- الشاشة 3: مكتبتي -------------------- */}
        {activeTab === 'library' && (
          <div className="flex flex-col min-h-full animate-fade-in-up">
             {/* شريط علوي خاص بالمكتبة */}
             <div className={`sticky top-0 z-40 ${t.headerBg} backdrop-blur-xl border-b ${t.border} px-4 md:px-8 py-4 shadow-sm flex justify-between items-center transition-all duration-300`}>
               <div>
                 <h2 className={`text-2xl md:text-3xl font-black ${t.text} tracking-wide`}>مكتبة <span className="text-[#d4af37]">التأملات</span></h2>
                 <p className={`${t.textMuted} text-xs md:text-sm mt-1`}>أرشيف التوازنات والاستكشافات المحفوظة.</p>
               </div>
               <button onClick={() => setActiveTab('main')} className={`flex items-center ${t.btn} ${t.btnHover} font-bold px-4 md:px-5 py-2.5 rounded-xl transition-all shadow-sm`}>
                 <ArrowLeft className="mr-2 w-4 h-4 rotate-180" /> <span className="hidden md:inline">العودة للمصحف</span>
               </button>
             </div>
             
             {/* محتوى المكتبة */}
             <div className="p-4 md:p-8 max-w-4xl mx-auto w-full flex-grow relative z-10">
               {savedDiscoveries.length === 0 ? (
                  <div className={`text-center py-20 ${t.input} rounded-3xl border border-dashed ${t.borderFocus} mt-4`}>
                    <BookmarkPlus className={`w-12 h-12 ${t.textMuted} mx-auto mb-4`} />
                    <h3 className={`text-lg font-bold ${t.text} mb-2`}>المكتبة فارغة</h3>
                    <p className={`${t.textMuted} text-sm`}>استخدم أدوات البحث الذكي في المصحف لحفظ اكتشافاتك هنا.</p>
                  </div>
               ) : (
                   <div className="space-y-6 mt-4">
                    {savedDiscoveries.map(saved => (
                      <div key={saved.id} className={`${t.panel} border ${t.border} p-5 rounded-2xl mb-4 shadow-sm`}>
                          <div className="flex justify-between items-center mb-4"><span className={`text-xs font-bold ${t.textMuted} ${t.input} px-3 py-1 rounded-lg border ${t.borderFocus}`}>تاريخ الحفظ: {new Date(saved.id).toLocaleDateString()}</span><button onClick={() => { if(window.confirm('حذف هذا السجل؟')) setSavedDiscoveries(prev => prev.filter(d => d.id !== saved.id)); }} className={`${t.textMuted} hover:text-red-500 ${t.input} p-2 rounded-xl`}><Trash2 className="w-4 h-4"/></button></div>
                          <div className={`${t.input} p-4 rounded-xl border ${t.borderFocus} mb-4 text-center`}>
                            {saved.segments.map((s, i) => ( <p key={i} className={`text-[#d4af37] font-['Amiri_Quran'] text-2xl leading-loose ${i>0 ? `mt-4 pt-4 border-t ${t.borderFocus}` : ''}`}>"{getDiscoveryTextSnippet(s)}"</p> ))}
                          </div>
                          {saved.comment && <p className={`${t.text} text-sm leading-relaxed border-r-2 border-[#d4af37] pr-3 ${t.input} p-3 rounded-lg opacity-90`}>{saved.comment}</p>}
                      </div>
                    ))}
                  </div>
               )}
             </div>
          </div>
        )}
      </div>

     {/* لوحة التحكم السفلية */}
      {activeTab === 'main' && (
        <div className={`fixed bottom-0 left-0 right-0 ${t.bottomBg} backdrop-blur-2xl border-t ${t.border} p-2 md:p-3 shadow-[0_-15px_40px_rgba(0,0,0,0.1)] z-50 rounded-t-3xl transition-colors duration-300`}>
          
          {showToolsMenu && (
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-[95%] md:w-[400px] ${t.panel} border-2 ${t.borderFocus} rounded-3xl p-3 shadow-2xl animate-fade-in-up z-50`}>
              <div className={`flex justify-between items-center mb-2 px-3 py-2 border-b ${t.border}`}>
                <span className={`font-bold ${t.text} text-base flex items-center`}><Layers className="w-5 h-5 ml-2 text-[#d4af37]"/> التمشيط والاستكشاف</span>
                <button onClick={() => setShowToolsMenu(false)} className={`${t.textMuted} hover:${t.text} ${t.input} rounded-full p-2`}><X className="w-4 h-4"/></button>
              </div>

              <div className="space-y-2 mt-3">
                  <button onClick={() => runDiscovery('19_letters')} className={`w-full flex items-center text-right p-3 ${t.input} ${t.btnHover} rounded-2xl transition-all border ${t.border}`}>
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl ml-4 border border-emerald-500/20"><Scale className="w-5 h-5 text-emerald-500"/></div>
                    <div><p className={`font-bold ${t.text}`}>مضاعفات 19 (في الحروف)</p><p className={`text-[11px] ${t.textMuted} mt-1`}>نصوص عدد حروفها يقبل القسمة على 19</p></div>
                  </button>
                  <button onClick={() => runDiscovery('19_values')} className={`w-full flex items-center text-right p-3 ${t.input} ${t.btnHover} rounded-2xl transition-all border ${t.border}`}>
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl ml-4 border border-emerald-500/20"><Hash className="w-5 h-5 text-emerald-500"/></div>
                    <div><p className={`font-bold ${t.text}`}>مضاعفات 19 (في القيم العددية)</p><p className={`text-[11px] ${t.textMuted} mt-1`}>نصوص قيمتها تقبل القسمة على 19</p></div>
                  </button>
                  <button onClick={() => runDiscovery('balance_letters')} className={`w-full flex items-center text-right p-3 ${t.input} ${t.btnHover} rounded-2xl transition-all border ${t.border}`}>
                   <div className="bg-cyan-500/10 p-2.5 rounded-xl ml-4 border border-cyan-500/20"><Scale className="w-5 h-5 text-cyan-500"/></div>
                    <div><p className={`font-bold ${t.text}`}>توازنات الحروف (نصين فأكثر)</p><p className={`text-[11px] ${t.textMuted} mt-1`}>تطابق نصوص منفصلة في عدد الحروف</p></div>
                  </button>
                  <button onClick={() => runDiscovery('balance_values')} className={`w-full flex items-center text-right p-3 ${t.input} ${t.btnHover} rounded-2xl transition-all border ${t.border}`}>
                    <div className="bg-purple-500/10 p-2.5 rounded-xl ml-4 border border-purple-500/20"><Hash className="w-5 h-5 text-purple-500"/></div>
                    <div><p className={`font-bold ${t.text}`}>توازنات القيم العددية (نصين فأكثر)</p><p className={`text-[11px] ${t.textMuted} mt-1`}>تطابق نصوص منفصلة في حساب الجُمَّل</p></div>
                  </button>
              </div>
            </div>
          )}
<div className="flex justify-center items-center gap-3 mb-2">
            <button onClick={() => { setSelectionMode('word'); clearSelection(); setShowToolsMenu(false); }} className={`flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectionMode === 'word' ? (isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-white') : `${t.input} ${t.border} ${t.textMuted} hover:${t.borderFocus}`}`}><Type className="w-3 h-3 ml-2" /> تحديد: حر / سحب</button>
            <button onClick={() => { setSelectionMode('ayah'); clearSelection(); setShowToolsMenu(false); }} className={`flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectionMode === 'ayah' ? (isDarkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-white') : `${t.input} ${t.border} ${t.textMuted} hover:${t.borderFocus}`}`}><Book className="w-3 h-3 ml-2" /> تحديد آيات كاملة</button>
          </div>
          
          {/* 🌟 أزرار الإجراءات المباشرة (النسخ والتصدير) - تظهر فقط عند التحديد */}
          {(selectedWords.size > 0 || selectedAyahs.size > 0) && (
            <div className="flex justify-between items-center max-w-3xl mx-auto w-full px-2 mb-3">
              
              {/* زر النسخ القديم (يمين) */}
              <button onClick={handleCopySelectedText} className="flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-emerald-600 hover:bg-emerald-500 text-white shadow-md border border-emerald-500">
                <Copy className="w-3 h-3 ml-1" /> نسخ التحديد
              </button>

              {/* 🌟 زر تصدير النتيجة الجديد (يسار) */}
              <button onClick={() => setIsExportModalOpen(true)} className="flex items-center px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-[#d4af37]/20 text-[#d4af37] hover:bg-[#d4af37]/40 shadow-sm border border-[#d4af37]/30">
                <Share2 className="w-3 h-3 ml-1" /> تصدير النتيجة
              </button>

            </div>
          )}

          <div className="flex justify-center gap-3 max-w-3xl mx-auto w-full">
            <button onClick={handleCalculateStats} className="flex-1 flex flex-col items-center justify-center bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 py-2 rounded-2xl font-bold transition-all border border-indigo-500/30 shadow-sm">
              <BarChart3 className="w-5 h-5 mb-1" /> <span className="text-xs tracking-wide">1. إحصاء النص</span>
            </button>
            
            <button onClick={() => { if(discoveries.length > 0) clearSelection(); else setShowToolsMenu(!showToolsMenu); }} disabled={isDiscovering} className={`flex-[1.5] flex flex-col items-center justify-center py-2 rounded-2xl font-bold transition-all shadow-md border ${discoveries.length > 0 ? `${t.panel} border-red-500/30 text-red-500` : 'bg-[#d4af37] border-transparent text-white hover:bg-[#b48f27]'}`}>
              {discoveries.length > 0 ? <X className="w-5 h-5 mb-1" /> : <ListFilter className={`w-5 h-5 mb-1 ${isDiscovering ? 'animate-pulse' : ''}`} />}
              <span className="text-xs tracking-wide">{isDiscovering ? 'جاري التمشيط...' : (discoveries.length > 0 ? 'إلغاء البحث' : '2. تمشيط واستكشاف')}</span>
            </button>

            <button onClick={() => {setActiveTab('library'); setShowToolsMenu(false);}} className={`flex-1 flex flex-col items-center justify-center ${t.panel} ${t.btnHover} ${t.textMuted} hover:${t.text} py-2 rounded-2xl font-bold transition-colors relative border ${t.border} shadow-sm`}>
              <BookmarkPlus className="w-5 h-5 mb-1 text-[#d4af37]" /> <span className="text-xs tracking-wide">مكتبتي</span>
              {savedDiscoveries.length > 0 && <span className="absolute top-1 left-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{savedDiscoveries.length}</span>}
            </button>
          </div>
        </div>
      )}

      {/* الستايلات والأنيميشن للثيمات ونبض الإعجاز */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${isDarkMode ? '#334155' : '#cbd5e1'}; border-radius: 10px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        /* 🌟 أنيميشن النبض المزدوج للآيات الإعجازية */
        @keyframes doubleGlowPulse {
            0% { filter: drop-shadow(0 0 0px transparent); color: inherit; }
            20% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.9)); color: #d4af37; }
            40% { filter: drop-shadow(0 0 2px rgba(212,175,55,0.3)); color: #b48f27; }
            60% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.9)); color: #d4af37; }
            100% { filter: drop-shadow(0 0 4px rgba(212,175,55,0.6)); color: #d4af37; }
        }
        
        /* تفعيل النبض فقط أثناء القراءة العادية وليس أثناء البحث */
        .reading-mode .miracle-ayah-wrapper:hover .miracle-word {
            animation: doubleGlowPulse 1.2s ease-in-out forwards;
        }
      `}} />
      {/* 🌟 نافذة تصدير الإحصائيات (تُحسب الأرقام تلقائياً مع تفصيل مضاعفات 19) */}
          {isExportModalOpen && (
              (() => {
                  const scope = getSearchScope();
                  if (scope.length === 0) return null;
                  
                  const actualText = scope.map(fw => fw.text).join(' ');
                  let currentWords = scope.length;
                  let currentLetters = 0;
                  let currentValue = 0;
                  scope.forEach(fw => { currentLetters += fw.letterCount; currentValue += fw.value; });

                  // 🌟 التحقق من مضاعفات العدد 19
                  const isWords19 = currentWords > 0 && currentWords % 19 === 0;
                  const isLetters19 = currentLetters > 0 && currentLetters % 19 === 0;
                  const isValue19 = currentValue > 0 && currentValue % 19 === 0;

                  // 🌟 تجهيز نصوص التصدير لتشمل تفصيل المضاعفات إن وجدت
                  const wordsExportText = isWords19 ? `${currentWords} كلمة (19 × ${currentWords / 19})` : `${currentWords} كلمة`;
                  const lettersExportText = isLetters19 ? `${currentLetters} حرف (19 × ${currentLetters / 19})` : `${currentLetters} حرف`;
                  const valueExportText = isValue19 ? `${currentValue} (19 × ${currentValue / 19})` : `${currentValue}`;

                  return (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                          <div className="bg-slate-900 border border-[#d4af37]/50 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
                              <div className="flex justify-between items-center mb-5">
                                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                      <Share2 className="w-5 h-5 text-[#d4af37]"/> تصدير الإحصائية
                                  </h3>
                                  <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-colors">
                                      <X className="w-5 h-5"/>
                                  </button>
                              </div>

                              <div className="bg-slate-800/80 p-5 rounded-2xl border border-white/10 mb-5 text-right select-all">
                                  <p className="mb-4 text-[#d4af37] text-lg leading-relaxed" style={{ fontFamily: "'Amiri Quran', serif" }}>
                                      "{actualText}"
                                  </p>
                                  
                                  <div className="space-y-2 text-sm bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                      <div className="flex justify-between items-center">
                                          <span className="text-cyan-400">عدد الكلمات:</span>
                                          <span className="text-white font-bold flex items-center gap-2">
                                              {isWords19 && <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20" dir="ltr">19 × {currentWords / 19}</span>}
                                              {currentWords} كلمة
                                          </span> 
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="text-cyan-400">عدد الحروف:</span>
                                          <span className="text-white font-bold flex items-center gap-2">
                                              {isLetters19 && <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20" dir="ltr">19 × {currentLetters / 19}</span>}
                                              {currentLetters} حرف
                                          </span> 
                                      </div>
                                      <div className="flex justify-between items-center border-t border-white/10 pt-2 mt-2">
                                          <span className="text-[#d4af37] font-bold">القيمة العددية:</span>
                                          <span className="text-[#d4af37] font-bold flex items-center gap-2">
                                              {isValue19 && <span className="text-emerald-400 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20" dir="ltr">19 × {currentValue / 19}</span>}
                                              {currentValue}
                                          </span> 
                                      </div>
                                  </div>
                                  
                                  <p className="text-xs text-slate-500 text-center mt-4">تم الإحصاء بواسطة تطبيق الرَّقِيم</p>
                              </div>

                              <div className="flex gap-3">
                                  <button 
                                      onClick={() => {
                                          const exportText = `النص: ${actualText}\nعدد الكلمات: ${wordsExportText}\nعدد الحروف: ${lettersExportText}\nالقيمة العددية: ${valueExportText}\n\nتم الإحصاء بواسطة تطبيق الرَّقِيم`;
                                          navigator.clipboard.writeText(exportText);
                                          setIsExportModalOpen(false);
                                      }}
                                      className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
                                  >
                                      <Copy className="w-5 h-5" /> نسخ التقرير
                                  </button>
                                  
                                  <button 
                                      onClick={() => {
                                          const exportText = `النص: ${actualText}\r\nعدد الكلمات: ${wordsExportText}\r\nعدد الحروف: ${lettersExportText}\r\nالقيمة العددية: ${valueExportText}\r\n\r\nتم الإحصاء بواسطة تطبيق الرَّقِيم`;
                                          const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
                                          const url = URL.createObjectURL(blob);
                                          const link = document.createElement('a');
                                          link.href = url;
                                          link.download = 'إحصائية_الرقيم.txt';
                                          link.click();
                                          URL.revokeObjectURL(url);
                                      }}
                                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors"
                                  >
                                      <Download className="w-5 h-5" /> حفظ كملف
                                  </button>
                              </div>
                          </div>
                      </div>
                  );
              })()
          )}
    </div>
  );
}