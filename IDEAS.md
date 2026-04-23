# SailMate — Zásobník nápadů

Seznam vychytávek a rozšíření, která ještě nejsou hotová. Používej jako zdroj inspirace pro další iterace.

---

## 🧭 Tracking — další fáze

Už hotovo (MVP): live watchPosition, Wake Lock, interval logování, GPX export, "Načíst z tracku" v deníku.

Zbývá:

- **🗺️ Mapa s trasou** — Leaflet + OpenSeaMap dlaždice, breadcrumb čára, barevně odlišená podle rychlosti (modrá → červená). Waypointy z regat jako ikony. Možnost "odehrát" plavbu jako timelapse.
- **⚓ Kotevní alarm** — označ pozici + rádius (např. 30 m), při překročení vibrace + zvuk + notifikace. Ukazuje aktuální drift v metrech. Životní záchrana při nočním kotvení.
- **📊 Grafy na detailu tracku** — profil rychlosti v čase, růžice kurzů (kolik času na jakém kurzu), nejdelší úsek bez zastávky.
- **🏁 Závodní režim** — odpočet do startu (synchronizovaný), track přes startovní linii → auto-start, rozpozná obeplutí bóje (blízkost waypointu), po dojetí ukáže čas a průměry po úsecích.
- **📤 Další exporty** — KML pro Google Maps, sdílení obrázku s mapou tratě (Instagram).
- **🧭 Navigační pomůcky** — VMG k vybranému waypointu, ETA podle aktuální rychlosti, cross-track error (jak moc jsi vedle plánované trati).
- **🔄 Smart logging** — nový bod jen když ujeto víc než X NM, nebo změna kurzu > 30°, nebo změna rychlosti > 2 kn. Šetří baterii i místo.

---

## 🌤️ Počasí v aplikaci

- **Open-Meteo API** (zdarma, bez klíče) — vítr, vlny, déšť, tlak, viditelnost
- **Marine forecast** endpoint pro vlny a swell
- Integrace s aktivní výpravou → předpověď pro homePort nebo aktuální GPS
- Zobrazení v Deníku jako "předpověď pro daný den" — auto-fill
- Grafy větru na 5 dní dopředu

## 📋 Check-listy

- **Pre-sailing check** (motor, paliva, voda, plachty, záchranné vesty, rakety...)
- **MOB drill** (Man Overboard procedura)
- **Před bouřkou** (zavřít průlezy, spustit plachty, nasadit vesty...)
- **Návrat do mariny** (fenders, lana, motor, vypnout elektroniku...)
- Předpřipravené šablony + možnost custom list
- Ukládat do supplies/Nová sekce "Checklists"

## 🌊 Přílivy / odlivy / proudy

- Jadran má malé přílivy, ale v úžinách jsou proudy důležité
- API: **WorldTides** nebo **NOAA** (Jadran: **IHB Split**)
- Zobrazit v kontextu aktuální pozice
- Varování před kritickými okny (např. průjezd úžinou jen za určitého proudu)

## ⚓ Databáze marín

- Seznam chorvatských marín s:
  - **VHF kanály** (běžně 17 pro ACI, 71 pro soukromé)
  - Kontakty (telefon, e-mail)
  - Počet míst, hloubka, palivo, voda, Wi-Fi, obchod
  - Ceny za noc (indikativní)
  - Otevírací hodiny
- Filtrování podle polohy / služeb
- Offline cache (nebude potřebovat signál)

## 📄 Export deníku do PDF

- Profesionální PDF ve stylu klasického papírového deníku
- Hlavička s výpravou, lodí, posádkou
- Jeden den = jedna stránka (tabulka + souhrny + poznámky)
- Logo SailMate v patce
- K podpisu pro námořní úřady / rejstřík plaveb

## 🎯 Další feature nápady

- **Posádka — role** — každý člen má roli (kapitán, kormidelník, navigátor, kuchař) → plán hlídek se generuje automaticky
- **Rozpočet vs. reálné náklady** — vizualizace kolik z rozpočtu už je utraceno
- **Foto z plavby** — galerie napojená na konkrétní den / waypoint
- **Sdílení tracku s rodinou** — unikátní URL "kde právě jsem" (živá mapa)
- **Statistiky celoživotní** — kolik NM jsem upltul, kolik hodin motorem, v kolika zemích, s kolika posádkami
- **Badges / achievements** — první 100 NM den, noční plavba, bouřka 6 bft, 10 marín
- **Dark mode pro noční plavby** — červené tlumené světlo (neničí noční vidění)
- **Hlasové poznámky** do deníku — přepis řeči → text (Web Speech API)
- **QR kód pro připojení posádky** — kapitán ukáže QR, ostatní načtou a jsou v výpravě

## 🧹 Údržba / technický dluh

- Rozdělit velký bundle (code-split pdf.js — lazy load RegataPage)
- i18n — přidat angličtinu (Chorvati si to možná taky stáhnou)
- Optimalizace iOS Safari (trackovací režim zatím jen ve foreground)
- E2E testy na kritické toky (vytvoření výpravy, nahrání regaty, tracking)
- Service Worker — offline režim pro celý deník

---

**Poznámka pro Claude**: Při dalších sessionech nejprve přečti tento soubor, aby kontext nápadů nezmizel.
