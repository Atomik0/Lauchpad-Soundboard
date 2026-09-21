/*
 * ws2812_stm32cube.c
 * Controlador WS2812B mediante TIM PWM + DMA para STM32 (STM32CubeHAL)
 */

#include "ws2812_stm32cube.h"

#define BIT_0_CCR 30
#define BIT_1_CCR 65

static TIM_HandleTypeDef *ws2812_htim;
static uint32_t ws2812_channel;

static LED_Color_t LED_Data[MAX_LEDS];
static LED_Color_t LED_Mod[MAX_LEDS];

#define PWM_BUF_SIZE ((MAX_LEDS * 24) + 60)
static uint32_t pwmData[PWM_BUF_SIZE];

static uint8_t global_brightness = 40;
static uint8_t is_sending = 0;

void WS2812_Init(TIM_HandleTypeDef *htim, uint32_t Channel) {
  ws2812_htim = htim;
  ws2812_channel = Channel;
  WS2812_Clear();
}

void WS2812_SetLED(uint16_t index, uint8_t Red, uint8_t Green, uint8_t Blue) {
  if (index >= MAX_LEDS)
    return;
  LED_Data[index].R = Red;
  LED_Data[index].G = Green;
  LED_Data[index].B = Blue;
}

void WS2812_SetColor(uint16_t index, LED_Color_t color) {
  WS2812_SetLED(index, color.R, color.G, color.B);
}

void WS2812_SetBrightness(uint8_t brightness) {
  if (brightness > 100)
    brightness = 100;
  global_brightness = brightness;
}

void WS2812_Clear(void) {
  for (int i = 0; i < MAX_LEDS; i++) {
    LED_Data[i].R = 0;
    LED_Data[i].G = 0;
    LED_Data[i].B = 0;
  }
}

void WS2812_Send(void) {
  uint32_t indx = 0;
  uint32_t color;

  for (int i = 0; i < MAX_LEDS; i++) {
    LED_Mod[i].R = (LED_Data[i].R * global_brightness) / 100;
    LED_Mod[i].G = (LED_Data[i].G * global_brightness) / 100;
    LED_Mod[i].B = (LED_Data[i].B * global_brightness) / 100;
  }

  for (int i = 0; i < MAX_LEDS; i++) {
    color = ((uint32_t)LED_Mod[i].G << 16) | ((uint32_t)LED_Mod[i].R << 8) |
            (LED_Mod[i].B);

    for (int i = 23; i >= 0; i--) {
      if (color & (1 << i)) {
        pwmData[indx] = BIT_1_CCR;
      } else {
        pwmData[indx] = BIT_0_CCR;
      }
      indx++;
    }
  }

  for (int i = 0; i < 60; i++) {
    pwmData[indx] = 0;
    indx++;
  }

  HAL_TIM_PWM_Start_DMA(ws2812_htim, ws2812_channel, pwmData, indx);
}

void HAL_TIM_PWM_PulseFinishedCallback(TIM_HandleTypeDef *htim) {
  if (htim == ws2812_htim) {
    HAL_TIM_PWM_Stop_DMA(ws2812_htim, ws2812_channel);
  }
}

void WS2812_ColorWipe(uint8_t r, uint8_t g, uint8_t b, uint32_t delay_ms) {
  for (int i = 0; i < MAX_LEDS; i++) {
    WS2812_SetLED(i, r, g, b);
    WS2812_Send();
    HAL_Delay(delay_ms);
  }
}
