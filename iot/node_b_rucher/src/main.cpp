#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// NODE B - Beehive Monitor
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

#define PIN_WEIGHT     34
#define PIN_DHT        14
#define PIN_HIVE_TEMP  15
#define PIN_LED_ALERT   2
#define PIN_LED_HONEY   4

const float HIVE_TEMP_MIN  = 30.0f;
const float HIVE_TEMP_MAX  = 38.0f;
const float EXT_HUM_MAX    = 85.0f;
const float SWARM_DELTA    =  2.0f;
const float HONEY_GAIN     =  0.5f;

const unsigned long READ_INTERVAL   = 10000UL;
const unsigned long WIFI_CHECK_MS   = 15000UL;
const unsigned long SWARM_PERIOD_MS = 60000UL;  // 60s in simulation; use 3600000UL on real hardware

DHT               dht(PIN_DHT, DHT22);
OneWire           oneWire(PIN_HIVE_TEMP);
DallasTemperature hiveSensor(&oneWire);

float g_weight  = 20.0f;
float g_hiveTmp = 34.0f;
float g_extTemp = 25.0f;
float g_extHum  = 60.0f;

float         g_prevWeight     = 20.0f;
unsigned long g_prevWeightTime = 0;
bool          g_online         = false;
unsigned long g_lastRead       = 0;

// Forward declarations
void readSensors();
void checkAlerts();
void sendTelemetry();
void postMetric(const char* metric, float value);
void publishAlert(const char* code, String detail);
void connectWifi();
void checkWifi();

// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_LED_ALERT, OUTPUT); digitalWrite(PIN_LED_ALERT, LOW);
  pinMode(PIN_LED_HONEY, OUTPUT); digitalWrite(PIN_LED_HONEY, LOW);

  dht.begin();
  hiveSensor.begin();

  Serial.println("[NODE_B] Boot -- Smart Farm Beehive Monitor v3.0");
  connectWifi();

  g_prevWeightTime = millis();
}

void loop() {
  checkWifi();

  unsigned long now = millis();
  if (now - g_lastRead >= READ_INTERVAL) {
    g_lastRead = now;
    readSensors();
    checkAlerts();
    sendTelemetry();
  }
}

// ---------------------------------------------------------------------------
void readSensors() {
  g_weight = analogRead(PIN_WEIGHT) * 50.0f / 4095.0f;

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h)) g_extHum  = h;
  if (!isnan(t)) g_extTemp = t;

  hiveSensor.requestTemperatures();
  float ht = hiveSensor.getTempCByIndex(0);
  if (ht != DEVICE_DISCONNECTED_C) g_hiveTmp = ht;
}

void checkAlerts() {
  bool alert = false;
  bool honey = false;

  unsigned long elapsed = millis() - g_prevWeightTime;
  if (elapsed >= SWARM_PERIOD_MS) {
    float delta = g_weight - g_prevWeight;
    if (delta < -SWARM_DELTA) {
      publishAlert("SWARM_RISK", "weight_delta=" + String(delta, 1) + "kg");
      alert = true;
    } else if (delta > HONEY_GAIN) {
      Serial.println("[INFO] HONEY_FLOW gain=" + String(delta, 1) + "kg");
      honey = true;
    }
    g_prevWeight     = g_weight;
    g_prevWeightTime = millis();
  }

  if (g_hiveTmp < HIVE_TEMP_MIN || g_hiveTmp > HIVE_TEMP_MAX) {
    publishAlert("THERMAL_FAULT", "hive_temp=" + String(g_hiveTmp, 1));
    alert = true;
  }

  if (g_extHum > EXT_HUM_MAX)
    Serial.println("[WARN] HIGH_HUMIDITY ext_hum=" + String(g_extHum, 1) + "%");

  digitalWrite(PIN_LED_ALERT, alert ? HIGH : LOW);
  digitalWrite(PIN_LED_HONEY, honey ? HIGH : LOW);
}

// ---------------------------------------------------------------------------
// HTTP POST each metric to /api/v1/iot/telemetry
// Serial log kept for debugging in both simulation and real hardware
// ---------------------------------------------------------------------------
void sendTelemetry() {
  Serial.print("[NODE_B] weight:");  Serial.print(g_weight, 1);
  Serial.print(" hive_temp:");       Serial.print(g_hiveTmp, 1);
  Serial.print(" ext_temp:");        Serial.print(g_extTemp, 1);
  Serial.print(" ext_hum:");         Serial.println(g_extHum, 1);

  if (!g_online) return;

  postMetric("weight",    g_weight);
  postMetric("hive_temp", g_hiveTmp);
  postMetric("ext_temp",  g_extTemp);
  postMetric("ext_hum",   g_extHum);
}

void postMetric(const char* metric, float value) {
  HTTPClient http;
  String url = String("http://") + API_HOST + ":" + API_PORT + "/api/v1/iot/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(3000);

  String body = "{\"node\":\"NODE_B\",\"metric\":\"" + String(metric) + "\",\"value\":" + String(value, 4) + "}";
  int code = http.POST(body);
  if (code < 0) {
    Serial.println("[HTTP] Error posting " + String(metric) + ": " + http.errorToString(code));
  }
  http.end();
}

void publishAlert(const char* code, String detail) {
  Serial.print("[ALERT] "); Serial.print(code);
  Serial.print("  ");       Serial.println(detail);
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
    g_online = true;
    Serial.println("\n[WIFI] Connected -- IP: " + WiFi.localIP().toString());
  } else {
    g_online = false;
    Serial.println("\n[WIFI] OFFLINE -- Serial-only telemetry");
  }
}

void checkWifi() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < WIFI_CHECK_MS) return;
  lastCheck = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (g_online) { g_online = false; Serial.println("[WIFI] Lost"); }
    WiFi.reconnect();
  } else if (!g_online) {
    g_online = true;
    Serial.println("[WIFI] Reconnected");
  }
}
