#include "modbus_rtu.h"
#include <string.h>

namespace wg {

uint16_t crc16_modbus(const uint8_t* data, size_t len) {
  uint16_t crc = 0xFFFF;
  for (size_t i = 0; i < len; i++) {
    crc ^= data[i];
    for (int b = 0; b < 8; b++) {
      if (crc & 1) crc = (crc >> 1) ^ 0xA001;
      else crc >>= 1;
    }
  }
  return crc;  // transmitted low byte first
}

static MbResult exchange(const MbTransport& t, const uint8_t* req, size_t reqLen, uint8_t* resp, size_t expectLen, uint32_t timeoutMs) {
  t.flush_rx(t.user);
  if (t.write(req, reqLen, t.user) != reqLen) return MbResult::TX_ERROR;
  // Read header first (slave, function) to detect exception frames (5 bytes) early.
  size_t got = t.read(resp, 2, timeoutMs, t.user);
  if (got < 2) return MbResult::TIMEOUT;
  if (resp[1] & 0x80) {  // exception: id, fn|0x80, code, crc(2)
    got += t.read(resp + 2, 3, timeoutMs, t.user);
    if (got < 5) return MbResult::TIMEOUT;
    if (crc16_modbus(resp, 3) != (uint16_t)(resp[3] | (resp[4] << 8))) return MbResult::CRC_ERROR;
    return MbResult::EXCEPTION;
  }
  got += t.read(resp + 2, expectLen - 2, timeoutMs, t.user);
  if (got < expectLen) return MbResult::TIMEOUT;
  uint16_t crc = crc16_modbus(resp, expectLen - 2);
  if (crc != (uint16_t)(resp[expectLen - 2] | (resp[expectLen - 1] << 8))) return MbResult::CRC_ERROR;
  if (resp[0] != req[0] || resp[1] != req[1]) return MbResult::BAD_FRAME;
  return MbResult::OK;
}

MbResult read_holding(const MbTransport& t, uint8_t slave, uint16_t startAddr, uint16_t count, uint16_t* out, uint32_t timeoutMs) {
  if (count == 0 || count > 60) return MbResult::BAD_FRAME;
  uint8_t req[8] = {slave, 0x03, (uint8_t)(startAddr >> 8), (uint8_t)startAddr, (uint8_t)(count >> 8), (uint8_t)count, 0, 0};
  uint16_t crc = crc16_modbus(req, 6);
  req[6] = crc & 0xFF; req[7] = crc >> 8;
  uint8_t resp[5 + 2 * 60];
  size_t expectLen = 5 + 2 * count;
  MbResult r = exchange(t, req, 8, resp, expectLen, timeoutMs);
  if (r != MbResult::OK) return r;
  if (resp[2] != 2 * count) return MbResult::BAD_FRAME;
  for (uint16_t i = 0; i < count; i++) out[i] = (uint16_t)((resp[3 + 2 * i] << 8) | resp[4 + 2 * i]);  // register bytes are big-endian on the wire
  return MbResult::OK;
}

MbResult write_single(const MbTransport& t, uint8_t slave, uint16_t addr, uint16_t value, uint32_t timeoutMs) {
  uint8_t req[8] = {slave, 0x06, (uint8_t)(addr >> 8), (uint8_t)addr, (uint8_t)(value >> 8), (uint8_t)value, 0, 0};
  uint16_t crc = crc16_modbus(req, 6);
  req[6] = crc & 0xFF; req[7] = crc >> 8;
  uint8_t resp[8];
  MbResult r = exchange(t, req, 8, resp, 8, timeoutMs);
  if (r != MbResult::OK) return r;
  if (memcmp(req, resp, 6) != 0) return MbResult::BAD_FRAME;
  return MbResult::OK;
}

const char* mb_result_str(MbResult r) {
  switch (r) {
    case MbResult::OK: return "OK";
    case MbResult::TIMEOUT: return "TIMEOUT";
    case MbResult::CRC_ERROR: return "CRC_ERROR";
    case MbResult::EXCEPTION: return "EXCEPTION";
    case MbResult::BAD_FRAME: return "BAD_FRAME";
    case MbResult::TX_ERROR: return "TX_ERROR";
  }
  return "?";
}

}  // namespace wg
