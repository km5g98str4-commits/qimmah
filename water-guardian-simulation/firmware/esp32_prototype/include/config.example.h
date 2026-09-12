// Water Guardian — configuration TEMPLATE. Copy to include/config.h (git-ignored) and edit.
// NEVER commit real credentials. config.h is listed in .gitignore.
#pragma once

// ---- Wi-Fi ----
#define WG_WIFI_SSID      "your-ssid"
#define WG_WIFI_PASS      "your-password"

// ---- Telegram (OPTIONAL). Leave BOT_TOKEN empty to disable. ----
// Create a bot with @BotFather, get chat id from @userinfobot. Uses api.telegram.org over HTTPS.
#define WG_TG_BOT_TOKEN   ""
#define WG_TG_CHAT_ID     ""

// ---- Backend (OPTIONAL simple HTTP POST of JSON events). Empty = disabled. ----
#define WG_BACKEND_URL    ""

// ---- Site labels ----
#define WG_SITE_NAME      "Mosque Pilot"
#define WG_ZONE_NAME      "Ablution Supply"

// ---- RS485 / Modbus ----
#define WG_RS485_RX_PIN   16     // ESP32 UART2 RX  ← module RO / RXD
#define WG_RS485_TX_PIN   17     // ESP32 UART2 TX  → module DI / TXD
#define WG_RS485_DE_PIN   4      // DE+RE tied together (MAX3485 boards). Set to -1 for auto-direction modules.
#define WG_MODBUS_BAUD    9600   // TUF-2000M default (M62)
#define WG_MODBUS_SLAVE   1      // TUF-2000M default address (M46)
#define WG_MODBUS_TIMEOUT_MS 300
#define WG_WORD_ORDER_LOW_FIRST true   // CDAB per 3 open-source readers; flip if reg 221 self-check fails
#define WG_POLL_INTERVAL_MS 1000

// ---- Schedule (local time via NTP; QUIET unless inside a window) ----
// Prayer windows are site-specific: the caretaker sets them. Format {startMin, endMin} minutes after midnight.
#define WG_TZ             "<+03>-3"   // Arabia Standard Time (POSIX TZ)
#define WG_OCCUPIED_WINDOWS { {4*60+30, 6*60}, {11*60+45, 13*60+30}, {15*60, 16*60+15}, {18*60, 19*60+15}, {19*60+30, 21*60} }
