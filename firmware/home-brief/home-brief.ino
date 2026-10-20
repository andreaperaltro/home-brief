#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <esp_heap_caps.h>
#include <esp_sleep.h>
#include <mbedtls/sha256.h>
#include "EPD_13in3e.h"
#include "tls-root.h"
#if __has_include("device-secrets.h")
#include "device-secrets.h"
#endif
#ifndef DEVICE_SITE
#define DEVICE_SITE ""
#define DEVICE_KEY ""
#endif

constexpr size_t FRAME_BYTES=1200*1600/2;
Preferences settings;
WebServer portal(80);
DNSServer dns;
RTC_DATA_ATTR char previousHash[65]="";
String site,key,ssid,password;
bool setupMode=false,restartPending=false;
uint32_t portalStarted=0;
static void log(const char *text){Serial0.println(text);}
static void sleepFor(uint32_t seconds){WiFi.disconnect(true);WiFi.mode(WIFI_OFF);Serial0.printf("SLEEP %u seconds\n",seconds);Serial0.flush();esp_sleep_enable_timer_wakeup(uint64_t(seconds)*1000000ULL);esp_deep_sleep_start();}
static void configure(){
 setupMode=true;portalStarted=millis();WiFi.mode(WIFI_AP);
 char apPassword[13];snprintf(apPassword,sizeof(apPassword),"%08lx%04lx",(unsigned long)esp_random(),(unsigned long)(esp_random()&0xffff));
 WiFi.softAP("HomeBrief-Setup",apPassword);dns.start(53,"*",WiFi.softAPIP());
 Serial0.printf("SETUP network=HomeBrief-Setup password=%s address=http://192.168.4.1\n",apPassword);
 portal.on("/",HTTP_GET,[]{String html="<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><title>Home Brief</title><h1>Collega il quadro</h1><p>Inserisci la rete Wi-Fi a 2,4 GHz. I dati restano sulla scheda.</p><form method=post action=/save><p><label>Nome rete <input name=ssid maxlength=32 required></label></p><p><label>Password Wi-Fi <input name=password type=password maxlength=63></label></p>";
 if(site.isEmpty()||key.isEmpty())html+="<p><label>Indirizzo del sito <input name=site type=url placeholder='https://tuo-sito.vercel.app' required></label></p><p><label>Chiave di sola lettura del display <input name=key type=password required></label></p>";
 html+="<button>Salva e collega</button></form>";portal.send(200,"text/html; charset=utf-8",html);});
 portal.on("/save",HTTP_POST,[]{
  String newSsid=portal.arg("ssid"),newPassword=portal.arg("password"),newSite=portal.hasArg("site")?portal.arg("site"):site,newKey=portal.hasArg("key")?portal.arg("key"):key;
  while(newSite.endsWith("/"))newSite.remove(newSite.length()-1);
  if(newSsid.isEmpty()||newSsid.length()>32||newPassword.length()>63||!newSite.startsWith("https://")||newSite.indexOf('/',8)>=0||newKey.isEmpty()||newKey.length()>256){portal.send(400,"text/plain; charset=utf-8","Controlla i dati inseriti.");return;}
  settings.putString("ssid",newSsid);settings.putString("password",newPassword);settings.putString("site",newSite);settings.putString("key",newKey);
  previousHash[0]=0;portal.send(200,"text/html; charset=utf-8","<meta name=viewport content='width=device-width,initial-scale=1'><h1>Dati salvati</h1><p>Il quadro si sta collegando. Puoi tornare alla tua rete Wi-Fi.</p>");restartPending=true;
 });
 portal.onNotFound([]{portal.sendHeader("Location","http://192.168.4.1/",true);portal.send(302,"text/plain","");});portal.begin();
}
static bool validFrame(const uint8_t *body){for(size_t i=0;i<FRAME_BYTES;i++){uint8_t a=body[i]>>4,b=body[i]&15;if(a==4||a>6||b==4||b>6)return false;}return true;}
static void updateFrame(){
 configTime(0,0,"time.google.com","pool.ntp.org");
 uint32_t start=millis();while(time(nullptr)<1700000000&&millis()-start<20000)delay(200);
 if(time(nullptr)<1700000000){log("ERROR clock unavailable; previous image retained");sleepFor(300);}
 NetworkClientSecure tls;tls.setCACert(TLS_ROOT);tls.setHandshakeTimeout(20);
 HTTPClient http;http.setTimeout(120000);http.setConnectTimeout(15000);http.useHTTP10(true);
 if(!http.begin(tls,site+"/api/device/frame")){log("ERROR HTTPS initialization");sleepFor(300);}
 const char *headers[]={"X-Frame-SHA256","X-Frame-Width","X-Frame-Height","X-Next-Check","X-Frame-Mode"};http.collectHeaders(headers,5);
 http.addHeader("Authorization","Bearer "+key);if(previousHash[0])http.addHeader("If-None-Match",String("\"")+previousHash+"\"");
 int status=http.GET();uint32_t wait=http.header("X-Next-Check").toInt();if(wait<60||wait>900)wait=300;
 Serial0.printf("FRAME HTTP=%d\n",status);
 if(status==304){http.end();sleepFor(wait);}
 if(status!=200||http.getSize()!=FRAME_BYTES||http.header("X-Frame-Width")!="1200"||http.header("X-Frame-Height")!="1600"){log("ERROR frame unavailable or wrong dimensions; previous image retained");http.end();sleepFor(300);}
 String expected=http.header("X-Frame-SHA256");if(expected.length()!=64){http.end();sleepFor(300);}
 auto *body=(uint8_t*)heap_caps_malloc(FRAME_BYTES,MALLOC_CAP_SPIRAM|MALLOC_CAP_8BIT);if(!body){http.end();sleepFor(300);}
 auto *stream=http.getStreamPtr();size_t received=0;uint32_t last=millis();
 while(received<FRAME_BYTES&&millis()-last<30000){int available=stream->available();if(available){int n=stream->read(body+received,min(size_t(available),FRAME_BYTES-received));if(n>0){received+=n;last=millis();}}else{if(!http.connected())break;delay(2);}}
 http.end();unsigned char digest[32];char actual[65];mbedtls_sha256(body,received,digest,0);for(int i=0;i<32;i++)sprintf(actual+i*2,"%02x",digest[i]);actual[64]=0;
 if(received!=FRAME_BYTES||expected!=actual||!validFrame(body)){log("ERROR incomplete or invalid frame; previous image retained");free(body);sleepFor(300);}
 WiFi.disconnect(true);WiFi.mode(WIFI_OFF);log("REFRESH_START");DEV_Module_Init();EPD_13IN3E_Init();EPD_13IN3E_Display(body);delay(2000);EPD_13IN3E_Sleep();DEV_Module_Exit();free(body);
 strlcpy(previousHash,actual,sizeof(previousHash));log("REFRESH_DONE");sleepFor(wait);
}
void setup(){
 Serial0.begin(115200,SERIAL_8N1,44,43);delay(1000);log("HOME_BRIEF_WIFI boot");
 pinMode(0,INPUT_PULLUP);settings.begin("home-brief",false);
 site=settings.getString("site",DEVICE_SITE);key=settings.getString("key",DEVICE_KEY);ssid=settings.getString("ssid","");password=settings.getString("password","");
 if(digitalRead(0)==LOW||ssid.isEmpty()||site.isEmpty()||key.isEmpty()){configure();return;}
 WiFi.mode(WIFI_STA);WiFi.begin(ssid.c_str(),password.c_str());uint32_t start=millis();while(WiFi.status()!=WL_CONNECTED&&millis()-start<30000)delay(250);
 if(WiFi.status()!=WL_CONNECTED){log("ERROR Wi-Fi not connected; opening setup");configure();return;}
 log("WIFI_CONNECTED");updateFrame();
}
void loop(){if(setupMode){dns.processNextRequest();portal.handleClient();if(restartPending){delay(1000);ESP.restart();}if(millis()-portalStarted>10*60*1000)sleepFor(300);}delay(2);}
