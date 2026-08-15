// Materialises per-exercise ENGLISH form cues for the full catalog into
// src/data/coaching/exerciseCuesEn.generated.ts.
//
// This is the deliberate mirror of scripts/build-cues.mjs (Arabic). Same architecture,
// same manifest, same deterministic per-id variant pick — so an exercise that reads
// specifically in Arabic reads specifically in English too, and both stay reproducible.
//
// Why a mirror and not a translation pass: the Arabic cues are COMPOSED from a curated
// fragment library keyed by equipment × movement pattern × primary muscle. Translating
// the *output* would drift; mirroring the *composer* keeps the two languages structurally
// identical for ever, and a single proof can assert step-count parity per exercise.
//
// Register: informal, friendly English (charter §6 — «الإنجليزية المرافقة غير رسمية ودودة»).
// No medical claims; spine/knee-loading patterns route to a "see a qualified professional" line.
// Run: npm run coaching:build

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const manifest = JSON.parse(readFileSync(resolve(here, 'manifest.json'), 'utf8'))

// deterministic hash → index (no Math.random; reproducible builds) — identical to the Arabic composer
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) }
const pick = (arr, id, salt) => arr[hash(id + '|' + salt) % arr.length]

const MUSCLE_EN = {
  chest: 'your chest', back: 'your back', shoulders: 'your shoulders', biceps: 'your biceps',
  triceps: 'your triceps', quads: 'your quads', hamstrings: 'your hamstrings',
  glutes: 'your glutes', calves: 'your calves', core: 'your core', cardio: 'your heart and lungs',
  legs: 'your legs',
}

// primary equipment token, most specific first — identical order to the Arabic composer
const EQUIP_ORDER = ['machine', 'smith', 'cable', 'barbell', 'ez-bar', 'dumbbell', 'kettlebell', 'plate', 'band', 'rope', 'bench', 'bodyweight']
const equipOf = (eq) => EQUIP_ORDER.find((t) => eq.includes(t)) || 'bodyweight'

const isUnilateral = (m) => /single|one-arm|one-leg|split|bulgarian|pistol|step-up|lunge|unilateral|alternating/i.test(m.id + ' ' + m.nameEn)

// ── SETUP by equipment (step 1) ──
const SETUP = {
  machine: ['Set the seat and pad so the joint lines up with the machine’s pivot, then settle in with your back supported and feet planted.', 'Dial the machine in to your size first — seat height and handle position — then get settled before your first rep.'],
  smith: ['Unrack the bar with a small twist, and place your feet where the path lines up with the movement.', 'Set up under the Smith bar so the track follows your natural line, then lock in your grip.'],
  cable: ['Set the pulley to the right height and pick a weight you can move cleanly through the whole range.', 'Stand a step away from the pulley so there is tension from the very first inch, and brace your torso.'],
  barbell: ['Grip the bar a little wider than shoulder width and set your shoulder blades before you lift.', 'Unrack the bar under control, then sort out your grip and stance before the first rep.'],
  'ez-bar': ['Take the EZ bar at whichever angle feels kind on your wrists, and tuck your elbows near your sides.', 'Pick a comfortable grip on the EZ bar to ease wrist pressure, then lock your position in.'],
  dumbbell: ['Hold the dumbbell firmly with a straight wrist, and set your stance or seat so you are steady.', 'Bring the dumbbell up to the start position under control, and set your shoulder blades before rep one.'],
  kettlebell: ['Grip the kettlebell handle firmly, and brace your torso and shoulders before you start moving.', 'Start from a balanced stance with the kettlebell close to you and feet about shoulder width apart.'],
  plate: ['Hold the plate by its sides with both hands, and brace your torso before you move.', 'Settle into a balanced stance holding the plate close to your body.'],
  band: ['Anchor the band securely, and set the tension so it is already pulling at the start of the movement.', 'Stand on the band or anchor it well, and double-check it is not going to slip before you pull or press.'],
  rope: ['Take both rope ends with a neutral grip, and keep your elbows tucked near your sides.', 'Set the pulley height and get a solid grip on the rope before you start.'],
  bench: ['Settle onto the bench, plant your feet on the floor and pull your shoulder blades back.', 'Set the bench to the angle you need, then settle in with your back supported before you start.'],
  bodyweight: ['Start from a stable, balanced position and brace your torso before the first movement.', 'Set your body position on your contact points and get steady before rep one.'],
}

// ── BRACE / start (step 2) by pattern ──
const BRACE = {
  push: ['Brace your core and set your shoulder blades back and down before you start pressing.', 'Take a breath, fill your chest, and set your shoulders before the weight comes down.'],
  pull: ['Brace your torso and start the pull from your back muscles, not from your hands.', 'Set your shoulders down and start the movement by squeezing your shoulder blades.'],
  squat: ['Take a deep breath and brace before you descend, keeping your back neutral.', 'Spread your weight over your mid-foot and brace your stomach before you start down.'],
  hinge: ['Brace your core and keep your back neutral, then start by pushing your hips back.', 'Take a breath and brace hard before the weight leaves the floor.'],
  lunge: ['Brace your core and find your balance before you step, keeping the weight forward.', 'Keep your torso upright and brace your stomach before you go down.'],
  isolation: ['Lock down the neighbouring joint and focus on the target muscle before you move.', 'Squeeze the target muscle mentally, and keep the rest of your body still before you start.'],
  core: ['Keep your lower back neutral and brace your stomach — breathe steadily, do not hold your breath.', 'Start with a light brace through your core, and keep your breathing regular.'],
  cardio: ['Start at an easy rhythm to warm up, then build the intensity gradually.', 'Get your posture comfortable and start at a calm, steady pace.'],
  mobility: ['Move slowly through a comfortable, pain-free range and breathe deeply.', 'Ease into the movement — you are prepping the joint, not hammering it.'],
}

// ── EXECUTE (step 3) by pattern, with {m}=primary muscle ──
const EXECUTE = {
  push: ['Lower under control (2–3 seconds) to a comfortable range, then press hard and feel {m} doing the work.', 'Control the weight down, then press it away and feel {m} working.'],
  pull: ['Pull the weight toward you and squeeze {m}, then control the way back.', 'Bring the weight in while squeezing {m}, then let it back slowly under control.'],
  squat: ['Go down until your thigh is about parallel if your mobility allows, then drive up through your feet with {m} working.', 'Descend under control with your knees tracking over your toes, then stand up powerfully through {m}.'],
  hinge: ['Push your hips back with the weight close to you, then drive your hips forward hard through {m}.', 'Lower the weight by hinging at the hips, then stand back up by squeezing {m}.'],
  lunge: ['Drop straight down until your back knee is close to the floor, then push up through your front heel with {m} working.', 'Lower with balance, then drive up through your front foot and keep the tension on {m}.'],
  isolation: ['Move the weight through the full range with the tension on {m}, and no swinging.', 'Squeeze {m} at the top of the contraction, then come back slowly and under control.'],
  core: ['Contract slowly and with control, keeping the work in {m} and off your neck.', 'Run the movement with full control and keep {m} braced the whole way.'],
  cardio: ['Hold a steady rhythm at an effort you could still finish a sentence at.', 'Keep a consistent pace with steady breathing, and check in on how hard it feels.'],
  mobility: ['Move gently to the edge of a comfortable stretch, hold for a beat, then come back slowly.', 'Relax into each rep and aim to gain range gradually, never through pain.'],
}

// ── TEMPO / breathing (step 4) — shared, id-varied ──
const TEMPO = [
  'Breathe steadily: exhale on the effort, inhale on the way back, and never hold your breath.',
  'Keep a controlled rhythm on every rep — quality beats speed here.',
  'Keep the movement clean and connected, and avoid swinging your body to use momentum.',
]

// ── FINISH / return (step 5) by pattern ──
const FINISH = {
  push: ['Finish the range without slamming the joint into lockout, and bring the weight back under control for the next rep.'],
  pull: ['Straighten your arms under control at the end — no sudden release — and keep the tension across your back.'],
  squat: ['Stand all the way up without snapping your knees into lockout, and reset for the next rep.'],
  hinge: ['Finish standing tall by squeezing your glutes, without over-arching your lower back, then repeat.'],
  lunge: ['Return to the start with balance, and switch sides when you need to while keeping your footing.'],
  isolation: ['Let it come all the way back slowly to keep the tension, then start the next rep.'],
  core: ['Finish the range under control and return to the start without losing your brace.'],
  cardio: ['Finish with a gradual cool-down that brings your heart rate back to normal.'],
  mobility: ['Finish by easing back to neutral, and repeat on the other side if you need to.'],
}

// ── MISTAKES by pattern (2 each) + equipment/unilateral extra ──
const MISTAKES_PAT = {
  push: ['Dropping the weight down with no control on the way down.', 'Snapping the elbow straight at the top.'],
  pull: ['Pulling with your arms only and never engaging your back.', 'Swinging your torso to move the weight with momentum.'],
  squat: ['Letting your heels lift off the floor on the way down.', 'Letting your knees cave inward at the bottom.'],
  hinge: ['Rounding your lower back instead of hinging at the hips.', 'Letting the weight drift away from you, which loads your back more.'],
  lunge: ['Letting the front knee travel way past your toes.', 'Leaning your torso forward and losing your balance.'],
  isolation: ['Using momentum and body swing instead of the muscle.', 'Picking a weight so heavy it shortens your range.'],
  core: ['Straining your neck instead of working your abs.', 'Holding your breath instead of breathing steadily.'],
  cardio: ['Starting at high intensity with no proper warm-up.', 'Hunching over, which tires out your lower back.'],
  mobility: ['Bouncing aggressively instead of holding under control.', 'Pushing past a comfortable stretch.'],
}
const MISTAKES_EQUIP = {
  machine: 'Setting the machine to the wrong size, which throws the joint off its path.',
  cable: 'Standing too close, so the cable goes slack and you lose the tension.',
  barbell: 'An uneven grip on the bar that tips the load to one side.',
  smith: 'Leaning entirely on the bar path and forgetting to brace your torso.',
  dumbbell: 'Letting your wrist bend back under the load.',
  bodyweight: 'Letting your torso sag and losing the straight line as you tire.',
}

// ── SAFETY (1) — spine/knee-loading → consult pattern ──
const SPINE_PAT = new Set(['hinge', 'squat'])
const SAFETY_PAT = {
  push: ['Use a spotter for heavy weight over your chest or overhead.'],
  pull: ['Start with a weight you can move cleanly, and protect your lower back with a neutral position.'],
  squat: ['Use the safety pins in the rack, and stop and see a qualified professional if you get any back or knee pain.'],
  hinge: ['A rounded back under load is risky for your spine — own the pattern light first, and see a qualified professional if you get any back pain.'],
  lunge: ['Keep your balance and hold on to something if you need to, and stop and see a qualified professional if you get knee pain.'],
  isolation: ['Go easy on the load through a small joint, and stop the set at any sharp pain.'],
  core: ['Stop at any lower-back or neck pain, and skip hard bouncing movements.'],
  cardio: ['Warming up and cooling down matter — drink water and stop if you feel dizzy or short of breath.'],
  mobility: ['Never force a joint into a painful range, and stop right away at any pinch or sharp pain.'],
}

function composeCueEn(m) {
  const eq = equipOf(m.equipment)
  const pat = m.movementPattern
  const mus = MUSCLE_EN[m.primaryMuscle] || 'the target muscle'
  const uni = isUnilateral(m)

  const steps = [
    pick(SETUP[eq] || SETUP.bodyweight, m.id, 'setup'),
    pick(BRACE[pat] || BRACE.isolation, m.id, 'brace'),
    pick(EXECUTE[pat] || EXECUTE.isolation, m.id, 'exec').replace('{m}', mus),
    pick(TEMPO, m.id, 'tempo'),
    (FINISH[pat] || FINISH.isolation)[0],
  ]
  if (uni) steps.splice(4, 0, 'Finish all your reps on one side, then switch to the other in the same position so both sides get the same work.')

  const mistakes = [...(MISTAKES_PAT[pat] || MISTAKES_PAT.isolation)]
  if (MISTAKES_EQUIP[eq]) mistakes.push(MISTAKES_EQUIP[eq])

  const safety = (SAFETY_PAT[pat] || SAFETY_PAT.isolation)[0]

  return { steps: steps.slice(0, 5), mistakes: mistakes.slice(0, 3), safety, spineCaution: SPINE_PAT.has(pat) }
}

const cues = {}
for (const m of manifest) cues[m.id] = composeCueEn(m)

const header = `// AUTO-GENERATED by scripts/coaching/build-cues-en.mjs — do not edit by hand.
// Per-exercise ENGLISH form cues for the full ${manifest.length}-exercise catalog.
// Structural mirror of EXERCISE_CUES (Arabic): same composer, same deterministic variant
// pick, so step/mistake counts match per exercise. Regenerate: npm run coaching:build.
// Parity + coverage are enforced by npm run test:exercise-production.
import type { ExerciseCue } from '@/lib/coaching/types'

export const EXERCISE_CUES_EN: Record<string, ExerciseCue> = ${JSON.stringify(cues, null, 2)}
`
const out = resolve(here, '../../src/data/coaching/exerciseCuesEn.generated.ts')
writeFileSync(out, header)
console.log(`wrote ${Object.keys(cues).length} EN cues → src/data/coaching/exerciseCuesEn.generated.ts`)
