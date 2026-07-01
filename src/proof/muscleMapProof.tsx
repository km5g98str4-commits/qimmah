// صفحة إثبات (تطوير فقط) — تعرض خريطة العضلات الحقيقية داخل مزوّد التخصيص الفعلي.
// الجنس يُقرأ من ?gender= ويُبذر في localStorage قبل الإقلاع؛ الخطة تبقى الافتراضية (full-body-3)
// فتُغطّى عدة عضلات تلقائيًا. تُلتقط الجهتان (أمامي/خلفي) عبر مبدّل المكوّن نفسه.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CustomizationProvider } from '@/lib/customizationContext'
import { WeeklyMuscleMap } from '@/components/WeeklyMuscleMap'
import { STORAGE_KEY } from '@/lib/customization'
import { WORKOUT_SESSIONS_KEY } from '@/lib/workoutSessions'
import '@/styles/index.css'

const params = new URLSearchParams(location.search)
const gender = params.get('gender') === 'female' ? 'female' : 'male'

// ابذر الجنس فقط — بقية التخصيص (بما فيه خطة full-body-3) يأتي من الافتراضي.
localStorage.setItem(STORAGE_KEY, JSON.stringify({ profile: { gender } }))

// ابذر جلسة تمرين واقعية هذا الأسبوع بأحجام متفاوتة — لإظهار تلوين العضلات بثلاث شدّات.
const now = new Date()
const iso = now.toISOString()
const mkEx = (exerciseId: string, n: number) => ({
  exerciseId,
  targetSets: n,
  targetReps: '8–12',
  targetRestSec: 90,
  completed: true,
  sets: Array.from({ length: n }, (_, i) => ({
    setNumber: i + 1,
    targetReps: '8–12',
    actualReps: '10',
    weightKg: '40',
    completed: true,
  })),
})
const proofSessions = [
  {
    id: 'proof-1',
    date: iso.slice(0, 10),
    startedAt: iso,
    finishedAt: iso,
    workoutDayId: 'proof-day',
    workoutDayName: 'إثبات',
    exercises: [
      mkEx('barbell-bench-press', 4),
      mkEx('incline-barbell-press', 4), // صدر → شدّة عالية
      mkEx('lat-pulldown', 3),
      mkEx('barbell-row', 3),
      mkEx('deadlift', 3), // ظهر/أسفل الظهر
      mkEx('overhead-press', 3),
      mkEx('lateral-raise', 3), // أكتاف
      mkEx('dumbbell-shrug', 3), // ترابيس
      mkEx('barbell-curl', 2), // بايسبس → شدّة خفيفة
      mkEx('triceps-pushdown', 3), // ترايسبس
      mkEx('barbell-back-squat', 5),
      mkEx('leg-press', 4), // كوادز → شدّة عالية
      mkEx('romanian-deadlift', 3),
      mkEx('lying-leg-curl', 3), // خلفية الفخذ
      mkEx('hip-thrust', 3), // المؤخرة
      mkEx('standing-calf-raise', 2), // سمانة → شدّة خفيفة
      mkEx('crunch', 3), // بطن
    ],
  },
]
localStorage.setItem(WORKOUT_SESSIONS_KEY, JSON.stringify(proofSessions))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CustomizationProvider>
      <div style={{ maxWidth: 380, margin: '24px auto', padding: 16 }}>
        <WeeklyMuscleMap />
      </div>
    </CustomizationProvider>
  </StrictMode>,
)
