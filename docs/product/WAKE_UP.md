# WAKE_UP.md — Night-Work Summary (2026-06-29)

## Preview URL

no preview generated — enable Netlify branch deploys / run `npm run dev` locally

_(PR #3 opened: https://github.com/km5g98str4-commits/gym-os-template/pull/3)_

---

## Rollback Tag

`pre-main-phase1` — points to commit `91a91b4` on `integration/phase1-smart-foundation`

Rollback release: https://github.com/km5g98str4-commits/gym-os-template/releases/tag/pre-main-phase1

---

## 9 Smoke-Test Steps to Run on Your Phone

Run locally: `npm install && npm run dev`, then open in browser (or on phone via local network):

1. **Splash:** on first load, the Qimmah splash overlay appears briefly (~1.7s) then fades; the app underneath is interactive immediately. (With reduced-motion enabled, it shows then disappears without animation.)

2. 2. **Onboarding → plan generation:** complete onboarding (PlanBuilder). Pick a goal, experience, days/week, equipment, an injury, a session duration, and a nutrition style. Finish.
  
   3. 3. **Training engine:** confirm the generated plan day count == chosen days/week; an advanced split (if chosen) is honored; an injury (knee/shoulder/back) removes risky lifts and keeps safe alternatives; shorter sessions have fewer exercises.
     
      4. 4. **Nutrition:** open the Nutrition tab. Calories/macros/water match the onboarding inputs. macros_only / simple_guidance show no meal suggestions; meal_suggestions builds meal sections from meals/day. Search foods (رز/chicken/كبسة/بخاري/كنافة).
        
         5. 5. **Dashboard binding:** the "Built for you" banner reflects the real plan (goal, days/week, split, daily calories, experience). Card order matches goal (cut/recomp → nutrition first, bulk/strength → workout first); beginner shows a Next-Action card, advanced shows a Progress Snapshot. Weekly adherence reads X/Y.
           
            6. 6. **Workout runtime + history:** start today's workout, log sets, finish. Confirm it appears in history and adherence advances. Start "تمرين فارغ" (empty workout) → safe empty state, no crash. Refresh the page → history persists (localStorage).
              
               7. 7. **Trust / reset:** Settings → full reset clears all qimmah:* keys and reloads to a clean start. Privacy/Terms "back" returns into the app (not out of it). Confirm no founder personal name in field placeholders; no "progress photo upload coming soon" claim.
                 
                  8. 8. **Isolated pages / routing:** visit #/contact (email + report-a-problem mailto links, reachable from the footer). Visit a bad hash like #/asdf → custom 404 page with the bad hash preserved in the URL; "back to home" is onboarding-guarded.
                    
                     9. 9. **RTL + responsive:** spot-check at 320px, 768px, 1280px; layout stays RTL and intact.
                       
                        10. ---
                       
                        11. ## Merge + Deploy Commands — Copy-Paste ONLY AFTER Smoke Test Passes
                       
                        12. **DO NOT run these until you have approved the smoke test:**
                       
                        13. ```bash
                            git checkout main && git pull origin main
                            git merge --no-ff integration/phase1-smart-foundation -m "Release Phase 1 smart foundation"
                            npm run build && npm run lint && (npm run typecheck || npx tsc -b --noEmit)
                            git push origin main
                            ```

                            ---

                            If smoke test fails, do NOT merge main; tell Claude what broke.
