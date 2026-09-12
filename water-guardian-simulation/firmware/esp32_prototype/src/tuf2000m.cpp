#include "tuf2000m.h"
#include <string.h>
#include <math.h>

namespace wg {

float decode_real4(uint16_t r0, uint16_t r1, bool lowFirst) {
  uint32_t u = lowFirst ? ((uint32_t)r1 << 16) | r0 : ((uint32_t)r0 << 16) | r1;
  float f; memcpy(&f, &u, 4); return f;
}
int32_t decode_long(uint16_t r0, uint16_t r1, bool lowFirst) {
  uint32_t u = lowFirst ? ((uint32_t)r1 << 16) | r0 : ((uint32_t)r0 << 16) | r1;
  return (int32_t)u;
}

const char* tuf_step_desc(char s) {
  switch (s) {
    case 'R': return "normal";
    case 'I': return "no signal";
    case 'H': return "poor signal / low quality";
    case 'J': return "hardware fault";
    case 'G': return "adjusting gain";
    case 'K': return "empty pipe";
    case 'E': return "current-loop over-range";
    case 'Q': return "frequency over-range";
    case 'F': return "internal error";
  }
  return "unknown";
}

void tuf_validate(TufReading& r, const TufQualityPolicy& pol) {
  r.valid = false; r.invalidReason = nullptr;
  if (!r.commOk) { r.invalidReason = "NO_COMM"; return; }
  if (r.step != 'R') { r.invalidReason = tuf_step_desc(r.step); return; }
  if (r.errorBits & 0x000F) { r.invalidReason = "ERROR_BITS_SIGNAL"; return; }  // bits 0–3: no/low/poor signal, empty pipe
  if (r.quality < pol.minQuality) { r.invalidReason = "QUALITY_LOW"; return; }
  if (r.strengthUp < pol.minStrength || r.strengthDown < pol.minStrength) { r.invalidReason = "STRENGTH_LOW"; return; }
  if (r.transitRatio < pol.ratioMin || r.transitRatio > pol.ratioMax) { r.invalidReason = "TRANSIT_RATIO_OUT"; return; }
  if (isnan(r.flowM3h) || isinf(r.flowM3h) || fabsf(r.flowM3h) > 1000.0f) { r.invalidReason = "FLOW_NOT_A_NUMBER"; return; }
  r.valid = true;
}

TufReading tuf_poll(const MbTransport& t, uint8_t slave, bool lowFirst, const TufQualityPolicy& pol, uint32_t timeoutMs) {
  TufReading r;
  uint16_t a[8];   // regs 1..8  : flow(1-2) ... velocity(5-6) sound(7-8)
  uint16_t b[27];  // regs 72..98: error(72) ... step/quality(92) strengths(93,94) ratio(97-98)
  uint16_t c[2];   // regs 113..114 net total m³
  // Block 1
  r.mb = read_holding(t, slave, tufreg::FLOW_RATE_M3H - 1, 8, a, timeoutMs);
  if (r.mb != MbResult::OK) { tuf_validate(r, pol); return r; }
  r.flowM3h = decode_real4(a[0], a[1], lowFirst);
  r.velocityMs = decode_real4(a[4], a[5], lowFirst);
  // Block 2
  r.mb = read_holding(t, slave, tufreg::ERROR_CODE - 1, 27, b, timeoutMs);
  if (r.mb != MbResult::OK) { tuf_validate(r, pol); return r; }
  r.errorBits = b[0];
  uint16_t sq = b[92 - 72];
  r.step = (char)(sq >> 8);
  r.quality = (uint8_t)(sq & 0xFF);
  r.strengthUp = b[93 - 72];
  r.strengthDown = b[94 - 72];
  r.transitRatio = decode_real4(b[97 - 72], b[98 - 72], lowFirst);
  // Block 3
  r.mb = read_holding(t, slave, tufreg::NET_TOTAL_M3 - 1, 2, c, timeoutMs);
  if (r.mb != MbResult::OK) { tuf_validate(r, pol); return r; }
  r.netTotalM3 = decode_real4(c[0], c[1], lowFirst);
  r.commOk = true;
  tuf_validate(r, pol);
  return r;
}

}  // namespace wg
