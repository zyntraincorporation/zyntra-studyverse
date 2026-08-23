// ─────────────────────────────────────────────────────────────────────────────
// ZYNTRA StudyVerse — Master Syllabus Data
// Complete Static Syllabus for all 13 Subjects & 147 Chapters
// Single Source of Truth for Syllabus Structure
// ─────────────────────────────────────────────────────────────────────────────

const T = (id, slug, name) => ({ id, slug, name, type: 'topic' });
const CQ = (chId) => ({ id: `${chId}-cq`, slug: 'cq', name: 'CQ সমাধান', type: 'cq' });
const MCQ = (chId) => ({ id: `${chId}-mcq`, slug: 'mcq', name: 'MCQ সমাধান', type: 'mcq' });
const MOCK = (chId) => ({ id: `${chId}-mock`, slug: 'mock', name: 'মক টেস্ট', type: 'mock' });
const PMS = (chId) => [CQ(chId), MCQ(chId), MOCK(chId)];

export const SUBJECT_COLORS = {
  Physics1:   { bg: 'from-cyan-500/10 to-blue-500/10',     border: 'border-cyan-500/20',   text: 'text-cyan-400',   hex: '#06b6d4' },
  Physics2:   { bg: 'from-cyan-600/10 to-sky-500/10',      border: 'border-sky-500/20',    text: 'text-sky-400',    hex: '#0ea5e9' },
  Chemistry1: { bg: 'from-purple-500/10 to-pink-500/10',   border: 'border-purple-500/20', text: 'text-purple-400', hex: '#a855f7' },
  Chemistry2: { bg: 'from-violet-500/10 to-fuchsia-500/10',border: 'border-violet-500/20', text: 'text-violet-400', hex: '#8b5cf6' },
  Math1:      { bg: 'from-yellow-500/10 to-amber-500/10',  border: 'border-yellow-500/20', text: 'text-yellow-400', hex: '#f59e0b' },
  Math2:      { bg: 'from-orange-500/10 to-amber-600/10',  border: 'border-orange-500/20', text: 'text-orange-400', hex: '#f97316' },
  Botany:     { bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/20',  text: 'text-green-400',  hex: '#10b981' },
  Zoology:    { bg: 'from-red-500/10 to-rose-500/10',      border: 'border-red-500/20',    text: 'text-red-400',    hex: '#ef4444' },
  ICT:        { bg: 'from-indigo-500/10 to-blue-600/10',   border: 'border-indigo-500/20', text: 'text-indigo-400', hex: '#6366f1' },
  English1:   { bg: 'from-blue-500/10 to-indigo-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   hex: '#3b82f6' },
  English2:   { bg: 'from-sky-500/10 to-blue-400/10',      border: 'border-sky-400/20',    text: 'text-sky-300',    hex: '#38bdf8' },
  Bangla1:    { bg: 'from-pink-500/10 to-rose-400/10',     border: 'border-pink-500/20',   text: 'text-pink-400',   hex: '#ec4899' },
  Bangla2:    { bg: 'from-rose-500/10 to-pink-600/10',     border: 'border-rose-500/20',   text: 'text-rose-400',   hex: '#f43f5e' },
};

export const SUBJECT_DISPLAY_NAMES = {
  Physics1:   'পদার্থবিজ্ঞান ১ম পত্র',
  Physics2:   'পদার্থবিজ্ঞান ২য় পত্র',
  Chemistry1: 'রসায়ন ১ম পত্র',
  Chemistry2: 'রসায়ন ২য় পত্র',
  Math1:      'উচ্চতর গণিত ১ম পত্র',
  Math2:      'উচ্চতর গণিত ২য় পত্র',
  Botany:     'জীববিজ্ঞান ১ম পত্র (উদ্ভিদ)',
  Zoology:    'জীববিজ্ঞান ২য় পত্র (প্রাণী)',
  ICT:        'তথ্য ও যোগাযোগ প্রযুক্তি',
  English1:   'English 1st Paper',
  English2:   'English 2nd Paper',
  Bangla1:    'বাংলা ১ম পত্র',
  Bangla2:    'বাংলা ২য় পত্র',
};

export const SUBJECT_SHORT_NAMES = {
  Physics1:   'পদার্থ ১ম',
  Physics2:   'পদার্থ ২য়',
  Chemistry1: 'রসায়ন ১ম',
  Chemistry2: 'রসায়ন ২য়',
  Math1:      'গণিত ১ম',
  Math2:      'গণিত ২য়',
  Botany:     'উদ্ভিদবিজ্ঞান',
  Zoology:    'প্রাণিবিজ্ঞান',
  ICT:        'আইসিটি',
  English1:   'Eng 1st',
  English2:   'Eng 2nd',
  Bangla1:    'বাংলা ১ম',
  Bangla2:    'বাংলা ২য়',
};

export const BUET_SUBJECT_KEYS = ['Physics1', 'Physics2', 'Chemistry1', 'Chemistry2', 'Math1', 'Math2'];

export const HSC_SUBJECT_KEYS = [
  'Physics1', 'Physics2',
  'Chemistry1', 'Chemistry2',
  'Math1', 'Math2',
  'Botany', 'Zoology',
  'ICT',
  'English1', 'English2',
  'Bangla1', 'Bangla2',
];

export const SYLLABUS = {
  // ── পদার্থবিজ্ঞান ১ম পত্র ──────────────────────────────────────────────────
  Physics1: {
    id: 'Physics1',
    name: SUBJECT_DISPLAY_NAMES.Physics1,
    shortName: SUBJECT_SHORT_NAMES.Physics1,
    isBuet: true,
    color: SUBJECT_COLORS.Physics1,
    chapters: [
      {
        id: 'physics1-ch-01', legacyDocId: 'Physics1_1', chapterNumber: 1, chapterName: 'ভৌতজগৎ ও পরিমাপ',
        topics: [
          T('physics1-ch-01-t01', 't01', 'মাত্রা সমীকরণ দ্বারা সমীকরণের শুদ্ধতা যাচাই'),
          T('physics1-ch-01-t02', 't02', 'পরিমাপের ত্রুটি'),
          T('physics1-ch-01-t03', 't03', 'স্ক্রু-গজ, ভার্নিয়ার স্কেল, স্ফেরোমিটার ও নিক্তি'),
          T('physics1-ch-01-t04', 't04', 'বিভিন্ন এককের Conversion'),
          ...PMS('physics1-ch-01'),
        ],
      },
      {
        id: 'physics1-ch-02', legacyDocId: 'Physics1_2', chapterNumber: 2, chapterName: 'ভেক্টর',
        topics: [
          T('physics1-ch-02-t01', 't01', 'ভেক্টরের প্রকারভেদ ও আয়ত একক ভেক্টর দ্বারা ভেক্টরের প্রকাশ'),
          T('physics1-ch-02-t02', 't02', 'দুইটি ভেক্টরের লব্ধি'),
          T('physics1-ch-02-t03', 't03', 'ভেক্টরের উপাংশ'),
          T('physics1-ch-02-t04', 't04', 'নদী ও নৌকা'),
          T('physics1-ch-02-t05', 't05', 'ভেক্টর বিয়োগ ও আপেক্ষিক বেগ'),
          T('physics1-ch-02-t06', 't06', 'দুইয়ের অধিক ভেক্টরের লব্ধি'),
          T('physics1-ch-02-t07', 't07', 'ভেক্টরের ডট গুণন'),
          T('physics1-ch-02-t08', 't08', 'দিক কোসাইন'),
          T('physics1-ch-02-t09', 't09', 'ভেক্টরের ক্রস গুণন'),
          T('physics1-ch-02-t10', 't10', 'ভেক্টর ক্যালকুলাস'),
          ...PMS('physics1-ch-02'),
        ],
      },
      {
        id: 'physics1-ch-03', legacyDocId: 'Physics1_3', chapterNumber: 3, chapterName: 'গতিবিদ্যা',
        topics: [
          T('physics1-ch-03-t01', 't01', 'গতির সাধারণ সমীকরণের ব্যবহার'),
          T('physics1-ch-03-t02', 't02', 'উলম্ব গতি'),
          T('physics1-ch-03-t03', 't03', 'প্রক্ষিপ্ত বস্তুর গতি'),
          T('physics1-ch-03-t04', 't04', 'বৃত্তাকার গতি'),
          ...PMS('physics1-ch-03'),
        ],
      },
      {
        id: 'physics1-ch-04', legacyDocId: 'Physics1_4', chapterNumber: 4, chapterName: 'নিউটনীয় বলবিদ্যা',
        topics: [
          T('physics1-ch-04-t01', 't01', 'নিউটনের সূত্র'),
          T('physics1-ch-04-t02', 't02', 'বলের প্রকারভেদ'),
          T('physics1-ch-04-t03', 't03', 'বলের ঘাত ও ঘাত বল'),
          T('physics1-ch-04-t04', 't04', 'ভরবেগ, ভরবেগের সংরক্ষণ সূত্র ও সংঘর্ষ'),
          T('physics1-ch-04-t05', 't05', 'লিফট'),
          T('physics1-ch-04-t06', 't06', 'জড়তার ভ্রামক ও চক্রগতির ব্যাসার্ধ'),
          T('physics1-ch-04-t07', 't07', 'দ্বন্দ্ব ও টর্ক'),
          T('physics1-ch-04-t08', 't08', 'কৌণিক ভরবেগ'),
          T('physics1-ch-04-t09', 't09', 'কৌণিক গতিশক্তি'),
          T('physics1-ch-04-t10', 't10', 'কেন্দ্রমুখী বল ও সুতার টান'),
          T('physics1-ch-04-t11', 't11', 'রাস্তার ব্যাংকিং'),
          ...PMS('physics1-ch-04'),
        ],
      },
      {
        id: 'physics1-ch-05', legacyDocId: 'Physics1_5', chapterNumber: 5, chapterName: 'কাজ, শক্তি ও ক্ষমতা',
        topics: [
          T('physics1-ch-05-t01', 't01', 'কৃতকাজ'),
          T('physics1-ch-05-t02', 't02', 'স্প্রিং বল দ্বারা কৃতকাজ'),
          T('physics1-ch-05-t03', 't03', 'বিভবশক্তি ও গতিশক্তি'),
          T('physics1-ch-05-t04', 't04', 'কাজ-শক্তি উপপাদ্য'),
          T('physics1-ch-05-t05', 't05', 'ক্ষমতা'),
          T('physics1-ch-05-t06', 't06', 'কুয়া ও চৌবাচ্চা'),
          ...PMS('physics1-ch-05'),
        ],
      },
      {
        id: 'physics1-ch-06', legacyDocId: 'Physics1_6', chapterNumber: 6, chapterName: 'মহাকর্ষ ও অভিকর্ষ',
        topics: [
          T('physics1-ch-06-t01', 't01', 'মহাকর্ষীয় বলের সূত্রের ব্যবহার'),
          T('physics1-ch-06-t02', 't02', 'অভিকর্ষজ ত্বরণ'),
          T('physics1-ch-06-t03', 't03', 'মহাকর্ষীয় প্রাবল্য ও বিভব'),
          T('physics1-ch-06-t04', 't04', 'কেপলারের সূত্র'),
          T('physics1-ch-06-t05', 't05', 'মুক্তিবেগ'),
          T('physics1-ch-06-t06', 't06', 'উপগ্রহের গতি'),
          ...PMS('physics1-ch-06'),
        ],
      },
      {
        id: 'physics1-ch-07', legacyDocId: 'Physics1_7', chapterNumber: 7, chapterName: 'পদার্থের গাঠনিক ধর্ম',
        topics: [
          T('physics1-ch-07-t01', 't01', 'ইয়ং এর গুণাঙ্ক'),
          T('physics1-ch-07-t02', 't02', 'কাঠিন্যের গুণাঙ্ক'),
          T('physics1-ch-07-t03', 't03', 'আয়তন গুণাঙ্ক'),
          T('physics1-ch-07-t04', 't04', 'পয়সনের অনুপাত'),
          T('physics1-ch-07-t05', 't05', 'অসহ পীড়ন'),
          T('physics1-ch-07-t06', 't06', 'কৃতকাজ ও সঞ্চিত শক্তি'),
          T('physics1-ch-07-t07', 't07', 'সান্দ্রতা এবং স্টোকসের সূত্র'),
          T('physics1-ch-07-t08', 't08', 'পৃষ্ঠটান'),
          T('physics1-ch-07-t09', 't09', 'পৃষ্ঠশক্তি'),
          T('physics1-ch-07-t10', 't10', 'কৈশিকতা ও স্পর্শ কোণ'),
          T('physics1-ch-07-t11', 't11', 'তরল ফোঁটা ও বুদবুদের অভ্যন্তরস্থ অতিরিক্ত চাপ'),
          ...PMS('physics1-ch-07'),
        ],
      },
      {
        id: 'physics1-ch-08', legacyDocId: 'Physics1_8', chapterNumber: 8, chapterName: 'পর্যাবৃত্ত গতি',
        topics: [
          T('physics1-ch-08-t01', 't01', 'সরল ছন্দিত স্পন্দনের অন্তরক সমীকরণ'),
          T('physics1-ch-08-t02', 't02', 'সরল ছন্দিত স্পন্দন'),
          T('physics1-ch-08-t03', 't03', 'সরল দোলক'),
          T('physics1-ch-08-t04', 't04', 'সরল ছন্দিত গতি সম্পন্ন কণার শক্তি'),
          T('physics1-ch-08-t05', 't05', 'স্প্রিং'),
          ...PMS('physics1-ch-08'),
        ],
      },
      {
        id: 'physics1-ch-09', legacyDocId: 'Physics1_9', chapterNumber: 9, chapterName: 'তরঙ্গ',
        topics: [
          T('physics1-ch-09-t01', 't01', 'তরঙ্গ সংক্রান্ত বিভিন্ন রাশি'),
          T('physics1-ch-09-t02', 't02', 'অগ্রগামী তরঙ্গ ও স্থির তরঙ্গ'),
          T('physics1-ch-09-t03', 't03', 'বিট ও তরঙ্গের তীব্রতা'),
          T('physics1-ch-09-t04', 't04', 'টানা তার'),
          ...PMS('physics1-ch-09'),
        ],
      },
      {
        id: 'physics1-ch-10', legacyDocId: 'Physics1_10', chapterNumber: 10, chapterName: 'আদর্শ গ্যাস ও গ্যাসের সূত্রাবলি',
        topics: [
          T('physics1-ch-10-t01', 't01', 'বয়েল, চার্লস ও চাপীয় সূত্র'),
          T('physics1-ch-10-t02', 't02', 'আদর্শ গ্যাসের সমীকরণ'),
          T('physics1-ch-10-t03', 't03', 'বর্গমূল গড় বর্গবেগ'),
          T('physics1-ch-10-t04', 't04', 'গ্যাসের গতিতত্ত্ব ও গতিশক্তি'),
          T('physics1-ch-10-t05', 't05', 'গড় মুক্তপথ'),
          T('physics1-ch-10-t06', 't06', 'শিশিরাঙ্ক ও আপেক্ষিক আর্দ্রতা'),
          ...PMS('physics1-ch-10'),
        ],
      },
    ],
  },

  // ── পদার্থবিজ্ঞান ২য় পত্র ──────────────────────────────────────────────────
  Physics2: {
    id: 'Physics2',
    name: SUBJECT_DISPLAY_NAMES.Physics2,
    shortName: SUBJECT_SHORT_NAMES.Physics2,
    isBuet: true,
    color: SUBJECT_COLORS.Physics2,
    chapters: [
      {
        id: 'physics2-ch-01', legacyDocId: 'Physics2_1', chapterNumber: 1, chapterName: 'তাপগতিবিদ্যা',
        topics: [
          T('physics2-ch-01-t01', 't01', 'থার্মোমিটার ও তাপগতিবিদ্যার শূন্যতম সূত্র'),
          T('physics2-ch-01-t02', 't02', 'তাপগতিবিদ্যার প্রথম সূত্র'),
          T('physics2-ch-01-t03', 't03', 'যান্ত্রিক শক্তিকে তাপশক্তিতে রূপান্তর'),
          T('physics2-ch-01-t04', 't04', 'বিভিন্ন তাপগতীয় প্রক্রিয়ার সমীকরণ'),
          T('physics2-ch-01-t05', 't05', 'মোলার আপেক্ষিক তাপ'),
          T('physics2-ch-01-t06', 't06', 'তাপগতিবিদ্যার দ্বিতীয় সূত্র ও তাপীয় ইঞ্জিন'),
          T('physics2-ch-01-t07', 't07', 'রেফ্রিজারেটর'),
          T('physics2-ch-01-t08', 't08', 'এনট্রপি'),
          ...PMS('physics2-ch-01'),
        ],
      },
      {
        id: 'physics2-ch-02', legacyDocId: 'Physics2_2', chapterNumber: 2, chapterName: 'স্থির তড়িৎ',
        topics: [
          T('physics2-ch-02-t01', 't01', 'কুলম্বের সূত্রের ব্যবহার'),
          T('physics2-ch-02-t02', 't02', 'তড়িৎ ক্ষেত্রের প্রাবল্য'),
          T('physics2-ch-02-t03', 't03', 'তড়িৎ বিভব'),
          T('physics2-ch-02-t04', 't04', 'তড়িৎ দ্বিমেরু'),
          T('physics2-ch-02-t05', 't05', 'তড়িৎ ধারক ও ধারকত্ব'),
          T('physics2-ch-02-t06', 't06', 'সমান্তরাল ও গোলীয় পাত ধারক'),
          T('physics2-ch-02-t07', 't07', 'ধারকের সঞ্চিত শক্তি'),
          ...PMS('physics2-ch-02'),
        ],
      },
      {
        id: 'physics2-ch-03', legacyDocId: 'Physics2_3', chapterNumber: 3, chapterName: 'চল তড়িৎ',
        topics: [
          T('physics2-ch-03-t01', 't01', 'রোধ ও রোধের সমবায়'),
          T('physics2-ch-03-t02', 't02', 'বর্তনীতে ওহমের সূত্র প্রয়োগ'),
          T('physics2-ch-03-t03', 't03', 'বিদ্যুৎ কোষের সমবায়'),
          T('physics2-ch-03-t04', 't04', 'কির্শফের সূত্র'),
          T('physics2-ch-03-t05', 't05', 'হুইটস্টোন ব্রীজ নীতি'),
          T('physics2-ch-03-t06', 't06', 'মিটার ব্রীজ'),
          T('physics2-ch-03-t07', 't07', 'গ্যালভানোমিটার, অ্যামিটার ও ভোল্টমিটার'),
          T('physics2-ch-03-t08', 't08', 'জুলের তাপীয় ক্রিয়ার সূত্র'),
          T('physics2-ch-03-t09', 't09', 'বৈদ্যুতিক শক্তি ও ক্ষমতা'),
          ...PMS('physics2-ch-03'),
        ],
      },
      {
        id: 'physics2-ch-04', legacyDocId: 'Physics2_4', chapterNumber: 4, chapterName: 'তড়িৎ প্রবাহের চৌম্বক ক্রিয়া ও চুম্বকত্ব',
        topics: [
          T('physics2-ch-04-t01', 't01', 'চৌম্বকক্ষেত্রে গতিশীল চার্জ'),
          T('physics2-ch-04-t02', 't02', 'তড়িৎবাহী পরিবাহীর নিকটে চৌম্বকক্ষেত্র'),
          T('physics2-ch-04-t03', 't03', 'তড়িৎবাহী পরিবাহীর উপর বল'),
          T('physics2-ch-04-t04', 't04', 'তড়িৎবাহী বর্তনীর উপর টর্ক'),
          T('physics2-ch-04-t05', 't05', 'চৌম্বক আবেশ ও চুম্বকায়ন'),
          ...PMS('physics2-ch-04'),
        ],
      },
      {
        id: 'physics2-ch-05', legacyDocId: 'Physics2_5', chapterNumber: 5, chapterName: 'তড়িৎচৌম্বকীয় আবেশ ও পরিবর্তী প্রবাহ',
        topics: [
          T('physics2-ch-05-t01', 't01', 'চৌম্বক ফ্লাক্স ও ফ্যারাডের সূত্র'),
          T('physics2-ch-05-t02', 't02', 'স্বকীয় ও পারস্পরিক আবেশ'),
          T('physics2-ch-05-t03', 't03', 'দিক পরিবর্তী প্রবাহ'),
          T('physics2-ch-05-t04', 't04', 'ট্রান্সফর্মার'),
          ...PMS('physics2-ch-05'),
        ],
      },
      {
        id: 'physics2-ch-06', legacyDocId: 'Physics2_6', chapterNumber: 6, chapterName: 'জ্যামিতিক আলোকবিজ্ঞান',
        topics: [
          T('physics2-ch-06-t01', 't01', 'আলোর প্রতিফলন, প্রতিসরণ, প্রতিসরণাঙ্ক ও সংকট কোণ'),
          T('physics2-ch-06-t02', 't02', 'প্রিজমে প্রতিসরণ'),
          T('physics2-ch-06-t03', 't03', 'গোলীয় পৃষ্ঠে প্রতিসরণ, লেন্স ও রৈখিক বিবর্ধন'),
          T('physics2-ch-06-t04', 't04', 'লেন্সের ক্ষমতা ও তুল্য লেন্স'),
          T('physics2-ch-06-t05', 't05', 'সরল অণুবীক্ষণ যন্ত্র বা বিবর্ধক কাচ'),
          T('physics2-ch-06-t06', 't06', 'জটিল/যৌগিক অণুবীক্ষণ যন্ত্র'),
          T('physics2-ch-06-t07', 't07', 'নভো দূরবীক্ষণ যন্ত্র'),
          ...PMS('physics2-ch-06'),
        ],
      },
      {
        id: 'physics2-ch-07', legacyDocId: 'Physics2_7', chapterNumber: 7, chapterName: 'ভৌত আলোকবিজ্ঞান',
        topics: [
          T('physics2-ch-07-t01', 't01', 'ব্যতিচার'),
          T('physics2-ch-07-t02', 't02', 'অপবর্তন'),
          T('physics2-ch-07-t03', 't03', 'সমবর্তন'),
          T('physics2-ch-07-t04', 't04', 'পয়েন্টিং ভেক্টর'),
          ...PMS('physics2-ch-07'),
        ],
      },
      {
        id: 'physics2-ch-08', legacyDocId: 'Physics2_8', chapterNumber: 8, chapterName: 'আধুনিক পদার্থবিজ্ঞান',
        topics: [
          T('physics2-ch-08-t01', 't01', 'দৈর্ঘ্যের আপেক্ষিকতা'),
          T('physics2-ch-08-t02', 't02', 'সময়ের আপেক্ষিকতা এবং মহাকাশ ভ্রমণে আপেক্ষিকতা'),
          T('physics2-ch-08-t03', 't03', 'ভরের আপেক্ষিকতা এবং আইনস্টাইনের ভর-শক্তি সমীকরণ'),
          T('physics2-ch-08-t04', 't04', 'ফোটনের শক্তি'),
          T('physics2-ch-08-t05', 't05', 'এক্স রশ্মির নির্গমন'),
          T('physics2-ch-08-t06', 't06', 'আইনস্টাইনের আলোক তড়িৎ ক্রিয়া'),
          T('physics2-ch-08-t07', 't07', 'ডি ব্রগলীর তরঙ্গ এবং কণার ভরবেগ'),
          T('physics2-ch-08-t08', 't08', 'লরেঞ্জ রূপান্তর, মৌলিক বল এবং কৃষ্ণ বস্তু'),
          T('physics2-ch-08-t09', 't09', 'কম্পটন প্রভাব ও হাইজেনবার্গের অনিশ্চয়তা নীতি'),
          ...PMS('physics2-ch-08'),
        ],
      },
      {
        id: 'physics2-ch-09', legacyDocId: 'Physics2_9', chapterNumber: 9, chapterName: 'পরমাণুর মডেল ও নিউক্লিয়ার পদার্থবিজ্ঞান',
        topics: [
          T('physics2-ch-09-t01', 't01', 'হাইড্রোজেন পরমাণুর কক্ষপথের ব্যাসার্ধ, ইলেকট্রনের রৈখিক ও কৌণিক বেগ, কৌণিক ভরবেগ ও শক্তি'),
          T('physics2-ch-09-t02', 't02', 'হাইড্রোজেন পরমাণুর ধাপান্তরের শক্তি'),
          T('physics2-ch-09-t03', 't03', 'তেজস্ক্রিয় পদার্থের অর্ধায়ু ও গড় আয়ু এবং ক্ষয় সূত্রের ব্যবহার'),
          T('physics2-ch-09-t04', 't04', 'ভরত্রুটি ও বন্ধন শক্তি'),
          T('physics2-ch-09-t05', 't05', 'নিউক্লিয় ফিশন ও ফিউশন'),
          ...PMS('physics2-ch-09'),
        ],
      },
      {
        id: 'physics2-ch-10', legacyDocId: 'Physics2_10', chapterNumber: 10, chapterName: 'সেমিকন্ডাক্টর ও ইলেকট্রনিক্স',
        topics: [
          T('physics2-ch-10-t01', 't01', 'অর্ধপরিবাহী ও ডায়োড'),
          T('physics2-ch-10-t02', 't02', 'ট্রানজিস্টর'),
          T('physics2-ch-10-t03', 't03', 'সংখ্যা পদ্ধতি'),
          T('physics2-ch-10-t04', 't04', 'লজিক গেট'),
          ...PMS('physics2-ch-10'),
        ],
      },
      {
        id: 'physics2-ch-11', legacyDocId: 'Physics2_11', chapterNumber: 11, chapterName: 'জ্যোতির্বিজ্ঞান',
        topics: [
          T('physics2-ch-11-t01', 't01', 'মহাবিশ্বের সৃষ্টি, সম্প্রসারণ ও হাবল বিধি'),
          T('physics2-ch-11-t02', 't02', 'মহাবিশ্বের মূল বস্তু, সৌর ঔজ্জ্বল্য ও কৃষ্ণগহ্বর'),
          ...PMS('physics2-ch-11'),
        ],
      },
    ],
  },

  // ── রসায়ন ১ম পত্র ───────────────────────────────────────────────────────────
  Chemistry1: {
    id: 'Chemistry1',
    name: SUBJECT_DISPLAY_NAMES.Chemistry1,
    shortName: SUBJECT_SHORT_NAMES.Chemistry1,
    isBuet: true,
    color: SUBJECT_COLORS.Chemistry1,
    chapters: [
      {
        id: 'chemistry1-ch-01', legacyDocId: 'Chemistry1_1', chapterNumber: 1, chapterName: 'ল্যাবরেটরির নিরাপদ ব্যবহার',
        topics: [
          T('chemistry1-ch-01-t01', 't01', 'ল্যাবরেটরির ব্যবহার বিধি ও পরিমাপ যন্ত্র'),
          T('chemistry1-ch-01-t02', 't02', 'ঘনমাত্রা ও টাইট্রেশন'),
          T('chemistry1-ch-01-t03', 't03', 'তাপ প্রদান কৌশল'),
          T('chemistry1-ch-01-t04', 't04', 'রাসায়নিক দ্রব্যের সতর্কতা ও পরিমিত ব্যবহার'),
          ...PMS('chemistry1-ch-01'),
        ],
      },
      {
        id: 'chemistry1-ch-02', legacyDocId: 'Chemistry1_2', chapterNumber: 2, chapterName: 'গুণগত রসায়ন',
        topics: [
          T('chemistry1-ch-02-t01', 't01', 'পরমাণু ও আইসোটোপ সংক্রান্ত'),
          T('chemistry1-ch-02-t02', 't02', 'পরমাণু মডেল'),
          T('chemistry1-ch-02-t03', 't03', 'কোয়ান্টাম সংখ্যা, অরবিটাল ও ইলেকট্রন বিন্যাস'),
          T('chemistry1-ch-02-t04', 't04', 'বর্ণালি'),
          T('chemistry1-ch-02-t05', 't05', 'দ্রাব্যতা'),
          T('chemistry1-ch-02-t06', 't06', 'দ্রাব্যতা গুণফল ও অধঃক্ষেপ'),
          T('chemistry1-ch-02-t07', 't07', 'আয়ন শনাক্তকরণ'),
          T('chemistry1-ch-02-t08', 't08', 'দ্রাবক নিষ্কাশন ও ক্রোমাটোগ্রাফি'),
          ...PMS('chemistry1-ch-02'),
        ],
      },
      {
        id: 'chemistry1-ch-03', legacyDocId: 'Chemistry1_3', chapterNumber: 3, chapterName: 'মৌলের পর্যায়বৃত্ত ধর্ম ও রাসায়নিক বন্ধন',
        topics: [
          T('chemistry1-ch-03-t01', 't01', 'ব্লক মৌল ও এদের রাসায়নিক ধর্ম এবং অবস্থান্তর মৌল'),
          T('chemistry1-ch-03-t02', 't02', 'পর্যায়বৃত্ত ধর্ম (পরমাণু আকার, আয়নীকরণ শক্তি, ইলেকট্রন আসক্তি ও তড়িৎ ঋণাত্মকতা)'),
          T('chemistry1-ch-03-t03', 't03', 'পর্যায়বৃত্ত ধর্ম (ধাতব ধর্ম ও যোগ্যতা, গলনাঙ্ক ও স্ফুটনাঙ্ক এবং দ্রবণীয়তা)'),
          T('chemistry1-ch-03-t04', 't04', 'সমযোজী বন্ধন ও এর শ্রেণিবিভাগ ও সন্নিবেশ সমযোজী বন্ধন ও লিগ্যান্ড'),
          T('chemistry1-ch-03-t05', 't05', 'অক্সাইডের প্রকৃতি'),
          T('chemistry1-ch-03-t06', 't06', 'বিভিন্ন সমযোজী যৌগ, অরবিটালের সংকরণ ও আকৃতি, VSEPR তত্ত্ব ও বন্ধনকোণের উপর মুক্তজোড় ইলেকট্রনের প্রভাব'),
          T('chemistry1-ch-03-t07', 't07', 'জটিল যৌগের সংকরণ, চৌম্বকীয় ধর্ম ও রঙিন যৌগ'),
          T('chemistry1-ch-03-t08', 't08', 'পোলারায়ণ এবং পোলারিটি'),
          T('chemistry1-ch-03-t09', 't09', 'H-বন্ধন ও ভ্যানডার ওয়ালস আকর্ষণ বল'),
          ...PMS('chemistry1-ch-03'),
        ],
      },
      {
        id: 'chemistry1-ch-04', legacyDocId: 'Chemistry1_4', chapterNumber: 4, chapterName: 'রাসায়নিক পরিবর্তন',
        topics: [
          T('chemistry1-ch-04-t01', 't01', 'বিক্রিয়ার হার'),
          T('chemistry1-ch-04-t02', 't02', 'লা-শাতেলিয়ারের নীতি'),
          T('chemistry1-ch-04-t03', 't03', 'ভরক্রিয়ার সূত্র ও সাম্যধ্রুবক (Kp এবং Kc)'),
          T('chemistry1-ch-04-t04', 't04', 'অম্ল-ক্ষার এবং pH'),
          T('chemistry1-ch-04-t05', 't05', 'বাফার দ্রবণ ও বাফার দ্রবণের ক্রিয়াকৌশল'),
          T('chemistry1-ch-04-t06', 't06', 'তাপ রসায়ন'),
          ...PMS('chemistry1-ch-04'),
        ],
      },
      {
        id: 'chemistry1-ch-05', legacyDocId: 'Chemistry1_5', chapterNumber: 5, chapterName: 'কর্মমুখী রসায়ন',
        topics: [
          T('chemistry1-ch-05-t01', 't01', 'প্রাকৃতিক এবং কৃত্রিম খাদ্য সংরক্ষক'),
          T('chemistry1-ch-05-t02', 't02', 'ভিনেগার ও ভিনেগারের ক্রিয়াকৌশল'),
          T('chemistry1-ch-05-t03', 't03', 'খাদ্য কৌটাজাতকরণ'),
          T('chemistry1-ch-05-t04', 't04', 'দ্রবণ, কলয়েড, সাসপেনশন ও দুধ'),
          T('chemistry1-ch-05-t05', 't05', 'টয়লেট্রিজ ও পারফিউমারি পরিষ্কারক'),
          ...PMS('chemistry1-ch-05'),
        ],
      },
    ],
  },

  // ── রসায়ন ২য় পত্র ───────────────────────────────────────────────────────────
  Chemistry2: {
    id: 'Chemistry2',
    name: SUBJECT_DISPLAY_NAMES.Chemistry2,
    shortName: SUBJECT_SHORT_NAMES.Chemistry2,
    isBuet: true,
    color: SUBJECT_COLORS.Chemistry2,
    chapters: [
      {
        id: 'chemistry2-ch-01', legacyDocId: 'Chemistry2_1', chapterNumber: 1, chapterName: 'পরিবেশ রসায়ন',
        topics: [
          T('chemistry2-ch-01-t01', 't01', 'আদর্শ গ্যাসের সূত্রসমূহ'),
          T('chemistry2-ch-01-t02', 't02', 'আংশিক চাপ ও ডাল্টনের আংশিক চাপ সূত্র'),
          T('chemistry2-ch-01-t03', 't03', 'ব্যাপন ও গ্রাহামের ব্যাপন সূত্র'),
          T('chemistry2-ch-01-t04', 't04', 'গ্যাসের আণবিক গতিতত্ত্ব'),
          T('chemistry2-ch-01-t05', 't05', 'আদর্শ গ্যাস ও বাস্তব গ্যাস'),
          T('chemistry2-ch-01-t06', 't06', 'অম্ল-ক্ষার মতবাদ ও পানির বিশুদ্ধতার মানদণ্ড'),
          T('chemistry2-ch-01-t07', 't07', 'বায়ুমণ্ডল, গ্রিন হাউস গ্যাস, দূষক, ভারী ধাতু ও বিবিধ'),
          ...PMS('chemistry2-ch-01'),
        ],
      },
      {
        id: 'chemistry2-ch-02', legacyDocId: 'Chemistry2_2', chapterNumber: 2, chapterName: 'জৈব রসায়ন',
        topics: [
          T('chemistry2-ch-02-t01', 't01', 'জৈব যৌগের পরিচয়, শ্রেণিবিভাগ, নামকরণ'),
          T('chemistry2-ch-02-t02', 't02', 'সমাণুতা'),
          T('chemistry2-ch-02-t03', 't03', 'অ্যালকেন, অ্যালকিন, অ্যালকাইন'),
          T('chemistry2-ch-02-t04', 't04', 'অ্যালকাইল হ্যালাইড ও SN1, SN2; E1, E2 বিক্রিয়া'),
          T('chemistry2-ch-02-t05', 't05', 'অ্যালকোহল, ইথার ও ফেনল'),
          T('chemistry2-ch-02-t06', 't06', 'অ্যালডিহাইড, কিটোন'),
          T('chemistry2-ch-02-t07', 't07', 'জৈব এসিড এবং জৈব এসিডের জাতক'),
          T('chemistry2-ch-02-t08', 't08', 'অ্যামিন, অ্যানিলিন'),
          T('chemistry2-ch-02-t09', 't09', 'অ্যারোমেটিক যৌগ ও প্রস্তুতি, অ্যারোমেটিসিটি, প্রতিস্থাপন'),
          T('chemistry2-ch-02-t10', 't10', 'অ্যারোমেটিক যৌগের ইলেকট্রোফিলিক প্রতিস্থাপন বিক্রিয়া'),
          T('chemistry2-ch-02-t11', 't11', 'পলিমার ও প্লাস্টিসিটি, জৈব অণু, বিস্ফোরক ও অ্যান্টিসেপটিক, IR Spectroscopy'),
          ...PMS('chemistry2-ch-02'),
        ],
      },
      {
        id: 'chemistry2-ch-03', legacyDocId: 'Chemistry2_3', chapterNumber: 3, chapterName: 'পরিমাণগত রসায়ন',
        topics: [
          T('chemistry2-ch-03-t01', 't01', 'রাসায়নিক গণনা ও সমীকরণ-ভিত্তিক সমাধান'),
          T('chemistry2-ch-03-t02', 't02', 'ঘনমাত্রা, মিশ্রণের প্রকৃতি ও pH'),
          T('chemistry2-ch-03-t03', 't03', 'অম্ল ক্ষার, টাইট্রেশন, প্রাইমারি ও সেকেন্ডারি স্ট্যান্ডার্ড পদার্থ'),
          T('chemistry2-ch-03-t04', 't04', 'জারণ-বিজারণ সমতাকরণ'),
          T('chemistry2-ch-03-t05', 't05', 'জারণ-বিজারণ টাইট্রেশন'),
          T('chemistry2-ch-03-t06', 't06', 'আয়োডোমিতি ও আয়োডিমিতি'),
          T('chemistry2-ch-03-t07', 't07', 'ভেজাল সংক্রান্ত ও বিশুদ্ধতা'),
          T('chemistry2-ch-03-t08', 't08', 'বিয়ার ল্যাম্বার্ট সূত্র ও বিবিধ'),
          ...PMS('chemistry2-ch-03'),
        ],
      },
      {
        id: 'chemistry2-ch-04', legacyDocId: 'Chemistry2_4', chapterNumber: 4, chapterName: 'তড়িৎ রসায়ন',
        topics: [
          T('chemistry2-ch-04-t01', 't01', 'বিভিন্ন পরিবাহিতা'),
          T('chemistry2-ch-04-t02', 't02', 'ফ্যারাডের সূত্র ও তড়িৎ রাসায়নিক তুল্যাঙ্ক'),
          T('chemistry2-ch-04-t03', 't03', 'গ্যালভানিক কোষ, তড়িৎ বিশ্লেষণ ও তড়িৎ রাসায়নিক কোষ'),
          T('chemistry2-ch-04-t04', 't04', 'তড়িৎদ্বার বিভব এবং কোষ বিভব'),
          T('chemistry2-ch-04-t05', 't05', 'নার্নস্ট সমীকরণ'),
          T('chemistry2-ch-04-t06', 't06', 'ব্যাটারি, ফুয়েল সেল, pH মিটার'),
          ...PMS('chemistry2-ch-04'),
        ],
      },
      {
        id: 'chemistry2-ch-05', legacyDocId: 'Chemistry2_5', chapterNumber: 5, chapterName: 'অর্থনৈতিক রসায়ন',
        topics: [
          T('chemistry2-ch-05-t01', 't01', 'জ্বালানি সম্পদ, রসায়ন শিল্প'),
          T('chemistry2-ch-05-t02', 't02', 'শিল্পের দূষণ ও দূষক, রিসাইক্লিং'),
          T('chemistry2-ch-05-t03', 't03', 'ন্যানো পার্টিক্যাল ও ন্যানো প্রযুক্তি'),
          ...PMS('chemistry2-ch-05'),
        ],
      },
    ],
  },

  // ── উচ্চতর গণিত ১ম পত্র ─────────────────────────────────────────────────────
  Math1: {
    id: 'Math1',
    name: SUBJECT_DISPLAY_NAMES.Math1,
    shortName: SUBJECT_SHORT_NAMES.Math1,
    isBuet: true,
    color: SUBJECT_COLORS.Math1,
    chapters: [
      {
        id: 'math1-ch-01', legacyDocId: 'Math1_1', chapterNumber: 1, chapterName: 'ম্যাট্রিক্স ও নির্ণায়ক',
        topics: [
          T('math1-ch-01-t01', 't01', 'ম্যাট্রিক্সের প্রকারভেদ ও বৈশিষ্ট্য'),
          T('math1-ch-01-t02', 't02', 'ম্যাট্রিক্সের যোগ-বিয়োগ'),
          T('math1-ch-01-t03', 't03', 'ম্যাট্রিক্সের ট্রেস সংক্রান্ত'),
          T('math1-ch-01-t04', 't04', 'ম্যাট্রিক্সের গুণফল ও ক্রম সংক্রান্ত'),
          T('math1-ch-01-t05', 't05', 'ম্যাট্রিক্স এর সমতা ও ভুক্তি নির্ণয়'),
          T('math1-ch-01-t06', 't06', 'নির্ণায়কের অণুরাশি ও সহগুণক'),
          T('math1-ch-01-t07', 't07', 'ব্যতিক্রমী, অব্যতিক্রমী এবং বিপরীত ম্যাট্রিক্স'),
          T('math1-ch-01-t08', 't08', 'নির্ণায়ক সম্বলিত অভেদ ও মান নির্ণয়'),
          T('math1-ch-01-t09', 't09', 'নির্ণায়কবিশিষ্ট সমীকরণ সমাধান'),
          T('math1-ch-01-t10', 't10', 'বহুচলকবিশিষ্ট সমীকরণ জোটের সমাধান'),
          ...PMS('math1-ch-01'),
        ],
      },
      {
        id: 'math1-ch-02', legacyDocId: 'Math1_2', chapterNumber: 2, chapterName: 'ভেক্টর',
        topics: [
          T('math1-ch-02-t01', 't01', 'ভেক্টরের প্রকারভেদ এবং যোগ-বিয়োগ সংক্রান্ত'),
          T('math1-ch-02-t02', 't02', 'ভেক্টরের ডট গুণন এবং লম্ব সংক্রান্ত'),
          T('math1-ch-02-t03', 't03', 'দুটি ভেক্টরের মধ্যবর্তী কোণ নির্ণয়'),
          T('math1-ch-02-t04', 't04', 'ভেক্টরের লম্ব অভিক্ষেপ ও উপাংশ নির্ণয় সংক্রান্ত'),
          T('math1-ch-02-t05', 't05', 'ভেক্টরের ক্রস গুণন ও বহুভুজের ক্ষেত্রফল নির্ণয় সংক্রান্ত'),
          T('math1-ch-02-t06', 't06', 'ভেক্টরদ্বয় দ্বারা গঠিত সমতলের উপর লম্ব একক ভেক্টর সংক্রান্ত'),
          T('math1-ch-02-t07', 't07', 'দুই বিন্দুগামী অথবা একটি বিন্দুগামী ও কোনো ভেক্টরের সমান্তরাল রেখার ভেক্টর সমীকরণ নির্ণয়'),
          ...PMS('math1-ch-02'),
        ],
      },
      {
        id: 'math1-ch-03', legacyDocId: 'Math1_3', chapterNumber: 3, chapterName: 'সরলরেখা',
        topics: [
          T('math1-ch-03-t01', 't01', 'কার্তেসীয় ও পোলার স্থানাঙ্ক এবং সমীকরণ সংক্রান্ত'),
          T('math1-ch-03-t02', 't02', 'দুইটি বিন্দুর দূরত্ব সম্পর্কিত'),
          T('math1-ch-03-t03', 't03', 'বিভক্তিকরণ বিন্দু ও অনুপাত সংক্রান্ত'),
          T('math1-ch-03-t04', 't04', 'ক্ষেত্রফল সংক্রান্ত'),
          T('math1-ch-03-t05', 't05', 'সঞ্চারপথের সমীকরণ সংক্রান্ত'),
          T('math1-ch-03-t06', 't06', 'ঢাল সংক্রান্ত'),
          T('math1-ch-03-t07', 't07', 'বিভিন্ন ধরনের সরলরেখার সমীকরণ সংক্রান্ত'),
          T('math1-ch-03-t08', 't08', 'সমান্তরাল ও লম্ব হবার শর্ত এবং সমীকরণ নির্ণয়'),
          T('math1-ch-03-t09', 't09', 'বহিঃস্থ বিন্দু হতে সরলরেখার লম্ব দূরত্ব নির্ণয় সংক্রান্ত'),
          T('math1-ch-03-t10', 't10', 'দুইটি সমান্তরাল রেখাদ্বয়ের মধ্যবর্তী লম্ব দূরত্ব নির্ণয় সংক্রান্ত'),
          T('math1-ch-03-t11', 't11', 'ত্রিভুজের বিভিন্ন ধরনের কেন্দ্র নির্ণয় সংক্রান্ত'),
          T('math1-ch-03-t12', 't12', 'দুইটি রেখার অন্তর্ভুক্ত কোণ নির্ণয় সংক্রান্ত'),
          T('math1-ch-03-t13', 't13', 'কোণের সমদ্বিখণ্ডকদ্বয়ের সমীকরণ এবং কোণের সাপেক্ষে বিভিন্ন বিন্দুর অবস্থান সংক্রান্ত'),
          T('math1-ch-03-t14', 't14', 'প্রতিবিম্ব নির্ণয় সংক্রান্ত'),
          T('math1-ch-03-t15', 't15', 'বিবিধ'),
          ...PMS('math1-ch-03'),
        ],
      },
      {
        id: 'math1-ch-04', legacyDocId: 'Math1_4', chapterNumber: 4, chapterName: 'বৃত্ত',
        topics: [
          T('math1-ch-04-t01', 't01', 'বৃত্তের কেন্দ্র, ব্যাসার্ধ ও ক্ষেত্রফল নির্ণয়'),
          T('math1-ch-04-t02', 't02', 'বৃত্ত হওয়ার শর্ত'),
          T('math1-ch-04-t03', 't03', 'বৃত্তের পোলার ও পরামিতিক সমীকরণ সম্পর্কিত'),
          T('math1-ch-04-t04', 't04', 'বৃত্তের কেন্দ্র দেওয়া আছে এবং অন্য কোনো বিন্দু দিয়ে যায়'),
          T('math1-ch-04-t05', 't05', 'বৃত্ত অক্ষদ্বয়কে স্পর্শ বা ছেদ সংক্রান্ত'),
          T('math1-ch-04-t06', 't06', 'ব্যাসের প্রান্তবিন্দু দেওয়া থাকলে তা থেকে বৃত্তের সমীকরণ নির্ণয় সংক্রান্ত'),
          T('math1-ch-04-t07', 't07', 'তিন বিন্দুগামী বৃত্তের সমীকরণ নির্ণয়'),
          T('math1-ch-04-t08', 't08', 'বৃত্তের সমীকরণ নির্ণয় যার কেন্দ্র নির্দিষ্ট রেখার উপর অবস্থিত'),
          T('math1-ch-04-t09', 't09', 'ছেদবিন্দুগামী বৃত্তের সমীকরণ'),
          T('math1-ch-04-t10', 't10', 'বৃত্ত একটি নির্দিষ্ট রেখাকে স্পর্শ করা শর্ত ও তা হতে বৃত্তের সমীকরণ নির্ণয় সংক্রান্ত'),
          T('math1-ch-04-t11', 't11', 'বিভিন্ন শর্ত সাপেক্ষে বৃত্তের স্পর্শকের সমীকরণ নির্ণয়'),
          T('math1-ch-04-t12', 't12', 'বৃত্তের উপরস্থ কোনো বিন্দুতে স্পর্শক এবং অভিলম্বের সমীকরণ'),
          T('math1-ch-04-t13', 't13', 'বৃত্তের বহিঃস্থ বিন্দু হতে বৃত্তের উপর অঙ্কিত স্পর্শক সংক্রান্ত'),
          T('math1-ch-04-t14', 't14', 'বৃত্তের সাপেক্ষে বৃত্তের অবস্থান এবং ২টি বৃত্ত স্পর্শ করে সংক্রান্ত'),
          T('math1-ch-04-t15', 't15', 'মৌলিক অক্ষ, সাধারণ জ্যা ও স্পর্শবিন্দুগামী সাধারণ স্পর্শক সম্পর্কিত'),
          T('math1-ch-04-t16', 't16', 'বৃত্তের একটি জ্যা-এর মধ্যবিন্দুর স্থানাঙ্ক দেওয়া থাকলে জ্যা-এর সমীকরণ নির্ণয় সংক্রান্ত'),
          T('math1-ch-04-t17', 't17', 'বৃত্তের জ্যাকে ব্যাস ধরে অঙ্কিত বৃত্তের সমীকরণ'),
          ...PMS('math1-ch-04'),
        ],
      },
      {
        id: 'math1-ch-05', legacyDocId: 'Math1_5', chapterNumber: 5, chapterName: 'বিন্যাস ও সমাবেশ',
        topics: [
          T('math1-ch-05-t01', 't01', '^n P_r ও ^n C_r সূত্রের প্রয়োগ'),
          T('math1-ch-05-t02', 't02', 'বিন্যাস সংক্রান্ত সাধারণ সমস্যা এবং চক্র বিন্যাস'),
          T('math1-ch-05-t03', 't03', 'শর্ত সাপেক্ষে শব্দ গঠন'),
          T('math1-ch-05-t04', 't04', 'শর্ত সাপেক্ষে সংখ্যা গঠন'),
          T('math1-ch-05-t05', 't05', 'সমাবেশ সংক্রান্ত সাধারণ সমস্যা'),
          T('math1-ch-05-t06', 't06', 'দল বা কমিটি গঠন'),
          T('math1-ch-05-t07', 't07', 'সমাবেশের মাধ্যমে শব্দ গঠন'),
          T('math1-ch-05-t08', 't08', 'জ্যামিতি সংক্রান্ত'),
          ...PMS('math1-ch-05'),
        ],
      },
      {
        id: 'math1-ch-06', legacyDocId: 'Math1_6', chapterNumber: 6, chapterName: 'ত্রিকোণমিতিক অনুপাত',
        topics: [
          T('math1-ch-06-t01', 't01', 'ত্রিকোণমিতিক কোণ এবং বৃত্তকলা সম্পর্কিত সমস্যাবলি'),
          T('math1-ch-06-t02', 't02', 'ত্রিকোণমিতিক অনুপাতের পারস্পরিক রূপান্তর সম্পর্কিত'),
          T('math1-ch-06-t03', 't03', 'বৃত্তীয় ফাংশনের ডোমেন-রেঞ্জ এবং লেখচিত্র সম্পর্কিত'),
          T('math1-ch-06-t04', 't04', 'ত্রিকোণমিতিক ফাংশনের পর্যায়কাল'),
          ...PMS('math1-ch-06'),
        ],
      },
      {
        id: 'math1-ch-07', legacyDocId: 'Math1_7', chapterNumber: 7, chapterName: 'সংযুক্ত কোণের ত্রিকোণমিতিক অনুপাত',
        topics: [
          T('math1-ch-07-t01', 't01', 'সংযুক্ত কোণ সম্বলিত ত্রিকোণমিতিক রাশি'),
          T('math1-ch-07-t02', 't02', 'ধারা সংক্রান্ত'),
          T('math1-ch-07-t03', 't03', 'যৌগিক কোণ সম্বলিত ত্রিকোণমিতিক রাশি'),
          T('math1-ch-07-t04', 't04', 'গুণিতক কোণের ত্রিকোণমিতিক অনুপাত সংক্রান্ত'),
          T('math1-ch-07-t05', 't05', 'উপগুণিতক কোণের ত্রিকোণমিতিক অনুপাত সংক্রান্ত'),
          T('math1-ch-07-t06', 't06', 'ত্রিকোণমিতিক অভেদাবলি সংক্রান্ত'),
          T('math1-ch-07-t07', 't07', 'শর্ত সাপেক্ষে ত্রিভুজের বিভিন্ন অজানা রাশির মান নির্ণয়'),
          T('math1-ch-07-t08', 't08', 'শর্ত সাপেক্ষে প্রমাণ'),
          T('math1-ch-07-t09', 't09', 'শর্ত সাপেক্ষে ত্রিভুজের প্রকৃতি নির্ণয়'),
          ...PMS('math1-ch-07'),
        ],
      },
      {
        id: 'math1-ch-08', legacyDocId: 'Math1_8', chapterNumber: 8, chapterName: 'ফাংশন ও ফাংশনের লেখচিত্র',
        topics: [
          T('math1-ch-08-t01', 't01', 'ফাংশনের মান ও প্রমাণ সংক্রান্ত সাধারণ সমস্যাবলি'),
          T('math1-ch-08-t02', 't02', 'এক-এক ও সার্বিক ফাংশন সংক্রান্ত'),
          T('math1-ch-08-t03', 't03', 'বিপরীত ফাংশন সংক্রান্ত'),
          T('math1-ch-08-t04', 't04', 'ডোমেন-রেঞ্জ নির্ণয় পদ্ধতি সংক্রান্ত'),
          T('math1-ch-08-t05', 't05', 'সংযোজিত ফাংশন সংক্রান্ত'),
          T('math1-ch-08-t06', 't06', 'লেখচিত্র অঙ্কন সংক্রান্ত'),
          ...PMS('math1-ch-08'),
        ],
      },
      {
        id: 'math1-ch-09', legacyDocId: 'Math1_9', chapterNumber: 9, chapterName: 'অন্তরীকরণ',
        topics: [
          T('math1-ch-09-t01', 't01', 'লিমিটের অস্তিত্বশীলতা কেন্দ্রিক; বিচ্ছিন্নতা ও অবিচ্ছিন্নতা'),
          T('math1-ch-09-t02', 't02', 'বাস্তব মান বসিয়ে (x = a + h) সরাসরি লিমিটের মান নির্ণয়'),
          T('math1-ch-09-t03', 't03', 'হরে/লবে বর্গমূল সংবলিত পদটির অনুবন্ধী দিয়ে লব ও হরকে গুণন করে লিমিট নির্ণয়'),
          T('math1-ch-09-t04', 't04', 'lim (xᵐ − aᵐ)/(xⁿ − aⁿ) আকারের লিমিটের মান নির্ণয়'),
          T('math1-ch-09-t05', 't05', 'ত্রিকোণমিতিক, বিপরীত বৃত্তীয় ও বীজগাণিতিক ফাংশন এর লিমিট নির্ণয়'),
          T('math1-ch-09-t06', 't06', 'সূচক, লগারিদম এবং ধারা সংক্রান্ত ফাংশনের লিমিট নির্ণয়'),
          T('math1-ch-09-t07', 't07', 'x এর মান অসীমের দিকে ধাবিত হলে লিমিটের মান নির্ণয়'),
          T('math1-ch-09-t08', 't08', 'Exponential Form'),
          T('math1-ch-09-t09', 't09', 'মূল নিয়মে অন্তরক সহগ নির্ণয়'),
          T('math1-ch-09-t10', 't10', 'ফাংশনকে সরলীকরণ করে অন্তরীকরণ'),
          T('math1-ch-09-t11', 't11', 'সংযোজিত ফাংশনের অন্তরক সহগ নির্ণয় (Chain Rule)'),
          T('math1-ch-09-t12', 't12', 'দুইটি ফাংশনের সমন্বয়ের অন্তরীকরণ'),
          T('math1-ch-09-t13', 't13', 'বিপরীত অন্তরক সহগের সাহায্যে অন্তরীকরণ'),
          T('math1-ch-09-t14', 't14', 'সূচক ফাংশন সমাধানে লগারিদম প্রয়োগ'),
          T('math1-ch-09-t15', 't15', 'অব্যক্ত ফাংশন'),
          T('math1-ch-09-t16', 't16', 'পর্যায়ক্রমিক অন্তরীকরণ করে প্রমাণ ও মান নির্ণয় সংক্রান্ত'),
          T('math1-ch-09-t17', 't17', 'ঢাল, স্পর্শক ও অভিলম্ব নির্ণয়'),
          T('math1-ch-09-t18', 't18', 'ক্রমবর্ধমান ও ক্রমহ্রাসমান ফাংশন'),
          T('math1-ch-09-t19', 't19', 'গুরুমান ও লঘুমান নির্ণয়'),
          T('math1-ch-09-t20', 't20', 'সর্বোচ্চ বা সর্বনিম্ন মানের ব্যবহারিক প্রয়োগ'),
          ...PMS('math1-ch-09'),
        ],
      },
      {
        id: 'math1-ch-10', legacyDocId: 'Math1_10', chapterNumber: 10, chapterName: 'যোগজীকরণ',
        topics: [
          T('math1-ch-10-t01', 't01', 'যোগজীকরণের সাধারণ সূত্র ∫xⁿdx = xⁿ⁺¹/(n+1) + c ব্যবহার করে'),
          T('math1-ch-10-t02', 't02', '∫f(ax + b)dx আকৃতির'),
          T('math1-ch-10-t03', 't03', 'প্রতিস্থাপন পদ্ধতিতে z ধরে যোগজীকরণ'),
          T('math1-ch-10-t04', 't04', '∫f\'(x)/f(x) dx এবং ∫f\'(x)/√f(x) dx আকৃতির'),
          T('math1-ch-10-t05', 't05', 'Exponential আকৃতির'),
          T('math1-ch-10-t06', 't06', '∫sin ax·cos bx dx, ∫sin ax·sin bx dx, ∫cos ax·cos bx dx আকৃতির'),
          T('math1-ch-10-t07', 't07', '∫dx/(1+sin ax), ∫dx/(1−sin ax), ∫dx/(1+cos ax), ∫dx/(1−cos ax) আকারের'),
          T('math1-ch-10-t08', 't08', '∫sinᵐx dx; ∫cosᵐx dx, ∫sinᵐx·cosⁿx dx আকারের'),
          T('math1-ch-10-t09', 't09', '∫dx/(ax²+bx+c), ∫dx/√(ax²+bx+c), ∫√(ax²+bx+c) dx আকারের'),
          T('math1-ch-10-t10', 't10', '∫(px+q)/(ax²+bx+c) dx, ∫(px+q)/√(ax²+bx+c) dx, ∫(px+q)√(ax²+bx+c) dx আকারের'),
          T('math1-ch-10-t11', 't11', '∫dx/[(ax+b)√(cx+d)], ∫(ax+b)√(cx+d) dx; ∫(ax+b)/√(cx+d) আকারের'),
          T('math1-ch-10-t12', 't12', 'অংশক্রমে সমাকলন বা ∫uv dx সংক্রান্ত'),
          T('math1-ch-10-t13', 't13', 'অংশক্রমে সমাকলনের ক্ষেত্রে: ∫eᵃˣ{af(x)+f\'(x)}dx আকৃতির'),
          T('math1-ch-10-t14', 't14', 'আংশিক ভগ্নাংশের সাহায্যে সমাকলন'),
          T('math1-ch-10-t15', 't15', 'নির্দিষ্ট যোগজ সম্পর্কিত মূল উপপাদ্য এর প্রয়োগ ও সাধারণ সমস্যা'),
          T('math1-ch-10-t16', 't16', 'নির্দিষ্ট যোগজ ব্যবহার করে ক্ষেত্রফল নির্ণয় সংক্রান্ত'),
          T('math1-ch-10-t17', 't17', 'বিবিধ'),
          ...PMS('math1-ch-10'),
        ],
      },
    ],
  },

  // ── উচ্চতর গণিত ২য় পত্র ─────────────────────────────────────────────────────
  Math2: {
    id: 'Math2',
    name: SUBJECT_DISPLAY_NAMES.Math2,
    shortName: SUBJECT_SHORT_NAMES.Math2,
    isBuet: true,
    color: SUBJECT_COLORS.Math2,
    chapters: [
      {
        id: 'math2-ch-01', legacyDocId: 'Math2_1', chapterNumber: 1, chapterName: 'বাস্তব সংখ্যা ও অসমতা',
        topics: [
          T('math2-ch-01-t01', 't01', 'বাস্তব সংখ্যার স্বীকার্য'),
          T('math2-ch-01-t02', 't02', 'এক চলক বিশিষ্ট অসমতাকে পরমমানের সাহায্যে প্রকাশ'),
          T('math2-ch-01-t03', 't03', 'পরমমান সংক্রান্ত অসমতার সমাধান'),
          T('math2-ch-01-t04', 't04', 'পরমমান সংক্রান্ত প্রমাণ সমূহ'),
          T('math2-ch-01-t05', 't05', 'বাস্তব সংখ্যার সম্পূর্ণতা ধর্ম'),
          T('math2-ch-01-t06', 't06', 'এক চলক সংবলিত অসমতার সমাধান'),
          T('math2-ch-01-t07', 't07', 'দুই চলক সংবলিত যোগাশ্রয়ী অসমতা'),
          ...PMS('math2-ch-01'),
        ],
      },
      {
        id: 'math2-ch-02', legacyDocId: 'Math2_2', chapterNumber: 2, chapterName: 'যোগাশ্রয়ী প্রোগ্রাম',
        topics: [
          T('math2-ch-02-t01', 't01', 'যোগাশ্রয়ী প্রোগ্রামের গঠন, শর্তাবলি, ব্যবহার ও গুরুত্ব সংক্রান্ত'),
          T('math2-ch-02-t02', 't02', 'আবদ্ধ সমাধান অঞ্চল সংক্রান্ত সমস্যাবলি'),
          T('math2-ch-02-t03', 't03', 'উন্মুক্ত সমাধান অঞ্চল সংক্রান্ত সমস্যাবলি'),
          ...PMS('math2-ch-02'),
        ],
      },
      {
        id: 'math2-ch-03', legacyDocId: 'Math2_3', chapterNumber: 3, chapterName: 'জটিল সংখ্যা',
        topics: [
          T('math2-ch-03-t01', 't01', 'A + iB ও পোলার আকারে প্রকাশ'),
          T('math2-ch-03-t02', 't02', 'জটিল সংখ্যার মডুলাস ও আর্গুমেন্ট সংক্রান্ত সমস্যা'),
          T('math2-ch-03-t03', 't03', 'অনুবন্ধী জটিল সংখ্যা সংক্রান্ত'),
          T('math2-ch-03-t04', 't04', 'মূল নির্ণয় সংক্রান্ত'),
          T('math2-ch-03-t05', 't05', 'i এর ঘাত এবং ধারা সংক্রান্ত'),
          T('math2-ch-03-t06', 't06', 'ω এর ঘাত এবং ধারা সংক্রান্ত'),
          T('math2-ch-03-t07', 't07', 'মান নির্ণয় ও প্রমাণ সংক্রান্ত'),
          T('math2-ch-03-t08', 't08', 'জটিল সংখ্যার লেখচিত্র ও জ্যামিতিক প্রয়োগ সংক্রান্ত'),
          ...PMS('math2-ch-03'),
        ],
      },
      {
        id: 'math2-ch-04', legacyDocId: 'Math2_4', chapterNumber: 4, chapterName: 'বহুপদী ও বহুপদী সমীকরণ',
        topics: [
          T('math2-ch-04-t01', 't01', 'কোনো রাশি বহুপদী কিনা নির্ণয়'),
          T('math2-ch-04-t02', 't02', 'নিশ্চয়ক (D) ও মূলগুলোর প্রকৃতি'),
          T('math2-ch-04-t03', 't03', 'মূল-সহগ সম্পর্ক সংক্রান্ত'),
          T('math2-ch-04-t04', 't04', 'দুইটি সমীকরণের মূলের সম্পর্ক সংক্রান্ত'),
          T('math2-ch-04-t05', 't05', 'বহুপদী সমীকরণের মূল নির্ণয়'),
          T('math2-ch-04-t06', 't06', 'সমীকরণ গঠন সংক্রান্ত'),
          T('math2-ch-04-t07', 't07', 'প্রতিসম রাশি ও প্রতিসম মূলবিশিষ্ট সমীকরণ'),
          T('math2-ch-04-t08', 't08', 'মূলগুলো বিভিন্ন প্রগমনভুক্ত সম্পর্কিত'),
          T('math2-ch-04-t09', 't09', 'সাধারণ মূল সংক্রান্ত'),
          ...PMS('math2-ch-04'),
        ],
      },
      {
        id: 'math2-ch-05', legacyDocId: 'Math2_5', chapterNumber: 5, chapterName: 'দ্বিপদি বিস্তৃতি',
        topics: [
          T('math2-ch-05-t01', 't01', 'প্যাসকেলের ত্রিভুজের সাহায্যে বিস্তৃতি'),
          T('math2-ch-05-t02', 't02', 'দ্বিপদী উপপাদ্য ও পদসংখ্যা নির্ণয়'),
          T('math2-ch-05-t03', 't03', 'সাধারণ পদ নির্ণয় সংক্রান্ত'),
          T('math2-ch-05-t04', 't04', 'বিস্তৃতিতে চলক বর্জিত পদ সংক্রান্ত'),
          T('math2-ch-05-t05', 't05', 'মধ্যপদ নির্ণয় সংক্রান্ত'),
          T('math2-ch-05-t06', 't06', 'পরপর দুইটি পদের অনুপাত সংক্রান্ত'),
          T('math2-ch-05-t07', 't07', 'বিস্তৃতির দুইটি ক্রমিক পদ বা পদের সহগ সমান'),
          T('math2-ch-05-t08', 't08', 'অসীম ধারার দ্বিপদী বিস্তৃতি ও শর্ত'),
          T('math2-ch-05-t09', 't09', 'দ্বিপদী ধারার অভিসৃতি সংক্রান্ত'),
          T('math2-ch-05-t10', 't10', 'অসীম ধারায় দ্বিপদী বিস্তৃতির সহগ নির্ণয় সংক্রান্ত'),
          ...PMS('math2-ch-05'),
        ],
      },
      {
        id: 'math2-ch-06', legacyDocId: 'Math2_6', chapterNumber: 6, chapterName: 'কণিক',
        topics: [
          T('math2-ch-06-t01', 't01', 'কনিকের প্রকৃতি নির্ণয়'),
          T('math2-ch-06-t02', 't02', 'পরাবৃত্তের সমীকরণ হতে বিভিন্ন উপাদান নির্ণয়'),
          T('math2-ch-06-t03', 't03', 'বিভিন্ন শর্ত হতে পরাবৃত্তের সমীকরণ এবং উপাদান নির্ণয় সংক্রান্ত'),
          T('math2-ch-06-t04', 't04', 'পরাবৃত্তের উপকেন্দ্রিক দূরত্ব সম্পর্কিত'),
          T('math2-ch-06-t05', 't05', 'উপবৃত্তের সমীকরণ হতে বিভিন্ন উপাদান নির্ণয়'),
          T('math2-ch-06-t06', 't06', 'বিভিন্ন শর্ত হতে উপবৃত্তের সমীকরণ এবং উপাদান নির্ণয় সংক্রান্ত'),
          T('math2-ch-06-t07', 't07', 'অধিবৃত্তের সমীকরণ হতে বিভিন্ন উপাদান নির্ণয়'),
          T('math2-ch-06-t08', 't08', 'বিভিন্ন শর্ত থেকে অধিবৃত্তের সমীকরণ নির্ণয়'),
          T('math2-ch-06-t09', 't09', 'SP + S\'P = বৃহৎ/আড় অক্ষের দৈর্ঘ্য সংক্রান্ত'),
          T('math2-ch-06-t10', 't10', 'অধিবৃত্তের অসীমতট সম্পর্কিত সমস্যাবলি'),
          T('math2-ch-06-t11', 't11', 'কনিকের পরামিতিক সমীকরণ'),
          T('math2-ch-06-t12', 't12', 'কনিকের উপকেন্দ্র, উৎকেন্দ্রিকতা ও দিকাক্ষ হতে কনিকের সমীকরণ নির্ণয় (SP = e·PM)'),
          T('math2-ch-06-t13', 't13', 'স্পর্শক/ছেদক সম্পর্কিত'),
          ...PMS('math2-ch-06'),
        ],
      },
      {
        id: 'math2-ch-07', legacyDocId: 'Math2_7', chapterNumber: 7, chapterName: 'বিপরীত ত্রিকোণমিতিক ফাংশন ও ত্রিকোণমিতিক সমীকরণ',
        topics: [
          T('math2-ch-07-t01', 't01', 'গ্রাফ সংক্রান্ত'),
          T('math2-ch-07-t02', 't02', 'মান সংক্রান্ত'),
          T('math2-ch-07-t03', 't03', 'বিপরীত ত্রিকোণমিতিক সমীকরণের প্রমাণ ও সমাধান সংক্রান্ত সমস্যা'),
          T('math2-ch-07-t04', 't04', 'ত্রিকোণমিতিক সমীকরণের সমাধান সংক্রান্ত সাধারণ সমস্যা'),
          T('math2-ch-07-t05', 't05', 'বর্গসূত্রের প্রয়োগ সংক্রান্ত সমস্যা'),
          T('math2-ch-07-t06', 't06', 'sinθ, cosθ, tanθ, secθ এর দ্বিঘাতরাশি সংবলিত পদ থাকলে'),
          T('math2-ch-07-t07', 't07', 'a cosθ + b sinθ = c আকৃতির ত্রিকোণমিতিক সমীকরণ সংক্রান্ত সমস্যা'),
          T('math2-ch-07-t08', 't08', 'sinθ, cosθ ইত্যাদি ত্রিকোণমিতিক অনুপাত যোগ আকারে থাকলে'),
          T('math2-ch-07-t09', 't09', 'sinθ, cosθ ইত্যাদি ত্রিকোণমিতিক অনুপাত গুণ আকারে থাকলে'),
          T('math2-ch-07-t10', 't10', 'cotθ, tanθ, secθ, cosecθ বিশিষ্ট ত্রিকোণমিতিক সমীকরণ সংক্রান্ত সমস্যা'),
          ...PMS('math2-ch-07'),
        ],
      },
      {
        id: 'math2-ch-08', legacyDocId: 'Math2_8', chapterNumber: 8, chapterName: 'স্থিতিবিদ্যা',
        topics: [
          T('math2-ch-08-t01', 't01', 'দুইটি বলের লব্ধি নির্ণয়ের ক্ষেত্রে সামান্তরিক সূত্রের প্রয়োগ'),
          T('math2-ch-08-t02', 't02', 'দুইটি বলের অন্তর্ভুক্ত কোণ নির্ণয় ও sine সূত্রের প্রয়োগ সংক্রান্ত'),
          T('math2-ch-08-t03', 't03', 'লব্ধির দিক অপরিবর্তিত থাকা'),
          T('math2-ch-08-t04', 't04', 'দুই বা দুই এর অধিক বলের লব্ধি নির্ণয়ের ক্ষেত্রে লম্বাংশ সূত্রের প্রয়োগ'),
          T('math2-ch-08-t05', 't05', 'বলের সংযোজন ও বিভাজন'),
          T('math2-ch-08-t06', 't06', 'তিনটি সমবিন্দু বল সাম্যাবস্থা সৃষ্টি করলে তা হতে বলত্রয়ের অন্তর্গত কোণ নির্ণয়'),
          T('math2-ch-08-t07', 't07', 'তিনটি বল সাম্যাবস্থায় থাকার শর্ত (লামির সূত্র)'),
          T('math2-ch-08-t08', 't08', 'তিনটি বল সাম্যাবস্থায় থাকলে তা থেকে বিভিন্ন অজানা রাশির মান নির্ণয়'),
          T('math2-ch-08-t09', 't09', 'সদৃশ সমান্তরাল বল এর লব্ধি'),
          T('math2-ch-08-t10', 't10', 'সদৃশ সমান্তরাল বলের ক্ষেত্রে ত্রিভুজ'),
          T('math2-ch-08-t11', 't11', 'অসদৃশ/বিসদৃশ সমান্তরাল বলের লব্ধি নির্ণয়ের সূত্র'),
          T('math2-ch-08-t12', 't12', 'সমান্তরাল বলের লব্ধি নির্ণয় এর সূত্র প্রয়োগ করে চাপ ও প্রতিক্রিয়া বল নির্ণয়'),
          ...PMS('math2-ch-08'),
        ],
      },
      {
        id: 'math2-ch-09', legacyDocId: 'Math2_9', chapterNumber: 9, chapterName: 'সমতলে বস্তুকণার গতি',
        topics: [
          T('math2-ch-09-t01', 't01', 'বেগের সামান্তরিক সূত্র'),
          T('math2-ch-09-t02', 't02', 'নদী পারাপার'),
          T('math2-ch-09-t03', 't03', 'কখনও সমত্বরণ, সমমন্দন, সমবেগে চলমান কণার গতি'),
          T('math2-ch-09-t04', 't04', 'বাঘ-হরিণ, ইঁদুর-বিড়াল ধরা এবং বাস-যাত্রী, বাস-সাইকেল অতিক্রম করা'),
          T('math2-ch-09-t05', 't05', 'বিশেষ এক সেকেন্ডে অতিক্রান্ত দূরত্ব'),
          T('math2-ch-09-t06', 't06', 'রেলগাড়ির সংঘর্ষ এড়ানোর শর্ত নির্ণয়'),
          T('math2-ch-09-t07', 't07', 'নির্দিষ্ট অংশ ভেদ করে বেগ হারানোর পর অতিক্রান্ত দূরত্ব'),
          T('math2-ch-09-t08', 't08', 'আপেক্ষিক বেগ ও গড়বেগ'),
          T('math2-ch-09-t09', 't09', 'উপর থেকে বিনা বাধায় পতনশীল বস্তুর গতি'),
          T('math2-ch-09-t10', 't10', 'শব্দ শোনার সময় হিসেব করে গভীরতা নির্ণয়'),
          T('math2-ch-09-t11', 't11', 'ভূমি থেকে উলম্বভাবে নিক্ষিপ্ত বস্তুর গতি'),
          T('math2-ch-09-t12', 't12', 'সর্বোচ্চ উচ্চতা ও সর্বোচ্চ উচ্চতায় উত্থানকাল'),
          T('math2-ch-09-t13', 't13', 'সমবেগে ঊর্ধ্বগামী প্লেন বা বেলুন থেকে বস্তু ছেড়ে দেওয়া এবং বিমানের উচ্চতা'),
          T('math2-ch-09-t14', 't14', 'নির্দিষ্ট সময় ব্যবধানে দুটি বস্তু একই দিকে নিক্ষিপ্ত'),
          T('math2-ch-09-t15', 't15', 'α কোণে ভূমি থেকে নিক্ষিপ্ত প্রক্ষেপকের গতি'),
          T('math2-ch-09-t16', 't16', 'বস্তুকণার বিচরণকাল, দীর্ঘতম উচ্চতা এবং আনুভূমিক পাল্লা'),
          T('math2-ch-09-t17', 't17', 'ভূমি থেকে α কোণে নিক্ষিপ্ত প্রক্ষেপক নির্দিষ্ট দূরত্বে নির্দিষ্ট উচ্চতার দেয়াল অতিক্রম সংক্রান্ত'),
          T('math2-ch-09-t18', 't18', 'ভূমি থেকে h উচ্চতায় α কোণে উপরে নিক্ষিপ্ত প্রাসের গতি'),
          T('math2-ch-09-t19', 't19', 'একই আদিবেগে α ও 90°−α কোণে নিক্ষিপ্ত বস্তুর গতি সংক্রান্ত'),
          T('math2-ch-09-t20', 't20', 'প্রাস সম্পর্কিত বিশেষ সমস্যা'),
          ...PMS('math2-ch-09'),
        ],
      },
      {
        id: 'math2-ch-10', legacyDocId: 'Math2_10', chapterNumber: 10, chapterName: 'বিস্তার পরিমাপ ও সম্ভাবনা',
        topics: [
          T('math2-ch-10-t01', 't01', 'বিস্তার পরিমাপ ও পরিসর সংক্রান্ত'),
          T('math2-ch-10-t02', 't02', 'গড় ব্যবধান ও ব্যবধানঙ্ক'),
          T('math2-ch-10-t03', 't03', 'ভেদাঙ্ক, পরিমিতি ব্যবধান ও বিভেদাঙ্ক'),
          T('math2-ch-10-t04', 't04', 'চতুর্থক ব্যবধান সংক্রান্ত'),
          T('math2-ch-10-t05', 't05', 'সম্ভাবনার সাধারণ সমস্যাবলি'),
          T('math2-ch-10-t06', 't06', 'সম্ভাবনার সংযোগ সূত্র'),
          T('math2-ch-10-t07', 't07', 'সম্ভাবনার গুণন সূত্র'),
          T('math2-ch-10-t08', 't08', 'সম্ভাবনা ও বিন্যাস-সমাবেশ'),
          ...PMS('math2-ch-10'),
        ],
      },
    ],
  },

  // ── জীববিজ্ঞান ১ম পত্র — উদ্ভিদবিজ্ঞান ─────────────────────────────────
  Botany: {
    id: 'Botany',
    name: SUBJECT_DISPLAY_NAMES.Botany,
    shortName: SUBJECT_SHORT_NAMES.Botany,
    isBuet: false,
    color: SUBJECT_COLORS.Botany,
    chapters: [
      {
        id: 'botany-ch-01', legacyDocId: 'Botany_1', chapterNumber: 1, chapterName: 'কোষ ও এর গঠন',
        topics: [
          T('botany-ch-01-t01', 't01', 'কোষ, প্রোটোপ্লাজম, সাইটোপ্লাজম'),
          T('botany-ch-01-t02', 't02', 'কোষপ্রাচীর ও কোষঝিল্লি'),
          T('botany-ch-01-t03', 't03', 'রাইবোসোম'),
          T('botany-ch-01-t04', 't04', 'গলগি বডি, লাইসোসোম ও এন্ডোপ্লাজমিক রেটিকুলাম'),
          T('botany-ch-01-t05', 't05', 'মাইটোকন্ড্রিয়া'),
          T('botany-ch-01-t06', 't06', 'প্লাস্টিড'),
          T('botany-ch-01-t07', 't07', 'সেন্ট্রিওল, কোষীয় কঙ্কাল, পারঅক্সিসোম, গ্লাইঅক্সিসোম, কোষগহ্বর'),
          T('botany-ch-01-t08', 't08', 'নিউক্লিয়াস ও ক্রোমোজোম'),
          T('botany-ch-01-t09', 't09', 'নিউক্লিক এসিড (DNA, RNA)'),
          T('botany-ch-01-t010', 't10', 'DNA রেপ্লিকেশন'),
          T('botany-ch-01-t11', 't11', 'ট্রান্সক্রিপশন, ট্রান্সলেশন'),
          T('botany-ch-01-t12', 't12', 'জিন, জেনেটিক কোড'),
          ...PMS('botany-ch-01'),
        ],
      },
      {
        id: 'botany-ch-02', legacyDocId: 'Botany_2', chapterNumber: 2, chapterName: 'কোষ বিভাজন',
        topics: [
          T('botany-ch-02-t01', 't01', 'ভূমিকা ও অ্যামাইটোসিস'),
          T('botany-ch-02-t02', 't02', 'কোষচক্র ও ইন্টারফেজ'),
          T('botany-ch-02-t03', 't03', 'মাইটোসিস'),
          T('botany-ch-02-t04', 't04', 'মায়োসিস'),
          T('botany-ch-02-t05', 't05', 'ক্রসিং ওভার'),
          ...PMS('botany-ch-02'),
        ],
      },
      {
        id: 'botany-ch-03', legacyDocId: 'Botany_3', chapterNumber: 3, chapterName: 'কোষ রসায়ন',
        topics: [
          T('botany-ch-03-t01', 't01', 'কার্বোহাইড্রেট, কার্বোহাইড্রেটের প্রকারভেদ, মনোস্যাকারাইড, ডাইস্যাকারাইড'),
          T('botany-ch-03-t02', 't02', 'অলিগোস্যাকারাইড, পলিস্যাকারাইড, কার্বোহাইড্রেট ডেরিভেটিভস'),
          T('botany-ch-03-t03', 't03', 'অ্যামিনো এসিড'),
          T('botany-ch-03-t04', 't04', 'প্রোটিন'),
          T('botany-ch-03-t05', 't05', 'লিপিড'),
          T('botany-ch-03-t06', 't06', 'এনজাইম বা উৎসেচক'),
          ...PMS('botany-ch-03'),
        ],
      },
      {
        id: 'botany-ch-04', legacyDocId: 'Botany_4', chapterNumber: 4, chapterName: 'অণুজীব',
        topics: [
          T('botany-ch-04-t01', 't01', 'ভাইরাস'),
          T('botany-ch-04-t02', 't02', 'ভাইরাসের অর্থনৈতিক গুরুত্ব'),
          T('botany-ch-04-t03', 't03', 'ভাইরাসঘটিত রোগসমূহ'),
          T('botany-ch-04-t04', 't04', 'ব্যাকটেরিয়া'),
          T('botany-ch-04-t05', 't05', 'ব্যাকটেরিয়ার অর্থনৈতিক গুরুত্ব'),
          T('botany-ch-04-t06', 't06', 'ম্যালেরিয়া পরজীবী'),
          ...PMS('botany-ch-04'),
        ],
      },
      {
        id: 'botany-ch-05', legacyDocId: 'Botany_5', chapterNumber: 5, chapterName: 'শৈবাল ও ছত্রাক',
        topics: [
          T('botany-ch-05-t01', 't01', 'শৈবাল'),
          T('botany-ch-05-t02', 't02', 'Ulothrix, শৈবালের অর্থনৈতিক গুরুত্ব'),
          T('botany-ch-05-t03', 't03', 'ছত্রাক'),
          T('botany-ch-05-t04', 't04', 'Agaricus'),
          T('botany-ch-05-t05', 't05', 'ছত্রাকঘটিত রোগসমূহ'),
          T('botany-ch-05-t06', 't06', 'লাইকেন'),
          ...PMS('botany-ch-05'),
        ],
      },
      {
        id: 'botany-ch-06', legacyDocId: 'Botany_6', chapterNumber: 6, chapterName: 'ব্রায়োফাইটা ও টেরিডোফাইটা',
        topics: [
          T('botany-ch-06-t01', 't01', 'ব্রায়োফাইটা'),
          T('botany-ch-06-t02', 't02', 'টেরিডোফাইটা'),
          ...PMS('botany-ch-06'),
        ],
      },
      {
        id: 'botany-ch-07', legacyDocId: 'Botany_7', chapterNumber: 7, chapterName: 'নগ্নবীজী ও আবৃতবীজী উদ্ভিদ',
        topics: [
          T('botany-ch-07-t01', 't01', 'নগ্নবীজী উদ্ভিদ'),
          T('botany-ch-07-t02', 't02', 'Cycas'),
          T('botany-ch-07-t03', 't03', 'আবৃতবীজী উদ্ভিদ ও গোত্র পরিচিতি সংক্রান্ত কতিপয় সংজ্ঞা ও উদাহরণ'),
          T('botany-ch-07-t04', 't04', 'একবীজপত্রী উদ্ভিদের গোত্র: Poaceae'),
          T('botany-ch-07-t05', 't05', 'দ্বিবীজপত্রী উদ্ভিদের গোত্র: Malvaceae'),
          ...PMS('botany-ch-07'),
        ],
      },
      {
        id: 'botany-ch-08', legacyDocId: 'Botany_8', chapterNumber: 8, chapterName: 'টিস্যু ও টিস্যুতন্ত্র',
        topics: [
          T('botany-ch-08-t01', 't01', 'ভাজক টিস্যু'),
          T('botany-ch-08-t02', 't02', 'স্থায়ী টিস্যু'),
          T('botany-ch-08-t03', 't03', 'টিস্যুতন্ত্র'),
          T('botany-ch-08-t04', 't04', 'পরিবহণ টিস্যুতন্ত্র'),
          T('botany-ch-08-t05', 't05', 'উদ্ভিদের মূল ও কান্ডের অন্তর্গঠন'),
          ...PMS('botany-ch-08'),
        ],
      },
      {
        id: 'botany-ch-09', legacyDocId: 'Botany_9', chapterNumber: 9, chapterName: 'উদ্ভিদ শারীরতত্ত্ব',
        topics: [
          T('botany-ch-09-t01', 't01', 'খনিজ লবণ পরিশোষণ'),
          T('botany-ch-09-t02', 't02', 'প্রস্বেদন'),
          T('botany-ch-09-t03', 't03', 'সালোকসংশ্লেষণ'),
          T('botany-ch-09-t04', 't04', 'শ্বসন'),
          ...PMS('botany-ch-09'),
        ],
      },
      {
        id: 'botany-ch-10', legacyDocId: 'Botany_10', chapterNumber: 10, chapterName: 'উদ্ভিদ প্রজনন',
        topics: [
          T('botany-ch-10-t01', 't01', 'যৌন প্রজনন'),
          T('botany-ch-10-t02', 't02', 'অযৌন প্রজনন'),
          ...PMS('botany-ch-10'),
        ],
      },
      {
        id: 'botany-ch-11', legacyDocId: 'Botany_11', chapterNumber: 11, chapterName: 'জীবপ্রযুক্তি',
        topics: [
          T('botany-ch-11-t01', 't01', 'জীবপ্রযুক্তি'),
          T('botany-ch-11-t02', 't02', 'উদ্ভিদ টিস্যু কালচার'),
          T('botany-ch-11-t03', 't03', 'জেনেটিক ইঞ্জিনিয়ারিং ও রিকম্বিনেন্ট DNA প্রযুক্তি'),
          T('botany-ch-11-t04', 't04', 'রিকম্বিনেন্ট DNA প্রযুক্তির প্রয়োগ'),
          T('botany-ch-11-t05', 't05', 'জিনোম সিকোয়েন্সিং ও জিন ক্লোনিং'),
          ...PMS('botany-ch-11'),
        ],
      },
      {
        id: 'botany-ch-12', legacyDocId: 'Botany_12', chapterNumber: 12, chapterName: 'বিস্তার ও সংক্ষণ, জীবের পরিবেশ',
        topics: [
          T('botany-ch-12-t01', 't01', 'জীবের পরিবেশ ও অভিযোজন'),
          T('botany-ch-12-t02', 't02', 'বায়োম, প্রাণীভৌগোলিক অঞ্চল, বাংলাদেশের বনাঞ্চল, জীববৈচিত্র্যের সংরক্ষণ'),
          ...PMS('botany-ch-12'),
        ],
      },
    ],
  },

  // ── জীববিজ্ঞান ২য় পত্র — প্রাণিবিজ্ঞান ──────────────────────────────────
  Zoology: {
    id: 'Zoology',
    name: SUBJECT_DISPLAY_NAMES.Zoology,
    shortName: SUBJECT_SHORT_NAMES.Zoology,
    isBuet: false,
    color: SUBJECT_COLORS.Zoology,
    chapters: [
      {
        id: 'zoology-ch-01', legacyDocId: 'Zoology_1', chapterNumber: 1, chapterName: 'প্রাণীর বিভিন্নতা ও শ্রেণিবিন্যাস',
        topics: [
          T('zoology-ch-01-t01', 't01', 'প্রাণীবৈচিত্র্য ও প্রাণীর শ্রেণিবিন্যাস'),
          T('zoology-ch-01-t02', 't02', 'প্রাণিজগতের প্রধান পর্বসমূহ'),
          T('zoology-ch-01-t03', 't03', 'Chordata পর্বের শ্রেণিবিন্যাস'),
          T('zoology-ch-01-t04', 't04', 'বৈজ্ঞানিক নাম'),
          ...PMS('zoology-ch-01'),
        ],
      },
      {
        id: 'zoology-ch-02', legacyDocId: 'Zoology_2', chapterNumber: 2, chapterName: 'প্রাণীর পরিচিতি',
        topics: [
          T('zoology-ch-02-t01', 't01', 'হাইড্রার গঠন, খাদ্যগ্রহণ ও পরিপাক'),
          T('zoology-ch-02-t02', 't02', 'হাইড্রার চলন'),
          T('zoology-ch-02-t03', 't03', 'হাইড্রার জনন, শ্রমবণ্টন ও মিথোজীবিতা'),
          T('zoology-ch-02-t04', 't04', 'ঘাসফড়িং ও এর বাহ্যিক অঙ্গসংস্থান'),
          T('zoology-ch-02-t05', 't05', 'ঘাসফড়িংয়ের পৌষ্টিকতন্ত্র'),
          T('zoology-ch-02-t06', 't06', 'ঘাসফড়িংয়ের রক্ত সংবহনতন্ত্র'),
          T('zoology-ch-02-t07', 't07', 'ঘাসফড়িংয়ের শ্বসনতন্ত্র'),
          T('zoology-ch-02-t08', 't08', 'ঘাসফড়িংয়ের রেচনতন্ত্র'),
          T('zoology-ch-02-t09', 't09', 'ঘাসফড়িংয়ের সংবেদী অঙ্গ'),
          T('zoology-ch-02-t10', 't10', 'ঘাসফড়িংয়ের প্রজনন প্রক্রিয়া ও রূপান্তর'),
          T('zoology-ch-02-t11', 't11', 'রুই মাছের পরিচিতি ও বাহ্যিক গঠন'),
          T('zoology-ch-02-t12', 't12', 'রুই মাছের রক্ত সংবহনতন্ত্র'),
          T('zoology-ch-02-t13', 't13', 'রুই মাছের শ্বসনতন্ত্র'),
          T('zoology-ch-02-t14', 't14', 'রুই মাছের প্রজনন ও জীবনবৃত্তান্ত'),
          ...PMS('zoology-ch-02'),
        ],
      },
      {
        id: 'zoology-ch-03', legacyDocId: 'Zoology_3', chapterNumber: 3, chapterName: 'পরিপাক ও শোষণ',
        topics: [
          T('zoology-ch-03-t01', 't01', 'পৌষ্টিকনালি'),
          T('zoology-ch-03-t02', 't02', 'লালাগ্রন্থি'),
          T('zoology-ch-03-t03', 't03', 'যকৃত'),
          T('zoology-ch-03-t04', 't04', 'অগ্ন্যাশয়'),
          T('zoology-ch-03-t05', 't05', 'গ্যাস্ট্রিক গ্রন্থি'),
          T('zoology-ch-03-t06', 't06', 'মানুষের খাদ্য পরিপাক প্রণালি'),
          T('zoology-ch-03-t07', 't07', 'খাদ্যবস্তুর শোষণ, বৃহদন্ত্রের কাজ'),
          T('zoology-ch-03-t08', 't08', 'পরিপাকে স্নায়ুতন্ত্র ও হরমোনের ভূমিকা'),
          T('zoology-ch-03-t09', 't09', 'পরিপাকতন্ত্রের বিভিন্ন অংশের শনাক্তকারী বৈশিষ্ট্য'),
          T('zoology-ch-03-t10', 't10', 'স্থূলতা'),
          ...PMS('zoology-ch-03'),
        ],
      },
      {
        id: 'zoology-ch-04', legacyDocId: 'Zoology_4', chapterNumber: 4, chapterName: 'রক্ত ও সঞ্চালন',
        topics: [
          T('zoology-ch-04-t01', 't01', 'রক্ত'),
          T('zoology-ch-04-t02', 't02', 'রক্তকণিকা'),
          T('zoology-ch-04-t03', 't03', 'রক্ততঞ্চন ও লসিকাতন্ত্র'),
          T('zoology-ch-04-t04', 't04', 'হৃৎপিণ্ড'),
          T('zoology-ch-04-t05', 't05', 'কার্ডিয়াক চক্র ও জাংশনাল টিস্যু'),
          T('zoology-ch-04-t06', 't06', 'রক্তচাপ নিয়ন্ত্রণে ব্যারোরিসেপ্টরের ভূমিকা'),
          T('zoology-ch-04-t07', 't07', 'রক্ত সংবহনতন্ত্র'),
          T('zoology-ch-04-t08', 't08', 'হৃদ্রোগের বিভিন্ন অবস্থা'),
          T('zoology-ch-04-t09', 't09', 'হৃদ্রোগের চিকিৎসার ধারণা'),
          ...PMS('zoology-ch-04'),
        ],
      },
      {
        id: 'zoology-ch-05', legacyDocId: 'Zoology_5', chapterNumber: 5, chapterName: 'শ্বাসকার্য ও শ্বসন',
        topics: [
          T('zoology-ch-05-t01', 't01', 'মানুষের শ্বসনতন্ত্র'),
          T('zoology-ch-05-t02', 't02', 'শ্বসনের শারীরবৃত্ত'),
          T('zoology-ch-05-t03', 't03', 'গ্যাসীয় পরিবহন ও শ্বসনে শ্বাসরঞ্জকের ভূমিকা'),
          T('zoology-ch-05-t04', 't04', 'শ্বাসনালির সমস্যা, লক্ষণ ও প্রতিকার'),
          ...PMS('zoology-ch-05'),
        ],
      },
      {
        id: 'zoology-ch-06', legacyDocId: 'Zoology_6', chapterNumber: 6, chapterName: 'বর্জ্য ও নিষ্কাশন',
        topics: [
          T('zoology-ch-06-t01', 't01', 'বৃক্কের গঠন'),
          T('zoology-ch-06-t02', 't02', 'রেচনের শারীরবৃত্ত'),
          T('zoology-ch-06-t03', 't03', 'বৃক্ক বিকল, ডায়ালাইসিস, হরমোনাল ক্রিয়া'),
          ...PMS('zoology-ch-06'),
        ],
      },
      {
        id: 'zoology-ch-07', legacyDocId: 'Zoology_7', chapterNumber: 7, chapterName: 'চলন ও অঙ্গচালনা',
        topics: [
          T('zoology-ch-07-t01', 't01', 'কঙ্কালতন্ত্র'),
          T('zoology-ch-07-t02', 't02', 'অক্ষীয় কঙ্কাল, মেরুদণ্ড ও বক্ষপিঞ্জর'),
          T('zoology-ch-07-t03', 't03', 'উপাঙ্গীয় কঙ্কাল'),
          T('zoology-ch-07-t04', 't04', 'অস্থি, তরুণাস্থি ও লিভার'),
          T('zoology-ch-07-t05', 't05', 'পেশি টিস্যু'),
          T('zoology-ch-07-t06', 't06', 'অস্থিভঙ্গ বা হাড়ভাঙা ও সন্ধির আঘাত'),
          ...PMS('zoology-ch-07'),
        ],
      },
      {
        id: 'zoology-ch-08', legacyDocId: 'Zoology_8', chapterNumber: 8, chapterName: 'সমন্বয় ও নিয়ন্ত্রণ',
        topics: [
          T('zoology-ch-08-t01', 't01', 'সমন্বয় ও স্নায়ুতন্ত্রের গঠন'),
          T('zoology-ch-08-t02', 't02', 'মানব স্নায়ুতন্ত্র'),
          T('zoology-ch-08-t03', 't03', 'চোখ'),
          T('zoology-ch-08-t04', 't04', 'কান'),
          T('zoology-ch-08-t05', 't05', 'রাসায়নিক সমন্বয়'),
          ...PMS('zoology-ch-08'),
        ],
      },
      {
        id: 'zoology-ch-09', legacyDocId: 'Zoology_9', chapterNumber: 9, chapterName: 'মানব জীবনের ধারাবাহিকতা',
        topics: [
          T('zoology-ch-09-t01', 't01', 'মানব প্রজননতন্ত্র, প্রজনন এর বিভিন্ন পর্যায় ও দশা (বয়ঃসন্ধিকাল, রজঃচক্র)'),
          T('zoology-ch-09-t02', 't02', 'প্রজনন এর বিভিন্ন পর্যায় ও দশা (গ্যামেটোজেনেসিস, নিষেক)'),
          T('zoology-ch-09-t03', 't03', 'ভ্রূণের পরিস্ফুটন ও বিকাশ'),
          T('zoology-ch-09-t04', 't04', 'পরিবার পরিকল্পনা, প্রজননতন্ত্রের সমস্যা এবং যৌনবাহিত রোগ'),
          ...PMS('zoology-ch-09'),
        ],
      },
      {
        id: 'zoology-ch-10', legacyDocId: 'Zoology_10', chapterNumber: 10, chapterName: 'মানবদেহের প্রতিরক্ষা',
        topics: [
          T('zoology-ch-10-t01', 't01', 'মানবদেহের প্রতিরক্ষা, প্রথম ও দ্বিতীয় প্রতিরক্ষা স্তর'),
          T('zoology-ch-10-t02', 't02', 'তৃতীয় প্রতিরক্ষা স্তর'),
          T('zoology-ch-10-t03', 't03', 'প্রতিরক্ষা ব্যবস্থায় অ্যান্টিবডি, স্মৃতিকোষ ও টিকার ভূমিকা'),
          ...PMS('zoology-ch-10'),
        ],
      },
      {
        id: 'zoology-ch-11', legacyDocId: 'Zoology_11', chapterNumber: 11, chapterName: 'জীনতত্ত্ব ও বিবর্তন',
        topics: [
          T('zoology-ch-11-t01', 't01', 'বংশগতিবিদ্যা বা জিনতত্ত্ব বা জেনেটিক্স'),
          T('zoology-ch-11-t02', 't02', 'মেন্ডেলের সূত্র ও ব্যতিক্রম'),
          T('zoology-ch-11-t03', 't03', 'সেক্সলিঙ্কড ডিসঅর্ডার'),
          T('zoology-ch-11-t04', 't04', 'ব্লাড গ্রুপ'),
          T('zoology-ch-11-t05', 't05', 'বিবর্তন বা অভিব্যক্তি'),
          ...PMS('zoology-ch-11'),
        ],
      },
      {
        id: 'zoology-ch-12', legacyDocId: 'Zoology_12', chapterNumber: 12, chapterName: 'প্রাণীর আচরণ',
        topics: [
          T('zoology-ch-12-t01', 't01', 'সহজাত আচরণ'),
          T('zoology-ch-12-t02', 't02', 'শিখন আচরণ'),
          T('zoology-ch-12-t03', 't03', 'সামাজিক আচরণ'),
          ...PMS('zoology-ch-12'),
        ],
      },
    ],
  },

  // ── তথ্য ও যোগাযোগ প্রযুক্তি (ICT) ─────────────────────────────────────
  ICT: {
    id: 'ICT',
    name: SUBJECT_DISPLAY_NAMES.ICT,
    shortName: SUBJECT_SHORT_NAMES.ICT,
    isBuet: false,
    color: SUBJECT_COLORS.ICT,
    chapters: [
      {
        id: 'ict-ch-01', legacyDocId: 'ICT_1', chapterNumber: 1, chapterName: 'বিশ্ব ও বাংলাদেশ পরিচিতি',
        topics: [
          T('ict-ch-01-t01', 't01', 'বিশ্বগ্রামের ধারণা'),
          T('ict-ch-01-t02', 't02', 'ভার্চুয়াল রিয়েলিটি, আর্টিফিশিয়াল ইন্টেলিজেন্স ও রোবটিক্স'),
          T('ict-ch-01-t03', 't03', 'ক্রায়োসার্জারি, ন্যানোটেকনোলজি ও মহাকাশ অভিযান'),
          T('ict-ch-01-t04', 't04', 'বায়োমেট্রিক্স, বায়োইনফরমেটিক্স ও জেনেটিক ইঞ্জিনিয়ারিং'),
          T('ict-ch-01-t05', 't05', 'ICT নির্ভর অর্থনীতি এবং এর নৈতিকতা ও প্রভাব'),
          ...PMS('ict-ch-01'),
        ],
      },
      {
        id: 'ict-ch-02', legacyDocId: 'ICT_2', chapterNumber: 2, chapterName: 'কমিউনিকেশন সিস্টেম ও নেটওয়ার্কিং',
        topics: [
          T('ict-ch-02-t01', 't01', 'ডেটা ট্রান্সমিশন'),
          T('ict-ch-02-t02', 't02', 'ট্রান্সমিশন মিডিয়া'),
          T('ict-ch-02-t03', 't03', 'ওয়্যারলেস কমিউনিকেশন সিস্টেম'),
          T('ict-ch-02-t04', 't04', 'মোবাইল জেনারেশন'),
          T('ict-ch-02-t05', 't05', 'কম্পিউটার নেটওয়ার্ক'),
          T('ict-ch-02-t06', 't06', 'নেটওয়ার্ক ডিভাইস'),
          T('ict-ch-02-t07', 't07', 'নেটওয়ার্ক টপোলজি'),
          T('ict-ch-02-t08', 't08', 'ক্লাউড কম্পিউটিং'),
          ...PMS('ict-ch-02'),
        ],
      },
      {
        id: 'ict-ch-03', legacyDocId: 'ICT_3', chapterNumber: 3, chapterName: 'সংখ্যা পদ্ধতি ও ডিজিটাল ডিভাইস',
        topics: [
          T('ict-ch-03-t01', 't01', 'সংখ্যা পদ্ধতি'),
          T('ict-ch-03-t02', 't02', 'অ্যালজেবরা ও লজিক গেইট'),
          T('ict-ch-03-t03', 't03', 'সমন্বিত বর্তনী ও ডিজিটাল ডিভাইস'),
          T('ict-ch-03-t04', 't04', 'সিক্যুয়েনশিয়াল সার্কিট (ল্যাচ, ফ্লিপফ্লপ ও কাউন্টার)'),
          ...PMS('ict-ch-03'),
        ],
      },
      {
        id: 'ict-ch-04', legacyDocId: 'ICT_4', chapterNumber: 4, chapterName: 'ওয়েব ডিজাইন ও HTML',
        topics: [
          T('ict-ch-04-t01', 't01', 'ওয়েবসাইট ও এর কাঠামো'),
          T('ict-ch-04-t02', 't02', 'HTML ও ট্যাগ'),
          T('ict-ch-04-t03', 't03', 'লিস্ট তৈরি'),
          T('ict-ch-04-t04', 't04', 'হাইপারলিংক ও ইমেজ তৈরি'),
          T('ict-ch-04-t05', 't05', 'টেবিল তৈরি'),
          ...PMS('ict-ch-04'),
        ],
      },
      {
        id: 'ict-ch-05', legacyDocId: 'ICT_5', chapterNumber: 5, chapterName: 'প্রোগ্রামিং ভাষা',
        topics: [
          T('ict-ch-05-t01', 't01', 'প্রোগ্রামিং ভাষার ধারণা, স্তর এবং অনুবাদক প্রোগ্রাম'),
          T('ict-ch-05-t02', 't02', 'অ্যালগরিদম, ফ্লোচার্ট ও স্যুডোকোড'),
          T('ict-ch-05-t03', 't03', 'সি-প্রোগ্রামিং ভাষা, সি প্রোগ্রামে ব্যবহৃত ডেটাটাইপ'),
          T('ict-ch-05-t04', 't04', 'সি প্রোগ্রামে ব্যবহৃত বিভিন্ন অপারেটর'),
          T('ict-ch-05-t05', 't05', 'কন্ট্রোল স্টেটমেন্ট: কন্ডিশনাল ও লুপ'),
          T('ict-ch-05-t06', 't06', 'অ্যারে, স্ট্রিং ও ইউজার ডিফাইনড ফাংশন'),
          ...PMS('ict-ch-05'),
        ],
      },
      {
        id: 'ict-ch-06', legacyDocId: 'ICT_6', chapterNumber: 6, chapterName: 'ডেটাবেজ ম্যানেজমেন্ট সিস্টেম',
        topics: [
          T('ict-ch-06-t01', 't01', 'কম্পিউটার মেমোরি'),
          T('ict-ch-06-t02', 't02', 'DBMS'),
          T('ict-ch-06-t03', 't03', 'কুয়েরি ভাষা'),
          T('ict-ch-06-t04', 't04', 'ডেটা এনক্রিপশন'),
          ...PMS('ict-ch-06'),
        ],
      },
    ],
  },

  // ── English 1st Paper ─────────────────────────────────────────────────────
  English1: {
    id: 'English1',
    name: SUBJECT_DISPLAY_NAMES.English1,
    shortName: SUBJECT_SHORT_NAMES.English1,
    isBuet: false,
    color: SUBJECT_COLORS.English1,
    chapters: [
      { id: 'english1-ch-01', legacyDocId: 'English1_1', chapterNumber: 1, chapterName: 'Education and Life', topics: [...PMS('english1-ch-01')] },
      { id: 'english1-ch-02', legacyDocId: 'English1_2', chapterNumber: 2, chapterName: 'Art and Craft', topics: [...PMS('english1-ch-02')] },
      { id: 'english1-ch-03', legacyDocId: 'English1_3', chapterNumber: 3, chapterName: 'Myths and Literature', topics: [...PMS('english1-ch-03')] },
      { id: 'english1-ch-04', legacyDocId: 'English1_4', chapterNumber: 4, chapterName: 'History', topics: [...PMS('english1-ch-04')] },
      { id: 'english1-ch-05', legacyDocId: 'English1_5', chapterNumber: 5, chapterName: 'Human Rights', topics: [...PMS('english1-ch-05')] },
      { id: 'english1-ch-06', legacyDocId: 'English1_6', chapterNumber: 6, chapterName: 'Dreams', topics: [...PMS('english1-ch-06')] },
      { id: 'english1-ch-07', legacyDocId: 'English1_7', chapterNumber: 7, chapterName: 'Youthful Achievers', topics: [...PMS('english1-ch-07')] },
      { id: 'english1-ch-08', legacyDocId: 'English1_8', chapterNumber: 8, chapterName: 'Relationships', topics: [...PMS('english1-ch-08')] },
      { id: 'english1-ch-09', legacyDocId: 'English1_9', chapterNumber: 9, chapterName: 'Adolescence', topics: [...PMS('english1-ch-09')] },
      { id: 'english1-ch-10', legacyDocId: 'English1_10', chapterNumber: 10, chapterName: 'Lifestyle', topics: [...PMS('english1-ch-10')] },
      { id: 'english1-ch-11', legacyDocId: 'English1_11', chapterNumber: 11, chapterName: 'Peace and Conflict', topics: [...PMS('english1-ch-11')] },
      { id: 'english1-ch-12', legacyDocId: 'English1_12', chapterNumber: 12, chapterName: 'Environment and Nature', topics: [...PMS('english1-ch-12')] },
      { id: 'english1-ch-13', legacyDocId: 'English1_13', chapterNumber: 13, chapterName: 'Writing: Paragraph / Story / Letter / Graph / Rearrange', topics: [...PMS('english1-ch-13')] },
    ],
  },

  // ── English 2nd Paper ─────────────────────────────────────────────────────
  English2: {
    id: 'English2',
    name: SUBJECT_DISPLAY_NAMES.English2,
    shortName: SUBJECT_SHORT_NAMES.English2,
    isBuet: false,
    color: SUBJECT_COLORS.English2,
    chapters: [
      { id: 'english2-ch-01', legacyDocId: 'English2_1', chapterNumber: 1, chapterName: 'Gap Filling — Articles', topics: [...PMS('english2-ch-01')] },
      { id: 'english2-ch-02', legacyDocId: 'English2_2', chapterNumber: 2, chapterName: 'Gap Filling — Preposition', topics: [...PMS('english2-ch-02')] },
      { id: 'english2-ch-03', legacyDocId: 'English2_3', chapterNumber: 3, chapterName: 'Gap Filling with Clues', topics: [...PMS('english2-ch-03')] },
      { id: 'english2-ch-04', legacyDocId: 'English2_4', chapterNumber: 4, chapterName: 'Completing Sentences (Conditionals)', topics: [...PMS('english2-ch-04')] },
      { id: 'english2-ch-05', legacyDocId: 'English2_5', chapterNumber: 5, chapterName: 'Right Form of Verbs', topics: [...PMS('english2-ch-05')] },
      { id: 'english2-ch-06', legacyDocId: 'English2_6', chapterNumber: 6, chapterName: 'Changing Sentences (Voice / Degree)', topics: [...PMS('english2-ch-06')] },
      { id: 'english2-ch-07', legacyDocId: 'English2_7', chapterNumber: 7, chapterName: 'Narrative Style (Direct / Indirect)', topics: [...PMS('english2-ch-07')] },
      { id: 'english2-ch-08', legacyDocId: 'English2_8', chapterNumber: 8, chapterName: 'Pronoun Reference', topics: [...PMS('english2-ch-08')] },
      { id: 'english2-ch-09', legacyDocId: 'English2_9', chapterNumber: 9, chapterName: 'Use of Modifiers', topics: [...PMS('english2-ch-09')] },
      { id: 'english2-ch-10', legacyDocId: 'English2_10', chapterNumber: 10, chapterName: 'Sentence Connectors', topics: [...PMS('english2-ch-10')] },
      { id: 'english2-ch-11', legacyDocId: 'English2_11', chapterNumber: 11, chapterName: 'Synonym and Antonym', topics: [...PMS('english2-ch-11')] },
      { id: 'english2-ch-12', legacyDocId: 'English2_12', chapterNumber: 12, chapterName: 'Punctuation', topics: [...PMS('english2-ch-12')] },
      { id: 'english2-ch-13', legacyDocId: 'English2_13', chapterNumber: 13, chapterName: 'Writing: Formal Letter / Report / Paragraph / Composition', topics: [...PMS('english2-ch-13')] },
    ],
  },

  // ── বাংলা ১ম পত্র ──────────────────────────────────────────────────────────
  Bangla1: {
    id: 'Bangla1',
    name: SUBJECT_DISPLAY_NAMES.Bangla1,
    shortName: SUBJECT_SHORT_NAMES.Bangla1,
    isBuet: false,
    color: SUBJECT_COLORS.Bangla1,
    chapters: [
      { id: 'bangla1-ch-01', legacyDocId: 'Bangla1_1', chapterNumber: 1, chapterName: 'অপরিচিতা', topics: [...PMS('bangla1-ch-01')] },
      { id: 'bangla1-ch-02', legacyDocId: 'Bangla1_2', chapterNumber: 2, chapterName: 'বিলাসী', topics: [...PMS('bangla1-ch-02')] },
      { id: 'bangla1-ch-03', legacyDocId: 'Bangla1_3', chapterNumber: 3, chapterName: 'মাসি-পিসি', topics: [...PMS('bangla1-ch-03')] },
      { id: 'bangla1-ch-04', legacyDocId: 'Bangla1_4', chapterNumber: 4, chapterName: 'গন্তব্য কাবুল', topics: [...PMS('bangla1-ch-04')] },
      { id: 'bangla1-ch-05', legacyDocId: 'Bangla1_5', chapterNumber: 5, chapterName: 'রেইনকোট', topics: [...PMS('bangla1-ch-05')] },
      { id: 'bangla1-ch-06', legacyDocId: 'Bangla1_6', chapterNumber: 6, chapterName: 'বাংলার নব্য লেখকদিগের প্রতি নিবেদন', topics: [...PMS('bangla1-ch-06')] },
      { id: 'bangla1-ch-07', legacyDocId: 'Bangla1_7', chapterNumber: 7, chapterName: 'নেকলেস', topics: [...PMS('bangla1-ch-07')] },
      { id: 'bangla1-ch-08', legacyDocId: 'Bangla1_8', chapterNumber: 8, chapterName: 'যৌবনের গান', topics: [...PMS('bangla1-ch-08')] },
      { id: 'bangla1-ch-09', legacyDocId: 'Bangla1_9', chapterNumber: 9, chapterName: 'সাহিত্যে খেলা', topics: [...PMS('bangla1-ch-09')] },
      { id: 'bangla1-ch-10', legacyDocId: 'Bangla1_10', chapterNumber: 10, chapterName: 'অর্ধাঙ্গী', topics: [...PMS('bangla1-ch-10')] },
      { id: 'bangla1-ch-11', legacyDocId: 'Bangla1_11', chapterNumber: 11, chapterName: 'জীবন ও বৃক্ষ', topics: [...PMS('bangla1-ch-11')] },
      { id: 'bangla1-ch-12', legacyDocId: 'Bangla1_12', chapterNumber: 12, chapterName: 'কপিলদাস মুর্মুর শেষ কাজ', topics: [...PMS('bangla1-ch-12')] },
      { id: 'bangla1-ch-13', legacyDocId: 'Bangla1_13', chapterNumber: 13, chapterName: 'কারবালার প্রান্তর', topics: [...PMS('bangla1-ch-13')] },
      { id: 'bangla1-ch-14', legacyDocId: 'Bangla1_14', chapterNumber: 14, chapterName: 'প্রতিদান', topics: [...PMS('bangla1-ch-14')] },
      { id: 'bangla1-ch-15', legacyDocId: 'Bangla1_15', chapterNumber: 15, chapterName: 'তাহারেই পড়ে মনে', topics: [...PMS('bangla1-ch-15')] },
      { id: 'bangla1-ch-16', legacyDocId: 'Bangla1_16', chapterNumber: 16, chapterName: 'সোনার তরী', topics: [...PMS('bangla1-ch-16')] },
      { id: 'bangla1-ch-17', legacyDocId: 'Bangla1_17', chapterNumber: 17, chapterName: 'বিভীষণের প্রতি মেঘনাদ', topics: [...PMS('bangla1-ch-17')] },
      { id: 'bangla1-ch-18', legacyDocId: 'Bangla1_18', chapterNumber: 18, chapterName: 'বিদ্রোহী', topics: [...PMS('bangla1-ch-18')] },
      { id: 'bangla1-ch-19', legacyDocId: 'Bangla1_19', chapterNumber: 19, chapterName: 'আমি কিংবদন্তীর কথা বলছি', topics: [...PMS('bangla1-ch-19')] },
      { id: 'bangla1-ch-20', legacyDocId: 'Bangla1_20', chapterNumber: 20, chapterName: 'ঋতুবর্ণন', topics: [...PMS('bangla1-ch-20')] },
      { id: 'bangla1-ch-21', legacyDocId: 'Bangla1_21', chapterNumber: 21, chapterName: 'প্রত্যাবর্তনের লজ্জা', topics: [...PMS('bangla1-ch-21')] },
      { id: 'bangla1-ch-22', legacyDocId: 'Bangla1_22', chapterNumber: 22, chapterName: 'ফেব্রুয়ারি ১৯৬৯', topics: [...PMS('bangla1-ch-22')] },
      { id: 'bangla1-ch-23', legacyDocId: 'Bangla1_23', chapterNumber: 23, chapterName: 'পদ্মা', topics: [...PMS('bangla1-ch-23')] },
      { id: 'bangla1-ch-24', legacyDocId: 'Bangla1_24', chapterNumber: 24, chapterName: 'সুচেতনা', topics: [...PMS('bangla1-ch-24')] },
      { id: 'bangla1-ch-25', legacyDocId: 'Bangla1_25', chapterNumber: 25, chapterName: 'সুখ', topics: [...PMS('bangla1-ch-25')] },
      { id: 'bangla1-ch-26', legacyDocId: 'Bangla1_26', chapterNumber: 26, chapterName: 'আঠারো বছর বয়স', topics: [...PMS('bangla1-ch-26')] },
      { id: 'bangla1-ch-27', legacyDocId: 'Bangla1_27', chapterNumber: 27, chapterName: 'লালসালু (উপন্যাস)', topics: [...PMS('bangla1-ch-27')] },
      { id: 'bangla1-ch-28', legacyDocId: 'Bangla1_28', chapterNumber: 28, chapterName: 'সিরাজউদ্দৌলা (নাটক)', topics: [...PMS('bangla1-ch-28')] },
    ],
  },

  // ── বাংলা ২য় পত্র ──────────────────────────────────────────────────────────
  Bangla2: {
    id: 'Bangla2',
    name: SUBJECT_DISPLAY_NAMES.Bangla2,
    shortName: SUBJECT_SHORT_NAMES.Bangla2,
    isBuet: false,
    color: SUBJECT_COLORS.Bangla2,
    chapters: [
      { id: 'bangla2-ch-01', legacyDocId: 'Bangla2_1', chapterNumber: 1, chapterName: 'উচ্চারণ', topics: [...PMS('bangla2-ch-01')] },
      { id: 'bangla2-ch-02', legacyDocId: 'Bangla2_2', chapterNumber: 2, chapterName: 'বাংলা বানান', topics: [...PMS('bangla2-ch-02')] },
      { id: 'bangla2-ch-03', legacyDocId: 'Bangla2_3', chapterNumber: 3, chapterName: 'ব্যাকরণিক শব্দশ্রেণি', topics: [...PMS('bangla2-ch-03')] },
      { id: 'bangla2-ch-04', legacyDocId: 'Bangla2_4', chapterNumber: 4, chapterName: 'শব্দগঠন (উপসর্গ / সমাস)', topics: [...PMS('bangla2-ch-04')] },
      { id: 'bangla2-ch-05', legacyDocId: 'Bangla2_5', chapterNumber: 5, chapterName: 'বাক্যতত্ত্ব', topics: [...PMS('bangla2-ch-05')] },
      { id: 'bangla2-ch-06', legacyDocId: 'Bangla2_6', chapterNumber: 6, chapterName: 'বাংলা ভাষার অপপ্রয়োগ ও শুদ্ধপ্রয়োগ', topics: [...PMS('bangla2-ch-06')] },
      { id: 'bangla2-ch-07', legacyDocId: 'Bangla2_7', chapterNumber: 7, chapterName: 'পারিভাষিক শব্দ বা অনুবাদ', topics: [...PMS('bangla2-ch-07')] },
      { id: 'bangla2-ch-08', legacyDocId: 'Bangla2_8', chapterNumber: 8, chapterName: 'দিনলিপি বা প্রতিবেদন', topics: [...PMS('bangla2-ch-08')] },
      { id: 'bangla2-ch-09', legacyDocId: 'Bangla2_9', chapterNumber: 9, chapterName: 'বৈদ্যুতিক চিঠি বা আবেদনপত্র বা চিঠি', topics: [...PMS('bangla2-ch-09')] },
      { id: 'bangla2-ch-10', legacyDocId: 'Bangla2_10', chapterNumber: 10, chapterName: 'সারাংশ ও সারমর্ম বা ভাবসম্প্রসারণ', topics: [...PMS('bangla2-ch-10')] },
      { id: 'bangla2-ch-11', legacyDocId: 'Bangla2_11', chapterNumber: 11, chapterName: 'ক্ষুদে গল্প বা সংলাপ', topics: [...PMS('bangla2-ch-11')] },
      { id: 'bangla2-ch-12', legacyDocId: 'Bangla2_12', chapterNumber: 12, chapterName: 'প্রবন্ধ রচনা', topics: [...PMS('bangla2-ch-12')] },
    ],
  },
};

// ── Helper Lookup Functions ──────────────────────────────────────────────────

/** Get full subject object by key (e.g. 'Physics1') */
export function getSubjectData(subjectKey) {
  return SYLLABUS[subjectKey] || null;
}

/** Get specific chapter from subject and chapter number */
export function getChapterData(subjectKey, chapterNumber) {
  const subj = SYLLABUS[subjectKey];
  if (!subj) return null;
  return subj.chapters.find(c => c.chapterNumber === Number(chapterNumber)) || null;
}

/** Get all topics for a given subject and chapter number */
export function getTopicsForChapter(subjectKey, chapterNumber) {
  const ch = getChapterData(subjectKey, chapterNumber);
  return ch ? ch.topics : [];
}

/** Flatten all chapters across all 13 subjects */
export function getAllChaptersList() {
  const list = [];
  HSC_SUBJECT_KEYS.forEach(subjKey => {
    const subj = SYLLABUS[subjKey];
    if (subj) {
      subj.chapters.forEach(ch => {
        list.push({
          ...ch,
          subject: subjKey,
        });
      });
    }
  });
  return list;
}
