// قاعدة بيانات الأطعمة v2 — أساس قانوني وقابل للتوسّع، مركّز على المستخدم السعودي/الخليجي.
//
// ⚖️ مصدر قانوني فقط:
//   - qimmah_curated: قيم منسوخة يدويًا من معرفة غذائية عامة (تقديرية).
//   - open_dataset:   مجموعات بيانات مفتوحة الرخصة (لا يوجد حاليًا، محجوز للمستقبل).
//   - user_custom:    أطعمة يضيفها المستخدم بنفسه.
// 🚫 لا scraping أو نسخ من MyFitnessPal/Marn أو أي تطبيق مغلق. لا APIs غير رسمية.
//
// القيم تقديرية وليست دقة طبية. كل صنف يحمل confidence (high/medium/low).
// تفاصيل الاستراتيجية: docs/v2-research/FOOD_DATABASE_STRATEGY.md

import type { FoodV2 } from '@/types/nutrition'
import type { FoodCategory, FoodItem } from './foodItems'

/** بذرة صنف: نكتب perServing فقط، ويُشتق per100g آليًا من الغرامات. */
type FoodSeed = Omit<FoodV2, 'per100g'> & { per100g?: FoodV2['per100g'] }

/** يشتق per100g من القيم لكل حصة + الغرامات (سعرات صحيحة، ماكروز بخانة عشرية). */
function build(seed: FoodSeed): FoodV2 {
  const g = seed.serving.grams
  if (seed.per100g || !g || g <= 0) return seed as FoodV2
  const ps = seed.perServing
  const r1 = (n: number) => Math.round((n * 1000) / g) / 10
  return {
    ...seed,
    per100g: {
      calories: Math.round((ps.calories * 100) / g),
      protein: r1(ps.protein),
      carbs: r1(ps.carbs),
      fat: r1(ps.fat),
    },
  }
}

const seeds: FoodSeed[] = [
  // ===== أرز وأطباق أرز (rice) =====
  {
    id: 'rice-white-cooked', name_ar: 'رز أبيض مطبوخ', name_en: 'White rice (cooked)',
    category: 'rice', cuisine: 'international',
    serving: { label_ar: 'كوب (200غ)', label_en: 'Cup (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 260, protein: 5, carbs: 56, fat: 1, fiber: 1 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['رز', 'ارز', 'رز ابيض'], aliases_en: ['rice', 'plain rice'],
  },
  {
    id: 'rice-brown-cooked', name_ar: 'رز بني مطبوخ', name_en: 'Brown rice (cooked)',
    category: 'rice', cuisine: 'international',
    serving: { label_ar: 'كوب (200غ)', label_en: 'Cup (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 248, protein: 6, carbs: 52, fat: 2, fiber: 4 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['رز اسمر'], aliases_en: ['brown rice'],
  },
  {
    id: 'rice-kabsa', name_ar: 'رز كبسة', name_en: 'Kabsa rice',
    category: 'rice', cuisine: 'saudi',
    serving: { label_ar: 'كوب (200غ)', label_en: 'Cup (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 320, protein: 6, carbs: 50, fat: 11, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'رز مطبوخ بالبهارات والزيت — بدون لحم.',
    aliases_ar: ['كبسه', 'رز كبسه'], aliases_en: ['kabsa rice'],
  },
  {
    id: 'rice-bukhari', name_ar: 'رز بخاري', name_en: 'Bukhari rice',
    category: 'rice', cuisine: 'saudi',
    serving: { label_ar: 'كوب (200غ)', label_en: 'Cup (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 300, protein: 6, carbs: 52, fat: 8, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['بخاري', 'رز بخاري'], aliases_en: ['bukhari rice', 'bukhary'],
  },
  {
    id: 'rice-biryani', name_ar: 'رز برياني', name_en: 'Biryani rice',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'كوب (200غ)', label_en: 'Cup (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 330, protein: 7, carbs: 52, fat: 11, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['برياني'], aliases_en: ['biryani rice', 'biriyani'],
  },
  {
    id: 'rice-vermicelli', name_ar: 'رز بالشعيرية', name_en: 'Rice with vermicelli',
    category: 'rice', cuisine: 'levant',
    serving: { label_ar: 'كوب (200غ)', label_en: 'Cup (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 290, protein: 6, carbs: 54, fat: 6, fiber: 1 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['رز بشعيريه'], aliases_en: ['vermicelli rice'],
  },
  {
    id: 'kabsa-chicken', name_ar: 'كبسة دجاج', name_en: 'Chicken kabsa',
    category: 'rice', cuisine: 'saudi',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 620, protein: 35, carbs: 65, fat: 24, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'صحن منزلي ~350غ (رز + ربع دجاجة). صحن المطعم قد يكون أكبر.',
    aliases_ar: ['كبسه دجاج', 'كبسة فراخ'], aliases_en: ['chicken kabsa', 'kabsa chicken'],
  },
  {
    id: 'kabsa-lamb', name_ar: 'كبسة لحم', name_en: 'Lamb kabsa',
    category: 'rice', cuisine: 'saudi',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 700, protein: 33, carbs: 64, fat: 34, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'صحن منزلي ~350غ. حصص المطاعم غالبًا أكبر.',
    aliases_ar: ['كبسه لحم', 'كبسة غنم'], aliases_en: ['lamb kabsa'],
  },
  {
    id: 'bukhari-chicken', name_ar: 'بخاري دجاج', name_en: 'Chicken bukhari',
    category: 'rice', cuisine: 'saudi',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 640, protein: 34, carbs: 66, fat: 26, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['بخاري دجاج', 'رز بخاري بالدجاج'], aliases_en: ['chicken bukhari'],
  },
  {
    id: 'mandi-chicken', name_ar: 'مندي دجاج', name_en: 'Chicken mandi',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 600, protein: 34, carbs: 62, fat: 23, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مندي', 'مندي فراخ'], aliases_en: ['chicken mandi', 'mandi'],
  },
  {
    id: 'mandi-lamb', name_ar: 'مندي لحم', name_en: 'Lamb mandi',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 690, protein: 32, carbs: 60, fat: 35, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مندي لحم', 'مندي غنم'], aliases_en: ['lamb mandi'],
  },
  {
    id: 'madhbi-chicken', name_ar: 'مظبي دجاج', name_en: 'Madhbi chicken',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 610, protein: 35, carbs: 60, fat: 24, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مظبي', 'مضبي', 'مظبي فراخ'], aliases_en: ['madhbi', 'mathbi'],
  },
  {
    id: 'madfoon-chicken', name_ar: 'مدفون دجاج', name_en: 'Madfoon chicken',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 610, protein: 34, carbs: 62, fat: 24, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مدفون'], aliases_en: ['madfoon', 'madfun'],
  },
  {
    id: 'biryani-chicken', name_ar: 'برياني دجاج', name_en: 'Chicken biryani',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 650, protein: 33, carbs: 68, fat: 26, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['برياني دجاج'], aliases_en: ['chicken biryani'],
  },
  {
    id: 'maqluba', name_ar: 'مقلوبة', name_en: 'Maqluba',
    category: 'rice', cuisine: 'levant',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 580, protein: 26, carbs: 64, fat: 24, fiber: 4 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مقلوبه'], aliases_en: ['maqluba', 'maqlooba'],
  },
  {
    id: 'saleeg', name_ar: 'سليق', name_en: 'Saleeg',
    category: 'rice', cuisine: 'saudi',
    serving: { label_ar: 'صحن (300غ)', label_en: 'Plate (300g)', grams: 300, quantity: 1 },
    perServing: { calories: 430, protein: 22, carbs: 50, fat: 16 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['سليق طائفي'], aliases_en: ['saleeg'],
  },

  // ===== لحوم (meat) =====
  {
    id: 'lamb-meat', name_ar: 'لحم غنم', name_en: 'Lamb meat',
    category: 'meat', cuisine: 'international',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 294, protein: 25, carbs: 0, fat: 21 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['لحم خروف', 'غنم'], aliases_en: ['lamb', 'mutton'],
  },
  {
    id: 'beef-meat', name_ar: 'لحم بقر', name_en: 'Beef meat',
    category: 'meat', cuisine: 'international',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 250, protein: 26, carbs: 0, fat: 15 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['لحم بقري'], aliases_en: ['beef'],
  },
  {
    id: 'ground-beef', name_ar: 'لحم مفروم', name_en: 'Ground beef',
    category: 'meat', cuisine: 'international',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 254, protein: 24, carbs: 0, fat: 17 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['لحمة مفرومة', 'مفروم'], aliases_en: ['ground beef', 'minced meat'],
  },
  {
    id: 'camel-meat', name_ar: 'لحم جمل', name_en: 'Camel meat',
    category: 'meat', cuisine: 'gulf',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 160, protein: 26, carbs: 0, fat: 6 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['لحم ابل', 'حاشي'], aliases_en: ['camel'],
  },
  {
    id: 'kabab', name_ar: 'كباب لحم', name_en: 'Meat kebab',
    category: 'meat', cuisine: 'levant',
    serving: { label_ar: 'سيخان (150غ)', label_en: '2 skewers (150g)', grams: 150, quantity: 2 },
    perServing: { calories: 330, protein: 28, carbs: 3, fat: 23 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['كباب'], aliases_en: ['kebab', 'kabab'],
  },
  {
    id: 'mugalgal', name_ar: 'مقلقل', name_en: 'Mugalgal (sautéed meat)',
    category: 'meat', cuisine: 'saudi',
    serving: { label_ar: 'صحن (250غ)', label_en: 'Plate (250g)', grams: 250, quantity: 1 },
    perServing: { calories: 380, protein: 30, carbs: 8, fat: 25, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مقلقل لحم'], aliases_en: ['mugalgal'],
  },

  // ===== دجاج (chicken) =====
  {
    id: 'chicken-breast-100', name_ar: 'صدر دجاج', name_en: 'Chicken breast',
    category: 'chicken', cuisine: 'international',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 165, protein: 31, carbs: 0, fat: 4 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['صدور دجاج', 'صدر فراخ'], aliases_en: ['chicken breast'],
  },
  {
    id: 'chicken-breast-grilled', name_ar: 'صدر دجاج مشوي', name_en: 'Grilled chicken breast',
    category: 'chicken', cuisine: 'international',
    serving: { label_ar: 'صدر (150غ)', label_en: 'Fillet (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 248, protein: 46, carbs: 0, fat: 6 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['صدر مشوي'], aliases_en: ['grilled chicken breast'],
  },
  {
    id: 'chicken-grilled-meal', name_ar: 'دجاج مشوي', name_en: 'Grilled chicken',
    category: 'chicken', cuisine: 'international',
    serving: { label_ar: 'ربع دجاجة (200غ)', label_en: 'Quarter (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 380, protein: 42, carbs: 0, fat: 23 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['دجاج شواية', 'فراخ مشوية'], aliases_en: ['grilled chicken', 'rotisserie chicken'],
  },
  {
    id: 'chicken-thigh', name_ar: 'فخذ دجاج', name_en: 'Chicken thigh',
    category: 'chicken', cuisine: 'international',
    serving: { label_ar: 'فخذ (100غ)', label_en: 'Thigh (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 209, protein: 26, carbs: 0, fat: 11 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['ورك دجاج'], aliases_en: ['chicken thigh'],
  },
  {
    id: 'chicken-mince', name_ar: 'دجاج مفروم', name_en: 'Ground chicken',
    category: 'chicken', cuisine: 'international',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 143, protein: 17, carbs: 0, fat: 8 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_en: ['ground chicken', 'minced chicken'],
  },
  {
    id: 'broasted-chicken', name_ar: 'بروستد دجاج', name_en: 'Broasted chicken',
    category: 'restaurant', cuisine: 'gulf',
    serving: { label_ar: 'قطعتان (200غ)', label_en: '2 pieces (200g)', grams: 200, quantity: 2 },
    perServing: { calories: 540, protein: 32, carbs: 24, fat: 35 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'دجاج مقلي مغطّى بالبقسماط. القيم تختلف حسب المطعم.',
    aliases_ar: ['بروست', 'بروستد', 'دجاج بروست'], aliases_en: ['broast', 'broasted', 'fried chicken'],
  },
  {
    id: 'shish-tawook', name_ar: 'شيش طاووق', name_en: 'Shish tawook plate',
    category: 'chicken', cuisine: 'levant',
    serving: { label_ar: 'وجبة (300غ)', label_en: 'Plate (300g)', grams: 300, quantity: 1 },
    perServing: { calories: 480, protein: 40, carbs: 30, fat: 22, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['شيش طاوق'], aliases_en: ['shish tawook', 'tawook'],
  },

  // ===== أسماك (fish) =====
  {
    id: 'fish-hamour', name_ar: 'سمك هامور مشوي', name_en: 'Grilled hammour (grouper)',
    category: 'fish', cuisine: 'gulf',
    serving: { label_ar: 'شريحة (150غ)', label_en: 'Fillet (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 165, protein: 35, carbs: 0, fat: 2 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['هامور', 'سمك هامور'], aliases_en: ['hammour', 'grouper'],
  },
  {
    id: 'fish-grilled', name_ar: 'سمك مشوي', name_en: 'Grilled fish',
    category: 'fish', cuisine: 'gulf',
    serving: { label_ar: '200غ', label_en: '200g', grams: 200, quantity: 1 },
    perServing: { calories: 240, protein: 40, carbs: 0, fat: 9 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['سمك مشوي', 'سمك'], aliases_en: ['grilled fish', 'fish'],
  },
  {
    id: 'salmon', name_ar: 'سلمون', name_en: 'Salmon',
    category: 'fish', cuisine: 'international',
    serving: { label_ar: 'شريحة (150غ)', label_en: 'Fillet (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 312, protein: 31, carbs: 0, fat: 20 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_en: ['salmon'],
  },
  {
    id: 'shrimp', name_ar: 'روبيان', name_en: 'Shrimp',
    category: 'fish', cuisine: 'gulf',
    serving: { label_ar: '100غ', label_en: '100g', grams: 100, quantity: 1 },
    perServing: { calories: 99, protein: 24, carbs: 0, fat: 1 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['ربيان', 'جمبري'], aliases_en: ['shrimp', 'prawns'],
  },
  {
    id: 'tuna-water', name_ar: 'تونة بالماء', name_en: 'Canned tuna in water',
    category: 'fish', cuisine: 'international',
    serving: { label_ar: 'علبة مصفّاة (100غ)', label_en: 'Can drained (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 116, protein: 26, carbs: 0, fat: 1 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['تونه', 'تونة'], aliases_en: ['tuna'],
  },
  {
    id: 'tuna-oil', name_ar: 'تونة بالزيت', name_en: 'Canned tuna in oil',
    category: 'fish', cuisine: 'international',
    serving: { label_ar: 'علبة مصفّاة (100غ)', label_en: 'Can drained (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 198, protein: 25, carbs: 0, fat: 10 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['تونه بالزيت'], aliases_en: ['tuna in oil'],
  },
  {
    id: 'sayadia', name_ar: 'صيادية (سمك برز)', name_en: 'Sayadia (fish with rice)',
    category: 'rice', cuisine: 'gulf',
    serving: { label_ar: 'صحن (350غ)', label_en: 'Plate (350g)', grams: 350, quantity: 1 },
    perServing: { calories: 560, protein: 34, carbs: 60, fat: 20, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['صياديه'], aliases_en: ['sayadia', 'sayadieh'],
  },

  // ===== خبز (bread) =====
  {
    id: 'arabic-bread', name_ar: 'خبز عربي (صامولي)', name_en: 'Arabic pita bread',
    category: 'bread', cuisine: 'saudi',
    serving: { label_ar: 'رغيف (80غ)', label_en: 'Loaf (80g)', grams: 80, quantity: 1 },
    perServing: { calories: 220, protein: 7, carbs: 44, fat: 2, fiber: 2 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['صامولي', 'خبز ابيض عربي'], aliases_en: ['pita', 'arabic bread'],
  },
  {
    id: 'brown-bread', name_ar: 'خبز بر', name_en: 'Whole wheat bread',
    category: 'bread', cuisine: 'international',
    serving: { label_ar: 'شريحتان (60غ)', label_en: '2 slices (60g)', grams: 60, quantity: 2 },
    perServing: { calories: 150, protein: 7, carbs: 27, fat: 2, fiber: 4 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['خبز اسمر', 'خبز قمح'], aliases_en: ['brown bread', 'whole wheat bread'],
  },
  {
    id: 'white-bread', name_ar: 'خبز أبيض', name_en: 'White bread',
    category: 'bread', cuisine: 'international',
    serving: { label_ar: 'شريحتان (60غ)', label_en: '2 slices (60g)', grams: 60, quantity: 2 },
    perServing: { calories: 160, protein: 5, carbs: 30, fat: 2, fiber: 1 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['توست'], aliases_en: ['white bread', 'toast'],
  },
  {
    id: 'tameez', name_ar: 'تميس', name_en: 'Tameez (Afghan bread)',
    category: 'bread', cuisine: 'saudi',
    serving: { label_ar: 'نصف رغيف (100غ)', label_en: 'Half loaf (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 270, protein: 9, carbs: 52, fat: 3, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['تميز', 'خبز افغاني'], aliases_en: ['tameez', 'tamees'],
  },
  {
    id: 'khubz-tannour', name_ar: 'خبز تنور', name_en: 'Tannour bread',
    category: 'bread', cuisine: 'saudi',
    serving: { label_ar: 'رغيف (90غ)', label_en: 'Loaf (90g)', grams: 90, quantity: 1 },
    perServing: { calories: 230, protein: 7, carbs: 46, fat: 2, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['خبز التنور', 'خبز شراك'], aliases_en: ['tannour bread'],
  },
  {
    id: 'mtabbaq', name_ar: 'مطبق', name_en: 'Mutabbaq',
    category: 'bread', cuisine: 'saudi',
    serving: { label_ar: 'قطعة (150غ)', label_en: 'Piece (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 360, protein: 12, carbs: 40, fat: 17, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'القيم تختلف حسب الحشوة (لحم/خضار/موز).',
    aliases_ar: ['مطبق لحم', 'مطبق موز'], aliases_en: ['mutabbaq', 'motabbag'],
  },
  {
    id: 'samosa', name_ar: 'سمبوسة', name_en: 'Samosa',
    category: 'snack', cuisine: 'gulf',
    serving: { label_ar: 'حبة (40غ)', label_en: 'Piece (40g)', grams: 40, quantity: 1 },
    perServing: { calories: 120, protein: 4, carbs: 12, fat: 6, fiber: 1 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['سمبوسك'], aliases_en: ['samosa', 'sambousek'],
  },

  // ===== ألبان (dairy) =====
  {
    id: 'laban', name_ar: 'لبن (زبادي سائل)', name_en: 'Laban (drinking yogurt)',
    category: 'dairy', cuisine: 'gulf',
    serving: { label_ar: 'كوب (200مل)', label_en: 'Cup (200ml)', grams: 200, quantity: 1 },
    perServing: { calories: 80, protein: 6, carbs: 10, fat: 2, sugar: 9 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['لبن'], aliases_en: ['laban', 'buttermilk'],
  },
  {
    id: 'greek-yogurt', name_ar: 'زبادي يوناني', name_en: 'Greek yogurt',
    category: 'dairy', cuisine: 'international',
    serving: { label_ar: 'علبة (170غ)', label_en: 'Cup (170g)', grams: 170, quantity: 1 },
    perServing: { calories: 100, protein: 17, carbs: 6, fat: 1, sugar: 5 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['زبادي يونانى', 'روب يوناني'], aliases_en: ['greek yogurt'],
  },
  {
    id: 'yogurt-plain', name_ar: 'زبادي عادي', name_en: 'Plain yogurt',
    category: 'dairy', cuisine: 'international',
    serving: { label_ar: 'علبة (170غ)', label_en: 'Cup (170g)', grams: 170, quantity: 1 },
    perServing: { calories: 100, protein: 6, carbs: 12, fat: 4, sugar: 9 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['روب', 'زبادي'], aliases_en: ['yogurt'],
  },
  {
    id: 'milk-full', name_ar: 'حليب كامل الدسم', name_en: 'Whole milk',
    category: 'dairy', cuisine: 'international',
    serving: { label_ar: 'كوب (200مل)', label_en: 'Cup (200ml)', grams: 200, quantity: 1 },
    perServing: { calories: 122, protein: 7, carbs: 10, fat: 7, sugar: 10 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['حليب'], aliases_en: ['milk', 'whole milk'],
  },
  {
    id: 'milk-low-fat', name_ar: 'حليب قليل الدسم', name_en: 'Low-fat milk',
    category: 'dairy', cuisine: 'international',
    serving: { label_ar: 'كوب (200مل)', label_en: 'Cup (200ml)', grams: 200, quantity: 1 },
    perServing: { calories: 84, protein: 7, carbs: 10, fat: 2, sugar: 10 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['حليب لايت'], aliases_en: ['low fat milk', 'skim milk'],
  },
  {
    id: 'labneh', name_ar: 'لبنة', name_en: 'Labneh',
    category: 'dairy', cuisine: 'levant',
    serving: { label_ar: 'ملعقتان (60غ)', label_en: '2 tbsp (60g)', grams: 60, quantity: 2 },
    perServing: { calories: 105, protein: 5, carbs: 4, fat: 8 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['لبنه'], aliases_en: ['labneh', 'labaneh'],
  },
  {
    id: 'feta-cheese', name_ar: 'جبن فيتا', name_en: 'Feta cheese',
    category: 'dairy', cuisine: 'levant',
    serving: { label_ar: '30غ', label_en: '30g', grams: 30, quantity: 1 },
    perServing: { calories: 80, protein: 4, carbs: 1, fat: 6 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['جبنة بيضاء', 'فيتا'], aliases_en: ['feta'],
  },
  {
    id: 'halloumi', name_ar: 'جبن حلوم', name_en: 'Halloumi cheese',
    category: 'dairy', cuisine: 'levant',
    serving: { label_ar: '50غ', label_en: '50g', grams: 50, quantity: 1 },
    perServing: { calories: 160, protein: 11, carbs: 1, fat: 13 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['حلوم'], aliases_en: ['halloumi'],
  },
  {
    id: 'cottage-cheese', name_ar: 'جبن قريش', name_en: 'Cottage cheese',
    category: 'dairy', cuisine: 'international',
    serving: { label_ar: 'نصف كوب (110غ)', label_en: 'Half cup (110g)', grams: 110, quantity: 1 },
    perServing: { calories: 92, protein: 12, carbs: 4, fat: 3 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['قريش'], aliases_en: ['cottage cheese'],
  },

  // ===== فواكه (fruit) =====
  {
    id: 'dates', name_ar: 'تمر', name_en: 'Dates',
    category: 'fruit', cuisine: 'saudi',
    serving: { label_ar: '3 حبات (30غ)', label_en: '3 pieces (30g)', grams: 30, quantity: 3 },
    perServing: { calories: 80, protein: 1, carbs: 21, fat: 0, fiber: 2, sugar: 18 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['تمره', 'رطب'], aliases_en: ['dates', 'tamr'],
  },
  {
    id: 'banana', name_ar: 'موز', name_en: 'Banana',
    category: 'fruit', cuisine: 'international',
    serving: { label_ar: 'حبة (120غ)', label_en: '1 medium (120g)', grams: 120, quantity: 1 },
    perServing: { calories: 105, protein: 1, carbs: 27, fat: 0, fiber: 3, sugar: 14 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['موزة'], aliases_en: ['banana'],
  },
  {
    id: 'apple', name_ar: 'تفاح', name_en: 'Apple',
    category: 'fruit', cuisine: 'international',
    serving: { label_ar: 'حبة (180غ)', label_en: '1 medium (180g)', grams: 180, quantity: 1 },
    perServing: { calories: 95, protein: 0, carbs: 25, fat: 0, fiber: 4, sugar: 19 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['تفاحة'], aliases_en: ['apple'],
  },
  {
    id: 'orange', name_ar: 'برتقال', name_en: 'Orange',
    category: 'fruit', cuisine: 'international',
    serving: { label_ar: 'حبة (130غ)', label_en: '1 medium (130g)', grams: 130, quantity: 1 },
    perServing: { calories: 62, protein: 1, carbs: 15, fat: 0, fiber: 3, sugar: 12 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['برتقاله', 'برتقان'], aliases_en: ['orange'],
  },
  {
    id: 'grapes', name_ar: 'عنب', name_en: 'Grapes',
    category: 'fruit', cuisine: 'international',
    serving: { label_ar: 'كوب (150غ)', label_en: 'Cup (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 104, protein: 1, carbs: 27, fat: 0, fiber: 1, sugar: 23 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_en: ['grapes'],
  },
  {
    id: 'watermelon', name_ar: 'بطيخ', name_en: 'Watermelon',
    category: 'fruit', cuisine: 'international',
    serving: { label_ar: 'شريحة (200غ)', label_en: 'Slice (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 60, protein: 1, carbs: 15, fat: 0, sugar: 12 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['حبحب', 'رقي'], aliases_en: ['watermelon'],
  },
  {
    id: 'mango', name_ar: 'مانجو', name_en: 'Mango',
    category: 'fruit', cuisine: 'international',
    serving: { label_ar: 'حبة (200غ)', label_en: '1 fruit (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 135, protein: 1, carbs: 35, fat: 1, fiber: 4, sugar: 31 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['مانجا', 'هندي'], aliases_en: ['mango'],
  },

  // ===== خضار (vegetable) =====
  {
    id: 'green-salad', name_ar: 'سلطة خضراء', name_en: 'Green salad',
    category: 'vegetable', cuisine: 'international',
    serving: { label_ar: 'صحن (150غ)', label_en: 'Plate (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 35, protein: 2, carbs: 7, fat: 0, fiber: 3 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['سلطه', 'سلطة'], aliases_en: ['salad', 'green salad'],
  },
  {
    id: 'tabbouleh', name_ar: 'تبولة', name_en: 'Tabbouleh',
    category: 'vegetable', cuisine: 'levant',
    serving: { label_ar: 'صحن (150غ)', label_en: 'Plate (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 120, protein: 3, carbs: 16, fat: 6, fiber: 4 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['تبوله'], aliases_en: ['tabbouleh', 'tabouleh'],
  },
  {
    id: 'fattoush', name_ar: 'فتوش', name_en: 'Fattoush',
    category: 'vegetable', cuisine: 'levant',
    serving: { label_ar: 'صحن (180غ)', label_en: 'Plate (180g)', grams: 180, quantity: 1 },
    perServing: { calories: 160, protein: 4, carbs: 20, fat: 8, fiber: 4 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_en: ['fattoush'],
  },
  {
    id: 'cucumber', name_ar: 'خيار', name_en: 'Cucumber',
    category: 'vegetable', cuisine: 'international',
    serving: { label_ar: 'حبة (120غ)', label_en: '1 medium (120g)', grams: 120, quantity: 1 },
    perServing: { calories: 18, protein: 1, carbs: 4, fat: 0, fiber: 1 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['خياره'], aliases_en: ['cucumber'],
  },
  {
    id: 'tomato', name_ar: 'طماطم', name_en: 'Tomato',
    category: 'vegetable', cuisine: 'international',
    serving: { label_ar: 'حبة (120غ)', label_en: '1 medium (120g)', grams: 120, quantity: 1 },
    perServing: { calories: 22, protein: 1, carbs: 5, fat: 0, fiber: 1 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['طماط', 'بندورة'], aliases_en: ['tomato'],
  },
  {
    id: 'potato-boiled', name_ar: 'بطاطس مسلوقة', name_en: 'Boiled potato',
    category: 'vegetable', cuisine: 'international',
    serving: { label_ar: 'حبة متوسطة (150غ)', label_en: '1 medium (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 130, protein: 3, carbs: 30, fat: 0, fiber: 3 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['بطاطا مسلوقة', 'بطاطس'], aliases_en: ['potato', 'boiled potato'],
  },
  {
    id: 'okra-stew', name_ar: 'بامية', name_en: 'Okra stew',
    category: 'vegetable', cuisine: 'levant',
    serving: { label_ar: 'صحن (250غ)', label_en: 'Plate (250g)', grams: 250, quantity: 1 },
    perServing: { calories: 180, protein: 6, carbs: 18, fat: 10, fiber: 6 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['باميه'], aliases_en: ['okra'],
  },

  // ===== سناك (snack) =====
  {
    id: 'french-fries', name_ar: 'بطاطس مقلية', name_en: 'French fries',
    category: 'snack', cuisine: 'international',
    serving: { label_ar: 'وسط (130غ)', label_en: 'Medium (130g)', grams: 130, quantity: 1 },
    perServing: { calories: 380, protein: 4, carbs: 48, fat: 19, fiber: 4 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['بطاطا مقلية', 'فرايز'], aliases_en: ['fries', 'french fries'],
  },
  {
    id: 'chips-bag', name_ar: 'شيبس (رقائق بطاطس)', name_en: 'Potato chips',
    category: 'snack', cuisine: 'international',
    serving: { label_ar: 'كيس صغير (30غ)', label_en: 'Small bag (30g)', grams: 30, quantity: 1 },
    perServing: { calories: 160, protein: 2, carbs: 15, fat: 10 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['شبس', 'رقائق'], aliases_en: ['chips', 'crisps'],
  },
  {
    id: 'mixed-nuts', name_ar: 'مكسرات مشكلة', name_en: 'Mixed nuts',
    category: 'snack', cuisine: 'international',
    serving: { label_ar: 'حفنة (30غ)', label_en: 'Handful (30g)', grams: 30, quantity: 1 },
    perServing: { calories: 175, protein: 5, carbs: 6, fat: 15, fiber: 3 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مكسرات', 'نقل'], aliases_en: ['nuts', 'mixed nuts'],
  },
  {
    id: 'hummus', name_ar: 'حمص بطحينة', name_en: 'Hummus dip',
    category: 'snack', cuisine: 'levant',
    serving: { label_ar: 'صحن (100غ)', label_en: 'Bowl (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 170, protein: 5, carbs: 15, fat: 10, fiber: 4 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['حمص', 'حمّص'], aliases_en: ['hummus'],
  },
  {
    id: 'falafel', name_ar: 'فلافل', name_en: 'Falafel',
    category: 'snack', cuisine: 'levant',
    serving: { label_ar: '4 حبات (80غ)', label_en: '4 pieces (80g)', grams: 80, quantity: 4 },
    perServing: { calories: 220, protein: 8, carbs: 22, fat: 11, fiber: 5 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['طعمية'], aliases_en: ['falafel', 'taameya'],
  },

  // ===== فطور وأطباق أخرى (other) =====
  {
    id: 'egg-boiled', name_ar: 'بيض مسلوق', name_en: 'Boiled egg',
    category: 'other', cuisine: 'international',
    serving: { label_ar: 'حبة (50غ)', label_en: '1 egg (50g)', grams: 50, quantity: 1 },
    perServing: { calories: 78, protein: 6, carbs: 1, fat: 5 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['بيضة', 'بيض'], aliases_en: ['egg', 'boiled egg'],
  },
  {
    id: 'eggs-fried', name_ar: 'بيض مقلي', name_en: 'Fried eggs',
    category: 'other', cuisine: 'international',
    serving: { label_ar: 'بيضتان (100غ)', label_en: '2 eggs (100g)', grams: 100, quantity: 2 },
    perServing: { calories: 180, protein: 12, carbs: 1, fat: 14 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['بيض عيون'], aliases_en: ['fried eggs'],
  },
  {
    id: 'foul', name_ar: 'فول مدمس', name_en: 'Foul mudammas',
    category: 'other', cuisine: 'levant',
    serving: { label_ar: 'صحن (250غ)', label_en: 'Bowl (250g)', grams: 250, quantity: 1 },
    perServing: { calories: 280, protein: 15, carbs: 38, fat: 8, fiber: 12 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['فول', 'فول مدمّس'], aliases_en: ['foul', 'ful', 'fava beans'],
  },
  {
    id: 'masoub', name_ar: 'معصوب', name_en: 'Masoub',
    category: 'dessert', cuisine: 'saudi',
    serving: { label_ar: 'صحن (250غ)', label_en: 'Bowl (250g)', grams: 250, quantity: 1 },
    perServing: { calories: 450, protein: 8, carbs: 70, fat: 16, fiber: 5, sugar: 35 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'موز وخبز وقشطة وعسل — القيم تختلف بكثرة حسب الإضافات.',
    aliases_ar: ['معصوب موز'], aliases_en: ['masoub'],
  },
  {
    id: 'areeka', name_ar: 'عريكة', name_en: 'Areeka',
    category: 'dessert', cuisine: 'saudi',
    serving: { label_ar: 'صحن (200غ)', label_en: 'Bowl (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 420, protein: 6, carbs: 62, fat: 16, sugar: 30 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'تمر وخبز وسمن وعسل.',
    aliases_ar: ['عريكه'], aliases_en: ['areeka', 'areekah'],
  },

  // ===== مطاعم/وجبات سريعة (restaurant) =====
  {
    id: 'shawarma-chicken', name_ar: 'شاورما دجاج', name_en: 'Chicken shawarma sandwich',
    category: 'restaurant', cuisine: 'levant',
    serving: { label_ar: 'ساندويتش (200غ)', label_en: 'Sandwich (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 450, protein: 25, carbs: 40, fat: 22, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'القيم تختلف حسب المطعم والصوصات.',
    aliases_ar: ['شاورما دجاج', 'شاورما فراخ'], aliases_en: ['chicken shawarma', 'shawarma'],
  },
  {
    id: 'shawarma-meat', name_ar: 'شاورما لحم', name_en: 'Meat shawarma sandwich',
    category: 'restaurant', cuisine: 'levant',
    serving: { label_ar: 'ساندويتش (200غ)', label_en: 'Sandwich (200g)', grams: 200, quantity: 1 },
    perServing: { calories: 500, protein: 26, carbs: 40, fat: 27, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['شاورما لحم'], aliases_en: ['meat shawarma'],
  },
  {
    id: 'beef-burger', name_ar: 'برجر لحم', name_en: 'Beef burger',
    category: 'restaurant', cuisine: 'international',
    serving: { label_ar: 'برجر (220غ)', label_en: 'Burger (220g)', grams: 220, quantity: 1 },
    perServing: { calories: 550, protein: 28, carbs: 40, fat: 30, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['همبرجر لحم', 'برغر لحم'], aliases_en: ['beef burger', 'hamburger'],
  },
  {
    id: 'chicken-burger', name_ar: 'برجر دجاج', name_en: 'Chicken burger',
    category: 'restaurant', cuisine: 'international',
    serving: { label_ar: 'برجر (210غ)', label_en: 'Burger (210g)', grams: 210, quantity: 1 },
    perServing: { calories: 510, protein: 26, carbs: 42, fat: 27, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['برغر دجاج', 'برجر فراخ'], aliases_en: ['chicken burger'],
  },
  {
    id: 'pizza-slice', name_ar: 'بيتزا (قطعة)', name_en: 'Pizza slice',
    category: 'restaurant', cuisine: 'international',
    serving: { label_ar: 'قطعة (120غ)', label_en: 'Slice (120g)', grams: 120, quantity: 1 },
    perServing: { calories: 285, protein: 12, carbs: 36, fat: 10, fiber: 2 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['بيتزا', 'بيزا'], aliases_en: ['pizza'],
  },
  {
    id: 'manakish-cheese', name_ar: 'مناقيش جبن', name_en: 'Cheese manakish',
    category: 'restaurant', cuisine: 'levant',
    serving: { label_ar: 'قرص (150غ)', label_en: 'Round (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 400, protein: 14, carbs: 42, fat: 19 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['مناقيش جبنة', 'فطيرة جبن'], aliases_en: ['cheese manakish', 'manaeesh'],
  },

  // ===== مشروبات (drink) =====
  {
    id: 'karak', name_ar: 'شاي كرك', name_en: 'Karak tea',
    category: 'drink', cuisine: 'gulf',
    serving: { label_ar: 'كوب (150مل)', label_en: 'Cup (150ml)', grams: 150, quantity: 1 },
    perServing: { calories: 130, protein: 3, carbs: 18, fat: 5, sugar: 16 },
    source: 'qimmah_curated', confidence: 'medium',
    notes_ar: 'شاي بحليب وسكر — السعرات تعتمد على كمية السكر والحليب المكثّف.',
    aliases_ar: ['كرك', 'چاي كرك'], aliases_en: ['karak', 'karak tea', 'kark'],
  },
  {
    id: 'arabic-coffee', name_ar: 'قهوة عربية', name_en: 'Arabic coffee',
    category: 'drink', cuisine: 'saudi',
    serving: { label_ar: 'فنجان (60مل)', label_en: 'Cup (60ml)', grams: 60, quantity: 1 },
    perServing: { calories: 5, protein: 0, carbs: 1, fat: 0 },
    source: 'qimmah_curated', confidence: 'high',
    notes_ar: 'بدون سكر.',
    aliases_ar: ['قهوه عربية', 'قهوة'], aliases_en: ['arabic coffee', 'gahwa'],
  },
  {
    id: 'orange-juice', name_ar: 'عصير برتقال', name_en: 'Orange juice',
    category: 'drink', cuisine: 'international',
    serving: { label_ar: 'كوب (250مل)', label_en: 'Cup (250ml)', grams: 250, quantity: 1 },
    perServing: { calories: 112, protein: 2, carbs: 26, fat: 0, sugar: 21 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['عصير برتقان'], aliases_en: ['orange juice'],
  },
  {
    id: 'soft-drink', name_ar: 'مشروب غازي', name_en: 'Soft drink (cola)',
    category: 'drink', cuisine: 'international',
    serving: { label_ar: 'علبة (330مل)', label_en: 'Can (330ml)', grams: 330, quantity: 1 },
    perServing: { calories: 139, protein: 0, carbs: 35, fat: 0, sugar: 35 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['غازي', 'كولا', 'بيبسي', 'مشروبات غازية'], aliases_en: ['soda', 'cola', 'soft drink'],
  },
  {
    id: 'water', name_ar: 'ماء', name_en: 'Water',
    category: 'drink', cuisine: 'international',
    serving: { label_ar: 'كوب (250مل)', label_en: 'Cup (250ml)', grams: 250, quantity: 1 },
    perServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['ماي', 'مويه'], aliases_en: ['water'],
  },
  {
    id: 'tea-sugar', name_ar: 'شاي بسكر', name_en: 'Tea with sugar',
    category: 'drink', cuisine: 'international',
    serving: { label_ar: 'كوب (200مل)', label_en: 'Cup (200ml)', grams: 200, quantity: 1 },
    perServing: { calories: 45, protein: 0, carbs: 11, fat: 0, sugar: 11 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['شاهي', 'شاي'], aliases_en: ['tea'],
  },
  {
    id: 'laban-ayran', name_ar: 'لبن عيران', name_en: 'Ayran (salted laban)',
    category: 'drink', cuisine: 'gulf',
    serving: { label_ar: 'كوب (250مل)', label_en: 'Cup (250ml)', grams: 250, quantity: 1 },
    perServing: { calories: 100, protein: 5, carbs: 8, fat: 4 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['عيران'], aliases_en: ['ayran'],
  },
  {
    id: 'milkshake', name_ar: 'ميلك شيك', name_en: 'Milkshake',
    category: 'drink', cuisine: 'international',
    serving: { label_ar: 'كوب (350مل)', label_en: 'Cup (350ml)', grams: 350, quantity: 1 },
    perServing: { calories: 380, protein: 9, carbs: 55, fat: 13, sugar: 48 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_en: ['milkshake', 'shake'],
  },

  // ===== حلويات (dessert) =====
  {
    id: 'kunafa', name_ar: 'كنافة', name_en: 'Kunafa',
    category: 'dessert', cuisine: 'levant',
    serving: { label_ar: 'قطعة (150غ)', label_en: 'Piece (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 500, protein: 8, carbs: 55, fat: 27, sugar: 35 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['كنافه', 'كنافة نابلسية'], aliases_en: ['kunafa', 'knafeh', 'kanafah'],
  },
  {
    id: 'basbousa', name_ar: 'بسبوسة', name_en: 'Basbousa',
    category: 'dessert', cuisine: 'egyptian',
    serving: { label_ar: 'قطعة (100غ)', label_en: 'Piece (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 330, protein: 4, carbs: 52, fat: 12, sugar: 38 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['بسبوسه', 'هريسة حلى'], aliases_en: ['basbousa'],
  },
  {
    id: 'luqaimat', name_ar: 'لقيمات', name_en: 'Luqaimat',
    category: 'dessert', cuisine: 'gulf',
    serving: { label_ar: '5 حبات (100غ)', label_en: '5 pieces (100g)', grams: 100, quantity: 5 },
    perServing: { calories: 380, protein: 4, carbs: 52, fat: 18, sugar: 30 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['لقيمات', 'لقمة القاضي'], aliases_en: ['luqaimat', 'logaimat'],
  },
  {
    id: 'maamoul', name_ar: 'معمول', name_en: 'Maamoul',
    category: 'dessert', cuisine: 'levant',
    serving: { label_ar: 'حبة (30غ)', label_en: '1 piece (30g)', grams: 30, quantity: 1 },
    perServing: { calories: 120, protein: 2, carbs: 18, fat: 5, sugar: 9 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['معمول تمر'], aliases_en: ['maamoul', 'mamoul'],
  },
  {
    id: 'cake-slice', name_ar: 'كيك (قطعة)', name_en: 'Cake slice',
    category: 'dessert', cuisine: 'international',
    serving: { label_ar: 'قطعة (100غ)', label_en: 'Slice (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 350, protein: 4, carbs: 50, fat: 15, sugar: 35 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['كيكة'], aliases_en: ['cake'],
  },
  {
    id: 'ice-cream', name_ar: 'آيس كريم', name_en: 'Ice cream',
    category: 'dessert', cuisine: 'international',
    serving: { label_ar: 'كوب (100غ)', label_en: 'Cup (100g)', grams: 100, quantity: 1 },
    perServing: { calories: 207, protein: 3, carbs: 24, fat: 11, sugar: 21 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['ايس كريم', 'بوظة'], aliases_en: ['ice cream'],
  },

  // ===== مكملات (supplement) =====
  {
    id: 'whey-scoop', name_ar: 'سكوب واي بروتين', name_en: 'Whey protein scoop',
    category: 'supplement', cuisine: 'international',
    serving: { label_ar: 'سكوب (30غ)', label_en: 'Scoop (30g)', grams: 30, quantity: 1 },
    perServing: { calories: 120, protein: 24, carbs: 3, fat: 2 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['واي', 'بروتين'], aliases_en: ['whey', 'protein powder'],
  },
  {
    id: 'mass-gainer', name_ar: 'مكمل زيادة وزن (ماس جينر)', name_en: 'Mass gainer scoop',
    category: 'supplement', cuisine: 'international',
    serving: { label_ar: 'حصة (150غ)', label_en: 'Serving (150g)', grams: 150, quantity: 1 },
    perServing: { calories: 600, protein: 30, carbs: 110, fat: 6 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_ar: ['ماس جينر', 'جينر'], aliases_en: ['mass gainer', 'gainer'],
  },
  {
    id: 'protein-bar', name_ar: 'بار بروتين', name_en: 'Protein bar',
    category: 'supplement', cuisine: 'international',
    serving: { label_ar: 'بار (60غ)', label_en: 'Bar (60g)', grams: 60, quantity: 1 },
    perServing: { calories: 220, protein: 20, carbs: 22, fat: 7, fiber: 5 },
    source: 'qimmah_curated', confidence: 'medium',
    aliases_en: ['protein bar'],
  },
  {
    id: 'protein-shake-rtd', name_ar: 'مشروب بروتين جاهز', name_en: 'Ready-to-drink protein shake',
    category: 'supplement', cuisine: 'international',
    serving: { label_ar: 'علبة (330مل)', label_en: 'Bottle (330ml)', grams: 330, quantity: 1 },
    perServing: { calories: 160, protein: 30, carbs: 6, fat: 2 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_ar: ['بروتين جاهز'], aliases_en: ['protein shake', 'rtd protein'],
  },
  {
    id: 'creatine', name_ar: 'كرياتين', name_en: 'Creatine monohydrate',
    category: 'supplement', cuisine: 'international',
    serving: { label_ar: 'سكوب (5غ)', label_en: 'Scoop (5g)', grams: 5, quantity: 1 },
    perServing: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    source: 'qimmah_curated', confidence: 'high',
    aliases_en: ['creatine'],
  },
]

/** قاعدة بيانات الأطعمة v2 (per100g مشتق آليًا). */
export const foodDatabase: FoodV2[] = seeds.map(build)

/** خريطة بالمعرّف للوصول السريع. */
export const foodDatabaseMap: Record<string, FoodV2> = Object.fromEntries(
  foodDatabase.map((f) => [f.id, f]),
)

/** صنف واحد بالمعرّف. */
export function getFoodV2(id: string): FoodV2 | undefined {
  return foodDatabaseMap[id]
}

// ————————————————————————————————————————————————————————————————
// جسر التوافق مع المستهلكين الحاليين (foodItems / QuickMealLogger)
//
// لا يُستخدم بعد في الواجهة (حفاظًا على عدم كسر أي شيء)، لكنه يتيح دمج
// قاعدة v2 في البحث الحالي مستقبلًا دون تغيير شكل البيانات للمكوّنات.
// ————————————————————————————————————————————————————————————————

/** تحويل فئة v2 (إنجليزية) إلى فئة foodItems القديمة (عربية). */
const CATEGORY_TO_LEGACY: Record<FoodV2['category'], FoodCategory> = {
  rice: 'كارب',
  meat: 'بروتين',
  chicken: 'بروتين',
  fish: 'بروتين',
  bread: 'كارب',
  dairy: 'ألبان',
  fruit: 'فواكه',
  vegetable: 'خضار',
  snack: 'مطاعم/وجبات سريعة تقديرية',
  drink: 'مشروبات',
  dessert: 'مطاعم/وجبات سريعة تقديرية',
  restaurant: 'مطاعم/وجبات سريعة تقديرية',
  supplement: 'مكملات غذائية',
  other: 'فطور',
}

/** يحوّل صنف v2 إلى شكل FoodItem القديم لإعادة استخدامه في البحث/التسجيل الحالي. */
export function foodV2ToLegacy(f: FoodV2): FoodItem {
  return {
    id: f.id,
    nameAr: f.name_ar,
    nameEn: f.name_en,
    category: CATEGORY_TO_LEGACY[f.category],
    servingLabelAr: f.serving.label_ar,
    servingGrams: f.serving.grams,
    calories: f.perServing.calories,
    protein: f.perServing.protein,
    carbs: f.perServing.carbs,
    fat: f.perServing.fat,
    fiber: f.perServing.fiber,
    notesAr: f.notes_ar,
  }
}
