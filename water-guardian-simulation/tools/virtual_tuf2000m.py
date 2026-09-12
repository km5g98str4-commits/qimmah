#!/usr/bin/env python3
"""
Virtual TUF-2000M — a Modbus RTU *slave* that answers like the meter's register map
(LAYER C: communication model). Use it to exercise the ESP32 firmware (or any Modbus
master) BEFORE the real meter arrives.

    pip install pyserial            # (pymodbus not required — framing is implemented here)
    # Linux/mac: create a virtual serial pair
    socat -d -d pty,raw,echo=0 pty,raw,echo=0
    python3 tools/virtual_tuf2000m.py --port /dev/pts/3 --flow-lpm 3.0 --quality 85
    # or a USB-RS485 adapter wired A/B to the ESP32's RS485 module:
    python3 tools/virtual_tuf2000m.py --port /dev/ttyUSB0 --flow-lpm 3.0

Register numbering follows the manual (1-based); PDU address = register − 1.
Values: flow (1–2, m³/h REAL4), velocity (5–6), error bits (72), step/quality (92),
strengths (93/94, 0–2047), transit ratio (97–98), net total m³ (113–114), inner Ø (221–222).
Word order is low-word-first (CDAB) by default, switchable with --high-first so the
firmware's self-check can be tested in both directions.

⚠️ This emulates the *protocol*, not the acoustics. Options --step, --quality, --strength
let you emulate "no signal", "poor signal", "empty pipe" so the firmware's SENSOR_UNKNOWN
path can be tested. Tag: SIMULATED.
"""
import argparse, struct, time, math, random, sys

try:
    import serial  # pyserial
except ImportError:
    serial = None

def crc16(data: bytes) -> int:
    crc = 0xFFFF
    for b in data:
        crc ^= b
        for _ in range(8):
            crc = (crc >> 1) ^ 0xA001 if crc & 1 else crc >> 1
    return crc

def real4_words(f: float, low_first: bool):
    u = struct.unpack('>I', struct.pack('>f', f))[0]
    hi, lo = u >> 16, u & 0xFFFF
    return (lo, hi) if low_first else (hi, lo)

class VirtualMeter:
    def __init__(self, a):
        self.a = a
        self.total_m3 = 0.0
        self.t0 = time.time()
        self.last = self.t0
        self.regs = {}

    def refresh(self):
        now = time.time(); dt = now - self.last; self.last = now
        a = self.a
        flow_lpm = a.flow_lpm
        if a.noise_lpm: flow_lpm += random.gauss(0, a.noise_lpm)
        area = math.pi * (a.id_mm / 1000) ** 2 / 4
        vel = (flow_lpm / 1000 / 60) / area if area else 0.0
        if abs(vel) < a.cutoff_ms: flow_lpm = 0.0; vel = 0.0
        if a.step != 'R': flow_lpm = 0.0; vel = 0.0   # meter shows 0 with no signal — the dangerous case
        self.total_m3 += a.flow_lpm / 1000 / 60 * dt   # true volume regardless of what is displayed
        r = {}
        def put(reg, words):
            for i, w in enumerate(words): r[reg + i] = w & 0xFFFF
        lf = not a.high_first
        put(1, real4_words(flow_lpm * 60 / 1000, lf))    # m³/h
        put(5, real4_words(vel, lf))
        put(7, real4_words(1482.0, lf))                  # sound speed water 20 °C
        put(33, real4_words(25.0, lf)); put(35, real4_words(25.0, lf))
        err = 0
        if a.step == 'I': err |= 1
        if a.step == 'H': err |= 4
        if a.step == 'K': err |= 8
        put(72, [err])
        put(92, [(ord(a.step) << 8) | (a.quality & 0xFF)])
        put(93, [a.strength]); put(94, [a.strength])
        put(97, real4_words(a.ratio, lf))
        put(113, real4_words(self.total_m3, lf)); put(115, real4_words(self.total_m3, lf))
        put(221, real4_words(a.id_mm, lf))
        put(1437, [0]); put(1438, [0]); put(1439, [3]); put(1442, [a.slave])
        self.regs = r

    def handle(self, frame: bytes):
        if len(frame) < 8: return None
        slave, fn = frame[0], frame[1]
        if slave != self.a.slave: return None
        if crc16(frame[:-2]) != (frame[-2] | frame[-1] << 8): return None
        if fn == 3:
            start, count = struct.unpack('>HH', frame[2:6])
            if count == 0 or count > 125: return self.exc(fn, 3)
            self.refresh()
            body = b''.join(struct.pack('>H', self.regs.get(start + 1 + i, 0)) for i in range(count))
            pdu = bytes([slave, 3, len(body)]) + body
        elif fn == 6:
            addr, val = struct.unpack('>HH', frame[2:6])
            self.regs[addr + 1] = val
            pdu = frame[:6]
        else:
            return self.exc(fn, 1)
        c = crc16(pdu)
        return pdu + bytes([c & 0xFF, c >> 8])

    def exc(self, fn, code):
        pdu = bytes([self.a.slave, fn | 0x80, code]); c = crc16(pdu)
        return pdu + bytes([c & 0xFF, c >> 8])

def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--port', required=True); p.add_argument('--baud', type=int, default=9600)
    p.add_argument('--slave', type=int, default=1)
    p.add_argument('--flow-lpm', type=float, default=0.0); p.add_argument('--noise-lpm', type=float, default=0.0)
    p.add_argument('--id-mm', type=float, default=16.6); p.add_argument('--cutoff-ms', type=float, default=0.03)
    p.add_argument('--step', default='R', help='R normal, I no signal, H poor, K empty pipe, J hardware')
    p.add_argument('--quality', type=int, default=85); p.add_argument('--strength', type=int, default=1600)
    p.add_argument('--ratio', type=float, default=100.0); p.add_argument('--high-first', action='store_true')
    p.add_argument('--drop', type=float, default=0.0, help='probability to ignore a request (timeout test)')
    p.add_argument('--corrupt', type=float, default=0.0, help='probability to corrupt the CRC (CRC test)')
    p.add_argument('--selftest', action='store_true', help='run framing self-test without a serial port')
    a = p.parse_args()
    vm = VirtualMeter(a)
    if a.selftest:
        req = bytes([1, 3, 0, 0, 0, 2]); req += bytes([crc16(req) & 0xFF, crc16(req) >> 8])
        resp = vm.handle(req); assert resp and resp[1] == 3 and len(resp) == 9, resp
        w = struct.unpack('>HH', resp[3:7]); f = struct.unpack('>f', struct.pack('>HH', w[1], w[0]))[0]
        print('selftest OK — flow m3/h decoded (low-first):', round(f, 5), ' expected', round(a.flow_lpm * 60 / 1000, 5))
        return
    if serial is None: sys.exit('pip install pyserial')
    s = serial.Serial(a.port, a.baud, timeout=0.05)
    print(f'virtual TUF-2000M on {a.port} @ {a.baud} slave={a.slave} flow={a.flow_lpm} L/min step={a.step} Q={a.quality}')
    buf = b''; last = time.time()
    while True:
        chunk = s.read(64)
        if chunk: buf += chunk; last = time.time()
        elif buf and time.time() - last > 0.01:   # 3.5-char silence at 9600 ≈ 4 ms
            resp = vm.handle(buf); buf = b''
            if resp is not None:
                if random.random() < a.drop: print('drop'); continue
                if random.random() < a.corrupt: resp = resp[:-1] + bytes([resp[-1] ^ 0xFF])
                s.write(resp)

if __name__ == '__main__':
    main()
