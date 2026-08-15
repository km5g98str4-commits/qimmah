# القِمّة السيادية الليلية — الحالة الحقيقية للمستودع

> أُعيد بناء هذه الصورة من **Git وحده** بعد `git fetch --all --tags --prune`.
> لم يُعتمد على تاريخ محادثة ولا على تقرير وكيل — كل سطر أدناه له أمر يعيد إنتاجه.
> التاريخ: ٢٠٢٦-٠٨-١٦ · المستودع: `km5g98str4-commits/qimmah`

---

## ١. الرؤوس — ما استُوعب وما لم يُستوعب

`origin/main = cc60adf` (٢٠٢٦-٠٨-١١) — وهو **المنشور على الإنتاج** (Cloudflare Pages، مشروع `qimmah`).
كل الرؤوس أدناه متقدّمة عليه ولا شيء منها متأخّر عنه.

| المرجع | SHA | متقدّم على main | مستوعَب في الجبهة؟ |
|---|---|---|---|
| `codex/qimmah-final-release-convergence-001` **(محلّي)** | `9b44a74` | +٨٩ | **هو الجبهة** |
| ↳ نفسه على origin | `09012fb` | +٨٥ | ✅ سلف الجبهة (٤ التزامات لم تُدفع) |
| `audit/web-sovereign-final` | `42e44b2` | +١٩ | ✅ **مستوعَب** |
| `codex/qimmah-postweb-convergence-001` | `11a1464` | +٢٣ | ✅ **مستوعَب** |
| `codex/qimmah-release-convergence-001` | `54ad599` | +٢٨ | ✅ مستوعَب |
| `codex/qimmah-executive-dashboard-001` | `1091451` | +٢٣ | ✅ مستوعَب |
| `codex/qimmah-exercise-production-001` | `dfde745` | +٢٣ | ✅ مستوعَب |
| `codex/qimmah-food-production-001` | `e12bad0` | +٣٤ | ✅ مستوعَب |
| `codex/qimmah-web-sovereign-001` | `d83add2` | — | ✅ مستوعَب |
| `claude/founder-ux-access-gate-0rn49k` | `af5274b` | — | ✅ مستوعَب |
| `claude/web-sovereign-final-recovery-o8alub` | `d83add2` | — | ✅ مستوعَب |
| `codex/qimmah-web-integration` | `672302d` | — | ✅ مستوعَب |
| **`claude/salla-reconciled`** | **`f7270f6`** | +٣٤ | ❌ **غير مستوعَب — يحمل كامل خلفية التجارة** |
| `claude/codex-web-sovereign-trace-j9kzwz` | `6fce502` | +٦٣ | ❌ غير مستوعَب — **التزام واحد** فريد |
| `claude/web-rc-cto009` | `da11034` | +٢٠ | ❌ غير مستوعَب — **ولا يحمل محتوى فريدًا** (انظر §٣) |
| `claude/salla-activation` | `7590ce7` | +٢٢ | ❌ سلف متقادم لـ`salla-reconciled` |
| `claude/access-entitlements` | `df85c77` | +١٧ | ❌ سلف متقادم لـ`salla-reconciled` |

**التزامات الجبهة الأربعة التي لم تُدفع إلى origin** (كانت معرّضة للضياع، وهي الآن محفوظة داخل فرع هذه الموجة):
`9b44a74` · `58e8dd5` · `42e44b2` · `11a1464`.

**أمر التحقّق:**
```bash
git merge-base --is-ancestor <ref> 9b44a74 && echo ABSORBED || echo NOT-ABSORBED
```

---

## ٢. الشجرة العاملة والـworktrees

- المجلد الأساسي `/Users/ziyad/qimmah-deploy` على `claude/web-rc-cto009` — **فيه تعديلات غير مودعة وملفّات غير متتبَّعة** (`docs/audit/*` معدّلان، `ui-audit/onboarding/` غير متتبَّع). **لم تُلمس** (الميثاق §٢).
- عمل هذه الموجة معزول في worktree خاص: `/Users/ziyad/qimmah-overnight-rc` على `codex/qimmah-sovereign-overnight-rc-001`.
- ١٣٠+ worktree أخرى قائمة، كثير منها `prunable`. **لم يُحذف شيء** — التنظيف فعل لا رجعة فيه ويحتاج تفويضًا مسمّى.

---

## ٣. لماذا لا يُدمج `claude/web-rc-cto009` (da11034)

`git cherry` يثبت أن **كل** التزاماته العشرين مكافئة-رقعةً لما هو موجود أصلًا:
- عشرة التزامات واجهة ⇒ موجودة في الجبهة عبر `main cc60adf` (`ff93511`, `51767d2`, `d65f63c`, `1781f10`, `090ef15`, `18c4b30`, `0d0cfb7`, `1642e24`, `15b50b7`, `672302d`).
- عشرة التزامات قاعدة بيانات (P2) ⇒ موجودة في `salla-reconciled` **بصيغة أحدث** (تزيد `20260809120001‑4` و`20260812120001`، و`entitlements-proof` أطول بـ٥٦٤ سطرًا).

وأخطر من ذلك: **إعدادُه متأخّر لا متقدّم.** الجبهة تحمل ٧ خطوات / ١٨ سؤالًا وشاشة تسليم تعرض الخطة المولَّدة؛ وda11034 يحمل `LAST_INPUT_STEP = 4` (٥ خطوات) وشاشة تسليم بلا بيانات خطة، ولا يملك قاموسَي `trainingHistory`/`onboardingLifestyle` أصلًا. دمجه **حذفٌ لـ~١٨٨١ سطرًا** من الإعداد الحيّ.

⇒ **القرار: لا يُدمج.** يوفّر ذلك ١٠ تعارضات ولا يخسر حرفًا.

---

## ٤. ما كان أحمر — وقد أُغلق

| المكان | السير | الوظيفة/الخطوة | السبب |
|---|---|---|---|
| `codex/qimmah-final-release-convergence-001` | [31868130097](https://github.com/km5g98str4-commits/qimmah/actions/runs/31868130097) | Quality gate → `test:e2e:onboarding` | **عطل منتج حقيقي**: بوّابتان تحرسان `plan.saveEdit` بمسندين مختلفين، فيرمي الكاتبُ ما تمرّره الواجهة، ويبتلع `catch {}` المنعَ فيعرضه عطلًا بزرّ إعادة لا ينجح أبدًا. |
| `main` | 31478324999 (٢٠٢٦-٠٨-١١) | — | السجلّ منتهي الصلاحية. **متجاوَز**: أربع دورات Nightly خضراء متتالية ١٢–١٥ أغسطس. |

الإصلاح والإثبات: `[OVERNIGHT-1]` — `test:denial-honesty` (٢٠ فحصًا) داخل البوّابة.

---

## ٥. البيئة — ما نستطيعه وما لا نستطيعه الليلة

| القدرة | الحالة |
|---|---|
| Supabase — مشروع واحد `ledlypcyrtnzvjvhykwz` | **إنتاج فقط. لا staging.** المرجع مثبَّت كاحتياطي في `src/lib/supabaseClient.ts` |
| `supabase` CLI | ❌ غير مثبَّت |
| تطبيق الهجرات من هذا الجهاز | ❌ **مستحيل** ⇒ `APPLY_PENDING` |
| إثباتات قاعدة البيانات | ✅ تعمل كاملة بلا شبكة عبر PGlite 0.5.4 |
| `wrangler` CLI | ❌ غير مثبَّت (لكن اعتماد OAuth موجود في `~/Library/Preferences/.wrangler`) |
| نشر Cloudflare | تكامل Git على `main` — **ودفع main = نشر إنتاج**. لا خطوة نشر في CI. |
| `.env` حقيقي | ❌ غير موجود — `.env.example` فقط، وكل قيمه فارغة |
| متصفّحات | ✅ Chromium و WebKit مثبَّتان محليًّا |

---

## ٦. الفرع الرسمي لهذه الموجة

```
codex/qimmah-sovereign-overnight-rc-001
  ├── 9b44a74  الجبهة (٨٩ التزامًا فوق main)
  ├── [OVERNIGHT-1] إغلاق أحمر CI — صدق المنع
  └── [OVERNIGHT-2] دمج خلفية التجارة f7270f6 (٤ تعارضات، اتحاد متحقَّق منه)
```
