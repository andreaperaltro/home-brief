// Home Brief hardware smoke test. One refresh per power-on, no network or credentials.
#include "EPD_13in3e.h"
#include "GUI_Paint.h"
#include "fonts.h"
#include <esp_heap_caps.h>

static const char *testStage="BOOT";
static void report(const char *message) { Serial.println(message); Serial0.println(message); }
static void title(const char *value, int x, int y, int scale=3) {
  const int stride=(Font24.Width+7)/8;
  for (const char *c=value;*c;c++,x+=Font24.Width*scale) {
    const uint8_t *glyph=Font24.table+(*c-' ')*Font24.Height*stride;
    for(int row=0;row<Font24.Height;row++)for(int col=0;col<Font24.Width;col++)
      if(glyph[row*stride+col/8]&(0x80>>(col%8)))
        Paint_DrawRectangle(x+col*scale,y+row*scale,x+(col+1)*scale-1,y+(row+1)*scale-1,EPD_13IN3E_BLACK,DOT_PIXEL_1X1,DRAW_FILL_FULL);
  }
}

void setup() {
  Serial0.begin(115200, SERIAL_8N1, 44, 43);
  Serial.begin(115200);
  delay(2500);
  Serial0.printf("HOME_BRIEF_TEST boot; PSRAM=%u bytes\n", ESP.getPsramSize());
  Serial.printf("HOME_BRIEF_TEST boot; PSRAM=%u bytes\n", ESP.getPsramSize());
  const size_t bytes=EPD_13IN3E_WIDTH*EPD_13IN3E_HEIGHT/2;
  auto *image=(uint8_t*)heap_caps_malloc(bytes,MALLOC_CAP_SPIRAM|MALLOC_CAP_8BIT);
  if(!image){testStage="PSRAM_FAILED";report("ERROR: PSRAM allocation failed. No display commands sent.");return;}
  Paint_NewImage(image,EPD_13IN3E_WIDTH,EPD_13IN3E_HEIGHT,0,EPD_13IN3E_WHITE);
  Paint_SetScale(6);
  Paint_SelectImage(image);
  Paint_Clear(EPD_13IN3E_WHITE);
  Paint_DrawRectangle(20,20,1179,1579,EPD_13IN3E_BLACK,DOT_PIXEL_3X3,DRAW_FILL_EMPTY);
  title("HOME BRIEF",70,100);
  title("DISPLAY TEST",70,210,2);
  title("TOP / ALTO",70,350,2);
  const uint16_t colors[]={EPD_13IN3E_BLACK,EPD_13IN3E_WHITE,EPD_13IN3E_RED,EPD_13IN3E_YELLOW,EPD_13IN3E_BLUE,EPD_13IN3E_GREEN};
  const char *names[]={"BLACK","WHITE","RED","YELLOW","BLUE","GREEN"};
  for(int i=0;i<6;i++){
    int x=70+(i%3)*360,y=530+(i/3)*330;
    Paint_DrawRectangle(x,y,x+310,y+230,colors[i],DOT_PIXEL_1X1,DRAW_FILL_FULL);
    Paint_DrawRectangle(x,y,x+310,y+230,EPD_13IN3E_BLACK,DOT_PIXEL_1X1,DRAW_FILL_EMPTY);
    Paint_DrawString_EN(x,y+250,names[i],&Font24,EPD_13IN3E_BLACK,EPD_13IN3E_WHITE);
  }
  title("1200 x 1600",70,1300,2);
  title("BOTTOM / BASSO",70,1450,2);
  testStage="INITIALIZING";report("FRAME_READY; initializing official Waveshare driver");
  DEV_Module_Init();
  EPD_13IN3E_Init();
  testStage="REFRESHING";report("REFRESH_START; do not disconnect USB");
  EPD_13IN3E_Display(image);
  delay(2000);
  EPD_13IN3E_Sleep();
  DEV_Module_Exit();
  free(image);
  testStage="DONE";report("REFRESH_DONE; panel sleeping; image retained");
}
void loop(){Serial0.printf("HEARTBEAT stage=%s PSRAM=%u\n",testStage,ESP.getPsramSize());delay(5000);}
