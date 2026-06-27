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

  // الغدة الدرقية (إضافات)
  med({ id: 'liothyronine', nameAr: 'ليوثيرونين', nameEn: 'Liothyronine', category: 'thyroid', purposeAr: 'متابعة دواء الغدة الدرقية', purposeEn: 'Track thyroid medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'carbimazole', nameAr: 'كاربيمازول', nameEn: 'Carbimazole', category: 'thyroid', purposeAr: 'متابعة دواء فرط نشاط الغدة', purposeEn: 'Track overactive-thyroid medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'propylthiouracil', nameAr: 'بروبيل ثيويوراسيل', nameEn: 'Propylthiouracil', category: 'thyroid', purposeAr: 'متابعة دواء فرط نشاط الغدة', purposeEn: 'Track overactive-thyroid medication', timingAr: BWF, timingEn: PER_RX }),

  // السكري (إضافات)
  med({ id: 'glimepiride', nameAr: 'جليمابيرايد', nameEn: 'Glimepiride', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `قبل الإفطار — ${BWF}`, timingEn: `Before breakfast — ${PER_RX}` }),
  med({ id: 'pioglitazone', nameAr: 'بيوجليتازون', nameEn: 'Pioglitazone', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'dapagliflozin', nameAr: 'داباجليفلوزين', nameEn: 'Dapagliflozin', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'linagliptin', nameAr: 'ليناجليبتين', nameEn: 'Linagliptin', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'liraglutide', nameAr: 'ليراجلوتيد', nameEn: 'Liraglutide', category: 'diabetes', purposeAr: 'متابعة حقن السكري', purposeEn: 'Track diabetes injection', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'semaglutide', nameAr: 'سيماجلوتيد', nameEn: 'Semaglutide', category: 'diabetes', purposeAr: 'متابعة حقن/حبوب السكري', purposeEn: 'Track diabetes injection/tablets', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'dulaglutide', nameAr: 'دولاجلوتيد', nameEn: 'Dulaglutide', category: 'diabetes', purposeAr: 'متابعة حقن السكري الأسبوعية', purposeEn: 'Track weekly diabetes injection', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'repaglinide', nameAr: 'ريباجلينيد', nameEn: 'Repaglinide', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `قبل الوجبات — ${BWF}`, timingEn: `Before meals — ${PER_RX}` }),
  med({ id: 'acarbose', nameAr: 'أكاربوز', nameEn: 'Acarbose', category: 'diabetes', purposeAr: 'متابعة دواء السكري', purposeEn: 'Track diabetes medication', timingAr: `مع أول لقمة — ${BWF}`, timingEn: `With first bite — ${PER_RX}` }),

  // ضغط الدم (إضافات)
  med({ id: 'ramipril', nameAr: 'راميبريل', nameEn: 'Ramipril', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'perindopril', nameAr: 'بيريندوبريل', nameEn: 'Perindopril', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'enalapril', nameAr: 'إينالابريل', nameEn: 'Enalapril', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'candesartan', nameAr: 'كانديسارتان', nameEn: 'Candesartan', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'telmisartan', nameAr: 'تيلميسارتان', nameEn: 'Telmisartan', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'irbesartan', nameAr: 'إربيسارتان', nameEn: 'Irbesartan', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'olmesartan', nameAr: 'أولميسارتان', nameEn: 'Olmesartan', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'atenolol', nameAr: 'أتينولول', nameEn: 'Atenolol', category: 'blood_pressure', purposeAr: 'متابعة دواء القلب/الضغط', purposeEn: 'Track heart/BP medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'metoprolol', nameAr: 'ميتوبرولول', nameEn: 'Metoprolol', category: 'blood_pressure', purposeAr: 'متابعة دواء القلب/الضغط', purposeEn: 'Track heart/BP medication', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'carvedilol', nameAr: 'كارفيديلول', nameEn: 'Carvedilol', category: 'blood_pressure', purposeAr: 'متابعة دواء القلب/الضغط', purposeEn: 'Track heart/BP medication', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'nebivolol', nameAr: 'نيبيفولول', nameEn: 'Nebivolol', category: 'blood_pressure', purposeAr: 'متابعة دواء القلب/الضغط', purposeEn: 'Track heart/BP medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'nifedipine', nameAr: 'نيفيديبين', nameEn: 'Nifedipine', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'verapamil', nameAr: 'فيراباميل', nameEn: 'Verapamil', category: 'blood_pressure', purposeAr: 'متابعة دواء القلب/الضغط', purposeEn: 'Track heart/BP medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'furosemide', nameAr: 'فوروسيميد', nameEn: 'Furosemide', category: 'blood_pressure', purposeAr: 'متابعة مدرّ بول', purposeEn: 'Track diuretic', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'spironolactone', nameAr: 'سبيرونولاكتون', nameEn: 'Spironolactone', category: 'blood_pressure', purposeAr: 'متابعة مدرّ بول', purposeEn: 'Track diuretic', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'indapamide', nameAr: 'إنداباميد', nameEn: 'Indapamide', category: 'blood_pressure', purposeAr: 'متابعة مدرّ بول للضغط', purposeEn: 'Track BP diuretic', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'doxazosin', nameAr: 'دوكسازوسين', nameEn: 'Doxazosin', category: 'blood_pressure', purposeAr: 'متابعة دواء الضغط', purposeEn: 'Track blood-pressure medication', timingAr: BWF, timingEn: PER_RX }),

  // الكوليسترول (إضافات)
  med({ id: 'pravastatin', nameAr: 'برافاستاتين', nameEn: 'Pravastatin', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: `مساءً — ${BWF}`, timingEn: `Evening — ${PER_RX}` }),
  med({ id: 'fluvastatin', nameAr: 'فلوفاستاتين', nameEn: 'Fluvastatin', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'pitavastatin', nameAr: 'بيتافاستاتين', nameEn: 'Pitavastatin', category: 'cholesterol', purposeAr: 'متابعة دواء الكوليسترول', purposeEn: 'Track cholesterol medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'fenofibrate', nameAr: 'فينوفيبرات', nameEn: 'Fenofibrate', category: 'cholesterol', purposeAr: 'متابعة دواء الدهون الثلاثية', purposeEn: 'Track triglyceride medication', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'gemfibrozil', nameAr: 'جيمفيبروزيل', nameEn: 'Gemfibrozil', category: 'cholesterol', purposeAr: 'متابعة دواء الدهون الثلاثية', purposeEn: 'Track triglyceride medication', timingAr: `قبل الأكل — ${BWF}`, timingEn: `Before food — ${PER_RX}` }),
  med({ id: 'evolocumab', nameAr: 'إيفولوكوماب', nameEn: 'Evolocumab', category: 'cholesterol', purposeAr: 'متابعة حقن الكوليسترول', purposeEn: 'Track cholesterol injection', timingAr: BWF, timingEn: PER_RX }),

  // الحساسية (إضافات)
  med({ id: 'levocetirizine', nameAr: 'ليفوسيتيريزين', nameEn: 'Levocetirizine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'bilastine', nameAr: 'بيلاستين', nameEn: 'Bilastine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: `على معدة فارغة — ${BWF}`, timingEn: `On an empty stomach — ${PER_RX}` }),
  med({ id: 'rupatadine', nameAr: 'روباتادين', nameEn: 'Rupatadine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'chlorpheniramine', nameAr: 'كلورفينيرامين', nameEn: 'Chlorpheniramine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'diphenhydramine', nameAr: 'ديفينهيدرامين', nameEn: 'Diphenhydramine', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'ketotifen', nameAr: 'كيتوتيفين', nameEn: 'Ketotifen', category: 'allergy', purposeAr: 'متابعة دواء الحساسية', purposeEn: 'Track allergy medication', timingAr: BWF, timingEn: PER_RX }),

  // الربو (إضافات)
  med({ id: 'fluticasone-inhaler', nameAr: 'بخاخ فلوتيكازون', nameEn: 'Fluticasone Inhaler', category: 'asthma', purposeAr: 'متابعة بخاخ الوقاية', purposeEn: 'Track preventer inhaler', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'salmeterol-fluticasone', nameAr: 'بخاخ سالميتيرول/فلوتيكازون', nameEn: 'Salmeterol/Fluticasone Inhaler', category: 'asthma', purposeAr: 'متابعة بخاخ مركّب', purposeEn: 'Track combination inhaler', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'tiotropium', nameAr: 'تيوتروبيوم', nameEn: 'Tiotropium', category: 'asthma', purposeAr: 'متابعة بخاخ موسّع للشعب', purposeEn: 'Track bronchodilator inhaler', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'theophylline', nameAr: 'ثيوفيلين', nameEn: 'Theophylline', category: 'asthma', purposeAr: 'متابعة دواء موسّع للشعب', purposeEn: 'Track bronchodilator medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'ipratropium', nameAr: 'إبراتروبيوم', nameEn: 'Ipratropium', category: 'asthma', purposeAr: 'متابعة بخاخ موسّع للشعب', purposeEn: 'Track bronchodilator inhaler', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),

  // المعدة (إضافات)
  med({ id: 'lansoprazole', nameAr: 'لانزوبرازول', nameEn: 'Lansoprazole', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: `قبل الإفطار — ${BWF}`, timingEn: `Before breakfast — ${PER_RX}` }),
  med({ id: 'rabeprazole', nameAr: 'رابيبرازول', nameEn: 'Rabeprazole', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'nizatidine', nameAr: 'نيزاتيدين', nameEn: 'Nizatidine', category: 'stomach', purposeAr: 'متابعة دواء الحموضة', purposeEn: 'Track acid medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'metoclopramide', nameAr: 'ميتوكلوبراميد', nameEn: 'Metoclopramide', category: 'stomach', purposeAr: 'متابعة دواء الغثيان/الهضم', purposeEn: 'Track nausea/digestion medication', timingAr: `قبل الأكل — ${BWF}`, timingEn: `Before food — ${PER_RX}` }),
  med({ id: 'ondansetron', nameAr: 'أوندانسيترون', nameEn: 'Ondansetron', category: 'stomach', purposeAr: 'متابعة دواء الغثيان', purposeEn: 'Track nausea medication', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),
  med({ id: 'loperamide', nameAr: 'لوبيراميد', nameEn: 'Loperamide', category: 'stomach', purposeAr: 'متابعة دواء الإسهال', purposeEn: 'Track anti-diarrheal medication', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),
  med({ id: 'mebeverine', nameAr: 'ميبيفيرين', nameEn: 'Mebeverine', category: 'stomach', purposeAr: 'متابعة دواء القولون', purposeEn: 'Track IBS medication', timingAr: `قبل الأكل — ${BWF}`, timingEn: `Before food — ${PER_RX}` }),
  med({ id: 'sucralfate', nameAr: 'سوكرالفات', nameEn: 'Sucralfate', category: 'stomach', purposeAr: 'متابعة دواء واقي للمعدة', purposeEn: 'Track stomach-protectant medication', timingAr: `على معدة فارغة — ${BWF}`, timingEn: `On an empty stomach — ${PER_RX}` }),
  med({ id: 'bismuth-subsalicylate', nameAr: 'بزموث سبساليسيلات', nameEn: 'Bismuth Subsalicylate', category: 'stomach', purposeAr: 'متابعة دواء اضطراب المعدة', purposeEn: 'Track upset-stomach medication', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),

  // المسكّنات (إضافات)
  med({ id: 'aspirin', nameAr: 'أسبرين', nameEn: 'Aspirin', category: 'pain_relief', purposeAr: 'متابعة مسكّن/مميّع موصوف', purposeEn: 'Track prescribed pain reliever/blood thinner', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'celecoxib', nameAr: 'سيليكوكسيب', nameEn: 'Celecoxib', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'etoricoxib', nameAr: 'إيتوريكوكسيب', nameEn: 'Etoricoxib', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'meloxicam', nameAr: 'ميلوكسيكام', nameEn: 'Meloxicam', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'ketoprofen', nameAr: 'كيتوبروفين', nameEn: 'Ketoprofen', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'tramadol', nameAr: 'ترامادول', nameEn: 'Tramadol', category: 'pain_relief', purposeAr: 'متابعة مسكّن موصوف', purposeEn: 'Track prescribed pain reliever', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'mefenamic-acid', nameAr: 'حمض الميفيناميك', nameEn: 'Mefenamic Acid', category: 'pain_relief', purposeAr: 'متابعة مسكّن مضاد للالتهاب', purposeEn: 'Track anti-inflammatory pain reliever', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'paracetamol-caffeine', nameAr: 'باراسيتامول/كافيين', nameEn: 'Paracetamol/Caffeine', category: 'pain_relief', purposeAr: 'متابعة مسكّن مركّب', purposeEn: 'Track combination pain reliever', timingAr: `عند الحاجة — ${BWF}`, timingEn: `As needed — ${PER_RX}` }),

  // المضادات الحيوية (إضافات)
  med({ id: 'cefuroxime', nameAr: 'سيفوروكسيم', nameEn: 'Cefuroxime', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'cephalexin', nameAr: 'سيفاليكسين', nameEn: 'Cephalexin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'clarithromycin', nameAr: 'كلاريثرومايسين', nameEn: 'Clarithromycin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'doxycycline', nameAr: 'دوكسيسيكلين', nameEn: 'Doxycycline', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع ماء كافٍ — ${BWF}`, timingEn: `With plenty of water — ${PER_RX}` }),
  med({ id: 'levofloxacin', nameAr: 'ليفوفلوكساسين', nameEn: 'Levofloxacin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'metronidazole', nameAr: 'ميترونيدازول', nameEn: 'Metronidazole', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'clindamycin', nameAr: 'كليندامايسين', nameEn: 'Clindamycin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع ماء كافٍ — ${BWF}`, timingEn: `With plenty of water — ${PER_RX}` }),
  med({ id: 'cotrimoxazole', nameAr: 'تريميثوبريم/سلفاميثوكسازول', nameEn: 'Trimethoprim/Sulfamethoxazole', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع ماء كافٍ — ${BWF}`, timingEn: `With plenty of water — ${PER_RX}` }),
  med({ id: 'nitrofurantoin', nameAr: 'نيتروفورانتوين', nameEn: 'Nitrofurantoin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'flucloxacillin', nameAr: 'فلوكلوكساسيلين', nameEn: 'Flucloxacillin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: `على معدة فارغة — ${BWF}`, timingEn: `On an empty stomach — ${PER_RX}` }),
  med({ id: 'erythromycin', nameAr: 'إريثرومايسين', nameEn: 'Erythromycin', category: 'antibiotic', purposeAr: 'متابعة مضاد حيوي', purposeEn: 'Track antibiotic course', timingAr: BWF, timingEn: PER_RX }),

  // فيتامينات بوصفة (إضافات)
  med({ id: 'calcium-vitamin-d-rx', nameAr: 'كالسيوم/فيتامين D (وصفة)', nameEn: 'Calcium/Vitamin D (Prescription)', category: 'vitamin_prescription', purposeAr: 'متابعة مكمّل موصوف', purposeEn: 'Track prescribed supplement', timingAr: `مع وجبة — ${BWF}`, timingEn: `With a meal — ${PER_RX}` }),
  med({ id: 'ergocalciferol', nameAr: 'إرغوكالسيفيرول (فيتامين D2)', nameEn: 'Ergocalciferol (Vitamin D2)', category: 'vitamin_prescription', purposeAr: 'متابعة فيتامين D الموصوف', purposeEn: 'Track prescribed vitamin D', timingAr: `مع وجبة — ${BWF}`, timingEn: `With a meal — ${PER_RX}` }),
  med({ id: 'cholecalciferol-rx', nameAr: 'كوليكالسيفيرول (وصفة)', nameEn: 'Cholecalciferol (Prescription)', category: 'vitamin_prescription', purposeAr: 'متابعة فيتامين D الموصوف', purposeEn: 'Track prescribed vitamin D', timingAr: `مع وجبة — ${BWF}`, timingEn: `With a meal — ${PER_RX}` }),
  med({ id: 'vitamin-b-complex-rx', nameAr: 'فيتامين B المركّب (وصفة)', nameEn: 'Vitamin B Complex (Prescription)', category: 'vitamin_prescription', purposeAr: 'متابعة مكمّل B الموصوف', purposeEn: 'Track prescribed B supplement', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'thiamine-rx', nameAr: 'ثيامين B1 (وصفة)', nameEn: 'Thiamine B1 (Prescription)', category: 'vitamin_prescription', purposeAr: 'متابعة ثيامين الموصوف', purposeEn: 'Track prescribed thiamine', timingAr: BWF, timingEn: PER_RX }),

  // الحديد (إضافات)
  med({ id: 'ferrous-gluconate', nameAr: 'غلوكونات الحديد', nameEn: 'Ferrous Gluconate', category: 'iron', purposeAr: 'متابعة مكمّل الحديد الموصوف', purposeEn: 'Track prescribed iron', timingAr: `مع فيتامين C — ${BWF}`, timingEn: `With vitamin C — ${PER_RX}` }),
  med({ id: 'ferrous-fumarate', nameAr: 'فومارات الحديد', nameEn: 'Ferrous Fumarate', category: 'iron', purposeAr: 'متابعة مكمّل الحديد الموصوف', purposeEn: 'Track prescribed iron', timingAr: `مع فيتامين C — ${BWF}`, timingEn: `With vitamin C — ${PER_RX}` }),
  med({ id: 'iron-polymaltose', nameAr: 'حديد بولي مالتوز', nameEn: 'Iron Polymaltose', category: 'iron', purposeAr: 'متابعة مكمّل الحديد الموصوف', purposeEn: 'Track prescribed iron', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'iv-iron', nameAr: 'حديد وريدي (متابعة)', nameEn: 'IV Iron (Tracking)', category: 'iron', purposeAr: 'متابعة جرعات الحديد الوريدي', purposeEn: 'Track IV iron doses', timingAr: BWF, timingEn: PER_RX }),

  // الصحة النفسية (إضافات)
  med({ id: 'citalopram', nameAr: 'سيتالوبرام', nameEn: 'Citalopram', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `في وقت ثابت يوميًا — ${BWF}`, timingEn: `Same time daily — ${PER_RX}` }),
  med({ id: 'paroxetine', nameAr: 'باروكسيتين', nameEn: 'Paroxetine', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'venlafaxine', nameAr: 'فينلافاكسين', nameEn: 'Venlafaxine', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `مع الأكل — ${BWF}`, timingEn: `With food — ${PER_RX}` }),
  med({ id: 'duloxetine', nameAr: 'دولوكسيتين', nameEn: 'Duloxetine', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'bupropion', nameAr: 'بوبروبيون', nameEn: 'Bupropion', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `صباحًا — ${BWF}`, timingEn: `Morning — ${PER_RX}` }),
  med({ id: 'mirtazapine', nameAr: 'ميرتازابين', nameEn: 'Mirtazapine', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `مساءً — ${BWF}`, timingEn: `Evening — ${PER_RX}` }),
  med({ id: 'buspirone', nameAr: 'بوسبيرون', nameEn: 'Buspirone', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'propranolol-anxiety', nameAr: 'بروبرانولول', nameEn: 'Propranolol', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: BWF, timingEn: PER_RX }),
  med({ id: 'quetiapine', nameAr: 'كويتيابين', nameEn: 'Quetiapine', category: 'mental_health', purposeAr: 'متابعة دواء موصوف', purposeEn: 'Track prescribed medication', timingAr: `مساءً — ${BWF}`, timingEn: `Evening — ${PER_RX}` }),

  // أخرى
  med({ id: 'custom-medication', nameAr: 'دواء آخر (مخصّص)', nameEn: 'Other (Custom)', category: 'other', purposeAr: 'أضف دواءك واكتب تفاصيله بنفسك', purposeEn: 'Add your medication and enter details yourself', timingAr: BWF, timingEn: PER_RX }),
]

export const medicationMap: Record<string, Medication> = Object.fromEntries(
  medications.map((m) => [m.id, m]),
)

export function getMedication(id: string): Medication | undefined {
  return medicationMap[id]
}
