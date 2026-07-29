import type { Lang } from '@/lib/appPreferences'

export interface WellnessScreenStrings {
  // Picker headings
  supplementLibraryTitle: string
  medicationLibraryTitle: string
  commitmentLibraryTitle: string
  // Shared chrome
  close: string
  add: string
  noResults: string
  allCategories: string
  // Supplement category filter labels
  supCatProtein: string
  supCatPerformance: string
  supCatRecovery: string
  supCatVitamins: string
  supCatMinerals: string
  supCatHydration: string
  supCatDigestive: string
  supCatGeneralHealth: string
  supCatOther: string
  // Medication category filter labels
  medCatThyroid: string
  medCatDiabetes: string
  medCatBloodPressure: string
  medCatCholesterol: string
  medCatAllergy: string
  medCatAsthma: string
  medCatStomach: string
  medCatPainRelief: string
  medCatAntibiotic: string
  medCatVitaminPrescription: string
  medCatIron: string
  medCatMentalHealth: string
  medCatOther: string
  // Commitment category filter labels
  comCatTraining: string
  comCatNutrition: string
  comCatHydration: string
  comCatSleep: string
  comCatRecovery: string
  comCatHealth: string
  comCatSupplements: string
  comCatMedications: string
  comCatMeasurements: string
  comCatLifestyle: string
}

const ar: WellnessScreenStrings = {
  supplementLibraryTitle: 'مكتبة المكملات',
  medicationLibraryTitle: 'مكتبة الأدوية',
  commitmentLibraryTitle: 'مكتبة الالتزامات',
  close: 'إغلاق',
  add: 'أضف',
  noResults: 'ما فيه نتائج.',
  allCategories: 'كل الفئات',
  supCatProtein: 'بروتين',
  supCatPerformance: 'أداء',
  supCatRecovery: 'استشفاء',
  supCatVitamins: 'فيتامينات',
  supCatMinerals: 'معادن',
  supCatHydration: 'ترطيب',
  supCatDigestive: 'هضمي',
  supCatGeneralHealth: 'صحة عامة',
  supCatOther: 'أخرى',
  medCatThyroid: 'الغدة الدرقية',
  medCatDiabetes: 'السكري',
  medCatBloodPressure: 'الضغط',
  medCatCholesterol: 'الكوليسترول',
  medCatAllergy: 'الحساسية',
  medCatAsthma: 'الربو',
  medCatStomach: 'المعدة',
  medCatPainRelief: 'المسكّنات',
  medCatAntibiotic: 'مضاد حيوي',
  medCatVitaminPrescription: 'فيتامينات بوصفة',
  medCatIron: 'الحديد',
  medCatMentalHealth: 'الصحة النفسية',
  medCatOther: 'أخرى',
  comCatTraining: 'تمرين',
  comCatNutrition: 'تغذية',
  comCatHydration: 'ترطيب',
  comCatSleep: 'نوم',
  comCatRecovery: 'استشفاء',
  comCatHealth: 'صحة',
  comCatSupplements: 'مكملات',
  comCatMedications: 'أدوية',
  comCatMeasurements: 'قياسات',
  comCatLifestyle: 'نمط حياة',
}

const en: WellnessScreenStrings = {
  supplementLibraryTitle: 'Supplement Library',
  medicationLibraryTitle: 'Medication Library',
  commitmentLibraryTitle: 'Commitment Library',
  close: 'Close',
  add: 'Add',
  noResults: 'No results.',
  allCategories: 'All categories',
  supCatProtein: 'Protein',
  supCatPerformance: 'Performance',
  supCatRecovery: 'Recovery',
  supCatVitamins: 'Vitamins',
  supCatMinerals: 'Minerals',
  supCatHydration: 'Hydration',
  supCatDigestive: 'Digestive',
  supCatGeneralHealth: 'General health',
  supCatOther: 'Other',
  medCatThyroid: 'Thyroid',
  medCatDiabetes: 'Diabetes',
  medCatBloodPressure: 'Blood pressure',
  medCatCholesterol: 'Cholesterol',
  medCatAllergy: 'Allergy',
  medCatAsthma: 'Asthma',
  medCatStomach: 'Stomach',
  medCatPainRelief: 'Pain relief',
  medCatAntibiotic: 'Antibiotic',
  medCatVitaminPrescription: 'Prescribed vitamins',
  medCatIron: 'Iron',
  medCatMentalHealth: 'Mental health',
  medCatOther: 'Other',
  comCatTraining: 'Training',
  comCatNutrition: 'Nutrition',
  comCatHydration: 'Hydration',
  comCatSleep: 'Sleep',
  comCatRecovery: 'Recovery',
  comCatHealth: 'Health',
  comCatSupplements: 'Supplements',
  comCatMedications: 'Medications',
  comCatMeasurements: 'Measurements',
  comCatLifestyle: 'Lifestyle',
}

export const wellnessScreenStrings: Record<Lang, WellnessScreenStrings> = { ar, en }
