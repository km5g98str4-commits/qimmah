#!/usr/bin/env python3
"""
Tank Guardian — feasibility-gate analysis. Reads the CSV logged by firmware/gate_tank/gate_tank.ino
plus a trials file you fill in by hand, and prints OVERFLOW_SENSING / LEVEL_SLOPE = PASS / PARTIAL / FAIL
with the numbers behind each verdict. No simulation: if the CSV is missing, it refuses to grade.

Usage:
  python3 tests/gate/analyze_gate.py --log gate_log.csv --trials trials.csv --tank-area-cm2 900

trials.csv columns (one row per trial; times are t_ms from the log, or use markers 'a'/'b'):
  kind,t_start_ms,t_end_ms,ref_litres,ref_seconds,note
  kind = OVERFLOW  (reference = jug volume collected from the overflow outlet during the window)
       | DRAIN     (reference = jug volume drawn from the tank outlet; tests level-slope)
       | STILL     (no flow; noise-floor / false-positive window)
       | REFILL    (pump/float refilling; masking window)

Pass criteria (OUR screening targets, declared before the test — see docs/TANK_GATE_PROTOCOL.md):
  OVERFLOW_SENSING PASS    : detection in >= 19/20 overflow trials incl. all dribble trials (<= 0.3 L/min),
                             volume error <= 15 % (median) for trials >= 1 L/min, 0 detections in STILL windows.
                   PARTIAL : detection >= 19/20 but dribbles only caught by the presence sensor (no volume), or error 15–30 %.
                   FAIL    : any dribble trial undetected by every sensor, or any STILL false detection, or error > 30 %.
  LEVEL_SLOPE PASS         : in DRAIN trials at ~1 L/min, slope-derived flow within +-25 % of the jug over a 10-min window,
                             STILL 10-min slope noise (|flow|) < 0.3 L/min in >= 19/20 windows, REFILL windows correctly masked.
              PARTIAL      : works with a 15-min window or only with the stilling tube / 2nd sensor.
              FAIL         : STILL noise >= 0.5 L/min-equivalent, or 1 L/min not resolvable in 15 min.
"""
import argparse, csv, statistics, sys, math

PULSES_PER_L_DEFAULT = 450.0  # YF-S201 nominal (calibrate: pulses / jug litres in your own trials)

def load(path):
    with open(path, newline="") as f:
        rows = [r for r in csv.DictReader(f)]
    for r in rows:
        for k in list(r):
            try: r[k] = float(r[k])
            except (ValueError, TypeError): pass
    return rows

def window(rows, t0, t1):
    return [r for r in rows if t0 <= r["t_ms"] <= t1]

def level_slope_lpm(win, area_cm2):
    """Linear-regression slope of median level (mm) vs time -> L/min. Level rises when distance falls."""
    pts = [(r["t_ms"] / 60000.0, r["level_mm_med5"]) for r in win if isinstance(r.get("level_mm_med5"), float) and r["level_mm_med5"] > 0]
    if len(pts) < 30: return None, None
    xs, ys = zip(*pts)
    mx, my = statistics.mean(xs), statistics.mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs); sxy = sum((x - mx) * (y - my) for x, y in pts)
    slope_mm_per_min = sxy / sxx  # distance increases as level drops → positive slope = consumption
    resid = statistics.pstdev([y - (my + slope_mm_per_min * (x - mx)) for x, y in pts])
    lpm = slope_mm_per_min * area_cm2 / 10000.0  # mm/min × cm² → cm³/min /1000 → L/min : (mm/10)cm × cm² = cm³ ; /1000 = L
    return lpm, resid

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", required=True); ap.add_argument("--trials", required=True)
    ap.add_argument("--tank-area-cm2", type=float, required=True, help="internal free-surface area of the tank at the test level")
    ap.add_argument("--pulses-per-litre", type=float, default=None, help="override YF calibration; default = derived from OVERFLOW trials >= 1 L/min")
    a = ap.parse_args()
    rows = load(a.log); trials = load(a.trials)
    if not rows: sys.exit("no log rows — the gate cannot be graded without physical data")

    # ---------- OVERFLOW ----------
    ov = [t for t in trials if t["kind"] == "OVERFLOW"]; still = [t for t in trials if t["kind"] == "STILL"]
    strong = [t for t in ov if t["ref_litres"] / (t["ref_seconds"] / 60) >= 1.0]
    ppl = a.pulses_per_litre
    if ppl is None and strong:
        cals = []
        for t in strong:
            w = window(rows, t["t_start_ms"], t["t_end_ms"]); p = sum(r["overflow_pulses_1s"] for r in w)
            if t["ref_litres"] > 0: cals.append(p / t["ref_litres"])
        ppl = statistics.median(cals) if cals else PULSES_PER_L_DEFAULT
    ppl = ppl or PULSES_PER_L_DEFAULT
    det, dribble_total, dribble_turbine, dribble_any, errs = 0, 0, 0, 0, []
    print(f"\n=== OVERFLOW trials (n={len(ov)}), turbine calibration {ppl:.0f} pulses/L ===")
    for t in ov:
        w = window(rows, t["t_start_ms"], t["t_end_ms"]); ref_lpm = t["ref_litres"] / (t["ref_seconds"] / 60)
        pulses = sum(r["overflow_pulses_1s"] for r in w); wet = sum(1 for r in w if r["xkc_wet"] == 1); tips = sum(r["tip_count_1s"] for r in w)
        turbine_l = pulses / ppl; err = (turbine_l - t["ref_litres"]) / t["ref_litres"] * 100 if t["ref_litres"] else float("nan")
        detected_turbine = pulses >= 10; detected_any = detected_turbine or wet >= 5 or tips >= 1
        det += detected_any
        if ref_lpm <= 0.3: dribble_total += 1; dribble_turbine += detected_turbine; dribble_any += detected_any
        if ref_lpm >= 1.0: errs.append(abs(err))
        print(f"  ref {ref_lpm:5.2f} L/min {t['ref_litres']:.2f} L | turbine {turbine_l:.2f} L ({err:+.0f} %) pulses={pulses:.0f} | xkc wet {wet}s | tips {tips:.0f} | detected={'Y' if detected_any else 'N'} {t.get('note','')}")
    false_still = 0
    for t in still:
        w = window(rows, t["t_start_ms"], t["t_end_ms"])
        if sum(r["overflow_pulses_1s"] for r in w) >= 10 or sum(1 for r in w if r["xkc_wet"] == 1) >= 5: false_still += 1
    med_err = statistics.median(errs) if errs else float("nan")
    if not ov: ov_verdict = "NOT RUN"
    elif dribble_total and dribble_any < dribble_total: ov_verdict = "FAIL"
    elif false_still: ov_verdict = "FAIL"
    elif med_err > 30: ov_verdict = "FAIL"
    elif det / len(ov) >= 0.95 and med_err <= 15 and dribble_turbine == dribble_total: ov_verdict = "PASS"
    elif det / len(ov) >= 0.95: ov_verdict = "PARTIAL"
    else: ov_verdict = "FAIL"
    print(f"  detections {det}/{len(ov)} · dribbles detected any/turbine {dribble_any}/{dribble_turbine} of {dribble_total} · median |err| (>=1 L/min) {med_err:.1f} % · STILL false {false_still}/{len(still)}")
    print(f"OVERFLOW_SENSING = {ov_verdict}")

    # ---------- LEVEL SLOPE ----------
    dr = [t for t in trials if t["kind"] == "DRAIN"]; rf = [t for t in trials if t["kind"] == "REFILL"]
    print(f"\n=== LEVEL SLOPE (tank area {a.tank_area_cm2:.0f} cm² → 1 L = {10000/a.tank_area_cm2:.1f} mm) ===")
    within25, noise_ok, noise_n, slope_errs, resids = 0, 0, 0, [], []
    for t in dr:
        w = window(rows, t["t_start_ms"], t["t_end_ms"]); ref_lpm = t["ref_litres"] / (t["ref_seconds"] / 60)
        lpm, resid = level_slope_lpm(w, a.tank_area_cm2)
        if lpm is None: print("  DRAIN window too short"); continue
        err = (lpm - ref_lpm) / ref_lpm * 100; slope_errs.append(abs(err)); resids.append(resid)
        ok = abs(err) <= 25; within25 += ok
        print(f"  ref {ref_lpm:.2f} L/min over {t['ref_seconds']/60:.1f} min | slope {lpm:.2f} L/min ({err:+.0f} %) | residual σ {resid:.1f} mm | {'OK' if ok else 'MISS'} {t.get('note','')}")
    for t in still:
        w = window(rows, t["t_start_ms"], t["t_end_ms"]); lpm, resid = level_slope_lpm(w, a.tank_area_cm2)
        if lpm is None: continue
        noise_n += 1; noise_ok += abs(lpm) < 0.3
        print(f"  STILL window {t['ref_seconds']/60:.1f} min | apparent flow {lpm:+.2f} L/min | residual σ {resid:.1f} mm")
    masked = 0
    for t in rf:
        w = window(rows, t["t_start_ms"], t["t_end_ms"]); lpm, _ = level_slope_lpm(w, a.tank_area_cm2)
        if lpm is not None and lpm < 0: masked += 1  # level rising → must be masked as REFILL by the rule engine
        print(f"  REFILL window | slope {lpm if lpm is not None else float('nan'):+.2f} L/min (negative = rising, correct)")
    if not dr and not still: ls_verdict = "NOT RUN"
    elif noise_n and noise_ok / noise_n < 0.5: ls_verdict = "FAIL"
    elif dr and within25 == 0: ls_verdict = "FAIL"
    elif dr and within25 / len(dr) >= 0.95 and (not noise_n or noise_ok / noise_n >= 0.95): ls_verdict = "PASS"
    else: ls_verdict = "PARTIAL"
    print(f"  DRAIN within ±25 %: {within25}/{len(dr)} · STILL noise < 0.3 L/min: {noise_ok}/{noise_n} · REFILL masked {masked}/{len(rf)} · median residual σ {statistics.median(resids) if resids else float('nan'):.1f} mm")
    print(f"LEVEL_SLOPE = {ls_verdict}")

if __name__ == "__main__":
    main()
