/* ─────────────────────────────────────────────────────────────
   spots.js — JapanNow canonical spot database
   ─────────────────────────────────────────────────────────────

   SPOT SCHEMA
   Each entry in SP must conform to:

   {
     n:  string           — display name (English or Japanese)
     c:  string           — category key (see CL for valid values)
     d:  "here"|"near"|"far"
                          — distance bucket:
                              "here" = walking distance (~0-15 min)
                              "near" = short trip (~30 min by train)
                              "far"  = day trip (1hr+)
     r:  0|1              — rain-friendly: 1 = good indoors/covered
     t:  string[]         — valid time windows, subset of:
                              "morning" | "day" | "evening" | "night" | "late"
     v:  string[]         — vibe tags, subset of:
                              "food" | "sweet" | "drink" | "dance" | "sing" |
                              "see" | "weird" | "walk" | "cozy" | "couple" |
                              "local" | "nobody" | "broke" | "surprise"
     nt: string           — one-sentence note shown to user
     a:  string           — area/neighborhood slug (lowercase, no spaces)
                              used for late-night area filter
     la: number           — latitude  (WGS84)
     ln: number           — longitude (WGS84)
   }

   ───────────────────────────────────────────────────────────── */

/* Category labels — maps category key → display string */
const CL = {
  bar:        "bar",
  nightlife:  "nightlife",
  club:       "club",
  karaoke:    "karaoke",
  lovehotel:  "love hotel",
  "24hr":     "24hr",
  mangacafe:  "manga café",
  afterhours: "after hours",
  cafe:       "cafe",
  food:       "food",
  sweet:      "sweets",
  wagashi:    "wagashi",
  culture:    "culture",
  nature:     "nature",
  park:       "park",
  shrine:     "shrine",
  daytrip:    "day trip",
  couple:     "couples",
  urbex:      "urbex",
  niche:      "niche",
  shopping:   "shopping",
  market:     "market",
};

/* Categories that only appear after last train */
const LC = ["club","karaoke","lovehotel","24hr","mangacafe","afterhours"];

/* ── FILTER OPTION LISTS ──────────────────────────────────── */

const TM = [
  {id:"morning", l:"早朝 early morning"},
  {id:"day",     l:"昼間 daytime"},
  {id:"evening", l:"夕暮れ evening"},
  {id:"night",   l:"夜 night"},
  {id:"late",    l:"深夜 late / 終電後"},
];

const VM = [
  {id:"food",     l:"腹減った — hungry"},
  {id:"sweet",    l:"甘いもの — something sweet"},
  {id:"drink",    l:"飲みたい — a drink"},
  {id:"dance",    l:"踊りたい — dance"},
  {id:"sing",     l:"カラオケ — karaoke"},
  {id:"see",      l:"見たい — see something"},
  {id:"weird",    l:"変なもの — something weird"},
  {id:"walk",     l:"散歩 — walk somewhere beautiful"},
  {id:"cozy",     l:"落ち着きたい — cozy inside"},
  {id:"couple",   l:"二人で — couples moment"},
  {id:"local",    l:"地元 — talk to locals"},
  {id:"nobody",   l:"穴場 — where nobody else goes"},
  {id:"broke",    l:"節約 — spend no money"},
  {id:"surprise", l:"おまかせ — just surprise us"},
];

const DM = [
  {id:"walk5",   l:"5分 — 5 min walk"},
  {id:"walk10",  l:"10分 — 10 min walk"},
  {id:"walk20",  l:"20分 — 20 min walk"},
  {id:"train30", l:"30分 — 30 min train"},
  {id:"anywhere",l:"どこでも — anywhere"},
];

const LTM = [
  {id:"club",       l:"クラブ — keep dancing"},
  {id:"karaoke",    l:"カラオケ"},
  {id:"lovehotel",  l:"ホテル — love hotel"},
  {id:"24hr",       l:"飯 — eat something"},
  {id:"mangacafe",  l:"漫喫 — crash somewhere"},
  {id:"afterhours", l:"深夜バー — late bar"},
];

const LAM = [
  {id:"shinjuku",     l:"新宿"},
  {id:"shibuya",      l:"渋谷"},
  {id:"ikebukuro",    l:"池袋"},
  {id:"shimokitazawa",l:"下北沢"},
  {id:"nakameguro",   l:"中目黒"},
  {id:"ebisu",        l:"恵比寿"},
  {id:"roppongi",     l:"六本木"},
  {id:"kichijoji",    l:"吉祥寺"},
  {id:"asakusa",      l:"浅草"},
  {id:"akihabara",    l:"秋葉原"},
  {id:"sangenjaya",   l:"三軒茶屋"},
  {id:"yurakucho",    l:"有楽町"},
  {id:"meguro",       l:"目黒"},
  {id:"ginza",        l:"銀座"},
  {id:"ueno",         l:"上野"},
  {id:"daikanyama",   l:"代官山"},
];

const WX = [
  {id:"rain",  l:"🌧 raining"},
  {id:"hot",   l:"🥵 very hot"},
  {id:"cold",  l:"🧥 cold"},
  {id:"clear", l:"✨ clear night"},
];

/* ── HERO PHRASES ────────────────────────────────────────── */

const PHRASES = {
  morning: [
    "東京はまだ眠っている。",
    "the city is yours before it notices you.",
    "空っぽの通り。最高の時間だ。",
    "empty streets. best time.",
    "the sento opens at 6.",
    "somewhere a kissaten is brewing its first coffee.",
    "静かだ。長くは続かない。",
    "this is the hour nobody talks about.",
    "start moving before the city wakes up.",
  ],
  day: [
    "どこへ行く？",
    "tokyo is waiting.",
    "pick a direction. any direction.",
    "you're in the right city.",
    "something good is a train ride away.",
    "the map is wrong. go anyway.",
    "今日は何をする？",
    "what are we doing today.",
    "one good decision and the whole day changes.",
  ],
  sunset: [
    "居酒屋の提灯が灯る時間だ。",
    "the izakayas are lighting their lanterns.",
    "夕暮れ。どこかへ。",
    "this is the hour to start walking.",
    "something is beginning.",
    "follow the warm light.",
    "the city is shifting gears.",
    "good things happen after sunset.",
    "夜が始まる。",
  ],
  late: [
    "終電が過ぎた。",
    "where did you end up?",
    "深夜。まだ終わらない。",
    "first train at 5:30. what's the plan?",
    "somewhere in this city, a bar is still open.",
    "this is the real tokyo.",
    "you're still out. make it count.",
    "the best nights don't have a plan.",
    "まだまだ終わらない。",
    "it's late. perfect.",
    "この街はまだ眠らない。",
  ],
};

/* ── LAST TRAIN DATA ─────────────────────────────────────
   Format: { area: [weekday_train, weekend_train] }
   Train string starts with "HH:MM" used for countdown math.
   ─────────────────────────────────────────────────────── */

const TRAINS = {
  shinjuku:     ["00:21 → Ikebukuro ~00:39","00:29 → Ikebukuro ~00:47"],
  shibuya:      ["00:37 Yamanote → Ikebukuro ~01:04","00:54 Yamanote → Ikebukuro ~01:19"],
  ebisu:        ["00:33 Yamanote → Ikebukuro ~01:02","00:50 Yamanote → Ikebukuro ~01:17"],
  nakameguro:   ["00:28 Tokyu → Shibuya then Yamanote","00:45"],
  roppongi:     ["00:24 Hibiya line last","00:40"],
  ginza:        ["00:22 Marunouchi → Ikebukuro ~00:45","00:36"],
  yurakucho:    ["00:20 Yamanote → Ikebukuro ~00:45","00:38"],
  ueno:         ["00:33 Yamanote → Ikebukuro ~00:48","00:50"],
  asakusa:      ["00:18 Ginza → Shibuya then Yamanote","00:30"],
  akihabara:    ["00:29 Yamanote → Ikebukuro ~00:48","00:46"],
  ochanomizu:   ["00:25 Chuo → Shinjuku then transfer","00:40"],
  koenji:       ["00:26 Chuo → Shinjuku ~00:32","00:42"],
  kichijoji:    ["00:17 Chuo → Shinjuku ~00:31","00:32"],
  shimokitazawa:["00:20 Keio → Shibuya then Yamanote","00:38"],
  sangenjaya:   ["00:18 Den-en-toshi → Shibuya then Yamanote","00:35"],
  daikanyama:   ["00:28 Tokyu Toyoko → Ikebukuro direct ~00:52","00:44"],
  meguro:       ["00:30 Yamanote → Ikebukuro ~00:58","00:47"],
};

/* ── NEIGHBORHOOD COORDINATES ────────────────────────────
   Used to resolve typed location to lat/lng for distance math.
   ─────────────────────────────────────────────────────── */

const HD = {
  "ikebukuro":      [35.7296,139.7139],
  "池袋":            [35.7296,139.7139],
  "mejiro":         [35.7265,139.705],
  "目白":            [35.7265,139.705],
  "shinjuku":       [35.6934,139.7036],
  "新宿":            [35.6934,139.7036],
  "shibuya":        [35.658,139.7016],
  "渋谷":            [35.658,139.7016],
  "harajuku":       [35.6699,139.71],
  "asakusa":        [35.7115,139.7964],
  "ueno":           [35.7141,139.7774],
  "akihabara":      [35.7023,139.7745],
  "ginza":          [35.6721,139.7648],
  "roppongi":       [35.6628,139.7314],
  "nakameguro":     [35.6441,139.6989],
  "daikanyama":     [35.6489,139.6987],
  "ebisu":          [35.6468,139.7101],
  "shimokitazawa":  [35.6612,139.668],
  "koenji":         [35.7054,139.649],
  "kichijoji":      [35.7034,139.5793],
  "yanaka":         [35.7268,139.7674],
  "kagurazaka":     [35.7009,139.7403],
  "waseda":         [35.7085,139.7197],
  "ochanomizu":     [35.698,139.7634],
  "akasaka":        [35.6749,139.7373],
  "yurakucho":      [35.6754,139.763],
  "nihonbashi":     [35.6839,139.7744],
  "sangenjaya":     [35.6455,139.6689],
  "meguro":         [35.6334,139.716],
  "nippori":        [35.732,139.7716],
  "shimokita":      [35.6612,139.668],
  "nezu":           [35.718,139.7609],
  "mitaka":         [35.6834,139.5592],
  "jindaiji":       [35.6602,139.5634],
};

/* ── SPOTS ───────────────────────────────────────────────────
   Populated at runtime via fetch('spots.json') — see init in
   japan_now.html. Do not declare SP here.
   ─────────────────────────────────────────────────────────── */
let SP = [];
