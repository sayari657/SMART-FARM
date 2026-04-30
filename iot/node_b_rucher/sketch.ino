#define BLYNK_TEMPLATE_ID "TMPL_REPLACE_ME2"
#define BLYNK_TEMPLATE_NAME "Ferme Rucher"
#define BLYNK_AUTH_TOKEN "YOUR_AUTH_TOKEN_B"

#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <HX711.h>
#include <HTTPClient.h>

void sendTelemetry(String node, String metric, float value) {
  HTTPClient http;
  http.begin("http://10.0.2.2:8002/api/v1/iot/telemetry");
  http.addHeader("Content-Type", "application/json");
  
  String json = "{\"node\":\"" + node + "\", \"metric\":\"" + metric + "\", \"value\":" + String(value, 1) + "}";
  http.POST(json);
  http.end();
}


// Pin Definitions
const int PIN_HX711_SCK = 12;
const int PIN_HX711_DOUT = 13;
const int PIN_DHT = 14;
const int PIN_TEMP_HIVE = 15;

// Objects
DHT dht(PIN_DHT, DHT22);
OneWire oneWire(PIN_TEMP_HIVE);
DallasTemperature sensors(&oneWire);
HX711 scale;

// Blynk Virtual Pins
#define V_WEIGHT       V1
#define V_TEMP_HIVE    V2
#define V_EXT_TEMP     V3
#define V_EXT_HUM      V4

unsigned long last_read_time = 0;
unsigned long read_interval = 10000; // 10 seconds
float calibration_factor = 420.0; // Determined during lab calibration

// WiFi credentials
char ssid[] = "Wokwi-GUEST";
char pass[] = "";

void setup() {
  Serial.begin(115200);
  
  dht.begin();
  sensors.begin();
  scale.begin(PIN_HX711_DOUT, PIN_HX711_SCK);
  
  // Initial Tare / Calibration setup
  scale.set_scale(calibration_factor);
  scale.tare(); 

  WiFi.begin(ssid, pass);
  Blynk.config(BLYNK_AUTH_TOKEN);
}

void loop() {
  Blynk.run();
  
  if (millis() - last_read_time > read_interval) {
    last_read_time = millis();
    readSensors();
  }
}

void readSensors() {
  // Weight
  float weight = scale.get_units(5); // Average of 5 readings
  if (weight < 0) weight = 0.0;

  // DHT22 Exterior
  float ext_temp = dht.readTemperature();
  float ext_hum = dht.readHumidity();

  // DS18B20 Interior Hive
  sensors.requestTemperatures();
  float hive_temp = sensors.getTempCByIndex(0);

  Serial.print("Humidité Ext: "); Serial.print(ext_hum); Serial.println(" %");

  // Update Live CSV Logger
  sendTelemetry("Node B (Rucher)", "Poids Ruche", weight);
  sendTelemetry("Node B (Rucher)", "Temp Couvain", hive_temp);
  sendTelemetry("Node B (Rucher)", "Temp Ext", ext_temp);
  sendTelemetry("Node B (Rucher)", "Humidité Ext", ext_hum);


  // Update Blynk
  Blynk.virtualWrite(V_WEIGHT, weight);
  Blynk.virtualWrite(V_TEMP_HIVE, hive_temp);
  Blynk.virtualWrite(V_EXT_TEMP, ext_temp);
  Blynk.virtualWrite(V_EXT_HUM, ext_hum);

  // Hive Alerts
  if (hive_temp < 30.0 || hive_temp > 38.0) {
    Serial.println("--> ALERTE: Dérégulation thermique du couvain!");
  }
}
