// Water Guardian — minimal Modbus RTU master (FC03 read holding registers, FC06 write single).
// Hardware-agnostic: the transport is injected so the same code runs on ESP32 (HardwareSerial +
// DE/RE pin) and in native host tests (fake byte streams).
#pragma once
#include <stdint.h>
#include <stddef.h>

namespace wg {

enum class MbResult : uint8_t {
  OK = 0,
  TIMEOUT,        // no bytes / incomplete frame within timeout → sensor disconnected or wrong wiring
  CRC_ERROR,      // frame received but CRC mismatch → noise, wrong baud, A/B swapped
  EXCEPTION,      // slave replied with exception (illegal address/function)
  BAD_FRAME,      // wrong slave id / function / byte count
  TX_ERROR,
};

struct MbTransport {
  // Write bytes to the bus (driver must assert DE/RE around the write when using MAX485/MAX3485).
  size_t (*write)(const uint8_t* data, size_t len, void* user);
  // Read up to `len` bytes, waiting at most `timeoutMs`. Returns bytes read.
  size_t (*read)(uint8_t* buf, size_t len, uint32_t timeoutMs, void* user);
  void (*flush_rx)(void* user);
  void* user;
};

uint16_t crc16_modbus(const uint8_t* data, size_t len);

// Reads `count` holding registers starting at PDU address `startAddr` (0-based!).
// NOTE: The TUF-2000M manual numbers registers from 1 → PDU address = manual register − 1.
MbResult read_holding(const MbTransport& t, uint8_t slave, uint16_t startAddr, uint16_t count,
                      uint16_t* out, uint32_t timeoutMs);

MbResult write_single(const MbTransport& t, uint8_t slave, uint16_t addr, uint16_t value, uint32_t timeoutMs);

const char* mb_result_str(MbResult r);

}  // namespace wg
