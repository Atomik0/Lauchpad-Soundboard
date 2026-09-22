/*
 * ============================================================================
 * FIRMWARE LAUNCHPAD 8x8 - ULTIMATE LIGHTSHOW & SOUNDBOARD PRO
 * Microcontrolador: STM32F401 (Black Pill)
 * Soporte: Compositor de Iluminación Inteligente (Fusión Neón Aditiva),
 *          Animaciones Psicodélicas a 60 FPS y Sincronización WebSerial sin
 * latencia
 * ============================================================================
 */

#include <Adafruit_NeoPixel.h>
#include <math.h>

#define LED_PIN PA7
#define NUM_LEDS 64
#define ROWS 8
#define COLS 8
#define DEFAULT_BRIGHTNESS 220

const uint8_t rowPins[ROWS] = {PB3, PB4, PB5, PB6, PB7, PB8, PB9, PB0};
const uint8_t colPins[COLS] = {PA0, PA1, PA2, PA3, PA4, PA5, PA6, PB10};

#define START_LED_TOP_RIGHT true

struct PadLed {
  uint8_t r, g, b;
  bool hasSound;
  bool isPlaying;
  unsigned long playStartTime;
};

PadLed padLeds[NUM_LEDS];
bool keyState[ROWS][COLS];
unsigned long lastDebounceTime[ROWS][COLS];
const unsigned long debounceDelay = 5;

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

uint8_t pressEffect = 1;
uint8_t idleEffect = 11;
uint8_t blendMode = 0;
uint8_t vuLevels[COLS];

bool fnModeActive = false;
bool fnKeyEnabled = true;
uint8_t totalBanksCount = 1;
uint8_t currentBankIndex = 0;

unsigned long lastActivityTime = 0;
const unsigned long SLEEP_TIMEOUT_MS = 15000;

struct ActivePressEffect {
  bool active;
  uint8_t id;          // 0 to 12
  uint8_t r, c;        // Origin coordinates
  uint8_t colorR, colorG, colorB;
  unsigned long startTime;
  uint16_t duration;
  float seed;
};
#define MAX_ACTIVE_PRESS_EFFECTS 6
ActivePressEffect activePressEffects[MAX_ACTIVE_PRESS_EFFECTS];

float plasmaTime = 0.0f;
unsigned long lastPlasmaTime = 0;
uint16_t warpHue = 0;
unsigned long lastWarpTime = 0;

uint8_t matrixDrops[COLS];
unsigned long lastMatrixTime = 0;
uint16_t rainbowHue = 0;
unsigned long lastRainbowTime = 0;
uint8_t breathPhase = 0;
unsigned long lastBreathTime = 0;
unsigned long lastFireworkTime = 0;
uint8_t fwRow = 0, fwCol = 0, fwStep = 0;
bool fwActive = false;
uint16_t oceanPhase = 0;
unsigned long lastOceanTime = 0;

unsigned long lastFlashTime = 0;
bool flashToggle = false;

char serialBuf[96];
uint8_t serialBufIdx = 0;

struct RGBColor {
  uint8_t r, g, b;
  RGBColor() : r(0), g(0), b(0) {}
  RGBColor(uint8_t _r, uint8_t _g, uint8_t _b) : r(_r), g(_g), b(_b) {}
};

inline uint16_t getLedIndex(uint8_t row, uint8_t col) {
  if (START_LED_TOP_RIGHT) {
    if (row % 2 == 0) {
      return (row * COLS) + (COLS - 1 - col);
    } else {
      return (row * COLS) + col;
    }
  } else {
    if (row % 2 == 0) {
      return (row * COLS) + col;
    } else {
      return (row * COLS) + (COLS - 1 - col);
    }
  }
}

RGBColor hslToRgb(float h, float s, float l) {
  h = fmodf(fmodf(h, 360.0f) + 360.0f, 360.0f);
  s = constrain(s, 0.0f, 1.0f);
  l = constrain(l, 0.0f, 1.0f);
  float c = (1.0f - fabsf(2.0f * l - 1.0f)) * s;
  float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
  float m = l - c * 0.5f;
  float r = 0.0f, g = 0.0f, b = 0.0f;
  if (h < 60.0f) { r = c; g = x; }
  else if (h < 120.0f) { r = x; g = c; }
  else if (h < 180.0f) { g = c; b = x; }
  else if (h < 240.0f) { g = x; b = c; }
  else if (h < 300.0f) { r = x; b = c; }
  else { r = c; b = x; }
  return {
    (uint8_t)constrain((int)roundf((r + m) * 255.0f), 0, 255),
    (uint8_t)constrain((int)roundf((g + m) * 255.0f), 0, 255),
    (uint8_t)constrain((int)roundf((b + m) * 255.0f), 0, 255)
  };
}

RGBColor computeIdleLedColor(uint8_t r, uint8_t c, uint8_t idleMode, unsigned long now, uint8_t rows, uint8_t cols) {
  if (idleMode == 0) return {0, 0, 0};
  float t = (float)now * 0.001f;
  float centerR = ((float)rows - 1.0f) * 0.5f;
  float centerC = ((float)cols - 1.0f) * 0.5f;
  float scale = (cols == 5) ? 0.625f : 1.0f;

  switch (idleMode) {
    case 1: { // Rainbow Wave
      float step = (cols == 5) ? 50.0f : 32.0f;
      float hue = fmodf(t * 98.9f + ((float)r * step) + ((float)c * step), 360.0f);
      return hslToRgb(hue, 1.0f, 0.5f);
    }
    case 2: { // Matrix Rain
      const float speeds[8] = {0.85f, 1.15f, 0.75f, 1.25f, 0.70f, 1.05f, 0.90f, 1.20f};
      float sp = speeds[c % 8];
      const float colOffsets5[5] = {0.0f, 3.8f, 1.4f, 5.2f, 2.6f};
      const float colOffsets8[8] = {0.0f, 6.2f, 2.1f, 8.4f, 4.3f, 1.2f, 7.5f, 5.1f};
      float offset = (cols == 5) ? colOffsets5[c % 5] : colOffsets8[c % 8];
      float wrapLen = (float)rows + 3.2f;
      float speedFactor = (cols == 5) ? 5.5f : 7.8f;
      float dropPos = fmodf(t * speedFactor * sp + offset, wrapLen);
      float diff = (float)r - dropPos;
      if (fabsf(diff) < 0.6f) return {220, 255, 220};
      if (diff < 0.0f && diff > -2.2f) return {0, 220, 60};
      if (diff < 0.0f && diff > -4.5f) return {0, 80, 20};
      return {0, 12, 6};
    }
    case 3: { // Nebula Breathing
      float cx = centerC + sinf(t * 1.2f) * (1.8f * scale);
      float cy = centerR + cosf(t * 0.9f) * (1.8f * scale);
      float dist = sqrtf(powf((float)r - cy, 2) + powf((float)c - cx, 2));
      float norm = constrain(dist / (4.6f * scale), 0.0f, 1.0f);
      return {
        (uint8_t)roundf((1.0f - norm) * 230.0f),
        (uint8_t)roundf(norm * 160.0f),
        240
      };
    }
    case 4: { // Strobe Heartbeat
      float phase = sinf(t * 2.0f) * 0.5f + 0.5f;
      uint8_t br = (uint8_t)roundf(40.0f + phase * 200.0f);
      return {0, (uint8_t)roundf((float)br * 0.9f), br};
    }
    case 5: { // Starburst Spark
      float maxDist = sqrtf(powf(centerR, 2) + powf(centerC, 2)) + 0.6f;
      float cycleLen = maxDist + 0.8f;
      float speed = (cols == 5) ? 2.2f : 2.8f;
      float d1 = fmodf(t * speed, cycleLen);
      float d2 = fmodf(t * speed + cycleLen * 0.5f, cycleLen);
      float dist = sqrtf(powf((float)r - centerR, 2) + powf((float)c - centerC, 2));
      float thr = (cols == 5) ? 0.85f : 1.1f;
      float diff1 = fabsf(dist - d1);
      float diff2 = fabsf(dist - d2);

      if (diff1 < thr || diff2 < thr) {
        float activeD = (diff1 < thr) ? d1 : d2;
        float activeDiff = (diff1 < thr) ? diff1 : diff2;
        float fade = constrain(1.0f - activeD / maxDist, 0.0f, 1.0f) * (1.0f - activeDiff / thr);
        float stepCol = (cols == 5) ? 28.0f : 18.0f;
        float hue = fmodf(floorf(t * 0.6f) * 65.0f + ((float)(r + c)) * stepCol, 360.0f);
        RGBColor baseCol = hslToRgb(hue, 1.0f, 0.5f);
        return {
          (uint8_t)roundf((float)baseCol.r * fade),
          (uint8_t)roundf((float)baseCol.g * fade),
          (uint8_t)roundf((float)baseCol.b * fade)
        };
      }
      return {5, 5, 14};
    }
    case 6: { // Ocean Wave
      float oceanPhase = t * 120.0f;
      float stepC = (cols == 5) ? 56.0f : 35.0f;
      float wave = (sinf((oceanPhase + (float)c * stepC) * 0.02454f) + 1.0f) * 127.5f;
      return {0, (uint8_t)roundf(wave * 0.6f), (uint8_t)roundf(wave)};
    }
    case 7: { // Fire Embers
      float flicker = sinf(t * 3.5f + (float)c * 1.8f) * ((cols == 5) ? 0.8f : 0.9f);
      float h = ((float)(rows - 1 - r)) + flicker;
      float thr4 = (cols == 5) ? 3.4f : 5.2f;
      float thr3 = (cols == 5) ? 2.0f : 3.2f;
      float thr2 = (cols == 5) ? 0.8f : 1.2f;
      if (h > thr4) return {255, 230, 60};
      if (h > thr3) return {255, 120, 0};
      if (h > thr2) return {220, 25, 0};
      if (h >= 0.0f) return {80, 8, 0};
      return {15, 2, 0};
    }
    case 8: { // Cyberpunk EQ
      float freqC = (cols == 5) ? 1.3f : 1.1f;
      float barVal = (sinf(t * 2.5f + (float)c * freqC) * 0.5f + 0.5f) * ((float)rows - 0.4f);
      int invRow = (int)rows - 1 - (int)r;
      if ((float)invRow <= barVal) {
        float ratio = (float)invRow / ((float)rows - 1.0f);
        if (ratio >= 0.75f) return {255, 0, 50};
        if (ratio >= 0.50f) return {255, 200, 0};
        if (ratio >= 0.25f) return {0, 240, 255};
        return {0, 255, 90};
      }
      return {8, 12, 18};
    }
    case 9: { // Aurora Plasma
      float freq = (cols == 5) ? 1.2f : 0.8f;
      float v = sinf((float)r * freq + t * 2.0f) +
                sinf((float)c * freq + t * 2.6f) +
                sinf(((float)r + (float)c) * 0.5f + t * 1.8f);
      float hue = fmodf((v + 3.0f) * 60.0f + t * 40.0f, 360.0f);
      return hslToRgb(hue, 1.0f, 0.5f);
    }
    case 10: { // Laser Rings
      float maxRing = (cols == 5) ? 3.8f : 5.2f;
      float ring1 = fmodf(t * 3.5f, maxRing);
      float ring2 = fmodf(t * 3.5f + maxRing * 0.5f, maxRing);
      float dist = sqrtf(powf((float)r - centerR, 2) + powf((float)c - centerC, 2));
      float d1 = fabsf(dist - ring1);
      float d2 = fabsf(dist - ring2);
      if (d1 < 0.85f) {
        uint8_t b1 = (uint8_t)roundf((1.0f - (d1 / 0.85f)) * 240.0f);
        return {b1, b1, 255};
      }
      if (d2 < 0.85f) {
        uint8_t b2 = (uint8_t)roundf((1.0f - (d2 / 0.85f)) * 200.0f);
        return {(uint8_t)roundf((float)b2 * 0.4f), b2, 255};
      }
      return {5, 6, 18};
    }
    case 11: { // Quantum Flux
      float fx = fabsf((float)c - centerC);
      float fy = fabsf((float)r - centerR);
      float pTime = t * 2.5f;
      float fScale = (cols == 5) ? 2.5f : 1.7f;
      float mand = sinf(fx * fScale + pTime) * cosf(fy * fScale - pTime) +
                   sinf((fx + fy) * (fScale * 0.65f) + pTime * 1.4f);
      float hue = fmodf((mand + 2.0f) * 85.0f + t * 76.9f, 360.0f);
      return hslToRgb(hue, 1.0f, 0.55f);
    }
    case 12: { // Warp Tunnel
      float dx = (float)c - centerC;
      float dy = (float)r - centerR;
      float dist = sqrtf(dx * dx + dy * dy);
      float angle = atan2f(dy, dx);
      float tunnel = fmodf(fmodf(t * 1.6f - (1.0f / (dist + 0.2f)) * (3.5f * scale), 1.0f) + 1.0f, 1.0f);
      float hue = fmodf((angle / 3.14159265f + 1.0f) * 180.0f + t * 65.0f, 360.0f);
      float br = sinf(tunnel * 6.2831853f) * 0.5f + 0.5f;
      return hslToRgb(hue, 1.0f, fmaxf(0.08f, br * 0.55f));
    }
    case 13: { // Metaball Glow
      float pTime = t * 1.6f;
      float m1x = centerC + sinf(pTime * 1.1f) * (2.0f * scale);
      float m1y = centerR + cosf(pTime * 1.4f) * (2.0f * scale);
      float m2x = centerC + cosf(pTime * 0.9f) * (2.2f * scale);
      float m2y = centerR + sinf(pTime * 1.5f) * (2.2f * scale);
      float m3x = centerC + sinf(pTime * 1.7f + 1.0f) * (1.8f * scale);
      float m3y = centerR + cosf(pTime * 1.2f + 1.0f) * (1.8f * scale);

      float field = (1.0f / (powf((float)c - m1x, 2) + powf((float)r - m1y, 2) + 0.45f * scale))
                  + (1.0f / (powf((float)c - m2x, 2) + powf((float)r - m2y, 2) + 0.45f * scale))
                  + (1.0f / (powf((float)c - m3x, 2) + powf((float)r - m3y, 2) + 0.45f * scale));
      float hue = fmodf(field * 140.0f + t * 50.0f, 360.0f);
      float br = fminf(1.0f, field * 0.55f);
      return hslToRgb(hue, 1.0f, br * 0.55f);
    }
    case 14: { // Hyperspace Vortex
      float dx = (float)c - centerC;
      float dy = (float)r - centerR;
      float dist = sqrtf(dx * dx + dy * dy);
      float angle = atan2f(dy, dx);
      float spiral = angle * 2.0f + dist * (1.7f / scale) - t * 3.2f;
      float hue = fmodf(fmodf(spiral * (180.0f / 3.14159265f) + 720.0f, 360.0f) + 360.0f, 360.0f);
      float pulse = sinf(spiral * 2.0f) * 0.5f + 0.5f;
      return hslToRgb(hue, 1.0f, fmaxf(0.1f, pulse * 0.55f));
    }
    case 15: { // Neon Wave
      float pTime = t * 1.6f;
      float stepC1 = (cols == 5) ? 1.1f : 0.7f;
      float stepC2 = (cols == 5) ? 1.7f : 1.1f;
      float wave1 = sinf((float)c * stepC1 + pTime * 1.8f) * (1.7f * scale);
      float wave2 = cosf((float)c * stepC2 - pTime * 1.4f) * (1.1f * scale);
      float targetY = centerR + wave1 + wave2;
      float distY = fabsf((float)r - targetY);
      float intensity = fmaxf(0.0f, 1.0f - distY / (2.7f * scale));
      float colFactorC = (cols == 5) ? 45.0f : 30.0f;
      float colFactorR = (cols == 5) ? 35.0f : 22.0f;
      float hue = fmodf((float)c * colFactorC + (float)r * colFactorR + t * 70.0f, 360.0f);
      return hslToRgb(hue, 1.0f, intensity * 0.6f);
    }
    case 16: { // Audio Pulse
      uint16_t avgVu = 0;
      for (uint8_t i = 0; i < cols; i++) {
        avgVu += vuLevels[i];
      }
      float bass = constrain((float)avgVu / (8.0f * (float)cols), 0.0f, 1.0f);
      float dist = sqrtf(powf((float)r - centerR, 2) + powf((float)c - centerC, 2));
      float maxDist = (cols == 5) ? 3.4f : 5.4f;
      float normDist = fmaxf(0.0f, 1.0f - (dist / maxDist));
      float pulse = fminf(1.0f, normDist * (0.18f + bass * 0.92f));
      float hue = fmodf(t * 50.0f + dist * 35.0f + bass * 120.0f, 360.0f);
      return hslToRgb(hue, 1.0f, fmaxf(0.04f, pulse * 0.8f));
    }
    default: {
      float hue = fmodf(t * 30.0f + ((float)r * 25.0f) + ((float)c * 20.0f), 360.0f);
      return hslToRgb(hue, 0.9f, 0.4f);
    }
  }
}

void playEpicStartupAnimation();
void readFastSerial();
void scanMatrixInstant();
void renderAllEffects();
void triggerPressEffect(uint8_t r, uint8_t c, uint16_t ledIdx, int forcedEffect = -1);
void computePressEffect(const ActivePressEffect &eff, uint8_t r, uint8_t c, unsigned long nowTime,
                        float &outIntensity, uint8_t &outR, uint8_t &outG, uint8_t &outB);
void handleCommand(char *buf);
void enterDFUMode();

#define DFU_BOOT_KEY 0xDF01B007
__attribute__((section(".noinit"))) volatile uint32_t dfu_magic_flag;

extern "C" void checkDfuBootloader(void) __attribute__((constructor(102)));
void checkDfuBootloader(void) {
  RCC->APB1ENR |= RCC_APB1ENR_PWREN;
  PWR->CR |= PWR_CR_DBP;

  if (RTC->BKP0R == DFU_BOOT_KEY || dfu_magic_flag == DFU_BOOT_KEY) {
    RTC->BKP0R = 0;
    dfu_magic_flag = 0;

    __disable_irq();

    SysTick->CTRL = 0;
    SysTick->LOAD = 0;
    SysTick->VAL = 0;

    for (int i = 0; i < 8; i++) {
      NVIC->ICER[i] = 0xFFFFFFFF;
      NVIC->ICPR[i] = 0xFFFFFFFF;
    }

    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    GPIOA->MODER &= ~(3U << (10 * 2));
    GPIOA->PUPDR &= ~(3U << (10 * 2));
    GPIOA->PUPDR |= (2U << (10 * 2));

    RCC->APB2ENR |= RCC_APB2ENR_SYSCFGEN;
    SYSCFG->MEMRMP = 0x01;

    SCB->VTOR = 0x00000000;

    uint32_t bootloaderStack = *(volatile uint32_t *)0x1FFF0000;
    __set_MSP(bootloaderStack);

    void (*bootloaderJump)(void) =
        (void (*)(void))(*(volatile uint32_t *)0x1FFF0004);
    bootloaderJump();

    while (1)
      ;
  }
}

void enterDFUMode() {
  Serial.println("ENTERING_DFU_MODE");
  Serial.flush();
  delay(50);

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(160, 0, 255));
  }

  strip.show();
  delay(140);
  strip.clear();
  strip.show();

  RCC->APB1ENR |= RCC_APB1ENR_PWREN;
  PWR->CR |= PWR_CR_DBP;
  RTC->BKP0R = DFU_BOOT_KEY;
  dfu_magic_flag = DFU_BOOT_KEY;

  Serial.end();
  pinMode(PA12, OUTPUT);
  digitalWrite(PA12, LOW);
  pinMode(PA11, OUTPUT);
  digitalWrite(PA11, LOW);
  delay(350);

  NVIC_SystemReset();

  while (1)
    ;
}

void playEpicStartupAnimation() {
  strip.setBrightness(255);

  float dists[ROWS][COLS];
  for (uint8_t r = 0; r < ROWS; r++) {
    for (uint8_t c = 0; c < COLS; c++) {
      float dr = (float)r - 3.5f;
      float dc = (float)c - 3.5f;
      dists[r][c] = sqrtf(dr * dr + dc * dc);
    }
  }

  strip.clear();
  for (uint8_t r = 3; r <= 4; r++) {
    for (uint8_t c = 3; c <= 4; c++) {
      strip.setPixelColor(getLedIndex(r, c), strip.Color(255, 255, 255));
    }
  }
  strip.show();
  delay(110);

  for (float radius = 0.6f; radius <= 5.4f; radius += 0.42f) {
    strip.clear();
    for (uint8_t r = 0; r < ROWS; r++) {
      for (uint8_t c = 0; c < COLS; c++) {
        float d = dists[r][c];
        float diff = fabsf(d - radius);
        if (diff < 1.05f) {
          float intensity = 1.0f - (diff / 1.05f);
          uint16_t hue = (uint16_t)(radius * 11500);
          uint32_t col = strip.ColorHSV(hue, 255, (uint8_t)(255 * intensity));
          strip.setPixelColor(getLedIndex(r, c), col);
        }
      }
    }
    strip.show();
    delay(20);
  }

  for (int step = 0; step < 18; step++) {
    float a1 = (float)step * 0.48f;
    float a2 = a1 + 3.14159f;
    float rad = 4.2f - ((float)step * 0.21f);

    strip.clear();
    for (int trail = 0; trail < 4; trail++) {
      float subA1 = a1 - ((float)trail * 0.28f);
      float subA2 = a2 - ((float)trail * 0.28f);
      int cr1 = (int)(3.5f + sinf(subA1) * rad + 0.5f);
      int cc1 = (int)(3.5f + cosf(subA1) * rad + 0.5f);
      int cr2 = (int)(3.5f + sinf(subA2) * rad + 0.5f);
      int cc2 = (int)(3.5f + cosf(subA2) * rad + 0.5f);

      uint8_t br = 255 / (trail + 1);
      if (cr1 >= 0 && cr1 < 8 && cc1 >= 0 && cc1 < 8) {
        strip.setPixelColor(getLedIndex(cr1, cc1), strip.Color(0, br, br));
      }
      if (cr2 >= 0 && cr2 < 8 && cc2 >= 0 && cc2 < 8) {
        strip.setPixelColor(getLedIndex(cr2, cc2),
                            strip.Color(br, 0, (uint8_t)(br * 0.75f)));
      }
    }
    strip.show();
    delay(25);
  }

  for (int d = -4; d <= 18; d += 2) {
    strip.clear();
    for (uint8_t r = 0; r < ROWS; r++) {
      for (uint8_t c = 0; c < COLS; c++) {
        int diag = r + c;
        if (diag == d || diag == d - 1) {
          strip.setPixelColor(getLedIndex(r, c), strip.Color(255, 255, 255));
        } else if (diag == d - 2 || diag == d - 3) {
          strip.setPixelColor(getLedIndex(r, c), strip.Color(0, 240, 255));
        } else if (diag == d - 4 || diag == d - 5) {
          strip.setPixelColor(getLedIndex(r, c), strip.Color(180, 0, 255));
        }
      }
    }
    strip.show();
    delay(18);
  }

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(255, 255, 255));
  }
  strip.show();
  delay(55);

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(0, 180, 255));
  }
  strip.show();
  delay(350);

  for (int p = 0; p < 2; p++) {
    for (int b = 255; b >= 80; b -= 25) {
      for (uint16_t i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, strip.Color(0, (uint8_t)(b * 180 / 255), b));
      }
      strip.show();
      delay(14);
    }
    for (int b = 80; b <= 255; b += 25) {
      for (uint16_t i = 0; i < NUM_LEDS; i++) {
        strip.setPixelColor(i, strip.Color(0, (uint8_t)(b * 180 / 255), b));
      }
      strip.show();
      delay(14);
    }
    delay(80);
  }

  for (int b = 255; b >= 0; b -= 18) {
    uint8_t bv = (b < 0) ? 0 : b;
    for (uint16_t i = 0; i < NUM_LEDS; i++) {
      strip.setPixelColor(i, strip.Color(0, (uint8_t)(bv * 180 / 255), bv));
    }
    strip.show();
    delay(16);
  }
  strip.clear();
  strip.show();

  strip.setBrightness(DEFAULT_BRIGHTNESS);
}

void setup() {
  checkDfuBootloader();

  Serial.begin(115200);

  for (uint8_t r = 0; r < ROWS; r++)
    pinMode(rowPins[r], INPUT);
  for (uint8_t c = 0; c < COLS; c++)
    pinMode(colPins[c], INPUT_PULLUP);

  for (uint8_t r = 0; r < ROWS; r++) {
    for (uint8_t c = 0; c < COLS; c++) {
      keyState[r][c] = false;
      lastDebounceTime[r][c] = 0;
    }
  }

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    padLeds[i].r = 0;
    padLeds[i].g = 0;
    padLeds[i].b = 0;
    padLeds[i].hasSound = false;
    padLeds[i].isPlaying = false;
    padLeds[i].playStartTime = 0;
  }

  for (int i = 0; i < MAX_ACTIVE_PRESS_EFFECTS; i++) {
    activePressEffects[i].active = false;
  }

  for (uint8_t c = 0; c < COLS; c++) {
    matrixDrops[c] = random(0, ROWS);
    vuLevels[c] = 0;
  }

  lastActivityTime = millis();

  strip.begin();
  strip.clear();
  strip.show();

  playEpicStartupAnimation();

  Serial.println("LAUNCHPAD_SOUNDBOARD_READY");
}

void loop() {
  readFastSerial();
  scanMatrixInstant();
  renderAllEffects();
}

void computePressEffect(const ActivePressEffect &eff, uint8_t r, uint8_t c, unsigned long nowTime,
                        float &outIntensity, uint8_t &outR, uint8_t &outG, uint8_t &outB) {
  outIntensity = 0.0f;
  outR = eff.colorR;
  outG = eff.colorG;
  outB = eff.colorB;

  float elapsed = (float)(nowTime - eff.startTime);
  float rawT = elapsed / (float)eff.duration;
  float t = constrain(rawT, 0.0f, 1.0f);
  float dr = (float)r - (float)eff.r;
  float dc = (float)eff.c - (float)c; // Visual X axis alignment (user view)
  float dist = sqrtf(dr * dr + dc * dc);

  switch (eff.id) {
    case 0: { // Direct Flash (Destello Blanco Pulsado)
      if (dist < 0.7f) {
        outIntensity = max(0.0f, 1.0f - t * 2.5f);
      } else if (dist < 1.9f) {
        outIntensity = max(0.0f, 0.45f * (1.0f - dist / 1.9f) * (1.0f - t * 2.0f));
      }
      outR = 255; outG = 255; outB = 255;
      break;
    }

    case 1: { // Ripple (Onda Expansiva Circular)
      float maxWaveR = 9.5f;
      float waveR = t * maxWaveR;
      float diff = fabsf(dist - waveR);
      if (diff < 1.3f) {
        outIntensity = max(0.0f, (1.0f - diff / 1.3f) * (1.0f - t * 0.8f));
      }
      break;
    }

    case 2: { // Crosshair (Cruz Laser X-Y)
      bool inCross = (fabsf(dr) < 0.6f) || (fabsf(dc) < 0.6f);
      float laserDist = max(fabsf(dr), fabsf(dc));
      float maxLaser = 10.0f;
      if (inCross && laserDist <= t * maxLaser) {
        outIntensity = max(0.0f, 1.0f - t * 0.95f);
      }
      break;
    }

    case 3: { // Starburst (Estallido de Particulas / Estrella de 8 Rayos)
      float maxStarR = 8.0f;
      float starR = t * maxStarR;
      float diffDist = fabsf(dist - starR);
      if (diffDist < 1.2f) {
        float ptAngle = atan2f(dr, dc) * 180.0f / 3.14159265f;
        if (ptAngle < 0.0f) ptAngle += 360.0f;
        const float angles[8] = {0.0f, 45.0f, 90.0f, 135.0f, 180.0f, 225.0f, 270.0f, 315.0f};
        for (uint8_t a = 0; a < 8; a++) {
          float diffA = fabsf(ptAngle - angles[a]);
          if (diffA > 180.0f) diffA = 360.0f - diffA;
          if (diffA < 18.0f) {
            outIntensity = max(0.0f, (1.0f - diffA / 18.0f) * (1.0f - diffDist / 1.2f) * (1.0f - t));
            break;
          }
        }
      }
      break;
    }

    case 4: { // Lightning Storm (Chispazo Electrico Neon)
      bool flicker = sinf(t * 35.0f + eff.seed * 20.0f) > 0.0f;
      if (flicker && dist < 3.8f) {
        float hashVal = sinf((float)r * 12.9898f + (float)c * 78.233f + floorf(t * 12.0f)) * 43758.5453f;
        float frac = hashVal - floorf(hashVal);
        if (frac > 0.55f) {
          outIntensity = max(0.0f, 1.0f - t * 0.8f);
        }
      }
      break;
    }

    case 5: { // Crystal Diamond (Diamante Expandible - Distancia Manhattan)
      float manhattan = fabsf(dr) + fabsf(dc);
      float diaR = t * 12.5f;
      float diff = fabsf(manhattan - diaR);
      if (diff < 1.2f) {
        outIntensity = max(0.0f, (1.0f - diff / 1.2f) * (1.0f - t * 0.85f));
      }
      break;
    }

    case 6: { // Volcanic Shockwave (Onda Ardiente de Fuego)
      float waveR = t * 9.0f;
      float diff = fabsf(dist - waveR);
      if (diff < 1.4f) {
        outIntensity = max(0.0f, (1.0f - diff / 1.4f) * (1.0f - t * 0.85f));
        if (t < 0.4f) {
          outR = 255; outG = 204; outB = 0; // #ffcc00
        } else {
          outR = 255; outG = 69; outB = 0;   // #ff4500
        }
      }
      break;
    }

    case 7: { // Vortex Spiral (Galaxia Espiral Cosmica)
      float angle = atan2f(dr, dc);
      if (angle < 0.0f) angle += 6.2831853f;
      float rot = fmodf(angle + t * 15.70796f + 12.56637f, 6.2831853f);
      float expectedDist = (rot / 6.2831853f) * 8.0f;
      float diff = fabsf(dist - expectedDist);
      if (diff < 1.4f) {
        outIntensity = max(0.0f, (1.0f - diff / 1.4f) * (1.0f - t * 0.9f));
      }
      break;
    }

    case 8: { // Hyper Neon Pulse (Anillo Neon Doble Flash)
      float r1 = t * 10.0f;
      float r2 = max(0.0f, (t - 0.22f) * 10.0f);
      float diff1 = fabsf(dist - r1);
      float diff2 = fabsf(dist - r2);
      float p1 = (diff1 < 1.2f) ? max(0.0f, (1.0f - diff1 / 1.2f) * (1.0f - t)) : 0.0f;
      float p2 = (diff2 < 1.2f) ? max(0.0f, (1.0f - diff2 / 1.2f) * (1.0f - t)) : 0.0f;
      outIntensity = max(p1, p2);
      if (t < 0.5f) {
        outR = (uint8_t)min(255, (int)(eff.colorR + 70));
        outG = (uint8_t)min(255, (int)(eff.colorG + 70));
        outB = (uint8_t)min(255, (int)(eff.colorB + 70));
      }
      break;
    }

    case 9: { // Quantum Prism (Destello Cromatico Arcoiris)
      float waveR = t * 9.0f;
      float diff = fabsf(dist - waveR);
      if (diff < 1.3f) {
        outIntensity = max(0.0f, (1.0f - diff / 1.3f) * (1.0f - t * 0.85f));
        float ptAngle = atan2f(dr, dc) * 180.0f / 3.14159265f;
        if (ptAngle < 0.0f) ptAngle += 360.0f;
        uint16_t hueDeg = (uint16_t)(fmodf(t * 360.0f + ptAngle, 360.0f));
        uint32_t cCol = strip.ColorHSV((uint32_t)hueDeg * 182, 255, 255);
        outR = (uint8_t)(cCol >> 16);
        outG = (uint8_t)(cCol >> 8);
        outB = (uint8_t)cCol;
      }
      break;
    }

    case 10: { // Supernova Shockwave (Doble Anillo Cuantico + Nucleo)
      float wave1 = t * 7.5f;
      float wave2 = t * 11.0f;
      float d1 = fabsf(dist - wave1);
      float d2 = fabsf(dist - wave2);
      float pCore = (dist < 1.5f && t < 0.35f) ? (1.0f - t / 0.35f) : 0.0f;
      float p1 = (d1 < 1.2f) ? (1.0f - d1 / 1.2f) * (1.0f - t) : 0.0f;
      float p2 = (d2 < 1.2f) ? (1.0f - d2 / 1.2f) * (1.0f - t) : 0.0f;
      outIntensity = max(pCore, max(p1, p2));
      if (t < 0.25f) {
        outR = 255; outG = 255; outB = 255;
      } else {
        outR = 250; outG = 204; outB = 21; // #facc15
      }
      break;
    }

    case 11: { // Spiral Dimension (Rafaga Espiral Psicodelica)
      float angle = atan2f(dr, dc);
      if (angle < 0.0f) angle += 6.2831853f;
      float rot1 = fmodf(angle + t * 10.0f, 6.2831853f);
      float rot2 = fmodf(angle + 3.14159265f + t * 10.0f, 6.2831853f);
      float arm1 = (rot1 / 6.2831853f) * 8.0f;
      float arm2 = (rot2 / 6.2831853f) * 8.0f;
      float diff1 = fabsf(dist - arm1);
      float diff2 = fabsf(dist - arm2);
      float p1 = (diff1 < 1.3f) ? (1.0f - diff1 / 1.3f) * (1.0f - t) : 0.0f;
      float p2 = (diff2 < 1.3f) ? (1.0f - diff2 / 1.3f) * (1.0f - t) : 0.0f;
      outIntensity = max(p1, p2);
      break;
    }

    case 12: { // Tesla Arc (Arcos Voltaicos Neon)
      float seedVal = eff.seed * 50.0f;
      bool inArc = (sinf(dist * 3.5f + t * 25.0f + seedVal) > 0.4f) && (dist < 4.2f);
      if (inArc) {
        outIntensity = max(0.0f, 1.0f - t * 0.9f);
        if (fmodf(t * 20.0f, 2.0f) > 1.0f) {
          outR = 255; outG = 255; outB = 255;
        } else {
          outR = 56; outG = 189; outB = 248; // #38bdf8
        }
      }
      break;
    }

    default:
      break;
  }
}

void triggerPressEffect(uint8_t r, uint8_t c, uint16_t ledIdx, int forcedEffect) {
  lastActivityTime = millis();

  uint8_t effId = (forcedEffect >= 0) ? (uint8_t)forcedEffect : pressEffect;
  if (effId > 12) effId = 1;

  uint8_t colorR = padLeds[ledIdx].r;
  uint8_t colorG = padLeds[ledIdx].g;
  uint8_t colorB = padLeds[ledIdx].b;
  if (colorR == 0 && colorG == 0 && colorB == 0) {
    colorR = 0;
    colorG = 240;
    colorB = 255;
  }

  uint16_t dur = 900;
  if (effId == 0) dur = 380;
  else if (effId == 4 || effId == 12) dur = 650;
  else if (effId == 10 || effId == 11) dur = 1200;

  int slot = -1;
  unsigned long oldestTime = 0xFFFFFFFF;
  int oldestSlot = 0;

  for (int i = 0; i < MAX_ACTIVE_PRESS_EFFECTS; i++) {
    if (!activePressEffects[i].active) {
      slot = i;
      break;
    }
    if (activePressEffects[i].startTime < oldestTime) {
      oldestTime = activePressEffects[i].startTime;
      oldestSlot = i;
    }
  }

  if (slot == -1) slot = oldestSlot;

  activePressEffects[slot].active = true;
  activePressEffects[slot].id = effId;
  activePressEffects[slot].r = r;
  activePressEffects[slot].c = c;
  activePressEffects[slot].colorR = colorR;
  activePressEffects[slot].colorG = colorG;
  activePressEffects[slot].colorB = colorB;
  activePressEffects[slot].startTime = millis();
  activePressEffects[slot].duration = dur;
  activePressEffects[slot].seed = (float)random(0, 1000) / 1000.0f;
}

void scanMatrixInstant() {
  unsigned long now = millis();

  for (uint8_t r = 0; r < ROWS; r++) {
    pinMode(rowPins[r], OUTPUT);
    digitalWrite(rowPins[r], LOW);
    for (uint8_t c = 0; c < COLS; c++)
      pinMode(colPins[c], INPUT_PULLUP);
    delayMicroseconds(8);

    for (uint8_t c = 0; c < COLS; c++) {
      bool isPressed = (digitalRead(colPins[c]) == LOW);

      if (!isPressed) {
        digitalWrite(rowPins[r], HIGH);
        pinMode(colPins[c], INPUT_PULLDOWN);
        delayMicroseconds(8);
        if (digitalRead(colPins[c]) == HIGH) {
          isPressed = true;
        }
        digitalWrite(rowPins[r], LOW);
        pinMode(colPins[c], INPUT_PULLUP);
      }

      if (isPressed != keyState[r][c]) {
        if ((now - lastDebounceTime[r][c]) > debounceDelay) {
          keyState[r][c] = isPressed;
          lastDebounceTime[r][c] = now;

          bool isFnKey = fnKeyEnabled && (r == ROWS - 1 && c == 0);
          if (isFnKey) {
            fnModeActive = isPressed;
            lastActivityTime = now;
            continue;
          }

          if (fnModeActive) {
            if (r == 0 && isPressed) {
              uint8_t visualC = (COLS - 1) - c;
              if (visualC < totalBanksCount) {
                currentBankIndex = visualC;
                Serial.print("BANK_SET ");
                Serial.println(visualC);
                lastActivityTime = now;
              }
            }
            continue;
          }

          uint16_t ledIdx = getLedIndex(r, c);

          if (isPressed) {
            triggerPressEffect(r, c, ledIdx);
            Serial.print("P ");
            Serial.print(r);
            Serial.print(" ");
            Serial.println(c);
          } else {
            Serial.print("R ");
            Serial.print(r);
            Serial.print(" ");
            Serial.println(c);
          }
        }
      }
    }

    pinMode(rowPins[r], INPUT);
  }

  static unsigned long dfuComboStartTime = 0;
  if (keyState[0][0] && keyState[0][7]) {
    if (dfuComboStartTime == 0) {
      dfuComboStartTime = now;
    } else if (now - dfuComboStartTime >= 3000) {
      enterDFUMode();
    }
  } else {
    dfuComboStartTime = 0;
  }
}

void renderAllEffects() {
  unsigned long now = millis();
  static unsigned long lastRenderTime = 0;
  if (now - lastRenderTime < 16)
    return;
  lastRenderTime = now;

  RGBColor animFrame[NUM_LEDS];
  RGBColor finalFrame[NUM_LEDS];

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    animFrame[i] = {0, 0, 0};
  }
  if (idleEffect > 0) {
    for (uint8_t r = 0; r < ROWS; r++) {
      for (uint8_t c = 0; c < COLS; c++) {
        uint16_t idx = getLedIndex(r, c);
        uint8_t visualC = (COLS - 1) - c;
        animFrame[idx] = computeIdleLedColor(r, visualC, idleEffect, now, ROWS, COLS);
      }
    }
  }

  bool isScreensaverActive =
      (blendMode == 2) && ((now - lastActivityTime) > SLEEP_TIMEOUT_MS);

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    bool isSoundPad =
        padLeds[i].hasSound &&
        (padLeds[i].r > 0 || padLeds[i].g > 0 || padLeds[i].b > 0);
    RGBColor anim = animFrame[i];

    if (idleEffect == 0) {
      finalFrame[i] = {padLeds[i].r, padLeds[i].g, padLeds[i].b};
      continue;
    }

    if (isScreensaverActive) {
      finalFrame[i] = anim;
    } else if (blendMode == 0 || blendMode == 2) {
      if (isSoundPad) {
        // Fusion Neon: la animacion modula el brillo del pad como una ola de luz.
        // La luminancia de la animacion escala el pad entre 0.5x (oscuro) y 1.3x (brillante),
        // mas un tinte aditivo sutil para que el color del fondo se mezcle levemente.
        float animLuma = ((float)anim.r * 0.299f + (float)anim.g * 0.587f + (float)anim.b * 0.114f) / 255.0f;
        float scale = 0.50f + animLuma * 0.80f; // rango 0.50x a 1.30x
        uint8_t cr = (uint8_t)min(255, (int)((float)padLeds[i].r * scale) + (int)(anim.r * 0.15f));
        uint8_t cg = (uint8_t)min(255, (int)((float)padLeds[i].g * scale) + (int)(anim.g * 0.15f));
        uint8_t cb = (uint8_t)min(255, (int)((float)padLeds[i].b * scale) + (int)(anim.b * 0.15f));
        finalFrame[i] = {cr, cg, cb};
      } else {
        finalFrame[i] = anim;
      }
    } else { // blendMode == 1 (Botones Puros)
      if (isSoundPad) {
        finalFrame[i] = {padLeds[i].r, padLeds[i].g, padLeds[i].b};
      } else {
        finalFrame[i] = anim;
      }
    }
  }

  // Render active press effects additively onto finalFrame!
  for (int e = 0; e < MAX_ACTIVE_PRESS_EFFECTS; e++) {
    if (!activePressEffects[e].active) continue;
    if (now - activePressEffects[e].startTime >= activePressEffects[e].duration) {
      activePressEffects[e].active = false;
      continue;
    }

    for (uint8_t r = 0; r < ROWS; r++) {
      for (uint8_t c = 0; c < COLS; c++) {
        float intensity = 0.0f;
        uint8_t pR = 0, pG = 0, pB = 0;
        computePressEffect(activePressEffects[e], r, c, now, intensity, pR, pG, pB);
        if (intensity > 0.005f) {
          uint16_t idx = getLedIndex(r, c);
          float iClamped = constrain(intensity, 0.0f, 1.0f);
          uint16_t addR = (uint16_t)((float)pR * iClamped);
          uint16_t addG = (uint16_t)((float)pG * iClamped);
          uint16_t addB = (uint16_t)((float)pB * iClamped);
          finalFrame[idx].r = (uint8_t)min(255, (int)finalFrame[idx].r + addR);
          finalFrame[idx].g = (uint8_t)min(255, (int)finalFrame[idx].g + addG);
          finalFrame[idx].b = (uint8_t)min(255, (int)finalFrame[idx].b + addB);
        }
      }
    }
  }

  if (now - lastFlashTime >= 100) {
    lastFlashTime = now;
    flashToggle = !flashToggle;
  }
  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    if (padLeds[i].isPlaying) {
      if (flashToggle) {
        finalFrame[i] = {255, 255, 255};
      }
    }
  }

  if (fnModeActive) {
    for (uint16_t i = 0; i < NUM_LEDS; i++) {
      finalFrame[i] = {
        (uint8_t)(finalFrame[i].r / 8),
        (uint8_t)(finalFrame[i].g / 8),
        (uint8_t)(finalFrame[i].b / 8)
      };
    }
    uint16_t fnIdx = getLedIndex(ROWS - 1, 0);
    finalFrame[fnIdx] = {168, 85, 247}; // Purpura neon brillante para FN

    for (uint8_t vc = 0; vc < COLS; vc++) {
      uint8_t physC = (COLS - 1) - vc;
      uint16_t ledIdx = getLedIndex(0, physC);
      if (vc < totalBanksCount) {
        if (vc == currentBankIndex) {
          finalFrame[ledIdx] = {0, 255, 120}; // Capa activa en verde neon
        } else {
          finalFrame[ledIdx] = {255, 255, 255}; // Capas disponibles en blanco puro
        }
      } else {
        finalFrame[ledIdx] = {0, 0, 0};
      }
    }
  }

  if (!fnModeActive) {
    for (uint8_t r = 0; r < ROWS; r++) {
      for (uint8_t c = 0; c < COLS; c++) {
        if (keyState[r][c]) {
          uint16_t idx = getLedIndex(r, c);
          finalFrame[idx] = {255, 255, 255};
        }
      }
    }
  }

  for (uint16_t i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(
        i, strip.Color(finalFrame[i].r, finalFrame[i].g, finalFrame[i].b));
  }
  strip.show();
}

void readFastSerial() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBufIdx > 0) {
        serialBuf[serialBufIdx] = '\0';
        handleCommand(serialBuf);
        serialBufIdx = 0;
      }
    } else if (serialBufIdx < 90) {
      serialBuf[serialBufIdx++] = c;
    } else {
      serialBufIdx = 0;
    }
  }
}

void handleCommand(char *buf) {
  if (strcmp(buf, "PING") == 0) {
    Serial.println("PONG");
    lastActivityTime = millis();
    return;
  }

  if (strcmp(buf, "DFU") == 0 || strcmp(buf, "BOOTLOADER") == 0) {
    enterDFUMode();
    return;
  }

  char type = buf[0];

  if (type == 'C') {
    int idx, r, g, b, hs = 1;
    int parsed = sscanf(buf, "C %d %d %d %d %d", &idx, &r, &g, &b, &hs);
    if (parsed >= 4) {
      if (idx >= 0 && idx < NUM_LEDS) {
        padLeds[idx].r = (uint8_t)r;
        padLeds[idx].g = (uint8_t)g;
        padLeds[idx].b = (uint8_t)b;
        padLeds[idx].hasSound =
            (parsed >= 5) ? (hs != 0) : (r > 0 || g > 0 || b > 0);
        padLeds[idx].isPlaying = false;
        lastActivityTime = millis();
      }
    }
  } else if (type == 'A') {
    int idx, mode;
    if (sscanf(buf, "A %d %d", &idx, &mode) == 2) {
      if (idx >= 0 && idx < NUM_LEDS) {
        if (mode == 1) {
          padLeds[idx].isPlaying = true;
          padLeds[idx].playStartTime = millis();
        } else {
          padLeds[idx].isPlaying = false;
        }
        lastActivityTime = millis();
      }
    }
  } else if (type == 'M') {
    int bm;
    if (sscanf(buf, "M %d", &bm) == 1) {
      blendMode = constrain(bm, 0, 2);
      lastActivityTime = millis();
    }
  } else if (type == 'E') {
    int pe, ie, bm = -1;
    int count = sscanf(buf, "E %d %d %d", &pe, &ie, &bm);
    if (count >= 2) {
      pressEffect = constrain(pe, 0, 12);
      idleEffect = constrain(ie, 0, 16);
      if (count >= 3 && bm >= 0) {
        blendMode = constrain(bm, 0, 2);
      }
      lastActivityTime = millis();
    }
  } else if (type == 'L') {
    int tb = 1, cb = 0, fnEn = 1;
    int count = sscanf(buf, "L %d %d %d", &tb, &cb, &fnEn);
    if (count >= 2) {
      totalBanksCount = constrain(tb, 1, COLS);
      currentBankIndex = constrain(cb, 0, totalBanksCount - 1);
      if (count >= 3) {
        fnKeyEnabled = (fnEn != 0);
      }
      lastActivityTime = millis();
    }
  } else if (type == 'W') {
    lastActivityTime = millis();
  } else if (type == 'T') {
    int tr, tc, te = -1;
    int count = sscanf(buf, "T %d %d %d", &tr, &tc, &te);
    if (count >= 2 && tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS) {
      uint16_t ledIdx = getLedIndex(tr, tc);
      triggerPressEffect(tr, tc, ledIdx, (count >= 3 && te >= 0) ? te : -1);
      lastActivityTime = millis();
    }
  } else if (type == 'V') {
    int v[8];
    if (sscanf(buf, "V %d %d %d %d %d %d %d %d", &v[0], &v[1], &v[2], &v[3],
               &v[4], &v[5], &v[6], &v[7]) == 8) {
      for (uint8_t c = 0; c < 8; c++)
        vuLevels[c] = constrain(v[c], 0, 8);
    }
  } else if (type == 'K') {
    int idx;
    if (sscanf(buf, "K %d", &idx) == 1) {
      if (idx >= 0 && idx < NUM_LEDS) {
        padLeds[idx].r = 0;
        padLeds[idx].g = 0;
        padLeds[idx].b = 0;
        padLeds[idx].hasSound = false;
        padLeds[idx].isPlaying = false;
      }
    }
  } else if (type == 'X') {
    for (uint16_t i = 0; i < NUM_LEDS; i++) {
      padLeds[i].r = 0;
      padLeds[i].g = 0;
      padLeds[i].b = 0;
      padLeds[i].hasSound = false;
      padLeds[i].isPlaying = false;
    }
  }
}

uint8_t sin8(uint8_t theta) {
  return (uint8_t)((sinf((float)theta * 0.02454369f) + 1.0f) * 127.5f);
}
