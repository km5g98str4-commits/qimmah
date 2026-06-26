import type { Medication, MedicationCategory } from '@/types/wellness'

// مكتبة الأدوية للمتابعة فقط — ~45 صنفًا.
// ⚠️ لا توجد جرعات موصى بها. الجرعة يُدخلها المستخدم بحسب وصف الطبيب/الصيدلي.

interface MedInput {
  id: string
  nameAr: string
  nameEn: string
  category: MedicationCategory
  purposeAr: string
  purposeEn: string
  timingAr: string
  timingEn: string
  safetyAr?: string
  safetyEn?: string
}

function med(m: MedInput): Medication {
  return {
    id: m.id,
    nameAr: m.nameAr,
    nameEn: m.nameEn,
    category: m.category,
    trackingPurposeAr: m.purposeAr,
    trackingPurposeEn: m.purposeEn,
    timingHintAr: m.timingAr,
    timingHintEn: m.timingEn,
    safetyNoteAr: m.safetyAr ?? 'للمتابعة فقط — لا تبدأ أو توقف أو تغيّر الجرعة دون استشارة الطبيب أو الصيدلي.',
    safetyNoteEn: m.safetyEn ?? 'Tracking only — do not start, stop, or change the dose without consulting a doctor or pharmacist.',
  }
}

const BWF = 'بحسب وصف الطبيب'
const PER_RX = 'As prescribed by your doctor'

export const medications: Medication[] = [
  // الغدة الدرقية
  med({ id: 'levothyroxine', nameAr: 'ليفوثيروكسين', nameEn: 'Levothyroxine', category: 'thyroid', purposeAr: 'متابعة دواء الغدة الدرقية', purposeEn: 'Track thyroid medication', timingAr: `عادةً صباحًا على معدة فارغة — ${BWF}`, timingEn: `Usually morning on an empty stomach — ${PER_RX}` }),

  // السكري
  med({ id: 'metformin', nameAr: 'ميتفورمين', nameEn: 'Metformin', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'insulin', nameAr: 'إنسولين', nameEn: 'Insulin', category: 'diabetes', purposeAr: 'متابعة جرعات الإنسولين', purposeEn: 'Track insulin', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'gliclazide', nameAr: 'جليكلازيد', nameEn: 'Gliclazide', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `قبل الإفطار — ${BWF}`, timingEn: `Before breakfast — ${PER_RX}` }),
  med({ id: 'sitagliptin', nameAr: 'سيتاجليبتين', nameEn: 'Sitagliptin', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'empagliflozin', nameAr: 'إمباجليفلوزين', nameEn: 'Empagliflozin', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),

  // ضغط الدم
  med({ id: 'amlodipine', nameAr: 'أملوديبين', nameEn: 'Amlodipine', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: `يوميًا في وقت ثابت — ${BWF}`, timingEn: `Daily at a fixed time — ${PER_RX}` }),
  med({ id: 'lisinopril', nameAr: 'ليزينوبريل', nameEn: 'Lisinopril', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'losartan', nameAr: 'لوسارتان', nameEn: 'Losartan', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'valsartan', nameAr: 'فالسارتان', nameEn: 'Valsartan', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'bisoprolol', nameAr: 'بيزوبرولول', nameEn: 'Bisoprolol', category: 'blood_pressure', purposeAr: 'متابعة دواء القلب/الضغط', purposeEn: 'Track heart/BP medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'hydrochlorothiazide', nameAr: 'هيدروكلوروثيازيد', nameEn: 'Hydrochlorothiazide', category: 'blood_pressure', purposeAr: 'متابعة مدرّ بول للضغط', purposeEn: 'Track BP diuretic', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),

  // الكوليسترول
  med({ id: 'atorvastatin', nameAr: 'أتورفاستاتين', nameEn: 'Atorvastatin', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: `مساءً — ${BWF}`, timingEn: `Evening — ${PER_RX}` }),
  med({ id: 'rosuvastatin', nameAr: 'روسوفاستاتين', nameEn: 'Rosuvastatin', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'simvastatin', nameAr: 'سيمفاستاتين', nameEn: 'Simvastatin', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: `مساءً — ${BWF}`, timingEn: `Evening — ${PER_RX}` }),
  med({ id: 'ezetimibe', nameAr: 'إيزيتيميب', nameEn: 'Ezetimibe', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: BWF, timingEn: PER_RX }),

  // الحساسية
  med({ id: 'cetirizine', nameAr: 'سيتيريزين', nameEn: 'Cetirizine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'loratadine', nameAr: 'لوراتادين', nameEn: 'Loratadine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'fexofenadine', nameAr: 'فيكسوفينادين', nameEn: 'Fexofenadine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'desloratadine', nameAr: 'ديسلوراتادين', nameEn: 'Desloratadine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),

  // الربو
  med({ id: 'salbutamol-inhaler', nameAr: 'بخاخ سالبوتامول', nameEn: 'Salbutamol Inhaler', category: 'asthma', purposeAr: 'متابعة بخاخ الربو الإسعافي', purposeEn: 'Track reliever inhaler', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),
  med({ id: 'budesonide-inhaler', nameAr: 'بخاخ بوديزونيد', nameEn: 'Budesonide Inhaler', category: 'asthma', purposeAr: 'متابعة بخاخ الوقاية', purposeEn: 'Track preventer inhaler', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'montelukast', nameAr: 'مونتيلوكاست', nameEn: 'Montelukast', category: 'asthma', purposeAr: 'متابعة دواء الربو/الحساسية', purposeEn: 'Track asthma/allergy medication', timingAr: `مساءً — ${BWF}`, timingEn: `Evening — ${PER_RX}` }),
  med({ id: 'formoterol-budesonide', nameAr: 'بخاخ فورموتيرول/بوديزونيد', nameEn: 'Formoterol/Budesonide Inhaler', category: 'asthma', purposeAr: 'متابعة بخاخ مركّب', purposeEn: 'Track combination inhaler', timingAr: BWF, timingEn: PER_RX }),

  // المعدة
  med({ id: 'omeprazole', nameAr: 'أوميبرازول', nameEn: 'Omeprazole', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: `قبل الإفطار — ${BWF}`, timingEn: `Before breakfast — ${PER_RX}` }),
  med({ id: 'pantoprazole', nameAr: 'بانتوبرازول', nameEn: 'Pantoprazole', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: `قبل الأكل — ${BWF}`, timingEn: `Before food — ${PER_RX}` }),
  med({ id: 'esomeprazole', nameAr: 'إيزوميبرازول', nameEn: 'Esomeprazole', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'famotidine', nameAr: 'فاموتيدين', nameEn: 'Famotidine', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'domperidone', nameAr: 'دومبيريدون', nameEn: 'Domperidone', category: 'stomach', purposeAr: 'متابعة دواء الغثيان/الهضم', purposeEn: 'Track nausea/digestion medication', timingAr: `قبل الأكل — ${BWF}`, timingEn: `Before food — ${PER_RX}` }),

  // المسكّنات
  med({ id: 'paracetamol', nameAr: 'باراسيتامول', nameEn: 'Paracetamol', category: 'pain_relief', purposeAr: 'متابعة مسكّن/خافض حرارة', purposeEn: 'Track pain/fever reliever', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),
  med({ id: 'ibuprofen', nameAr: 'إيبوبروفين', nameEn: 'Ibuprofen', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'naproxen', nameAr: 'نابروكسين', nameEn: 'Naproxen', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'diclofenac', nameAr: 'ديكلوفيناك', nameEn: 'Diclofenac', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),

  // المضادات الحيوية
  med({ id: 'amoxicillin', nameAr: 'أموكسيسيلين', nameEn: 'Amoxicillin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `أكمل الكورس كاملًا — ${BWF}`, timingEn: `Finish the full course — ${PER_RX}` }),
  med({ id: 'azithromycin', nameAr: 'أزيثرومايسين', nameEn: 'Azithromycin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'ciprofloxacin', nameAr: 'سيبروفلوكساسين', nameEn: 'Ciprofloxacin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'amoxicillin-clavulanate', nameAr: 'أموكسيسيلين/كلافولانيك', nameEn: 'Amoxicillin/Clavulanate', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),

  // فيتامينات بوصفة
  med({ id: 'vitamin-d-rx', nameAr: 'فيتامين D (وصفة)', nameEn: 'Vitamin D (Prescription)', category: 'vitamin_prescription', purposeAr: 'متابعة فيتامين D الموصوف', purposeEn: 'Track prescribed vitamin D', timingAr: `مع وجبة — ${BWF}`, timingEn: `With a meal — ${PER_RX}` }),
  med({ id: 'folic-acid', nameAr: 'حمض الفوليك', nameEn: 'Folic Acid', category: 'vitamin_prescription', purposeAr: 'متابعة حمض الفوليك الموصوف', purposeEn: 'Track prescribed folic acid', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'vitamin-b12-rx', nameAr: 'فيتامين B12 (وصفة)', nameEn: 'Vitamin B12 (Prescription)', category: 'vitamin_prescription', purposeAr: 'متابعة B12 (حبوب/إبر)', purposeEn: 'Track B12 (tablets/injections)', timingAr: BWF, timingEn: PER_RX }),

  // الحديد
  med({ id: 'ferrous-sulfate', nameAr: 'كبريتات الحديد', nameEn: 'Ferrous Sulfate', category: 'iron', purposeAr: 'متابعة مكمّل الحديد الموصوف', purposeEn: 'Track prescribed iron', timingAr: `مع فيتامين C — ${BWF}`, timingEn: `With vitamin C — ${PER_RX}` }),

  // الصحة النفسية
  med({ id: 'sertraline', nameAr: 'سيرترالين', nameEn: 'Sertraline', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `في وقت ثابت يوميًا — ${BWF}`, timingEn: `Same time daily — ${PER_RX}` }),
  med({ id: 'escitalopram', nameAr: 'إسيتالوبرام', nameEn: 'Escitalopram', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'fluoxetine', nameAr: 'فلوكسيتين', nameEn: 'Fluoxetine', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),

  // أخرى
  med({ id: 'custom-medication', nameAr: 'دواء آخر (مخصّص)', nameEn: 'Other (Custom)', category: 'other', purposeAr: 'أضف دواءك واكتب تفاصيله بنفسك', purposeEn: 'Add your medication and enter details yourself', timingAr: BWF, timingEn: PER_RX }),
]

export const medicationMap: Record<string, Medication> = Object.fromEntries(
  medications.map((m) => [m.id, m]),
)

export function getMedication(id: string): Medication | undefined {
  return medicationMap[id]
}
