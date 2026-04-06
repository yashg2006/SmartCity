/*
 * ═══════════════════════════════════════════════════════════
 *  SMART MOSQUITO DETECTION — Arduino UNO R4 WiFi
 *  UrbanPulse Smart City Project
 * ═══════════════════════════════════════════════════════════
 *
 *  Sensors:
 *    DHT22       → D2  (Temperature & Humidity)
 *    MQ-135      → A0  (Air Quality / CO₂)
 *    MQ-102      → A1  (Smoke / Gas)
 *    PIR         → D3  (Motion Detection)
 *    Sound       → A2 (AO), D4 (DO)
 *    Laser       → D5  (Break-beam)
 *    Neo6M GPS   → D0 (RX), D1 (TX) via Serial1
 *    ESP32-CAM   → D6 (RX), D7 (TX) via SoftwareSerial
 *
 *  Board: Arduino UNO R4 WiFi
 *  Libraries Needed:
 *    - WiFiS3 (built-in)
 *    - ArduinoHttpClient
 *    - DHT sensor library (by Adafruit)
 *    - TinyGPSPlus
 *
 *  Install via Arduino IDE Library Manager:
 *    Sketch → Include Library → Manage Libraries → search each
 * ═══════════════════════════════════════════════════════════
 */

#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <DHT.h>
#include <TinyGPSPlus.h>

/* ================= PIN DEFINITIONS ================= */

// DHT22 — Temperature & Humidity
#define DHT_PIN       2
#define DHT_TYPE      DHT22

// MQ-135 — Air Quality
#define MQ135_PIN     A0

// MQ-102 — Gas Sensor
#define MQ102_PIN     A1

// PIR — Motion
#define PIR_PIN       3

// Sound Sensor
#define SOUND_AO_PIN  A2
#define SOUND_DO_PIN  4

// Laser Module
#define LASER_PIN     5

// Status LED (built-in)
#define LED_PIN       LED_BUILTIN

/* ================= WIFI & SERVER ================= */

// ⚠️  CHANGE THESE to your WiFi credentials and server IP
const char* ssid       = "YOUR_WIFI_SSID";
const char* password   = "YOUR_WIFI_PASSWORD";
const char* serverHost = "172.16.45.157";   // Your laptop's IP running the backend
const int   serverPort = 5000;

/* ================= OBJECTS ================= */

DHT dht(DHT_PIN, DHT_TYPE);
TinyGPSPlus gps;
WiFiClient wifiClient;
HttpClient http(wifiClient, serverHost, serverPort);

/* ================= VARIABLES ================= */

float temperature   = 0;
float humidity      = 0;
int   airQuality    = 0;    // MQ-135 (0–1023)
int   gasLevel      = 0;    // MQ-102 (0–1023)
bool  motionDetected = false;
int   soundLevel    = 0;    // Sound analog (0–1023)
bool  soundAlert    = false;
bool  laserBroken   = false;
double gpsLat       = 0.0;
double gpsLng       = 0.0;
bool   gpsValid     = false;

// Risk calculation
int    mosquitoRisk   = 0;  // 0-100
String riskLevel      = "LOW";

// Timing
unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 10000; // Send every 10 seconds

/* ================= SETUP ================= */

void setup() {
    Serial.begin(115200);
    Serial1.begin(9600);  // GPS on Serial1 (D0=RX, D1=TX)

    // Pin modes
    pinMode(PIR_PIN, INPUT);
    pinMode(SOUND_DO_PIN, INPUT);
    pinMode(LASER_PIN, OUTPUT);
    pinMode(LED_PIN, OUTPUT);

    // Start sensors
    dht.begin();
    digitalWrite(LASER_PIN, HIGH); // Turn on laser beam

    Serial.println("═══════════════════════════════════════");
    Serial.println("  MOSQUITO DETECTION SYSTEM — R4 WiFi  ");
    Serial.println("═══════════════════════════════════════");

    // Connect to WiFi
    connectWiFi();
}

/* ================= MAIN LOOP ================= */

void loop() {
    // 1. Read all sensors
    readDHT22();
    readMQ135();
    readMQ102();
    readPIR();
    readSound();
    readLaser();
    readGPS();

    // 2. Calculate mosquito breeding risk
    calculateRisk();

    // 3. Print to Serial Monitor
    printReadings();

    // 4. Send to server every SEND_INTERVAL
    if (millis() - lastSend >= SEND_INTERVAL) {
        sendToServer();
        lastSend = millis();
    }

    // 5. LED indicator for risk level
    if (mosquitoRisk > 60) {
        // Blink fast for high risk
        digitalWrite(LED_PIN, (millis() / 200) % 2);
    } else if (mosquitoRisk > 30) {
        // Blink slow for moderate risk
        digitalWrite(LED_PIN, (millis() / 1000) % 2);
    } else {
        digitalWrite(LED_PIN, LOW);
    }

    delay(2000); // Read sensors every 2 seconds
}

/* ================= SENSOR FUNCTIONS ================= */

void readDHT22() {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t) && !isnan(h)) {
        temperature = t;
        humidity = h;
    }
}

void readMQ135() {
    airQuality = analogRead(MQ135_PIN);
}

void readMQ102() {
    gasLevel = analogRead(MQ102_PIN);
}

void readPIR() {
    motionDetected = digitalRead(PIR_PIN) == HIGH;
}

void readSound() {
    soundLevel = analogRead(SOUND_AO_PIN);
    soundAlert = digitalRead(SOUND_DO_PIN) == HIGH;
}

void readLaser() {
    // Laser outputs HIGH, if something blocks the beam the
    // corresponding LDR/receiver would read LOW. Here we check
    // if beam is broken. Adjust based on your receiver circuit.
    // For now, using PIR as a proxy — you can add an LDR on A3
    // to detect the laser beam interruption.
    laserBroken = motionDetected; // Placeholder — link to LDR if available
}

void readGPS() {
    while (Serial1.available() > 0) {
        gps.encode(Serial1.read());
    }
    if (gps.location.isValid()) {
        gpsLat = gps.location.lat();
        gpsLng = gps.location.lng();
        gpsValid = true;
    }
}

/* ================= RISK CALCULATION ================= */

/*
 * Mosquito Breeding Risk Score (0—100)
 *
 *  Temperature (25–30°C ideal)  → 25 points max
 *  Humidity (>60% ideal)        → 25 points max
 *  Air Quality / Gas            → 20 points max
 *  Motion + Sound activity      → 15 points max
 *  Laser beam breaks            → 15 points max
 */
void calculateRisk() {
    int tempScore = 0;
    int humScore  = 0;
    int gasScore  = 0;
    int activityScore = 0;
    int laserScore = 0;

    // Temperature: mosquitoes breed best at 25–30°C
    if (temperature >= 25 && temperature <= 30) {
        tempScore = 25;  // Ideal breeding temperature
    } else if (temperature >= 20 && temperature < 25) {
        tempScore = 15;
    } else if (temperature > 30 && temperature <= 35) {
        tempScore = 15;
    } else {
        tempScore = 5;
    }

    // Humidity: >60% is favorable for mosquitoes
    if (humidity > 80) {
        humScore = 25;
    } else if (humidity > 60) {
        humScore = 20;
    } else if (humidity > 40) {
        humScore = 10;
    } else {
        humScore = 3;
    }

    // Gas / Air Quality: high readings = organic decay = breeding habitat
    // MQ-135 on R4 WiFi reads 0–1023 (10-bit ADC)
    gasScore = map(constrain(airQuality, 100, 800), 100, 800, 0, 20);

    // Motion + Sound: insect swarm activity
    if (motionDetected && soundAlert) {
        activityScore = 15;
    } else if (motionDetected || soundAlert) {
        activityScore = 8;
    } else if (soundLevel > 500) {
        activityScore = 5;
    }

    // Laser beam break = something flew through detection zone
    if (laserBroken) {
        laserScore = 15;
    }

    mosquitoRisk = constrain(tempScore + humScore + gasScore + activityScore + laserScore, 0, 100);

    if (mosquitoRisk > 70) {
        riskLevel = "CRITICAL";
    } else if (mosquitoRisk > 50) {
        riskLevel = "HIGH";
    } else if (mosquitoRisk > 30) {
        riskLevel = "MODERATE";
    } else {
        riskLevel = "LOW";
    }
}

/* ================= SERIAL PRINT ================= */

void printReadings() {
    Serial.println("────────────────────────────────────");
    Serial.print("🌡️  Temp: ");      Serial.print(temperature); Serial.println("°C");
    Serial.print("💧 Humidity: ");    Serial.print(humidity);     Serial.println("%");
    Serial.print("💨 AirQuality: ");  Serial.println(airQuality);
    Serial.print("💨 GasLevel: ");    Serial.println(gasLevel);
    Serial.print("🔴 Motion: ");      Serial.println(motionDetected ? "YES" : "NO");
    Serial.print("🔊 Sound: ");       Serial.print(soundLevel);
                                       Serial.print(" Alert: "); Serial.println(soundAlert ? "YES" : "NO");
    Serial.print("📡 GPS: ");
    if (gpsValid) {
        Serial.print(gpsLat, 6); Serial.print(", "); Serial.println(gpsLng, 6);
    } else {
        Serial.println("Searching...");
    }
    Serial.print("🦟 RISK: ");     Serial.print(mosquitoRisk); Serial.print("/100 — ");
    Serial.println(riskLevel);
    Serial.println("────────────────────────────────────");
}

/* ================= HTTP POST ================= */

void sendToServer() {
    if (WiFi.status() != WL_CONNECTED) {
        connectWiFi();
        if (WiFi.status() != WL_CONNECTED) return;
    }

    // Build JSON payload
    String json = "{";
    json += "\"nodeId\":\"MOSQUITO-NODE-01\",";
    json += "\"zone\":\"Sector 4A\",";
    json += "\"temperature\":" + String(temperature, 1) + ",";
    json += "\"humidity\":" + String(humidity, 1) + ",";
    json += "\"airQuality\":" + String(airQuality) + ",";
    json += "\"gasLevel\":" + String(gasLevel) + ",";
    json += "\"motion\":" + String(motionDetected ? "true" : "false") + ",";
    json += "\"soundLevel\":" + String(soundLevel) + ",";
    json += "\"soundAlert\":" + String(soundAlert ? "true" : "false") + ",";
    json += "\"laserBroken\":" + String(laserBroken ? "true" : "false") + ",";
    json += "\"mosquitoRisk\":" + String(mosquitoRisk) + ",";
    json += "\"riskLevel\":\"" + riskLevel + "\"";

    if (gpsValid) {
        json += ",\"lat\":" + String(gpsLat, 6);
        json += ",\"lng\":" + String(gpsLng, 6);
    }

    json += "}";

    Serial.println("📤 Sending to server...");
    Serial.println(json);

    http.beginRequest();
    http.post("/api/mosquito/environment");
    http.sendHeader("Content-Type", "application/json");
    http.sendHeader("Content-Length", json.length());
    http.beginBody();
    http.print(json);
    http.endRequest();

    int statusCode = http.responseStatusCode();
    String response = http.responseBody();

    if (statusCode == 200 || statusCode == 201) {
        Serial.println("✅ Data sent successfully!");
    } else {
        Serial.print("❌ Server error: ");
        Serial.print(statusCode);
        Serial.print(" — ");
        Serial.println(response);
    }
}

/* ================= WIFI ================= */

void connectWiFi() {
    Serial.print("📡 Connecting to WiFi: ");
    Serial.println(ssid);

    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print("✅ Connected! IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println();
        Serial.println("❌ WiFi connection failed. Will retry...");
    }
}
