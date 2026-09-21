/*
 * Prueba de Matriz / Tira de 25 LEDs (5x5) WS2812B en STM32F401
 * Permite validar que todos los 25 LEDs funcionen, no haya pistas cortadas
 * y comprobar el orden de conexión de la señal de datos DIN.
 */

#include <Adafruit_NeoPixel.h>

#define LED_PIN PA7
#define NUM_LEDS 25

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

void colorWipe(uint32_t color, int wait);
void rainbowCycle(int wait);

void setup() {
  strip.begin();

  strip.setBrightness(40);

  strip.clear();
  strip.show();
  delay(300);
}

void loop() {
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.clear();
    strip.setPixelColor(i, strip.Color(0, 255, 255));
    strip.show();
    delay(120);
  }

  delay(400);

  colorWipe(strip.Color(255, 255, 255), 50);
  delay(1500);

  colorWipe(strip.Color(255, 0, 0), 40);
  delay(1000);

  colorWipe(strip.Color(0, 255, 0), 40);
  delay(1000);

  colorWipe(strip.Color(0, 0, 255), 40);
  delay(1000);

  for (int j = 0; j < 3; j++) {
    rainbowCycle(15);
  }

  strip.clear();
  strip.show();
  delay(500);
}

void colorWipe(uint32_t color, int wait) {
  for (int i = 0; i < strip.numPixels(); i++) {
    strip.setPixelColor(i, color);
    strip.show();
    delay(wait);
  }
}

void rainbowCycle(int wait) {
  for (long firstPixelHue = 0; firstPixelHue < 65536; firstPixelHue += 1024) {
    for (int i = 0; i < strip.numPixels(); i++) {
      int pixelHue = firstPixelHue + (i * 65536L / strip.numPixels());
      strip.setPixelColor(i, strip.gamma32(strip.ColorHSV(pixelHue)));
    }
    strip.show();
    delay(wait);
  }
}
