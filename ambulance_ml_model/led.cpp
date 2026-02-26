  #include <Arduino.h>

  void normalMode();
  void activateEmergency();

  const int leds[5] = {2, 3, 4, 5, 6}; 
  // leds[0-3] = lanes 1-4
  // leds[4] = follower of lane 4

  int currentLane = 0;
  unsigned long lastSwitch = 0;
  const unsigned long interval = 4000;

  bool emergency = false;
  int emergencyLane = -1;

  void setup() {
    Serial.begin(115200);
    randomSeed(analogRead(A0));

    for (int i = 0; i < 5; i++) {
      pinMode(leds[i], OUTPUT);
      digitalWrite(leds[i], HIGH);
    }

    Serial.println("Traffic System Started");
  }

  void loop() {

    if (Serial.available()) {
      String input = Serial.readStringUntil('\n');
      input.trim();

      if (input.startsWith("AMBULANCE:")) {
        emergency = true;
        emergencyLane = input.substring(10).toInt() - 1;

        Serial.print("🚑 Ambulance Signal Received for Lane ");
        Serial.println(emergencyLane + 1);

        activateEmergency();
      }

      if (input == "NORMAL") {
        emergency = false;
        emergencyLane = -1;
        Serial.println("Back to Normal Mode");
      }
    }

    if (!emergency) {
      if (millis() - lastSwitch > interval) {
        currentLane = (currentLane + 1) % 4; // Only rotate 1–4
        normalMode();
        lastSwitch = millis();
      }
    }
  }

  void normalMode() {

    // Turn all ON
    for (int i = 0; i < 5; i++) {
      digitalWrite(leds[i], HIGH);
    }

    // One of first 4 OFF
    digitalWrite(leds[currentLane], LOW);

    // LED5 follows Lane 4
    if (currentLane == 3)
      digitalWrite(leds[4], LOW);
    else
      digitalWrite(leds[4], HIGH);

    Serial.print("Normal → Lane ");
    Serial.print(currentLane + 1);
    Serial.println(" GO");
  }

  void activateEmergency() {

    // Random delay between 1–3 seconds
    int delayTime = random(1000, 3000);

    Serial.print("Emergency delay: ");
    Serial.print(delayTime);
    Serial.println(" ms");

    delay(delayTime);

    // Turn all ON
    for (int i = 0; i < 5; i++) {
      digitalWrite(leds[i], HIGH);
    }

    if (emergencyLane >= 0 && emergencyLane < 4) {
      digitalWrite(leds[emergencyLane], LOW);

      Serial.print("🚑 Ambulance at Lane ");
      Serial.println(emergencyLane + 1);
    }

    // LED5 follows Lane 4
    if (emergencyLane == 3)
      digitalWrite(leds[4], LOW);
    else
      digitalWrite(leds[4], HIGH);
  }
  