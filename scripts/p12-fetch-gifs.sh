#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# P12 — جلب GIF الأجهزة الناقصة من WorkoutX (يُشغَّل على جهاز Mac المتصل — مرّة واحدة).
#
# القائمة الناقصة (44) مُثبّتة أدناه من تشغيل: node scripts/p12-gif-manifest.mjs
# لكل عنصر: بحث WorkoutX بالاسم الإنجليزي → أفضل مطابقة → تنزيل GIF →
# تحجيم 360x360 (python3 + Pillow) → public/exercise-gifs/<slug-قانوني>.gif
#
# الميزانية: افتراض محافظ 2 طلب/GIF (بحث + تنزيل) → 44 × 2 = 88 ≤ سقف 150.
# (تجربة P5: تنزيل الـ gif من CDN لا يحمل المفتاح — الاستهلاك الفعلي المرجّح ≈ 44.)
# المفتاح له ~367 طلبًا متبقيًا مدى الحياة — العدّاد الجاري يتوقّف صلبًا عند 150.
#
# المتطلبات على الـ Mac:
#   • WORKOUTX_API_KEY في البيئة فقط (لا يُكتب في أي ملف):  export WORKOUTX_API_KEY=xxxx
#   • python3 + Pillow — إن ظهر «Pillow غير مثبّت» شغّل:  pip3 install pillow
#
# التشغيل (من جذر المشروع):
#   bash scripts/p12-fetch-gifs.sh --dry-run   ← بلا شبكة: يطبع الخطة وعدد الطلبات فقط
#   bash scripts/p12-fetch-gifs.sh             ← الجلب الفعلي (idempotent — يتخطّى الموجود)
#
# سلوك آمن: rate-limit sleep بين الطلبات، عدّاد جارٍ يُطبع مع كل طلب، عنصر غير
# موجود في WorkoutX (متوقّع: pendulum-squat-machine) → تخطٍّ + تسجيل، لا فشل.
# ─────────────────────────────────────────────────────────────────────────────
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT/public/exercise-gifs"
BASE="https://api.workoutxapp.com"
KEY_HEADER="X-WorkoutX-Key"
# مسار البحث قابل للتجاوز إن تغيّرت الواجهة (الافتراضي مطابق لمسار P5 المؤكَّد /exercises).
SEARCH_PATH="${WORKOUTX_SEARCH_PATH:-/exercises?search=}"
SLEEP_SECS="${WORKOUTX_SLEEP:-1.5}"   # مهلة بين الطلبات (rate limit)
HARD_CAP=150                           # سقف صارم لعدد الطلبات في هذا التشغيل
REQS_PER_GIF=2                         # افتراض محافظ: بحث + تنزيل

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# ── القائمة الناقصة النهائية (44) — slug قانوني | اسم البحث الإنجليزي ──
# مصدر آلي: node scripts/p12-gif-manifest.mjs (لا تُحرّرها يدويًا؛ أعد توليد التقرير).
MISSING='ab-crunch-machine|Ab Crunch Machine
assisted-dip-machine|Assisted Dip Machine
cable-hammer-curl|Cable Hammer Curl
cable-hip-adduction|Cable Hip Adduction
cable-overhead-extension|Cable Overhead Extension
cable-shoulder-press|Cable Shoulder Press
cable-woodchop|Cable Woodchop
chest-supported-row|Chest-Supported Row
chest-supported-row-machine|Chest-Supported Row Machine
close-grip-pulldown|Close-Grip Pulldown
decline-dumbbell-press|Decline Dumbbell Press
dumbbell-kickback|Dumbbell Kickback
dumbbell-rdl|Dumbbell Romanian Deadlift
dumbbell-sumo-squat|Dumbbell Sumo Squat
face-pull|Face Pull
glute-drive-machine|Glute Drive Machine
glute-kickback-machine|Glute Kickback Machine
goblet-squat|Goblet Squat
hip-adductor-machine|Hip Adductor Machine
incline-cable-fly|Incline Cable Fly
incline-chest-press-machine|Incline Chest Press Machine
incline-dumbbell-press|Incline Dumbbell Press
iso-lateral-chest-press|Iso-Lateral Chest Press
iso-lateral-high-row|Iso-Lateral High Row
iso-lateral-incline-press|Iso-Lateral Incline Press
iso-lateral-pulldown|Iso-Lateral Pulldown
lat-pulldown-machine|Lat Pulldown Machine
lateral-raise|Dumbbell Lateral Raise
lateral-raise-machine|Lateral Raise Machine
leg-extension-machine|Leg Extension Machine
leg-press-machine|Leg Press Machine
lying-leg-curl|Lying Leg Curl
pendulum-squat-machine|Pendulum Squat Machine
rear-delt-row-machine|Rear Delt Row Machine
reverse-pec-deck|Reverse Pec Deck
seated-dumbbell-press|Seated Dumbbell Press
seated-row-machine|Seated Row Machine
sissy-squat|Sissy Squat
single-arm-cable-row|Single-Arm Cable Row
single-arm-lat-pulldown|Single-Arm Lat Pulldown
single-leg-calf-raise|Single-Leg Calf Raise
standing-hip-extension-machine|Standing Hip Extension Machine
standing-leg-curl|Standing Leg Curl
triceps-extension-machine|Triceps Extension Machine
wide-grip-iso-lateral-pulldown|Wide-Grip Iso-Lateral Pulldown
wide-grip-lat-pulldown|Wide-Grip Lat Pulldown'

TOTAL=$(printf '%s\n' "$MISSING" | grep -c '|')
PLANNED=$((TOTAL * REQS_PER_GIF))

echo "P12 fetch-gifs — ناقص: $TOTAL GIF • مخطّط: $TOTAL × $REQS_PER_GIF = $PLANNED طلبًا (سقف صارم: $HARD_CAP)"
if [ "$PLANNED" -gt "$HARD_CAP" ]; then
  echo "⛔ STOP: المخطّط ($PLANNED) يتجاوز السقف ($HARD_CAP) — قلّص القائمة أولًا." >&2
  exit 1
fi

if [ "$DRY_RUN" -eq 1 ]; then
  echo "── DRY RUN (بلا شبكة، بلا مفتاح) ──"
else
  if [ -z "${WORKOUTX_API_KEY:-}" ]; then
    echo "⛔ WORKOUTX_API_KEY غير مضبوط. شغّل:  export WORKOUTX_API_KEY=xxxx" >&2
    exit 1
  fi
  if ! python3 -c 'import PIL' 2>/dev/null; then
    echo "⛔ Pillow غير مثبّت (مطلوب للتحجيم 360x360). شغّل:  pip3 install pillow  ثم أعد المحاولة." >&2
    exit 1
  fi
  mkdir -p "$OUT_DIR"
fi

# ── مساعد python3: يختار أفضل مطابقة من استجابة البحث ويطبع رابط الـ gif ──
# stdin = JSON الاستجابة، argv[1] = اسم التمرين المطلوب. يطبع الرابط أو NOT_FOUND.
PICK_PY='
import json, re, sys
want = sys.argv[1]
try:
    data = json.load(sys.stdin)
except Exception:
    print("NOT_FOUND"); sys.exit(0)
items = data if isinstance(data, list) else next(
    (data[k] for k in ("exercises","data","results","items","list") if isinstance(data, dict) and isinstance(data.get(k), list)), [])
STOP = {"the","a","with","and","of","to","for","on","machine","seated","lever"}
def toks(s):
    return [t for t in re.sub(r"[^a-z0-9]+"," ", str(s).lower()).split() if t and t not in STOP]
def name_of(e):
    for k in ("name","exercise","title","nameEn","exerciseName"):
        if isinstance(e, dict) and isinstance(e.get(k), str) and e[k].strip(): return e[k]
    return ""
def gif_of(e):
    if not isinstance(e, dict): return ""
    for k in ("gifUrl","gif","animatedUrl","animation","gifAsset","gif_url","imageUrl","image","media","thumbnail","url"):
        v = e.get(k)
        if isinstance(v, str) and (re.search(r"\.gif(\?|$)", v, re.I) or v.startswith("http")): return v
    return ""
wt = toks(re.sub(r"\([^)]*\)", "", want))
best = None
for e in items:
    url = gif_of(e)
    if not url: continue
    cs = set(toks(name_of(e)))
    cov = (sum(1 for t in wt if t in cs) / len(wt)) if wt else 0.0
    if best is None or cov > best[0]: best = (cov, url)
print(best[1] if best and best[0] >= 0.6 else "NOT_FOUND")
'

# ── مساعد python3: تحجيم GIF متحرّك إلى 360x360 مع الحفاظ على الإطارات ──
RESIZE_PY='
import sys
from PIL import Image, ImageSequence
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
frames, durs = [], []
for f in ImageSequence.Iterator(im):
    durs.append(f.info.get("duration", im.info.get("duration", 80)))
    fr = f.convert("RGBA").resize((360, 360), Image.LANCZOS)
    frames.append(fr.convert("P", palette=Image.ADAPTIVE))
frames[0].save(dst, save_all=True, append_images=frames[1:], duration=durs,
               loop=im.info.get("loop", 0), disposal=2, optimize=True)
'

urlencode() { python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1]))' "$1"; }

req_count=0
downloaded=0; skipped=0; notfound=0
stopped=0

# يزيد العدّاد ويفرض السقف. $1 = وصف الطلب.
tick() {
  req_count=$((req_count + 1))
  echo "    [req $req_count/$HARD_CAP] $1"
  if [ "$req_count" -ge "$HARD_CAP" ]; then
    echo "⛔ بلغنا السقف الصارم ($HARD_CAP طلبًا) — إيقاف باقي القائمة." >&2
    stopped=1
  fi
}

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

i=0
while IFS='|' read -r slug name; do
  [ -z "$slug" ] && continue
  i=$((i + 1))
  out="$OUT_DIR/$slug.gif"

  if [ -f "$out" ]; then
    echo "[$i/$TOTAL] ⏭ $slug — الملف موجود (idempotent skip)."
    skipped=$((skipped + 1))
    continue
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    req_count=$((req_count + REQS_PER_GIF))
    echo "[$i/$TOTAL] (dry) $slug ← بحث: «${name}» + تنزيل → $REQS_PER_GIF طلب (تراكمي: $req_count)"
    continue
  fi

  [ "$stopped" -eq 1 ] && break

  echo "[$i/$TOTAL] 🔎 $slug — بحث WorkoutX: «${name}»"
  q="$(urlencode "$name")"
  tick "GET $BASE$SEARCH_PATH$q"
  resp="$TMP_DIR/resp.json"
  http=$(curl -sS -o "$resp" -w '%{http_code}' -H "$KEY_HEADER: ${WORKOUTX_API_KEY}" -H 'Accept: application/json' "$BASE$SEARCH_PATH$q" || echo 000)
  if [ "$http" = "429" ]; then
    echo "⛔ 429: نفدت الحصّة — إيقاف كل الطلبات المتبقية." >&2
    stopped=1; notfound=$((notfound + 1)); continue
  fi
  if [ "$http" != "200" ]; then
    echo "    ⚠ استجابة $http — تخطٍّ (لن يُفشل التشغيل)."
    notfound=$((notfound + 1)); sleep "$SLEEP_SECS"; continue
  fi

  gif_url="$(python3 -c "$PICK_PY" "$name" < "$resp")"
  if [ "$gif_url" = "NOT_FOUND" ] || [ -z "$gif_url" ]; then
    echo "    ⚠ لا مطابقة في WorkoutX (متوقّع لبعض الأجهزة مثل pendulum-squat-machine) — تخطٍّ + تسجيل."
    notfound=$((notfound + 1)); sleep "$SLEEP_SECS"; continue
  fi

  raw="$TMP_DIR/$slug.raw.gif"
  tick "GET (gif) ${gif_url}"
  if ! curl -sS -f -o "$raw" "$gif_url"; then
    echo "    ⚠ فشل تنزيل الـ gif — تخطٍّ."
    notfound=$((notfound + 1)); sleep "$SLEEP_SECS"; continue
  fi

  if python3 -c "$RESIZE_PY" "$raw" "$out"; then
    echo "    ✅ حُفظ 360x360 → public/exercise-gifs/$slug.gif"
    downloaded=$((downloaded + 1))
  else
    echo "    ⚠ فشل التحجيم (تحقّق من Pillow: pip3 install pillow) — تخطٍّ."
    rm -f "$out"
    notfound=$((notfound + 1))
  fi
  sleep "$SLEEP_SECS"
done <<EOF_LIST
$MISSING
EOF_LIST

echo
echo "══════════ الخلاصة ══════════"
if [ "$DRY_RUN" -eq 1 ]; then
  echo "DRY RUN: $TOTAL عنصرًا ناقصًا • طلبات مخطّطة: $req_count (سقف: $HARD_CAP) • لا شبكة استُخدمت."
  [ "$req_count" -le "$HARD_CAP" ] && echo "✅ ضمن الميزانية." || echo "⛔ فوق الميزانية!"
else
  echo "تنزيل: $downloaded • تخطٍّ (موجود): $skipped • غير موجود/فشل: $notfound • طلبات مستهلكة: $req_count/$HARD_CAP"
  echo "التالي:  node scripts/p12-sync-gifs.mjs   ← يعيد توليد src/data/exerciseGifs.ts من الملفات"
fi
