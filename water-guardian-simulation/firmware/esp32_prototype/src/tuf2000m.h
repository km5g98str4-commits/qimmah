// Water Guardian — TUF-2000M register map + decoding.
//
// SOURCE: TUF-2000M User Manual v13.44 (Dalian/OEM), section "Modbus register address table",
// mirrored at https://raw.githubusercontent.com/gambit-labs/challenge/master/docs/tuf-2000m.pdf
// Cross-checked against three open-source readers (AiltonFidelix/TUF-2000M, jkkorpi70/TUF2000M,
// arivin29/note-rencana). See research/notes/tuf2000m.md for the evidence and the conflicts.
//
// Manual numbers registers from 1. PDU address = manual register − 1. Constants below are MANUAL numbers.
// Function codes: 0x03 (read holding), 0x06 (write single). Default: 9600 8N1, address 1.
// ⚠️ Default protocol is MODBUS-ASCII (menu M63). Set M63 = 1 (MODBUS-RTU) on the meter keypad first.
// ⚠️ REAL4 word order: low word first (CDAB) per three independent implementations — one blog claims
//    big-endian → we keep a runtime toggle (WORD_ORDER_LOW_FIRST) and a self-check on register 221 (inner Ø).
#pragma once
#include <stdint.h>
#include "modbus_rtu.h"

namespace wg {

namespace tufreg {
constexpr uint16_t FLOW_RATE_M3H   = 1;    // REAL4, m³/h (unit follows reg 1437; default m³/h)
constexpr uint16_t VELOCITY_MS     = 5;    // REAL4, m/s
constexpr uint16_t SOUND_SPEED     = 7;    // REAL4, m/s (fluid)
constexpr uint16_t POS_TOTAL_LONG  = 9;    // LONG (unit reg 1438 × 10^(reg1439−3))
constexpr uint16_t NET_TOTAL_LONG  = 25;   // LONG
constexpr uint16_t TEMP_T1         = 33;   // REAL4 °C (inlet, if PT100 fitted)
constexpr uint16_t ERROR_CODE      = 72;   // BIT16 (bit0 no signal, bit1 low signal, bit2 poor signal, bit3 pipe empty, ... bit15 AI over-range)
constexpr uint16_t STEP_AND_QUALITY= 92;   // INT: hi byte = working step, lo byte = signal quality 0–99
constexpr uint16_t STRENGTH_UP     = 93;   // INT 0–2047 (display M90 scales to 0–99.9)
constexpr uint16_t STRENGTH_DOWN   = 94;   // INT 0–2047
constexpr uint16_t TRANSIT_RATIO   = 97;   // REAL4, % (normal 100 ± 3)
constexpr uint16_t NET_TOTAL_M3    = 113;  // REAL4 net total in m³ (simplest totalizer)
constexpr uint16_t POS_TOTAL_M3    = 115;  // REAL4
constexpr uint16_t INNER_DIAMETER  = 221;  // REAL4 mm (used as a word-order self-check)
constexpr uint16_t FLOW_UNIT       = 1437; // INT
constexpr uint16_t MODBUS_ADDRESS  = 1442; // INT
}  // namespace tufreg

// Working-step letters (manual M08 / reg 92 hi byte). Values as reported by the manual's ASCII code.
enum class TufStep : char { R = 'R', I = 'I', H = 'H', J = 'J', G = 'G', K = 'K', E = 'E', Q = 'Q', F = 'F', UNKNOWN = '?' };
const char* tuf_step_desc(char step);

struct TufReading {
  bool commOk = false;         // Modbus exchange succeeded
  MbResult mb = MbResult::TIMEOUT;
  float flowM3h = 0, velocityMs = 0, netTotalM3 = 0, transitRatio = 0;
  uint16_t errorBits = 0;
  char step = '?';
  uint8_t quality = 0;         // 0–99
  uint16_t strengthUp = 0, strengthDown = 0;  // 0–2047
  bool valid = false;          // firmware decision: measurement trustworthy?
  const char* invalidReason = nullptr;
  float flowLpm() const { return flowM3h * 1000.0f / 60.0f; }
};

struct TufQualityPolicy {
  uint8_t minQuality = 60;        // manual: Q 60–90 normal, ≥50 acceptable → we use 60 (ASSUMED policy)
  uint16_t minStrength = 60 * 2047 / 100; // manual "strength ≥60 (of 99.9)" → raw ≥ ~1228 (ASSUMED mapping)
  float ratioMin = 97.0f, ratioMax = 103.0f;  // manual: 100 ± 3 %
};

// Decode two 16-bit registers into IEEE754 float. lowFirst=true → reg[0] is the LOW word (CDAB).
float decode_real4(uint16_t r0, uint16_t r1, bool lowFirst);
int32_t decode_long(uint16_t r0, uint16_t r1, bool lowFirst);

// Full poll of the meter. Returns a reading; commOk=false on any Modbus failure.
TufReading tuf_poll(const MbTransport& t, uint8_t slave, bool wordOrderLowFirst, const TufQualityPolicy& pol, uint32_t timeoutMs);

// Apply validity policy to a raw reading (separated for unit tests).
void tuf_validate(TufReading& r, const TufQualityPolicy& pol);

}  // namespace wg
