/* Water Guardian — hydraulics helpers.
 * Q = v × A ;  A = π·D²/4.  Internal SI (m, m/s, m³/s); UI in mm, L/min.
 * Tag: CALCULATED (pure geometry — no empirical assumptions).
 * Works in browser (window.WG) and Node (module.exports).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.WG = Object.assign(root.WG || {}, factory());
})(typeof self !== 'undefined' ? self : this, function () {
  const PI = Math.PI;

  /** Cross-sectional area [m²] from internal diameter [mm]. */
  function areaM2(idMm) {
    const d = idMm / 1000;
    return (PI * d * d) / 4;
  }
  /** Volumetric flow [L/min] from velocity [m/s] and internal diameter [mm]. */
  function lpmFromVelocity(vMs, idMm) {
    return vMs * areaM2(idMm) * 1000 * 60; // m³/s → L/min
  }
  /** Velocity [m/s] from volumetric flow [L/min] and internal diameter [mm]. */
  function velocityFromLpm(lpm, idMm) {
    const a = areaM2(idMm);
    if (a <= 0) return 0;
    return (lpm / 1000 / 60) / a;
  }
  /** Litres accumulated for a flow [L/min] over dt seconds. */
  function litresOver(lpm, dtSeconds) {
    return (lpm / 60) * dtSeconds;
  }

  /* Common pipe geometries. Internal diameters are TYPICAL manufacturer
   * values for the stated standard and pressure class — tag ASSUMED (typical),
   * the real pipe must be measured (Phase 7 / Phase 10 Q8). */
  const PIPE_PRESETS = [
    { id: 'ppr20_pn20', label: 'PPR 20 mm PN20 (ID ≈ 13.2)', material: 'PPR', odMm: 20, wallMm: 3.4, idMm: 13.2 },
    { id: 'ppr25_pn20', label: 'PPR 25 mm PN20 (ID ≈ 16.6)', material: 'PPR', odMm: 25, wallMm: 4.2, idMm: 16.6 },
    { id: 'ppr32_pn20', label: 'PPR 32 mm PN20 (ID ≈ 21.2)', material: 'PPR', odMm: 32, wallMm: 5.4, idMm: 21.2 },
    { id: 'ppr40_pn20', label: 'PPR 40 mm PN20 (ID ≈ 26.6)', material: 'PPR', odMm: 40, wallMm: 6.7, idMm: 26.6 },
    { id: 'ppr50_pn20', label: 'PPR 50 mm PN20 (ID ≈ 33.2)', material: 'PPR', odMm: 50, wallMm: 8.4, idMm: 33.2 },
    { id: 'pvc25_c', label: 'uPVC 25 mm Class C (ID ≈ 21.2)', material: 'PVC', odMm: 25, wallMm: 1.9, idMm: 21.2 },
    { id: 'pvc32_c', label: 'uPVC 32 mm Class C (ID ≈ 28.2)', material: 'PVC', odMm: 32, wallMm: 1.9, idMm: 28.2 },
    { id: 'cpvc_3_4', label: 'CPVC ¾" CTS (ID ≈ 20.3)', material: 'CPVC', odMm: 22.2, wallMm: 0.95, idMm: 20.3 },
    { id: 'cu22', label: 'Copper 22 mm (ID ≈ 20.2)', material: 'Copper', odMm: 22, wallMm: 0.9, idMm: 20.2 },
    { id: 'gi_3_4', label: 'Galvanized steel ¾" Sch40 (ID ≈ 20.9)', material: 'Galvanized Steel', odMm: 26.7, wallMm: 2.87, idMm: 20.9 },
    { id: 'gi_1', label: 'Galvanized steel 1" Sch40 (ID ≈ 26.6)', material: 'Galvanized Steel', odMm: 33.4, wallMm: 3.38, idMm: 26.6 },
    { id: 'gi_2', label: 'Galvanized steel 2" Sch40 (ID ≈ 52.5)', material: 'Galvanized Steel', odMm: 60.3, wallMm: 3.91, idMm: 52.5 },
    { id: 'steel_dn50', label: 'Steel DN50 (ID ≈ 52.5)', material: 'Steel', odMm: 60.3, wallMm: 3.9, idMm: 52.5 },
    { id: 'custom', label: 'Custom / Unknown', material: 'Custom/Unknown', odMm: 32, wallMm: 3, idMm: 26 },
  ];

  /** Table: velocity [m/s] of each flow on each internal diameter. */
  function velocityTable(flowsLpm, idsMm) {
    return flowsLpm.map((q) => ({
      lpm: q,
      byId: idsMm.map((id) => ({ idMm: id, vMs: velocityFromLpm(q, id) })),
    }));
  }

  return { areaM2, lpmFromVelocity, velocityFromLpm, litresOver, PIPE_PRESETS, velocityTable };
});
