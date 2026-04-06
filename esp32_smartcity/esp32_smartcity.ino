#include <WiFi.h>
#include <HTTPClient.h>
#include <HX711.h>

/* ================= PIN DEFINITIONS ================= */

// Ultrasonic - Dustbin
#define TRIG_DUST   0
#define ECHO_DUST   2

// Ultrasonic - Drainage
#define TRIG_DRAIN  18
#define ECHO_DRAIN  19

// Other sensors
#define WATER_PIN   13   // HW-038 DO
#define GAS_PIN     12   // MQ-6 AO
#define LED_PIN     14

// HX711 Load Cell
#define HX711_DT    25
#define HX711_SCK   26

// Turbidity Sensor
#define TURBIDITY_PIN 34  // Analog input

/* ================= WIFI & SERVER ================= */

const char* ssid       = "Apna Net Khud Bharwao Yaar";
const char* password   = "j6izw7as";
const char* serverUrl  = "http://172.16.45.157:5000/api/sensors/data";

/* ================= HX711 ================= */

HX711 scale;
float calibrationFactor = 420.0; // Adjust after calibration

/* ================= FUNCTIONS ================= */

int readUltrasonic(int trig, int echo) {
  digitalWrite(trig, LOW);
  delayMicroseconds(2);
  digitalWrite(trig, HIGH);
  delayMicroseconds(10);
  digitalWrite(trig, LOW);

  long duration = pulseIn(echo, HIGH, 30000);
  if (duration == 0) return -1;

  return duration * 0.034 / 2;
}

float readWeight() {
  if (scale.is_ready()) {
    float weight = scale.get_units(5);
    if (weight < 0) weight = 0;
    return weight;
  }
  return -1;
}

float readTurbidity() {
  int raw = analogRead(TURBIDITY_PIN);
  float voltage = raw * (3.3 / 4095.0);

  float ntu;
  if (voltage > 2.5) {
    ntu = 0;
  } else if (voltage > 1.0) {
    ntu = (2.5 - voltage) * 2000.0;
  } else {
    ntu = 3000;
  }
  return ntu;
}

String getWaterQuality(float ntu) {
  if (ntu < 50) return "CLEAR";
  if (ntu < 500) return "CLEAR";
  if (ntu < 1500) return "DIRTY";
  return "HAZARDOUS";
}

void connectWiFi() {
  Serial.print("Connecting to WiFi");

  WiFi.disconnect(true);  // Clean disconnect first
  delay(100);
  WiFi.mode(WIFI_STA);    // Station mode
  WiFi.begin(ssid, password);
  int attempts = 0;

  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi Connected");
    Serial.print("📡 IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("❌ WiFi Failed — will retry in next loop");
  }
}

void sendToServer(int dust, int drain, int gas, bool waterLeak, float weight, float turbNTU, String waterQual) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi not connected, reconnecting...");
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("⚠️ Still no WiFi, skipping send");
      return;
    }
  }

  HTTPClient http;
  http.begin(serverUrl);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"nodeId\":\"NODE-001\",";
  payload += "\"dustbin\":" + String(dust < 0 ? 0 : dust) + ",";
  payload += "\"drainage\":" + String(drain < 0 ? 0 : drain) + ",";
  payload += "\"gas\":" + String(gas) + ",";
  payload += "\"waterLeak\":\"" + String(waterLeak ? "YES" : "NO") + "\",";
  payload += "\"weight\":" + String(weight < 0 ? 0 : weight, 2) + ",";
  payload += "\"turbidity\":" + String(turbNTU, 0) + ",";
  payload += "\"waterQuality\":\"" + waterQual + "\"";
  payload += "}";

  Serial.println("📤 Sending: " + payload);

  int code = http.POST(payload);
  Serial.printf("📥 Server Response: %d\n", code);
  http.end();
}

/* ================= SETUP ================= */

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("=============================");
  Serial.println("  UrbanPulse Sensor Node");
  Serial.println("  NODE-001 Booting...");
  Serial.println("=============================");

  // Pin modes
  pinMode(TRIG_DUST, OUTPUT);
  pinMode(ECHO_DUST, INPUT);
  pinMode(TRIG_DRAIN, OUTPUT);
  pinMode(ECHO_DRAIN, INPUT);
  pinMode(WATER_PIN, INPUT);
  pinMode(GAS_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  // GPIO 34 is input-only, no pinMode needed

  // HX711 Init
  Serial.println("⚖️ Initializing HX711...");
  scale.begin(HX711_DT, HX711_SCK);
  scale.set_scale(calibrationFactor);
  scale.tare();
  Serial.println("✅ Scale ready (tared)");

  // WiFi
  connectWiFi();

  Serial.println("=============================");
  Serial.println("  System Ready — Loop Start");
  Serial.println("=============================\n");
}

/* ================= LOOP ================= */

void loop() {
  // --- Read all sensors ---
  int dustDist  = readUltrasonic(TRIG_DUST, ECHO_DUST);
  delay(50);
  int drainDist = readUltrasonic(TRIG_DRAIN, ECHO_DRAIN);

  int gasValue   = analogRead(GAS_PIN);
  bool waterLeak = digitalRead(WATER_PIN);
  float weight   = readWeight();

  // Turbidity
  float turbNTU = readTurbidity();
  String waterQual = getWaterQuality(turbNTU);

  // --- Serial Output ---
  Serial.println("--- Sensor Reading ---");
  Serial.printf("🗑️ Dustbin Distance : %d cm\n", dustDist < 0 ? 0 : dustDist);
  Serial.printf("🔵 Drain Distance   : %d cm\n", drainDist < 0 ? 0 : drainDist);
  Serial.printf("💨 Gas Value        : %d\n", gasValue);
  Serial.printf("💧 Water Leak       : %s\n", waterLeak ? "YES" : "NO");
  Serial.printf("⚖️ Weight           : %.2f g\n", weight < 0 ? 0.0 : weight);
  Serial.print("🔬 Turbidity        : ");
  Serial.print(turbNTU, 0);
  Serial.print(" NTU — ");
  Serial.println(waterQual);

  // --- Alert LED ---
  bool alert =
    (dustDist > 0 && dustDist < 8) ||
    (drainDist > 0 && drainDist < 5) ||
    (gasValue > 2200) ||
    waterLeak ||
    (weight > 5000) ||
    (turbNTU > 1500);

  digitalWrite(LED_PIN, alert ? HIGH : LOW);

  if (alert) {
    Serial.println("🚨 ALERT TRIGGERED!");
  }

  // --- Send to Server ---
  sendToServer(dustDist, drainDist, gasValue, waterLeak, weight, turbNTU, waterQual);

  Serial.println("----------------------\n");
  delay(5000);
}
