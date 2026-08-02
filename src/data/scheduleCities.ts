// مدن جاهزة للبديل اليدوي في جدولة الغروب (شاشة 66) — عند رفض إذن الموقع.
// إحداثيات ثابتة (لا شبكة/تحويل جغرافي)؛ تركيز خليجي/سعودي مع مدن عالمية قليلة.

export interface ScheduleCity {
  id: string
  nameAr: string
  nameEn: string
  lat: number
  lon: number
}

export const SCHEDULE_CITIES: ScheduleCity[] = [
  { id: 'riyadh', nameAr: 'الرياض', nameEn: 'Riyadh', lat: 24.71, lon: 46.68 },
  { id: 'jeddah', nameAr: 'جدة', nameEn: 'Jeddah', lat: 21.49, lon: 39.19 },
  { id: 'mecca', nameAr: 'مكة المكرمة', nameEn: 'Mecca', lat: 21.42, lon: 39.83 },
  { id: 'medina', nameAr: 'المدينة المنورة', nameEn: 'Medina', lat: 24.52, lon: 39.57 },
  { id: 'dammam', nameAr: 'الدمام', nameEn: 'Dammam', lat: 26.43, lon: 50.1 },
  { id: 'abha', nameAr: 'أبها', nameEn: 'Abha', lat: 18.22, lon: 42.51 },
  { id: 'tabuk', nameAr: 'تبوك', nameEn: 'Tabuk', lat: 28.38, lon: 36.57 },
  { id: 'dubai', nameAr: 'دبي', nameEn: 'Dubai', lat: 25.2, lon: 55.27 },
  { id: 'doha', nameAr: 'الدوحة', nameEn: 'Doha', lat: 25.29, lon: 51.53 },
  { id: 'kuwait', nameAr: 'الكويت', nameEn: 'Kuwait City', lat: 29.38, lon: 47.99 },
  { id: 'manama', nameAr: 'المنامة', nameEn: 'Manama', lat: 26.23, lon: 50.59 },
  { id: 'muscat', nameAr: 'مسقط', nameEn: 'Muscat', lat: 23.59, lon: 58.41 },
  { id: 'cairo', nameAr: 'القاهرة', nameEn: 'Cairo', lat: 30.04, lon: 31.24 },
  { id: 'london', nameAr: 'لندن', nameEn: 'London', lat: 51.51, lon: -0.13 },
]
