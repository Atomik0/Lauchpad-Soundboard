/*
 * ws2812_stm32cube.h
 * Controlador WS2812B mediante TIM PWM + DMA para STM32 (STM32CubeHAL)
 */

#ifndef WS2812_STM32CUBE_H_
#define WS2812_STM32CUBE_H_

#include "main.h"

#define MAX_LEDS 64
#define USE_BRIGHTNESS 1

typedef struct {
  uint8_t R;
  uint8_t G;
  uint8_t B;
} LED_Color_t;

void WS2812_Init(TIM_HandleTypeDef *htim, uint32_t Channel);
void WS2812_SetLED(uint16_t index, uint8_t Red, uint8_t Green, uint8_t Blue);
void WS2812_SetColor(uint16_t index, LED_Color_t color);
void WS2812_SetBrightness(uint8_t brightness);
void WS2812_Clear(void);
void WS2812_Send(void);

void WS2812_ColorWipe(uint8_t r, uint8_t g, uint8_t b, uint32_t delay_ms);
void WS2812_Rainbow(uint32_t delay_ms);

#endif /* WS2812_STM32CUBE_H_ */
