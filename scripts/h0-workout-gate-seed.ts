// ح-٠ — بذرة الإثبات: تبني حالة التخزين التي تنتجها الرحلة الحقيقية بالضبط.
//
// لا قيم مخترعة: الخطة تُولَّد بنفس الدالة التي يستدعيها معالج الإعداد
// (StepGeneratePlan → generatePlan)، ثم تُكتب بنفس شكل مفتاح التخزين الحقيقي
// qimmah:customization:v1. المخرَج ملف JSON يزرعه المُشغِّل في المتصفح.

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePlan } from '@/lib/planGenerator'
import { defaultProfile } from '@/lib/calculators'
import type { Profile } from '@/types/profile'

// ملف مستخدم جديد أكمل الإعداد: ٤ أيام تمرين ⇒ المحرّك يختار تقسيمة علوي/سفلي.
const profile: Profile = {
  ...defaultProfile,
  name: 'زياد',
  age: 28,
  heightCm: 178,
  weightKg: 86,
  targetWeightKg: 78,
  trainingDays: 4,
  splitMode: 'auto',
}

const g = generatePlan(profile)

// نفس الحقول التي يكتبها معالج الإعداد في المتجر عند توليد الخطة.
const customization = {
  profile,
  targets: g.targets,
  targetsMeta: { manuallyEdited: false },
  workoutPlan: g.workoutPlan,
  nutritionPlan: g.nutritionPlan,
  commitmentPlan: g.commitmentPlan,
  measurementPlan: g.measurementPlan,
  routine: g.weeklySchedule,
}

const here = dirname(fileURLToPath(import.meta.url))
writeFileSync(
  resolve(here, '.h0-seed.json'),
  JSON.stringify(
    {
      customization,
      // ملخّص يُطبع في تقرير الإثبات لتوثيق ما زُرع فعلًا.
      summary: {
        templateId: g.workoutPlan.templateId,
        daysPerWeek: g.workoutPlan.days.length,
        dayNamesAr: g.workoutPlan.days.map((d) => d.nameAr),
        exercisesPerDay: g.workoutPlan.days.map((d) => d.exercises.length),
        dailyCalories: g.targets.tdee,
      },
    },
    null,
    2,
  ),
  'utf8',
)
