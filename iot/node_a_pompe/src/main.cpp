#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>

// NODE A - Irrigation Controller
// Smart Farm AI v3.0
// Telemetry via HTTP POST to FastAPI backend (same code in simulation and on real hardware)
// In Wokwi: set API_HOST to your PC's LAN IP (e.g. 192.168.1.10)
// On real hardware: set API_HOST to your server's IP or domain

// ---------------------------------------------------------------------------
// CONFIG - change only these two lines between simulation and production
// ---------------------------------------------------------------------------
const char* WIFI_SSID = "Wokwi-GUEST";   // real hardware: your WiFi SSID
const char* WIFI_PASS = "";               // real hardware: your WiFi password
const char* API_HOST  = "192.168.1.48";  // PC LAN IP — update if your IP changes
const int   API_PORT  = 8000;
// ---------------------------------------------------------------------------

#define FORCE_DAY_TEST true   // bypass NTP schedule in simulation; set false on real hardware

const char* NTP_SERVER     = "pool.ntp.org";
const long  GMT_OFFSET_SEC = 3600;
const int   DST_OFFSET_SEC = 0;

#define PIN_SOIL         36
#define PIN_PRESSURE     39
#define PIN_FLOW         32
#define PIN_TEMP         33
#define PIN_RELAY_VALVE   5
#define PIN_RELAY_PUMP   18
#define PIN_LED_PUMP      2
#define PIN_LED_VALVE     4
#define PIN_LED_ALERT    16

const float DRY_THRESHOLD = 35.0f;
const float WET_THRESHOLD = 65.0f;
const float PRESSURE_MIN  =  0.5f;
const float PRESSURE_MAX  = 10.0f;
const float FLOW_LEAK_MIN =  0.5f;

const unsigned long READ_INTERVAL   =  5000UL;
const unsigned long IRRIGATE_CHECK  = 30000UL;
const unsigned long MAX_IRRIGATE_MS = 1800000UL;
const unsigned long WIFI_CHECK_MS   = 15000UL;

OneWire           oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

float g_soil     = 50.0f;
float g_pressure =  3.0f;
float g_flow     =  0.0f;
float g_temp     = 22.0f;
bool  g_valve    = false;
bool  g_pump     = false;
bool  g_fault    = false;
bool  g_online   = false;
bool  g_fallback = false;
bool  g_irrigating   = false;
unsigned long g_irrigateStart = 0;
unsigned long g_lastRead      = 0;
unsigned long g_lastIrrigate  = 0;

// Forward declarations
void readSensors();
void safetyChecks();
void controlIrrigation();
void startIrrigation();
void stopIrrigation();
void sendTelemetry();
void postMetric(const char* metric, float value);
void publishAlert(const char* code, String detail);
void connectWifi();
void checkWifi();

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_RELAY_VALVE, OUTPUT); digitalWrite(PIN_RELAY_VALVE, LOW);
  pinMode(PIN_RELAY_PUMP,  OUTPUT); digitalWrite(PIN_RELAY_PUMP,  LOW);
  pinMode(PIN_LED_PUMP,    OUTPUT); digitalWrite(PIN_LED_PUMP,    LOW);
  pinMode(PIN_LED_VALVE,   OUTPUT); digitalWrite(PIN_LED_VALVE,   LOW);
  pinMode(PIN_LED_ALERT,   OUTPUT); digitalWrite(PIN_LED_ALERT,   LOW);

  tempSensor.begin();

  Serial.println("[NODE_A] Boot -- Smart Farm Irrigation Controller v3.0");
  connectWifi();
}

void loop() {
  unsigned long now = millis();
  checkWifi();

  if (now - g_lastRead >= READ_INTERVAL) {
    g_lastRead = now;
    readSensors();
    safetyChecks();
    sendTelemetry();
  }

  if (now - g_lastIrrigate >= IRRIGATE_CHECK) {
    g_lastIrrigate = now;
    controlIrrigation();
  }

  if (g_irrigating && (now - g_irrigateStart >= MAX_IRRIGATE_MS)) {
    Serial.println("[IRRIGATION] TIMEOUT -- 30 min watchdog");
    stopIrrigation();
  }
}

// ---------------------------------------------------------------------------
void readSensors() {
  g_soil     = analogRead(PIN_SOIL)     * 100.0f / 4095.0f;
  g_pressure = analogRead(PIN_PRESSURE) *  12.0f / 4095.0f;
  g_flow     = analogRead(PIN_FLOW)     *  30.0f / 4095.0f;

  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  if (t != DEVICE_DISCONNECTED_C) g_temp = t;
}

void safetyChecks() {
  g_fault = false;

  if (g_flow > FLOW_LEAK_MIN && !g_valve) {
    g_fault = true;
    publishAlert("LEAK_DETECTED", "flow=" + String(g_flow, 1));
    stopIrrigation();
  }
  if (g_pump && g_flow < FLOW_LEAK_MIN) {
    g_fault = true;
    publishAlert("DRY_PUMP", "flow=" + String(g_flow, 1));
    stopIrrigation();
  }
  if (g_pressure < PRESSURE_MIN || g_pressure > PRESSURE_MAX) {
    g_fault = true;
    publishAlert("PRESSURE_FAULT", "bar=" + String(g_pressure, 2));
    stopIrrigation();
  }

  digitalWrite(PIN_LED_ALERT, g_fault ? HIGH : LOW);
}

void controlIrrigation() {
  bool inSchedule = false;
#if FORCE_DAY_TEST
  inSchedule = true;
#else
  struct tm ti;
  if (getLocalTime(&ti)) {
    int h = ti.tm_hour;
    inSchedule = (h >= 5 && h < 8) || (h >= 19 && h < 22);
  } else {
    inSchedule = g_fallback;
  }
#endif

  if (!g_irrigating && inSchedule && g_soil < DRY_THRESHOLD && !g_fault)
    startIrrigation();
  else if (g_irrigating && g_soil > WET_THRESHOLD)
    stopIrrigation();
}

void startIrrigation() {
  g_irrigating = true; g_irrigateStart = millis();
  g_valve = true;  g_pump = true;
  digitalWrite(PIN_RELAY_VALVE, HIGH); digitalWrite(PIN_RELAY_PUMP, HIGH);
  digitalWrite(PIN_LED_VALVE,   HIGH); digitalWrite(PIN_LED_PUMP,   HIGH);
  Serial.println("[IRRIGATION] START reason:DRY_SOIL soil=" + String(g_soil, 1) + "%");
}

void stopIrrigation() {
  g_irrigating = false;
  g_valve = false; g_pump = false;
  digitalWrite(PIN_RELAY_VALVE, LOW); digitalWrite(PIN_RELAY_PUMP, LOW);
  digitalWrite(PIN_LED_VALVE,   LOW); digitalWrite(PIN_LED_PUMP,   LOW);
  Serial.println("[IRRIGATION] STOP");
}

// ---------------------------------------------------------------------------
// HTTP POST each metric to /api/v1/iot/telemetry
// Serial log kept for debugging in both simulation and real hardware
// ---------------------------------------------------------------------------
void sendTelemetry() {
  String mode = g_online ? (g_fallback ? "FALLBACK" : "ONLINE") : "OFFLINE";

  // Serial debug line (same format as before for log_telemetry.py if still used)
  Serial.print("[NODE_A] soil:"); Serial.print(g_soil, 1);
  Serial.print(" pressure:");     Serial.print(g_pressure, 2);
  Serial.print(" flow:");         Serial.print(g_flow, 1);
  Serial.print(" temp:");         Serial.print(g_temp, 1);
  Serial.print(" pump:");         Serial.print(g_pump  ? 1 : 0);
  Serial.print(" valve:");        Serial.print(g_valve ? 1 : 0);
  Serial.print(" fault:");        Serial.print(g_fault ? 1 : 0);
  Serial.print(" mode:");         Serial.println(mode);

  if (!g_online) return;  // no WiFi — Serial-only, log_telemetry.py can still capture

  postMetric("soil",     g_soil);
  postMetric("pressure", g_pressure);
  postMetric("flow",     g_flow);
  postMetric("temp",     g_temp);
  postMetric("pump",     g_pump  ? 1.0f : 0.0f);
  postMetric("valve",    g_valve ? 1.0f : 0.0f);
  postMetric("fault",    g_fault ? 1.0f : 0.0f);
}

void postMetric(const char* metric, float value) {
  HTTPClient http;
  String url = String("http://") + API_HOST + ":" + API_PORT + "/api/v1/iot/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  String body = "{\"node\":\"NODE_A\",\"metric\":\"" + String(metric) + "\",\"value\":" + String(value, 4) + "}";
  int code = http.POST(body);
  if (code < 0) {
    Serial.println("[HTTP] Error posting " + String(metric) + ": " + http.errorToString(code));
  }
  http.end();
}

void publishAlert(const char* code, String detail) {
  Serial.print("[ALERT] "); Serial.print(code);
  Serial.print("  ");       Serial.println(detail);
  // In production: also POST alert to a dedicated endpoint or MQTT topic
}

// ---------------------------------------------------------------------------
void connectWifi() {
  Serial.println("[WIFI] Connecting to " + String(WIFI_SSID));
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
    delay(300); Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    g_online = true; g_fallback = false;
    Serial.println("\n[WIFI] Connected -- IP: " + WiFi.localIP().toString());
    configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
  } else {
    g_online = false; g_fallback = true;
    Serial.println("\n[WIFI] OFFLINE -- autonomous mode (Serial-only telemetry)");
  }
}

void checkWifi() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < WIFI_CHECK_MS) return;
  lastCheck = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (g_online) { g_online = false; g_fallback = true; Serial.println("[WIFI] Lost -- FALLBACK"); }
    WiFi.reconnect();
  } else if (!g_online) {
    g_online = true; g_fallback = false;
    Serial.println("[WIFI] Reconnected");
  }
}
