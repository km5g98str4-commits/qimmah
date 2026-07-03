#!/usr/bin/env bash
# P12 — غلاف رقيق حول scripts/p12-fetch-gifs.mjs (شكل الطلب المُثبت من P5).
#
# النسخة الأولى من هذا السكربت افترضت endpoint بحث لكل تمرين (?search=) — غير موجود،
# وحرقت 46 طلبًا بـ404. الشكل الصحيح: طلب قائمة واحد + مطابقة محلية + تنزيل CDN،
# وهو مُنفَّذ الآن في p12-fetch-gifs.mjs (node — نفس بيئة بقية سكربتات المشروع).
#
# الاستخدام (كما في docs/product/P12_ASSETS.md):
#   bash scripts/p12-fetch-gifs.sh --dry-run                       ← بلا شبكة
#   WORKOUTX_API_KEY=x bash scripts/p12-fetch-gifs.sh --probe      ← طلب واحد للتحقق
#   WORKOUTX_API_KEY=x bash scripts/p12-fetch-gifs.sh              ← التشغيل الكامل
set -u
exec node "$(cd "$(dirname "$0")" && pwd)/p12-fetch-gifs.mjs" "$@"
