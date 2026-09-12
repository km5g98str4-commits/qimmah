# Water Guardian — Architecture diagrams (Mermaid)

Render with any Mermaid viewer (GitHub, VS Code, mermaid.live). SVG copies: `architecture.svg`, `wiring.svg`, `hydraulic_layout.svg`.

## 1. System architecture (MVP)

```mermaid
flowchart TB
  P[Existing water pipe<br/>DN20–DN32 branch, full, straight run] -->|acoustic path, no cutting| T[Clamp-on transducers TS-2<br/>V-method + couplant]
  T -->|coax| M[TUF-2000M module<br/>8–36 VDC · Modbus RTU 9600 8N1<br/>reg 1-2 flow · reg 92 Q · reg 72 errors]
  M -->|RS485 A/B, isolated port| R[RS485 ↔ TTL 3.3 V<br/>MAX3485 or isolated DFR0845]
  R -->|UART2 16/17| E[ESP32 you already own]
  E --> V{Validity policy<br/>step=R? Q≥60? ratio 97–103? bits 0–3 clear?}
  V -->|invalid| U[SENSOR_UNKNOWN<br/>never zero]
  V -->|valid| A[30 s moving average]
  A --> S[Rule engine<br/>QUIET / OCCUPIED / CLEANING<br/>threshold + persistence]
  S --> N[NVS buffer<br/>incident + unsynced events]
  N -->|Wi-Fi when available| C[Telegram bot / backend]
  C --> H[Caretaker phone]
  H -->|inspect · acknowledge · fix| P
  S -->|flow below threshold for resolveMin| Z[INCIDENT_RESOLVED]
```

## 2. Detection state machine

```mermaid
stateDiagram-v2
  [*] --> NORMAL
  NORMAL --> PERSISTENT_FLOW: QUIET & avg flow > threshold
  NORMAL --> EXPECTED_FLOW: OCCUPIED/CLEANING & flow > threshold
  PERSISTENT_FLOW --> NORMAL: flow < threshold−hyst for gapTolerance
  PERSISTENT_FLOW --> UNEXPECTED_FLOW: above for persistenceMinQuiet
  EXPECTED_FLOW --> REVIEW: above for persistenceMinOccupied (low priority)
  EXPECTED_FLOW --> NORMAL: flow stops
  EXPECTED_FLOW --> UNEXPECTED_FLOW: CLEANING override expired & QUIET rule met
  UNEXPECTED_FLOW --> RESOLVED: below (threshold−hyst) for resolveMin
  REVIEW --> RESOLVED: below for resolveMin
  UNEXPECTED_FLOW --> EXPECTED_FLOW: caretaker: EXPECTED ACTIVITY
  RESOLVED --> NORMAL: resolvedDisplayMin elapsed
  state "any state" as ANY
  ANY --> SENSOR_UNKNOWN: comm lost / Q low / error bits for > grace
  SENSOR_UNKNOWN --> ANY: valid data returns (incident preserved)
  note right of SENSOR_UNKNOWN
    Invalid data is NOT zero flow.
    Open incidents are frozen, not resolved.
  end note
```

## 3. Wiring (see wiring.svg for the drawn version)

```mermaid
flowchart LR
  PSU[24 VDC PSU 1 A<br/>(12 V also OK: meter 8–36 V)] -->|+24 V / GND| M[TUF-2000M<br/>terminals 8~36V+ / −]
  PSU -->|+24 V| B[LM2596 buck → 5 V]
  B -->|5 V → VIN| E[ESP32 DevKit]
  M -->|485+ A| X[RS485 module<br/>A B GND]
  M -->|485− B| X
  X -->|RO / RXD| E16[ESP32 GPIO16 RX2]
  X -->|DI / TXD| E17[ESP32 GPIO17 TX2]
  X -->|DE+RE| E4[ESP32 GPIO4<br/>(omit on auto-direction module)]
  X -->|VCC 3.3 V| E33[ESP32 3V3]
  X -->|GND| EG[ESP32 GND]
  M -.->|GND reference only if module NOT isolated| EG
  TR[120 Ω termination<br/>at far end only] --- X
```
