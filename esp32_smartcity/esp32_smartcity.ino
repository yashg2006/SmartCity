#include <WiFiS3.h>
#include <ArduinoHttpClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <SoftwareSerial.h>
#include <ArduinoJson.h>

/* ================= HARDWARE CONFIG ================= */

// LCD display (Address 0x27, 16x2 characters)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// DHT11 Sensor (Temperature & Humidity)
#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Swarm Sensors (Sound & Motion)
#define SOUND_PIN A0    // Analog input for Sound Sensor
#define PIR_PIN 4       // Digital input for PIR Motion Sensor

// GPS Module (Note: R4 WiFi sometimes has issues with SoftwareSerial on certain pins)
// Using pins 0 (RX) and 1 (TX) or specific SoftwareSerial pins
static const int RXPin = 5, TXPin = 6;
static const uint32_t GPSBaud = 9600;
TinyGPSPlus gps;
SoftwareSerial ss(RXPin, TXPin);

/* ================= NETWORK CONFIG ================= */

char ssid[] = "Apna Net Khud Bharwao Yaar"; // your network SSID
char pass[] = "j6izw7as";                  // your network password

char serverAddress[] = "10.44.53.60";      // Laptop IP
int port = 3000;

WiFiClient wifi;
HttpClient client = HttpClient(wifi, serverAddress, port);

/* ================= GLOBALS ================= */

unsigned long lastPollTime = 0;
const int pollInterval = 5000; 

/* ================= FUNCTIONS ================= */

void updateLCD(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

void connectWiFi() {
  updateLCD("WiFi Connecting", ssid);
  while (WiFi.begin(ssid, pass) != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi Connected!");
  updateLCD("UrbanPulse LIVE", WiFi.localIP().toString());
}

void sendSensorData(float temp, float humid, int sound, bool motion) {
  StaticJsonDocument<200> doc;
  doc["nodeId"] = "MOSQUITO-NODE-01";
  doc["zone"] = "Sector 4A";
  doc["temp"] = temp;
  doc["humid"] = humid;
  doc["sound"] = sound;
  doc["motion"] = motion;

  String payload;
  serializeJson(doc, payload);

  Serial.println("Pushing sensors...");
  client.post("/api/sensors/data", "application/json", payload);

  int statusCode = client.responseStatusCode();
  String response = client.responseBody();
  Serial.print("Status: ");
  Serial.println(statusCode);
}

void pollLatestResult() {
  Serial.println("Checking latest result...");
  client.get("/api/mosquito/latest-report?zone=Sector%204A");

  int statusCode = client.responseStatusCode();
  if (statusCode == 200) {
    String response = client.responseBody();
    StaticJsonDocument<500> doc;
    deserializeJson(doc, response);

    String mlResult = doc["mlResult"] | "N/A";
    int risk = doc["riskScore"] | 0;

    lcd.setCursor(0, 1);
    lcd.print("                "); // Clear line
    lcd.setCursor(0, 1);
    String msg = "R:" + String(risk) + "% " + mlResult;
    lcd.print(msg.substring(0, 16));
  }
}

/* ================= SETUP ================= */

void setup() {
  Serial.begin(115200);
  
  lcd.init();
  lcd.backlight();
  updateLCD("UrbanPulse", "R4 WiFi Booting");

  dht.begin();
  pinMode(PIR_PIN, INPUT);
  ss.begin(GPSBaud);

  connectWiFi();
  delay(1000);
}

/* ================= LOOP ================= */

void loop() {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  int soundVal = analogRead(SOUND_PIN);
  bool motion = digitalRead(PIR_PIN);

  while (ss.available() > 0)
    gps.encode(ss.read());

  // Update LCD Line 1 with live sensor data
  if (!isnan(h) && !isnan(t)) {
    lcd.setCursor(0, 0);
    lcd.print("T:" + String(t, 1) + "C H:" + String(h, 0) + "%      ");
  }

  if (millis() - lastPollTime > pollInterval) {
    sendSensorData(t, h, soundVal, motion);
    pollLatestResult();
    lastPollTime = millis();
  }

  delay(500);
}
