#define BLYNK_TEMPLATE_ID "TMPL_REPLACE_ME"
#define BLYNK_TEMPLATE_NAME "Ferme Irrigation"
#define BLYNK_AUTH_TOKEN "YOUR_AUTH_TOKEN"

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <time.h>
#include <HTTPClient.h>

void sendTelemetry(String node, String metric, float value) {
  HTTPClient http;
  // Proxy to local host PC via Wokwi gateway IP
  http.begin("http://10.0.2.2:8002/api/v1/iot/telemetry");
  http.addHeader("Content-Type", "application/json");
  
  String json = "{\"node\":\"" + node + "\", \"metric\":\"" + metric + "\", \"value\":" + String(value, 1) + "}";
  http.POST(json);
  http.end();
}


// Pin Definitions
const int PIN_RELAY_VALVE = 5;
const int PIN_RELAY_PUMP = 18;
const int PIN_SOIL_MOISTURE = 36; // VP
const int PIN_PRESSURE = 39;      // VN
const int PIN_FLOW = 32;
const int PIN_TEMP_SOIL = 33;

// Objects
OneWire oneWire(PIN_TEMP_SOIL);
DallasTemperature sensors(&oneWire);

// Blynk Virtual Pins
#define V_SOIL_MOISTURE V1
#define V_PRESSURE      V2
#define V_FLOW          V3
#define V_TEMP_SOIL     V4
#define V_VALVE_STATE   V5
#define V_PUMP_STATE    V6

// Thresholds
float threshold_dry = 35.0;
float threshold_wet = 60.0;
unsigned long last_read_time = 0;
unsigned long last_irrigation_check = 0;
unsigned long read_interval = 10000; // 10 seconds
unsigned long check_interval = 600000; // 10 minutes

// Irrigation State
bool is_irrigating = false;
unsigned long irrigation_start_time = 0;
const unsigned long MAX_IRRIGATION_TIME = 1800000; // 30 minutes

// WiFi & NTP
char ssid[] = "Wokwi-GUEST";
char pass[] = "";
const char* ntpServer = "pool.ntp.org";
const long  gmtOffset_sec = 3600; // Tunisia GMT+1
const int   daylightOffset_sec = 0;

void setup() {
  Serial.begin(115200);
  
  pinMode(PIN_RELAY_VALVE, OUTPUT);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_VALVE, LOW);
  digitalWrite(PIN_RELAY_PUMP, LOW);

  sensors.begin();

  WiFi.begin(ssid, pass);
  Blynk.config(BLYNK_AUTH_TOKEN);

  // NTP Time Sync
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
}

void loop() {
  Blynk.run();
  
  unsigned long current_time = millis();
  
  // 1. Read sensors every X seconds
  if (current_time - last_read_time > read_interval) {
    last_read_time = current_time;
    readSensors();
  }

  // 2. Rule checking every 10 minutes
  if (current_time - last_irrigation_check > check_interval) {
    last_irrigation_check = current_time;
    checkIrrigationLogic();
  }

  // 3. Monitor active irrigation limits
  if (is_irrigating && (current_time - irrigation_start_time > MAX_IRRIGATION_TIME)) {
    Serial.println("--> DURÉE MAX D'IRRIGATION ATTEINTE (30 min).");
    stopIrrigation();
  }
}

void readSensors() {
  int soil_raw = analogRead(PIN_SOIL_MOISTURE);
  float soil_pct = map(soil_raw, 4095, 0, 0, 100);
  
  int press_raw = analogRead(PIN_PRESSURE);
  float pressure = map(press_raw, 0, 4095, 0, 12) / 10.0;

  int flow_raw = analogRead(PIN_FLOW);
  float flow_rate = map(flow_raw, 0, 4095, 0, 30);

  sensors.requestTemperatures();
  float temp_c = sensors.getTempCByIndex(0);

  // Safety Checks
  if (flow_rate > 0 && !is_irrigating) {
    Serial.println("--> ALERTE: FUITE DÉTECTÉE!");
  }
  if (is_irrigating && flow_rate == 0) {
    Serial.println("--> ALERTE: POMPE SÈCHE!");
    stopIrrigation();
  }

  Serial.print("Humidité Sol: "); Serial.print(soil_pct); Serial.println(" %");
  Serial.print("Pression: "); Serial.print(pressure); Serial.println(" MPa");
  Serial.print("Débit: "); Serial.print(flow_rate); Serial.println(" L/min");
  Serial.print("Temp Sol: "); Serial.print(temp_c); Serial.println(" °C");

  // Update Live CSV Logger
  sendTelemetry("Node A (Pompe)", "Humidité Sol", soil_pct);
  sendTelemetry("Node A (Pompe)", "Pression", pressure);
  sendTelemetry("Node A (Pompe)", "Débit", flow_rate);
  sendTelemetry("Node A (Pompe)", "Temp Sol", temp_c);


  // Blynk updates
  Blynk.virtualWrite(V_SOIL_MOISTURE, soil_pct);
  Blynk.virtualWrite(V_PRESSURE, pressure);
  Blynk.virtualWrite(V_FLOW, flow_rate);
  Blynk.virtualWrite(V_TEMP_SOIL, temp_c);
}

void checkIrrigationLogic() {
  struct tm timeinfo;
  if(!getLocalTime(&timeinfo)){
    Serial.println("Impossible d'obtenir l'heure.");
    return;
  }

  int current_hour = timeinfo.tm_hour;
  
  // Schedule check: between 5h-8h OR 19h-22h
  bool valid_hours = (current_hour >= 5 && current_hour < 8) || (current_hour >= 19 && current_hour < 22);

  int soil_raw = analogRead(PIN_SOIL_MOISTURE);
  float soil_pct = map(soil_raw, 4095, 0, 0, 100);

  if (!is_irrigating && soil_pct < threshold_dry && valid_hours) {
    startIrrigation();
  } else if (is_irrigating && soil_pct > threshold_wet) {
    stopIrrigation();
  }
}

void startIrrigation() {
  is_irrigating = true;
  irrigation_start_time = millis();
  digitalWrite(PIN_RELAY_VALVE, HIGH); // Ouvre l'électrovanne
  digitalWrite(PIN_RELAY_PUMP, HIGH);  // Démarre la pompe via Akıllı
  Blynk.virtualWrite(V_VALVE_STATE, 1);
  Blynk.virtualWrite(V_PUMP_STATE, 1);
  Serial.println("--> DÉBUT DE L'IRRIGATION");
}

void stopIrrigation() {
  is_irrigating = false;
  digitalWrite(PIN_RELAY_VALVE, LOW);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  Blynk.virtualWrite(V_VALVE_STATE, 0);
  Blynk.virtualWrite(V_PUMP_STATE, 0);
  Serial.println("--> FIN DE L'IRRIGATION");
}

BLYNK_WRITE(V_VALVE_STATE) {
  int state = param.asInt();
  digitalWrite(PIN_RELAY_VALVE, state);
  is_irrigating = state;
}

BLYNK_WRITE(V_PUMP_STATE) {
  int state = param.asInt();
  digitalWrite(PIN_RELAY_PUMP, state);
}
