// ─────────────────────────────────────────────────────────────────────────────
// NODE B — Beehive Monitor
// Smart Farm AI — Wokwi Simulation v2.0
// Serial telemetry (primary) + optional MQTT via HiveMQ public broker
// HX711 replaced with analog slide-potentiometer for Wokwi compatibility
// ─────────────────────────────────────────────────────────────────────────────

#include <WiFi.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ── Optional MQTT ─────────────────────────────────────────────────────────────
#define USE_MQTT false
#if USE_MQTT
  #include <PubSubClient.h>
  WiFiClient   wifiClient;
  PubSubClient mqtt(wifiClient);
  const char*  MQTT_BROKER = "broker.hivemq.com";
  const int    MQTT_PORT   = 1883;
#endif

// ── WiFi ──────────────────────────────────────────────────────────────────────
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// ── Pin assignments ───────────────────────────────────────────────────────────
#define PIN_WEIGHT     34  // analog slider → 0–50 kg (replaces HX711)
#define PIN_DHT        14  // DHT22 — external temperature + humidity
#define PIN_HIVE_TEMP  15  // DS18B20 — internal hive temperature
#define PIN_LED_ALERT   2  // red    LED — swarm / thermal fault
#define PIN_LED_HONEY   4  // yellow LED — honey flow positive

// ── Thresholds ────────────────────────────────────────────────────────────────
const float HIVE_TEMP_MIN = 30.0f;  // °C — thermal fault (brood too cold)
const float HIVE_TEMP_MAX = 38.0f;  // °C — thermal fault (brood too hot)
const float EXT_HUM_MAX   = 85.0f;  // % — high external humidity warning
const float SWARM_DELTA   =  2.0f;  // kg — weight drop threshold for swarm
const float HONEY_GAIN    =  0.5f;  // kg — weight gain threshold for honey flow

// ── Timing ────────────────────────────────────────────────────────────────────
const unsigned long READ_INTERVAL  = 10000UL;  // sensor read every 10 s
const unsigned long WIFI_CHECK_MS  = 15000UL;
// Swarm detection window: 60 s in simulation (would be 3600 s in production)
const unsigned long SWARM_PERIOD_MS = 60000UL;

// ── Sensors ───────────────────────────────────────────────────────────────────
DHT               dht(PIN_DHT, DHT22);
OneWire           oneWire(PIN_HIVE_TEMP);
DallasTemperature hiveSensor(&oneWire);

// ── State ─────────────────────────────────────────────────────────────────────
float g_weight  = 20.0f;
float g_hiveTmp = 34.0f;
float g_extTemp = 25.0f;
float g_extHum  = 60.0f;

float         g_prevWeight      = 20.0f;
unsigned long g_prevWeightTime  = 0;

bool  g_online  = false;
unsigned long g_lastRead = 0;

// ─────────────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_LED_ALERT, OUTPUT); digitalWrite(PIN_LED_ALERT, LOW);
  pinMode(PIN_LED_HONEY, OUTPUT); digitalWrite(PIN_LED_HONEY, LOW);

  dht.begin();
  hiveSensor.begin();

  Serial.println("[NODE_B] Boot — Smart Farm Beehive Monitor v2.0");
  connectWifi();

#if USE_MQTT
  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
#endif

  g_prevWeightTime = millis();
}

// ─────────────────────────────────────────────────────────────────────────────
void loop() {
  checkWifi();

#if USE_MQTT
  if (g_online && !mqtt.connected()) mqttReconnect();
  if (mqtt.connected()) mqtt.loop();
#endif

  unsigned long now = millis();
  if (now - g_lastRead >= READ_INTERVAL) {
    g_lastRead = now;
    readSensors();
    checkAlerts();
    sendData();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
void readSensors() {
  int rawW = analogRead(PIN_WEIGHT);
  g_weight = rawW * 50.0f / 4095.0f;  // 0–50 kg

  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h)) g_extHum  = h;
  if (!isnan(t)) g_extTemp = t;

  hiveSensor.requestTemperatures();
  float ht = hiveSensor.getTempCByIndex(0);
  if (ht != DEVICE_DISCONNECTED_C) g_hiveTmp = ht;
}

// ─────────────────────────────────────────────────────────────────────────────
void checkAlerts() {
  bool alert = false;
  bool honey = false;

  // Swarm detection: rapid weight loss over SWARM_PERIOD_MS
  unsigned long elapsed = millis() - g_prevWeightTime;
  if (elapsed >= SWARM_PERIOD_MS) {
    float delta = g_weight - g_prevWeight;
    if (delta < -SWARM_DELTA) {
      publishAlert("SWARM_RISK", "weight_delta=" + String(delta, 1) + "kg");
      alert = true;
    } else if (delta > HONEY_GAIN) {
      Serial.println("[INFO] HONEY_FLOW  gain=" + String(delta, 1) + "kg");
      honey = true;
    }
    g_prevWeight     = g_weight;
    g_prevWeightTime = millis();
  }

  // Thermal fault
  if (g_hiveTmp < HIVE_TEMP_MIN || g_hiveTmp > HIVE_TEMP_MAX) {
    publishAlert("THERMAL_FAULT", "hive_temp=" + String(g_hiveTmp, 1));
    alert = true;
  }

  // High external humidity warning
  if (g_extHum > EXT_HUM_MAX) {
    Serial.println("[WARN] HIGH_HUMIDITY  ext_hum=" + String(g_extHum, 1) + "%");
  }

  digitalWrite(PIN_LED_ALERT, alert ? HIGH : LOW);
  digitalWrite(PIN_LED_HONEY, honey ? HIGH : LOW);
}

// ─────────────────────────────────────────────────────────────────────────────
void sendData() {
  Serial.print("[NODE_B] weight:");   Serial.print(g_weight, 1);
  Serial.print(" hive_temp:");        Serial.print(g_hiveTmp, 1);
  Serial.print(" ext_temp:");         Serial.print(g_extTemp, 1);
  Serial.print(" ext_hum:");          Serial.println(g_extHum, 1);

#if USE_MQTT
  if (mqtt.connected()) {
    mqtt.publish("smartfarm/node_b/weight",    String(g_weight, 1).c_str());
    mqtt.publish("smartfarm/node_b/hive_temp", String(g_hiveTmp, 1).c_str());
    mqtt.publish("smartfarm/node_b/ext_temp",  String(g_extTemp, 1).c_str());
    mqtt.publish("smartfarm/node_b/ext_hum",   String(g_extHum, 1).c_str());
  }
#endif
}

// ─────────────────────────────────────────────────────────────────────────────
void publishAlert(const char* code, String detail) {
  Serial.print("[ALERT] ");
  Serial.print(code);
  Serial.print("  ");
  Serial.println(detail);
#if USE_MQTT
  if (mqtt.connected()) {
    String payload = String(code) + " " + detail;
    mqtt.publish("smartfarm/node_b/alert", payload.c_str());
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
    Serial.println("\n[WIFI] Connecté — IP: " + WiFi.localIP().toString());
  } else {
    g_online = false;
    Serial.println("\n[WIFI] HORS-LIGNE — mode autonome");
  }
}

void checkWifi() {
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck < WIFI_CHECK_MS) return;
  lastCheck = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (g_online) {
      g_online = false;
      Serial.println("[WIFI] Connexion perdue");
    }
    WiFi.reconnect();
  } else if (!g_online) {
    g_online = true;
    Serial.println("[WIFI] Reconnecté");
  }
}

#if USE_MQTT
void mqttReconnect() {
  if (mqtt.connect("SmartFarm_NodeB")) {
    Serial.println("[MQTT] Connecté à HiveMQ broker.hivemq.com");
  }
}
#endif
