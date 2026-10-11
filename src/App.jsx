import React, { useState, useMemo, useEffect } from 'react';
import { Book, Quote, Type, Hand, Calculator, Plus, LayoutGrid, Mail, Sparkles, BookOpen, ArrowLeft, ChevronRight, ChevronLeft, X, BookmarkPlus, Save, Trash2, Eye, MessageSquare, Edit3, Scale, Hash, Layers, Search, BarChart3, AlertCircle, ListFilter, Library, Network, Users, Sun, Moon, Info, CheckCircle2, Star, Globe, Crown, Heart, Cloud, User, Clock, ScrollText , Share2, Download , GitMerge, AlertTriangle, Copy } from 'lucide-react';

// استدعاء قواعد البيانات من الملفات المنفصلة
import quranDatabase from './data/quran.json';
import encyclopediaDataRaw from './data/encyclopedia.json';
import { Analytics } from "@vercel/analytics/react";
import html2canvas from 'html2canvas';
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
const badEndings = ['في','فى', 'من', 'على', 'الى', 'إلى', 'عن', 'ثم', 'أو', 'ان', 'إن', 'أن', 'لا', 'ما', 'لم', 'لن', 'هل', 'بل', 'قد', 'لقد', 'حتى', 'الا', 'إلا', 'لكن', 'إنما', 'كأن'];
// استبعاد المضافات التي تحتاج إلى مضاف إليه (مثل: رب العالمين)
const incompleteEndings = ['رب', 'عبد', 'ابن', 'أبي', 'أبا', 'بني', 'ذو', 'ذي', 'ذا', 'أولي', 'أولو', 'غير', 'بعض', 'كل', 'ايها', 'أيها', 'أيتها', 'بين', 'عند', 'مع', 'دون', 'سوى', 'لدى', 'فوق', 'تحت', 'خلف', 'امام', 'أمام', 'وراء', 'الذي', 'التي', 'هذا', 'هذه'];
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

// دالة فحص العدد الأولي
const isPrime = (num) => {
  if (num <= 1) return false;
  if (num <= 3) return true;
  if (num % 2 === 0 || num % 3 === 0) return false;
  for (let i = 5; i * i <= num; i += 6) {
    if (num % i === 0 || num % (i + 2) === 0) return false;
  }
  return true;
};

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
// مخزن تجميع النتائج المتعددة للتقرير
  const [stashedResults, setStashedResults] = useState([]);
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
  

  const toggleFavoriteSurah = (surahId, e) => {
    e.stopPropagation(); // لمنع فتح السورة عند النقر على النجمة فقط
    setFavoriteSurahs(prev => 
      prev.includes(surahId) ? prev.filter(id => id !== surahId) : [...prev, surahId]
    );
  };

  const t = useMemo(() => ({
    bg: isDarkMode ? "bg-[#020617]" : "bg-[#e8ecef]",
    panel: isDarkMode ? "bg-slate-900" : "bg-[#e8ecef]",
    input: isDarkMode ? "bg-slate-950" : "bg-[#e8ecef]",
    border: isDarkMode ? "border-slate-800" : "border-slate-300/50",
    borderFocus: isDarkMode ? "border-slate-700" : "border-[#d4af37]/50",
    text: isDarkMode ? "text-slate-50" : "text-slate-800",
    textMuted: isDarkMode ? "text-slate-400" : "text-slate-500",
    btn: isDarkMode ? "bg-slate-800 text-white border-slate-700" : "bg-white text-slate-900 border-slate-200 shadow-sm",
    btnHover: isDarkMode ? "hover:bg-slate-700" : "hover:bg-slate-50",
    quranText: isDarkMode ? "text-slate-400" : "text-[#0f5132]",
    quranInactive: isDarkMode ? "text-slate-700" : "text-slate-400",
    headerBg: isDarkMode ? "bg-[#020617]/90" : "bg-[#e8ecef]/90",
    bottomBg: isDarkMode ? "bg-[#020617]/95" : "bg-[#e8ecef]/95",
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
  // أضف هذا السطر مع بقية متغيرات الـ useState في الأعلى
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false); // 🌟 أضف هذا السطر
  // بدلاً من: const [selectionMode, setSelectionMode] = useState('word');
  const [selectionMode, setSelectionMode] = useState('none'); // 'none' يعني وضع التصفح
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [selectedAyahs, setSelectedAyahs] = useState(new Set());
  const [baseSelectionIndices, setBaseSelectionIndices] = useState([]);
  const [exportBtnText, setExportBtnText] = useState("تصدير اللوحة كصورة");
  const [exportStatus, setExportStatus] = useState('idle'); // الحالات: 'idle' | 'loading' | 'success' | 'error'
  
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
  // متغيرات تتبع شريط أدوات التحديد
  const toolsScrollRef = React.useRef(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(true);
  const [showRightArrow, setShowRightArrow] = React.useState(false);

  const handleToolsScroll = () => {
    if (toolsScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = toolsScrollRef.current;
      // إذا كان الشاشة واسعة بما يكفي لتعرض كل الأزرار، أخفِ الأسهم
      if (scrollWidth <= clientWidth) {
        setShowLeftArrow(false);
        setShowRightArrow(false);
        return;
      }
      
      // حساب التمرير للغة العربية (RTL)
      const absScroll = Math.abs(Math.round(scrollLeft));
      const maxScroll = scrollWidth - clientWidth;
      
      setShowRightArrow(absScroll > 2); // يظهر السهم الأيمن إذا سحبنا قليلاً لليسار
      setShowLeftArrow(absScroll < maxScroll - 2); // يظهر الأيسر ما دمنا لم نصل لنهاية الشريط
    }
  };

  // تفعيل الفحص عند تحميل التطبيق أو تغيير الأزرار
  React.useEffect(() => {
    const timer = setTimeout(handleToolsScroll, 150);
    window.addEventListener('resize', handleToolsScroll);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleToolsScroll);
    };
  }, [selectedWords, selectedAyahs]);

const handleAddToStash = () => {
    const scope = getSearchScope();
    
    if (scope.length === 0) {
        alert("الرجاء تحديد نص أولاً قبل الإضافة للتقرير.");
        return;
    }

    let formattedText = "";
    let totalValue = 0; 
    let totalLetters = 0; 
    
    const ayahNumbers = new Set();

    for (let i = 0; i < scope.length; i++) {
        const currentItem = scope[i];
        const nextItem = scope[i + 1];
        
        formattedText += currentItem.text;
        totalValue += currentItem.value;
        totalLetters += currentItem.letterCount; 

        const currentAyaNum = currentItem.ayahId; 
        const nextAyaNum = nextItem ? nextItem.ayahId : null;

        if (currentAyaNum !== undefined && currentAyaNum !== null) {
            ayahNumbers.add(currentAyaNum);
        }

        if (currentAyaNum !== undefined && currentAyaNum !== null && currentAyaNum !== nextAyaNum) {
            formattedText += ` ﴿${currentAyaNum}﴾ `;
        } else {
            formattedText += " "; 
        }
    }

    // 🌟 المتغير الصحيح الذي استخرجناه من الأكواد
    const currentSurahId = activeSurahId; 
    
    let detectedSurahName = "";
    if (typeof quranDatabase !== 'undefined' && currentSurahId) {
        // نبحث عن السورة في قاعدة البيانات باستخدام الـ ID
        const surah = quranDatabase.find(s => s.id === currentSurahId);
        if (surah) {
            detectedSurahName = surah.name;
        }
    }

    const newRecord = {
      id: Date.now(),
      text: formattedText.trim(),
      count: totalLetters, 
      wordCount: scope.length,
      numericalValue: totalValue,
      // 🌟 الآن اسم السورة وأرقام الآيات جاهزة للعرض في اللوحة
      surahName: detectedSurahName,
      ayahNumbers: Array.from(ayahNumbers)
    };

    setStashedResults((prevResults) => [...prevResults, newRecord]);
    alert("تمت الإضافة إلى التقرير المجمع بنجاح!"); 
  };

// 🌟 دالة تصدير اللوحة الفنية كصورة (بخلفية خطوط هادئة وتفاعل ذكي للزر)
  const handleExportCanvas = async () => {
    // 1. تفعيل حالة التحميل
    setExportStatus('loading');

    const canvasElement = document.getElementById('export-canvas-container');
    if (!canvasElement) {
      setExportStatus('idle');
      return;
    }

    try {
      const exportBgColor = isDarkMode ? '#0f172a' : '#fafafa'; 
      const patternOpacity = isDarkMode ? '0.04' : '0.06';
      
      const bgPattern = `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40' stroke='%23d4af37' stroke-opacity='${patternOpacity}' stroke-width='1' fill='none'/%3E%3C/svg%3E")`;

      const canvas = await html2canvas(canvasElement, {
        scale: 3, 
        useCORS: true,
        backgroundColor: exportBgColor,
        logging: false,
        onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.innerHTML = `
              * { text-shadow: none !important; letter-spacing: normal !important; }
              #export-canvas-container { 
                  background-color: ${exportBgColor} !important;
                  background-image: ${bgPattern} !important;
                  border: 1px solid rgba(212, 175, 55, 0.2) !important;
              }
              .neo-out { 
                  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, ${isDarkMode ? '0.5' : '0.08'}) !important; 
                  border: 1px solid ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'} !important; 
                  background-color: ${isDarkMode ? '#1e293b' : '#ffffff'} !important; 
              }
              .neo-in { 
                  box-shadow: none !important; 
                  border: 1px dashed ${isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'} !important; 
                  background-color: ${isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(248, 250, 252, 0.8)'} !important; 
              }
            `;
            clonedDoc.head.appendChild(style);
        }
      });
      
      const image = canvas.toDataURL("image/png", 1.0);
      const link = document.createElement('a');
      link.href = image;
      link.download = `تقرير_الرقيم_${Date.now()}.png`;
      link.click();
      
      // 2. تفعيل حالة النجاح (اللون الأخضر والنص الجديد)
      setExportStatus('success');
      
    } catch (error) {
      console.error("Error exporting image:", error);
      // تفعيل حالة الخطأ في حال فشل التصدير
      setExportStatus('error');
    } finally {
      // 3. العودة للحالة الافتراضية بعد ثانيتين فقط
      setTimeout(() => {
        setExportStatus('idle');
      }, 2000);
    }
  };
  
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
  // =========================================================================
  // دالة مخصصة لعمليات البحث فقط (معزولة تماماً عن حسابات الجُمّل والأرقام)
  // تقوم بتوحيد الحروف وإزالة التشكيل لكي تتطابق كتابة المستخدم مع الرسم العثماني
  // =========================================================================
// 1. التجريد الذكي (مع الحفاظ على المسافات لمنع التداخل والسماح بالبحث عن جمل)
  const normalizeForSearch = (text) => {
    if (!text) return '';
    return text
      .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0670]/g, '')
      .replace(/[ء]/g, '') // حذف الهمزة المفردة لتسهيل التطابق
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/[ىيئ]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      // إضافة \s هنا هي السر! للحفاظ على المسافات بين الكلمات
      .replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, '') 
      .replace(/\s+/g, ' ') // توحيد المسافات الزائدة
      .trim();
  };

  // 2. محرك البحث (العودة للبحث في النص كاملاً بعد تأمين المسافات)
  const handleGlobalSearch = (query) => {
    setGlobalSearchQuery(query);
    if (!query.trim()) { setGlobalSearchResults([]); return; }
    
    const cleanQuery = normalizeForSearch(query);
    const results = [];
    
    for (const surah of quranDatabase) {
        for (const ayah of surah.ayahs) {
            const cleanAyah = normalizeForSearch(ayah.text);
            
            // عادت الدالة للبحث الشامل، وبفضل المسافة "ما لونها" لن تطابق "مالون"
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

  // 3. دالة تظليل وتلوين نتيجة البحث داخل النص القرآني الأصلي
  const renderHighlightedText = (text, query) => {
    if (!query.trim()) return text;
    const cleanQuery = normalizeForSearch(query);
    if (!cleanQuery) return text;

    try {
      // تحويل كلمة البحث إلى نمط (Regex) يتجاهل التشكيل والرموز بين الحروف
      const chars = cleanQuery.split('').map(c => {
        if (c === ' ') return '\\s+';
        if (c === 'ا') return '[اأإآٱء\\u0654]'; // يشمل الهمزة العلوية
        if (c === 'ي') return '[يىئ]';
        if (c === 'ه') return '[ةه]';
        if (c === 'و') return '[ؤو]';
        return c;
      });
      
      // السماح بوجود أي تشكيل أو تطويل بين الحروف الأساسية
      const joiner = '[^\\u0621-\\u063A\\u0641-\\u064A\\s]*';
      const regex = new RegExp(`(${chars.join(joiner)})`, 'g');

      // تقسيم النص وإبراز الجزء المطابق
      const parts = text.split(regex);
      return parts.map((part, i) => {
        // الأجزاء المطابقة تكون دائماً في الفهارس الفردية (1, 3, 5...)
        if (i % 2 === 1) {
          return (
            <span key={i} className="bg-[#d4af37]/20 text-[#b48f27] dark:text-[#d4af37] rounded-lg px-1.5 py-0.5 mx-0.5 border-b-2 border-[#d4af37]/50 transition-colors">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      });
    } catch (e) {
      return text; // في حال حدوث خطأ، نعرض النص كما هو
    }
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

          // 🌟 بداية الفلتر الذكي للمعنى (لمنع النهايات المبتورة)
          const currentWordText = fw.cleanText || fw.text; // الحصول على الكلمة بدون تشكيل
          
          if (typeof isStrictSearch !== 'undefined' && isStrictSearch) {
              // في حالة تفعيل الفلتر: نستبعد حروف الجر والمضاف الذي يحتاج مضاف إليه
              if (badEndings.includes(currentWordText) || incompleteEndings.includes(currentWordText)) {
                  continue; // تجاوز هذا التطابق، لكن أكمل البحث في الكلمات التالية
              }
          } else if (typeof badEndings !== 'undefined') {
              // في حالة البحث الرياضي العادي: نستبعد حروف الجر القاطعة جداً في النهاية فقط كحد أدنى من الحماية
              if (badEndings.includes(currentWordText)) {
                  continue;
              }
          }
          // 🌟 نهاية الفلتر الذكي للمعنى

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
    
    // 🌟 السر هنا: معرفة ما إذا كانت الكلمة الأولى في السحب محددة مسبقاً أم لا
    const isDeselecting = baseSelectionIndices.includes(dragStartIndex);

    // إضافة التحديدات السابقة كقاعدة
    baseSelectionIndices.forEach(idx => newSelection.add(flatWordIds[idx]));

    // التعديل الذكي بناءً على حالة السحب (إضافة أو إلغاء)
    for (let i = dragMin; i <= dragMax; i++) {
        if (isDeselecting) {
            newSelection.delete(flatWordIds[i]); // التراجع عن التحديد
        } else {
            newSelection.add(flatWordIds[i]); // تحديد جديد
        }
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
  
  // 🌟 تصحيح المتغير هنا من word إلى wordId ليعمل النقر المفرد
  const handleWordClick = (wordId) => {
    // 🌟 التعديل هنا: إيقاف تحديد الكلمات إذا كنا في التصفح الحر أو وضع تحديد الآيات
    if (selectionMode === 'none' || selectionMode === 'ayah') return;
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
    if (newSelection.has(ayahId)) {
        newSelection.delete(ayahId); 
    } else {
        newSelection.add(ayahId);
    }
    setSelectedAyahs(newSelection); 
    setStatsData(null);
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
      className={`notranslate flex flex-col h-[100dvh] w-full ${t.bg} ${t.text} overflow-hidden relative transition-colors duration-300 ${isReadingMode ? 'reading-mode' : ''}`} 
      style={{ fontFamily: "'Cairo', sans-serif", direction: 'rtl' }}
      onMouseUp={handleDragEnd} onMouseLeave={handleDragEnd} onTouchEnd={handleDragEnd}
    >
    {/* 🌟 شاشة الفيديو الترحيبي مع انتقال ناعم */}
      {showSplash && (
        <div className={`fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center transition-opacity duration-500 ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <video
            autoPlay
            muted
            playsInline
            onEnded={() => {
              setIsFadingOut(true); // نبدأ تأثير الاختفاء الناعم
              setTimeout(() => setShowSplash(false), 500); // نزيل العنصر تماماً بعد انتهاء مدة التلاشي (نصف ثانية)
            }}
            className="w-full h-full object-contain"
          >
            <source src="/splash.mp4" type="video/mp4" />
          </video>
          
          <button 
            onClick={() => {
              setIsFadingOut(true);
              setTimeout(() => setShowSplash(false), 500);
            }}
            className="absolute top-8 left-8 text-white/50 hover:text-white bg-white/5 px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md transition-all border border-white/10 shadow-sm"
          >
            تخطي
          </button>
        </div>
      )}
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

{/* 🌟 نافذة البحث عن سورة (بتصميم النيومورفيزم) */}
      {isSurahModalOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          {/* 🌟 تم إزالة neo-out ووضع ظل داكن كلاسيكي حاد ليفصل النافذة عن الخلفية المعتمة */}
          <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border ${t.border} rounded-3xl p-6 md:p-8 w-full max-w-lg animate-fade-in-up`}>
            
            <div className={`flex justify-between items-center mb-6 pb-4 border-b ${t.border}`}>
              <h3 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
                <Search className="w-5 h-5 text-[#b48f27] dark:text-[#d4af37]" /> البحث عن سورة
              </h3>
              <button onClick={() => setIsSurahModalOpen(false)} className={`${t.textMuted} hover:text-red-500 neo-out active:neo-in p-2.5 rounded-xl transition-colors`}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="relative mb-6">
              <Search className={`absolute right-4 top-1/2 transform -translate-y-1/2 ${t.textMuted} w-5 h-5`} />
              <input 
                type="text" 
                placeholder="اكتب اسم السورة..." 
                value={surahSearchQuery} 
                onChange={(e) => setSurahSearchQuery(e.target.value)}
                className={`w-full pr-12 pl-4 py-4 rounded-2xl neo-in outline-none font-bold ${t.text} bg-transparent placeholder-slate-400 dark:placeholder-slate-500 transition-all`} 
                autoFocus
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-3 pr-2">
               {quranDatabase.filter(s => stripDiacritics(s.name).includes(stripDiacritics(surahSearchQuery))).map(s => {
                const isActive = activeSurahId === s.id;

                return (
                <button 
                  key={s.id} 
                  onClick={() => { setActiveSurahId(s.id); setCurrentPage(1); setIsSurahModalOpen(false); clearSelection(); setSurahSearchQuery(''); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }}
                  className={`w-full flex justify-between items-center px-4 py-4 rounded-2xl transition-all ${
                    isActive 
                      ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' 
                      : `neo-out active:neo-in ${t.text} hover:text-[#b48f27] dark:hover:text-[#d4af37]`
                  }`}
                >
                  <div className="flex items-center gap-3">
                     <span className={`text-[10px] px-2 py-1 rounded-md font-bold ${isActive ? 'bg-[#b48f27]/10 dark:bg-[#d4af37]/10' : 'bg-black/5 dark:bg-white/5 opacity-70'}`}>{s.id}</span>
                     <span className="font-bold text-lg pt-1" style={{ fontFamily: "'Amiri Quran', serif" }}>
                       سورة {s.name}
                     </span>
                  </div>
                  <span className={`text-xs font-sans font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                    {s.total_ayahs} آية
                  </span>
                </button>
              )})}
              
              {quranDatabase.filter(s => stripDiacritics(s.name).includes(stripDiacritics(surahSearchQuery))).length === 0 && (
                <div className={`text-center py-8 font-bold ${t.textMuted}`}>
                  لم يتم العثور على سورة بهذا الاسم
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
{/* 🌟 نافذة الفهرس الشامل (بتصميم النيومورفيزم) */}
      {isFullIndexOpen && (
         <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6 animate-fade-in-up">
            {/* 🌟 تم إزالة neo-out ووضع ظل داكن للحواف الخارجية */}
            <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border ${t.border} rounded-3xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col`}>
              
              <div className={`flex justify-between items-center p-6 border-b ${t.border} shrink-0`}>
                <div>
                  <h2 className={`text-2xl md:text-3xl font-black ${t.text} flex items-center tracking-wide`}>
                    <LayoutGrid className="ml-3 w-6 h-6 md:w-8 md:h-8 text-[#b48f27] dark:text-[#d4af37]" /> الفهرس <span className="text-[#b48f27] dark:text-[#d4af37] mr-2">الشامل</span>
                  </h2>
                  <p className={`text-sm ${t.textMuted} mt-1 font-bold`}>اختر السورة المطلوبة أو قم بتمييز سورك المفضلة بنجمة للوصول السريع.</p>
                </div>
                <button onClick={() => setIsFullIndexOpen(false)} className={`${t.textMuted} hover:text-red-500 neo-out active:neo-in p-3 rounded-2xl transition-colors`}><X className="w-6 h-6"/></button>
              </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
               
               {/* 🌟 قسم السور المفضلة */}
               {favoriteSurahs.length > 0 && (
                 <div className="mb-10">
                   <h3 className={`font-bold mb-6 flex items-center text-xl ${t.text}`}>
                     <Star className="ml-2 w-6 h-6 text-[#b48f27] dark:text-[#d4af37] fill-current" /> سور قيد البحث (المفضلة)
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                     {favoriteSurahs.map(id => {
                       const s = quranDatabase.find(surah => surah.id === id);
                       if (!s) return null;
                       const isActive = activeSurahId === s.id;
                       
                       return (
                         <div key={`fav-${s.id}`} onClick={() => { setActiveSurahId(s.id); setCurrentPage(1); setIsFullIndexOpen(false); clearSelection(); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} 
                           className={`rounded-2xl p-4 cursor-pointer transition-all flex justify-between items-center group ${
                             isActive ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `neo-out active:neo-in ${t.text} hover:text-[#b48f27] dark:hover:text-[#d4af37]`
                           }`}
                         >
                           <div>
                             <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isActive ? 'bg-[#b48f27]/10 dark:bg-[#d4af37]/10' : 'bg-black/5 dark:bg-white/5 opacity-70'}`}>{s.id}</span>
                                <span className="font-bold text-xl block" style={{ fontFamily: "'Amiri Quran', serif" }}>{s.name}</span>
                             </div>
                             <span className={`text-xs font-sans font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{s.total_ayahs} آية</span>
                           </div>
                           <button onClick={(e) => toggleFavoriteSurah(s.id, e)} className={`p-2.5 rounded-xl transition-all ${isActive ? 'neo-in' : 'bg-black/5 dark:bg-white/5 hover:scale-110'}`}>
                             <Star className="w-5 h-5 text-[#b48f27] dark:text-[#d4af37] fill-current" />
                           </button>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}

               {/* 🌟 قسم كل السور */}
               <div>
                 <h3 className={`font-bold mb-6 flex items-center text-xl ${t.text}`}>
                   <Book className="ml-2 w-6 h-6 text-[#b48f27] dark:text-[#d4af37]" /> المصحف كاملاً (114 سورة)
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
                    {quranDatabase.map(s => {
                      const isFav = favoriteSurahs.includes(s.id);
                      const isActive = activeSurahId === s.id;

                      return (
                        <div key={s.id} onClick={() => { setActiveSurahId(s.id); setCurrentPage(1); setIsFullIndexOpen(false); clearSelection(); document.getElementById('main-scroll-container')?.scrollTo({top: 0}); }} 
                          className={`rounded-2xl p-4 cursor-pointer transition-all flex justify-between items-center group ${
                            isActive ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `neo-out active:neo-in ${t.text} hover:text-[#b48f27] dark:hover:text-[#d4af37]`
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                               <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${isActive ? 'bg-[#b48f27]/10 dark:bg-[#d4af37]/10' : 'bg-black/5 dark:bg-white/5 opacity-70'}`}>{s.id}</span>
                               <span className="font-bold text-xl block" style={{ fontFamily: "'Amiri Quran', serif" }}>{s.name}</span>
                            </div>
                            <span className={`text-xs font-sans font-bold ${isActive ? 'opacity-100' : 'opacity-70'}`}>{s.total_ayahs} آية</span>
                          </div>
                          <button onClick={(e) => toggleFavoriteSurah(s.id, e)} className={`p-2.5 rounded-xl transition-all ${isFav ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `bg-black/5 dark:bg-white/5 ${t.textMuted} hover:text-[#b48f27] dark:hover:text-[#d4af37]`}`}>
                            <Star className={`w-5 h-5 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      );
                    })}
                 </div>
               </div>
            </div>
         </div>
      </div>
      )}

{/* 🌟 نافذة البحث الشامل (بتصميم النيومورفيزم) */}
      {isGlobalSearchModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          
          {/* الحاوية الخارجية بظل داكن كلاسيكي لتجنب الضبابية على الخلفية المعتمة */}
          <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border ${t.border} rounded-3xl p-6 md:p-8 w-full max-w-3xl flex flex-col max-h-[85vh] animate-fade-in-up`}>
            
            <div className={`flex justify-between items-center mb-6 pb-4 border-b ${t.border} shrink-0`}>
              <h3 className={`text-xl md:text-2xl font-bold ${t.text} flex items-center gap-2`}>
                <Search className="w-6 h-6 text-cyan-600 dark:text-cyan-400"/> بحث شامل في المصحف
              </h3>
              <button onClick={() => setIsGlobalSearchModalOpen(false)} className={`${t.textMuted} hover:text-red-500 neo-out active:neo-in p-2.5 rounded-xl transition-colors`}>
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="relative mb-6 shrink-0">
              <Search className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-600 dark:text-cyan-400 w-5 h-5`} />
              <input 
                type="text" 
                placeholder="ابحث عن أي كلمة أو عبارة في القرآن (بدون تشكيل)..." 
                value={globalSearchQuery} 
                onChange={(e) => handleGlobalSearch(e.target.value)}
                className={`w-full pr-12 pl-4 py-4 rounded-2xl neo-in outline-none font-bold ${t.text} bg-transparent placeholder-slate-400 dark:placeholder-slate-500 transition-all text-base md:text-lg`} 
                autoFocus
              />
            </div>
            
            {/* 🌟 عدّاد نتائج البحث الجديد (يظهر هنا بين مربع البحث والنتائج) */}
            {globalSearchQuery.trim() !== '' && (
              <div className={`mb-4 text-center font-bold text-sm md:text-base ${t.textMuted} flex items-center justify-center gap-2 shrink-0`}>
                <span className={`w-2 h-2 rounded-full ${globalSearchResults.length > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {globalSearchResults.length > 0 
                  ? `تم العثور على ${globalSearchResults.length} نتيجة` 
                  : 'لا توجد نتائج مطابقة لبحثك'}
              </div>
            )}
            
            <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4 pr-2">
              {globalSearchQuery.trim() === '' ? (
                 <div className={`text-center font-bold ${t.textMuted} py-10`}>اكتب كلمة للبدء بالبحث في جميع السور...</div>
              ) : globalSearchResults.length === 0 ? (
                 <div className={`text-center font-bold ${t.textMuted} py-10`}>تأكد من الإملاء وحاول بكلمة أخرى.</div>
              ) : (
                globalSearchResults.map((result, idx) => (
                  <button key={idx} onClick={() => goToGlobalResult(result)} className={`w-full text-right p-5 md:p-6 rounded-2xl transition-all neo-out active:neo-in group`}>
                    <div className="flex justify-between items-center mb-3">
                       <span className={`text-xs md:text-sm font-bold px-3 py-1.5 rounded-lg neo-in text-cyan-700 dark:text-cyan-400`} style={{ fontFamily: "'Amiri Quran', serif" }}>
                         سورة {result.surahName} - آية {result.ayahNumber}
                       </span>
                       <span className={`text-[10px] md:text-xs font-bold text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors`}>
                         انتقال للآية ←
                       </span>
                    </div>
                    <p className={`font-bold text-lg md:text-xl leading-loose ${t.text} group-hover:text-cyan-800 dark:group-hover:text-cyan-300 transition-colors`} style={{ fontFamily: "'Amiri Quran', serif" }}>
                     {/* تفعيل التظليل الذكي هنا */}
                      {renderHighlightedText(result.text, globalSearchQuery)}
                    </p>
                  </button>
                ))
              )}
            </div>

          </div>
        </div>
      )}

{/* 🌟 نافذة حفظ في المكتبة (إضافة تأملات) */}
      {isCommentModalOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border ${t.border} rounded-3xl p-6 md:p-8 w-full max-w-lg animate-fade-in-up`}>
            
            <h3 className={`text-xl font-bold ${t.text} mb-6 flex items-center gap-2`}>
              <MessageSquare className="w-5 h-5 text-[#b48f27] dark:text-[#d4af37]" /> حفظ في المكتبة
            </h3>
            
            <textarea 
              className={`w-full h-32 neo-in rounded-2xl p-4 font-bold ${t.text} bg-transparent placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all resize-none mb-6 custom-scrollbar text-base md:text-lg`} 
              placeholder="اكتب تأملاتك حول هذا الاستكشاف (لماذا يعتبر إعجازاً؟)..." 
              value={commentText} 
              onChange={(e) => setCommentText(e.target.value)} 
            />
            
            <div className="flex justify-end gap-3 mt-2">
              <button 
                onClick={() => setIsCommentModalOpen(false)} 
                className={`px-5 py-2.5 rounded-xl neo-out active:neo-in font-bold ${t.textMuted} hover:text-red-500 transition-colors`}
              >
                إلغاء
              </button>
              
              {/* 🌟 زر الحفظ تم إعداده ليكون واضحاً وبارزاً */}
              <button 
                onClick={saveDiscovery} 
                className="px-6 py-2.5 rounded-xl neo-out active:neo-in text-[#b48f27] dark:text-[#d4af37] font-bold flex items-center transition-all hover:scale-105"
              >
                <Save className="w-5 h-5 ml-2" /> حفظ التأملات
              </button>
            </div>
            
          </div>
        </div>
      )}

{/* 🌟 نافذة عن التطبيق ومنهجية الحساب */}
      {isMethodologyModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
          <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border ${t.border} rounded-3xl p-4 md:p-6 w-full max-w-5xl max-h-[95vh] flex flex-col animate-fade-in-up`}>
            
{/* الترويسة مصغرة */}
            <div className={`flex justify-between items-center mb-4 border-b ${t.border} pb-3 shrink-0`}>
               <h3 className={`text-lg md:text-xl font-bold text-cyan-700 dark:text-cyan-400 flex items-center`}>
                 <Info className="ml-2 w-5 h-5" /> عن التطبيق ومنهجية الحساب
               </h3>
               <button onClick={() => setIsMethodologyModalOpen(false)} className={`${t.textMuted} hover:text-red-500 neo-out active:neo-in p-2.5 rounded-xl transition-colors`}>
                 <X className="w-5 h-5"/>
               </button>
            </div>
            
{/* المحتوى مع مساحة أكبر بفضل تقليص الـ padding والـ margin */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4 text-sm md:text-base leading-relaxed">
              
              {/* قسم المحتوى (تم تقليل المسافات) */}
              <div className={`flex flex-col gap-6 mt-1 mb-4 pb-4 border-b ${t.border}`}> 
                {/* 1. قسم الآيات القرآنية */}
                <div className="text-center px-2 md:px-6">
                  <div className="inline-flex justify-center items-center w-14 h-14 rounded-full neo-out mb-6">
                    <Book className="w-7 h-7 text-[#b48f27] dark:text-[#d4af37]" />
                  </div>
                  
                  <h3 className="text-xl md:text-3xl text-[#b48f27] dark:text-[#d4af37] font-bold text-center mb-6 tracking-wide drop-shadow-sm" style={{ fontFamily: "'Amiri Quran', serif" }}>
                    بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ
                  </h3>

                  <p className={`text-lg md:text-2xl ${t.text} leading-[2.2] md:leading-[2.5] font-bold text-center mb-8`} style={{ fontFamily: "'Amiri Quran', serif" }}>
                    " وَإِذَا سَمِعُوا۟ مَاۤ أُنزِلَ إِلَى ٱلرَّسُولِ تَرَىٰۤ أَعۡیُنَهُمۡ تَفِیضُ مِنَ ٱلدَّمۡعِ مِمَّا عَرَفُوا۟ مِنَ ٱلۡحَقِّۖ یَقُولُونَ رَبَّنَاۤ ءَامَنَّا فَٱكۡتُبۡنَا مَعَ ٱلشَّـٰهِدِینَ (٨٣) وَمَا لَنَا لَا نُؤۡمِنُ بِٱللَّهِ وَمَا جَاۤءَنَا مِنَ ٱلۡحَقِّ وَنَطۡمَعُ أَن یُدۡخِلَنَا رَبُّنَا مَعَ ٱلۡقَوۡمِ ٱلصَّـٰلِحِینَ (٨٤) فَأَثَـٰبَهُمُ ٱللَّهُ بِمَا قَالُوا۟ جَنَّـٰتࣲ تَجۡرِی مِن تَحۡتِهَا ٱلۡأَنۡهَـٰرُ خَـٰلِدِینَ فِیهَاۚ وَذَ ٰ⁠لِكَ جَزَاۤءُ ٱلۡمُحۡسِنِینَ (٨٥) "
                  </p>
                  <span className="inline-block px-6 py-2.5 neo-in rounded-xl text-[#b48f27] dark:text-[#d4af37] text-sm font-bold">
                    [سُورَةُ المَائـِدَةِ: ٨٣-٨٥]
                  </span>
                </div>

                {/* 2. بطاقة مقولة المهندس عدنان الرفاعي */}
                <div className="relative p-6 md:p-10 neo-out rounded-3xl group overflow-hidden mx-auto max-w-5xl">
                  
                  <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <Quote className="w-32 h-32 text-[#b48f27] dark:text-[#d4af37]" />
                  </div>

                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-16 h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent rounded-full mb-8"></div>
                    
                    <p className={`text-base md:text-xl ${t.text} leading-relaxed font-bold mb-10 text-justify md:text-center`} style={{ lineHeight: '2.2', fontFamily: "'Amiri Quran', serif" }}>
                      "هذه النظرية هي نداء لجميع البشر بمختلف لغاتهم ومعتقداتهم ، للنظر إلى الحقيقة
                      وللنظر إلى جزءٍ بسيط جداً من صفات المنهج الإلهي السليم البعيد عن أيدي
                      التحريف .. وبعد أن ينظروا إلى ذلك ، فإنَّ هذه النظرية هي دعوة لهم لمقارنة مناهجهم مع هذا المنهج السليم وصفاته .. وبعد ذلك فإنَّ هذه النظرية هي نداء لهم لاتباع ما ستختاره عقوُلهم وفطرتهم التي فطرهم الله تعالى عليها ، لأنهم – حين ذلك – سيكونون قد عرفوا الحقيقة."
                    </p>
                    
                    <div className="flex items-center gap-4 w-full max-w-sm mx-auto">
                      <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent to-[#d4af37]/60"></div>
                      <div className="flex flex-col items-center px-2">
                        <span className="text-[#b48f27] dark:text-[#d4af37] font-bold text-lg tracking-wide whitespace-nowrap">المهندس عدنان الرفاعي</span>
                        <span className={`${t.textMuted} text-sm mt-1 font-serif`}>بقلمه</span>
                      </div>
                      <div className="flex-grow h-[1px] bg-gradient-to-l from-transparent to-[#d4af37]/60"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* بطاقة المطور */}
              <div className="p-6 neo-in rounded-2xl text-center mb-8 border border-cyan-500/10">
                <h4 className={`text-sm ${t.textMuted} mb-2 font-bold`}>إعداد وتصميم</h4>
                <p className="text-2xl font-bold text-cyan-700 dark:text-cyan-400 mb-5" style={{ fontFamily: "'Amiri Quran', serif" }}>أحمد طلعت</p>
                <a href="mailto:ahmadalazab1592@gmail.com" className="inline-flex items-center justify-center gap-2 text-sm text-cyan-700 dark:text-cyan-400 hover:text-cyan-500 neo-out active:neo-in px-5 py-2.5 rounded-xl transition-colors font-bold" dir="ltr">
                    <Mail className="w-4 h-4" /> ahmadalazab1592@gmail.com
                </a>
              </div>
              
              {/* 🌟 بطاقات المعلومات الغائرة */}
              <div className="neo-in p-5 md:p-6 rounded-2xl relative overflow-hidden mt-4">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-[#b48f27] dark:bg-[#d4af37]"></div>
                  <h4 className="text-[#b48f27] dark:text-[#d4af37] font-bold mb-3 text-lg flex items-center"><Search className="w-5 h-5 ml-2"/> فكرة التطبيق</h4>
                  <p className={`${t.text} leading-loose font-medium`}>يهتم هذا التطبيق بعرض واستخراج نماذج <span className="font-bold text-cyan-700 dark:text-cyan-400">الإعجاز العددي في القرآن الكريم</span>، سواء بتعداد الكلمات، أو الحروف، أو عبر استخراج القيم العددية للنصوص القرآنية لكشف التوازنات والروابط الرياضية المذهلة.</p>
              </div>
               
              <div className="neo-in p-5 md:p-6 rounded-2xl relative overflow-hidden mt-5">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-indigo-500"></div>
                  <h4 className="text-indigo-600 dark:text-indigo-400 font-bold mb-3 text-lg flex items-center"><Book className="w-5 h-5 ml-2"/> نسخة المصحف المعتمدة</h4>
                  <p className={`${t.text} leading-loose font-medium`}>
                     يعتمد هذا التطبيق في إحصاءاته وحساباته حصرياً وبشكل صارم على النص القرآني الموافق لـ <span className="font-bold text-indigo-600 dark:text-indigo-400">مصحف المدينة المنورة (طبعة مجمع الملك فهد)</span>، وذلك وفقاً لـ <span className="font-bold text-[#b48f27] dark:text-[#d4af37]">رواية حفص عن عاصم</span>.
  أي اختلافات طفيفة في أعداد الحروف مقارنة بتطبيقات أخرى تعود إلى الالتزام الدقيق بقواعد الرسم العثماني لهذه النسخة المحددة.
  </p>
              </div>

              <div className="neo-in p-5 md:p-6 rounded-2xl relative overflow-hidden mt-5">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-cyan-500"></div>
                  <h4 className="text-cyan-700 dark:text-cyan-400 font-bold mb-4 text-lg flex items-center"><Calculator className="w-5 h-5 ml-2"/> المعيار القرآني للقيم العددية</h4>
                  <p className={`${t.text} leading-loose font-medium mb-6`}>خلافاً للطرق البشرية الوضعية، يعتمد هذا التطبيق على <span className="font-bold text-cyan-700 dark:text-cyan-400">معايير قرآنية بحتة ومجردة</span>.
  حيث تُعطى القيم العددية للحروف بناءً على <span className="font-bold text-emerald-600 dark:text-emerald-400">الترتيب التنازلي لمرات ورودها في القرآن الكريم</span>.</p>
                  
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3 text-center text-xs md:text-sm font-bold" dir="ltr">
                    {[
                      { v: 1, l: 'ا/أ/إ/ٱ/ء/ى' }, { v: 2, l: 'ل' }, { v: 3, l: 'ن' }, { v: 4, l: 'م' }, { v: 5, l: 'و / ؤ' }, { v: 6, l: 'ي / ئ' }, { v: 7, l: 'هـ / ة' },
                      { v: 8, l: 'ر' }, { v: 9, l: 'ب' }, { v: 10, l: 'ك' }, { v: 11, l: 'ت' }, { v: 12, l: 'ع' }, { v: 13, l: 'ف' }, { v: 14, l: 'ق' },
                      { v: 15, l: 'س' }, { v: 16, l: 'د' }, { v: 17, l: 'ذ' }, { v: 18, l: 'ح' }, { v: 19, l: 'ج' }, { v: 20, l: 'خ' }, { v: 21, l: 'ش' },
                      { v: 22, l: 'ص' }, { v: 23, l: 'ض' }, { v: 24, l: 'ز' }, { v: 25, l: 'ث' }, { v: 26, l: 'ط' }, { v: 27, l: 'غ' }, { v: 28, l: 'ظ' }
                    ].map(item => (
                      <div key={item.v} className={`neo-out rounded-xl p-2.5 flex flex-col justify-center items-center shadow-sm`}>
                        <span className="text-cyan-600 dark:text-cyan-400 mb-1 text-sm">{item.v}</span>
                        <span className={`${t.text}`}>{item.l}</span>
                      </div>
                    ))}
                  </div>
              </div>

              <div className="neo-in p-5 md:p-6 rounded-2xl relative overflow-hidden mt-5">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-rose-500"></div>
                  <h4 className="text-rose-600 dark:text-rose-400 font-bold mb-4 text-lg flex items-center"><Info className="w-5 h-5 ml-2"/> قاعدة الهمزة وحالاتها الدقيقة</h4>
                  <p className={`${t.text} leading-loose font-medium mb-5`}>لضمان التطابق التام مع الرسم العثماني للمصحف الشريف، يعتمد التطبيق القواعد الاستثنائية التالية في الحساب:</p>
                  <div className="space-y-4">
                     <div className="neo-out p-5 rounded-2xl">
                        <h5 className="text-[#b48f27] dark:text-[#d4af37] font-bold text-base mb-2">1. الهمزة المحمولة (ذات الكرسي):</h5>
                        <p className={`${t.textMuted} font-medium`}>تُحسب بناءً على الحرف الحامل لها وتُعتبر حرفاً أصيلاً يأخذ قيمة الكرسي (أ، إ، ؤ، ئ، والهمزة تحت النبرة).</p>
                     </div>
                     <div className="neo-out p-5 rounded-2xl">
                        <h5 className="text-[#b48f27] dark:text-[#d4af37] font-bold text-base mb-3">2. الهمزة المفردة (على السطر):</h5>
                        <p className={`${t.textMuted} font-medium mb-4`}>هناك أمثلة وحالات كثيرة لا تُعتبر فيها الهمزة المفردة (ء) حرفاً أصيلاً، بل مجرد علامة ضبط تُتجاهل برمجياً في الحساب، وتشمل:</p>
                        <ul className="space-y-4">
                           <li className="flex items-start"><span className="text-rose-500 ml-3 mt-1 text-xl">•</span><div><strong className={`${t.text}`}>في وسط الكلمة (بدون نبرة):</strong><br/><span className={`${t.textMuted} text-xs md:text-sm mt-1 block leading-relaxed`}>أمثلة: (السيءات， يجءرون， تجءروا， الءن ， القرءان ， قرءان ， هنيءا， مريءا， متكءين， يتكءون， أفءدتهم， أفءدة， يستءخرون， خطيءة， خطءا， خطيءتهم， ليسءوا， فمالءون， المشءمة).</span></div></li>
                           <li className="flex items-start"><span className="text-rose-500 ml-3 mt-1 text-xl">•</span><div><strong className={`${t.text}`}>في بداية الكلمة (على السطر):</strong><br/><span className={`${t.textMuted} text-xs md:text-sm mt-1 block leading-relaxed`}>أمثلة: (ءامن، ءامنوا، ءامنا، ءادم، ءاخر، ءاخرين، ءاخرنا). وتتميز بأنها تسقط عند دخول حرف ملتصق بالكلمة لأنها ليست حرفاً أصيلاً.</span></div></li>
                           <li className="flex items-start"><span className="text-rose-500 ml-3 mt-1 text-xl">•</span><div><strong className={`${t.text}`}>في نهاية الكلمة:</strong><br/><span className={`${t.textMuted} text-xs md:text-sm mt-1 block leading-relaxed`}>أمثلة: (شيء، بريء، الخبء، دفء). والسبب أنه بدخول حرف على نهاية الكلمة (التنوين) يسقط الكرسي وتكتب بدون نبرة مثل: (شيءا، بريءا).</span></div></li>
                        </ul>
                     </div>
                  </div>
              </div>

              <div className="neo-in p-5 md:p-6 rounded-2xl relative overflow-hidden mt-5 mb-4">
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-[#b48f27] dark:bg-[#d4af37]"></div>
                  <h4 className={`${t.text} font-bold mb-4 text-lg`}>تنويه ورد الفضل لأهله</h4>
                  <p className={`${t.textMuted} leading-relaxed font-medium mb-6`}>
                     إن امتلاء القرآن الكريم بآلاف النماذج من هذه الروابط المذهلة، هو دلالة يقينية ورياضية قاطعة على <span className="text-cyan-700 dark:text-cyan-400 font-bold">عدم تغيير أي حرف من القرآن</span> (لا بالزيادة ولا بالنقصان)، وإلا لاختلت وانهارت كل هذه المنظومة الرقمية العظيمة.
                  </p>
                  <div className="neo-out p-5 rounded-2xl border border-[#d4af37]/20 text-right w-full">
                     <p className={`${t.textMuted} leading-relaxed font-medium`}>
                        <span className="text-[#b48f27] dark:text-[#d4af37] font-bold text-lg block mb-2">شكر وتقدير: </span> 
                        تعود أصول هذه النظرية ومنهجية الحساب المعجزة، واستنباط الأمثلة المذكورة في هذه المنظومة إلى الأبحاث والدراسات المعمقة التي قدمها <span className={`${t.text} font-bold px-1 text-base`}>المهندس / عدنان الرفاعي</span>.
  نسأل الله أن يجعل هذا العمل الجليل في ميزان حسناته وأن ينفع به.
  </p>
                  </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex justify-end shrink-0">
               <button onClick={() => setIsMethodologyModalOpen(false)} className="px-8 py-3 rounded-xl neo-out active:neo-in font-bold transition-all text-cyan-700 dark:text-cyan-400">اكتشف الآن</button>
            </div>
          </div>
        </div>
      )}
      
{/* -------------------- شريط القائمة الرئيسي (يظهر فقط في شاشة المصحف) -------------------- */}
      {activeTab === 'main' && (
        <div className={`sticky top-0 z-40 neo-out border-t-0 rounded-b-2xl md:rounded-b-3xl px-3 md:px-6 py-2 md:py-3 flex flex-col md:flex-row justify-between items-center gap-3 transition-all duration-300`}>
           
           {/* 🌟 الصف الأول في الهاتف: الشعار يميناً والأدوات يساراً (لتوفير المساحة) */}
           <div className="w-full md:w-auto flex justify-between items-center">
              <div>
                 <h1 className={`text-lg md:text-2xl font-bold ${t.text}`}>
                   الرَّقِيم <span className="hidden sm:inline-block text-[10px] md:text-sm text-cyan-600 dark:text-cyan-400 font-normal mr-1">منظومة الأعداد في القرآن الكريم</span>
                 </h1>
                 <p className={`text-slate-500 dark:text-slate-400 text-[9px] md:text-[11px] flex items-center mt-0.5 font-bold`}>
                   {selectedWords.size > 0 || selectedAyahs.size > 0 ? <><AlertCircle className="w-3 h-3 text-cyan-500 ml-1"/> البحث: يدوي</> : <><BookOpen className="w-3 h-3 text-[#d4af37] ml-1"/> البحث: كامل الصفحة</>}
                 </p>
              </div>

              {/* أزرار الأدوات المصغرة (تظهر هنا في الهاتف فقط لسهولة الوصول، وتُخفى في الديسكتوب) */}
              <div className="flex md:hidden items-center gap-1.5">
                <button onClick={() => setIsGlobalSearchModalOpen(true)} className={`neo-out active:neo-in text-cyan-600 dark:text-cyan-400 p-1.5 rounded-xl transition-all`}>
                    <Search className="w-4 h-4" />
                 </button>
                 <button onClick={() => setActiveTab('encyclopedia')} className={`neo-out active:neo-in text-[#d4af37] p-1.5 rounded-xl transition-all`}>
                    <Library className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsMethodologyModalOpen(true)} className={`neo-out active:neo-in text-cyan-600 dark:text-cyan-400 p-1.5 rounded-xl transition-all`}>
                    <Info className="w-4 h-4" />
                 </button>
                 <button onClick={() => setIsDarkMode(!isDarkMode)} className={`neo-out active:neo-in p-1.5 rounded-xl transition-all`}>
                     {isDarkMode ? <Sun className="w-4 h-4 text-[#d4af37]" /> : <Moon className="w-4 h-4 text-indigo-600" />}
                 </button>
              </div>
           </div>
           
           {/* 🌟 الصف الثاني في الهاتف: زر السورة والفهرس يأخذان العرض بالكامل */}
           <div className="w-full md:w-auto flex items-center justify-between gap-2">
              <button onClick={() => setIsFullIndexOpen(true)} className={`shrink-0 neo-out active:neo-in text-indigo-600 dark:text-indigo-400 p-2 md:p-2.5 rounded-xl transition-all`} title="الفهرس الشامل">
                <LayoutGrid className="w-5 h-5 md:w-5 md:h-5" />
              </button>
              <button onClick={() => setIsSurahModalOpen(true)} className={`flex-1 md:flex-none justify-center neo-out active:neo-in rounded-xl px-3 py-1.5 md:px-4 md:py-2 transition-all flex items-center`}>
                <span className={`font-bold text-sm md:text-lg pt-1 ${t.text}`} style={{ fontFamily: "'Amiri Quran', serif" }}>سورة {currentSurah.name}</span>
                <span className={`text-[10px] md:text-xs text-slate-500 dark:text-slate-400 mr-2 font-sans`}>({currentSurah.total_ayahs} آية)</span>
              </button>
           </div>
           
           {/* 🌟 أزرار الأدوات الكاملة (تظهر في الديسكتوب فقط وتحتوي على النصوص) */}
           <div className="hidden md:flex items-center flex-wrap justify-center gap-2">
             <button onClick={() => setIsDarkMode(!isDarkMode)} className={`neo-out active:neo-in p-2 md:p-2.5 rounded-xl transition-all`} title="تغيير المظهر">
                 {isDarkMode ? <Sun className="w-4 h-4 md:w-5 md:h-5 text-[#d4af37]" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />}
             </button>
             <button onClick={() => setIsMethodologyModalOpen(true)} className={`neo-out active:neo-in text-cyan-600 dark:text-cyan-400 px-3 py-1.5 md:px-3 md:py-2 rounded-xl flex items-center gap-1.5 text-sm md:text-base font-bold transition-all`}>
                <Info className="w-4 h-4" /> <span>عن التطبيق</span>
             </button>
             <button onClick={() => setIsGlobalSearchModalOpen(true)} className={`neo-out active:neo-in text-cyan-600 dark:text-cyan-400 px-3 py-1.5 md:px-3 md:py-2 rounded-xl flex items-center gap-1.5 text-sm md:text-base font-bold transition-all`}>
                <Search className="w-4 h-4" /> <span>بحث</span>
             </button>
             <button onClick={() => setActiveTab('encyclopedia')} className={`neo-out active:neo-in text-[#d4af37] px-3 py-1.5 md:px-3 md:py-2 rounded-xl flex items-center gap-1.5 text-sm md:text-base font-bold transition-all`}>
                <Library className="w-4 h-4" /> <span>الموسوعة</span>
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
          <div className="font-amiri p-4 md:p-8 max-w-5xl mx-auto space-y-6 relative z-10 animate-fade-in-up">
            
{/* 🌟 شريط التنقل بين الصفحات (بتصميم النيومورفيزم) */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center py-6 md:py-8 w-full">
              {/* الغلاف الخارجي للشريط */}
              <div className="neo-out p-1.5 md:p-2 rounded-2xl flex items-center gap-2 md:gap-4 mx-auto">
                
                {/* زر الصفحة السابقة */}
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`p-2.5 md:p-3 rounded-xl transition-all flex items-center justify-center ${
                    currentPage === 1 
                      ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500 neo-in' 
                      : 'neo-out active:neo-in text-cyan-700 dark:text-cyan-400 hover:text-cyan-500'
                  }`}
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>

                {/* مؤشر رقم الصفحة (غائر للداخل) */}
                <div className="neo-in px-6 md:px-10 py-2 md:py-2.5 rounded-xl min-w-[130px] flex justify-center items-center">
                  <span className={`font-bold text-sm md:text-base ${t.text}`}>
                    صفحة {currentPage} من {totalPages}
                  </span>
                </div>

                {/* زر الصفحة التالية */}
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`p-2.5 md:p-3 rounded-xl transition-all flex items-center justify-center ${
                    currentPage === totalPages 
                      ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500 neo-in' 
                      : 'neo-out active:neo-in text-cyan-700 dark:text-cyan-400 hover:text-cyan-500'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                
              </div>
            </div>
          )}

{/* ----------------- لوحة الإحصاء اليدوي ----------------- */}
            {statsData && discoveries.length === 0 && (
               <div id="results-panel" className={`neo-out rounded-2xl md:rounded-3xl p-4 md:p-6 mb-8 animate-fade-in-up`}>
                  <div className={`flex justify-between items-center mb-4 md:mb-6 border-b ${t.border} pb-3 md:pb-4`}>
                   <h3 className={`font-bold ${t.text} text-lg md:text-xl flex items-center`}><BarChart3 className="w-5 h-5 md:w-6 md:h-6 ml-2 text-[#d4af37]"/> إحصاء النص</h3>
                   <button onClick={() => { setStatsData(null); scrollToLastSelection(); }} className={`${t.textMuted} hover:${t.text} neo-out rounded-full p-1.5 md:p-2`}><X className="w-4 h-4 md:w-5 md:h-5"/></button>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
                    
                    {/* الكلمات */}
                    <div className={`neo-in p-3 md:p-5 rounded-xl md:rounded-2xl text-center flex flex-col justify-center`}>
                      <p className={`${t.textMuted} text-[11px] md:text-sm mb-1 md:mb-2 font-bold`}>الكلمات</p>
                      <p className={`text-xl md:text-3xl font-black ${t.text} flex justify-center items-center gap-1`}>
                        {statsData.words}
                        {isPrime(statsData.words) && <span className="text-amber-500 text-sm md:text-lg" title="عدد أولي">✨</span>}
                      </p>
                      {isPrime(statsData.words) && <span className="text-[10px] md:text-xs font-bold text-amber-500 block mt-1 md:mt-1.5">( عدد أولي )</span>}
                    </div>
                    
                    {/* الحروف */}
                    <div className={`neo-in p-3 md:p-5 rounded-xl md:rounded-2xl text-center flex flex-col justify-center ${statsData.is19Letters || isPrime(statsData.letters) ? 'border border-[#d4af37]/50' : ''}`}>
                      <p className={`${t.textMuted} text-[11px] md:text-sm mb-1 md:mb-2 font-bold`}>الحروف</p>
                      <p className={`text-xl md:text-3xl font-black ${statsData.is19Letters ? 'text-[#d4af37]' : t.text} flex justify-center items-center gap-1`}>
                        {statsData.letters}
                        {isPrime(statsData.letters) && <span className="text-amber-500 text-sm md:text-lg" title="عدد أولي">✨</span>}
                      </p>
                      {statsData.is19Letters && <span className="text-[9px] md:text-[11px] font-bold text-[#d4af37] block mt-1.5 md:mt-2 bg-[#d4af37]/10 rounded-md py-0.5 md:py-1">19 × {statsData.letters/19}</span>}
                      {isPrime(statsData.letters) && <span className="text-[10px] md:text-xs font-bold text-amber-500 block mt-1 md:mt-1.5">( عدد أولي )</span>}
                    </div>
                    
                    {/* القيمة العددية */}
                    <div className={`neo-in p-3 md:p-5 rounded-xl md:rounded-2xl text-center flex flex-col justify-center ${statsData.is19Value || isPrime(statsData.value) ? 'border border-[#d4af37]/50' : ''}`}>
                      <p className={`${t.textMuted} text-[11px] md:text-sm mb-1 md:mb-2 font-bold`}>القيمة العددية</p>
                      <p className={`text-xl md:text-3xl font-black ${statsData.is19Value ? 'text-[#d4af37]' : t.text} flex justify-center items-center gap-1`}>
                        {statsData.value}
                        {isPrime(statsData.value) && <span className="text-amber-500 text-sm md:text-lg" title="عدد أولي">✨</span>}
                      </p>
                      {statsData.is19Value && <span className="text-[9px] md:text-[11px] font-bold text-[#d4af37] block mt-1.5 md:mt-2 bg-[#d4af37]/10 rounded-md py-0.5 md:py-1">19 × {statsData.value/19}</span>}
                      {isPrime(statsData.value) && <span className="text-[10px] md:text-xs font-bold text-amber-500 block mt-1 md:mt-1.5">( عدد أولي )</span>}
                    </div>
                 </div>
                 
                 <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                   {(statsData.is19Letters || statsData.is19Value || isPrime(statsData.letters) || isPrime(statsData.value)) && (
                     <button onClick={() => openCommentModal()} className="flex-1 bg-[#d4af37] hover:bg-[#b48f27] text-white font-bold py-2.5 md:py-3.5 rounded-xl md:rounded-2xl flex justify-center items-center shadow-lg transition-colors text-sm md:text-base">
                       <BookmarkPlus className="w-4 h-4 md:w-5 md:h-5 ml-2" /> حفظ الإعجاز
                     </button>
                   )}
                   
                   <button onClick={openDeepSearchConfig} className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 md:py-3.5 rounded-xl md:rounded-2xl flex justify-center items-center transition-colors shadow-lg text-sm md:text-base">
                     <Search className="w-4 h-4 md:w-5 md:h-5 ml-2" /> بحث عن متطابقات (±3 صفحات)
                   </button>
                 </div>
               </div>
            )}

            {/* ----------------- لوحة الاستكشاف والتمشيط الذكي ----------------- */}
            {discoveries.length > 0 && (
               <div id="results-panel" className={`${t.panel} border ${t.borderFocus} rounded-2xl md:rounded-3xl p-3 md:p-5 mb-8 shadow-lg animate-fade-in-up overflow-hidden`}>
                
                {/* 🌟 الرأس (تم جعله متجاوباً flex-col للهاتف) */}
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-center w-full mb-4 pb-3 md:pb-4 border-b ${t.border} gap-3 md:gap-4`}>
                  <span className={`font-bold text-xs md:text-sm px-3 md:px-4 py-2 rounded-xl flex items-center w-full md:w-auto justify-center md:justify-start ${t.text} ${t.input} border ${t.borderFocus}`}>
                    {discoveryMode === 'deep_search' ? (
                       <><Layers className="w-4 h-4 ml-1.5 md:ml-2 text-indigo-500" /> نتائج البحث العميق ({discoveries.length})</>
                    ) : (
                       <>
                         {discoveryMode === '19_letters' && <Scale className="w-4 h-4 ml-1.5 md:ml-2 text-emerald-500" />}
                         {discoveryMode === '19_values' && <Hash className="w-4 h-4 ml-1.5 md:ml-2 text-emerald-500" />}
                         {(discoveryMode === 'balance_letters' || discoveryMode === 'balance_values') && <Scale className="w-4 h-4 ml-1.5 md:ml-2 text-cyan-500" />}
                         {discoveryMode === '19_letters' ? 'حروف مضاعفات 19' : discoveryMode === '19_values' ? 'قيم مضاعفات 19' : discoveryMode === 'balance_letters' ? 'توازن الحروف' : 'توازن القيم'}
                         ({discoveries.length})
                       </>
                    )}
                  </span>
                  
                  <div className="flex gap-2 w-full md:w-auto justify-between md:justify-end">
                    <button onClick={() => openCommentModal()} className="flex-1 md:flex-none rounded-xl flex justify-center items-center text-xs md:text-sm px-4 py-2 font-bold transition-all bg-[#d4af37] text-white hover:bg-[#b48f27]">
                      <BookmarkPlus className="w-4 h-4 ml-1" /> حفظ وتأمل
                    </button>
                    <button onClick={() => { setDiscoveries([]); setDiscoveryMode(null); scrollToLastSelection(); }} className={`${t.textMuted} hover:${t.text} ${t.input} rounded-xl p-2 md:px-3`}>
                      <X className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                </div>
                
                {/* 🌟 منطقة المحتوى (أخذت العرض بالكامل 100%) */}
                <div className="w-full">
                  <div className="text-center mb-3">
                     {discoveryMode === 'deep_search' && (
                       <div className={`${t.input} border ${t.border} rounded-lg p-2 inline-block mx-auto text-xs md:text-sm ${t.textMuted}`}>
                         نوع التطابق: 
                         <strong className={`ml-1.5 md:ml-2 px-2 py-0.5 rounded ${discoveries[activeDiscoveryIndex].matchType.includes('الحروف') && discoveries[activeDiscoveryIndex].matchType.includes('القيمة') ? 'bg-indigo-500/20 text-indigo-600' : discoveries[activeDiscoveryIndex].matchType === 'الحروف' ? 'bg-cyan-500/20 text-cyan-600' : 'bg-[#d4af37]/20 text-[#d4af37]'}`}>
                           {discoveries[activeDiscoveryIndex].matchType}
                         </strong>
                       </div>
                     )}
                  </div>
                  
                  {/* البطاقات */}
                  <div className={discoveryMode === 'deep_search' ? "grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4 w-full" : "flex flex-col gap-3 md:gap-4 w-full"}>
                    {discoveries[activeDiscoveryIndex].segments.map((seg, idx) => {
                      const color = segmentColors[idx % segmentColors.length];
                      const matchType = discoveries[activeDiscoveryIndex].matchType || '';
                      
                      const highlightLetters = discoveryMode === 'deep_search' && (matchType === 'الحروف' || matchType === 'الحروف والقيمة معاً');
                      const highlightValue = discoveryMode === 'deep_search' && (matchType === 'القيمة' || matchType === 'الحروف والقيمة معاً');

                      return (
                        <div key={idx} className={`flex flex-col gap-3 md:gap-4 p-3 md:p-5 rounded-2xl border ${discoveryMode === 'deep_search' ? (seg.isPrimary ? `border-indigo-500/50 ${isDarkMode ? 'bg-indigo-950/20' : 'bg-indigo-50/50'}` : `${t.borderFocus} ${t.input}`) : `${t.borderFocus} ${t.input}`} relative h-full`}>
                           {/* 🌟 الشارات التعريفية */}
                           <div className={`flex items-center justify-center md:justify-start gap-2 flex-wrap border-b ${t.border} pb-3`}>
                              {discoveryMode === 'deep_search' ? (
                                 <span className={`text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg ${seg.isPrimary ? 'bg-indigo-600 text-white' : 'bg-slate-500 text-white'}`}>
                                   {seg.isPrimary ? 'الأساسي' : 'المتطابق'}
                                 </span>
                              ) : (
                                 (discoveryMode === 'balance_letters' || discoveryMode === 'balance_values') && <span className={`text-[9px] md:text-[10px] font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg ${color.badge}`}>النص {idx + 1}</span>
                              )}
                              
                              <span className={`text-[10px] md:text-sm font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg border transition-colors ${highlightLetters ? 'bg-cyan-500/20 text-cyan-600 border-cyan-500/50' : `${t.textMuted} ${t.panel} ${t.borderFocus}`}`}>
                                 {seg.letterCount} حرف
                              </span>
                              <span className={`text-[10px] md:text-sm font-bold px-2 md:px-3 py-1 md:py-1.5 rounded-lg border transition-colors ${highlightValue ? 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/50' : `${t.textMuted} ${t.panel} ${t.borderFocus}`}`}>
                                 قيمة {seg.sum}
                              </span>
                              
                              {discoveryMode === '19_letters' && <span className="text-[10px] md:text-sm font-bold text-emerald-600 bg-emerald-500/20 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-emerald-500/30">19 × {seg.letterCount / 19}</span>}
                              {discoveryMode === '19_values' && <span className="text-[10px] md:text-sm font-bold text-emerald-600 bg-emerald-500/20 px-2 md:px-3 py-1 md:py-1.5 rounded-lg border border-emerald-500/30">19 × {seg.sum / 19}</span>}
                           </div>
                           
                           {/* 🌟 النص القرآني (تم تقليل ارتفاع السطر قليلاً للهاتف) */}
                           <p className={`font-['Amiri_Quran'] text-xl md:text-3xl leading-[3.5rem] md:leading-[5rem] text-center ${t.quranText} pt-1 pb-1 px-1 md:px-2 overflow-visible`}>
                             "{getDiscoveryTextSnippet(seg)}"
                           </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* 🌟 شريط التنقل (الأسهم) - تم نقله بالكامل للأسفل لإنقاذ مساحة الشاشة! */}
                <div className={`flex items-center justify-between mt-4 md:mt-6 p-2 bg-black/5 dark:bg-white/5 rounded-2xl border ${t.border}`}>
                  <button onClick={() => setActiveDiscoveryIndex(prev => Math.min(prev + 1, discoveries.length - 1))} disabled={activeDiscoveryIndex === discoveries.length - 1} className={`p-2.5 ${t.input} ${t.textMuted} rounded-xl hover:${t.text} disabled:opacity-30 border ${t.borderFocus}`}>
                    <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                  
                  <span className={`font-bold text-xs md:text-sm ${t.text}`}>
                    نتيجة {activeDiscoveryIndex + 1} من {discoveries.length}
                  </span>
                  
                  <button onClick={() => setActiveDiscoveryIndex(prev => Math.max(prev - 1, 0))} disabled={activeDiscoveryIndex === 0} className={`p-2.5 ${t.input} ${t.textMuted} rounded-xl hover:${t.text} disabled:opacity-30 border ${t.borderFocus}`}>
                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
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
                        // حالة التمشيط والاكتشاف (تأخذ الألوان المخصصة للاكتشافات)
                        const activeSegments = discoveries[activeDiscoveryIndex].segments;
                        segmentIndex = activeSegments.findIndex(seg => fw.flatIndex >= seg.startIndex && fw.flatIndex <= seg.endIndex);
                        if (segmentIndex !== -1) { 
                           isStartOfSegment = fw.flatIndex === activeSegments[segmentIndex].startIndex;
                           isEndOfSegment = fw.flatIndex === activeSegments[segmentIndex].endIndex; 
                        } 
                        else { wordColorClass = t.quranInactive; }
                      } else if (statsData || selectedWords.size > 0 || selectedAyahs.size > 0) {
                         // 🌟 دمجنا حالة "إحصاء النص" مع التحديد العادي
                         // لكي يحتفظ النص المحدد بنفس التنسيق الجميل والواضح ولا يتغير لونه أبداً
                         if (!isWordSelected) wordColorClass = t.quranInactive;
                      }

                      let styleClasses = `inline-block mx-[2px] px-1.5 transition-all duration-200 ${hasMiracle ? 'miracle-word relative' : ''} `;
                      let badgeElement = null;

                      if (segmentIndex !== -1) {
                         let color;
                         // 🌟 أضفنا شروط حماية إضافية لمنع انهيار التطبيق (الشاشة البيضاء)
                         if (discoveryMode === 'deep_search' && discoveries.length > 0 && discoveries[activeDiscoveryIndex]) {
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
    <React.Fragment key={index}>
      <span data-wordid={fw.wordId} onMouseDown={() => handleDragStart(fw.wordId)} onMouseEnter={() => handleDragEnter(fw.wordId)} onTouchStart={() => handleDragStart(fw.wordId)} onClick={() => handleWordClick(fw.wordId)} className={`${styleClasses} ${wordColorClass || t.quranText} ${wordColorClass === '' ? 'relative z-10 ' : ''}`}>
        {badgeElement} {word}
      </span>
      {/* 🌟 السر هنا: إضافة مسافة فارغة حقيقية بعد كل كلمة ليتمكن المتصفح من تمديد السطر */}
      {' '}
    </React.Fragment>
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

{/* 🌟 أزرار الصفحات السفلية (بتصميم النيومورفيزم مع الحفاظ على خاصية الصعود للأعلى) */}
            {totalPages > 1 && (
               <div className="flex justify-center items-center mt-8 w-full">
                  {/* الغلاف الخارجي للشريط السفلي بالنيومورفيزم */}
                  <div className="neo-out p-1.5 md:p-2 rounded-2xl flex items-center gap-2 md:gap-4 mx-auto w-fit">
                     
                     {/* زر الصفحة السابقة */}
                     <button 
                       onClick={() => { 
                          setCurrentPage(prev => Math.max(prev - 1, 1)); 
                          // 🌟 الحفاظ على خاصية الصعود للأعلى عند تقليب الصفحات
                          document.getElementById('main-scroll-container')?.scrollTo({top: 0}); 
                       }} 
                       disabled={currentPage === 1} 
                       className={`p-2.5 md:p-3 rounded-xl transition-all flex items-center justify-center ${
                          currentPage === 1 
                            ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500 neo-in' 
                            : 'neo-out active:neo-in text-cyan-700 dark:text-cyan-400 hover:text-cyan-500'
                       }`}
                     >
                        <ChevronRight className="w-5 h-5 md:w-6 md:h-6"/>
                     </button>

                     {/* مؤشر رقم الصفحة الغائر للداخل */}
                     <div className="neo-in px-6 md:px-10 py-2 md:py-2.5 rounded-xl min-w-[130px] flex justify-center items-center">
                        <span className={`font-bold text-sm md:text-base ${t.text}`}>
                          صفحة {currentPage} من {totalPages}
                        </span>
                     </div>

                     {/* زر الصفحة التالية */}
                     <button 
                       onClick={() => { 
                          setCurrentPage(prev => Math.min(prev + 1, totalPages)); 
                          // 🌟 الحفاظ على خاصية الصعود للأعلى عند تقليب الصفحات
                          document.getElementById('main-scroll-container')?.scrollTo({top: 0}); 
                       }} 
                       disabled={currentPage === totalPages} 
                       className={`p-2.5 md:p-3 rounded-xl transition-all flex items-center justify-center ${
                          currentPage === totalPages 
                            ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500 neo-in' 
                            : 'neo-out active:neo-in text-cyan-700 dark:text-cyan-400 hover:text-cyan-500'
                       }`}
                     >
                        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6"/>
                     </button>
                     
                  </div>
               </div>
            )}
          </div>
        )}

{/* -------------------- الشاشة 2: موسوعة الإعجاز (بتصميم النيومورفيزم) -------------------- */}
        {activeTab === 'encyclopedia' && (
          <div className="flex flex-col min-h-full animate-fade-in-up">
{/* 🌟 الشريط العلوي للموسوعة (تم إزالة الهوامش الجانبية وتوحيد التصميم مع الشاشة الرئيسية) */}
             {!activeEncycCategory ? (
                 <div className={`sticky top-0 z-40 neo-out border-t-0 rounded-b-3xl px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-3 transition-all duration-300`}>
                   <div className="text-center md:text-right">
                     <h2 className={`text-2xl md:text-3xl font-black ${t.text} tracking-wide`}>
                       <span className="text-[#b48f27] dark:text-[#d4af37]">موسوعة</span> الإعجاز
                     </h2>
                     <p className={`${t.textMuted} text-[10px] md:text-xs mt-1 font-bold`}>نماذج وأمثلة مختارة من كنوز المنظومة الرقمية ....."للاطلاع على كل الأمثلة يرجى العودة لكتب المهندس عدنان الرفاعي".</p>
                   </div>
                   <button onClick={() => setActiveTab('main')} className={`flex items-center neo-out active:neo-in font-bold px-4 md:px-5 py-2.5 rounded-xl transition-all ${t.text} hover:text-cyan-700 dark:hover:text-cyan-400`}>
                     <ArrowLeft className="mr-2 w-4 h-4 rotate-180" /> <span className="hidden md:inline">العودة للمصحف</span>
                   </button>
                 </div>
             ) : (
                 <div className={`sticky top-0 z-40 neo-out border-t-0 rounded-b-3xl px-4 md:px-8 py-3 flex justify-between items-center transition-all duration-300`}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center neo-in`}>
                        <activeEncycCategory.icon className={`w-5 h-5 md:w-6 md:h-6 ${activeEncycCategory.color}`} />
                      </div>
                      <div>
                        <h2 className={`text-xl md:text-2xl font-bold ${t.text} line-clamp-1`}>{activeEncycCategory.title}</h2>
                      </div>
                    </div>
                    <button onClick={() => setActiveEncycCategory(null)} className={`flex items-center neo-out active:neo-in font-bold px-3 py-2 md:px-4 md:py-2.5 rounded-xl transition-all text-sm md:text-base ${t.text} hover:text-cyan-700 dark:hover:text-cyan-400`}>
                      <ArrowLeft className="mr-1 md:mr-2 w-4 h-4 rotate-180" /> <span className="hidden md:inline">العودة للأقسام</span>
                    </button>
                 </div>
             )}
             
             {/* 🌟 محتوى الموسوعة */}
             <div className="p-4 md:p-8 max-w-6xl mx-auto w-full flex-grow relative z-10">
                 {!activeEncycCategory ? (
                   // شبكة أقسام الموسوعة
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 mt-2 md:mt-4">
                     {encyclopediaCategories.map(cat => {
                       const count = encyclopediaData.filter(ex => {
                          if (!ex.categoryId) return false;
                          const catStr = String(ex.categoryId).toLowerCase();
                          return catStr === cat.id.toLowerCase() || catStr === cat.title.toLowerCase() || cat.title.toLowerCase().includes(catStr) || catStr.includes(cat.title.toLowerCase());
                       }).length;

                       return (
                         <div key={cat.id} onClick={() => setActiveEncycCategory(cat)} className={`neo-out rounded-2xl p-6 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg group relative overflow-hidden`}>
                            {/* خط علوي تجميلي */}
                            <div className={`absolute top-0 left-0 w-full h-1 ${cat.bg.replace('/10', '')} opacity-40 group-hover:opacity-100 transition-opacity`}></div>
                            
                            <div className="flex justify-between items-start mb-5">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center neo-in`}>
                                  <cat.icon className={`w-7 h-7 ${cat.color}`} />
                               </div>
                               {count > 0 && (
                                  <span className={`text-[11px] font-bold px-3 py-1.5 rounded-lg neo-in ${cat.color}`}>
                                    {count} أمثلة
                                  </span>
                               )}
                            </div>
                            <h3 className={`text-xl font-bold ${t.text} mb-3 group-hover:text-[#b48f27] dark:group-hover:text-[#d4af37] transition-colors`}>{cat.title}</h3>
                            <p className={`${t.textMuted} text-sm leading-relaxed font-medium`}>{cat.desc}</p>
                         </div>
                       );
                     })}
                   </div>
                 ) : (
                   // شبكة الأمثلة داخل القسم المختار
                   <div className="mt-4">
                     {(() => {
                        const categoryExamples = encyclopediaData.filter(ex => {
                            if (!ex.categoryId) return false;
                            const catStr = String(ex.categoryId).toLowerCase();
                            return catStr === activeEncycCategory.id.toLowerCase() || catStr === activeEncycCategory.title.toLowerCase() || activeEncycCategory.title.toLowerCase().includes(catStr) || catStr.includes(activeEncycCategory.title.toLowerCase());
                        });
                        
                        if (categoryExamples.length === 0) {
                          return (
                            <div className={`py-24 neo-in rounded-3xl text-center`}>
                               <Library className={`w-14 h-14 ${t.textMuted} mx-auto mb-4 opacity-50`} />
                               <h3 className={`text-2xl font-bold ${t.text} mb-3`}>لا توجد أمثلة بعد</h3>
                               <p className={`${t.textMuted} max-w-md mx-auto text-base font-bold`}>ستظهر الأمثلة هنا بمجرد إضافتك لها في قاعدة البيانات.</p>
                            </div>
                          );
                        }

return (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            {categoryExamples.map((example, idx) => (
                              <div key={idx} className={`neo-out rounded-3xl p-6 md:p-8 transition-all relative overflow-hidden flex flex-col h-full`}>
                                {/* الخط الجانبي التجميلي */}
                                <div className={`absolute top-0 right-0 w-1.5 h-full ${activeEncycCategory.bg.replace('/10', '')} opacity-50`}></div>
                                
                                {/* 🌟 عنوان المثال ورقم الآية */}
                                <div className="flex justify-between items-start mb-5">
                                   <h3 className={`text-lg md:text-xl font-bold flex items-start leading-relaxed`} style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                                     <Sparkles className={`w-6 h-6 ml-2 shrink-0 ${activeEncycCategory.color}`} />
                                     {example.title}
                                   </h3>
                                   {example.surahId && example.ayahNumbers && example.ayahNumbers.length > 0 && (
                                      <span className={`text-[10px] md:text-xs neo-in font-bold px-3 py-1.5 rounded-lg whitespace-nowrap mr-3`} style={{ color: isDarkMode ? '#2dd4bf' : '#0f766e' }}>
                                        آية {example.ayahNumbers.join(', ')}
                                      </span>
                                   )}
                                </div>
                                 
                                {/* 🌟 النص القرآني (أخضر ملكي نهاراً / ذهبي ليلاً) */}
                                <div className={`neo-in p-6 rounded-2xl mb-6 text-center`}>
                                  <p className="font-['Amiri_Quran'] text-2xl md:text-3xl leading-[3.5rem] md:leading-[4rem] transition-colors" style={{ color: isDarkMode ? '#d4af37' : '#065f46' }}>
                                     "{example.quranText}"
                                  </p>
                                </div>
                                 
                                {/* 🌟 شارة الإحصاء (معالجة البهتان وتلوين النتيجة بالبنفسجي) */}
                                <div className="flex flex-wrap justify-center gap-3 mb-6">
                                  <span className={`neo-in text-sm md:text-base font-black px-5 py-3 rounded-xl border border-black/5 dark:border-white/5`}>
                                     <span style={{ color: isDarkMode ? '#e2e8f0' : '#1e293b' }}>
                                       {example.metricType}:
                                     </span> 
                                     <span className="ml-1.5 inline-block" style={{ color: isDarkMode ? '#c084fc' : '#9333ea' }} dir="ltr">
                                       {example.metricValue}
                                     </span>
                                  </span>
                                </div>
                                 
                                {/* 🌟 نص الشرح والتفاصيل */}
                                <p className={`text-sm md:text-base font-medium leading-relaxed mb-8 flex-grow`} style={{ color: isDarkMode ? '#cbd5e1' : '#334155' }}>
                                  {example.explanation}
                                </p>
                                 
                                {/* 🌟 المصدر بالأسفل */}
                                <div className={`border-t border-black/5 dark:border-white/5 pt-4 mt-auto`}>
                                  <p className={`text-xs font-bold flex items-center`} style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>
                                    <BookOpen className="w-4 h-4 ml-1.5 shrink-0" />
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

{/* لوحة التحكم السفلية بالنيومورفيزم المتكامل (بعد التنحيف لزيادة مساحة القراءة) */}
      {activeTab === 'main' && (
        <div className={`fixed bottom-0 left-0 right-0 neo-out border-b-0 rounded-b-none p-1.5 md:p-2 z-50 rounded-t-3xl transition-all duration-300`}>
          
{/* قائمة التمشيط المنسدلة للأعلى */}
          {showToolsMenu && (
            <div className={`absolute bottom-full left-0 right-0 mx-auto mb-3 w-[92%] md:w-[420px] neo-out rounded-2xl md:rounded-3xl p-3 md:p-4 animate-fade-in-up z-50 flex flex-col max-h-[65vh]`}>
              
              <div className={`flex justify-between items-center mb-2 md:mb-3 px-2 pb-2 border-b border-black/5 dark:border-white/5 shrink-0`}>
                <span className={`font-bold ${t.text} text-sm md:text-lg flex items-center`}>
                  <Layers className="w-4 h-4 md:w-5 md:h-5 ml-2 text-[#b48f27] dark:text-[#d4af37]"/> التمشيط والاستكشاف
                </span>
                <button onClick={() => setShowToolsMenu(false)} className={`${t.textMuted} hover:text-red-600 dark:hover:text-red-500 neo-out active:neo-in rounded-xl p-1.5 transition-colors`}>
                  <X className="w-4 h-4 md:w-5 md:h-5"/>
                </button>
              </div>

              <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 pb-1">
                  <button onClick={() => runDiscovery('19_letters')} className={`w-full flex items-center text-right p-2.5 md:p-3 neo-out active:neo-in rounded-xl transition-all`}>
                    <div className="neo-in p-2 md:p-2.5 rounded-lg ml-3 shrink-0"><Scale className="w-4 h-4 md:w-5 md:h-5 text-emerald-700 dark:text-emerald-500"/></div>
                    <div>
                      <p className={`font-bold text-xs md:text-base ${t.text}`}>مضاعفات 19 (في الحروف)</p>
                      <p className={`text-[9px] md:text-xs ${t.textMuted} mt-0.5 md:mt-1`}>نصوص عدد حروفها يقبل القسمة على 19</p>
                    </div>
                  </button>
                  
                  <button onClick={() => runDiscovery('19_values')} className={`w-full flex items-center text-right p-2.5 md:p-3 neo-out active:neo-in rounded-xl transition-all`}>
                    <div className="neo-in p-2 md:p-2.5 rounded-lg ml-3 shrink-0"><Hash className="w-4 h-4 md:w-5 md:h-5 text-emerald-700 dark:text-emerald-500"/></div>
                    <div>
                      <p className={`font-bold text-xs md:text-base ${t.text}`}>مضاعفات 19 (في القيم العددية)</p>
                      <p className={`text-[9px] md:text-xs ${t.textMuted} mt-0.5 md:mt-1`}>نصوص قيمتها تقبل القسمة على 19</p>
                    </div>
                  </button>
                  
                  <button onClick={() => runDiscovery('balance_letters')} className={`w-full flex items-center text-right p-2.5 md:p-3 neo-out active:neo-in rounded-xl transition-all`}>
                   <div className="neo-in p-2 md:p-2.5 rounded-lg ml-3 shrink-0"><Scale className="w-4 h-4 md:w-5 md:h-5 text-cyan-700 dark:text-cyan-500"/></div>
                    <div>
                      <p className={`font-bold text-xs md:text-base ${t.text}`}>توازنات الحروف (نصين فأكثر)</p>
                      <p className={`text-[9px] md:text-xs ${t.textMuted} mt-0.5 md:mt-1`}>تطابق نصوص منفصلة في عدد الحروف</p>
                    </div>
                  </button>
                  
                  <button onClick={() => runDiscovery('balance_values')} className={`w-full flex items-center text-right p-2.5 md:p-3 neo-out active:neo-in rounded-xl transition-all`}>
                    <div className="neo-in p-2 md:p-2.5 rounded-lg ml-3 shrink-0"><Hash className="w-4 h-4 md:w-5 md:h-5 text-purple-700 dark:text-purple-500"/></div>
                    <div>
                      <p className={`font-bold text-xs md:text-base ${t.text}`}>توازنات القيم (نصين فأكثر)</p>
                      <p className={`text-[9px] md:text-xs ${t.textMuted} mt-0.5 md:mt-1`}>تطابق نصوص منفصلة في حساب الجُمَّل</p>
                    </div>
                  </button>
              </div>
            </div>
          )}

{/* 🌟 شريط أدوات التحديد مع أسهم التوجيه الذكية */}
          <div className="relative max-w-4xl mx-auto w-full mb-1">
            
            {/* السهم الأيمن (تصميم دائري طافي لتجنب ظلال المتصفحات المزعجة) */}
            {showRightArrow && (
              <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none md:hidden">
                 <div className="w-7 h-7 rounded-full neo-out flex items-center justify-center shadow-sm">
                   <ChevronRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                 </div>
              </div>
            )}

<div 
              ref={toolsScrollRef}
              onScroll={handleToolsScroll}
              className="flex items-center overflow-x-auto hide-scrollbar flex-nowrap gap-2 w-full px-2 py-2"
            >
              {(selectedWords.size > 0 || selectedAyahs.size > 0) && (
                <button onClick={handleCopySelectedText} className="shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all neo-out active:neo-in text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  <Copy className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5" /> نسخ التحديد
                </button>
              )}

              {/* 🌟 الزر الجديد: تصفح حر (الوضع الافتراضي للقراءة) */}
              <button onClick={() => { setSelectionMode('none'); clearSelection(); setShowToolsMenu(false); }} className={`shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${selectionMode === 'none' ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `neo-out active:neo-in ${t.text} hover:text-[#b48f27] dark:hover:text-[#d4af37]`}`}>
                <Hand className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 text-[#b48f27] dark:text-[#d4af37]" /> تصفح حر
              </button>
              
              <button onClick={() => { setSelectionMode('word'); clearSelection(); setShowToolsMenu(false); }} className={`shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${selectionMode === 'word' ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `neo-out active:neo-in ${t.text} hover:text-[#b48f27] dark:hover:text-[#d4af37]`}`}>
                <Type className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 text-[#b48f27] dark:text-[#d4af37]" /> تحديد حر
              </button>
              
              <button onClick={() => { setSelectionMode('ayah'); clearSelection(); setShowToolsMenu(false); }} className={`shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all whitespace-nowrap ${selectionMode === 'ayah' ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `neo-out active:neo-in ${t.text} hover:text-[#b48f27] dark:hover:text-[#d4af37]`}`}>
                <Book className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 text-[#b48f27] dark:text-[#d4af37]" /> تحديد آيات
              </button>
              
              {(selectedWords.size > 0 || selectedAyahs.size > 0) && (
                <>
                  <button onClick={() => setIsExportModalOpen(true)} className="shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all neo-out active:neo-in text-[#b48f27] dark:text-[#d4af37] whitespace-nowrap">
                    <Share2 className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5" /> تصدير
                  </button>
                  <button onClick={handleAddToStash} className="shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all neo-out active:neo-in text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    <Plus className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5" /> إضافة
                  </button>
                  {stashedResults.length > 0 && (
                    <button onClick={() => setIsCanvasModalOpen(true)} className="shrink-0 flex items-center px-4 py-2 rounded-xl text-[11px] md:text-sm font-bold transition-all neo-in text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      اللوحة ({stashedResults.length})
                    </button>
                  )}
                </>
              )}
            </div>

            {/* السهم الأيسر */}
            {showLeftArrow && (
              <div className="absolute left-1 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none md:hidden">
                 <div className="w-7 h-7 rounded-full neo-out flex items-center justify-center shadow-sm">
                   <ChevronLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                 </div>
              </div>
            )}
          </div>
          
          {/* 🌟 الأزرار الثلاثة الرئيسية (قابلة للسحب إذا ضاقت الشاشة جداً) */}
          <div className="flex items-center overflow-x-auto hide-scrollbar flex-nowrap gap-2 md:gap-3 max-w-4xl mx-auto w-full px-2 pb-1">
            <button onClick={handleCalculateStats} className={`shrink-0 min-w-[110px] flex-1 flex flex-row items-center justify-center neo-out active:neo-in ${t.text} py-2.5 rounded-xl font-bold transition-all whitespace-nowrap`}>
              <BarChart3 className="w-4 h-4 ml-1.5 text-indigo-700 dark:text-indigo-400" /> <span className="text-xs md:text-sm tracking-wide">1. إحصاء النص</span>
            </button>
            
            <button onClick={() => { if(discoveries.length > 0) clearSelection(); else setShowToolsMenu(!showToolsMenu); }} disabled={isDiscovering} className={`shrink-0 min-w-[150px] flex-[1.5] flex flex-row items-center justify-center py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${discoveries.length > 0 ? 'neo-in text-red-600 dark:text-red-500' : (showToolsMenu ? 'neo-in text-[#b48f27] dark:text-[#d4af37]' : `neo-out active:neo-in text-[#b48f27] dark:text-[#d4af37]`)}`}>
              {discoveries.length > 0 ? <X className="w-4 h-4 ml-1.5" /> : <ListFilter className={`w-4 h-4 ml-1.5 ${isDiscovering ? 'animate-pulse' : ''}`} />}
              <span className="text-xs md:text-sm tracking-wide">{isDiscovering ? 'جاري التمشيط...' : (discoveries.length > 0 ? 'إلغاء البحث' : '2. تمشيط واستكشاف')}</span>
            </button>

            <button onClick={() => {setActiveTab('library'); setShowToolsMenu(false);}} className={`shrink-0 min-w-[100px] flex-1 flex flex-row items-center justify-center neo-out active:neo-in ${t.text} py-2.5 rounded-xl font-bold transition-all relative whitespace-nowrap`}>
              <BookmarkPlus className="w-4 h-4 ml-1.5 text-[#b48f27] dark:text-[#d4af37]" /> <span className="text-xs md:text-sm tracking-wide">مكتبتي</span>
              {savedDiscoveries.length > 0 && <span className="absolute -top-1 -left-1 neo-in text-white bg-red-600 dark:bg-transparent dark:text-red-500 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{savedDiscoveries.length}</span>}
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
        
        /* 🌟 النيومورفيزم للوضع النهاري (حواف حادة بخيط أبيض وظلال أقوى وأكثر حدة) */
        .neo-out {
            box-shadow: 4px 4px 8px rgba(140, 155, 175, 0.75), 
                       -4px -4px 8px rgba(255, 255, 255, 1);
           background-color: #e2e8f0; /* درجة رمادية دافئة ومريحة تخفف السطوع */
            border: 1px solid rgba(255, 255, 255, 1);
        }
        .neo-in {
            box-shadow: inset 3px 3px 6px rgba(140, 155, 175, 0.75), 
                        inset -3px -3px 6px rgba(255, 255, 255, 1);
            background-color: #e8ecef;
            border: 1px solid rgba(255, 255, 255, 0.5);
        }
        
        /* 🌟 الوضع الليلي (ظلال أقوى، أضيق، وإطار أبيض دقيق وواضح) */
        .dark .neo-out {
            box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.75), 
                       -3px -3px 6px rgba(255, 255, 255, 0.08);
            background-color: #0f172a; 
            border: 1px solid rgba(255, 255, 255, 0.15);
        }
        .dark .neo-in {
            box-shadow: inset 4px 4px 8px rgba(0, 0, 0, 0.8), 
                        inset -2px -2px 5px rgba(255, 255, 255, 0.05);
            background-color: #0f172a; 
            border: 1px solid rgba(0, 0, 0, 0.4);
        }
        
        /* أنيميشن النبض المزدوج للآيات الإعجازية */
        @keyframes doubleGlowPulse {
            0% { filter: drop-shadow(0 0 0px transparent); color: inherit; }
            20% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.9)); color: #d4af37; }
            40% { filter: drop-shadow(0 0 2px rgba(212,175,55,0.3)); color: #b48f27; }
            60% { filter: drop-shadow(0 0 8px rgba(212,175,55,0.9)); color: #d4af37; }
            100% { filter: drop-shadow(0 0 4px rgba(212,175,55,0.6)); color: #d4af37; }
        }
        
        .reading-mode .miracle-ayah-wrapper:hover .miracle-word {
            animation: doubleGlowPulse 1.2s ease-in-out forwards;
        }
      `}} />
      
{/* 🌟 نافذة تصدير الإحصائيات */}
          {isExportModalOpen && (
              (() => {
                  const scope = getSearchScope();
                  if (scope.length === 0) return null;
                  
                  let actualText = "";
                  for (let i = 0; i < scope.length; i++) {
                      const currentItem = scope[i];
                      const nextItem = scope[i + 1];
                      actualText += currentItem.text;
                      const currentAyaNum = currentItem.ayahId;
                      const nextAyaNum = nextItem ? nextItem.ayahId : null;
                      if (currentAyaNum !== undefined && currentAyaNum !== null && currentAyaNum !== nextAyaNum) {
                          actualText += ` ﴿${currentAyaNum}﴾ `;
                      } else {
                          actualText += " ";
                      }
                  }
                  actualText = actualText.trim();
                  let currentWords = scope.length;
                  let currentLetters = 0;
                  let currentValue = 0;
                  scope.forEach(fw => { currentLetters += fw.letterCount; currentValue += fw.value; });

                  const isWords19 = currentWords > 0 && currentWords % 19 === 0;
                  const isLetters19 = currentLetters > 0 && currentLetters % 19 === 0;
                  const isValue19 = currentValue > 0 && currentValue % 19 === 0;

                  const wordsExportText = isWords19 ? `${currentWords} كلمة (19 × ${currentWords / 19})` : `${currentWords} كلمة`;
                  const lettersExportText = isLetters19 ? `${currentLetters} حرف (19 × ${currentLetters / 19})` : `${currentLetters} حرف`;
                  const valueExportText = isValue19 ? `${currentValue} (19 × ${currentValue / 19})` : `${currentValue}`;

                  return (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          {/* 🌟 الغلاف الخارجي: يعتمد على t.panel ليتطابق مع الثيم 100% مع ظل داكن قوي */}
                          <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border ${t.border} rounded-3xl p-6 md:p-8 w-full max-w-lg animate-fade-in-up`}>
                              <div className="flex justify-between items-center mb-6">
                                  <h3 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
                                      <Share2 className="w-6 h-6 text-[#d4af37]"/> تصدير الإحصائية
                                  </h3>
                                  <button onClick={() => setIsExportModalOpen(false)} className={`${t.textMuted} hover:${t.text} neo-out p-2 rounded-xl transition-colors`}>
                                      <X className="w-5 h-5"/>
                                  </button>
                              </div>

                              <div className="neo-in p-6 rounded-2xl mb-6 text-right select-all">
                                  <p className="mb-6 text-[#d4af37] text-xl leading-relaxed text-center" style={{ fontFamily: "'Amiri Quran', serif" }}>
                                      "{actualText}"
                                  </p>
                                  
                                  <div className="space-y-4 text-sm neo-in p-4 rounded-xl border border-white/40 dark:border-white/5">
                                      <div className="flex justify-between items-center">
                                          <span className="text-cyan-600 dark:text-cyan-400 font-bold">عدد الكلمات:</span>
                                          <span className={`${t.text} font-bold flex items-center gap-2 text-lg`}>
                                              {isWords19 && <span className="text-emerald-500 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20" dir="ltr">19 × {currentWords / 19}</span>}
                                              {currentWords} كلمة
                                          </span> 
                                      </div>
                                      <div className="flex justify-between items-center">
                                          <span className="text-cyan-600 dark:text-cyan-400 font-bold">عدد الحروف:</span>
                                          <span className={`${t.text} font-bold flex items-center gap-2 text-lg`}>
                                              {isLetters19 && <span className="text-emerald-500 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20" dir="ltr">19 × {currentLetters / 19}</span>}
                                              {currentLetters} حرف
                                          </span> 
                                      </div>
                                      <div className={`flex justify-between items-center border-t ${t.border} pt-3 mt-3`}>
                                          <span className="text-[#d4af37] font-bold">القيمة العددية:</span>
                                          <span className="text-[#d4af37] font-bold flex items-center gap-2 text-lg">
                                              {isValue19 && <span className="text-emerald-500 text-xs bg-emerald-400/10 px-2 py-0.5 rounded-md border border-emerald-400/20" dir="ltr">19 × {currentValue / 19}</span>}
                                              {currentValue}
                                          </span> 
                                      </div>
                                  </div>
                                  
                                  <p className={`text-xs ${t.textMuted} text-center mt-5`}>تم الإحصاء بواسطة تطبيق الرَّقِيم</p>
                              </div>

                              <div className="flex gap-4">
                                  <button onClick={() => {
                                          const exportText = `النص: ${actualText}\nعدد الكلمات: ${wordsExportText}\nعدد الحروف: ${lettersExportText}\nالقيمة العددية: ${valueExportText}\n\nتم الإحصاء بواسطة تطبيق الرَّقِيم`;
                                          navigator.clipboard.writeText(exportText);
                                          setIsExportModalOpen(false);
                                      }}
                                      className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 shadow-lg transition-colors"
                                  >
                                      <Copy className="w-5 h-5" /> نسخ التقرير
                                  </button>
                                  <button onClick={() => {
                                          const exportText = `النص: ${actualText}\r\nعدد الكلمات: ${wordsExportText}\r\nعدد الحروف: ${lettersExportText}\r\nالقيمة العددية: ${valueExportText}\r\n\r\nتم الإحصاء بواسطة تطبيق الرَّقِيم`;
                                          const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
                                          const url = URL.createObjectURL(blob);
                                          const link = document.createElement('a'); link.href = url; link.download = 'إحصائية_الرقيم.txt'; link.click(); URL.revokeObjectURL(url);
                                      }}
                                      className={`flex-1 neo-out font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-colors ${t.text}`}
                                  >
                                      <Download className="w-5 h-5" /> حفظ كملف
                                  </button>
                              </div>
                          </div>
                      </div>
                  );
              })()
          )}
          <Analytics />

{/* 🌟 نافذة اللوحة الفنية للتقرير المجمع (Canvas) */}
          {isCanvasModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className={`${t.panel} shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] border ${t.border} rounded-3xl w-full max-w-2xl animate-fade-in-up my-auto flex flex-col max-h-[90vh]`}>

                <div className={`flex justify-between items-center p-6 border-b ${t.border} shrink-0`}>
                  <h3 className={`text-xl font-bold ${t.text} flex items-center gap-2`}>
                    <Share2 className="w-6 h-6 text-[#b48f27] dark:text-[#d4af37]" /> التقرير الإحصائي المجمع
                  </h3>
                  <button onClick={() => setIsCanvasModalOpen(false)} className={`${t.textMuted} hover:text-red-600 dark:hover:text-red-500 neo-out active:neo-in p-2.5 rounded-xl transition-colors`}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto custom-scrollbar p-6 grow">
                  <div id="export-canvas-container" className="neo-in p-6 md:p-8 rounded-3xl relative">
                    
                    <div className={`text-center mb-8 border-b ${t.border} pb-6`}>
                      <h2 className="text-3xl font-black text-[#b48f27] dark:text-[#d4af37] mb-2 tracking-wide">الرَّقِيم</h2>
                      <p className={`text-sm ${t.textMuted} font-bold`}>التقرير الإحصائي المجمع للآيات</p>
                    </div>

<div className="space-y-6">
                      {stashedResults.map((item, index) => {
                        const isWords19 = item.wordCount > 0 && item.wordCount % 19 === 0;
                        const isLetters19 = item.count > 0 && item.count % 19 === 0;
                        const isValue19 = item.numericalValue > 0 && item.numericalValue % 19 === 0;

                        // 🌟 نظام الألوان الذكي والمباشر (لضمان تطبيقه دائماً)
                        const color19 = isDarkMode ? '#c084fc' : '#9333ea'; // بنفسجي للإعجاز ومضاعفات 19
                        const colorTextNormal = isDarkMode ? '#38bdf8' : '#0284c7'; // أزرق سماوي للكلمات والحروف
                        const colorValueNormal = isDarkMode ? '#d4af37' : '#065f46'; // ذهبي/أخضر للقيمة العددية
                        
                        // تحديد لون كل صف بناءً على النتيجة
                        const colorWord = isWords19 ? color19 : colorTextNormal;
                        const colorLetter = isLetters19 ? color19 : colorTextNormal;
                        const colorValue = isValue19 ? color19 : colorValueNormal;

                        // تصميم شارة (19 × N) لتتطابق مع اللون البنفسجي
                        const badgeStyle = {
                          backgroundColor: isDarkMode ? 'rgba(192, 132, 252, 0.15)' : 'rgba(147, 51, 234, 0.1)',
                          borderColor: isDarkMode ? 'rgba(192, 132, 252, 0.3)' : 'rgba(147, 51, 234, 0.2)',
                          borderWidth: '1px',
                          borderStyle: 'solid'
                        };

                        let referenceText = "";
                        if (item.surahName || item.surahId) {
                          const sName = item.surahName || (typeof quranDatabase !== 'undefined' && quranDatabase.find(s => s.id === item.surahId)?.name) || "";
                          const aNum = item.ayahNumber || (item.ayahNumbers ? item.ayahNumbers.join(', ') : "");
                          if (sName && aNum) referenceText = `سُورَةُ ${sName}: ${aNum}`;
                          else if (sName) referenceText = `سُورَةُ ${sName}`;
                        } else if (item.reference) {
                          referenceText = item.reference;
                        }

                        return (
                          <div key={item.id} className="neo-out rounded-2xl p-6 relative mt-4">
                            <div className="absolute top-0 right-0 bg-gradient-to-r from-[#d4af37] to-[#b48f27] text-white text-xs font-bold px-4 py-1.5 rounded-bl-2xl rounded-tr-2xl shadow-sm">
                              نتيجة {index + 1}
                            </div>
                            
{/* 🌟 النص القرآني والتوثيق (بدون تعريض الخط للحفاظ على جمالية التشكيل) */}
                            <div className="mt-8 mb-6 text-center leading-loose px-2">
                              <span 
                                className="text-xl md:text-2xl transition-colors" 
                                style={{ color: isDarkMode ? '#d4af37' : '#065f46', fontFamily: "'Amiri Quran', serif", lineHeight: '2.2' }}>
                                "{item.text}"
                              </span>
                              {referenceText && (
                                <span 
                                  className="inline-block mr-2 text-sm md:text-base transition-colors" 
                                  style={{ color: isDarkMode ? '#2dd4bf' : '#0f766e', fontFamily: "'Amiri Quran', serif" }}>
                                  [{referenceText}]
                                </span>
                              )}
                            </div>

{/* 🌟 منطقة الإحصائيات (باستخدام الجدول في جميع الأسطر لضمان محاذاة رأسية مطلقة) */}
                            <div className="space-y-4 neo-in p-4 rounded-xl w-full">
                              
                              {/* عدد الكلمات */}
                              <div className="flex justify-between items-center w-full">
                                <span className="font-bold shrink-0" style={isDarkMode ? { color: '#38bdf8' } : { color: isWords19 ? '#9333ea' : '#0284c7' }}>عدد الكلمات:</span>
                                <table style={{ borderCollapse: 'collapse', borderSpacing: 0, margin: 0, padding: 0 }}>
                                  <tbody><tr>
                                    {isWords19 && <td style={{ padding: 0, paddingRight: '12px', verticalAlign: 'middle' }}><div dir="ltr" className="text-xs px-2 py-0.5 rounded-md border" style={isDarkMode ? { color: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.2)' } : { color: '#9333ea', backgroundColor: 'rgba(147, 51, 234, 0.1)', borderColor: 'rgba(147, 51, 234, 0.2)' }}>19 × {item.wordCount / 19}</div></td>}
                                    <td style={{ padding: 0, verticalAlign: 'middle', textAlign: 'left' }}><span className="font-bold text-lg" style={isDarkMode ? { color: '#f8fafc' } : { color: isWords19 ? '#9333ea' : '#0284c7' }}>{item.wordCount} كلمة</span></td>
                                  </tr></tbody>
                                </table>
                              </div>
                              
                              {/* عدد الحروف */}
                              <div className="flex justify-between items-center w-full">
                                <span className="font-bold shrink-0" style={isDarkMode ? { color: '#38bdf8' } : { color: isLetters19 ? '#9333ea' : '#0284c7' }}>عدد الحروف:</span>
                                <table style={{ borderCollapse: 'collapse', borderSpacing: 0, margin: 0, padding: 0 }}>
                                  <tbody><tr>
                                    {isLetters19 && <td style={{ padding: 0, paddingRight: '12px', verticalAlign: 'middle' }}><div dir="ltr" className="text-xs px-2 py-0.5 rounded-md border" style={isDarkMode ? { color: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', borderColor: 'rgba(52, 211, 153, 0.2)' } : { color: '#9333ea', backgroundColor: 'rgba(147, 51, 234, 0.1)', borderColor: 'rgba(147, 51, 234, 0.2)' }}>19 × {item.count / 19}</div></td>}
                                    <td style={{ padding: 0, verticalAlign: 'middle', textAlign: 'left' }}><span className="font-bold text-lg" style={isDarkMode ? { color: '#f8fafc' } : { color: isLetters19 ? '#9333ea' : '#0284c7' }}>{item.count} حرف</span></td>
                                  </tr></tbody>
                                </table>
                              </div>
                              
{/* القيمة العددية (معادلة حرة بدون صندوق لتفادي مشاكل الحجم والمحاذاة عند التصدير) */}
                              <div className="flex justify-between items-center border-t border-slate-200 dark:border-white/10 pt-3 mt-2 w-full">
                                <span className="text-[#d4af37] font-bold shrink-0">القيمة العددية:</span>
                                
                                <table style={{ borderCollapse: 'collapse', borderSpacing: 0, margin: 0, padding: 0, backgroundColor: 'transparent' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ padding: 0, verticalAlign: 'middle', textAlign: 'center' }}>
                                        
                                        {/* الرقم الأساسي (مع مسافة سفلية بسيطة تفصله عن المعادلة) */}
                                        <div className="text-[#d4af37] font-bold text-xl leading-none" style={{ paddingBottom: isValue19 ? '6px' : '0' }}>
                                          {item.numericalValue}
                                        </div>
                                        
                                        {/* المعادلة كنص حر متمركز (بدون صندوق، بخط أوضح) */}
                                        {isValue19 && (
                                          <div dir="ltr" className="font-bold whitespace-nowrap" style={{ fontSize: '17px', color: '#10b981' }}>
                                            ( 19 × {item.numericalValue / 19} )
                                          </div>
                                        )}
                                        
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    <p className={`text-xs ${t.textMuted} font-bold text-center mt-8`}>تم الإحصاء بواسطة تطبيق الرَّقِيم</p>
                  </div>
                </div>

{/* 🌟 أزرار التحكم (بدون شريط أسود + الزر التفاعلي الذكي) */}
                <div className={`p-6 border-t ${t.border} flex gap-3 shrink-0 rounded-b-3xl`}>
                  
                  {/* زر التصدير الذكي (يتغير نصه ولونه بناءً على الحالة) */}
                  <button 
                    onClick={handleExportCanvas}
                    disabled={exportStatus !== 'idle'}
                    className={`flex-[2] font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all duration-300 ${
                      exportStatus === 'success' 
                        ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.4)]' 
                        : exportStatus === 'error'
                        ? 'bg-red-600 text-white'
                        : 'bg-teal-700 hover:bg-teal-600 text-white dark:bg-teal-600 dark:hover:bg-teal-500'
                    } ${exportStatus === 'loading' ? 'opacity-80 cursor-default' : ''}`}
                  >
                    {exportStatus === 'idle' && (
                      <><Download className="w-5 h-5" /> تصدير اللوحة كصورة</>
                    )}
                    {exportStatus === 'loading' && (
                      <span className="animate-pulse">جاري التصدير...</span>
                    )}
                    {exportStatus === 'success' && (
                      <span className="flex items-center gap-2 drop-shadow-md">تم حفظ صورة التقرير! ✅</span>
                    )}
                    {exportStatus === 'error' && (
                      <span>حدث خطأ، حاول مجدداً ❌</span>
                    )}
                  </button>

                  {/* زر إفراغ اللوحة (متوافق مع الثيم النهاري والليلي) */}
                  <button 
                    onClick={() => {
                        if(window.confirm('هل أنت متأكد من إفراغ اللوحة وحذف كل النتائج؟')) {
                            setStashedResults([]);
                            setIsCanvasModalOpen(false);
                        }
                    }} 
                    disabled={exportStatus === 'loading'}
                    className={`flex-1 font-bold py-3 rounded-xl flex justify-center items-center transition-colors ${
                      exportStatus === 'loading' ? 'opacity-50 cursor-not-allowed' : ''
                    } bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-500/20 dark:hover:bg-red-500/40 dark:text-red-700 dark:hover:text-red-600`}
                  >
                    إفراغ اللوحة
                  </button>
                  
                </div>
              </div>
            </div>
          )}
    </div>
  );
}