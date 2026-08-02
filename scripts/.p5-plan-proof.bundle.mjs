// src/lib/calculators.ts
var NEAT_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.2,
  moderate: 1.35,
  active: 1.45,
  very_active: 1.45
};
var TRAINING_ADD_PER_DAY = 0.025;
var ACTIVITY_MULTIPLIER_CAP = 1.9;
var PROTEIN_PER_KG = 1.8;
var FAT_CALORIE_RATIO = 0.27;
var CUT_DEFICIT = 400;
var BULK_SURPLUS = 300;
var KCAL_PER_KG = 7700;
var WATER_ML_PER_KG = 0.035;
var WATER_MIN_LITERS = 2.5;
var WATER_MAX_LITERS = 4;
var ADULT_MIN_AGE = 18;
function isMinorAge(age) {
  return age > 0 && age < ADULT_MIN_AGE;
}
function effectiveGoalTypeForAge(goalType, age) {
  return isMinorAge(age) ? "maintenance" : goalType;
}
var MINOR_GOAL_RESTRICTION_NOTE = "\u0623\u0647\u062F\u0627\u0641 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0648\u0632\u0646 \u0645\u062A\u0627\u062D\u0629 \u0645\u0646 18 \u0633\u0646\u0629 \u2014 \u0646\u0646\u0635\u062D \u0628\u0645\u0631\u0627\u062C\u0639\u0629 \u0645\u062E\u062A\u0635 \u062A\u063A\u0630\u064A\u0629";
function totalActivityMultiplier(activityLevel, trainingDays) {
  const neat = NEAT_MULTIPLIER[activityLevel] ?? NEAT_MULTIPLIER.sedentary;
  const days = Math.max(0, Math.min(7, Math.round(trainingDays || 0)));
  return Math.min(ACTIVITY_MULTIPLIER_CAP, neat + days * TRAINING_ADD_PER_DAY);
}
var goalTypeOptions = [
  { value: "cutting", label: "\u062A\u0646\u0634\u064A\u0641" },
  { value: "bulking", label: "\u062A\u0636\u062E\u064A\u0645" },
  { value: "maintenance", label: "\u0645\u062D\u0627\u0641\u0638\u0629 \u0639\u0644\u0649 \u0627\u0644\u0639\u0636\u0644" },
  { value: "returning", label: "\u0631\u062C\u0648\u0639 \u0628\u0639\u062F \u0627\u0646\u0642\u0637\u0627\u0639" },
  { value: "health", label: "\u0635\u062D\u0629 \u0639\u0627\u0645\u0629" }
];
function calorieGoalFromGoalType(g) {
  if (g === "cutting") return "cut";
  if (g === "bulking") return "bulk";
  return "maintain";
}
function goalTypeLabel(g) {
  return goalTypeOptions.find((o) => o.value === g)?.label ?? "";
}
var round = (n) => Math.round(n);
var round1 = (n) => Math.round(n * 10) / 10;
var roundHalf = (n) => Math.round(n * 2) / 2;
var clampNum = (n, min, max) => Math.min(max, Math.max(min, n));
function mifflinSexConstant(gender) {
  if (gender === "male") return 5;
  if (gender === "female") return -161;
  return -78;
}
function bmrFor(gender, weight, height, age) {
  return 10 * weight + 6.25 * height - 5 * age + mifflinSexConstant(gender);
}
var MINOR_BMI_LABEL = "\u062D\u0633\u0628 BMI: \u064A\u062D\u062A\u0627\u062C \u062A\u0642\u064A\u064A\u0645\u064B\u0627 \u062D\u0633\u0628 \u0627\u0644\u0639\u0645\u0631 (\u0645\u062E\u0637\u0637\u0627\u062A \u0646\u0645\u0648) \u2014 \u0631\u0627\u062C\u0639 \u0645\u062E\u062A\u0635\u064B\u0627";
function bmiLabelFor(bmi, age) {
  if (bmi <= 0) return "";
  if (age < ADULT_MIN_AGE) return MINOR_BMI_LABEL;
  if (bmi < 18.5) return "\u062D\u0633\u0628 BMI: \u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u0637\u0628\u064A\u0639\u064A";
  if (bmi < 25) return "\u062D\u0633\u0628 BMI: \u0636\u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0637\u0628\u064A\u0639\u064A";
  if (bmi < 30) return "\u062D\u0633\u0628 BMI: \u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u0637\u0628\u064A\u0639\u064A";
  return "\u062D\u0633\u0628 BMI: \u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u0637\u0628\u064A\u0639\u064A \u0628\u0648\u0636\u0648\u062D";
}
function calorieFloor(gender) {
  if (gender === "male") return 1500;
  if (gender === "female") return 1200;
  return 1350;
}
function rawCaloriesForGoalType(goalType, tdee) {
  switch (goalType) {
    case "cutting":
      return round(tdee - CUT_DEFICIT);
    case "bulking":
      return round(tdee + BULK_SURPLUS);
    case "maintenance":
    case "returning":
    case "health":
    default:
      return round(tdee);
  }
}
function targetCaloriesForGoalType(goalType, tdee, gender) {
  const raw = rawCaloriesForGoalType(goalType, tdee);
  return goalType === "cutting" ? Math.max(raw, calorieFloor(gender)) : raw;
}
function lowCalorieThreshold(gender, bmr) {
  return gender === "female" ? bmr : 1500;
}
var LOW_CALORIE_NOTE = "\u0627\u0644\u0633\u0639\u0631\u0627\u062A \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629 \u0645\u0646\u062E\u0641\u0636\u0629 \u0646\u0633\u0628\u064A\u064B\u0627\u061B \u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u063A\u0637\u064A\u0629 \u0627\u062D\u062A\u064A\u0627\u062C\u0643 \u0645\u0646 \u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0646 \u0648\u0627\u0644\u0637\u0627\u0642\u0629\u060C \u0648\u0627\u0631\u0641\u0639\u0647\u0627 \u0625\u0630\u0627 \u0634\u0639\u0631\u062A \u0628\u0625\u0631\u0647\u0627\u0642.";
var MINOR_PLAN_NOTE = "\u0639\u0645\u0631\u0643 \u062F\u0648\u0646 18: \u0647\u0630\u0647 \u0623\u0631\u0642\u0627\u0645 \u062A\u0642\u062F\u064A\u0631\u064A\u0629 \u0628\u0645\u0639\u0627\u062F\u0644\u0627\u062A \u0645\u0635\u0645\u0651\u0645\u0629 \u0644\u0644\u0628\u0627\u0644\u063A\u064A\u0646\u060C \u0648\u0644\u064A\u0633\u062A \u0628\u062F\u064A\u0644\u064B\u0627 \u0639\u0646 \u0645\u062A\u0627\u0628\u0639\u0629 \u0645\u062E\u062A\u0635 \u0646\u0645\u0648/\u062A\u063A\u0630\u064A\u0629.";
function suggestedSplit(days, level, env) {
  if (env === "home") return "\u062A\u0645\u0631\u064A\u0646 \u0645\u0646\u0632\u0644\u064A (\u0648\u0632\u0646 \u0627\u0644\u062C\u0633\u0645 \u0648\u0623\u062F\u0648\u0627\u062A \u0628\u0633\u064A\u0637\u0629)";
  if (level === "beginner") return days >= 4 ? "\u0639\u0644\u0648\u064A/\u0633\u0641\u0644\u064A (Upper/Lower)" : "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644 (Full Body)";
  if (days <= 3) return "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644 (Full Body)";
  if (days === 4) return "\u0639\u0644\u0648\u064A/\u0633\u0641\u0644\u064A (Upper/Lower)";
  if (days === 5) return "\u0665 \u0623\u064A\u0627\u0645: \u0639\u0644\u0648\u064A/\u0633\u0641\u0644\u064A + \u064A\u0648\u0645 \u062A\u0631\u0643\u064A\u0632";
  if (days >= 6) return "\u062F\u0641\u0639/\u0633\u062D\u0628/\u0623\u0631\u062C\u0644 (Push/Pull/Legs)";
  return "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644 (Full Body)";
}
function emptyTargets() {
  return {
    bmi: 0,
    bmiLabel: "",
    bmr: 0,
    tdee: 0,
    maintenanceCalories: 0,
    cuttingCalories: 0,
    bulkingCalories: 0,
    targetCalories: 0,
    proteinGrams: 0,
    fatGrams: 0,
    carbsGrams: 0,
    waterLiters: 0,
    weeklyWeightChangeKg: 0,
    estimatedWeeksToGoal: 0,
    suggestedTrainingSplit: "",
    notes: ""
  };
}
function computeTargets(p) {
  const w = p.weightKg;
  const h = p.heightCm;
  const age = p.age;
  if (w <= 0 || h <= 0) return emptyTargets();
  const bmr = round(bmrFor(p.gender, w, h, age));
  const tdee = round(bmr * totalActivityMultiplier(p.activityLevel, p.trainingDays));
  const maintenance = tdee;
  const cutting = Math.max(round(tdee - 400), calorieFloor(p.gender));
  const bulking = round(tdee + 300);
  const effectiveGoalType = effectiveGoalTypeForAge(p.goalType, age);
  const calories = targetCaloriesForGoalType(effectiveGoalType, tdee, p.gender);
  const rawCalories = rawCaloriesForGoalType(effectiveGoalType, tdee);
  const isLowCalorie = rawCalories < lowCalorieThreshold(p.gender, bmr);
  const protein = round(PROTEIN_PER_KG * w);
  const fat = round(calories * FAT_CALORIE_RATIO / 9);
  const carbs = Math.max(0, round((calories - protein * 4 - fat * 9) / 4));
  const water = clampNum(roundHalf(w * WATER_ML_PER_KG), WATER_MIN_LITERS, WATER_MAX_LITERS);
  const bmi = round1(w / Math.pow(h / 100, 2));
  const diff = isMinorAge(age) ? 0 : p.targetWeightKg - w;
  let weeklyChange = 0;
  let weeks = 0;
  if (diff < -0.05) {
    const rate = CUT_DEFICIT * 7 / KCAL_PER_KG;
    weeklyChange = -round1(rate);
    weeks = Math.ceil(Math.abs(diff) / rate);
  } else if (diff > 0.05) {
    const rate = BULK_SURPLUS * 7 / KCAL_PER_KG;
    weeklyChange = round1(rate);
    weeks = Math.ceil(diff / rate);
  }
  return {
    bmi,
    bmiLabel: bmiLabelFor(bmi, age),
    bmr,
    tdee,
    maintenanceCalories: maintenance,
    cuttingCalories: cutting,
    bulkingCalories: bulking,
    targetCalories: calories,
    proteinGrams: protein,
    fatGrams: fat,
    carbsGrams: carbs,
    waterLiters: water,
    weeklyWeightChangeKg: weeklyChange,
    estimatedWeeksToGoal: weeks,
    suggestedTrainingSplit: suggestedSplit(p.trainingDays, p.trainingLevel, p.workoutEnvironment),
    notes: [
      age < ADULT_MIN_AGE ? MINOR_PLAN_NOTE : "",
      p.gender === "unspecified" ? "\u062A\u0642\u062F\u064A\u0631 \u062A\u0642\u0631\u064A\u0628\u064A (\u0644\u0645 \u064A\u064F\u062D\u062F\u064E\u0651\u062F \u0627\u0644\u062C\u0646\u0633)." : "",
      isLowCalorie ? LOW_CALORIE_NOTE : ""
    ].filter(Boolean).join(" ")
  };
}

// src/lib/equipmentAccess.ts
function resolveGymAccess(p) {
  const fallback = p.gymType === "home" || p.workoutEnvironment === "home" ? "home" : p.gymType === "bodyweight" ? "bodyweight" : p.gymType === "small" ? "small" : "full";
  return p.gymAccess ?? fallback;
}
function makeEquipmentGate(p, opts) {
  const access = opts?.homeOnly ? "home" : resolveGymAccess(p);
  if (access === "full") return () => true;
  if (access === "small") {
    const banned = /* @__PURE__ */ new Set(["smith", "rope"]);
    return (equipment) => equipment.every((e) => !banned.has(e));
  }
  if (access === "home") {
    const allowed2 = /* @__PURE__ */ new Set(["dumbbell", "barbell", "bodyweight", "band", "bench"]);
    return (equipment) => equipment.every((e) => allowed2.has(e));
  }
  const allowed = /* @__PURE__ */ new Set(["bodyweight"]);
  return (equipment) => equipment.every((e) => allowed.has(e));
}

// src/data/muscleGroups.ts
var LARGE = { min: 8, max: 16 };
var SMALL = { min: 6, max: 12 };
var muscleGroups = [
  // ===== الصدر =====
  { id: "chest_upper", labelAr: "\u0635\u062F\u0631 \u0639\u0644\u0648\u064A", labelEn: "Upper Chest", view: "front", size: "small", weeklyTarget: SMALL, region: "push" },
  { id: "chest_mid", labelAr: "\u0635\u062F\u0631", labelEn: "Chest", view: "front", size: "large", weeklyTarget: LARGE, region: "push" },
  { id: "chest_lower", labelAr: "\u0635\u062F\u0631 \u0633\u0641\u0644\u064A", labelEn: "Lower Chest", view: "front", size: "small", weeklyTarget: SMALL, region: "push" },
  // ===== الظهر =====
  { id: "lats", labelAr: "\u0644\u0627\u062A\u0633", labelEn: "Lats", view: "back", size: "large", weeklyTarget: LARGE, region: "pull" },
  { id: "upper_back", labelAr: "\u0638\u0647\u0631 \u0639\u0644\u0648\u064A", labelEn: "Upper Back", view: "back", size: "large", weeklyTarget: LARGE, region: "pull" },
  { id: "traps", labelAr: "\u062A\u0631\u0627\u0628\u064A\u0633", labelEn: "Traps", view: "back", size: "small", weeklyTarget: SMALL, region: "pull" },
  // ===== الأكتاف =====
  { id: "rear_delts", labelAr: "\u0643\u062A\u0641 \u062E\u0644\u0641\u064A", labelEn: "Rear Delts", view: "back", size: "small", weeklyTarget: SMALL, region: "pull" },
  { id: "front_delts", labelAr: "\u0643\u062A\u0641 \u0623\u0645\u0627\u0645\u064A", labelEn: "Front Delts", view: "front", size: "small", weeklyTarget: SMALL, region: "push" },
  { id: "side_delts", labelAr: "\u0643\u062A\u0641 \u062C\u0627\u0646\u0628\u064A", labelEn: "Side Delts", view: "front", size: "small", weeklyTarget: SMALL, region: "push" },
  // ===== الذراع =====
  { id: "biceps", labelAr: "\u0628\u0627\u064A\u0633\u0628\u0633", labelEn: "Biceps", view: "front", size: "small", weeklyTarget: SMALL, region: "pull" },
  { id: "triceps", labelAr: "\u062A\u0631\u0627\u064A\u0633\u0628\u0633", labelEn: "Triceps", view: "back", size: "small", weeklyTarget: SMALL, region: "push" },
  { id: "forearms", labelAr: "\u0633\u0627\u0639\u062F", labelEn: "Forearms", view: "front", size: "small", weeklyTarget: SMALL, region: "pull" },
  // ===== الجذع =====
  { id: "abs", labelAr: "\u0628\u0637\u0646", labelEn: "Abs", view: "front", size: "small", weeklyTarget: SMALL, region: "core" },
  { id: "obliques", labelAr: "\u062C\u0648\u0627\u0646\u0628 \u0627\u0644\u0628\u0637\u0646", labelEn: "Obliques", view: "front", size: "small", weeklyTarget: SMALL, region: "core" },
  { id: "lower_back", labelAr: "\u0623\u0633\u0641\u0644 \u0627\u0644\u0638\u0647\u0631", labelEn: "Lower Back", view: "back", size: "small", weeklyTarget: SMALL, region: "core" },
  // ===== الأرجل =====
  { id: "quads", labelAr: "\u0623\u0645\u0627\u0645\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", labelEn: "Quads", view: "front", size: "large", weeklyTarget: LARGE, region: "legs" },
  { id: "hamstrings", labelAr: "\u062E\u0644\u0641\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", labelEn: "Hamstrings", view: "back", size: "large", weeklyTarget: LARGE, region: "legs" },
  { id: "glutes", labelAr: "\u0627\u0644\u0645\u0624\u062E\u0631\u0629", labelEn: "Glutes", view: "back", size: "large", weeklyTarget: LARGE, region: "legs" },
  { id: "calves", labelAr: "\u0627\u0644\u0633\u0645\u0627\u0646\u0629", labelEn: "Calves", view: "back", size: "small", weeklyTarget: SMALL, region: "legs" }
];
var muscleMap = Object.fromEntries(
  muscleGroups.map((m) => [m.id, m])
);
var ALL_MUSCLE_IDS = muscleGroups.map((m) => m.id);

// src/lib/muscles.ts
var muscleLabels = {
  chest: { ar: "\u0627\u0644\u0635\u062F\u0631", en: "Chest" },
  back: { ar: "\u0627\u0644\u0638\u0647\u0631", en: "Back" },
  shoulders: { ar: "\u0627\u0644\u0623\u0643\u062A\u0627\u0641", en: "Shoulders" },
  biceps: { ar: "\u0627\u0644\u0628\u0627\u064A\u0633\u0628\u0633", en: "Biceps" },
  triceps: { ar: "\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633", en: "Triceps" },
  legs: { ar: "\u0627\u0644\u0623\u0631\u062C\u0644", en: "Legs" },
  glutes: { ar: "\u0627\u0644\u062C\u0644\u0648\u062A\u0633", en: "Glutes" },
  hamstrings: { ar: "\u0627\u0644\u0647\u0627\u0645\u0633\u062A\u0631\u0646\u0642", en: "Hamstrings" },
  quads: { ar: "\u0627\u0644\u0643\u0648\u0627\u062F\u0632", en: "Quads" },
  calves: { ar: "\u0627\u0644\u0633\u0645\u0627\u0646\u0629", en: "Calves" },
  core: { ar: "\u0627\u0644\u0643\u0648\u0631", en: "Core" },
  cardio: { ar: "\u0643\u0627\u0631\u062F\u064A\u0648", en: "Cardio" }
};

// src/lib/exerciseGuidance.ts
var TECHNIQUE_BY_PATTERN = {
  push: [
    "\u062B\u0628\u0651\u062A \u0644\u0648\u062D \u0627\u0644\u0643\u062A\u0641 \u0644\u0644\u062E\u0644\u0641 \u0648\u0644\u0644\u0623\u0633\u0641\u0644 \u0642\u0628\u0644 \u0628\u062F\u0621 \u0627\u0644\u062F\u0641\u0639.",
    "\u0627\u0646\u0632\u0644 \u0628\u062A\u062D\u0643\u0651\u0645 (\u0662\u2013\u0663 \u062B\u0648\u0627\u0646\u064D) \u062B\u0645 \u0627\u062F\u0641\u0639 \u0628\u0642\u0648\u0629.",
    "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0631\u0633\u063A \u0645\u0633\u062A\u0642\u064A\u0645\u064B\u0627 \u0641\u0648\u0642 \u0627\u0644\u0645\u0631\u0641\u0642."
  ],
  pull: [
    "\u0627\u0628\u062F\u0623 \u0627\u0644\u0633\u062D\u0628 \u0645\u0646 \u0639\u0636\u0644\u0627\u062A \u0627\u0644\u0638\u0647\u0631 \u0648\u0644\u064A\u0633 \u0645\u0646 \u0627\u0644\u0630\u0631\u0627\u0639\u064A\u0646.",
    "\u0627\u0639\u0635\u0631 \u0644\u0648\u062D\u064A \u0627\u0644\u0643\u062A\u0641 \u0641\u064A \u0646\u0647\u0627\u064A\u0629 \u0627\u0644\u062D\u0631\u0643\u0629.",
    "\u062A\u062C\u0646\u0651\u0628 \u0627\u0644\u062A\u0623\u0631\u062C\u062D \u0628\u0627\u0644\u062C\u0630\u0639 \u0644\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0634\u062F\u0651 \u0646\u0638\u064A\u0641."
  ],
  squat: [
    "\u0627\u0646\u0632\u0644 \u062D\u062A\u0649 \u064A\u0648\u0627\u0632\u064A \u0627\u0644\u0641\u062E\u0630 \u0627\u0644\u0623\u0631\u0636 \u0623\u0648 \u0623\u0642\u0644 \u0625\u0646 \u0633\u0645\u062D\u062A \u0627\u0644\u0645\u0631\u0648\u0646\u0629.",
    "\u0627\u062F\u0641\u0639 \u0627\u0644\u0631\u0643\u0628\u062A\u064A\u0646 \u0644\u0644\u062E\u0627\u0631\u062C \u0628\u0627\u062A\u062C\u0627\u0647 \u0623\u0635\u0627\u0628\u0639 \u0627\u0644\u0642\u062F\u0645.",
    "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0635\u062F\u0631\u0643 \u0645\u0631\u0641\u0648\u0639\u064B\u0627 \u0648\u0638\u0647\u0631\u0643 \u0645\u062D\u0627\u064A\u062F\u064B\u0627."
  ],
  hinge: [
    "\u0627\u0628\u062F\u0623 \u0627\u0644\u062D\u0631\u0643\u0629 \u0628\u062F\u0641\u0639 \u0627\u0644\u0648\u0631\u0643 \u0644\u0644\u062E\u0644\u0641 \u0644\u0627 \u0628\u062B\u0646\u064A \u0627\u0644\u0638\u0647\u0631.",
    "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0644\u0628\u0627\u0631/\u0627\u0644\u062F\u0645\u0628\u0644 \u0642\u0631\u064A\u0628\u064B\u0627 \u0645\u0646 \u0627\u0644\u062C\u0633\u0645.",
    "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0638\u0647\u0631 \u0645\u0633\u062A\u0642\u064A\u0645 \u0645\u062D\u0627\u064A\u062F \u0637\u0648\u0627\u0644 \u0627\u0644\u062D\u0631\u0643\u0629."
  ],
  lunge: [
    "\u0627\u062C\u0639\u0644 \u0631\u0643\u0628\u062A\u0643 \u0627\u0644\u0623\u0645\u0627\u0645\u064A\u0629 \u0641\u0648\u0642 \u0627\u0644\u0643\u0627\u062D\u0644 \u0644\u0627 \u0645\u062A\u0642\u062F\u0645\u0629 \u0643\u062B\u064A\u0631\u064B\u0627.",
    "\u0627\u0646\u0632\u0644 \u0628\u0634\u0643\u0644 \u0639\u0645\u0648\u062F\u064A \u0648\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u062A\u0648\u0627\u0632\u0646 \u0627\u0644\u062C\u0630\u0639.",
    "\u0627\u062F\u0641\u0639 \u0645\u0646 \u0643\u0639\u0628 \u0627\u0644\u0642\u062F\u0645 \u0627\u0644\u0623\u0645\u0627\u0645\u064A\u0629 \u0644\u0644\u0635\u0639\u0648\u062F."
  ],
  isolation: [
    "\u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u0627\u0644\u0639\u0636\u0644\u0629 \u0627\u0644\u0645\u0633\u062A\u0647\u062F\u0641\u0629 \u0637\u0648\u0627\u0644 \u0627\u0644\u0645\u062F\u0649.",
    "\u062A\u062D\u0643\u0651\u0645 \u0641\u064A \u0627\u0644\u0646\u0632\u0648\u0644 \u0648\u0644\u0627 \u062A\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0632\u062E\u0645.",
    "\u0627\u0633\u062A\u062E\u062F\u0645 \u0645\u062F\u0649 \u062D\u0631\u0643\u0629 \u0643\u0627\u0645\u0644 \u062F\u0648\u0646 \u0642\u0641\u0644 \u0627\u0644\u0645\u0641\u0635\u0644 \u0628\u0639\u0646\u0641."
  ],
  carry: [
    "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u062C\u0630\u0639 \u0645\u0634\u062F\u0648\u062F \u0648\u0643\u062A\u0641\u064A\u0646 \u0644\u0644\u062E\u0644\u0641.",
    "\u0627\u0645\u0634\u0650 \u0628\u062E\u0637\u0648\u0627\u062A \u062B\u0627\u0628\u062A\u0629 \u0648\u0646\u0638\u0631\u0629 \u0644\u0644\u0623\u0645\u0627\u0645.",
    "\u0648\u0632\u0651\u0639 \u0627\u0644\u062D\u0645\u0644 \u0628\u0627\u0644\u062A\u0633\u0627\u0648\u064A \u0628\u064A\u0646 \u0627\u0644\u062C\u0627\u0646\u0628\u064A\u0646."
  ],
  core: [
    "\u0627\u0628\u0642\u0650 \u0623\u0633\u0641\u0644 \u0638\u0647\u0631\u0643 \u0645\u0644\u0627\u0635\u0642\u064B\u0627 \u0644\u0644\u0623\u0631\u0636 \u0623\u0648 \u0645\u062D\u0627\u064A\u062F\u064B\u0627.",
    "\u062A\u0646\u0641\u0651\u0633 \u0628\u062B\u0628\u0627\u062A \u0648\u0644\u0627 \u062A\u062D\u0628\u0633 \u0627\u0644\u0646\u0641\u0633.",
    "\u0631\u0643\u0651\u0632 \u0639\u0644\u0649 \u0634\u062F\u0651 \u0639\u0636\u0644\u0627\u062A \u0627\u0644\u0628\u0637\u0646 \u0644\u0627 \u0634\u062F\u0651 \u0627\u0644\u0631\u0642\u0628\u0629."
  ],
  cardio: [
    "\u0627\u0628\u062F\u0623 \u0628\u0625\u062D\u0645\u0627\u0621 \u062E\u0641\u064A\u0641 \u0648\u0627\u0631\u0641\u0639 \u0627\u0644\u0634\u062F\u0651\u0629 \u062A\u062F\u0631\u064A\u062C\u064A\u064B\u0627.",
    "\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0625\u064A\u0642\u0627\u0639 \u062A\u0646\u0641\u0651\u0633 \u0645\u0646\u062A\u0638\u0645.",
    "\u0631\u0627\u0642\u0628 \u0645\u0639\u062F\u0651\u0644 \u0636\u0631\u0628\u0627\u062A \u0627\u0644\u0642\u0644\u0628 \u0648\u0627\u0628\u0642\u064E \u0636\u0645\u0646 \u0646\u0637\u0627\u0642 \u0645\u0631\u064A\u062D."
  ],
  mobility: [
    "\u062A\u062D\u0631\u0651\u0643 \u0628\u0628\u0637\u0621 \u0648\u0636\u0645\u0646 \u0645\u062F\u0649 \u0645\u0631\u064A\u062D \u0628\u0644\u0627 \u0623\u0644\u0645.",
    "\u062A\u0646\u0641\u0651\u0633 \u0628\u0639\u0645\u0642 \u0648\u0627\u0633\u062A\u0631\u062E\u0650 \u0641\u064A \u0643\u0644 \u062A\u0643\u0631\u0627\u0631/\u062B\u0628\u0627\u062A.",
    "\u0627\u0644\u0647\u062F\u0641 \u062A\u062C\u0647\u064A\u0632 \u0627\u0644\u0645\u0641\u0635\u0644 \u0648\u0627\u0644\u0639\u0636\u0644\u0629 \u0644\u0627 \u0625\u062C\u0647\u0627\u062F\u0647\u0645\u0627."
  ]
};
var MISTAKES_BY_PATTERN = {
  push: ["\u0631\u0641\u0639 \u0627\u0644\u0645\u0624\u062E\u0631\u0629 \u0639\u0646 \u0627\u0644\u0645\u0642\u0639\u062F \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062F\u0641\u0639.", "\u0641\u0631\u062F \u0627\u0644\u0645\u0631\u0641\u0642 \u0628\u0639\u0646\u0641 \u0641\u064A \u0627\u0644\u0623\u0639\u0644\u0649.", "\u0648\u0632\u0646 \u0623\u062B\u0642\u0644 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645 \u064A\u0641\u0642\u062F\u0643 \u0627\u0644\u062A\u062D\u0643\u0651\u0645."],
  pull: ["\u0627\u0644\u0633\u062D\u0628 \u0628\u0627\u0644\u0630\u0631\u0627\u0639\u064A\u0646 \u0641\u0642\u0637 \u062F\u0648\u0646 \u0625\u0634\u0631\u0627\u0643 \u0627\u0644\u0638\u0647\u0631.", "\u0627\u0644\u062A\u0623\u0631\u062C\u062D \u0628\u0627\u0644\u062C\u0633\u0645 \u0644\u0644\u063A\u0634 \u0628\u0627\u0644\u0648\u0632\u0646.", "\u0639\u062F\u0645 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0645\u062F\u0649 \u0627\u0644\u0643\u0627\u0645\u0644 \u0644\u0644\u062D\u0631\u0643\u0629."],
  squat: ["\u0631\u0641\u0639 \u0627\u0644\u0643\u0639\u0628\u064A\u0646 \u0639\u0646 \u0627\u0644\u0623\u0631\u0636.", "\u0627\u0646\u0647\u064A\u0627\u0631 \u0627\u0644\u0631\u0643\u0628\u062A\u064A\u0646 \u0644\u0644\u062F\u0627\u062E\u0644.", "\u062A\u0642\u0648\u064A\u0633 \u0623\u0633\u0641\u0644 \u0627\u0644\u0638\u0647\u0631 \u0641\u064A \u0627\u0644\u0642\u0627\u0639."],
  hinge: ["\u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u0638\u0647\u0631 \u0628\u062F\u0644 \u062F\u0641\u0639 \u0627\u0644\u0648\u0631\u0643.", "\u0625\u0628\u0639\u0627\u062F \u0627\u0644\u0628\u0627\u0631 \u0639\u0646 \u0627\u0644\u062C\u0633\u0645.", "\u0641\u0631\u062F \u0627\u0644\u0631\u0643\u0628\u062A\u064A\u0646 \u0628\u0627\u0644\u0643\u0627\u0645\u0644 \u0628\u062F\u0644 \u0627\u0644\u0645\u0641\u0635\u0644\u0629 \u0645\u0646 \u0627\u0644\u0648\u0631\u0643."],
  lunge: ["\u062A\u0642\u062F\u0651\u0645 \u0627\u0644\u0631\u0643\u0628\u0629 \u0643\u062B\u064A\u0631\u064B\u0627 \u0639\u0644\u0649 \u0623\u0635\u0627\u0628\u0639 \u0627\u0644\u0642\u062F\u0645.", "\u0645\u064A\u0644\u0627\u0646 \u0627\u0644\u062C\u0630\u0639 \u0644\u0644\u0623\u0645\u0627\u0645.", "\u062E\u0637\u0648\u0629 \u0642\u0635\u064A\u0631\u0629 \u062C\u062F\u064B\u0627 \u062A\u0636\u063A\u0637 \u0627\u0644\u0631\u0643\u0628\u0629."],
  isolation: ["\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0632\u062E\u0645 \u0628\u062F\u0644 \u0627\u0644\u0639\u0636\u0644\u0629.", "\u0648\u0632\u0646 \u062B\u0642\u064A\u0644 \u064A\u0642\u0635\u0651\u0631 \u0645\u062F\u0649 \u0627\u0644\u062D\u0631\u0643\u0629.", "\u0627\u0644\u0646\u0632\u0648\u0644 \u0627\u0644\u0633\u0631\u064A\u0639 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u062D\u0643\u0651\u0645."],
  carry: ["\u062A\u0631\u0647\u0651\u0644 \u0627\u0644\u0643\u062A\u0641\u064A\u0646 \u0644\u0644\u0623\u0645\u0627\u0645.", "\u062D\u0628\u0633 \u0627\u0644\u0646\u0641\u0633 \u0637\u0648\u0627\u0644 \u0627\u0644\u0645\u0633\u0627\u0641\u0629.", "\u062D\u0645\u0644 \u063A\u064A\u0631 \u0645\u062A\u0648\u0627\u0632\u0646 \u0628\u064A\u0646 \u0627\u0644\u064A\u062F\u064A\u0646."],
  core: ["\u0634\u062F\u0651 \u0627\u0644\u0631\u0642\u0628\u0629 \u0628\u062F\u0644 \u0627\u0644\u0628\u0637\u0646.", "\u062D\u0628\u0633 \u0627\u0644\u0646\u0641\u0633.", "\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u0632\u062E\u0645 \u0628\u062F\u0644 \u0627\u0644\u062A\u062D\u0643\u0651\u0645."],
  cardio: ["\u0627\u0644\u0628\u062F\u0621 \u0628\u0634\u062F\u0651\u0629 \u0639\u0627\u0644\u064A\u0629 \u062F\u0648\u0646 \u0625\u062D\u0645\u0627\u0621.", "\u0648\u0636\u0639\u064A\u0629 \u062C\u0633\u0645 \u0645\u0646\u062D\u0646\u064A\u0629 \u0639\u0644\u0649 \u0627\u0644\u062C\u0647\u0627\u0632.", "\u062A\u062C\u0627\u0647\u0644 \u0639\u0644\u0627\u0645\u0627\u062A \u0627\u0644\u0625\u0631\u0647\u0627\u0642 \u0627\u0644\u0632\u0627\u0626\u062F."],
  mobility: ["\u0627\u0644\u0627\u0631\u062A\u062F\u0627\u062F \u0627\u0644\u0639\u0646\u064A\u0641 \u0628\u062F\u0644 \u0627\u0644\u062A\u0645\u062F\u0651\u062F \u0627\u0644\u062B\u0627\u0628\u062A.", "\u062A\u062C\u0627\u0648\u0632 \u062D\u062F\u0651 \u0627\u0644\u0623\u0644\u0645.", "\u062D\u0628\u0633 \u0627\u0644\u0646\u0641\u0633 \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062A\u0645\u062F\u0651\u062F."]
};
var SAFETY_BY_PATTERN = {
  push: ["\u0627\u0633\u062A\u062E\u062F\u0645 \u0645\u0631\u0627\u0642\u0628\u064B\u0627 (\u0633\u0628\u0648\u062A\u0631) \u0645\u0639 \u0627\u0644\u0623\u0648\u0632\u0627\u0646 \u0627\u0644\u062B\u0642\u064A\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0635\u062F\u0631.", "\u0644\u0627 \u062A\u064F\u0646\u0632\u0644 \u0627\u0644\u0648\u0632\u0646 \u0628\u0633\u0631\u0639\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0641\u0635\u0644."],
  pull: ["\u0623\u062D\u0645\u0650 \u0623\u0633\u0641\u0644 \u0638\u0647\u0631\u0643 \u0628\u0648\u0636\u0639\u064A\u0629 \u0645\u062D\u0627\u064A\u062F\u0629.", "\u0627\u0628\u062F\u0623 \u0628\u0648\u0632\u0646 \u064A\u0633\u0645\u062D \u0628\u0623\u062F\u0627\u0621 \u0646\u0638\u064A\u0641."],
  squat: ["\u0627\u0633\u062A\u062E\u062F\u0645 \u062D\u0648\u0627\u0645\u0644 \u0627\u0644\u0623\u0645\u0627\u0646 (\u0633\u064A\u0641\u062A\u064A) \u0641\u064A \u0627\u0644\u0642\u0641\u0635.", "\u0644\u0627 \u062A\u0642\u0641\u0644 \u0627\u0644\u0631\u0643\u0628\u0629 \u0628\u0639\u0646\u0641 \u0623\u0639\u0644\u0649 \u0627\u0644\u062D\u0631\u0643\u0629."],
  hinge: ["\u0627\u0644\u0638\u0647\u0631 \u0627\u0644\u0645\u0642\u0648\u0651\u0633 \u062E\u0637\u0631 \u0639\u0644\u0649 \u0627\u0644\u0641\u0642\u0631\u0627\u062A \u2014 \u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0633\u062A\u0642\u0627\u0645\u062A\u0647.", "\u0627\u0628\u062F\u0623 \u0628\u0648\u0632\u0646 \u062E\u0641\u064A\u0641 \u0644\u0625\u062A\u0642\u0627\u0646 \u0627\u0644\u0646\u0645\u0637 \u0623\u0648\u0644\u064B\u0627."],
  lunge: ["\u0627\u0646\u062A\u0628\u0647 \u0644\u0644\u062A\u0648\u0627\u0632\u0646\u060C \u0648\u0627\u0633\u062A\u0646\u062F \u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629.", "\u062A\u0648\u0642\u0651\u0641 \u0625\u0630\u0627 \u0634\u0639\u0631\u062A \u0628\u0623\u0644\u0645 \u0641\u064A \u0627\u0644\u0631\u0643\u0628\u0629."],
  isolation: ["\u062A\u062C\u0646\u0651\u0628 \u0627\u0644\u0623\u0648\u0632\u0627\u0646 \u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0641\u064A\u0647\u0627 \u0639\u0644\u0649 \u0627\u0644\u0645\u0641\u0635\u0644 \u0627\u0644\u0635\u063A\u064A\u0631.", "\u0623\u0648\u0642\u0641 \u0627\u0644\u062A\u0645\u0631\u064A\u0646 \u0639\u0646\u062F \u0623\u064A \u0623\u0644\u0645 \u062D\u0627\u062F."],
  carry: ["\u0623\u0628\u0642\u0650 \u0645\u0633\u0627\u0631\u0643 \u062E\u0627\u0644\u064A\u064B\u0627 \u0645\u0646 \u0627\u0644\u0639\u0648\u0627\u0626\u0642.", "\u0623\u0646\u0632\u0644 \u0627\u0644\u0648\u0632\u0646 \u0628\u0623\u0645\u0627\u0646 \u0639\u0646\u062F \u0627\u0644\u0627\u0646\u062A\u0647\u0627\u0621."],
  core: ["\u062A\u0648\u0642\u0651\u0641 \u0639\u0646\u062F \u0623\u064A \u0623\u0644\u0645 \u0641\u064A \u0623\u0633\u0641\u0644 \u0627\u0644\u0638\u0647\u0631 \u0623\u0648 \u0627\u0644\u0631\u0642\u0628\u0629.", "\u062A\u062C\u0646\u0651\u0628 \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0627\u0644\u0645\u0631\u062A\u062F\u0651\u0629 \u0627\u0644\u0639\u0646\u064A\u0641\u0629."],
  cardio: ["\u0623\u062D\u0645\u0627\u0621 \u0648\u062A\u0647\u062F\u0626\u0629 \u0636\u0631\u0648\u0631\u064A\u0627\u0646 \u0644\u062A\u062C\u0646\u0651\u0628 \u0627\u0644\u0625\u0635\u0627\u0628\u0627\u062A.", "\u0627\u0634\u0631\u0628 \u0627\u0644\u0645\u0627\u0621 \u0648\u062A\u0648\u0642\u0651\u0641 \u0639\u0646\u062F \u0627\u0644\u062F\u0648\u0627\u0631 \u0623\u0648 \u0636\u064A\u0642 \u0627\u0644\u0646\u0641\u0633."],
  mobility: ["\u0644\u0627 \u062A\u062C\u0628\u0631 \u0627\u0644\u0645\u0641\u0635\u0644 \u0639\u0644\u0649 \u0645\u062F\u0649 \u0645\u0624\u0644\u0645.", "\u062A\u0648\u0642\u0651\u0641 \u0641\u0648\u0631\u064B\u0627 \u0639\u0646\u062F \u0623\u064A \u0623\u0644\u0645 \u062D\u0627\u062F \u0623\u0648 \u0648\u062E\u0632."]
};
var TECHNIQUE_BY_PATTERN_EN = {
  push: ["Set your shoulder blades back and down before you start pressing.", "Lower under control (2-3 seconds), then press back up with intent.", "Keep your wrist straight and stacked over your elbow."],
  pull: ["Start the pull from your back muscles, not from your arms.", "Squeeze your shoulder blades together at the end of the pull.", "Avoid swinging your torso so the tension stays where you want it."],
  squat: ["Descend to about parallel, or lower if your mobility allows it.", "Drive your knees out so they track in line with your toes.", "Keep your chest up and your spine neutral."],
  hinge: ["Start the movement by pushing your hips back, not by bending your back.", "Keep the bar or dumbbell close to your body.", "Hold a neutral spine from start to finish."],
  lunge: ["Keep your front shin close to vertical, with the knee tracking over the foot.", "Lower straight down and keep your torso balanced.", "Drive back up through your front heel."],
  isolation: ["Keep your attention on the target muscle through the whole range.", "Control the lowering phase and avoid using momentum.", "Use a full range of motion without slamming the joint into lockout."],
  carry: ["Keep your core braced and your shoulders back.", "Walk with steady steps and your eyes forward.", "Split the load evenly between both sides."],
  core: ["Keep your lower back flat against the floor or in a neutral position.", "Breathe steadily and avoid holding your breath.", "Work from your abs rather than pulling on your neck."],
  cardio: ["Begin with an easy warm-up and raise the intensity gradually.", "Keep your breathing rhythm regular.", "Watch your heart rate and stay at an effort you can hold comfortably."],
  mobility: ["Move slowly and stay within a comfortable, pain-free range.", "Breathe deeply and relax into each rep or hold.", "The goal is to prepare the joint and muscle, not to fatigue them."]
};
var MISTAKES_BY_PATTERN_EN = {
  push: ["Lifting your hips off the bench while pressing.", "Snapping the elbows straight at the top.", "Using more weight than you can control."],
  pull: ["Pulling with the arms only, without engaging the back.", "Swinging the body to cheat the weight up.", "Cutting the range of motion short."],
  squat: ["Letting your heels come off the floor.", "Letting the knees cave inward.", "Letting the lower back round at the bottom."],
  hinge: ["Rounding the back instead of pushing the hips back.", "Letting the bar drift away from your body.", "Keeping the knees rigidly locked instead of hinging at the hips."],
  lunge: ["Letting the front knee shoot far forward while the heel lifts.", "Leaning the torso forward.", "Taking too short a step, which crowds the front knee."],
  isolation: ["Swinging the weight instead of working the muscle.", "Going so heavy that the range of motion gets shorter.", "Dropping the weight fast with no control."],
  carry: ["Letting the shoulders slump forward.", "Holding your breath for the whole distance.", "Carrying an uneven load between the two hands."],
  core: ["Pulling on your neck instead of working your abs.", "Holding your breath.", "Using momentum instead of control."],
  cardio: ["Starting at high intensity with no warm-up.", "Hunching over the machine.", "Ignoring the signs of excessive fatigue."],
  mobility: ["Bouncing hard instead of holding the stretch.", "Pushing past the point of pain.", "Holding your breath while you stretch."]
};
var SAFETY_BY_PATTERN_EN = {
  push: ["Use a spotter, or set the safety pins, when you press heavy weight over your chest.", "Avoid dropping the weight quickly into the bottom position."],
  pull: ["Protect your lower back by keeping it in a neutral position.", "Start with a weight that lets you keep clean form."],
  squat: ["Set the safety bars in the rack before you load up.", "Avoid snapping your knees into lockout at the top."],
  hinge: ["A rounded lower back puts more strain on your spine, so keep it neutral.", "Start light and master the pattern before you add weight."],
  lunge: ["Mind your balance and hold a support when you need one.", "Stop if you feel pain in the knee."],
  isolation: ["Avoid excessive loads on a small joint.", "Stop the set if you feel sharp pain."],
  carry: ["Keep your walking path clear of obstacles.", "Set the weight down under control when you finish."],
  core: ["Stop if you feel pain in your lower back or neck.", "Avoid fast, bouncing movements."],
  cardio: ["Warm up before you start to lower your injury risk, and wind down gradually instead of stopping suddenly.", "Drink water, and stop if you feel dizzy or unusually short of breath."],
  mobility: ["Never force a joint into a painful range.", "Stop right away if you feel sharp pain or tingling."]
};
var MUSCLE_AR = {
  chest: "\u0627\u0644\u0635\u062F\u0631",
  back: "\u0627\u0644\u0638\u0647\u0631",
  shoulders: "\u0627\u0644\u0623\u0643\u062A\u0627\u0641",
  biceps: "\u0627\u0644\u0628\u0627\u064A\u0633\u0628\u0633",
  triceps: "\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633",
  legs: "\u0627\u0644\u0623\u0631\u062C\u0644",
  glutes: "\u0627\u0644\u062C\u0644\u0648\u062A\u0633",
  hamstrings: "\u0627\u0644\u0647\u0627\u0645\u0633\u062A\u0631\u0646\u062C",
  quads: "\u0627\u0644\u0643\u0648\u0627\u062F\u0632",
  calves: "\u0627\u0644\u0633\u0645\u0627\u0646\u0629",
  core: "\u0627\u0644\u0643\u0648\u0631",
  cardio: "\u0627\u0644\u0644\u064A\u0627\u0642\u0629"
};
function muscleName(m, lang = "ar") {
  return lang === "en" ? muscleLabels[m].en : MUSCLE_AR[m];
}
function getTechniqueTips(exercise, lang = "ar") {
  if (lang !== "en" && exercise.techniqueTipsAr?.length) return exercise.techniqueTipsAr;
  if (lang === "en") {
    if (exercise.techniqueTipsEn?.length) return exercise.techniqueTipsEn;
    if (getExercise(exercise.id)) return [];
  }
  const table = lang === "en" ? TECHNIQUE_BY_PATTERN_EN : TECHNIQUE_BY_PATTERN;
  const base = table[exercise.movementPattern] ?? table.isolation;
  const lead = lang === "en" ? `Focus on your ${muscleName(exercise.primaryMuscle, "en")} throughout the movement.` : `\u0631\u0643\u0651\u0632 \u0639\u0644\u0649 ${MUSCLE_AR[exercise.primaryMuscle]} \u0637\u0648\u0627\u0644 \u0627\u0644\u062D\u0631\u0643\u0629.`;
  return [lead, ...base.slice(0, 2)];
}
function getCommonMistakes(exercise, lang = "ar") {
  if (lang !== "en" && exercise.commonMistakesAr?.length) return exercise.commonMistakesAr;
  if (lang === "en") {
    if (exercise.commonMistakesEn?.length) return exercise.commonMistakesEn;
    if (getExercise(exercise.id)) return [];
  }
  const table = lang === "en" ? MISTAKES_BY_PATTERN_EN : MISTAKES_BY_PATTERN;
  return table[exercise.movementPattern] ?? table.isolation;
}
function getSafetyNotes(exercise, lang = "ar") {
  if (lang !== "en" && exercise.safetyNotesAr?.length) return exercise.safetyNotesAr;
  if (lang === "en") {
    if (exercise.safetyNotesEn?.length) return exercise.safetyNotesEn;
    if (getExercise(exercise.id)) return [];
  }
  const table = lang === "en" ? SAFETY_BY_PATTERN_EN : SAFETY_BY_PATTERN;
  const base = table[exercise.movementPattern] ?? table.isolation;
  const priorInjury = lang === "en" ? "If you have a previous injury, check with a qualified professional before training." : "\u0625\u0630\u0627 \u0643\u0627\u0646 \u0644\u062F\u064A\u0643 \u0625\u0635\u0627\u0628\u0629 \u0633\u0627\u0628\u0642\u0629\u060C \u0627\u0633\u062A\u0634\u0631 \u0645\u062E\u062A\u0635\u064B\u0627 \u0642\u0628\u0644 \u0627\u0644\u062A\u0645\u0631\u064A\u0646.";
  return [...base, priorInjury];
}

// src/data/exercises.ts
function video(nameEn) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(nameEn + " exercise form")}`;
}
var muscleDetailById = {
  // ===== الصدر =====
  "barbell-bench-press": { primary: ["chest_mid", "triceps", "front_delts"], secondary: ["chest_upper"] },
  "incline-barbell-press": { primary: ["chest_upper", "front_delts", "triceps"], secondary: ["chest_mid"] },
  "dumbbell-bench-press": { primary: ["chest_mid", "triceps", "front_delts"], secondary: ["chest_upper"] },
  "incline-dumbbell-press": { primary: ["chest_upper", "front_delts", "triceps"], secondary: ["chest_mid"] },
  "chest-press-machine": { primary: ["chest_mid", "triceps"], secondary: ["front_delts"] },
  "iso-lateral-chest-press": { primary: ["chest_mid", "triceps"], secondary: ["front_delts"] },
  "incline-chest-press-machine": { primary: ["chest_upper", "front_delts"], secondary: ["triceps"] },
  "iso-lateral-incline-press": { primary: ["chest_upper", "front_delts"], secondary: ["triceps"] },
  "assisted-dip-machine": { primary: ["chest_lower", "triceps"], secondary: ["front_delts"] },
  "pec-deck-machine": { primary: ["chest_mid"], secondary: ["front_delts"] },
  "cable-crossover": { primary: ["chest_mid", "chest_lower"], secondary: ["front_delts"] },
  "dumbbell-fly": { primary: ["chest_mid"], secondary: ["front_delts"] },
  "push-up": { primary: ["chest_mid", "triceps"], secondary: ["front_delts", "abs"] },
  "incline-push-up": { primary: ["chest_mid"], secondary: ["triceps", "front_delts"] },
  // ===== الظهر =====
  deadlift: { primary: ["lower_back", "glutes", "hamstrings"], secondary: ["traps", "lats", "upper_back", "quads", "forearms"] },
  "barbell-row": { primary: ["lats", "upper_back"], secondary: ["biceps", "rear_delts", "lower_back", "forearms"] },
  "dumbbell-row": { primary: ["lats", "upper_back"], secondary: ["biceps", "rear_delts"] },
  "lat-pulldown-machine": { primary: ["lats"], secondary: ["biceps", "upper_back"] },
  "single-arm-lat-pulldown": { primary: ["lats"], secondary: ["biceps"] },
  "iso-lateral-pulldown": { primary: ["lats"], secondary: ["biceps", "upper_back"] },
  "iso-lateral-high-row": { primary: ["lats", "upper_back"], secondary: ["biceps", "rear_delts"] },
  "wide-grip-lat-pulldown": { primary: ["lats"], secondary: ["biceps", "upper_back"] },
  "wide-grip-iso-lateral-pulldown": { primary: ["lats"], secondary: ["biceps"] },
  "seated-cable-row": { primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"] },
  "seated-row-machine": { primary: ["upper_back", "lats"], secondary: ["biceps"] },
  "chest-supported-row-machine": { primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"] },
  "t-bar-row-machine": { primary: ["upper_back", "lats"], secondary: ["biceps", "rear_delts"] },
  "rear-delt-row-machine": { primary: ["rear_delts", "upper_back"], secondary: ["biceps"] },
  "pull-up": { primary: ["lats"], secondary: ["biceps", "upper_back", "forearms"] },
  "chin-up": { primary: ["lats", "biceps"], secondary: ["upper_back"] },
  "straight-arm-pulldown": { primary: ["lats"], secondary: ["triceps"] },
  "dumbbell-shrug": { primary: ["traps"], secondary: ["forearms"] },
  // ===== الأكتاف =====
  "overhead-press": { primary: ["front_delts", "side_delts", "triceps"], secondary: ["traps", "upper_back"] },
  "dumbbell-shoulder-press": { primary: ["front_delts", "side_delts", "triceps"], secondary: ["traps"] },
  "shoulder-press-machine": { primary: ["front_delts", "side_delts"], secondary: ["triceps"] },
  "cable-shoulder-press": { primary: ["front_delts", "side_delts"], secondary: ["triceps"] },
  "lateral-raise-machine": { primary: ["side_delts"], secondary: ["traps"] },
  "lateral-raise": { primary: ["side_delts"], secondary: ["traps"] },
  "cable-lateral-raise": { primary: ["side_delts"], secondary: ["traps"] },
  "rear-delt-fly": { primary: ["rear_delts"], secondary: ["upper_back"] },
  "reverse-pec-deck": { primary: ["rear_delts"], secondary: ["upper_back"] },
  "front-raise": { primary: ["front_delts"], secondary: ["side_delts"] },
  "face-pull": { primary: ["rear_delts"], secondary: ["traps", "upper_back"] },
  // ===== البايسبس =====
  "barbell-curl": { primary: ["biceps"], secondary: ["forearms"] },
  "dumbbell-curl": { primary: ["biceps"], secondary: ["forearms"] },
  "hammer-curl": { primary: ["biceps", "forearms"] },
  "preacher-curl-machine": { primary: ["biceps"], secondary: ["forearms"] },
  "cable-biceps-curl": { primary: ["biceps"], secondary: ["forearms"] },
  "concentration-curl": { primary: ["biceps"] },
  // ===== الترايسبس =====
  "cable-triceps-pushdown": { primary: ["triceps"] },
  "triceps-extension-machine": { primary: ["triceps"] },
  "rope-pushdown": { primary: ["triceps"] },
  "overhead-triceps-extension": { primary: ["triceps"] },
  "skull-crusher": { primary: ["triceps"] },
  "close-grip-bench-press": { primary: ["triceps", "chest_mid"], secondary: ["front_delts"] },
  "bench-dip": { primary: ["triceps"], secondary: ["chest_lower", "front_delts"] },
  // ===== الأرجل / الكوادز =====
  "barbell-back-squat": { primary: ["quads", "glutes"], secondary: ["hamstrings", "lower_back", "abs"] },
  "front-squat": { primary: ["quads"], secondary: ["glutes", "abs", "lower_back"] },
  "leg-press-machine": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "hack-squat-machine": { primary: ["quads"], secondary: ["glutes"] },
  "leg-extension-machine": { primary: ["quads"] },
  "dumbbell-sumo-squat": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "goblet-squat": { primary: ["quads", "glutes"], secondary: ["abs"] },
  "bulgarian-split-squat": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "walking-lunge": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "smith-machine-squat": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "bodyweight-squat": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  "sissy-squat": { primary: ["quads"], secondary: [] },
  "step-up": { primary: ["quads", "glutes"], secondary: ["hamstrings"] },
  // ===== الهامسترنج =====
  "romanian-deadlift": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"] },
  "dumbbell-rdl": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"] },
  "lying-leg-curl": { primary: ["hamstrings"], secondary: ["calves"] },
  "seated-leg-curl": { primary: ["hamstrings"], secondary: ["calves"] },
  "standing-leg-curl": { primary: ["hamstrings"], secondary: ["calves"] },
  "good-morning": { primary: ["hamstrings", "lower_back"], secondary: ["glutes"] },
  // ===== الجلوتس =====
  "hip-thrust": { primary: ["glutes"], secondary: ["hamstrings"] },
  "glute-bridge": { primary: ["glutes"], secondary: ["hamstrings"] },
  "cable-kickback": { primary: ["glutes"], secondary: ["hamstrings"] },
  "sumo-deadlift": { primary: ["glutes", "quads"], secondary: ["hamstrings", "lower_back", "traps"] },
  "cable-pull-through": { primary: ["glutes", "hamstrings"], secondary: ["lower_back"] },
  "kettlebell-swing": { primary: ["glutes", "hamstrings"], secondary: ["lower_back", "quads", "abs"] },
  // ===== السمانة =====
  "standing-calf-raise-machine": { primary: ["calves"] },
  "seated-calf-raise-machine": { primary: ["calves"] },
  "bodyweight-calf-raise": { primary: ["calves"] },
  // ===== الكور =====
  plank: { primary: ["abs"], secondary: ["obliques", "lower_back"] },
  "side-plank": { primary: ["obliques"], secondary: ["abs"] },
  "hanging-leg-raise": { primary: ["abs"], secondary: ["obliques"] },
  crunch: { primary: ["abs"] },
  "russian-twist": { primary: ["obliques"], secondary: ["abs"] },
  "ab-wheel-rollout": { primary: ["abs"], secondary: ["obliques", "lower_back"] },
  "mountain-climber": { primary: ["abs"], secondary: ["obliques"] },
  // ===== أجهزة مُضافة (P12 — كتالوج الأجهزة المعتمد) =====
  "decline-chest-press-machine": { primary: ["chest_lower", "triceps"], secondary: ["front_delts"] },
  "machine-rdl": { primary: ["hamstrings", "glutes"], secondary: ["lower_back"] },
  "glute-machine": { primary: ["glutes"], secondary: ["hamstrings"] },
  "glute-kickback-machine": { primary: ["glutes"], secondary: ["hamstrings"] },
  "standing-hip-extension-machine": { primary: ["glutes"], secondary: ["hamstrings"] },
  "hip-adductor-machine": { primary: ["glutes"] },
  "cable-hip-adduction": { primary: ["glutes"] },
  "ab-crunch-machine": { primary: ["abs"], secondary: ["obliques"] },
  // ===== كارديو (بلا عضلة هدف تفصيلية) =====
  "treadmill-run": { primary: [] },
  "stationary-bike": { primary: [] },
  "rowing-machine": { primary: [] },
  elliptical: { primary: [] },
  "jump-rope": { primary: [] }
};
var coarseToDetailed = {
  chest: ["chest_mid"],
  back: ["lats", "upper_back"],
  shoulders: ["side_delts", "front_delts"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  legs: ["quads", "glutes"],
  glutes: ["glutes"],
  hamstrings: ["hamstrings"],
  quads: ["quads"],
  calves: ["calves"],
  core: ["abs"],
  cardio: []
};
function ex(p) {
  const detail = muscleDetailById[p.id];
  const primaryDetailed = detail?.primary ?? coarseToDetailed[p.primaryMuscle] ?? [];
  const secondaryDetailed = detail?.secondary ?? [];
  const hasCustomVideo = Boolean(p.videoUrl);
  const base = {
    id: p.id,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    primaryMuscle: p.primaryMuscle,
    secondaryMuscles: p.secondaryMuscles ?? [],
    primaryMusclesDetailed: primaryDetailed,
    secondaryMusclesDetailed: secondaryDetailed,
    equipment: p.equipment,
    level: p.level,
    movementPattern: p.movementPattern,
    environment: p.environment,
    defaultSets: p.defaultSets ?? 3,
    defaultReps: p.defaultReps ?? "8\u201312",
    defaultRestSec: p.defaultRestSec ?? 90,
    videoUrl: p.videoUrl ?? video(p.nameEn),
    videoSource: hasCustomVideo ? "trusted_video" : "youtube_search",
    alternatives: p.alternatives ?? [],
    notesAr: p.notesAr ?? "",
    notesEn: p.notesEn ?? "",
    howToEn: p.howToEn,
    techniqueTipsEn: p.techniqueTipsEn,
    commonMistakesEn: p.commonMistakesEn,
    safetyNotesEn: p.safetyNotesEn,
    techniqueTipsAr: p.techniqueTipsAr ?? [],
    commonMistakesAr: p.commonMistakesAr ?? [],
    safetyNotesAr: p.safetyNotesAr ?? []
  };
  return {
    ...base,
    techniqueTipsAr: getTechniqueTips(base),
    commonMistakesAr: getCommonMistakes(base),
    safetyNotesAr: getSafetyNotes(base)
  };
}
var exercises = [
  // ===== الصدر =====
  ex({ id: "barbell-bench-press", nameAr: "\u0628\u0646\u0634 \u0628\u0631\u064A\u0633 \u0628\u0627\u0631", nameEn: "Barbell Bench Press", primaryMuscle: "chest", equipment: ["barbell", "bench"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "6\u201310", defaultRestSec: 120 }),
  ex({ id: "incline-barbell-press", nameAr: "\u0628\u0646\u0634 \u0645\u0627\u0626\u0644 \u0628\u0627\u0631", nameEn: "Incline Barbell Press", primaryMuscle: "chest", equipment: ["barbell", "bench"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 120 }),
  ex({ id: "dumbbell-bench-press", nameAr: "\u0628\u0646\u0634 \u0628\u0631\u064A\u0633 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Bench Press", primaryMuscle: "chest", equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "push", environment: "gym" }),
  ex({ id: "incline-dumbbell-press", nameAr: "\u0628\u0646\u0634 \u0645\u0627\u0626\u0644 \u062F\u0645\u0628\u0644", nameEn: "Incline Dumbbell Press", primaryMuscle: "chest", equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "push", environment: "gym" }),
  ex({ id: "chest-press-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0627\u0644\u0635\u062F\u0631", nameEn: "Chest Press Machine", primaryMuscle: "chest", equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", alternatives: ["dumbbell-bench-press", "cable-crossover"] }),
  ex({ id: "iso-lateral-chest-press", nameAr: "\u0636\u063A\u0637 \u0635\u062F\u0631 \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", nameEn: "Iso-Lateral Chest Press", primaryMuscle: "chest", equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", alternatives: ["dumbbell-bench-press", "cable-crossover"] }),
  ex({ id: "incline-chest-press-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0635\u062F\u0631 \u0639\u0644\u0648\u064A", nameEn: "Incline Chest Press Machine", primaryMuscle: "chest", equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", alternatives: ["incline-dumbbell-press", "incline-cable-fly"] }),
  ex({ id: "iso-lateral-incline-press", nameAr: "\u0636\u063A\u0637 \u0639\u0644\u0648\u064A \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", nameEn: "Iso-Lateral Incline Press", primaryMuscle: "chest", equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", alternatives: ["incline-dumbbell-press", "incline-cable-fly"] }),
  ex({ id: "pec-deck-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0641\u0644\u0627\u064A \u0635\u062F\u0631", nameEn: "Pec Deck Machine", primaryMuscle: "chest", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "cable-crossover", nameAr: "\u062A\u0641\u062A\u064A\u062D \u0643\u064A\u0628\u0644", nameEn: "Cable Crossover", primaryMuscle: "chest", equipment: ["cable"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "dumbbell-fly", nameAr: "\u062A\u0641\u062A\u064A\u062D \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Fly", primaryMuscle: "chest", equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "push-up", nameAr: "\u0636\u063A\u0637 (\u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u062C\u0633\u0645)", nameEn: "Push-Up", primaryMuscle: "chest", equipment: ["bodyweight"], level: "beginner", movementPattern: "push", environment: "both", defaultReps: "10\u201320", defaultRestSec: 60 }),
  ex({ id: "incline-push-up", nameAr: "\u0636\u063A\u0637 \u0645\u0627\u0626\u0644", nameEn: "Incline Push-Up", primaryMuscle: "chest", equipment: ["bodyweight"], level: "beginner", movementPattern: "push", environment: "home", defaultReps: "12\u201320", defaultRestSec: 45 }),
  // ===== الظهر =====
  ex({ id: "deadlift", nameAr: "\u0631\u0641\u0639\u0629 \u0645\u064A\u062A\u0629", nameEn: "Deadlift", primaryMuscle: "back", equipment: ["barbell"], level: "advanced", movementPattern: "hinge", environment: "gym", defaultReps: "4\u20136", defaultRestSec: 150 }),
  ex({ id: "barbell-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0628\u0627\u0631", nameEn: "Barbell Row", primaryMuscle: "back", equipment: ["barbell"], level: "intermediate", movementPattern: "pull", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 120 }),
  ex({ id: "dumbbell-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Row", primaryMuscle: "back", equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "pull", environment: "gym" }),
  ex({ id: "lat-pulldown-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0633\u062D\u0628 \u0639\u0644\u0648\u064A", nameEn: "Lat Pulldown Machine (Seated/Lever)", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["dumbbell-row", "close-grip-pulldown"] }),
  ex({ id: "single-arm-lat-pulldown", nameAr: "\u0633\u062D\u0628 \u0639\u0644\u0648\u064A \u0628\u0630\u0631\u0627\u0639 \u0648\u0627\u062D\u062F\u0629", nameEn: "Single-Arm Lat Pulldown", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["dumbbell-row", "single-arm-cable-row"] }),
  ex({ id: "iso-lateral-pulldown", nameAr: "\u0633\u062D\u0628 \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", nameEn: "Iso-Lateral Pulldown", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["dumbbell-row", "close-grip-pulldown"] }),
  ex({ id: "iso-lateral-high-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0639\u0627\u0644\u064A \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", nameEn: "Iso-Lateral High Row", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["dumbbell-row", "seated-cable-row"] }),
  ex({ id: "wide-grip-iso-lateral-pulldown", nameAr: "\u0633\u062D\u0628 \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644 \u0648\u0627\u0633\u0639", nameEn: "Wide-Grip Iso-Lateral Pulldown", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["dumbbell-row", "straight-arm-pulldown"] }),
  ex({ id: "seated-cable-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0643\u064A\u0628\u0644 \u062C\u0627\u0644\u0633", nameEn: "Seated Cable Row", primaryMuscle: "back", equipment: ["cable"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312" }),
  ex({ id: "seated-row-machine", nameAr: "\u062C\u0647\u0627\u0632 \u062A\u062C\u062F\u064A\u0641 \u062C\u0627\u0644\u0633", nameEn: "Seated Row Machine", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["dumbbell-row", "seated-cable-row"] }),
  ex({ id: "chest-supported-row-machine", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0628\u0645\u0633\u0646\u062F \u0635\u062F\u0631", nameEn: "Chest-Supported Row Machine", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", alternatives: ["chest-supported-row", "seated-cable-row"] }),
  ex({ id: "t-bar-row-machine", nameAr: "\u062C\u0647\u0627\u0632 \u062A\u062C\u062F\u064A\u0641 \u062A\u064A-\u0628\u0627\u0631", nameEn: "T-Bar Row Machine", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "8\u201312", alternatives: ["dumbbell-row", "seated-cable-row"] }),
  ex({ id: "rear-delt-row-machine", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0643\u062A\u0641 \u062E\u0644\u0641\u064A", nameEn: "Rear Delt Row Machine", primaryMuscle: "back", equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["rear-delt-fly", "face-pull"] }),
  ex({ id: "pull-up", nameAr: "\u0639\u0642\u0644\u0629", nameEn: "Pull-Up", primaryMuscle: "back", equipment: ["bodyweight"], level: "advanced", movementPattern: "pull", environment: "both", defaultReps: "6\u201310", defaultRestSec: 120 }),
  ex({ id: "chin-up", nameAr: "\u0639\u0642\u0644\u0629 \u0642\u0628\u0636\u0629 \u0639\u0643\u0633\u064A\u0629", nameEn: "Chin-Up", primaryMuscle: "back", equipment: ["bodyweight"], level: "intermediate", movementPattern: "pull", environment: "both", defaultReps: "6\u201310", defaultRestSec: 120 }),
  ex({ id: "straight-arm-pulldown", nameAr: "\u0633\u062D\u0628 \u0628\u0630\u0631\u0627\u0639 \u0645\u0645\u062F\u0648\u062F\u0629 \u0643\u064A\u0628\u0644", nameEn: "Straight-Arm Pulldown", primaryMuscle: "back", equipment: ["cable"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "dumbbell-shrug", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u0627\u0644\u062A\u0631\u0627\u0628\u064A\u0633 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Shrug", primaryMuscle: "back", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  // ===== الأكتاف =====
  ex({ id: "overhead-press", nameAr: "\u0636\u063A\u0637 \u0643\u062A\u0641 \u0628\u0627\u0631 \u0648\u0627\u0642\u0641", nameEn: "Overhead Press", primaryMuscle: "shoulders", equipment: ["barbell"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "6\u201310", defaultRestSec: 120 }),
  ex({ id: "dumbbell-shoulder-press", nameAr: "\u0636\u063A\u0637 \u0643\u062A\u0641 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Shoulder Press", primaryMuscle: "shoulders", equipment: ["dumbbell"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "8\u201312" }),
  ex({ id: "shoulder-press-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0643\u062A\u0641", nameEn: "Shoulder Press Machine", primaryMuscle: "shoulders", equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "10\u201312", alternatives: ["seated-dumbbell-press", "cable-shoulder-press"] }),
  // بديل الكيبل لجهاز ضغط الكتف (مراجعة زياد): ضغط رأسي مركّب من بكرات منخفضة — لا رفرفة عزل.
  ex({ id: "cable-shoulder-press", nameAr: "\u0636\u063A\u0637 \u0643\u062A\u0641 \u0643\u064A\u0628\u0644", nameEn: "Cable Shoulder Press", primaryMuscle: "shoulders", equipment: ["cable"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 90, notesAr: "\u0645\u0646 \u0628\u0643\u0631\u0627\u062A \u0645\u0646\u062E\u0641\u0636\u0629\u060C \u062C\u0627\u0644\u0633\u064B\u0627 \u0623\u0648 \u0648\u0627\u0642\u0641\u064B\u0627 \u2014 \u0627\u062F\u0641\u0639 \u0644\u0644\u0623\u0639\u0644\u0649 \u0628\u0645\u0633\u0627\u0631 \u062B\u0627\u0628\u062A.", alternatives: ["seated-dumbbell-press", "shoulder-press-machine"] }),
  ex({ id: "lateral-raise", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u062C\u0627\u0646\u0628\u064A \u062F\u0645\u0628\u0644", nameEn: "Lateral Raise", primaryMuscle: "shoulders", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "cable-lateral-raise", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u062C\u0627\u0646\u0628\u064A \u0643\u064A\u0628\u0644", nameEn: "Cable Lateral Raise", primaryMuscle: "shoulders", equipment: ["cable"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "rear-delt-fly", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u062E\u0644\u0641\u064A \u062F\u0645\u0628\u0644", nameEn: "Rear Delt Fly", primaryMuscle: "shoulders", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "reverse-pec-deck", nameAr: "\u0628\u064A\u0643 \u062F\u0643 \u0639\u0643\u0633\u064A", nameEn: "Reverse Pec Deck", primaryMuscle: "shoulders", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45, alternatives: ["rear-delt-fly", "face-pull"] }),
  ex({ id: "front-raise", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u0623\u0645\u0627\u0645\u064A \u062F\u0645\u0628\u0644", nameEn: "Front Raise", primaryMuscle: "shoulders", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "face-pull", nameAr: "\u0633\u062D\u0628 \u0644\u0644\u0648\u062C\u0647 \u0643\u064A\u0628\u0644", nameEn: "Face Pull", primaryMuscle: "shoulders", equipment: ["cable"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "15\u201320", defaultRestSec: 45 }),
  // ===== البايسبس =====
  ex({ id: "barbell-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0628\u0627\u0631", nameEn: "Barbell Curl", primaryMuscle: "biceps", equipment: ["barbell"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 60 }),
  ex({ id: "dumbbell-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Curl", primaryMuscle: "biceps", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "hammer-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0645\u0637\u0631\u0642\u0629", nameEn: "Hammer Curl", primaryMuscle: "biceps", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "preacher-curl-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u0631\u062C\u062D\u0629 \u0628\u0627\u064A\u0633\u0628\u0633", nameEn: "Preacher Curl Machine", primaryMuscle: "biceps", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 60, alternatives: ["concentration-curl", "cable-biceps-curl"] }),
  ex({ id: "cable-biceps-curl", nameAr: "\u0645\u0631\u062C\u062D\u0629 \u0628\u0627\u064A\u0633\u0628\u0633 \u0643\u064A\u0628\u0644", nameEn: "Cable Biceps Curl", primaryMuscle: "biceps", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["dumbbell-curl", "cable-hammer-curl"] }),
  ex({ id: "concentration-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0645\u0631\u0643\u0651\u0632", nameEn: "Concentration Curl", primaryMuscle: "biceps", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "10\u201312", defaultRestSec: 45 }),
  // ===== الترايسبس =====
  ex({ id: "cable-triceps-pushdown", nameAr: "\u062F\u0641\u0639 \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u0643\u064A\u0628\u0644", nameEn: "Cable Triceps Pushdown", primaryMuscle: "triceps", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["dumbbell-kickback", "rope-pushdown"] }),
  ex({ id: "triceps-extension-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u062F \u062A\u0631\u0627\u064A\u0633\u0628\u0633", nameEn: "Triceps Extension Machine", primaryMuscle: "triceps", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["overhead-triceps-extension", "cable-overhead-extension"] }),
  ex({ id: "rope-pushdown", nameAr: "\u062F\u0641\u0639 \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u062D\u0628\u0644", nameEn: "Rope Pushdown", primaryMuscle: "triceps", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "overhead-triceps-extension", nameAr: "\u062A\u0645\u062F\u064A\u062F \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u0639\u0644\u0648\u064A \u062F\u0645\u0628\u0644", nameEn: "Overhead Triceps Extension", primaryMuscle: "triceps", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "skull-crusher", nameAr: "\u0633\u0643\u0627\u0644 \u0643\u0631\u0627\u0634\u0631", nameEn: "Skull Crusher", primaryMuscle: "triceps", equipment: ["ez-bar", "bench"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 60 }),
  ex({ id: "close-grip-bench-press", nameAr: "\u0628\u0646\u0634 \u0642\u0628\u0636\u0629 \u0636\u064A\u0642\u0629", nameEn: "Close-Grip Bench Press", primaryMuscle: "triceps", equipment: ["barbell", "bench"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 90 }),
  ex({ id: "bench-dip", nameAr: "\u063A\u0637\u0633 \u0639\u0644\u0649 \u0627\u0644\u0645\u0642\u0639\u062F", nameEn: "Bench Dip", primaryMuscle: "triceps", equipment: ["bodyweight", "bench"], level: "beginner", movementPattern: "push", environment: "home", defaultReps: "10\u201315", defaultRestSec: 45 }),
  // ===== الأرجل / الكوادز =====
  ex({ id: "barbell-back-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u062E\u0644\u0641\u064A \u0628\u0627\u0631", nameEn: "Barbell Back Squat", primaryMuscle: "quads", equipment: ["barbell"], level: "advanced", movementPattern: "squat", environment: "gym", defaultReps: "5\u20138", defaultRestSec: 150 }),
  ex({ id: "front-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u0623\u0645\u0627\u0645\u064A", nameEn: "Front Squat", primaryMuscle: "quads", equipment: ["barbell"], level: "advanced", movementPattern: "squat", environment: "gym", defaultReps: "6\u20138", defaultRestSec: 120 }),
  ex({ id: "leg-press-machine", nameAr: "\u062C\u0647\u0627\u0632 \u062F\u0641\u0639 \u0627\u0644\u0623\u0631\u062C\u0644", nameEn: "Leg Press Machine", primaryMuscle: "quads", equipment: ["machine"], level: "beginner", movementPattern: "squat", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 120, alternatives: ["sissy-squat", "bodyweight-squat"] }),
  // بديل عزل الكوادز لجهاز مد الأرجل (مراجعة زياد): عزل ركبة بوزن الجسم — أدق ميكانيكيًا من الجوبليت المركّب.
  ex({ id: "sissy-squat", nameAr: "\u0633\u064A\u0633\u064A \u0633\u0643\u0648\u0627\u062A", nameEn: "Sissy Squat", primaryMuscle: "quads", equipment: ["bodyweight"], level: "intermediate", movementPattern: "isolation", environment: "both", defaultReps: "8\u201312", defaultRestSec: 60, notesAr: "\u0628\u0648\u0632\u0646 \u0627\u0644\u062C\u0633\u0645 \u0645\u0639 \u0645\u0633\u0643 \u062F\u0639\u0627\u0645\u0629 \u0644\u0644\u062A\u0648\u0627\u0632\u0646 \u2014 \u0627\u0646\u0632\u0644 \u0628\u0645\u064A\u0644 \u0627\u0644\u0631\u0643\u0628\u062A\u064A\u0646 \u0644\u0644\u0623\u0645\u0627\u0645 \u0648\u062D\u0627\u0641\u0638 \u0639\u0644\u0649 \u0627\u0633\u062A\u0642\u0627\u0645\u0629 \u0627\u0644\u0648\u0631\u0643.", alternatives: ["leg-extension-machine", "bodyweight-squat"] }),
  ex({ id: "hack-squat-machine", nameAr: "\u0647\u0627\u0643 \u0633\u0643\u0648\u0627\u062A \u062C\u0647\u0627\u0632", nameEn: "Hack Squat Machine", primaryMuscle: "quads", equipment: ["machine"], level: "beginner", movementPattern: "squat", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 120, alternatives: ["goblet-squat", "bodyweight-squat"] }),
  ex({ id: "leg-extension-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u062F \u0627\u0644\u0623\u0631\u062C\u0644", nameEn: "Leg Extension Machine", primaryMuscle: "quads", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["goblet-squat", "bodyweight-squat"] }),
  ex({ id: "goblet-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u062C\u0648\u0628\u0644\u064A\u062A \u062F\u0645\u0628\u0644", nameEn: "Goblet Squat", primaryMuscle: "quads", equipment: ["dumbbell"], level: "beginner", movementPattern: "squat", environment: "both", defaultReps: "10\u201312", defaultRestSec: 90 }),
  ex({ id: "bulgarian-split-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u0628\u0644\u063A\u0627\u0631\u064A", nameEn: "Bulgarian Split Squat", primaryMuscle: "quads", equipment: ["dumbbell"], level: "intermediate", movementPattern: "lunge", environment: "both", defaultReps: "8\u201312", defaultRestSec: 75 }),
  ex({ id: "walking-lunge", nameAr: "\u0637\u0639\u0646\u0627\u062A \u0645\u0634\u064A", nameEn: "Walking Lunge", primaryMuscle: "quads", equipment: ["dumbbell"], level: "beginner", movementPattern: "lunge", environment: "both", defaultReps: "10\u201312", defaultRestSec: 75 }),
  ex({ id: "smith-machine-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u0633\u0645\u064A\u062B", nameEn: "Smith Machine Squat", primaryMuscle: "quads", equipment: ["smith"], level: "beginner", movementPattern: "squat", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 120 }),
  ex({ id: "bodyweight-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u0648\u0632\u0646 \u0627\u0644\u062C\u0633\u0645", nameEn: "Bodyweight Squat", primaryMuscle: "quads", equipment: ["bodyweight"], level: "beginner", movementPattern: "squat", environment: "home", defaultReps: "15\u201325", defaultRestSec: 45 }),
  ex({ id: "step-up", nameAr: "\u0635\u0639\u0648\u062F \u0639\u0644\u0649 \u0645\u0646\u0635\u0629", nameEn: "Step-Up", primaryMuscle: "quads", equipment: ["dumbbell", "bodyweight"], level: "beginner", movementPattern: "lunge", environment: "home", defaultReps: "10\u201312", defaultRestSec: 60 }),
  // ===== الهامسترنج =====
  ex({ id: "romanian-deadlift", nameAr: "\u0631\u0641\u0639\u0629 \u0631\u0648\u0645\u0627\u0646\u064A\u0629 \u0628\u0627\u0631", nameEn: "Romanian Deadlift", primaryMuscle: "hamstrings", equipment: ["barbell"], level: "intermediate", movementPattern: "hinge", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 120 }),
  ex({ id: "dumbbell-rdl", nameAr: "\u0631\u0641\u0639\u0629 \u0631\u0648\u0645\u0627\u0646\u064A\u0629 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell RDL", primaryMuscle: "hamstrings", equipment: ["dumbbell"], level: "beginner", movementPattern: "hinge", environment: "both", defaultReps: "10\u201312", defaultRestSec: 90 }),
  ex({ id: "lying-leg-curl", nameAr: "\u062B\u0646\u064A \u0623\u0631\u062C\u0644 \u0645\u0633\u062A\u0644\u0642\u064A", nameEn: "Lying Leg Curl", primaryMuscle: "hamstrings", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["dumbbell-rdl", "cable-pull-through"] }),
  ex({ id: "seated-leg-curl", nameAr: "\u062B\u0646\u064A \u0623\u0631\u062C\u0644 \u062C\u0627\u0644\u0633", nameEn: "Seated Leg Curl", primaryMuscle: "hamstrings", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["dumbbell-rdl", "cable-pull-through"] }),
  ex({ id: "standing-leg-curl", nameAr: "\u062B\u0646\u064A \u0623\u0631\u062C\u0644 \u0648\u0627\u0642\u0641", nameEn: "Standing Leg Curl", primaryMuscle: "hamstrings", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["dumbbell-rdl", "cable-pull-through"] }),
  ex({ id: "good-morning", nameAr: "\u063A\u0648\u062F \u0645\u0648\u0631\u0646\u0646\u0642 \u0628\u0627\u0631", nameEn: "Good Morning", primaryMuscle: "hamstrings", equipment: ["barbell"], level: "advanced", movementPattern: "hinge", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 90 }),
  // ===== الجلوتس =====
  ex({ id: "hip-thrust", nameAr: "\u062F\u0641\u0639 \u0627\u0644\u0648\u0631\u0643 \u0628\u0627\u0631", nameEn: "Hip Thrust", primaryMuscle: "glutes", equipment: ["barbell", "bench"], level: "intermediate", movementPattern: "hinge", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 90 }),
  ex({ id: "glute-bridge", nameAr: "\u062C\u0633\u0631 \u0627\u0644\u062C\u0644\u0648\u062A", nameEn: "Glute Bridge", primaryMuscle: "glutes", equipment: ["bodyweight"], level: "beginner", movementPattern: "hinge", environment: "home", defaultReps: "12\u201320", defaultRestSec: 45 }),
  ex({ id: "cable-kickback", nameAr: "\u0631\u0641\u0633\u0629 \u0643\u064A\u0628\u0644 \u0644\u0644\u062C\u0644\u0648\u062A", nameEn: "Cable Kickback", primaryMuscle: "glutes", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "sumo-deadlift", nameAr: "\u0631\u0641\u0639\u0629 \u0645\u064A\u062A\u0629 \u0633\u0648\u0645\u0648", nameEn: "Sumo Deadlift", primaryMuscle: "glutes", equipment: ["barbell"], level: "advanced", movementPattern: "hinge", environment: "gym", defaultReps: "5\u20138", defaultRestSec: 150 }),
  ex({ id: "cable-pull-through", nameAr: "\u0633\u062D\u0628 \u0628\u064A\u0646 \u0627\u0644\u0623\u0631\u062C\u0644 \u0643\u064A\u0628\u0644", nameEn: "Cable Pull-Through", primaryMuscle: "glutes", equipment: ["cable"], level: "beginner", movementPattern: "hinge", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  // ===== السمانة =====
  ex({ id: "standing-calf-raise-machine", nameAr: "\u0631\u0641\u0639 \u0628\u0637\u0627\u062A \u0648\u0627\u0642\u0641", nameEn: "Standing Calf Raise Machine", primaryMuscle: "calves", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201320", defaultRestSec: 45, alternatives: ["single-leg-calf-raise", "bodyweight-calf-raise"] }),
  ex({ id: "seated-calf-raise-machine", nameAr: "\u0631\u0641\u0639 \u0628\u0637\u0627\u062A \u062C\u0627\u0644\u0633", nameEn: "Seated Calf Raise Machine", primaryMuscle: "calves", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201320", defaultRestSec: 45, alternatives: ["single-leg-calf-raise", "bodyweight-calf-raise"] }),
  ex({ id: "bodyweight-calf-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0633\u0645\u0627\u0646\u0629 \u0648\u0632\u0646 \u0627\u0644\u062C\u0633\u0645", nameEn: "Bodyweight Calf Raise", primaryMuscle: "calves", equipment: ["bodyweight"], level: "beginner", movementPattern: "isolation", environment: "home", defaultReps: "15\u201325", defaultRestSec: 30 }),
  // ===== الكور =====
  ex({ id: "plank", nameAr: "\u0628\u0644\u0627\u0646\u0643", nameEn: "Plank", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "30\u201360 \u062B", defaultRestSec: 45 }),
  ex({ id: "side-plank", nameAr: "\u0628\u0644\u0627\u0646\u0643 \u062C\u0627\u0646\u0628\u064A", nameEn: "Side Plank", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "20\u201340 \u062B", defaultRestSec: 30 }),
  ex({ id: "hanging-leg-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0623\u0631\u062C\u0644 \u0645\u0639\u0644\u0642", nameEn: "Hanging Leg Raise", primaryMuscle: "core", equipment: ["bodyweight"], level: "intermediate", movementPattern: "core", environment: "gym", defaultReps: "10\u201315", defaultRestSec: 60 }),
  ex({ id: "crunch", nameAr: "\u0643\u0631\u0646\u0634", nameEn: "Crunch", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "15\u201325", defaultRestSec: 30 }),
  ex({ id: "russian-twist", nameAr: "\u062A\u0648\u064A\u0633\u062A \u0631\u0648\u0633\u064A", nameEn: "Russian Twist", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "20\u201330", defaultRestSec: 30 }),
  ex({ id: "ab-wheel-rollout", nameAr: "\u0639\u062C\u0644\u0629 \u0627\u0644\u0628\u0637\u0646", nameEn: "Ab Wheel Rollout", primaryMuscle: "core", equipment: ["bodyweight"], level: "advanced", movementPattern: "core", environment: "both", defaultReps: "8\u201312", defaultRestSec: 60 }),
  ex({ id: "mountain-climber", nameAr: "\u062A\u0633\u0644\u0642 \u0627\u0644\u062C\u0628\u0644", nameEn: "Mountain Climber", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "30\u201345 \u062B", defaultRestSec: 30 }),
  // ===== كارديو =====
  ex({ id: "treadmill-run", nameAr: "\u062C\u0631\u064A \u0639\u0644\u0649 \u0627\u0644\u0633\u064A\u0631", nameEn: "Treadmill Run", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "20\u201330 \u062F", defaultRestSec: 0 }),
  ex({ id: "stationary-bike", nameAr: "\u062F\u0631\u0627\u062C\u0629 \u062B\u0627\u0628\u062A\u0629", nameEn: "Stationary Bike", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "20\u201330 \u062F", defaultRestSec: 0 }),
  ex({ id: "rowing-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0627\u0644\u062A\u062C\u062F\u064A\u0641", nameEn: "Rowing Machine", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "10\u201320 \u062F", defaultRestSec: 0 }),
  ex({ id: "elliptical", nameAr: "\u0627\u0644\u0625\u0644\u064A\u0628\u062A\u064A\u0643\u0627\u0644", nameEn: "Elliptical", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "20\u201330 \u062F", defaultRestSec: 0 }),
  ex({ id: "jump-rope", nameAr: "\u0646\u0637 \u0627\u0644\u062D\u0628\u0644", nameEn: "Jump Rope", primaryMuscle: "cardio", equipment: ["bodyweight"], level: "beginner", movementPattern: "cardio", environment: "home", defaultSets: 1, defaultReps: "10\u201315 \u062F", defaultRestSec: 0 }),
  ex({ id: "kettlebell-swing", nameAr: "\u0623\u0631\u062C\u062D\u0629 \u0627\u0644\u0643\u064A\u062A\u0644 \u0628\u0644", nameEn: "Kettlebell Swing", primaryMuscle: "glutes", equipment: ["kettlebell"], level: "intermediate", movementPattern: "hinge", environment: "both", defaultReps: "15\u201320", defaultRestSec: 60 }),
  // ===== الصدر (إضافات) =====
  ex({ id: "decline-barbell-press", nameAr: "\u0628\u0646\u0634 \u0645\u0646\u062E\u0641\u0636 \u0628\u0627\u0631", nameEn: "Decline Barbell Press", primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: ["barbell", "bench"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 90 }),
  ex({ id: "decline-dumbbell-press", nameAr: "\u0628\u0646\u0634 \u0645\u0646\u062E\u0641\u0636 \u062F\u0645\u0628\u0644", nameEn: "Decline Dumbbell Press", primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 90 }),
  ex({ id: "smith-machine-bench", nameAr: "\u0628\u0646\u0634 \u0633\u0645\u064A\u062B", nameEn: "Smith Machine Bench Press", primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: ["smith", "bench"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 90, alternatives: ["dumbbell-bench-press", "chest-press-machine"] }),
  ex({ id: "low-cable-fly", nameAr: "\u062A\u0641\u062A\u064A\u062D \u0643\u064A\u0628\u0644 \u0633\u0641\u0644\u064A", nameEn: "Low Cable Fly", primaryMuscle: "chest", equipment: ["cable"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "incline-cable-fly", nameAr: "\u062A\u0641\u062A\u064A\u062D \u0643\u064A\u0628\u0644 \u0645\u0627\u0626\u0644", nameEn: "Incline Cable Fly", primaryMuscle: "chest", equipment: ["cable"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "chest-dip", nameAr: "\u063A\u0637\u0633 \u0627\u0644\u0635\u062F\u0631 (\u0645\u062A\u0648\u0627\u0632\u064A)", nameEn: "Chest Dip", primaryMuscle: "chest", secondaryMuscles: ["triceps", "shoulders"], equipment: ["bodyweight"], level: "intermediate", movementPattern: "push", environment: "both", defaultReps: "8\u201312", defaultRestSec: 90, alternatives: ["push-up", "chest-press-machine"] }),
  ex({ id: "svend-press", nameAr: "\u0633\u0641\u064A\u0646\u062F \u0628\u0631\u064A\u0633", nameEn: "Svend Press", primaryMuscle: "chest", equipment: ["plate"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "15\u201320", defaultRestSec: 45 }),
  ex({ id: "machine-fly", nameAr: "\u062A\u0641\u062A\u064A\u062D \u062C\u0647\u0627\u0632", nameEn: "Machine Fly", primaryMuscle: "chest", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["pec-deck-machine", "dumbbell-fly"] }),
  ex({ id: "knee-push-up", nameAr: "\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0631\u0643\u0628\u062A\u064A\u0646", nameEn: "Knee Push-Up", primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: ["bodyweight"], level: "beginner", movementPattern: "push", environment: "home", defaultReps: "10\u201315", defaultRestSec: 45, notesAr: "\u0628\u062F\u064A\u0644 \u0645\u0628\u062A\u062F\u0626 \u0644\u0644\u0636\u063A\u0637 \u0627\u0644\u0639\u0627\u062F\u064A.", alternatives: ["incline-push-up", "push-up"] }),
  // ===== الظهر (إضافات) =====
  ex({ id: "pendlay-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0628\u0646\u062F\u0644\u0627\u064A", nameEn: "Pendlay Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["barbell"], level: "advanced", movementPattern: "pull", environment: "gym", defaultReps: "6\u20138", defaultRestSec: 120 }),
  ex({ id: "chest-supported-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0628\u0625\u0633\u0646\u0627\u062F \u0627\u0644\u0635\u062F\u0631", nameEn: "Chest-Supported Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 75, alternatives: ["seated-row-machine", "seated-cable-row"] }),
  ex({ id: "wide-grip-lat-pulldown", nameAr: "\u0633\u062D\u0628 \u0639\u0644\u0648\u064A \u0642\u0628\u0636\u0629 \u0648\u0627\u0633\u0639\u0629", nameEn: "Wide-Grip Lat Pulldown", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["machine"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 75, alternatives: ["dumbbell-row", "straight-arm-pulldown"] }),
  ex({ id: "close-grip-pulldown", nameAr: "\u0633\u062D\u0628 \u0642\u0628\u0636\u0629 \u0636\u064A\u0642\u0629", nameEn: "Close-Grip Pulldown", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["cable"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 75 }),
  ex({ id: "single-arm-cable-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0643\u064A\u0628\u0644 \u0628\u0630\u0631\u0627\u0639 \u0648\u0627\u062D\u062F\u0629", nameEn: "Single-Arm Cable Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["cable"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "inverted-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0645\u0642\u0644\u0648\u0628 (\u0648\u0632\u0646 \u0627\u0644\u062C\u0633\u0645)", nameEn: "Inverted Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["bodyweight"], level: "beginner", movementPattern: "pull", environment: "both", defaultReps: "8\u201315", defaultRestSec: 60, alternatives: ["dumbbell-row", "seated-cable-row"] }),
  ex({ id: "barbell-shrug", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u0627\u0644\u062A\u0631\u0627\u0628\u064A\u0633 \u0628\u0627\u0631", nameEn: "Barbell Shrug", primaryMuscle: "back", equipment: ["barbell"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "rack-pull", nameAr: "\u0631\u0627\u0643 \u0628\u0644 (\u0631\u0641\u0639\u0629 \u0645\u0646 \u0627\u0644\u062D\u0627\u0645\u0644)", nameEn: "Rack Pull", primaryMuscle: "back", secondaryMuscles: ["glutes", "hamstrings"], equipment: ["barbell"], level: "intermediate", movementPattern: "hinge", environment: "gym", defaultReps: "5\u20138", defaultRestSec: 120 }),
  ex({ id: "meadows-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0645\u064A\u062F\u0648\u0632", nameEn: "Meadows Row", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["barbell"], level: "advanced", movementPattern: "pull", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 75 }),
  ex({ id: "neutral-grip-pulldown", nameAr: "\u0633\u062D\u0628 \u0642\u0628\u0636\u0629 \u0645\u062D\u0627\u064A\u062F\u0629", nameEn: "Neutral-Grip Pulldown", primaryMuscle: "back", secondaryMuscles: ["biceps"], equipment: ["cable"], level: "beginner", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 75 }),
  // ===== الأكتاف (إضافات) =====
  ex({ id: "arnold-press", nameAr: "\u0636\u063A\u0637 \u0623\u0631\u0646\u0648\u0644\u062F", nameEn: "Arnold Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: ["dumbbell"], level: "intermediate", movementPattern: "push", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 90 }),
  ex({ id: "seated-dumbbell-press", nameAr: "\u0636\u063A\u0637 \u0643\u062A\u0641 \u062F\u0645\u0628\u0644 \u062C\u0627\u0644\u0633", nameEn: "Seated Dumbbell Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 90, alternatives: ["dumbbell-shoulder-press", "shoulder-press-machine"] }),
  ex({ id: "push-press", nameAr: "\u0628\u0648\u0634 \u0628\u0631\u064A\u0633", nameEn: "Push Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps", "quads"], equipment: ["barbell"], level: "advanced", movementPattern: "push", environment: "gym", defaultReps: "5\u20138", defaultRestSec: 120 }),
  ex({ id: "upright-row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0639\u0645\u0648\u062F\u064A", nameEn: "Upright Row", primaryMuscle: "shoulders", secondaryMuscles: ["biceps"], equipment: ["barbell"], level: "intermediate", movementPattern: "pull", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "lateral-raise-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0631\u0641\u0631\u0641\u0629 \u062C\u0627\u0646\u0628\u064A\u0629", nameEn: "Lateral Raise Machine", primaryMuscle: "shoulders", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45, alternatives: ["lateral-raise", "cable-lateral-raise"] }),
  ex({ id: "seated-lateral-raise", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u062C\u0627\u0646\u0628\u064A \u062C\u0627\u0644\u0633", nameEn: "Seated Lateral Raise", primaryMuscle: "shoulders", equipment: ["dumbbell", "bench"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "cable-rear-delt-fly", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u062E\u0644\u0641\u064A \u0643\u064A\u0628\u0644", nameEn: "Cable Rear Delt Fly", primaryMuscle: "shoulders", equipment: ["cable"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "landmine-press", nameAr: "\u0636\u063A\u0637 \u0644\u0627\u0646\u062F\u0645\u0627\u064A\u0646", nameEn: "Landmine Press", primaryMuscle: "shoulders", secondaryMuscles: ["triceps", "chest"], equipment: ["barbell"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 75 }),
  ex({ id: "pike-push-up", nameAr: "\u0636\u063A\u0637 \u0628\u0627\u064A\u0643", nameEn: "Pike Push-Up", primaryMuscle: "shoulders", secondaryMuscles: ["triceps"], equipment: ["bodyweight"], level: "intermediate", movementPattern: "push", environment: "home", defaultReps: "8\u201312", defaultRestSec: 60, alternatives: ["dumbbell-shoulder-press"] }),
  // ===== البايسبس (إضافات) =====
  ex({ id: "incline-dumbbell-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u062F\u0645\u0628\u0644 \u0645\u0627\u0626\u0644", nameEn: "Incline Dumbbell Curl", primaryMuscle: "biceps", equipment: ["dumbbell", "bench"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "ez-bar-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0628\u0627\u0631 \u0645\u062A\u0639\u0631\u0651\u062C", nameEn: "EZ-Bar Curl", primaryMuscle: "biceps", equipment: ["ez-bar"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 60, alternatives: ["barbell-curl", "dumbbell-curl"] }),
  ex({ id: "spider-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0633\u0628\u0627\u064A\u062F\u0631", nameEn: "Spider Curl", primaryMuscle: "biceps", equipment: ["dumbbell", "bench"], level: "intermediate", movementPattern: "isolation", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 45 }),
  ex({ id: "cable-hammer-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0645\u0637\u0631\u0642\u0629 \u0643\u064A\u0628\u0644 (\u062D\u0628\u0644)", nameEn: "Cable Hammer Curl", primaryMuscle: "biceps", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "reverse-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u0639\u0643\u0633\u064A", nameEn: "Reverse Curl", primaryMuscle: "biceps", secondaryMuscles: ["forearms"], equipment: ["ez-bar"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 60 }),
  ex({ id: "machine-curl", nameAr: "\u062A\u0645\u0631\u064A\u0631 \u062C\u0647\u0627\u0632", nameEn: "Machine Curl", primaryMuscle: "biceps", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["preacher-curl-machine", "cable-biceps-curl"] }),
  // ===== الترايسبس (إضافات) =====
  ex({ id: "assisted-dip-machine", nameAr: "\u062C\u0647\u0627\u0632 \u063A\u0637\u0633 \u0645\u0633\u0627\u0639\u062F", nameEn: "Assisted Dip Machine", primaryMuscle: "triceps", secondaryMuscles: ["chest"], equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 60, alternatives: ["decline-dumbbell-press", "cable-crossover"] }),
  ex({ id: "single-arm-pushdown", nameAr: "\u062F\u0641\u0639 \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u0628\u0630\u0631\u0627\u0639 \u0648\u0627\u062D\u062F\u0629", nameEn: "Single-Arm Pushdown", primaryMuscle: "triceps", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "cable-overhead-extension", nameAr: "\u062A\u0645\u062F\u064A\u062F \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u0639\u0644\u0648\u064A \u0643\u064A\u0628\u0644", nameEn: "Cable Overhead Extension", primaryMuscle: "triceps", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60 }),
  ex({ id: "dumbbell-kickback", nameAr: "\u0631\u0643\u0644\u0629 \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Kickback", primaryMuscle: "triceps", equipment: ["dumbbell"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "12\u201315", defaultRestSec: 45 }),
  ex({ id: "diamond-push-up", nameAr: "\u0636\u063A\u0637 \u0645\u0627\u0633\u064A", nameEn: "Diamond Push-Up", primaryMuscle: "triceps", secondaryMuscles: ["chest"], equipment: ["bodyweight"], level: "intermediate", movementPattern: "push", environment: "home", defaultReps: "8\u201315", defaultRestSec: 60 }),
  ex({ id: "jm-press", nameAr: "\u062C\u064A \u0625\u0645 \u0628\u0631\u064A\u0633", nameEn: "JM Press", primaryMuscle: "triceps", equipment: ["barbell", "bench"], level: "advanced", movementPattern: "push", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 75 }),
  // ===== الكوادز (إضافات) =====
  ex({ id: "reverse-lunge", nameAr: "\u0637\u0639\u0646\u0629 \u062E\u0644\u0641\u064A\u0629", nameEn: "Reverse Lunge", primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: ["dumbbell"], level: "beginner", movementPattern: "lunge", environment: "both", defaultReps: "10\u201312", defaultRestSec: 60, alternatives: ["walking-lunge", "step-up"] }),
  ex({ id: "leg-press-narrow", nameAr: "\u062F\u0641\u0639 \u0623\u0631\u062C\u0644 \u0642\u0628\u0636\u0629 \u0636\u064A\u0642\u0629", nameEn: "Narrow-Stance Leg Press", primaryMuscle: "quads", equipment: ["machine"], level: "beginner", movementPattern: "squat", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 120 }),
  ex({ id: "belt-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u0628\u0627\u0644\u062D\u0632\u0627\u0645", nameEn: "Belt Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: ["machine"], level: "intermediate", movementPattern: "squat", environment: "gym", defaultReps: "10\u201315", defaultRestSec: 90 }),
  ex({ id: "wall-sit", nameAr: "\u062C\u0644\u0633\u0629 \u0627\u0644\u062D\u0627\u0626\u0637", nameEn: "Wall Sit", primaryMuscle: "quads", equipment: ["bodyweight"], level: "beginner", movementPattern: "squat", environment: "home", defaultSets: 3, defaultReps: "30\u201360 \u062B", defaultRestSec: 45 }),
  // ===== الهامسترنج (إضافات) =====
  ex({ id: "stiff-leg-deadlift", nameAr: "\u0631\u0641\u0639\u0629 \u0628\u0623\u0631\u062C\u0644 \u0645\u0641\u0631\u0648\u062F\u0629", nameEn: "Stiff-Leg Deadlift", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes"], equipment: ["barbell"], level: "intermediate", movementPattern: "hinge", environment: "gym", defaultReps: "8\u201310", defaultRestSec: 120, alternatives: ["romanian-deadlift", "dumbbell-rdl"] }),
  ex({ id: "nordic-curl", nameAr: "\u0646\u0648\u0631\u062F\u0643 \u0643\u064A\u0631\u0644", nameEn: "Nordic Hamstring Curl", primaryMuscle: "hamstrings", equipment: ["bodyweight"], level: "advanced", movementPattern: "isolation", environment: "both", defaultReps: "5\u20138", defaultRestSec: 90 }),
  ex({ id: "single-leg-rdl", nameAr: "\u0631\u0641\u0639\u0629 \u0631\u0648\u0645\u0627\u0646\u064A\u0629 \u0628\u0631\u062C\u0644 \u0648\u0627\u062D\u062F\u0629", nameEn: "Single-Leg RDL", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes"], equipment: ["dumbbell"], level: "intermediate", movementPattern: "hinge", environment: "both", defaultReps: "8\u201310", defaultRestSec: 75 }),
  ex({ id: "glute-ham-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u062C\u0644\u0648\u062A-\u0647\u0627\u0645 (GHR)", nameEn: "Glute-Ham Raise", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes"], equipment: ["machine"], level: "advanced", movementPattern: "isolation", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 75 }),
  // ===== الجلوتس (إضافات) =====
  ex({ id: "glute-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0627\u0644\u0623\u0644\u0648\u064A\u0629", nameEn: "Glute Machine", primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], equipment: ["machine"], level: "beginner", movementPattern: "hinge", environment: "gym", defaultReps: "10\u201315", defaultRestSec: 75, alternatives: ["glute-bridge", "cable-pull-through"] }),
  ex({ id: "single-leg-hip-thrust", nameAr: "\u062F\u0641\u0639 \u0627\u0644\u0648\u0631\u0643 \u0628\u0631\u062C\u0644 \u0648\u0627\u062D\u062F\u0629", nameEn: "Single-Leg Hip Thrust", primaryMuscle: "glutes", equipment: ["bodyweight"], level: "intermediate", movementPattern: "hinge", environment: "home", defaultReps: "10\u201315", defaultRestSec: 60 }),
  ex({ id: "hip-abduction-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u0628\u0627\u0639\u062F\u0629 \u0627\u0644\u0623\u0631\u062C\u0644", nameEn: "Hip Abduction Machine", primaryMuscle: "glutes", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "15\u201320", defaultRestSec: 45 }),
  ex({ id: "banded-lateral-walk", nameAr: "\u0645\u0634\u064A \u062C\u0627\u0646\u0628\u064A \u0628\u0627\u0644\u0645\u0637\u0627\u0637", nameEn: "Banded Lateral Walk", primaryMuscle: "glutes", equipment: ["band"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "12\u201315 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 45 }),
  ex({ id: "frog-pump", nameAr: "\u0636\u062E\u0651 \u0627\u0644\u0636\u0641\u062F\u0639 \u0644\u0644\u062C\u0644\u0648\u062A", nameEn: "Frog Pump", primaryMuscle: "glutes", equipment: ["bodyweight"], level: "beginner", movementPattern: "hinge", environment: "home", defaultReps: "15\u201325", defaultRestSec: 45 }),
  // ===== السمانة (إضافات) =====
  ex({ id: "leg-press-calf-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0633\u0645\u0627\u0646\u0629 \u0639\u0644\u0649 \u062C\u0647\u0627\u0632 \u0627\u0644\u062F\u0641\u0639", nameEn: "Leg Press Calf Raise", primaryMuscle: "calves", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201320", defaultRestSec: 45 }),
  ex({ id: "donkey-calf-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0633\u0645\u0627\u0646\u0629 (\u062F\u0648\u0646\u0643\u064A)", nameEn: "Donkey Calf Raise", primaryMuscle: "calves", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201320", defaultRestSec: 45 }),
  ex({ id: "single-leg-calf-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0633\u0645\u0627\u0646\u0629 \u0628\u0631\u062C\u0644 \u0648\u0627\u062D\u062F\u0629", nameEn: "Single-Leg Calf Raise", primaryMuscle: "calves", equipment: ["dumbbell", "bodyweight"], level: "beginner", movementPattern: "isolation", environment: "both", defaultReps: "12\u201320", defaultRestSec: 40 }),
  // ===== الكور / البطن (إضافات) =====
  ex({ id: "leg-raise", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0623\u0631\u062C\u0644 \u0645\u0633\u062A\u0644\u0642\u064A", nameEn: "Lying Leg Raise", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "12\u201320", defaultRestSec: 40 }),
  ex({ id: "bicycle-crunch", nameAr: "\u0643\u0631\u0646\u0634 \u0627\u0644\u062F\u0631\u0627\u062C\u0629", nameEn: "Bicycle Crunch", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "20\u201330", defaultRestSec: 30 }),
  ex({ id: "dead-bug", nameAr: "\u0627\u0644\u062D\u0634\u0631\u0629 \u0627\u0644\u0645\u064A\u062A\u0629", nameEn: "Dead Bug", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "10\u201312 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 30 }),
  ex({ id: "hollow-hold", nameAr: "\u062B\u0628\u0627\u062A \u0627\u0644\u062C\u0633\u0645 \u0627\u0644\u0645\u0642\u0639\u0651\u0631", nameEn: "Hollow Body Hold", primaryMuscle: "core", equipment: ["bodyweight"], level: "intermediate", movementPattern: "core", environment: "home", defaultReps: "20\u201340 \u062B", defaultRestSec: 45 }),
  ex({ id: "cable-woodchop", nameAr: "\u0642\u0637\u0639 \u0627\u0644\u062E\u0634\u0628 \u0643\u064A\u0628\u0644", nameEn: "Cable Woodchop", primaryMuscle: "core", equipment: ["cable"], level: "intermediate", movementPattern: "core", environment: "gym", defaultReps: "12\u201315 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 45 }),
  ex({ id: "ab-crunch-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0637\u062D\u0646 \u0627\u0644\u0628\u0637\u0646", nameEn: "Ab Crunch Machine", primaryMuscle: "core", equipment: ["machine"], level: "beginner", movementPattern: "core", environment: "gym", defaultReps: "12\u201320", defaultRestSec: 45, alternatives: ["crunch"] }),
  ex({ id: "toes-to-bar", nameAr: "\u0623\u0635\u0627\u0628\u0639 \u0644\u0644\u0628\u0627\u0631", nameEn: "Toes to Bar", primaryMuscle: "core", equipment: ["bodyweight"], level: "advanced", movementPattern: "core", environment: "gym", defaultReps: "8\u201312", defaultRestSec: 60, alternatives: ["hanging-leg-raise", "leg-raise"] }),
  ex({ id: "pallof-press", nameAr: "\u0636\u063A\u0637 \u0628\u0627\u0644\u0648\u0641 (\u0645\u0642\u0627\u0648\u0645\u0629 \u062F\u0648\u0631\u0627\u0646)", nameEn: "Pallof Press", primaryMuscle: "core", equipment: ["cable", "band"], level: "beginner", movementPattern: "core", environment: "both", defaultReps: "12\u201315 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 45 }),
  ex({ id: "flutter-kicks", nameAr: "\u0631\u0641\u0631\u0641\u0629 \u0627\u0644\u0623\u0631\u062C\u0644", nameEn: "Flutter Kicks", primaryMuscle: "core", equipment: ["bodyweight"], level: "beginner", movementPattern: "core", environment: "home", defaultReps: "30\u201345 \u062B", defaultRestSec: 30 }),
  // ===== كارديو (إضافات) =====
  ex({ id: "incline-treadmill-walk", nameAr: "\u0645\u0634\u064A \u0645\u0627\u0626\u0644 \u0639\u0644\u0649 \u0627\u0644\u0633\u064A\u0631", nameEn: "Incline Treadmill Walk", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "20\u201340 \u062F", defaultRestSec: 0 }),
  ex({ id: "stairmaster", nameAr: "\u062C\u0647\u0627\u0632 \u0627\u0644\u062F\u0631\u062C (\u0633\u062A\u064A\u0631\u0645\u0627\u0633\u062A\u0631)", nameEn: "Stairmaster", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "15\u201325 \u062F", defaultRestSec: 0 }),
  ex({ id: "burpees", nameAr: "\u0628\u064A\u0631\u0628\u064A", nameEn: "Burpees", primaryMuscle: "cardio", secondaryMuscles: ["chest", "quads"], equipment: ["bodyweight"], level: "intermediate", movementPattern: "cardio", environment: "home", defaultSets: 4, defaultReps: "10\u201315", defaultRestSec: 45 }),
  ex({ id: "high-knees", nameAr: "\u0631\u0641\u0639 \u0627\u0644\u0631\u0643\u0628 (\u062C\u0631\u064A \u062B\u0627\u0628\u062A)", nameEn: "High Knees", primaryMuscle: "cardio", equipment: ["bodyweight"], level: "beginner", movementPattern: "cardio", environment: "home", defaultSets: 4, defaultReps: "30\u201345 \u062B", defaultRestSec: 30 }),
  ex({ id: "battle-ropes", nameAr: "\u062D\u0628\u0627\u0644 \u0627\u0644\u0642\u062A\u0627\u0644", nameEn: "Battle Ropes", primaryMuscle: "cardio", secondaryMuscles: ["shoulders"], equipment: ["rope"], level: "intermediate", movementPattern: "cardio", environment: "gym", defaultSets: 4, defaultReps: "20\u201330 \u062B", defaultRestSec: 45 }),
  ex({ id: "assault-bike", nameAr: "\u0627\u0644\u062F\u0631\u0627\u062C\u0629 \u0627\u0644\u0647\u0648\u0627\u0626\u064A\u0629 (\u0623\u0633\u0648\u0644\u062A)", nameEn: "Assault Bike", primaryMuscle: "cardio", equipment: ["machine"], level: "beginner", movementPattern: "cardio", environment: "gym", defaultSets: 1, defaultReps: "10\u201320 \u062F", defaultRestSec: 0 }),
  ex({ id: "outdoor-walk", nameAr: "\u0645\u0634\u064A \u062E\u0627\u0631\u062C\u064A", nameEn: "Outdoor Walk", primaryMuscle: "cardio", equipment: ["bodyweight"], level: "beginner", movementPattern: "cardio", environment: "home", defaultSets: 1, defaultReps: "30\u201345 \u062F", defaultRestSec: 0, notesAr: "\u062E\u064A\u0627\u0631 \u0633\u0647\u0644 \u0644\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0646\u0634\u0627\u0637 \u0627\u0644\u064A\u0648\u0645\u064A (NEAT)." }),
  // ===== إحماء / مرونة =====
  ex({ id: "arm-circles", nameAr: "\u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u0630\u0631\u0627\u0639\u064A\u0646 (\u0625\u062D\u0645\u0627\u0621)", nameEn: "Arm Circles", primaryMuscle: "shoulders", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "15\u201320", defaultRestSec: 20, notesAr: "\u0625\u062D\u0645\u0627\u0621 \u0644\u0644\u0643\u062A\u0641 \u0642\u0628\u0644 \u062A\u0645\u0627\u0631\u064A\u0646 \u0627\u0644\u062F\u0641\u0639." }),
  ex({ id: "cat-cow", nameAr: "\u062A\u0645\u062F\u0651\u062F \u0627\u0644\u0642\u0637\u0629-\u0627\u0644\u0628\u0642\u0631\u0629", nameEn: "Cat-Cow Stretch", primaryMuscle: "back", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "home", defaultSets: 2, defaultReps: "8\u201310", defaultRestSec: 20 }),
  ex({ id: "hip-flexor-stretch", nameAr: "\u062A\u0645\u062F\u0651\u062F \u0639\u0636\u0644\u0629 \u0627\u0644\u0648\u0631\u0643 \u0627\u0644\u0642\u0627\u0628\u0636\u0629", nameEn: "Hip Flexor Stretch", primaryMuscle: "quads", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "30 \u062B \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 15 }),
  ex({ id: "world-greatest-stretch", nameAr: "\u0623\u0639\u0638\u0645 \u062A\u0645\u062F\u0651\u062F (World\u2019s Greatest)", nameEn: "World\u2019s Greatest Stretch", primaryMuscle: "hamstrings", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "5\u20136 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 20 }),
  ex({ id: "leg-swings", nameAr: "\u0623\u0631\u062C\u062D\u0629 \u0627\u0644\u0623\u0631\u062C\u0644 (\u0625\u062D\u0645\u0627\u0621)", nameEn: "Leg Swings", primaryMuscle: "hamstrings", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "12\u201315 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 15 }),
  ex({ id: "shoulder-dislocates", nameAr: "\u0645\u0631\u0648\u0646\u0629 \u0627\u0644\u0643\u062A\u0641 \u0628\u0627\u0644\u0639\u0635\u0627/\u0627\u0644\u0645\u0637\u0627\u0637", nameEn: "Shoulder Dislocates", primaryMuscle: "shoulders", equipment: ["band"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "10\u201312", defaultRestSec: 20 }),
  ex({ id: "thoracic-rotation", nameAr: "\u062A\u062F\u0648\u064A\u0631 \u0627\u0644\u0641\u0642\u0631\u0627\u062A \u0627\u0644\u0635\u062F\u0631\u064A\u0629", nameEn: "Thoracic Rotation", primaryMuscle: "back", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "home", defaultSets: 2, defaultReps: "8\u201310 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 15 }),
  ex({ id: "ankle-mobility", nameAr: "\u0645\u0631\u0648\u0646\u0629 \u0627\u0644\u0643\u0627\u062D\u0644", nameEn: "Ankle Mobility Drill", primaryMuscle: "calves", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "10\u201312 \u0644\u0643\u0644 \u062C\u0647\u0629", defaultRestSec: 15 }),
  ex({ id: "hamstring-stretch", nameAr: "\u062A\u0645\u062F\u0651\u062F \u0627\u0644\u0647\u0627\u0645\u0633\u062A\u0631\u0646\u062C", nameEn: "Standing Hamstring Stretch", primaryMuscle: "hamstrings", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "both", defaultSets: 2, defaultReps: "30 \u062B", defaultRestSec: 15 }),
  ex({ id: "child-pose", nameAr: "\u0648\u0636\u0639\u064A\u0629 \u0627\u0644\u0637\u0641\u0644 (\u0627\u0633\u062A\u0631\u062E\u0627\u0621)", nameEn: "Child\u2019s Pose", primaryMuscle: "back", equipment: ["bodyweight"], level: "beginner", movementPattern: "mobility", environment: "home", defaultSets: 2, defaultReps: "30\u201345 \u062B", defaultRestSec: 15 }),
  // ===== أجهزة إضافية (P12 — كتالوج الأجهزة المعتمد) =====
  // أجهزة موجّهة آمنة للمبتدئ تكمّل الأسماء المطلوبة في كتالوج الأجهزة (machineCatalog.ts).
  ex({ id: "decline-chest-press-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0635\u062F\u0631 \u0633\u0641\u0644\u064A", nameEn: "Decline Chest Press Machine", primaryMuscle: "chest", secondaryMuscles: ["triceps"], equipment: ["machine"], level: "beginner", movementPattern: "push", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 75, alternatives: ["decline-dumbbell-press", "cable-crossover"] }),
  ex({ id: "machine-rdl", nameAr: "\u0627\u0644\u0631\u0641\u0639\u0629 \u0627\u0644\u0631\u0648\u0645\u0627\u0646\u064A\u0629 \u0628\u0627\u0644\u062C\u0647\u0627\u0632", nameEn: "RDL Machine", primaryMuscle: "hamstrings", secondaryMuscles: ["glutes"], equipment: ["machine"], level: "beginner", movementPattern: "hinge", environment: "gym", defaultReps: "10\u201312", defaultRestSec: 90, alternatives: ["lying-leg-curl", "dumbbell-rdl"] }),
  ex({ id: "glute-kickback-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0631\u0643\u0644 \u062E\u0644\u0641\u064A", nameEn: "Glute Kickback Machine", primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["glute-bridge", "cable-kickback"] }),
  ex({ id: "standing-hip-extension-machine", nameAr: "\u0645\u062F \u0648\u0631\u0643 \u0648\u0627\u0642\u0641", nameEn: "Standing Hip Extension Machine", primaryMuscle: "glutes", secondaryMuscles: ["hamstrings"], equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 60, alternatives: ["glute-bridge", "cable-kickback"] }),
  ex({ id: "hip-adductor-machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u0645 \u0627\u0644\u0641\u062E\u0630", nameEn: "Hip Adductor Machine", primaryMuscle: "glutes", equipment: ["machine"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "15\u201320", defaultRestSec: 45, alternatives: ["dumbbell-sumo-squat", "cable-hip-adduction"] }),
  ex({ id: "dumbbell-sumo-squat", nameAr: "\u0633\u0643\u0648\u0627\u062A \u0633\u0648\u0645\u0648 \u062F\u0645\u0628\u0644", nameEn: "Dumbbell Sumo Squat", primaryMuscle: "quads", secondaryMuscles: ["glutes"], equipment: ["dumbbell"], level: "beginner", movementPattern: "squat", environment: "both", defaultReps: "10\u201315", defaultRestSec: 75, notesAr: "\u0648\u0642\u0641\u0629 \u0648\u0627\u0633\u0639\u0629 \u0628\u0623\u0635\u0627\u0628\u0639 \u0644\u0644\u062E\u0627\u0631\u062C \u2014 \u062A\u064F\u0634\u0631\u0643 \u0627\u0644\u0641\u062E\u0630 \u0627\u0644\u062F\u0627\u062E\u0644\u064A.", alternatives: ["goblet-squat", "bodyweight-squat"] }),
  ex({ id: "cable-hip-adduction", nameAr: "\u0636\u0645 \u0627\u0644\u0641\u062E\u0630 \u0643\u064A\u0628\u0644", nameEn: "Cable Hip Adduction", primaryMuscle: "glutes", equipment: ["cable"], level: "beginner", movementPattern: "isolation", environment: "gym", defaultReps: "12\u201315", defaultRestSec: 45, notesAr: "\u0633\u0648\u0627\u0631 \u0643\u0627\u062D\u0644 \u0639\u0644\u0649 \u0627\u0644\u0628\u0643\u0631\u0629 \u0627\u0644\u0633\u0641\u0644\u064A\u0629 \u2014 \u062D\u0631\u0651\u0643 \u0627\u0644\u0631\u062C\u0644 \u0646\u062D\u0648 \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u062C\u0633\u0645 \u0628\u062A\u062D\u0643\u0651\u0645.", alternatives: ["hip-adductor-machine", "dumbbell-sumo-squat"] })
];
var exerciseMap = Object.fromEntries(
  exercises.map((e) => [e.id, e])
);
var LEGACY_EXERCISE_ID_MAP = {
  "incline-machine-press": "incline-chest-press-machine",
  "decline-machine-press": "decline-chest-press-machine",
  "triceps-dip-machine": "assisted-dip-machine",
  "lat-pulldown": "lat-pulldown-machine",
  "wide-grip-pulldown": "wide-grip-lat-pulldown",
  "machine-row": "seated-row-machine",
  "low-row-machine": "seated-row-machine",
  "t-bar-row": "t-bar-row-machine",
  "machine-lateral-raise": "lateral-raise-machine",
  "leg-extension": "leg-extension-machine",
  "hack-squat": "hack-squat-machine",
  // (تحديث نهائي) أُزيل سكوات البندول؛ يُحوَّل لهاك سكوات كي لا تنكسر أي خطة مخزّنة.
  "pendulum-squat": "hack-squat-machine",
  "pendulum-squat-machine": "hack-squat-machine",
  "leg-press": "leg-press-machine",
  "adduction-machine": "hip-adductor-machine",
  "abduction-machine": "hip-abduction-machine",
  "pec-deck": "pec-deck-machine",
  // (تحديث نهائي) أُزيل glute-drive-machine؛ جهاز الألوية الرسمي الوحيد هو glute-machine.
  "glute-drive-machine": "glute-machine",
  "machine-hip-thrust": "glute-machine",
  "seated-calf-raise": "seated-calf-raise-machine",
  "standing-calf-raise": "standing-calf-raise-machine",
  "preacher-curl": "preacher-curl-machine",
  "cable-curl": "cable-biceps-curl",
  "triceps-pushdown": "cable-triceps-pushdown",
  "machine-crunch": "ab-crunch-machine"
};
function canonicalExerciseId(id) {
  return exerciseMap[id] ? id : LEGACY_EXERCISE_ID_MAP[id] ?? id;
}
var PLACEHOLDER_ONLY_EXERCISE_IDS = [
  "decline-chest-press-machine",
  "hack-squat-machine",
  "preacher-curl-machine",
  "rear-delt-row-machine",
  "seated-calf-raise-machine",
  "standing-calf-raise-machine",
  "seated-leg-curl",
  "lateral-raise-machine",
  "shoulder-press-machine",
  "standing-leg-curl",
  "glute-machine",
  "glute-kickback-machine",
  // بلا أي وسيط أصلًا (كانت placeholder نظيفة) — تُدرَج كي تُجلب لها صورة جهاز حقيقية أيضًا.
  "iso-lateral-incline-press",
  "iso-lateral-chest-press",
  "iso-lateral-pulldown",
  "wide-grip-iso-lateral-pulldown",
  "iso-lateral-high-row",
  "triceps-extension-machine",
  "standing-hip-extension-machine",
  "single-arm-lat-pulldown",
  "chest-supported-row-machine",
  "hip-adductor-machine",
  "hip-abduction-machine",
  // (Q20) نُسِبت لهذين الجهازين صورتا **كيبل** لا صورتا جهاز — تحقّق بصري من الملفات:
  //   chest-press-machine        → free-exercise-db «Cable_Chest_Press»: رجل واقف يضغط
  //                                 بمقبضَي كيبل من محطة تقاطع. ليس جهاز ضغط صدر جالسًا.
  //   incline-chest-press-machine → «incline-machine-press/0.jpg»: رجل على بنش مائل قابل
  //                                 للتعديل يسحب مقبضَي كيبل. ليس جهاز ضغط صدر علوي.
  // القوالب «أجهزة فقط»، فمستخدمٌ يبحث في النادي عن الجهاز كان يرى محطة كيبل — نسبة خاطئة
  // صريحة. لا يوجد لهما رسم داخلي بعد، فيتدهوران إلى «الشرح المرئي قيد الإضافة»: حالة
  // صادقة خير من صورة تدلّ على جهاز آخر. (بقيّة الستّة تحقّقت بصريًا وهي مطابقة — انظر
  // docs/content/EXERCISE-MEDIA-COVERAGE.md §التحقّق البصري.)
  "chest-press-machine",
  "incline-chest-press-machine"
];
var placeholderOnlySet = new Set(PLACEHOLDER_ONLY_EXERCISE_IDS);
function getExercise(id) {
  return exerciseMap[id] ?? exerciseMap[LEGACY_EXERCISE_ID_MAP[id] ?? ""];
}

// src/data/machineCatalog.ts
var SUB = {
  chestFlat: { ar: "\u0635\u062F\u0631 \u0645\u0633\u062A\u0648\u064A", en: "Flat Chest" },
  chestIncline: { ar: "\u0635\u062F\u0631 \u0639\u0644\u0648\u064A", en: "Upper Chest" },
  chestDecline: { ar: "\u0635\u062F\u0631 \u0633\u0641\u0644\u064A", en: "Lower Chest" },
  latsLower: { ar: "\u0644\u0627\u062A\u0633 \u0633\u0641\u0644\u064A", en: "Lower Lats" },
  latsWidth: { ar: "\u0644\u0627\u062A\u0633 \u062C\u0627\u0646\u0628\u064A", en: "Lat Width" },
  upperBack: { ar: "\u0638\u0647\u0631 \u0639\u0644\u0648\u064A", en: "Upper Back" },
  frontDelt: { ar: "\u0643\u062A\u0641 \u0623\u0645\u0627\u0645\u064A", en: "Front Delts" },
  sideDelt: { ar: "\u0643\u062A\u0641 \u062C\u0627\u0646\u0628\u064A", en: "Side Delts" },
  rearDelt: { ar: "\u0643\u062A\u0641 \u062E\u0644\u0641\u064A", en: "Rear Delts" },
  quads: { ar: "\u0641\u062E\u0630 \u0623\u0645\u0627\u0645\u064A", en: "Quads" },
  hamstrings: { ar: "\u0641\u062E\u0630 \u062E\u0644\u0641\u064A", en: "Hamstrings" },
  adductors: { ar: "\u0627\u0644\u0641\u062E\u0630 \u0627\u0644\u062F\u0627\u062E\u0644\u064A", en: "Inner Thigh" },
  glutes: { ar: "\u0627\u0644\u0623\u0644\u0648\u064A\u0629", en: "Glutes" },
  calves: { ar: "\u0627\u0644\u0628\u0637\u0627\u062A", en: "Calves" },
  biceps: { ar: "\u0628\u0627\u064A\u0633\u0628\u0633", en: "Biceps" },
  triceps: { ar: "\u062A\u0631\u0627\u064A\u0633\u0628\u0633", en: "Triceps" },
  abs: { ar: "\u0627\u0644\u0628\u0637\u0646", en: "Abs" }
};
function item(i) {
  return { ...i, subGroupAr: i.subGroup.ar };
}
var machineCatalog = [
  {
    key: "chest",
    titleEn: "Chest",
    titleAr: "\u0627\u0644\u0635\u062F\u0631",
    items: [
      item({ exerciseId: "chest-press-machine", nameEn: "Chest Press Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0627\u0644\u0635\u062F\u0631", targetMuscleAr: "\u0627\u0644\u0635\u062F\u0631", subGroup: SUB.chestFlat }),
      item({ exerciseId: "iso-lateral-chest-press", nameEn: "Iso-Lateral Chest Press", nameAr: "\u0636\u063A\u0637 \u0635\u062F\u0631 \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", targetMuscleAr: "\u0627\u0644\u0635\u062F\u0631", subGroup: SUB.chestFlat, aliasesEn: ["Hammer Strength Chest Press"] }),
      item({ exerciseId: "incline-chest-press-machine", nameEn: "Incline Chest Press Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0635\u062F\u0631 \u0639\u0644\u0648\u064A", targetMuscleAr: "\u0627\u0644\u0635\u062F\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.chestIncline }),
      item({ exerciseId: "iso-lateral-incline-press", nameEn: "Iso-Lateral Incline Press", nameAr: "\u0636\u063A\u0637 \u0639\u0644\u0648\u064A \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", targetMuscleAr: "\u0627\u0644\u0635\u062F\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.chestIncline, aliasesEn: ["Hammer Strength Incline Press"] }),
      item({ exerciseId: "decline-chest-press-machine", nameEn: "Decline Chest Press Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0635\u062F\u0631 \u0633\u0641\u0644\u064A", targetMuscleAr: "\u0627\u0644\u0635\u062F\u0631 \u0627\u0644\u0633\u0641\u0644\u064A", subGroup: SUB.chestDecline }),
      item({ exerciseId: "assisted-dip-machine", nameEn: "Assisted Dip Machine", nameAr: "\u062C\u0647\u0627\u0632 \u063A\u0637\u0633 \u0645\u0633\u0627\u0639\u062F", targetMuscleAr: "\u0627\u0644\u0635\u062F\u0631 \u0627\u0644\u0633\u0641\u0644\u064A \u0648\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633", subGroup: SUB.chestDecline, sharedGroups: ["triceps"] }),
      item({ exerciseId: "pec-deck-machine", nameEn: "Pec Deck Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0641\u0644\u0627\u064A \u0635\u062F\u0631", targetMuscleAr: "\u0648\u0633\u0637 \u0627\u0644\u0635\u062F\u0631", subGroup: SUB.chestFlat })
    ]
  },
  {
    key: "back",
    titleEn: "Back",
    titleAr: "\u0627\u0644\u0638\u0647\u0631",
    items: [
      // — لاتس سفلي —
      item({ exerciseId: "lat-pulldown-machine", nameEn: "Lat Pulldown Machine (Seated/Lever)", nameAr: "\u062C\u0647\u0627\u0632 \u0633\u062D\u0628 \u0639\u0644\u0648\u064A", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0627\u0644\u0633\u0641\u0644\u064A", subGroup: SUB.latsLower }),
      item({ exerciseId: "single-arm-lat-pulldown", nameEn: "Single-Arm Lat Pulldown", nameAr: "\u0633\u062D\u0628 \u0639\u0644\u0648\u064A \u0628\u0630\u0631\u0627\u0639 \u0648\u0627\u062D\u062F\u0629", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0627\u0644\u0633\u0641\u0644\u064A", subGroup: SUB.latsLower }),
      item({ exerciseId: "iso-lateral-pulldown", nameEn: "Iso-Lateral Pulldown", nameAr: "\u0633\u062D\u0628 \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0627\u0644\u0633\u0641\u0644\u064A", subGroup: SUB.latsLower, aliasesEn: ["Hammer Strength Pulldown"] }),
      item({ exerciseId: "iso-lateral-high-row", nameEn: "Iso-Lateral High Row", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0639\u0627\u0644\u064A \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0627\u0644\u0633\u0641\u0644\u064A", subGroup: SUB.latsLower, aliasesEn: ["Hammer Strength High Row"] }),
      // — لاتس جانبي (عرض الظهر) —
      item({ exerciseId: "wide-grip-lat-pulldown", nameEn: "Wide-Grip Lat Pulldown", nameAr: "\u0633\u062D\u0628 \u0639\u0644\u0648\u064A \u0642\u0628\u0636\u0629 \u0648\u0627\u0633\u0639\u0629", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0627\u0644\u062C\u0627\u0646\u0628\u064A", subGroup: SUB.latsWidth }),
      item({ exerciseId: "wide-grip-iso-lateral-pulldown", nameEn: "Wide-Grip Iso-Lateral Pulldown", nameAr: "\u0633\u062D\u0628 \u0623\u064A\u0632\u0648-\u0644\u0627\u062A\u0631\u0627\u0644 \u0648\u0627\u0633\u0639", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0627\u0644\u062C\u0627\u0646\u0628\u064A", subGroup: SUB.latsWidth, aliasesEn: ["Hammer Strength Wide-Grip Pulldown"] }),
      item({ exerciseId: "seated-row-machine", nameEn: "Seated Row Machine", nameAr: "\u062C\u0647\u0627\u0632 \u062A\u062C\u062F\u064A\u0641 \u062C\u0627\u0644\u0633", targetMuscleAr: "\u0627\u0644\u0644\u0627\u062A\u0633 \u0648\u0627\u0644\u0638\u0647\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.latsWidth, sharedGroups: ["upper-back"] }),
      // — ظهر علوي —
      item({ exerciseId: "chest-supported-row-machine", nameEn: "Chest-Supported Row Machine", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0628\u0645\u0633\u0646\u062F \u0635\u062F\u0631", targetMuscleAr: "\u0627\u0644\u0638\u0647\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.upperBack }),
      item({ exerciseId: "t-bar-row-machine", nameEn: "T-Bar Row Machine", nameAr: "\u062C\u0647\u0627\u0632 \u062A\u062C\u062F\u064A\u0641 \u062A\u064A-\u0628\u0627\u0631", targetMuscleAr: "\u0627\u0644\u0638\u0647\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.upperBack }),
      item({ exerciseId: "rear-delt-row-machine", nameEn: "Rear Delt Row Machine", nameAr: "\u062A\u062C\u062F\u064A\u0641 \u0643\u062A\u0641 \u062E\u0644\u0641\u064A", targetMuscleAr: "\u0627\u0644\u0643\u062A\u0641 \u0627\u0644\u062E\u0644\u0641\u064A \u0648\u0627\u0644\u0638\u0647\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.upperBack, sharedGroups: ["rear-delts"] })
    ]
  },
  {
    key: "shoulders",
    titleEn: "Shoulders",
    titleAr: "\u0627\u0644\u0623\u0643\u062A\u0627\u0641",
    items: [
      item({ exerciseId: "shoulder-press-machine", nameEn: "Shoulder Press Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u063A\u0637 \u0643\u062A\u0641", targetMuscleAr: "\u0627\u0644\u0643\u062A\u0641 \u0627\u0644\u0623\u0645\u0627\u0645\u064A", subGroup: SUB.frontDelt }),
      item({ exerciseId: "lateral-raise-machine", nameEn: "Lateral Raise Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0631\u0641\u0631\u0641\u0629 \u062C\u0627\u0646\u0628\u064A\u0629", targetMuscleAr: "\u0627\u0644\u0643\u062A\u0641 \u0627\u0644\u062C\u0627\u0646\u0628\u064A", subGroup: SUB.sideDelt }),
      item({ exerciseId: "reverse-pec-deck", nameEn: "Reverse Pec Deck", nameAr: "\u0628\u064A\u0643 \u062F\u0643 \u0639\u0643\u0633\u064A", targetMuscleAr: "\u0627\u0644\u0643\u062A\u0641 \u0627\u0644\u062E\u0644\u0641\u064A \u0648\u0627\u0644\u0638\u0647\u0631 \u0627\u0644\u0639\u0644\u0648\u064A", subGroup: SUB.rearDelt, aliasesEn: ["Rear Delt Machine"], sharedGroups: ["upper-back"] })
    ]
  },
  {
    key: "legs",
    titleEn: "Legs",
    titleAr: "\u0627\u0644\u0623\u0631\u062C\u0644",
    items: [
      // — فخذ أمامي (Quads) —
      item({ exerciseId: "leg-extension-machine", nameEn: "Leg Extension Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u062F \u0627\u0644\u0623\u0631\u062C\u0644", targetMuscleAr: "\u0623\u0645\u0627\u0645\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", subGroup: SUB.quads }),
      item({ exerciseId: "hack-squat-machine", nameEn: "Hack Squat Machine", nameAr: "\u0647\u0627\u0643 \u0633\u0643\u0648\u0627\u062A \u062C\u0647\u0627\u0632", targetMuscleAr: "\u0623\u0645\u0627\u0645\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", subGroup: SUB.quads }),
      item({ exerciseId: "leg-press-machine", nameEn: "Leg Press Machine", nameAr: "\u062C\u0647\u0627\u0632 \u062F\u0641\u0639 \u0627\u0644\u0623\u0631\u062C\u0644", targetMuscleAr: "\u0623\u0645\u0627\u0645\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", subGroup: SUB.quads }),
      // — فخذ خلفي (Hamstrings) —
      item({ exerciseId: "seated-leg-curl", nameEn: "Seated Leg Curl", nameAr: "\u062B\u0646\u064A \u0623\u0631\u062C\u0644 \u062C\u0627\u0644\u0633", targetMuscleAr: "\u062E\u0644\u0641\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", subGroup: SUB.hamstrings }),
      item({ exerciseId: "lying-leg-curl", nameEn: "Lying Leg Curl", nameAr: "\u062B\u0646\u064A \u0623\u0631\u062C\u0644 \u0645\u0633\u062A\u0644\u0642\u064A", targetMuscleAr: "\u062E\u0644\u0641\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", subGroup: SUB.hamstrings }),
      item({ exerciseId: "standing-leg-curl", nameEn: "Standing Leg Curl", nameAr: "\u062B\u0646\u064A \u0623\u0631\u062C\u0644 \u0648\u0627\u0642\u0641", targetMuscleAr: "\u062E\u0644\u0641\u064A\u0629 \u0627\u0644\u0641\u062E\u0630", subGroup: SUB.hamstrings }),
      // — الفخذ الداخلي (Adductors) —
      item({ exerciseId: "hip-adductor-machine", nameEn: "Hip Adductor Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0636\u0645 \u0627\u0644\u0641\u062E\u0630", targetMuscleAr: "\u0627\u0644\u0641\u062E\u0630 \u0627\u0644\u062F\u0627\u062E\u0644\u064A", subGroup: SUB.adductors }),
      item({ exerciseId: "hip-abduction-machine", nameEn: "Hip Abduction Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u0628\u0627\u0639\u062F\u0629 \u0627\u0644\u0623\u0631\u062C\u0644", targetMuscleAr: "\u0627\u0644\u0641\u062E\u0630 \u0627\u0644\u062E\u0627\u0631\u062C\u064A \u0648\u0627\u0644\u0623\u0644\u0648\u064A\u0629", subGroup: SUB.glutes }),
      // — الألوية (Glutes) —
      item({ exerciseId: "glute-machine", nameEn: "Glute Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0627\u0644\u0623\u0644\u0648\u064A\u0629", targetMuscleAr: "\u0627\u0644\u0623\u0644\u0648\u064A\u0629", subGroup: SUB.glutes }),
      item({ exerciseId: "glute-kickback-machine", nameEn: "Glute Kickback Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0631\u0643\u0644 \u062E\u0644\u0641\u064A", targetMuscleAr: "\u0627\u0644\u0623\u0644\u0648\u064A\u0629", subGroup: SUB.glutes }),
      item({ exerciseId: "standing-hip-extension-machine", nameEn: "Standing Hip Extension Machine", nameAr: "\u0645\u062F \u0648\u0631\u0643 \u0648\u0627\u0642\u0641", targetMuscleAr: "\u0627\u0644\u0623\u0644\u0648\u064A\u0629", subGroup: SUB.glutes }),
      // — البطات (Calves) —
      item({ exerciseId: "seated-calf-raise-machine", nameEn: "Seated Calf Raise Machine", nameAr: "\u0631\u0641\u0639 \u0628\u0637\u0627\u062A \u062C\u0627\u0644\u0633", targetMuscleAr: "\u0627\u0644\u0628\u0637\u0627\u062A", subGroup: SUB.calves }),
      item({ exerciseId: "standing-calf-raise-machine", nameEn: "Standing Calf Raise Machine", nameAr: "\u0631\u0641\u0639 \u0628\u0637\u0627\u062A \u0648\u0627\u0642\u0641", targetMuscleAr: "\u0627\u0644\u0628\u0637\u0627\u062A", subGroup: SUB.calves })
    ]
  },
  {
    key: "biceps",
    titleEn: "Biceps",
    titleAr: "\u0627\u0644\u0628\u0627\u064A\u0633\u0628\u0633",
    items: [
      item({ exerciseId: "preacher-curl-machine", nameEn: "Preacher Curl Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u0631\u062C\u062D\u0629 \u0628\u0627\u064A\u0633\u0628\u0633", targetMuscleAr: "\u0627\u0644\u0628\u0627\u064A\u0633\u0628\u0633", subGroup: SUB.biceps }),
      item({ exerciseId: "cable-biceps-curl", nameEn: "Cable Biceps Curl", nameAr: "\u0645\u0631\u062C\u062D\u0629 \u0628\u0627\u064A\u0633\u0628\u0633 \u0643\u064A\u0628\u0644", targetMuscleAr: "\u0627\u0644\u0628\u0627\u064A\u0633\u0628\u0633", subGroup: SUB.biceps })
    ]
  },
  {
    key: "triceps",
    titleEn: "Triceps",
    titleAr: "\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633",
    items: [
      item({ exerciseId: "triceps-extension-machine", nameEn: "Triceps Extension Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0645\u062F \u062A\u0631\u0627\u064A\u0633\u0628\u0633", targetMuscleAr: "\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633", subGroup: SUB.triceps }),
      item({ exerciseId: "cable-triceps-pushdown", nameEn: "Cable Triceps Pushdown", nameAr: "\u062F\u0641\u0639 \u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u0643\u064A\u0628\u0644", targetMuscleAr: "\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633", subGroup: SUB.triceps }),
      item({ exerciseId: "assisted-dip-machine", nameEn: "Assisted Dip Machine", nameAr: "\u062C\u0647\u0627\u0632 \u063A\u0637\u0633 \u0645\u0633\u0627\u0639\u062F", targetMuscleAr: "\u0627\u0644\u062A\u0631\u0627\u064A\u0633\u0628\u0633 \u0648\u0627\u0644\u0635\u062F\u0631 \u0627\u0644\u0633\u0641\u0644\u064A", subGroup: SUB.triceps, sharedGroups: ["chest"] })
    ]
  },
  {
    key: "abs",
    titleEn: "Abs",
    titleAr: "\u0627\u0644\u0628\u0637\u0646",
    items: [
      item({ exerciseId: "ab-crunch-machine", nameEn: "Ab Crunch Machine", nameAr: "\u062C\u0647\u0627\u0632 \u0637\u062D\u0646 \u0627\u0644\u0628\u0637\u0646", targetMuscleAr: "\u0627\u0644\u0628\u0637\u0646", subGroup: SUB.abs })
    ]
  }
];
var machineCatalogExerciseIds = Array.from(
  new Set(machineCatalog.flatMap((g) => g.items.map((i) => i.exerciseId)))
);
var machineCatalogIdSet = new Set(machineCatalogExerciseIds);
var PRIMARY_MACHINE_IDS = [
  // الصدر (٦)
  "chest-press-machine",
  "iso-lateral-chest-press",
  "incline-chest-press-machine",
  "iso-lateral-incline-press",
  "decline-chest-press-machine",
  "assisted-dip-machine",
  // الظهر (١٠)
  "lat-pulldown-machine",
  "single-arm-lat-pulldown",
  "iso-lateral-pulldown",
  "iso-lateral-high-row",
  "wide-grip-lat-pulldown",
  "wide-grip-iso-lateral-pulldown",
  "seated-row-machine",
  "chest-supported-row-machine",
  "t-bar-row-machine",
  "rear-delt-row-machine",
  // الأكتاف (٣)
  "shoulder-press-machine",
  "lateral-raise-machine",
  "reverse-pec-deck",
  // الأرجل (١٢)
  "leg-extension-machine",
  "hack-squat-machine",
  "leg-press-machine",
  "seated-leg-curl",
  "lying-leg-curl",
  "standing-leg-curl",
  "hip-adductor-machine",
  "glute-machine",
  "glute-kickback-machine",
  "standing-hip-extension-machine",
  "seated-calf-raise-machine",
  "standing-calf-raise-machine"
];
var primaryMachineIdSet = new Set(PRIMARY_MACHINE_IDS);

// src/data/workoutTemplates.ts
var workoutTemplates = [
  {
    id: "upper-lower",
    nameAr: "\u0639\u0644\u0648\u064A / \u0633\u0641\u0644\u064A",
    nameEn: "Upper / Lower",
    descriptionAr: "\u0623\u0631\u0628\u0639\u0629 \u0623\u064A\u0627\u0645: \u064A\u0648\u0645\u0627\u0646 \u0639\u0644\u0648\u064A \u0648\u064A\u0648\u0645\u0627\u0646 \u0633\u0641\u0644\u064A \u2014 \u062A\u0648\u0627\u0632\u0646 \u0642\u0648\u064A \u0628\u064A\u0646 \u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0648\u0627\u0644\u0627\u0633\u062A\u0634\u0641\u0627\u0621.",
    descriptionEn: "Four days \u2014 two upper and two lower \u2014 a strong balance of frequency and recovery.",
    recommendedFor: "\u0645\u062A\u0648\u0633\u0637",
    days: [
      { id: "upper-lower-d1", nameAr: "\u0639\u0644\u0648\u064A", nameEn: "Upper", exerciseIds: ["incline-chest-press-machine", "chest-press-machine", "lat-pulldown-machine", "shoulder-press-machine", "pec-deck-machine", "triceps-extension-machine", "preacher-curl-machine"] },
      { id: "upper-lower-d2", nameAr: "\u0633\u0641\u0644\u064A", nameEn: "Lower", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] },
      { id: "upper-lower-d3", nameAr: "\u0639\u0644\u0648\u064A", nameEn: "Upper", exerciseIds: ["chest-supported-row-machine", "lat-pulldown-machine", "incline-chest-press-machine", "rear-delt-row-machine", "lateral-raise-machine", "triceps-extension-machine", "preacher-curl-machine"] },
      { id: "upper-lower-d4", nameAr: "\u0633\u0641\u0644\u064A", nameEn: "Lower", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] }
    ]
  },
  {
    id: "full-body",
    nameAr: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644",
    nameEn: "Full Body",
    descriptionAr: "\u062B\u0644\u0627\u062B\u0629 \u0623\u064A\u0627\u0645 \u0644\u0643\u0627\u0645\u0644 \u0627\u0644\u062C\u0633\u0645 \u2014 \u0645\u062B\u0627\u0644\u064A \u0644\u0644\u0628\u062F\u0627\u064A\u0629 \u0648\u0644\u0644\u0623\u0633\u0627\u0628\u064A\u0639 \u0627\u0644\u0645\u0632\u062F\u062D\u0645\u0629.",
    descriptionEn: "Three whole-body days \u2014 ideal for starting out and for busy weeks.",
    recommendedFor: "\u0645\u0628\u062A\u062F\u0626\u2013\u0645\u062A\u0648\u0633\u0637",
    days: [
      { id: "full-body-d1", nameAr: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644", nameEn: "Full Body", exerciseIds: ["leg-press-machine", "incline-chest-press-machine", "lat-pulldown-machine", "shoulder-press-machine", "hip-abduction-machine"] },
      { id: "full-body-d2", nameAr: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644", nameEn: "Full Body", exerciseIds: ["glute-machine", "chest-supported-row-machine", "chest-press-machine", "seated-leg-curl", "preacher-curl-machine", "triceps-extension-machine"] },
      { id: "full-body-d3", nameAr: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644", nameEn: "Full Body", exerciseIds: ["lat-pulldown-machine", "rear-delt-row-machine", "leg-extension-machine", "pec-deck-machine", "lateral-raise-machine", "seated-calf-raise-machine"] }
    ]
  },
  {
    id: "arnold",
    nameAr: "\u062A\u0642\u0633\u064A\u0645\u0629 \u0623\u0631\u0646\u0648\u0644\u062F",
    nameEn: "Arnold Split",
    descriptionAr: "\u0633\u062A\u0629 \u0623\u064A\u0627\u0645: \u0635\u062F\u0631 \u0648\u0638\u0647\u0631\u060C \u0623\u0643\u062A\u0627\u0641 \u0648\u0630\u0631\u0627\u0639\u0627\u0646\u060C \u0623\u0631\u062C\u0644 \u2014 \u0645\u0643\u0631\u0651\u0631\u0629 \u0645\u0631\u062A\u064A\u0646 \u0628\u062D\u062C\u0645 \u0639\u0645\u0644 \u0639\u0627\u0644\u064D.",
    descriptionEn: "Six days \u2014 chest & back, shoulders & arms, legs \u2014 twice through, high volume.",
    recommendedFor: "\u0645\u062A\u0642\u062F\u0651\u0645",
    days: [
      { id: "arnold-d1", nameAr: "\u0635\u062F\u0631 \u0648\u0638\u0647\u0631", nameEn: "Chest & Back", exerciseIds: ["incline-chest-press-machine", "chest-press-machine", "lat-pulldown-machine", "chest-supported-row-machine", "rear-delt-row-machine", "pec-deck-machine"] },
      { id: "arnold-d2", nameAr: "\u0623\u0643\u062A\u0627\u0641 \u0648\u0630\u0631\u0627\u0639\u0627\u0646", nameEn: "Shoulders & Arms", exerciseIds: ["shoulder-press-machine", "rear-delt-row-machine", "lateral-raise-machine", "preacher-curl-machine", "triceps-extension-machine"] },
      { id: "arnold-d3", nameAr: "\u0623\u0631\u062C\u0644", nameEn: "Legs", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] },
      { id: "arnold-d4", nameAr: "\u0635\u062F\u0631 \u0648\u0638\u0647\u0631", nameEn: "Chest & Back", exerciseIds: ["chest-press-machine", "incline-chest-press-machine", "chest-supported-row-machine", "lat-pulldown-machine", "rear-delt-row-machine", "pec-deck-machine"] },
      { id: "arnold-d5", nameAr: "\u0623\u0643\u062A\u0627\u0641 \u0648\u0630\u0631\u0627\u0639\u0627\u0646", nameEn: "Shoulders & Arms", exerciseIds: ["shoulder-press-machine", "rear-delt-row-machine", "lateral-raise-machine", "preacher-curl-machine", "triceps-extension-machine"] },
      { id: "arnold-d6", nameAr: "\u0623\u0631\u062C\u0644", nameEn: "Legs", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] }
    ]
  },
  {
    id: "ppl-3",
    nameAr: "\u062F\u0641\u0639 / \u0633\u062D\u0628 / \u0623\u0631\u062C\u0644 \u2014 \u0663 \u0623\u064A\u0627\u0645",
    nameEn: "Push / Pull / Legs \u2014 3 Days",
    descriptionAr: "\u062F\u0648\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0623\u0633\u0628\u0648\u0639\u064A\u064B\u0627: \u064A\u0648\u0645 \u062F\u0641\u0639\u060C \u064A\u0648\u0645 \u0633\u062D\u0628\u060C \u064A\u0648\u0645 \u0623\u0631\u062C\u0644.",
    descriptionEn: "One cycle a week \u2014 a push day, a pull day, and a legs day.",
    recommendedFor: "\u0645\u062A\u0648\u0633\u0637",
    days: [
      { id: "ppl-3-push", nameAr: "\u062F\u0641\u0639", nameEn: "Push", exerciseIds: ["incline-chest-press-machine", "chest-press-machine", "shoulder-press-machine", "pec-deck-machine", "lateral-raise-machine", "triceps-extension-machine"] },
      { id: "ppl-3-pull", nameAr: "\u0633\u062D\u0628", nameEn: "Pull", exerciseIds: ["lat-pulldown-machine", "chest-supported-row-machine", "rear-delt-row-machine", "preacher-curl-machine"] },
      { id: "ppl-3-legs", nameAr: "\u0623\u0631\u062C\u0644", nameEn: "Legs", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] }
    ]
  },
  {
    id: "ppl-6",
    nameAr: "\u062F\u0641\u0639 / \u0633\u062D\u0628 / \u0623\u0631\u062C\u0644 \u2014 \u0666 \u0623\u064A\u0627\u0645",
    nameEn: "Push / Pull / Legs \u2014 6 Days",
    descriptionAr: "\u0646\u0641\u0633 \u0628\u0631\u0646\u0627\u0645\u062C \u0627\u0644\u062F\u0641\u0639/\u0627\u0644\u0633\u062D\u0628/\u0627\u0644\u0623\u0631\u062C\u0644 \u0628\u062F\u0648\u0631\u062A\u064A\u0646 \u0623\u0633\u0628\u0648\u0639\u064A\u064B\u0627 \u0644\u062A\u0643\u0631\u0627\u0631 \u0623\u0639\u0644\u0649.",
    descriptionEn: "The same Push/Pull/Legs program run twice a week for higher frequency.",
    recommendedFor: "\u0645\u062A\u0642\u062F\u0651\u0645",
    days: [
      { id: "ppl-6-push-1", nameAr: "\u062F\u0641\u0639", nameEn: "Push", exerciseIds: ["incline-chest-press-machine", "chest-press-machine", "shoulder-press-machine", "pec-deck-machine", "lateral-raise-machine", "triceps-extension-machine"] },
      { id: "ppl-6-pull-1", nameAr: "\u0633\u062D\u0628", nameEn: "Pull", exerciseIds: ["lat-pulldown-machine", "chest-supported-row-machine", "rear-delt-row-machine", "preacher-curl-machine"] },
      { id: "ppl-6-legs-1", nameAr: "\u0623\u0631\u062C\u0644", nameEn: "Legs", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] },
      { id: "ppl-6-push-2", nameAr: "\u062F\u0641\u0639", nameEn: "Push", exerciseIds: ["incline-chest-press-machine", "chest-press-machine", "shoulder-press-machine", "pec-deck-machine", "lateral-raise-machine", "triceps-extension-machine"] },
      { id: "ppl-6-pull-2", nameAr: "\u0633\u062D\u0628", nameEn: "Pull", exerciseIds: ["lat-pulldown-machine", "chest-supported-row-machine", "rear-delt-row-machine", "preacher-curl-machine"] },
      { id: "ppl-6-legs-2", nameAr: "\u0623\u0631\u062C\u0644", nameEn: "Legs", exerciseIds: ["leg-press-machine", "glute-machine", "seated-leg-curl", "leg-extension-machine", "hip-abduction-machine", "seated-calf-raise-machine"] }
    ]
  },
  {
    // ليس برنامجًا — هيكل «البنّاء المخصّص»: يوم فارغ يُضيف منه المستخدم تمارينه من المكتبة (يشمل الكيبل).
    id: "custom",
    nameAr: "\u0645\u062E\u0635\u0651\u0635",
    nameEn: "Custom",
    descriptionAr: "\u0627\u0628\u062F\u0623 \u0645\u0646 \u064A\u0648\u0645 \u0641\u0627\u0631\u063A \u0648\u0623\u0636\u0641 \u062A\u0645\u0627\u0631\u064A\u0646\u0643 \u0645\u0646 \u0627\u0644\u0645\u0643\u062A\u0628\u0629 \u0628\u0646\u0641\u0633\u0643.",
    descriptionEn: "Start from an empty day and add exercises from the library yourself.",
    recommendedFor: "\u0627\u0644\u0643\u0644",
    days: [{ id: "custom-d1", nameAr: "\u062A\u0645\u0631\u064A\u0646", nameEn: "Workout", exerciseIds: [] }]
  }
];
var templateMap = Object.fromEntries(
  workoutTemplates.map((t) => [t.id, t])
);
function getTemplate(id) {
  return templateMap[id];
}

// src/data/mealTemplates.ts
var mealTemplates = [
  { id: "high-protein-breakfast", nameAr: "\u0641\u0637\u0648\u0631 \u0639\u0627\u0644\u064A \u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0646", nameEn: "High-Protein Breakfast", mealType: "breakfast", ingredientIds: ["eggs", "egg-whites", "arabic-bread", "mixed-salad"], defaultServings: { eggs: 3, "egg-whites": 2, "arabic-bread": 1, "mixed-salad": 1 } },
  { id: "eggs-and-bread", nameAr: "\u0628\u064A\u0636 \u0648\u062E\u0628\u0632", nameEn: "Eggs & Bread", mealType: "breakfast", ingredientIds: ["eggs", "white-bread", "olive-oil"], defaultServings: { eggs: 2, "white-bread": 2, "olive-oil": 1 } },
  { id: "oats-and-whey", nameAr: "\u0634\u0648\u0641\u0627\u0646 \u0648\u0648\u0627\u064A", nameEn: "Oats & Whey", mealType: "breakfast", ingredientIds: ["oats", "whey-protein", "banana", "peanut-butter"], defaultServings: { oats: 1, "whey-protein": 1, banana: 1, "peanut-butter": 1 } },
  { id: "light-yogurt-oats", nameAr: "\u0632\u0628\u0627\u062F\u064A \u0648\u0634\u0648\u0641\u0627\u0646", nameEn: "Yogurt & Oats", mealType: "breakfast", ingredientIds: ["greek-yogurt", "oats", "strawberry"], defaultServings: { "greek-yogurt": 1, oats: 1, strawberry: 1 } },
  { id: "fava-bread-breakfast", nameAr: "\u0641\u0648\u0644 \u0648\u062E\u0628\u0632", nameEn: "Fava & Bread", mealType: "breakfast", ingredientIds: ["fava-beans", "arabic-bread", "olive-oil", "tomato"], defaultServings: { "fava-beans": 1, "arabic-bread": 1, "olive-oil": 1, tomato: 1 } },
  { id: "chicken-rice", nameAr: "\u062F\u062C\u0627\u062C \u0648\u0623\u0631\u0632", nameEn: "Chicken & Rice", mealType: "lunch", ingredientIds: ["chicken-breast", "white-rice", "mixed-vegetables", "olive-oil"], defaultServings: { "chicken-breast": 2, "white-rice": 1, "mixed-vegetables": 1, "olive-oil": 1 } },
  { id: "beef-rice", nameAr: "\u0644\u062D\u0645 \u0648\u0623\u0631\u0632", nameEn: "Beef & Rice", mealType: "lunch", ingredientIds: ["lean-beef", "brown-rice", "mixed-salad"], defaultServings: { "lean-beef": 2, "brown-rice": 1, "mixed-salad": 1 } },
  { id: "kabsa-chicken", nameAr: "\u0643\u0628\u0633\u0629 \u062F\u062C\u0627\u062C", nameEn: "Chicken Kabsa", mealType: "lunch", ingredientIds: ["kabsa-rice", "chicken-breast", "mixed-salad"], defaultServings: { "kabsa-rice": 2, "chicken-breast": 2, "mixed-salad": 1 } },
  { id: "shrimp-rice", nameAr: "\u0631\u0648\u0628\u064A\u0627\u0646 \u0648\u0623\u0631\u0632", nameEn: "Shrimp & Rice", mealType: "lunch", ingredientIds: ["shrimp", "white-rice", "broccoli"], defaultServings: { shrimp: 2, "white-rice": 1, broccoli: 1 } },
  { id: "chicken-sweet-potato", nameAr: "\u062F\u062C\u0627\u062C \u0648\u0628\u0637\u0627\u0637\u0627", nameEn: "Chicken & Sweet Potato", mealType: "lunch", ingredientIds: ["chicken-breast", "sweet-potato", "broccoli"], defaultServings: { "chicken-breast": 2, "sweet-potato": 1, broccoli: 1 } },
  { id: "turkey-wrap", nameAr: "\u0631\u0627\u0628 \u062F\u064A\u0643 \u0631\u0648\u0645\u064A", nameEn: "Turkey Wrap", mealType: "lunch", ingredientIds: ["turkey-breast", "arabic-bread", "mixed-salad"], defaultServings: { "turkey-breast": 2, "arabic-bread": 1, "mixed-salad": 1 } },
  { id: "tuna-sandwich", nameAr: "\u0633\u0646\u062F\u0648\u064A\u062A\u0634 \u062A\u0648\u0646\u0629", nameEn: "Tuna Sandwich", mealType: "snack", ingredientIds: ["tuna", "brown-bread", "cucumber"], defaultServings: { tuna: 1, "brown-bread": 2, cucumber: 1 } },
  { id: "greek-yogurt-snack", nameAr: "\u0633\u0646\u0627\u0643 \u0632\u0628\u0627\u062F\u064A", nameEn: "Greek Yogurt Snack", mealType: "snack", ingredientIds: ["greek-yogurt", "mixed-nuts", "honey"], defaultServings: { "greek-yogurt": 1, "mixed-nuts": 1, honey: 1 } },
  { id: "cottage-fruit", nameAr: "\u062C\u0628\u0646 \u0642\u0631\u064A\u0634 \u0648\u0641\u0627\u0643\u0647\u0629", nameEn: "Cottage & Fruit", mealType: "snack", ingredientIds: ["cottage-cheese", "apple", "almonds"], defaultServings: { "cottage-cheese": 1, apple: 1, almonds: 1 } },
  { id: "nuts-dates-snack", nameAr: "\u0645\u0643\u0633\u0631\u0627\u062A \u0648\u062A\u0645\u0631", nameEn: "Nuts & Dates", mealType: "snack", ingredientIds: ["mixed-nuts", "dates"], defaultServings: { "mixed-nuts": 1, dates: 3 } },
  { id: "pre-workout-snack", nameAr: "\u0633\u0646\u0627\u0643 \u0642\u0628\u0644 \u0627\u0644\u062A\u0645\u0631\u064A\u0646", nameEn: "Pre-Workout Snack", mealType: "pre_workout", ingredientIds: ["banana", "coffee", "dates"], defaultServings: { banana: 1, coffee: 1, dates: 3 } },
  { id: "post-workout-meal", nameAr: "\u0648\u062C\u0628\u0629 \u0628\u0639\u062F \u0627\u0644\u062A\u0645\u0631\u064A\u0646", nameEn: "Post-Workout Meal", mealType: "post_workout", ingredientIds: ["whey-protein", "white-rice", "chicken-breast"], defaultServings: { "whey-protein": 1, "white-rice": 1, "chicken-breast": 1 } },
  { id: "protein-shake", nameAr: "\u0634\u064A\u0643 \u0628\u0631\u0648\u062A\u064A\u0646", nameEn: "Protein Shake", mealType: "post_workout", ingredientIds: ["whey-protein", "milk", "banana"], defaultServings: { "whey-protein": 1, milk: 1, banana: 1 } },
  { id: "light-dinner", nameAr: "\u0639\u0634\u0627\u0621 \u062E\u0641\u064A\u0641", nameEn: "Light Dinner", mealType: "dinner", ingredientIds: ["salmon", "mixed-salad", "sweet-potato"], defaultServings: { salmon: 1, "mixed-salad": 1, "sweet-potato": 1 } },
  { id: "salmon-quinoa", nameAr: "\u0633\u0644\u0645\u0648\u0646 \u0648\u0643\u064A\u0646\u0648\u0627", nameEn: "Salmon & Quinoa", mealType: "dinner", ingredientIds: ["salmon", "quinoa", "spinach"], defaultServings: { salmon: 1, quinoa: 1, spinach: 1 } },
  // — وجبات نباتية/نباتية صرفة (تُستخدم عند اختيار نمط أكل نباتي في الإعداد) —
  { id: "lentil-rice-bowl", nameAr: "\u0639\u062F\u0633 \u0648\u0623\u0631\u0632", nameEn: "Lentils & Rice", mealType: "lunch", ingredientIds: ["lentils", "brown-rice", "mixed-salad", "olive-oil"], defaultServings: { lentils: 1, "brown-rice": 1, "mixed-salad": 1, "olive-oil": 1 } },
  { id: "chickpea-quinoa-bowl", nameAr: "\u062D\u0645\u0651\u0635 \u0648\u0643\u064A\u0646\u0648\u0627", nameEn: "Chickpea & Quinoa Bowl", mealType: "lunch", ingredientIds: ["chickpeas", "quinoa", "mixed-vegetables", "olive-oil"], defaultServings: { chickpeas: 1, quinoa: 1, "mixed-vegetables": 1, "olive-oil": 1 } },
  { id: "tofu-veggie-rice", nameAr: "\u062A\u0648\u0641\u0648 \u0648\u062E\u0636\u0627\u0631 \u0648\u0623\u0631\u0632", nameEn: "Tofu, Veggies & Rice", mealType: "dinner", ingredientIds: ["tofu", "mixed-vegetables", "brown-rice"], defaultServings: { tofu: 2, "mixed-vegetables": 1, "brown-rice": 1 } },
  { id: "lentil-soup-bread", nameAr: "\u0634\u0648\u0631\u0628\u0629 \u0639\u062F\u0633 \u0648\u062E\u0628\u0632", nameEn: "Lentil Soup & Bread", mealType: "dinner", ingredientIds: ["lentils", "arabic-bread", "mixed-salad"], defaultServings: { lentils: 1, "arabic-bread": 1, "mixed-salad": 1 } },
  { id: "veggie-omelet", nameAr: "\u0623\u0648\u0645\u0644\u064A\u062A \u062E\u0636\u0627\u0631", nameEn: "Veggie Omelet", mealType: "breakfast", ingredientIds: ["eggs", "mixed-vegetables", "feta-cheese"], defaultServings: { eggs: 3, "mixed-vegetables": 1, "feta-cheese": 1 } },
  { id: "tofu-scramble", nameAr: "\u062A\u0648\u0641\u0648 \u0645\u0642\u0644\u0651\u0628 \u0648\u062E\u0628\u0632", nameEn: "Tofu Scramble & Bread", mealType: "breakfast", ingredientIds: ["tofu", "mixed-vegetables", "brown-bread"], defaultServings: { tofu: 2, "mixed-vegetables": 1, "brown-bread": 2 } }
];
var mealTemplateMap = Object.fromEntries(
  mealTemplates.map((t) => [t.id, t])
);
function getMealTemplate(id) {
  return mealTemplateMap[id];
}

// src/lib/workoutDayLabel.ts
var AR_DISAMBIG = /\s+(?:هـ|[أبجدوزه]|[٠-٩0-9]+)$/;
var EN_DISAMBIG = /\s+(?:[A-Ga-g]|\d+)$/;
function splitBaseAr(nameAr) {
  let s = (nameAr ?? "").trim();
  s = s.replace(/^اليوم\s+/, "");
  while (AR_DISAMBIG.test(s)) s = s.replace(AR_DISAMBIG, "").trim();
  return s || "\u062A\u0645\u0631\u064A\u0646";
}
function splitBaseEn(nameEn) {
  let s = (nameEn ?? "").trim();
  s = s.replace(/^Day\s+/i, "");
  while (EN_DISAMBIG.test(s)) s = s.replace(EN_DISAMBIG, "").trim();
  return s || "Workout";
}
function workoutDayNameAr(splitNameAr, index) {
  return `\u0627\u0644\u064A\u0648\u0645 ${index + 1} \xB7 ${splitBaseAr(splitNameAr)}`;
}
function workoutDayNameEn(splitNameEn, index) {
  return `Day ${index + 1} \xB7 ${splitBaseEn(splitNameEn)}`;
}

// src/data/mealIngredients.ts
function ing(i) {
  return {
    id: i.id,
    nameAr: i.nameAr,
    nameEn: i.nameEn,
    category: i.category,
    servingLabelAr: i.servingAr,
    servingLabelEn: i.servingEn,
    calories: i.cal,
    protein: i.p,
    carbs: i.c,
    fat: i.f
  };
}
var mealIngredients = [
  // ===== بروتين =====
  ing({ id: "chicken-breast", nameAr: "\u0635\u062F\u0631 \u062F\u062C\u0627\u062C", nameEn: "Chicken Breast", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 165, p: 31, c: 0, f: 4 }),
  ing({ id: "lean-beef", nameAr: "\u0644\u062D\u0645 \u0628\u0642\u0631\u064A \u0642\u0644\u064A\u0644 \u0627\u0644\u062F\u0647\u0646", nameEn: "Lean Beef", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 180, p: 26, c: 0, f: 8 }),
  ing({ id: "ground-beef-lean", nameAr: "\u0644\u062D\u0645 \u0645\u0641\u0631\u0648\u0645 \u0642\u0644\u064A\u0644 \u0627\u0644\u062F\u0647\u0646", nameEn: "Lean Ground Beef", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 200, p: 26, c: 0, f: 11 }),
  ing({ id: "eggs", nameAr: "\u0628\u064A\u0636", nameEn: "Eggs", category: "protein", servingAr: "\u0628\u064A\u0636\u0629", servingEn: "1 egg", cal: 78, p: 6, c: 1, f: 5 }),
  ing({ id: "egg-whites", nameAr: "\u0628\u064A\u0627\u0636 \u0628\u064A\u0636", nameEn: "Egg Whites", category: "protein", servingAr: "\u0628\u064A\u0627\u0636 \u0628\u064A\u0636\u0629", servingEn: "1 white", cal: 17, p: 4, c: 0, f: 0 }),
  ing({ id: "tuna", nameAr: "\u062A\u0648\u0646\u0629 (\u0645\u0627\u0621)", nameEn: "Tuna (water)", category: "protein", servingAr: "\u0639\u0644\u0628\u0629", servingEn: "1 can", cal: 110, p: 25, c: 0, f: 1 }),
  ing({ id: "salmon", nameAr: "\u0633\u0644\u0645\u0648\u0646", nameEn: "Salmon", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 208, p: 20, c: 0, f: 13 }),
  ing({ id: "shrimp", nameAr: "\u0631\u0648\u0628\u064A\u0627\u0646", nameEn: "Shrimp", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 99, p: 24, c: 0, f: 1 }),
  ing({ id: "turkey-breast", nameAr: "\u0635\u062F\u0631 \u062F\u064A\u0643 \u0631\u0648\u0645\u064A", nameEn: "Turkey Breast", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 135, p: 30, c: 0, f: 1 }),
  ing({ id: "whey-protein", nameAr: "\u0648\u0627\u064A \u0628\u0631\u0648\u062A\u064A\u0646", nameEn: "Whey Protein", category: "protein", servingAr: "\u0645\u0643\u064A\u0627\u0644", servingEn: "1 scoop", cal: 120, p: 24, c: 3, f: 1 }),
  ing({ id: "lentils", nameAr: "\u0639\u062F\u0633", nameEn: "Lentils", category: "protein", servingAr: "\u0643\u0648\u0628 \u0645\u0637\u0628\u0648\u062E", servingEn: "1 cup", cal: 230, p: 18, c: 40, f: 1 }),
  ing({ id: "chickpeas", nameAr: "\u062D\u0645\u0651\u0635 \u062D\u0628", nameEn: "Chickpeas", category: "protein", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 269, p: 15, c: 45, f: 4 }),
  ing({ id: "fava-beans", nameAr: "\u0641\u0648\u0644", nameEn: "Fava Beans", category: "protein", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 187, p: 13, c: 33, f: 1 }),
  ing({ id: "tofu", nameAr: "\u062A\u0648\u0641\u0648", nameEn: "Tofu", category: "protein", servingAr: "100\u063A", servingEn: "100g", cal: 120, p: 13, c: 3, f: 7 }),
  // ===== كربوهيدرات =====
  ing({ id: "white-rice", nameAr: "\u0623\u0631\u0632 \u0623\u0628\u064A\u0636", nameEn: "White Rice", category: "carb", servingAr: "\u0643\u0648\u0628 \u0645\u0637\u0628\u0648\u062E", servingEn: "1 cup", cal: 205, p: 4, c: 45, f: 0 }),
  ing({ id: "brown-rice", nameAr: "\u0623\u0631\u0632 \u0628\u0646\u064A", nameEn: "Brown Rice", category: "carb", servingAr: "\u0643\u0648\u0628 \u0645\u0637\u0628\u0648\u062E", servingEn: "1 cup", cal: 216, p: 5, c: 45, f: 2 }),
  ing({ id: "kabsa-rice", nameAr: "\u0623\u0631\u0632 \u0643\u0628\u0633\u0629", nameEn: "Kabsa Rice", category: "carb", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 250, p: 5, c: 46, f: 5 }),
  ing({ id: "potato", nameAr: "\u0628\u0637\u0627\u0637\u0633", nameEn: "Potato", category: "carb", servingAr: "\u062D\u0628\u0629 \u0645\u062A\u0648\u0633\u0637\u0629", servingEn: "1 medium", cal: 161, p: 4, c: 37, f: 0 }),
  ing({ id: "sweet-potato", nameAr: "\u0628\u0637\u0627\u0637\u0627 \u062D\u0644\u0648\u0629", nameEn: "Sweet Potato", category: "carb", servingAr: "\u062D\u0628\u0629", servingEn: "1 medium", cal: 112, p: 2, c: 26, f: 0 }),
  ing({ id: "oats", nameAr: "\u0634\u0648\u0641\u0627\u0646", nameEn: "Oats", category: "carb", servingAr: "\u0646\u0635\u0641 \u0643\u0648\u0628 \u062C\u0627\u0641", servingEn: "\xBD cup dry", cal: 150, p: 5, c: 27, f: 3 }),
  ing({ id: "white-bread", nameAr: "\u062E\u0628\u0632 \u0623\u0628\u064A\u0636", nameEn: "White Bread", category: "carb", servingAr: "\u0634\u0631\u064A\u062D\u0629", servingEn: "1 slice", cal: 75, p: 3, c: 14, f: 1 }),
  ing({ id: "brown-bread", nameAr: "\u062E\u0628\u0632 \u0623\u0633\u0645\u0631", nameEn: "Brown Bread", category: "carb", servingAr: "\u0634\u0631\u064A\u062D\u0629", servingEn: "1 slice", cal: 80, p: 4, c: 14, f: 1 }),
  ing({ id: "arabic-bread", nameAr: "\u062E\u0628\u0632 \u0639\u0631\u0628\u064A", nameEn: "Arabic Bread", category: "carb", servingAr: "\u0631\u063A\u064A\u0641", servingEn: "1 loaf", cal: 165, p: 5, c: 33, f: 1 }),
  ing({ id: "pasta", nameAr: "\u0645\u0639\u0643\u0631\u0648\u0646\u0629", nameEn: "Pasta", category: "carb", servingAr: "\u0643\u0648\u0628 \u0645\u0637\u0628\u0648\u062E", servingEn: "1 cup", cal: 200, p: 7, c: 42, f: 1 }),
  ing({ id: "dates", nameAr: "\u062A\u0645\u0631", nameEn: "Dates", category: "carb", servingAr: "\u062A\u0645\u0631\u0629", servingEn: "1 date", cal: 20, p: 0, c: 5, f: 0 }),
  ing({ id: "honey", nameAr: "\u0639\u0633\u0644", nameEn: "Honey", category: "carb", servingAr: "\u0645\u0644\u0639\u0642\u0629", servingEn: "1 tbsp", cal: 64, p: 0, c: 17, f: 0 }),
  ing({ id: "bulgur", nameAr: "\u0628\u0631\u063A\u0644", nameEn: "Bulgur", category: "carb", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 150, p: 6, c: 34, f: 0 }),
  ing({ id: "cornflakes", nameAr: "\u0643\u0648\u0631\u0646 \u0641\u0644\u064A\u0643\u0633", nameEn: "Cornflakes", category: "carb", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 100, p: 2, c: 24, f: 0 }),
  ing({ id: "quinoa", nameAr: "\u0643\u064A\u0646\u0648\u0627", nameEn: "Quinoa", category: "carb", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 222, p: 8, c: 39, f: 4 }),
  // ===== دهون =====
  ing({ id: "olive-oil", nameAr: "\u0632\u064A\u062A \u0632\u064A\u062A\u0648\u0646", nameEn: "Olive Oil", category: "fat", servingAr: "\u0645\u0644\u0639\u0642\u0629", servingEn: "1 tbsp", cal: 119, p: 0, c: 0, f: 14 }),
  ing({ id: "mixed-nuts", nameAr: "\u0645\u0643\u0633\u0631\u0627\u062A \u0645\u0634\u0643\u0651\u0644\u0629", nameEn: "Mixed Nuts", category: "fat", servingAr: "\u062D\u0641\u0646\u0629 30\u063A", servingEn: "30g", cal: 180, p: 5, c: 6, f: 16 }),
  ing({ id: "almonds", nameAr: "\u0644\u0648\u0632", nameEn: "Almonds", category: "fat", servingAr: "20 \u062D\u0628\u0629", servingEn: "20 nuts", cal: 140, p: 5, c: 5, f: 12 }),
  ing({ id: "peanut-butter", nameAr: "\u0632\u0628\u062F\u0629 \u0641\u0648\u0644 \u0633\u0648\u062F\u0627\u0646\u064A", nameEn: "Peanut Butter", category: "fat", servingAr: "\u0645\u0644\u0639\u0642\u0629", servingEn: "1 tbsp", cal: 94, p: 4, c: 3, f: 8 }),
  ing({ id: "avocado", nameAr: "\u0623\u0641\u0648\u0643\u0627\u062F\u0648", nameEn: "Avocado", category: "fat", servingAr: "\u0646\u0635\u0641 \u062B\u0645\u0631\u0629", servingEn: "\xBD fruit", cal: 120, p: 1, c: 6, f: 11 }),
  ing({ id: "tahini", nameAr: "\u0637\u062D\u064A\u0646\u0629", nameEn: "Tahini", category: "fat", servingAr: "\u0645\u0644\u0639\u0642\u0629", servingEn: "1 tbsp", cal: 89, p: 3, c: 3, f: 8 }),
  ing({ id: "butter", nameAr: "\u0632\u0628\u062F\u0629", nameEn: "Butter", category: "fat", servingAr: "\u0645\u0644\u0639\u0642\u0629 \u0635\u063A\u064A\u0631\u0629", servingEn: "1 tsp", cal: 36, p: 0, c: 0, f: 4 }),
  // ===== خضار =====
  ing({ id: "mixed-salad", nameAr: "\u0633\u0644\u0637\u0629 \u062E\u0636\u0631\u0627\u0621", nameEn: "Mixed Salad", category: "vegetable", servingAr: "\u0637\u0628\u0642", servingEn: "1 plate", cal: 50, p: 2, c: 10, f: 0 }),
  ing({ id: "cucumber", nameAr: "\u062E\u064A\u0627\u0631", nameEn: "Cucumber", category: "vegetable", servingAr: "\u062D\u0628\u0629", servingEn: "1 piece", cal: 16, p: 1, c: 4, f: 0 }),
  ing({ id: "tomato", nameAr: "\u0637\u0645\u0627\u0637\u0645", nameEn: "Tomato", category: "vegetable", servingAr: "\u062D\u0628\u0629", servingEn: "1 piece", cal: 22, p: 1, c: 5, f: 0 }),
  ing({ id: "broccoli", nameAr: "\u0628\u0631\u0648\u0643\u0644\u064A", nameEn: "Broccoli", category: "vegetable", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 55, p: 4, c: 11, f: 0 }),
  ing({ id: "mixed-vegetables", nameAr: "\u062E\u0636\u0627\u0631 \u0645\u0634\u0643\u0651\u0644\u0629", nameEn: "Mixed Vegetables", category: "vegetable", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 70, p: 3, c: 13, f: 0 }),
  ing({ id: "spinach", nameAr: "\u0633\u0628\u0627\u0646\u062E", nameEn: "Spinach", category: "vegetable", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 7, p: 1, c: 1, f: 0 }),
  ing({ id: "carrots", nameAr: "\u062C\u0632\u0631", nameEn: "Carrots", category: "vegetable", servingAr: "\u062D\u0628\u0629", servingEn: "1 piece", cal: 25, p: 1, c: 6, f: 0 }),
  // ===== فواكه =====
  ing({ id: "banana", nameAr: "\u0645\u0648\u0632", nameEn: "Banana", category: "fruit", servingAr: "\u062D\u0628\u0629", servingEn: "1 piece", cal: 105, p: 1, c: 27, f: 0 }),
  ing({ id: "apple", nameAr: "\u062A\u0641\u0627\u062D", nameEn: "Apple", category: "fruit", servingAr: "\u062D\u0628\u0629", servingEn: "1 piece", cal: 95, p: 0, c: 25, f: 0 }),
  ing({ id: "orange", nameAr: "\u0628\u0631\u062A\u0642\u0627\u0644", nameEn: "Orange", category: "fruit", servingAr: "\u062D\u0628\u0629", servingEn: "1 piece", cal: 62, p: 1, c: 15, f: 0 }),
  ing({ id: "grapes", nameAr: "\u0639\u0646\u0628", nameEn: "Grapes", category: "fruit", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 104, p: 1, c: 27, f: 0 }),
  ing({ id: "watermelon", nameAr: "\u0628\u0637\u064A\u062E", nameEn: "Watermelon", category: "fruit", servingAr: "\u0634\u0631\u064A\u062D\u0629", servingEn: "1 slice", cal: 86, p: 2, c: 22, f: 0 }),
  ing({ id: "strawberry", nameAr: "\u0641\u0631\u0627\u0648\u0644\u0629", nameEn: "Strawberry", category: "fruit", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 49, p: 1, c: 12, f: 0 }),
  // ===== ألبان =====
  ing({ id: "milk", nameAr: "\u062D\u0644\u064A\u0628 \u0642\u0644\u064A\u0644 \u0627\u0644\u062F\u0633\u0645", nameEn: "Low-Fat Milk", category: "dairy", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 103, p: 8, c: 12, f: 2 }),
  ing({ id: "greek-yogurt", nameAr: "\u0632\u0628\u0627\u062F\u064A \u064A\u0648\u0646\u0627\u0646\u064A", nameEn: "Greek Yogurt", category: "dairy", servingAr: "\u0639\u0644\u0628\u0629 170\u063A", servingEn: "170g", cal: 100, p: 17, c: 6, f: 0 }),
  ing({ id: "laban", nameAr: "\u0644\u0628\u0646", nameEn: "Laban", category: "dairy", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 80, p: 4, c: 10, f: 3 }),
  ing({ id: "labneh", nameAr: "\u0644\u0628\u0646\u0629", nameEn: "Labneh", category: "dairy", servingAr: "\u0645\u0644\u0639\u0642\u062A\u0627\u0646", servingEn: "2 tbsp", cal: 60, p: 3, c: 2, f: 4 }),
  ing({ id: "feta-cheese", nameAr: "\u062C\u0628\u0646 \u0641\u064A\u062A\u0627", nameEn: "Feta Cheese", category: "dairy", servingAr: "30\u063A", servingEn: "30g", cal: 80, p: 4, c: 1, f: 6 }),
  ing({ id: "cottage-cheese", nameAr: "\u062C\u0628\u0646 \u0642\u0631\u064A\u0634", nameEn: "Cottage Cheese", category: "dairy", servingAr: "\u0646\u0635\u0641 \u0643\u0648\u0628", servingEn: "\xBD cup", cal: 90, p: 12, c: 4, f: 3 }),
  // ===== مشروبات =====
  ing({ id: "water", nameAr: "\u0645\u0627\u0621", nameEn: "Water", category: "drink", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 0, p: 0, c: 0, f: 0 }),
  ing({ id: "coffee", nameAr: "\u0642\u0647\u0648\u0629 (\u0633\u0627\u062F\u0629)", nameEn: "Coffee (black)", category: "drink", servingAr: "\u0641\u0646\u062C\u0627\u0646", servingEn: "1 cup", cal: 2, p: 0, c: 0, f: 0 }),
  ing({ id: "tea", nameAr: "\u0634\u0627\u064A (\u0633\u0627\u062F\u0629)", nameEn: "Tea (plain)", category: "drink", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 2, p: 0, c: 0, f: 0 }),
  ing({ id: "orange-juice", nameAr: "\u0639\u0635\u064A\u0631 \u0628\u0631\u062A\u0642\u0627\u0644", nameEn: "Orange Juice", category: "drink", servingAr: "\u0643\u0648\u0628", servingEn: "1 cup", cal: 112, p: 2, c: 26, f: 0 }),
  // ===== أخرى =====
  ing({ id: "dark-chocolate", nameAr: "\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u062F\u0627\u0643\u0646\u0629", nameEn: "Dark Chocolate", category: "other", servingAr: "\u0645\u0631\u0628\u0639\u0627\u0646 20\u063A", servingEn: "20g", cal: 120, p: 2, c: 9, f: 9 }),
  ing({ id: "hummus", nameAr: "\u062D\u0645\u0651\u0635 \u0628\u0637\u062D\u064A\u0646\u0629", nameEn: "Hummus", category: "other", servingAr: "\u0645\u0644\u0639\u0642\u062A\u0627\u0646", servingEn: "2 tbsp", cal: 70, p: 2, c: 6, f: 5 })
];
var ingredientMap = Object.fromEntries(
  mealIngredients.map((i) => [i.id, i])
);
function getIngredient(id) {
  return ingredientMap[id];
}

// src/lib/dietFilter.ts
var MEAT_IDS = /* @__PURE__ */ new Set(["chicken-breast", "lean-beef", "ground-beef-lean", "turkey-breast"]);
var FISH_IDS = /* @__PURE__ */ new Set(["tuna", "salmon", "shrimp"]);
var EGG_IDS = /* @__PURE__ */ new Set(["eggs", "egg-whites"]);
var DAIRY_IDS = /* @__PURE__ */ new Set([
  "whey-protein",
  "milk",
  "greek-yogurt",
  "laban",
  "labneh",
  "feta-cheese",
  "cottage-cheese",
  "butter"
]);
var HONEY_IDS = /* @__PURE__ */ new Set(["honey"]);
function ingredientSource(ingredientId) {
  if (MEAT_IDS.has(ingredientId)) return "meat";
  if (FISH_IDS.has(ingredientId)) return "fish";
  if (EGG_IDS.has(ingredientId)) return "egg";
  if (DAIRY_IDS.has(ingredientId)) return "dairy";
  if (HONEY_IDS.has(ingredientId)) return "honey";
  return "plant";
}
function dietAllowsSource(pattern, source) {
  switch (pattern) {
    case "vegetarian":
      return source !== "meat" && source !== "fish";
    case "vegan":
      return source === "plant";
    case "pescatarian":
      return source !== "meat";
    // بدون قيود / قليل كارب / كيتو / غير محدّد: لا إقصاء بالمصدر.
    default:
      return true;
  }
}
function ingredientAllowedForDiet(ingredientId, pattern) {
  return dietAllowsSource(pattern, ingredientSource(ingredientId));
}
function allIngredientsAllowed(ingredientIds, pattern) {
  return ingredientIds.every((id) => ingredientAllowedForDiet(id, pattern));
}
function templateAllowedForDiet(template, pattern) {
  return allIngredientsAllowed(template.ingredientIds, pattern);
}
function dietRestrictsSources(pattern) {
  return pattern === "vegetarian" || pattern === "vegan" || pattern === "pescatarian";
}

// src/lib/nutritionPlan.ts
var round2 = (n) => Math.round(n);
function computeMealMacros(ingredients) {
  return ingredients.reduce(
    (acc, mi) => {
      const ing2 = getIngredient(mi.ingredientId);
      if (!ing2) return acc;
      const s = mi.servings || 0;
      return {
        calories: acc.calories + ing2.calories * s,
        protein: acc.protein + ing2.protein * s,
        carbs: acc.carbs + ing2.carbs * s,
        fat: acc.fat + ing2.fat * s
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
function createPlanMealFromTemplate(templateId, order) {
  const tpl = getMealTemplate(templateId);
  if (!tpl) return createEmptyMeal(order);
  const ingredients = tpl.ingredientIds.map((id) => ({
    ingredientId: id,
    servings: tpl.defaultServings?.[id] ?? 1
  }));
  const m = computeMealMacros(ingredients);
  return {
    id: `meal-${tpl.id}-${order}`,
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    mealType: tpl.mealType,
    ingredients,
    calories: round2(m.calories),
    protein: round2(m.protein),
    carbs: round2(m.carbs),
    fat: round2(m.fat),
    notes: "",
    order
  };
}
function createEmptyMeal(order, id) {
  return {
    id: id ?? `meal-custom-${order}`,
    nameAr: "\u0648\u062C\u0628\u0629 \u062C\u062F\u064A\u062F\u0629",
    nameEn: "New meal",
    mealType: "snack",
    ingredients: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    notes: "",
    order
  };
}
function planTotals(meals) {
  return meals.reduce(
    (a, m) => ({
      calories: a.calories + m.calories,
      protein: a.protein + m.protein,
      carbs: a.carbs + m.carbs,
      fat: a.fat + m.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

// src/data/commitmentLibrary.ts
function c(i) {
  return {
    id: i.id,
    nameAr: i.nameAr,
    nameEn: i.nameEn,
    category: i.category,
    frequency: i.frequency ?? "daily",
    descriptionAr: i.descAr,
    descriptionEn: i.descEn
  };
}
var commitmentLibrary = [
  // تمرين
  c({ id: "today-workout", nameAr: "\u062A\u0645\u0631\u064A\u0646 \u0627\u0644\u064A\u0648\u0645", nameEn: "Today workout", category: "training" }),
  c({ id: "cardio", nameAr: "\u0643\u0627\u0631\u062F\u064A\u0648", nameEn: "Cardio", category: "training" }),
  c({ id: "warm-up", nameAr: "\u0625\u062D\u0645\u0627\u0621", nameEn: "Warm-up", category: "training" }),
  c({ id: "cooldown", nameAr: "\u062A\u0647\u062F\u0626\u0629", nameEn: "Cooldown", category: "training" }),
  c({ id: "stretching", nameAr: "\u0625\u0637\u0627\u0644\u0629", nameEn: "Stretching", category: "training" }),
  c({ id: "mobility", nameAr: "\u062A\u0645\u0627\u0631\u064A\u0646 \u0645\u0631\u0648\u0646\u0629", nameEn: "Mobility", category: "training" }),
  c({ id: "active-recovery", nameAr: "\u0631\u0627\u062D\u0629 \u0646\u0634\u0637\u0629", nameEn: "Active recovery", category: "training" }),
  c({ id: "steps-10k", nameAr: "\u062E\u0637\u0648\u0627\u062A \u0627\u0644\u064A\u0648\u0645", nameEn: "Daily steps", category: "training" }),
  // تغذية
  c({ id: "protein-target", nameAr: "\u0627\u0644\u0628\u0631\u0648\u062A\u064A\u0646", nameEn: "Protein target", category: "nutrition" }),
  c({ id: "calories-target", nameAr: "\u0627\u0644\u0633\u0639\u0631\u0627\u062A", nameEn: "Calories target", category: "nutrition" }),
  c({ id: "post-workout-meal", nameAr: "\u0648\u062C\u0628\u0629 \u0628\u0639\u062F \u0627\u0644\u062A\u0645\u0631\u064A\u0646", nameEn: "Post-workout meal", category: "nutrition" }),
  c({ id: "no-added-sugar", nameAr: "\u0628\u062F\u0648\u0646 \u0633\u0643\u0631 \u0645\u0636\u0627\u0641", nameEn: "No added sugar", category: "nutrition" }),
  c({ id: "vegetables", nameAr: "\u062D\u0635\u0629 \u062E\u0636\u0627\u0631", nameEn: "Vegetables serving", category: "nutrition" }),
  c({ id: "breakfast", nameAr: "\u0641\u0637\u0648\u0631", nameEn: "Breakfast", category: "nutrition" }),
  // ترطيب
  c({ id: "water-target", nameAr: "\u0634\u0631\u0628 \u0627\u0644\u0645\u0627\u0621", nameEn: "Water target", category: "hydration" }),
  c({ id: "electrolytes", nameAr: "\u0625\u0644\u0643\u062A\u0631\u0648\u0644\u064A\u062A\u0627\u062A", nameEn: "Electrolytes", category: "hydration" }),
  // نوم
  c({ id: "sleep-7h", nameAr: "\u0646\u0648\u0645 7 \u0633\u0627\u0639\u0627\u062A", nameEn: "7h sleep", category: "sleep" }),
  c({ id: "sleep-early", nameAr: "\u0646\u0648\u0645 \u0645\u0628\u0643\u0631", nameEn: "Sleep early", category: "sleep" }),
  c({ id: "no-screens-bed", nameAr: "\u0628\u062F\u0648\u0646 \u0634\u0627\u0634\u0627\u062A \u0642\u0628\u0644 \u0627\u0644\u0646\u0648\u0645", nameEn: "No screens before bed", category: "sleep" }),
  // استشفاء
  c({ id: "foam-rolling", nameAr: "\u0641\u0648\u0645 \u0631\u0648\u0644\u0631", nameEn: "Foam rolling", category: "recovery" }),
  c({ id: "rest-day", nameAr: "\u064A\u0648\u0645 \u0631\u0627\u062D\u0629", nameEn: "Rest day", category: "recovery", frequency: "weekly" }),
  c({ id: "light-walk", nameAr: "\u0645\u0634\u064A \u062E\u0641\u064A\u0641", nameEn: "Light walk", category: "recovery" }),
  // صحة
  c({ id: "sunlight", nameAr: "\u062A\u0639\u0631\u0651\u0636 \u0644\u0644\u0634\u0645\u0633", nameEn: "Sunlight", category: "health" }),
  c({ id: "meditation", nameAr: "\u062A\u0623\u0645\u0644", nameEn: "Meditation", category: "health" }),
  c({ id: "deep-breathing", nameAr: "\u062A\u0646\u0641\u0651\u0633 \u0639\u0645\u064A\u0642", nameEn: "Deep breathing", category: "health" }),
  c({ id: "posture-check", nameAr: "\u062A\u0635\u062D\u064A\u062D \u0627\u0644\u062C\u0644\u0633\u0629", nameEn: "Posture check", category: "health" }),
  // مكملات وأدوية
  c({ id: "take-supplements", nameAr: "\u0627\u0644\u0645\u0643\u0645\u0644\u0627\u062A", nameEn: "Supplements", category: "supplements" }),
  c({ id: "take-medications", nameAr: "\u0627\u0644\u0623\u062F\u0648\u064A\u0629", nameEn: "Medications", category: "medications" }),
  // قياسات
  c({ id: "weigh-in", nameAr: "\u0642\u064A\u0627\u0633 \u0627\u0644\u0648\u0632\u0646", nameEn: "Weigh-in", category: "measurements", frequency: "weekly" }),
  c({ id: "waist-measure", nameAr: "\u0642\u064A\u0627\u0633 \u0627\u0644\u062E\u0635\u0631", nameEn: "Waist measurement", category: "measurements", frequency: "weekly" }),
  c({ id: "progress-photo", nameAr: "\u0635\u0648\u0631\u0629 \u062A\u0642\u062F\u0651\u0645", nameEn: "Progress photo", category: "measurements", frequency: "weekly" }),
  // نمط حياة
  c({ id: "daily-note", nameAr: "\u0645\u0644\u0627\u062D\u0638\u0629 \u064A\u0648\u0645\u064A\u0629", nameEn: "Daily note", category: "lifestyle" }),
  c({ id: "plan-tomorrow", nameAr: "\u062E\u0637\u0651\u0637 \u0644\u0644\u063A\u062F", nameEn: "Plan tomorrow", category: "lifestyle" }),
  c({ id: "gratitude", nameAr: "\u0627\u0645\u062A\u0646\u0627\u0646", nameEn: "Gratitude", category: "lifestyle" }),
  c({ id: "limit-caffeine", nameAr: "\u062A\u0642\u0644\u064A\u0644 \u0627\u0644\u0643\u0627\u0641\u064A\u064A\u0646", nameEn: "Limit caffeine", category: "lifestyle" })
];
var commitmentMap = Object.fromEntries(
  commitmentLibrary.map((x) => [x.id, x])
);
function getCommitment(id) {
  return commitmentMap[id];
}

// src/lib/commitmentPlan.ts
function createPlanCommitment(commitmentId, order) {
  const item2 = getCommitment(commitmentId);
  return {
    id: `cmt-${commitmentId}-${order}`,
    commitmentId,
    category: item2?.category,
    frequency: item2?.frequency ?? "daily",
    notes: "",
    order
  };
}

// src/lib/planGenerator.ts
var clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
function expTier(p) {
  switch (p.experienceBand) {
    case "lt1m":
    case "1to6m":
      return "beginner";
    case "6to12m":
      return "novice";
    case "1to2y":
      return "intermediate";
    case "gt2y":
      return "advanced";
    default:
      if (p.trainingLevel === "beginner") return "beginner";
      if (p.trainingLevel === "advanced") return "advanced";
      return "intermediate";
  }
}
function exercisesPerSession(tier) {
  switch (tier) {
    case "beginner":
      return 5;
    // 4–5
    case "novice":
      return 5;
    case "intermediate":
      return 6;
    // 5–6
    case "advanced":
      return 6;
  }
}
function targetExerciseCount(tier, sessionMinutes) {
  const base = exercisesPerSession(tier);
  const m = sessionMinutes > 0 ? sessionMinutes : 60;
  let delta;
  if (m <= 30) delta = -2;
  else if (m <= 45) delta = -1;
  else if (m <= 60) delta = 0;
  else if (m <= 75) delta = 1;
  else delta = 2;
  return clamp(base + delta, 3, 9);
}
var FULL_BODY_MIN = 5;
var COMPOUND_PATTERNS = /* @__PURE__ */ new Set(["squat", "hinge", "push", "pull", "lunge"]);
function exerciseRole(ex2) {
  return COMPOUND_PATTERNS.has(ex2.movementPattern) ? "compound" : "isolation";
}
function setsFor(tier, role) {
  switch (tier) {
    case "beginner":
    case "novice":
      return 3;
    case "intermediate":
      return role === "compound" ? 4 : 3;
    case "advanced":
      return 4;
  }
}
var SCHEMES = {
  bulking: { compoundReps: "6\u201310", isoReps: "10\u201312", compoundRest: 120, isoRest: 75 },
  cutting: { compoundReps: "8\u201312", isoReps: "12\u201315", compoundRest: 90, isoRest: 60 },
  recomposition: { compoundReps: "6\u201310", isoReps: "10\u201312", compoundRest: 120, isoRest: 75 },
  maintenance: { compoundReps: "8\u201312", isoReps: "12\u201315", compoundRest: 90, isoRest: 75 },
  health: { compoundReps: "8\u201312", isoReps: "12\u201315", compoundRest: 90, isoRest: 75 },
  returning: { compoundReps: "10\u201312", isoReps: "12\u201315", compoundRest: 90, isoRest: 75 }
};
function makeEquipFilter(p) {
  const gate = makeEquipmentGate(p);
  return (ex2) => gate(ex2.equipment);
}
function levelOk(ex2, tier) {
  if (tier === "beginner" || tier === "novice") return ex2.level !== "advanced";
  return true;
}
function isMachineExercise(ex2) {
  return ex2.equipment.includes("machine");
}
function isFreeCableExercise(ex2) {
  return ex2.equipment.includes("cable") && !ex2.equipment.includes("machine");
}
function cableOk(ex2, tier) {
  return tier === "advanced" || !isFreeCableExercise(ex2);
}
function prefersMachines(tier) {
  return tier === "beginner" || tier === "novice";
}
function detectInjuries(injuries) {
  const out = /* @__PURE__ */ new Set();
  if (!injuries) return out;
  const t = injuries.toLowerCase();
  if (/knee|ركبة|ركب/.test(t)) out.add("knee");
  if (/shoulder|كتف|أكتاف|اكتاف/.test(t)) out.add("shoulder");
  if (/back|lower_back|ظهر|عمود/.test(t)) out.add("back");
  if (/wrist|رسغ|معصم/.test(t)) out.add("wrist");
  if (/elbow|مرفق|كوع/.test(t)) out.add("elbow");
  if (/ankle|كاحل|كعب/.test(t)) out.add("ankle");
  return out;
}
var INJURY_RISKY_IDS = {
  // الركبة: نتجنّب القرفصاء الثقيل والاندفاع العميق ومدّ الرجل؛ نُبقي ليج برس/قرفصاء خفيف والهيپ.
  knee: /* @__PURE__ */ new Set([
    "barbell-back-squat",
    "front-squat",
    "hack-squat-machine",
    "smith-machine-squat",
    "sissy-squat",
    "belt-squat",
    "leg-press-narrow",
    "bulgarian-split-squat",
    "walking-lunge",
    "reverse-lunge",
    "step-up",
    "leg-extension-machine",
    "wall-sit"
  ]),
  // الكتف: نتجنّب الضغط العلوي بالبار والتجديف العمودي؛ نُبقي ضغط الدمبل/الجهاز والرفرفات.
  shoulder: /* @__PURE__ */ new Set(["overhead-press", "push-press", "upright-row", "arnold-press"]),
  // الظهر: نتجنّب الهينج الثقيل المحمّل على العمود؛ نُبقي التجديف المدعوم/الجهاز والهيپ ثرَست.
  back: /* @__PURE__ */ new Set([
    "deadlift",
    "sumo-deadlift",
    "stiff-leg-deadlift",
    "good-morning",
    "barbell-row",
    "t-bar-row-machine",
    "romanian-deadlift",
    "dumbbell-rdl",
    "single-leg-rdl"
  ]),
  // الرسغ: نتجنّب القبضة الثقيلة (رفعات/عقلة/تجديف بار)، وحمل وزن الجسم على الكفّ (ضغط/غطس)،
  // وتمرير البار المستقيم والضغط الضيّق (إجهاد الرسغ). نُبقي أجهزة/كيبل/دمبل بقبضة محايدة.
  wrist: /* @__PURE__ */ new Set([
    "deadlift",
    "sumo-deadlift",
    "rack-pull",
    "barbell-row",
    "pendlay-row",
    "t-bar-row-machine",
    "meadows-row",
    "pull-up",
    "chin-up",
    "inverted-row",
    "dumbbell-shrug",
    "barbell-shrug",
    "kettlebell-swing",
    "hanging-leg-raise",
    "toes-to-bar",
    "front-squat",
    "barbell-curl",
    "ez-bar-curl",
    "cable-biceps-curl",
    "reverse-curl",
    "preacher-curl-machine",
    "spider-curl",
    "skull-crusher",
    "close-grip-bench-press",
    "jm-press",
    "push-up",
    "incline-push-up",
    "knee-push-up",
    "diamond-push-up",
    "chest-dip",
    "bench-dip",
    "ab-wheel-rollout",
    "mountain-climber",
    "burpees"
  ]),
  // المرفق: نتجنّب تمارين ثني/مدّ المرفق تحت حِمل مباشر (التمريرات، مدّ الترايسبس الثقيل، الغطس).
  // نُبقي دفع الترايسبس بالكيبل (بوش داون) والضغط بالجهاز/الدمبل لملء اليوم.
  elbow: /* @__PURE__ */ new Set([
    "barbell-curl",
    "dumbbell-curl",
    "hammer-curl",
    "preacher-curl-machine",
    "cable-biceps-curl",
    "concentration-curl",
    "incline-dumbbell-curl",
    "ez-bar-curl",
    "spider-curl",
    "cable-hammer-curl",
    "reverse-curl",
    "machine-curl",
    "skull-crusher",
    "overhead-triceps-extension",
    "cable-overhead-extension",
    "dumbbell-kickback",
    "close-grip-bench-press",
    "jm-press",
    "bench-dip",
    "chest-dip",
    "assisted-dip-machine",
    "diamond-push-up"
  ]),
  // الكاحل: نتجنّب القفز/الارتطام، ورفع السمانة واقفًا (توازن على الكاحل)، والاندفاع.
  // نُبقي سمانة جالس/ليج برس والقرفصاء المدعوم والكارديو منخفض الارتطام.
  ankle: /* @__PURE__ */ new Set([
    "bulgarian-split-squat",
    "walking-lunge",
    "reverse-lunge",
    "step-up",
    "standing-calf-raise-machine",
    "bodyweight-calf-raise",
    "donkey-calf-raise",
    "single-leg-calf-raise",
    "jump-rope",
    "burpees",
    "high-knees",
    "mountain-climber"
  ])
};
function makeInjuryFilter(areas) {
  if (!areas.size) return () => true;
  const banned = /* @__PURE__ */ new Set();
  for (const area of areas) for (const id of INJURY_RISKY_IDS[area]) banned.add(canonicalExerciseId(id));
  return (ex2) => !banned.has(ex2.id);
}
var SLOTS = {
  // (جولة 3) المجموعات الكبرى الأربع أولًا (أرجل، صدر، ظهر، أكتاف) كي يضمن أي يوم جسم كامل
  // — مهما قصُرت الجلسة — لمس كل مجموعة. ثم الأرجل الخلفية (hinge) والسمانة والكور والذراعان.
  full: [
    { muscles: ["quads"], role: "compound", patterns: ["squat", "lunge"] },
    { muscles: ["chest"], role: "compound", patterns: ["push"] },
    { muscles: ["back"], role: "compound", patterns: ["pull"] },
    { muscles: ["shoulders"], role: "compound", patterns: ["push"] },
    { muscles: ["hamstrings", "glutes"], role: "compound", patterns: ["hinge"] },
    { muscles: ["calves"], role: "isolation" },
    { muscles: ["core"], role: "any" },
    { muscles: ["biceps"], role: "isolation" },
    { muscles: ["triceps"], role: "isolation" }
  ],
  upper: [
    { muscles: ["chest"], role: "compound", patterns: ["push"] },
    { muscles: ["back"], role: "compound", patterns: ["pull"] },
    { muscles: ["shoulders"], role: "compound", patterns: ["push"] },
    { muscles: ["back"], role: "compound", patterns: ["pull"] },
    { muscles: ["chest"], role: "any" },
    { muscles: ["shoulders"], role: "isolation" },
    { muscles: ["biceps"], role: "isolation" },
    { muscles: ["triceps"], role: "isolation" }
  ],
  lower: [
    { muscles: ["quads"], role: "compound", patterns: ["squat"] },
    // P12: الهينج المركّب في نسخة الأجهزة هو جهاز دفع الألوية (glutes) — نوسّع الفتحة
    // لتشمل الألوية كي تمتلئ من الكتالوج؛ في المنزل تبقى RDL دمبل (hamstrings) أول المرشّحين.
    { muscles: ["hamstrings", "glutes"], role: "compound", patterns: ["hinge"] },
    { muscles: ["quads"], role: "any" },
    { muscles: ["glutes"], role: "any" },
    { muscles: ["hamstrings"], role: "isolation" },
    { muscles: ["calves"], role: "isolation" },
    { muscles: ["core"], role: "any" }
  ],
  push: [
    { muscles: ["chest"], role: "compound", patterns: ["push"] },
    { muscles: ["shoulders"], role: "compound", patterns: ["push"] },
    { muscles: ["chest"], role: "any" },
    { muscles: ["shoulders"], role: "isolation" },
    { muscles: ["triceps"], role: "isolation" },
    { muscles: ["triceps"], role: "isolation" },
    { muscles: ["core"], role: "any" }
  ],
  pull: [
    { muscles: ["back"], role: "compound", patterns: ["pull"] },
    { muscles: ["back"], role: "compound", patterns: ["pull"] },
    { muscles: ["back"], role: "any" },
    { muscles: ["shoulders"], role: "isolation" },
    { muscles: ["biceps"], role: "isolation" },
    { muscles: ["biceps"], role: "isolation" },
    { muscles: ["core"], role: "any" }
  ],
  // (جولة 2) كتفان اثنان لا ثلاثة: يوم «ذراعين وأكتاف» أكثر توازنًا (٢ كتف/٢ بايسبس/٢ ترايسبس)،
  // ويمنع في «أجهزة فقط» إجبار يومَي الذراعين على استنفاد أجهزة الكتف الثلاثة (كان يرفع تداخل A/B إلى ٤٠٪).
  arms: [
    { muscles: ["shoulders"], role: "compound", patterns: ["push"] },
    { muscles: ["shoulders"], role: "isolation" },
    { muscles: ["biceps"], role: "isolation" },
    { muscles: ["triceps"], role: "isolation" },
    { muscles: ["biceps"], role: "isolation" },
    { muscles: ["triceps"], role: "isolation" }
  ],
  core: [
    { muscles: ["core"], role: "any" },
    { muscles: ["core"], role: "any" },
    { muscles: ["core"], role: "any" },
    { muscles: ["core"], role: "any" },
    { muscles: ["core"], role: "any" },
    { muscles: ["core"], role: "any" }
  ]
};
var TYPE_MUSCLES = {
  full: ["quads", "chest", "back", "shoulders", "hamstrings", "glutes", "biceps", "triceps", "calves", "core"],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves", "core"],
  push: ["chest", "shoulders", "triceps"],
  pull: ["back", "biceps", "shoulders"],
  // (جولة 2) بلا shoulders في احتياط الذراعين: الكتفان يُملآن من فتحتيهما فقط، فلا يعيد الاحتياط
  // إضافة جهاز الكتف الثالث ليومَي الذراعين (كان يجبرهما على تطابق أجهزة الكتف → تداخل ٤٠٪).
  arms: ["biceps", "triceps"],
  core: ["core"]
};
var ACCESSORY_POOL = {
  // assisted-dip-machine أساسي (ضمن الـ٣٢) فلا يُلحَق كإضافة — نستخدم غير الأساسيين للترايسبس.
  triceps: ["triceps-extension-machine", "cable-triceps-pushdown"],
  biceps: ["preacher-curl-machine", "cable-biceps-curl"],
  abs: ["ab-crunch-machine"]
};
function accessoryCategory(type, variation) {
  switch (type) {
    case "push":
      return "triceps";
    case "pull":
      return "biceps";
    case "full":
    case "lower":
      return "abs";
    case "upper":
    case "arms":
      return variation % 2 === 0 ? "triceps" : "biceps";
    case "core":
      return "abs";
    default:
      return null;
  }
}
function pickAccessory(cat, dayIndex, used, tier) {
  const pool = ACCESSORY_POOL[cat].filter((id) => {
    const ex2 = getExercise(id);
    return !ex2 || cableOk(ex2, tier);
  });
  for (let k = 0; k < pool.length; k++) {
    const cand = pool[(dayIndex + k) % pool.length];
    if (!used.has(cand)) return cand;
  }
  return null;
}
function sortCandidates(cands, preferMachines) {
  return cands.slice().sort((a, b) => {
    if (preferMachines) {
      const rank = (ex2) => isMachineExercise(ex2) ? 0 : 1;
      const d = rank(a) - rank(b);
      if (d !== 0) return d;
    }
    return a.id.localeCompare(b.id);
  });
}
function buildMuscleRankMap(pool) {
  const rank = /* @__PURE__ */ new Map();
  const byMuscle = /* @__PURE__ */ new Map();
  for (const ex2 of pool) {
    const list = byMuscle.get(ex2.primaryMuscle) ?? [];
    list.push(ex2);
    byMuscle.set(ex2.primaryMuscle, list);
  }
  for (const list of byMuscle.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id)).forEach((ex2, i) => rank.set(ex2.id, i));
  }
  return rank;
}
function partitionOrder(sorted, variation, nVar, rank) {
  if (nVar <= 1 || sorted.length <= 1) return sorted;
  const v = (variation % nVar + nVar) % nVar;
  const mine = [];
  const rest = [];
  for (const ex2 of sorted) ((rank.get(ex2.id) ?? 0) % nVar === v ? mine : rest).push(ex2);
  return [...mine, ...rest];
}
function pickForSlot(slot, pool, used, variation, nVar, preferMachines, rank) {
  let cands = pool.filter(
    (ex2) => slot.muscles.includes(ex2.primaryMuscle) && (slot.role === "any" || exerciseRole(ex2) === slot.role) && !used.has(ex2.id)
  );
  if (slot.patterns) {
    const byPattern = cands.filter((ex2) => slot.patterns.includes(ex2.movementPattern));
    if (byPattern.length) cands = byPattern;
  }
  if (!cands.length) return void 0;
  const ordered = partitionOrder(sortCandidates(cands, preferMachines), variation, nVar, rank);
  return ordered[0].id;
}
function buildDayExercises(type, variation, nVar, pool, target, preferMachines, rank, fillFromWholePool = false) {
  const used = /* @__PURE__ */ new Set();
  const ids = [];
  for (const slot of SLOTS[type]) {
    if (ids.length >= target) break;
    const id = pickForSlot(slot, pool, used, variation, nVar, preferMachines, rank);
    if (id) {
      ids.push(id);
      used.add(id);
    }
  }
  if (ids.length < target) {
    const extra = partitionOrder(
      sortCandidates(
        pool.filter((ex2) => !used.has(ex2.id) && TYPE_MUSCLES[type].includes(ex2.primaryMuscle)),
        preferMachines
      ),
      variation,
      nVar,
      rank
    );
    for (const ex2 of extra) {
      if (ids.length >= target) break;
      ids.push(ex2.id);
      used.add(ex2.id);
    }
  }
  if (fillFromWholePool && ids.length < target) {
    const extra = partitionOrder(
      sortCandidates(pool.filter((ex2) => !used.has(ex2.id)), preferMachines),
      variation,
      nVar,
      rank
    );
    for (const ex2 of extra) {
      if (ids.length >= target) break;
      ids.push(ex2.id);
      used.add(ex2.id);
    }
  }
  return ids;
}
var AR_NUM = ["", "\u0661", "\u0662", "\u0663", "\u0664", "\u0665", "\u0666", "\u0667"];
function fullDay() {
  return { type: "full", nameAr: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644", nameEn: "Full Body", routineType: "full" };
}
function ulDay(kind, n) {
  return kind === "upper" ? { type: "upper", nameAr: `\u0639\u0644\u0648\u064A ${AR_NUM[n]}`, nameEn: `Upper ${n}`, routineType: "full" } : { type: "lower", nameAr: `\u0633\u0641\u0644\u064A ${AR_NUM[n]}`, nameEn: `Lower ${n}`, routineType: "legs" };
}
function pplDay(kind, n) {
  if (kind === "push") return { type: "push", nameAr: `\u062F\u0641\u0639 ${AR_NUM[n]}`, nameEn: `Push ${n}`, routineType: "push" };
  if (kind === "pull") return { type: "pull", nameAr: `\u0633\u062D\u0628 ${AR_NUM[n]}`, nameEn: `Pull ${n}`, routineType: "pull" };
  return { type: "lower", nameAr: `\u0623\u0631\u062C\u0644 ${AR_NUM[n]}`, nameEn: `Legs ${n}`, routineType: "legs" };
}
function focusDay(focus) {
  switch (focus) {
    case "lower":
      return { type: "lower", nameAr: "\u0623\u0631\u062C\u0644 (\u0645\u0631\u0643\u0651\u0632)", nameEn: "Legs (Focus)", routineType: "legs" };
    case "upper":
    case "chest":
    case "back":
    case "shoulders":
      return { type: "upper", nameAr: "\u0639\u0644\u0648\u064A (\u0645\u0631\u0643\u0651\u0632)", nameEn: "Upper (Focus)", routineType: "full" };
    case "core":
      return { type: "core", nameAr: "\u0628\u0637\u0646 \u0648\u0643\u0648\u0631", nameEn: "Core", routineType: "cardio" };
    case "arms":
    default:
      return { type: "arms", nameAr: "\u0630\u0631\u0627\u0639\u064A\u0646 \u0648\u0623\u0643\u062A\u0627\u0641", nameEn: "Arms & Shoulders", routineType: "push" };
  }
}
function splitDays(days, focus) {
  const d = clamp(days, 1, 7);
  if (d <= 2) return Array.from({ length: d }, () => fullDay());
  if (d === 3) return [fullDay(), fullDay(), fullDay()];
  if (d === 4) return [ulDay("upper", 1), ulDay("lower", 1), ulDay("upper", 2), ulDay("lower", 2)];
  if (d === 5) return [ulDay("upper", 1), ulDay("lower", 1), ulDay("upper", 2), ulDay("lower", 2), focusDay(focus)];
  if (d === 6)
    return [pplDay("push", 1), pplDay("pull", 1), pplDay("legs", 1), pplDay("push", 2), pplDay("pull", 2), pplDay("legs", 2)];
  return [
    pplDay("push", 1),
    pplDay("pull", 1),
    pplDay("legs", 1),
    pplDay("push", 2),
    pplDay("pull", 2),
    pplDay("legs", 2),
    { type: "full", nameAr: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644", nameEn: "Full Body", routineType: "full" }
  ];
}
function splitId(days) {
  const d = clamp(days, 1, 7);
  if (d <= 3) return "gen-fullbody";
  if (d === 4) return "gen-upper-lower-4";
  if (d === 5) return "gen-upper-lower-5";
  if (d === 6) return "gen-ppl-6";
  return "gen-ppl-7";
}
var ADVANCED_CYCLES = {
  full_body: ["full"],
  upper_lower: ["upper", "lower"],
  push_pull_legs: ["push", "pull", "lower"],
  arnold: ["upper", "arms", "lower"],
  // صدر-ظهر / كتف-ذراع / أرجل (تقريب على محرّك الفتحات)
  bro_split: ["push", "pull", "arms", "lower"]
  // صدر / ظهر / كتف-ذراع / أرجل (تقريب)
};
var ADVANCED_SPLIT_ID = {
  full_body: "gen-adv-fullbody",
  upper_lower: "gen-adv-upper-lower",
  push_pull_legs: "gen-adv-ppl",
  arnold: "gen-adv-arnold",
  bro_split: "gen-adv-bro"
};
function advancedDaySpec(split, type, n) {
  switch (type) {
    case "full":
      return fullDay();
    case "upper":
      return ulDay("upper", n);
    case "push":
      return pplDay("push", n);
    case "pull":
      return pplDay("pull", n);
    case "arms":
      return { type: "arms", nameAr: `\u0630\u0631\u0627\u0639\u064A\u0646 \u0648\u0623\u0643\u062A\u0627\u0641 ${AR_NUM[n] ?? ""}`.trim(), nameEn: `Arms & Shoulders ${n}`, routineType: "push" };
    case "core":
      return focusDay("core");
    case "lower":
      return split === "upper_lower" ? ulDay("lower", n) : pplDay("legs", n);
  }
}
function advancedSplitDays(days, split) {
  const cycle = ADVANCED_CYCLES[split];
  const d = clamp(days, 1, 7);
  if (!cycle || d < cycle.length) return null;
  const counts = {};
  return Array.from({ length: d }, (_, i) => {
    const type = cycle[i % cycle.length];
    counts[type] = (counts[type] ?? 0) + 1;
    return advancedDaySpec(split, type, counts[type]);
  });
}
var SPLIT_TITLES = {
  "gen-fullbody": { ar: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644", en: "Full Body" },
  "gen-upper-lower-4": { ar: "\u0639\u0644\u0648\u064A / \u0633\u0641\u0644\u064A", en: "Upper / Lower" },
  "gen-upper-lower-5": { ar: "\u0639\u0644\u0648\u064A / \u0633\u0641\u0644\u064A + \u064A\u0648\u0645 \u0645\u0631\u0643\u0651\u0632", en: "Upper / Lower + Focus" },
  "gen-ppl-6": { ar: "\u062F\u0641\u0639 / \u0633\u062D\u0628 / \u0623\u0631\u062C\u0644 \xD7\u0662", en: "Push / Pull / Legs \xD72" },
  "gen-ppl-7": { ar: "\u062F\u0641\u0639 / \u0633\u062D\u0628 / \u0623\u0631\u062C\u0644 \xD7\u0662 + \u0625\u0636\u0627\u0641\u064A", en: "Push / Pull / Legs \xD72 + Extra" },
  "gen-adv-fullbody": { ar: "\u062C\u0633\u0645 \u0643\u0627\u0645\u0644 (\u0627\u062E\u062A\u064A\u0627\u0631\u0643)", en: "Full Body (your choice)" },
  "gen-adv-upper-lower": { ar: "\u0639\u0644\u0648\u064A / \u0633\u0641\u0644\u064A (\u0627\u062E\u062A\u064A\u0627\u0631\u0643)", en: "Upper / Lower (your choice)" },
  "gen-adv-ppl": { ar: "\u062F\u0641\u0639 / \u0633\u062D\u0628 / \u0623\u0631\u062C\u0644 (\u0627\u062E\u062A\u064A\u0627\u0631\u0643)", en: "Push / Pull / Legs (your choice)" },
  "gen-adv-arnold": { ar: "\u062A\u0642\u0633\u064A\u0645\u0629 \u0623\u0631\u0646\u0648\u0644\u062F (\u0627\u062E\u062A\u064A\u0627\u0631\u0643)", en: "Arnold Split (your choice)" },
  "gen-adv-bro": { ar: "\u0639\u0636\u0644\u0629 \u0628\u0627\u0644\u064A\u0648\u0645 (\u0627\u062E\u062A\u064A\u0627\u0631\u0643)", en: "Bro Split (your choice)" }
};
function planTitle(templateId, lang = "ar") {
  const m = SPLIT_TITLES[templateId];
  if (m) return lang === "en" ? m.en : m.ar;
  const tpl = getTemplate(templateId);
  if (tpl) return lang === "en" ? tpl.nameEn : tpl.nameAr;
  return lang === "en" ? "Custom plan" : "\u062C\u062F\u0648\u0644 \u0645\u062E\u0635\u0651\u0635";
}
function createGenExercise(exerciseId, dayId, order, tier, gt, optional = false) {
  const ex2 = getExercise(exerciseId);
  const role = ex2 ? exerciseRole(ex2) : "isolation";
  const scheme = SCHEMES[gt] ?? SCHEMES.maintenance;
  const isCardio = ex2?.movementPattern === "cardio";
  const keepDefaultReps = isCardio || ex2?.movementPattern === "core" || ex2?.primaryMuscle === "core" || /[ثد]/.test(ex2?.defaultReps ?? "");
  return {
    id: `${dayId}-${exerciseId}-${order}`,
    exerciseId,
    sets: isCardio ? 1 : setsFor(tier, role),
    reps: keepDefaultReps ? ex2?.defaultReps ?? "8\u201312" : role === "compound" ? scheme.compoundReps : scheme.isoReps,
    restSec: isCardio ? 0 : role === "compound" ? scheme.compoundRest : scheme.isoRest,
    startingWeight: "",
    notes: "",
    order,
    ...optional ? { optional: true } : {}
  };
}
function generateWorkoutPlan(p) {
  const days = clamp(p.trainingDays, 1, 7);
  const advanced = p.splitMode === "advanced" && p.splitChoice ? advancedSplitDays(days, p.splitChoice) : null;
  const specs = advanced ?? splitDays(days, p.muscleFocus);
  const templateId = advanced && p.splitChoice ? ADVANCED_SPLIT_ID[p.splitChoice] : splitId(days);
  const tier = expTier(p);
  const target = targetExerciseCount(tier, p.workoutDuration);
  const equipOk = makeEquipFilter(p);
  const injuryAreas = detectInjuries(p.injuries);
  const injuryOk = makeInjuryFilter(injuryAreas);
  const preferMachines = prefersMachines(tier);
  const access = resolveGymAccess(p);
  const machinesOnly = access === "full" || access === "small";
  const pool = machinesOnly ? (
    // أجهزة فقط: الحوض حصريًا من قائمة الأساسيات الـ٣٢ (قرار زياد النهائي). لا أجهزة
    // ذراعين/بطن ولا كيبل هنا — الذراعان والبطن يُدرَّبان تبعيًا عبر المركّبات (ضغط الصدر
    // للترايسبس، السحب/التجديف للبايسبس). فتحات البايسبس/الترايسبس/الكور لا يملؤها شيء
    // من الحوض فيُكمل buildDayExercises العدد المستهدف من بقية أجهزة القائمة.
    exercises.filter((ex2) => primaryMachineIdSet.has(ex2.id) && injuryOk(ex2) && levelOk(ex2, tier))
  ) : exercises.filter(
    (ex2) => equipOk(ex2) && injuryOk(ex2) && cableOk(ex2, tier) && // الكيبل الحرّ للمتقدّم فقط — نستبعده للمبتدئ
    ex2.movementPattern !== "mobility" && ex2.primaryMuscle !== "cardio" && levelOk(ex2, tier)
  );
  const typeTotal = {};
  for (const spec of specs) typeTotal[spec.type] = (typeTotal[spec.type] ?? 0) + 1;
  const rank = buildMuscleRankMap(pool);
  const counts = {};
  const planDays = specs.map((spec, di) => {
    const variation = counts[spec.type] ?? 0;
    counts[spec.type] = variation + 1;
    const nVar = typeTotal[spec.type] ?? 1;
    const dayId = `gen-${di + 1}-${spec.type}`;
    const dayTarget = spec.type === "full" ? Math.max(target, FULL_BODY_MIN) : target;
    const ids = buildDayExercises(spec.type, variation, nVar, pool, dayTarget, preferMachines, rank, machinesOnly);
    let accId = null;
    if (machinesOnly) {
      const cat = accessoryCategory(spec.type, variation);
      const acc = cat ? pickAccessory(cat, variation, new Set(ids), tier) : null;
      if (acc) {
        ids.push(acc);
        accId = acc;
      }
    }
    return {
      id: dayId,
      nameAr: workoutDayNameAr(spec.nameAr, di),
      nameEn: workoutDayNameEn(spec.nameEn, di),
      // آخر عنصر إن كان الإضافة (accId) → optional=true فيُعرَض بوسم «(اختياري)».
      exercises: ids.map(
        (id, i) => createGenExercise(id, dayId, i, tier, p.goalType, i === ids.length - 1 && id === accId)
      )
    };
  });
  return { plan: { templateId, days: planDays }, specs };
}
var WEEKDAYS = ["\u0627\u0644\u0633\u0628\u062A", "\u0627\u0644\u0623\u062D\u062F", "\u0627\u0644\u0625\u062B\u0646\u064A\u0646", "\u0627\u0644\u062B\u0644\u0627\u062B\u0627\u0621", "\u0627\u0644\u0623\u0631\u0628\u0639\u0627\u0621", "\u0627\u0644\u062E\u0645\u064A\u0633", "\u0627\u0644\u062C\u0645\u0639\u0629"];
var TRAIN_PATTERN = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6]
};
function trainingIndexes(days, preferredDays) {
  if (preferredDays && preferredDays.length) {
    const idx = [...new Set(preferredDays)].filter((i) => i >= 0 && i < 7).sort((a, b) => a - b).slice(0, days);
    if (idx.length < days) {
      for (const i of TRAIN_PATTERN[days] ?? []) {
        if (idx.length >= days) break;
        if (!idx.includes(i)) idx.push(i);
      }
      idx.sort((a, b) => a - b);
    }
    return idx;
  }
  return TRAIN_PATTERN[days] ?? TRAIN_PATTERN[3];
}
function buildScheduleFromSpecs(specs, trainingDays, preferredDays) {
  const days = clamp(trainingDays, 1, 7);
  const trainIdx = trainingIndexes(days, preferredDays);
  const rows = [];
  let c2 = 0;
  WEEKDAYS.forEach((d, i) => {
    if (specs.length && trainIdx.includes(i)) {
      const spec = specs[c2 % specs.length];
      rows.push({ day: d, title: workoutDayNameAr(spec.nameAr, c2 % specs.length), type: spec.routineType });
      c2++;
    } else {
      rows.push({ day: d, title: "\u0631\u0627\u062D\u0629 \u0648\u0627\u0633\u062A\u0634\u0641\u0627\u0621", type: "rest" });
    }
  });
  return rows;
}
var STYLE_TEMPLATES = {
  simple: { breakfast: "eggs-and-bread", lunch: "chicken-rice", dinner: "light-dinner", snack: "greek-yogurt-snack" },
  high_protein: { breakfast: "high-protein-breakfast", lunch: "chicken-rice", dinner: "salmon-quinoa", snack: "greek-yogurt-snack" },
  saudi: { breakfast: "fava-bread-breakfast", lunch: "kabsa-chicken", dinner: "light-dinner", snack: "nuts-dates-snack" },
  economical: { breakfast: "oats-and-whey", lunch: "chicken-rice", dinner: "beef-rice", snack: "tuna-sandwich" },
  flexible: { breakfast: "oats-and-whey", lunch: "chicken-sweet-potato", dinner: "light-dinner", snack: "cottage-fruit" }
};
var SLOT_BASE_WEIGHT = [1, 1, 1, 0.55, 0.45];
var TIMING_WEIGHT = {
  balanced: [1, 1, 1, 1, 1],
  morning: [1.3, 1.1, 0.75, 1.05, 0.9],
  evening: [0.75, 0.95, 1.35, 1.05, 1.15]
};
var DISTRIBUTION_WEIGHT = {
  balanced: [1, 1, 1, 1, 1],
  fewer_larger: [1.15, 1.15, 1.15, 0.5, 0.45],
  more_smaller: [0.95, 0.95, 0.95, 1.35, 1.3]
};
function redistributeMeals(meals, targetCalories, timing, dist) {
  if (!meals.length || targetCalories <= 0) return meals;
  const weights = meals.map((_, i) => {
    const idx = Math.min(i, SLOT_BASE_WEIGHT.length - 1);
    return SLOT_BASE_WEIGHT[idx] * TIMING_WEIGHT[timing][idx] * DISTRIBUTION_WEIGHT[dist][idx];
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return meals;
  return meals.map((m, i) => {
    const perMeal = targetCalories * (weights[i] / sum);
    const base = m.calories > 0 ? m.calories : 1;
    const factor = Math.max(0.4, Math.min(2.4, perMeal / base));
    return {
      ...m,
      calories: Math.round(m.calories * factor),
      protein: Math.round(m.protein * factor),
      carbs: Math.round(m.carbs * factor),
      fat: Math.round(m.fat * factor)
    };
  });
}
function pickTemplateForDiet(preferredId, dietPattern) {
  const preferred = getMealTemplate(preferredId);
  if (!preferred || !dietRestrictsSources(dietPattern)) return preferredId;
  if (templateAllowedForDiet(preferred, dietPattern)) return preferredId;
  const byProtein = (a, b) => b.protein - a.protein;
  const compliant = mealTemplates.filter((t) => templateAllowedForDiet(t, dietPattern)).map((t) => ({ id: t.id, mealType: t.mealType, protein: createPlanMealFromTemplate(t.id, 0).protein }));
  const sameType = compliant.filter((t) => t.mealType === preferred.mealType).sort(byProtein);
  if (sameType.length) return sameType[0].id;
  const any = [...compliant].sort(byProtein);
  return any.length ? any[0].id : preferredId;
}
function generateNutrition(p, targets) {
  const goal = calorieGoalFromGoalType(p.goalType);
  const targetCalories = targets.targetCalories || (goal === "cut" ? targets.cuttingCalories : goal === "bulk" ? targets.bulkingCalories : targets.maintenanceCalories);
  const displayStyle = p.nutritionDisplayStyle ?? "meal_suggestions";
  const mealsCount = Math.max(3, Math.min(5, p.mealsPerDay));
  if (displayStyle !== "meal_suggestions") {
    const plan2 = {
      enabled: p.trackNutrition,
      targetCalories,
      targetProtein: targets.proteinGrams,
      targetCarbs: targets.carbsGrams,
      targetFat: targets.fatGrams,
      targetWaterLiters: targets.waterLiters,
      meals: [],
      style: displayStyle,
      mealsPerDay: p.mealsPerDay
    };
    return { plan: plan2 };
  }
  const s = STYLE_TEMPLATES[p.nutritionStyle] ?? STYLE_TEMPLATES.high_protein;
  const slots = [s.breakfast, s.lunch, s.dinner];
  if (mealsCount >= 4) slots.push(s.snack);
  if (mealsCount >= 5) slots.push("protein-shake");
  const dietPattern = p.dietPattern;
  let meals = slots.map((id) => pickTemplateForDiet(id, dietPattern)).map((id, i) => createPlanMealFromTemplate(id, i));
  const timing = p.appetiteTiming ?? "balanced";
  const dist = p.mealDistribution ?? "balanced";
  if (timing !== "balanced" || dist !== "balanced") {
    meals = redistributeMeals(meals, targetCalories, timing, dist);
  } else {
    const totals0 = planTotals(meals);
    if (totals0.calories > 0) {
      const factor = targetCalories / totals0.calories;
      const clamped = Math.max(0.6, Math.min(1.6, factor));
      if (Math.abs(factor - 1) > 0.1) {
        meals = meals.map((m) => ({
          ...m,
          calories: Math.round(m.calories * clamped),
          protein: Math.round(m.protein * clamped),
          carbs: Math.round(m.carbs * clamped),
          fat: Math.round(m.fat * clamped)
        }));
      }
    }
  }
  const totals = planTotals(meals);
  const within = targetCalories > 0 && Math.abs(totals.calories - targetCalories) / targetCalories <= 0.12 && targets.proteinGrams > 0 && Math.abs(totals.protein - targets.proteinGrams) / targets.proteinGrams <= 0.15;
  const plan = {
    enabled: p.trackNutrition,
    targetCalories,
    targetProtein: targets.proteinGrams,
    targetCarbs: targets.carbsGrams,
    targetFat: targets.fatGrams,
    targetWaterLiters: targets.waterLiters,
    meals,
    style: displayStyle,
    mealsPerDay: p.mealsPerDay
  };
  return { plan, warning: within ? void 0 : "\u0647\u0630\u0647 \u0623\u0645\u062B\u0644\u0629 \u0648\u062C\u0628\u0627\u062A \u0645\u0628\u062F\u0626\u064A\u0629 \u0648\u0644\u064A\u0633\u062A \u062E\u0637\u0629 \u0643\u0627\u0645\u0644\u0629 \u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0623\u0647\u062F\u0627\u0641." };
}
var COMMITMENTS_BY_GOAL = {
  cutting: ["today-workout", "steps-10k", "water-target", "sleep-7h", "protein-target"],
  bulking: ["today-workout", "protein-target", "calories-target", "sleep-7h", "post-workout-meal"],
  returning: ["today-workout", "stretching", "light-walk", "water-target", "sleep-7h"],
  health: ["today-workout", "steps-10k", "water-target", "sleep-7h", "vegetables"],
  maintenance: ["today-workout", "protein-target", "water-target", "sleep-7h", "steps-10k"],
  recomposition: ["today-workout", "protein-target", "steps-10k", "water-target", "sleep-7h"]
};
function generateCommitments(gt) {
  const ids = COMMITMENTS_BY_GOAL[gt] ?? COMMITMENTS_BY_GOAL.health;
  return { enabled: true, items: ids.map((id, i) => createPlanCommitment(id, i)) };
}
function defaultMeasurementPlan() {
  return { enabled: true, selectedTypeIds: ["weightKg", "waistCm", "bodyFatPercent"] };
}
var FOCUS_MUSCLES = {
  balanced: [],
  upper: ["chest", "back", "shoulders", "biceps", "triceps"],
  lower: ["quads", "hamstrings", "glutes", "calves"],
  core: ["core"],
  chest: ["chest"],
  back: ["back"],
  shoulders: ["shoulders"],
  arms: ["biceps", "triceps"]
};
function applyMuscleFocus(plan, focus) {
  const muscles = FOCUS_MUSCLES[focus] ?? [];
  if (!muscles.length) return plan;
  const set = new Set(muscles);
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => {
        const ex2 = getExercise(pe.exerciseId);
        if (ex2 && set.has(ex2.primaryMuscle) && pe.sets < 5) return { ...pe, sets: pe.sets + 1 };
        return pe;
      })
    }))
  };
}
function applyDeload(plan) {
  return {
    ...plan,
    days: plan.days.map((d) => ({
      ...d,
      exercises: d.exercises.map((pe) => ({ ...pe, sets: Math.max(2, pe.sets - 1) }))
    }))
  };
}
function planLabel(p, templateId) {
  const days = clamp(p.trainingDays, 1, 7);
  return `\u062E\u0637\u0629 ${goalTypeLabel(p.goalType)} \xB7 ${days} \u0623\u064A\u0627\u0645 \xB7 ${planTitle(templateId, "ar")}`;
}
function generatePlan(profile) {
  const effectiveGoalType = effectiveGoalTypeForAge(profile.goalType, profile.age);
  const goalWasRestricted = effectiveGoalType !== profile.goalType;
  const p = {
    ...profile,
    goalType: effectiveGoalType,
    goal: calorieGoalFromGoalType(effectiveGoalType)
  };
  const targets = computeTargets(p);
  const isConservativeStart = p.goalType === "returning" || p.consistency === "returning" || p.consistency === "onoff";
  const { plan, specs } = generateWorkoutPlan(p);
  let workoutPlan = plan;
  workoutPlan = applyMuscleFocus(workoutPlan, p.muscleFocus ?? "balanced");
  if (isConservativeStart) workoutPlan = applyDeload(workoutPlan);
  const weeklySchedule = buildScheduleFromSpecs(specs, p.trainingDays, p.preferredDays);
  const { plan: nutritionPlan, warning: nutritionWarning } = generateNutrition(p, targets);
  const warnings = [];
  if (goalWasRestricted) warnings.push(MINOR_GOAL_RESTRICTION_NOTE);
  if (isConservativeStart) warnings.push("\u0628\u062F\u0623\u0646\u0627 \u0628\u062D\u062C\u0645 \u0623\u062E\u0641\u0651 \u0647\u0630\u0627 \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0644\u0628\u062F\u0627\u064A\u0629 \u0622\u0645\u0646\u0629 \u2014 \u0632\u0650\u062F \u062A\u062F\u0631\u064A\u062C\u064A\u064B\u0627 \u0628\u0639\u062F\u0647\u0627.");
  if (p.trainingLevel === "beginner" && p.trainingDays >= 5) {
    warnings.push("\u0644\u0644\u0645\u0628\u062A\u062F\u0626 \u0646\u0646\u0635\u062D \u0628\u06403\u20134 \u0623\u064A\u0627\u0645 \u0641\u064A \u0627\u0644\u0628\u062F\u0627\u064A\u0629 \u0644\u0628\u0646\u0627\u0621 \u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0648\u0627\u0644\u0627\u0633\u062A\u0634\u0641\u0627\u0621.");
  }
  const injuryAreas = detectInjuries(p.injuries);
  if (injuryAreas.size) {
    warnings.push("\u0631\u0627\u0639\u064A\u0646\u0627 \u0645\u0646\u0627\u0637\u0642 \u0627\u0644\u0625\u0635\u0627\u0628\u0629 \u0627\u0644\u062A\u064A \u062A\u0639\u0631\u0651\u0641\u0646\u0627 \u0639\u0644\u064A\u0647\u0627 \u0628\u0627\u0633\u062A\u0628\u0639\u0627\u062F \u0627\u0644\u062A\u0645\u0627\u0631\u064A\u0646 \u0627\u0644\u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062E\u0627\u0637\u0631 \u0648\u0627\u062E\u062A\u064A\u0627\u0631 \u0628\u062F\u0627\u0626\u0644 \u0644\u0646\u0641\u0633 \u0627\u0644\u0639\u0636\u0644\u0627\u062A.");
  }
  const legDays = weeklySchedule.filter((d) => d.type === "legs" || d.type === "full").length;
  if (p.splitMode === "advanced" && p.splitChoice && legDays < 2) {
    warnings.push("\u062A\u0642\u0633\u064A\u0645\u062A\u0643 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629 \u062A\u062F\u0631\u0651\u0628 \u0627\u0644\u0623\u0631\u062C\u0644 \u0623\u0642\u0644 \u0645\u0646 \u0645\u0631\u0651\u062A\u064A\u0646 \u0623\u0633\u0628\u0648\u0639\u064A\u064B\u0627 \u2014 \u0641\u0643\u0651\u0631 \u0628\u0632\u064A\u0627\u062F\u0629 \u0627\u0644\u0623\u064A\u0627\u0645 \u0623\u0648 \u062A\u0642\u0633\u064A\u0645\u0629 \u0623\u062E\u0631\u0649.");
  } else if ((p.goalType === "bulking" || p.goalType === "recomposition") && p.trainingDays >= 4 && legDays < 2) {
    warnings.push("\u062A\u0623\u0643\u062F \u0645\u0646 \u062A\u062F\u0631\u064A\u0628 \u0627\u0644\u0623\u0631\u062C\u0644 \u0645\u0631\u062A\u064A\u0646 \u0623\u0633\u0628\u0648\u0639\u064A\u064B\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644 \u0641\u064A \u062E\u0637\u0637 \u0627\u0644\u062A\u0636\u062E\u064A\u0645.");
  }
  if (nutritionWarning) warnings.push(nutritionWarning);
  const levelAr = p.trainingLevel === "beginner" ? "\u0645\u0628\u062A\u062F\u0626" : p.trainingLevel === "intermediate" ? "\u0645\u062A\u0648\u0633\u0637" : "\u0645\u062A\u0642\u062F\u0651\u0645";
  const envAr = p.workoutEnvironment === "home" ? " \u0641\u064A \u0627\u0644\u0645\u0646\u0632\u0644" : "";
  const explanationAr = `\u0627\u062E\u062A\u0631\u0646\u0627 \u062A\u0642\u0633\u064A\u0645\u0629 \xAB${planTitle(workoutPlan.templateId, "ar")}\xBB \u062A\u0644\u0642\u0627\u0626\u064A\u064B\u0627 \u0644\u0623\u0646\u0643 ${goalTypeLabel(p.goalType)} \u0628\u0645\u0633\u062A\u0648\u0649 ${levelAr} \u0648${clamp(p.trainingDays, 1, 7)} \u0623\u064A\u0627\u0645 \u062A\u0645\u0631\u064A\u0646${envAr}.`;
  return {
    targets,
    suggestedWorkoutTemplateId: workoutPlan.templateId,
    weeklySchedule,
    workoutPlan,
    nutritionPlan,
    commitmentPlan: generateCommitments(p.goalType),
    measurementPlan: defaultMeasurementPlan(),
    explanationAr,
    planLabelAr: planLabel(p, workoutPlan.templateId),
    warningsAr: warnings
  };
}

// scripts/p5-plan-proof.ts
function baseProfile(over) {
  return {
    userName: "\u062A\u062C\u0631\u0628\u0629",
    gender: "male",
    age: 28,
    heightCm: 178,
    weightKg: 82,
    goal: "bulk",
    goalType: "bulking",
    trainingLevel: "intermediate",
    experienceBand: "1to2y",
    trainingDays: 6,
    workoutDuration: 60,
    workoutEnvironment: "gym",
    gymType: "full",
    gymAccess: "full",
    activityLevel: "moderate",
    nutritionStyle: "high_protein",
    nutritionDisplayStyle: "meal_suggestions",
    mealsPerDay: 4,
    trackNutrition: true,
    muscleFocus: "balanced",
    splitMode: "auto",
    ...over
  };
}
var failures = 0;
function check(cond, msg) {
  console.log(`${cond ? "\u2705" : "\u274C"} ${msg}`);
  if (!cond) failures++;
}
for (const days of [3, 4, 5, 6, 7]) {
  const p = baseProfile({ trainingDays: days });
  const plan = generatePlan(p);
  const dayNames = plan.workoutPlan.days.map((d) => d.nameAr);
  const dup = dayNames.filter((n, i) => dayNames.indexOf(n) !== i);
  console.log(`
\u2014 ${days} \u0623\u064A\u0627\u0645 \u2014 \u062A\u0642\u0633\u064A\u0645\u0629: ${plan.suggestedWorkoutTemplateId}`);
  console.log("  \u0623\u064A\u0627\u0645 \u0627\u0644\u062E\u0637\u0629:", dayNames.join(" | "));
  console.log("  \u0627\u0644\u062C\u062F\u0648\u0644:", plan.weeklySchedule.map((r) => `${r.day.slice(0, 3)}:${r.type}`).join("  "));
  check(dup.length === 0, `\u0644\u0627 \u062A\u0643\u0631\u0627\u0631 \u0641\u064A \u0623\u0633\u0645\u0627\u0621 \u0623\u064A\u0627\u0645 \u0627\u0644\u062E\u0637\u0629 (${days} \u0623\u064A\u0627\u0645)${dup.length ? " \u2014 \u0645\u0643\u0631\u0651\u0631: " + dup.join(", ") : ""}`);
}
{
  const p = baseProfile({ trainingDays: 6 });
  const plan = generatePlan(p);
  const len = plan.workoutPlan.days.length;
  const covered = /* @__PURE__ */ new Set();
  for (let gd = 0; gd < 7; gd++) covered.add(gd % len);
  check(covered.size === len, `todayPlanDay \u064A\u063A\u0637\u0651\u064A \u0643\u0644 \u0623\u064A\u0627\u0645 \u0627\u0644\u062E\u0637\u0629 (${covered.size}/${len})`);
}
console.log(`
${failures === 0 ? "\u2705 \u0643\u0644 \u0627\u0644\u0641\u062D\u0648\u0635 \u0646\u062C\u062D\u062A" : `\u274C ${failures} \u0641\u062D\u0635 \u0641\u0634\u0644`}`);
process.exit(failures === 0 ? 0 : 1);
