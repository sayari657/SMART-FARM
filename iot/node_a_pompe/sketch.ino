/ ─────────────────────────────────────────────────────────────────────────────
// NODE A — Irrigation Controller
// Smart Farm AI — Wokwi Simulation v2.0
// Serial telemetry (primary) + optional MQTT via HiveMQ public broker
// Blynk removed — use Serial Monitor or log_telemetry.py to read output
// ─────────────────────────────────────────────────────────────────────────────

#include <DallasTemperature.h>
#include <OneWire.h>
#include <WiFi.h>
#include <time.h>

// ── Optional MQTT (set true only if HiveMQ is reachable from Wokwi) ──────────
#define USE_MQTT false
#if USE_MQTT
#include <PubSubClient.h>
    WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
const char *MQTT_BROKER = "broker.hivemq.com";
const int MQTT_PORT = 1883;
#endif

// ── Simulation flag — bypasses NTP schedule so irrigation triggers freely
// ─────
#define FORCE_DAY_TEST true

// ── WiFi
// ──────────────────────────────────────────────────────────────────────
const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASS = "";

// ── NTP
// ───────────────────────────────────────────────────────────────────────
const char *NTP_SERVER = "pool.ntp.org";
const long GMT_OFFSET_SEC = 3600; // Tunisia UTC+1
const int DST_OFFSET_SEC = 0;

// ── Pin assignments
// ───────────────────────────────────────────────────────────
#define PIN_SOIL 36       // VP  — slide potentiometer (0–100 %)
#define PIN_PRESSURE 39   // VN  — slide potentiometer (0–12 bar)
#define PIN_FLOW 32       // D32 — slide potentiometer (0–30 L/min)
#define PIN_TEMP 33       // D33 — DS18B20 soil temperature
#define PIN_RELAY_VALVE 5 // solenoid valve relay
#define PIN_RELAY_PUMP 18 // pump relay
#define PIN_LED_PUMP 2    // green  LED — pump status
#define PIN_LED_VALVE 4   // blue   LED — valve status
#define PIN_LED_ALERT 16  // red    LED — safety alarm

// ── Thresholds
// ────────────────────────────────────────────────────────────────
const float DRY_THRESHOLD = 35.0f; // % — start irrigation
const float WET_THRESHOLD = 65.0f; // % — stop irrigation
const float PRESSURE_MIN = 0.5f;   // bar — minimum operating pressure
const float PRESSURE_MAX = 10.0f;  // bar — maximum safe pressure
const float FLOW_LEAK_MIN =
    0.5f; // L/min — threshold for leak / dry-pump detection

// ── Timing
// ────────────────────────────────────────────────────────────────────
const unsigned long READ_INTERVAL = 5000UL;      // sensor read every 5 s
const unsigned long IRRIGATE_CHECK = 30000UL;    // irrigation logic every 30 s
const unsigned long MAX_IRRIGATE_MS = 1800000UL; // 30-min safety watchdog
const unsigned long WIFI_CHECK_MS = 15000UL;     // WiFi watchdog interval

// ── DS18B20
// ───────────────────────────────────────────────────────────────────
OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);

// ── State
// ─────────────────────────────────────────────────────────────────────
float g_soil = 50.0f;
float g_pressure = 3.0f;
float g_flow = 0.0f;
float g_temp = 22.0f;
bool g_valve = false;
bool g_pump = false;
bool g_fault = false;

bool g_online = false;
bool g_fallback = false; // WiFi lost → run autonomously with stored thresholds

bool g_irrigating = false;
unsigned long g_irrigateStart = 0;

unsigned long g_lastRead = 0;
unsigned long g_lastIrrigate = 0;

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_RELAY_VALVE, OUTPUT);
  digitalWrite(PIN_RELAY_VALVE, LOW);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  pinMode(PIN_LED_PUMP, OUTPUT);
  digitalWrite(PIN_LED_PUMP, LOW);
  pinMode(PIN_LED_VALVE, OUTPUT);
  digitalWrite(PIN_LED_VALVE, LOW);
  pinMode(PIN_LED_ALERT, OUTPUT);
  digitalWrite(PIN_LED_ALERT, LOW);

  tempSensor.begin();

  Serial.println("[NODE_A] Boot — Smart Farm Irrigation Controller v2.0");
  connectWifi();

#if USE_MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  unsigned long now = millis();

  checkWifi();

#if USE_MQTT
  if (g_online && !mqtt.connected())
    mqttReconnect();
  if (mqtt.connected())
    mqtt.loop();
#endif

  if (now - g_lastRead >= READ_INTERVAL) {
    g_lastRead = now;
    readSensors();
    safetyChecks();
    sendData();
  }

  if (now - g_lastIrrigate >= IRRIGATE_CHECK) {
    g_lastIrrigate = now;
    controlIrrigation();
  }

  // 30-min safety watchdog
  if (g_irrigating && (now - g_irrigateStart >= MAX_IRRIGATE_MS)) {
    Serial.println("[IRRIGATION] TIMEOUT — 30 min watchdog triggered");
    stopIrrigation();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
void readSensors() {
  int rawSoil = analogRead(PIN_SOIL);
  int rawPres = analogRead(PIN_PRESSURE);
  int rawFlow = analogRead(PIN_FLOW);

  g_soil = rawSoil * 100.0f / 4095.0f;    // 0–100 %
  g_pressure = rawPres * 12.0f / 4095.0f; // 0–12 bar
  g_flow = rawFlow * 30.0f / 4095.0f;     // 0–30 L/min

  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  if (t != DEVICE_DISCONNECTED_C)
    g_temp = t;
}

// ─────────────────────────────────────────────────────────────────────────────
void safetyChecks() {
  g_fault = false;

  // Leak: measurable flow while valve is closed
  if (g_flow > FLOW_LEAK_MIN && !g_valve) {
    g_fault = true;
    publishAlert("LEAK_DETECTED", "flow=" + String(g_flow, 1) + " L/min");
    stopIrrigation();
  }

  // Dry pump: pump running but no water flowing
  if (g_pump && g_flow < FLOW_LEAK_MIN) {
    g_fault = true;
    publishAlert("DRY_PUMP", "flow=" + String(g_flow, 1) + " L/min");
    stopIrrigation();
  }

  // Pressure out of safe range
  if (g_pressure < PRESSURE_MIN || g_pressure > PRESSURE_MAX) {
    g_fault = true;
    publishAlert("PRESSURE_FAULT", "bar=" + String(g_pressure, 2));
    stopIrrigation();
  }

  digitalWrite(PIN_LED_ALERT, g_fault ? HIGH : LOW);
}

// ─────────────────────────────────────────────────────────────────────────────
void controlIrrigation() {
  bool inSchedule = false;

#if FORCE_DAY_TEST
  inSchedule = true; // bypass NTP hours for Wokwi simulation
#else
  struct tm ti;
  if (getLocalTime(&ti)) {
    int h = ti.tm_hour;
    inSchedule = (h >= 5 && h < 8) || (h >= 19 && h < 22);
  } else {
    inSchedule = g_fallback; // WiFi lost — maintain last known schedule
  }
#endif

  if (!g_irrigating && inSchedule && g_soil < DRY_THRESHOLD && !g_fault) {
    startIrrigation();
  } else if (g_irrigating && g_soil > WET_THRESHOLD) {
    stopIrrigation();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
void startIrrigation() {
  g_irrigating = true;
  g_irrigateStart = millis();
  g_valve = true;
  g_pump = true;
  digitalWrite(PIN_RELAY_VALVE, HIGH);
  digitalWrite(PIN_RELAY_PUMP, HIGH);
  digitalWrite(PIN_LED_VALVE, HIGH);
  digitalWrite(PIN_LED_PUMP, HIGH);
  Serial.print("[IRRIGATION] START  reason:DRY_SOIL  soil=");
  Serial.print(g_soil, 1);
  Serial.println(" %");

#if USE_MQTT
  if (mqtt.connected()) {
    mqtt.publish("smartfarm/node_a/pump", "1");
    mqtt.publish("smartfarm/node_a/valve", "1");
  }
#endif
}

void stopIrrigation() {
  g_irrigating = false;
  g_valve = false;
  g_pump = false;
  digitalWrite(PIN_RELAY_VALVE, LOW);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  digitalWrite(PIN_LED_VALVE, LOW);
  digitalWrite(PIN_LED_PUMP, LOW);
  Serial.println("[IRRIGATION] STOP");

#if USE_MQTT
  if (mqtt.connected()) {
    mqtt.publish("smartfarm/node_a/pump", "0");
    mqtt.publish("smartfarm/node_a/valve", "0");
  }
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
void sendData() {
  String mode = g_online ? (g_fallback ? "FALLBACK" : "ONLINE") : "OFFLINE";
  Serial.print("[NODE_A] soil:");
  Serial.print(g_soil, 1);
  Serial.print(" pressure:");
  Serial.print(g_pressure, 2);
  Serial.print(" flow:");
  Serial.print(g_flow, 1);
  Serial.print(" temp:");
  Serial.print(g_temp, 1);
  Serial.print(" pump:");
  Serial.print(g_pump ? 1 : 0);
  Serial.print(" valve:");
  Serial.print(g_valve ? 1 : 0);
  Serial.print(" fault:");
  Serial.print(g_fault ? 1 : 0);
  Serial.print(" mode:");
  Serial.println(mode);

#if USE_MQTT
  if (mqtt.connected()) {
    mqtt.publish("smartfarm/node_a/soil", String(g_soil, 1).c_str());
    mqtt.publish("smartfarm/node_a/pressure", String(g_pressure, 2).c_str());
    mqtt.publish("smartfarm/node_a/flow", String(g_flow, 1).c_str());
  }
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
void publishAlert(const char *code, String detail) {
  Serial.print("[ALERT] ");
  Serial.print(code);
  Serial.print("  ");
  Serial.println(detail);
#if USE_MQTT
  if (mqtt.connected()) {
    String payload = String(code) + " " + detail;
    mqtt.publish("smartfarm/node_a/alert", payload.c_str());
  }
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
void connectWifi() {
  Serial.print("[WIFI] Connexion à ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 8000) {
    delay(300);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    g_online = true;
    g_fallback = false;
    Serial.println("\n[WIFI] Connecté — IP: " + WiFi.localIP().toString());
    configTime(GMT_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
  } else {
    g_online = false;
    g_fallback = true;
    Serial.println("\n[WIFI] HORS-LIGNE — mode autonome activé");
  }
}

void checkWifi() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < WIFI_CHECK_MS)
    return;
  lastCheck = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (g_online) {
      g_online = false;
      g_fallback = true;
      Serial.println("[WIFI] Connexion perdue — FALLBACK actif");
    }
    WiFi.reconnect();
  } else if (!g_online) {
    g_online = true;
    g_fallback = false;
    Serial.println("[WIFI] Reconnecté");
  }
}

#if USE_MQTT
void mqttReconnect() {
  if (mqtt.connect("SmartFarm_NodeA")) {
    Serial.println("[MQTT] Connecté à HiveMQ broker.hivemq.com");
  }
}
#endif
