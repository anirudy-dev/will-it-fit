import ExtensionBanner from "./ExtensionBanner";
import * as THREE from "three";
import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

/* ─── Supabase client (disabled gracefully if env vars not set) ────────────── */
const _url = import.meta.env?.VITE_SUPABASE_URL;
const _key = import.meta.env?.VITE_SUPABASE_ANON_KEY;
const supabase = (_url && _key) ? createClient(_url, _key) : null;

const _r3dCache = new WeakMap(); // Three.js scene cache keyed by canvas element

/* ─── responsive hook ────────────────────────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return w;
}

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const range = (s, e) => Array.from({ length: e - s + 1 }, (_, i) => s + i);
const BOX_COLORS = [
  "#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6",
  "#EC4899","#06B6D4","#F97316","#84CC16","#6366F1",
];

/* ─── unit helpers ────────────────────────────────────────────────────────── */
const toIn   = cm  => Math.round(cm / 2.54 * 10) / 10;          // cm → inches (1dp)
const toCm   = (val, unit) => unit === "in"                      // user input → cm
  ? Math.round(+val * 2.54)
  : Math.round(+val);
const fmtDim = (cm, unit) => unit === "in" ? toIn(cm) : cm;     // cm value → display value
const unitLbl = unit => unit === "in" ? "in" : "cm";

/* ─── car database ────────────────────────────────────────────────────────── */
const CARS = {
  Acura:{ Integra:{y:[2023,2025],cargo:{l:90,w:120,h:36},type:"Sedan"},ILX:{y:[2013,2022],cargo:{l:88,w:120,h:36},type:"Sedan"},MDX:{y:[2007,2025],cargo:{l:108,w:118,h:83},type:"SUV"},RDX:{y:[2007,2025],cargo:{l:100,w:108,h:75},type:"SUV"},TLX:{y:[2021,2025],cargo:{l:95,w:130,h:38},type:"Sedan"},ZDX:{y:[2024,2025],cargo:{l:105,w:115,h:80},type:"SUV"} },
  Audi:{ A3:{y:[2006,2025],cargo:{l:85,w:110,h:38},type:"Sedan"},A4:{y:[2001,2025],cargo:{l:95,w:120,h:38},type:"Sedan"},A6:{y:[1998,2025],cargo:{l:100,w:125,h:40},type:"Sedan"},Q3:{y:[2015,2025],cargo:{l:85,w:100,h:68},type:"SUV"},Q4:{y:[2022,2025],cargo:{l:92,w:108,h:75},type:"SUV"},Q5:{y:[2009,2025],cargo:{l:95,w:108,h:75},type:"SUV"},Q7:{y:[2007,2025],cargo:{l:115,w:118,h:83},type:"SUV"},Q8:{y:[2019,2025],cargo:{l:110,w:118,h:83},type:"SUV"} },
  BMW:{ "3 Series":{y:[1994,2025],cargo:{l:95,w:122,h:38},type:"Sedan"},"5 Series":{y:[1996,2025],cargo:{l:102,w:128,h:40},type:"Sedan"},iX:{y:[2022,2025],cargo:{l:115,w:118,h:83},type:"SUV"},"iX3":{y:[2021,2025],cargo:{l:95,w:108,h:75},type:"SUV"},X1:{y:[2013,2025],cargo:{l:85,w:100,h:70},type:"SUV"},X3:{y:[2004,2025],cargo:{l:95,w:108,h:75},type:"SUV"},X5:{y:[2000,2025],cargo:{l:112,w:118,h:83},type:"SUV"},X7:{y:[2019,2025],cargo:{l:120,w:122,h:88},type:"SUV"} },
  Buick:{ Enclave:{y:[2008,2025],cargo:{l:115,w:120,h:85},type:"SUV"},Encore:{y:[2013,2024],cargo:{l:85,w:102,h:70},type:"SUV"},"Encore GX":{y:[2020,2025],cargo:{l:88,w:105,h:72},type:"SUV"},Envision:{y:[2016,2025],cargo:{l:95,w:108,h:75},type:"SUV"} },
  Cadillac:{ CT4:{y:[2020,2025],cargo:{l:88,w:120,h:36},type:"Sedan"},CT5:{y:[2020,2025],cargo:{l:98,w:128,h:38},type:"Sedan"},Escalade:{y:[1999,2025],cargo:{l:130,w:130,h:90},type:"SUV"},"Escalade IQ":{y:[2025,2025],cargo:{l:130,w:130,h:92},type:"SUV"},LYRIQ:{y:[2023,2025],cargo:{l:108,w:115,h:80},type:"SUV"},OPTIQ:{y:[2025,2025],cargo:{l:92,w:108,h:75},type:"SUV"},XT4:{y:[2019,2025],cargo:{l:92,w:105,h:72},type:"SUV"},XT5:{y:[2017,2025],cargo:{l:100,w:112,h:78},type:"SUV"},XT6:{y:[2020,2025],cargo:{l:108,w:115,h:83},type:"SUV"} },
  Chevrolet:{ Blazer:{y:[2019,2025],cargo:{l:98,w:108,h:75},type:"SUV"},"Blazer EV":{y:[2024,2025],cargo:{l:98,w:108,h:75},type:"SUV"},"Bolt EV":{y:[2017,2025],cargo:{l:88,w:110,h:75},type:"Hatchback"},"Bolt EUV":{y:[2022,2024],cargo:{l:90,w:110,h:75},type:"SUV"},Colorado:{y:[2004,2025],cargo:{l:155,w:132,h:50},type:"Truck"},Equinox:{y:[2005,2025],cargo:{l:97,w:108,h:78},type:"SUV"},"Equinox EV":{y:[2024,2025],cargo:{l:97,w:108,h:78},type:"SUV"},Malibu:{y:[2004,2024],cargo:{l:90,w:128,h:36},type:"Sedan"},"Silverado 1500":{y:[2000,2025],cargo:{l:198,w:163,h:56},type:"Truck"},"Silverado EV":{y:[2024,2025],cargo:{l:180,w:163,h:56},type:"Truck"},Suburban:{y:[1992,2025],cargo:{l:190,w:130,h:90},type:"SUV"},Tahoe:{y:[1992,2025],cargo:{l:130,w:130,h:85},type:"SUV"},Trailblazer:{y:[2021,2025],cargo:{l:90,w:105,h:72},type:"SUV"},Traverse:{y:[2009,2025],cargo:{l:120,w:120,h:88},type:"SUV"},Trax:{y:[2013,2025],cargo:{l:85,w:102,h:70},type:"SUV"} },
  Chrysler:{ "300":{y:[2005,2023],cargo:{l:100,w:130,h:38},type:"Sedan"},Pacifica:{y:[2017,2025],cargo:{l:150,w:140,h:100},type:"Minivan"},Voyager:{y:[2020,2023],cargo:{l:145,w:138,h:98},type:"Minivan"} },
  Dodge:{ Challenger:{y:[2008,2023],cargo:{l:88,w:115,h:36},type:"Sedan"},Charger:{y:[2006,2025],cargo:{l:93,w:125,h:38},type:"Sedan"},Durango:{y:[2000,2025],cargo:{l:120,w:118,h:85},type:"SUV"},"Grand Caravan":{y:[1984,2020],cargo:{l:148,w:138,h:98},type:"Minivan"},Hornet:{y:[2023,2025],cargo:{l:95,w:108,h:75},type:"SUV"} },
  Ford:{ Bronco:{y:[2021,2025],cargo:{l:95,w:108,h:75},type:"SUV"},"Bronco Sport":{y:[2021,2025],cargo:{l:98,w:108,h:72},type:"SUV"},Edge:{y:[2007,2024],cargo:{l:100,w:110,h:78},type:"SUV"},Escape:{y:[2001,2025],cargo:{l:95,w:105,h:78},type:"SUV"},Expedition:{y:[1997,2025],cargo:{l:130,w:125,h:90},type:"SUV"},Explorer:{y:[1991,2025],cargo:{l:115,w:115,h:85},type:"SUV"},"F-150":{y:[2000,2025],cargo:{l:168,w:145,h:56},type:"Truck"},"F-150 Lightning":{y:[2022,2025],cargo:{l:168,w:145,h:56},type:"Truck"},Fusion:{y:[2006,2020],cargo:{l:88,w:128,h:35},type:"Sedan"},Maverick:{y:[2022,2025],cargo:{l:137,w:107,h:50},type:"Truck"},Mustang:{y:[1994,2025],cargo:{l:85,w:108,h:34},type:"Sedan"},"Mustang Mach-E":{y:[2021,2025],cargo:{l:100,w:108,h:80},type:"SUV"},Ranger:{y:[2019,2025],cargo:{l:155,w:130,h:50},type:"Truck"} },
  Genesis:{ G70:{y:[2019,2025],cargo:{l:88,w:118,h:36},type:"Sedan"},G80:{y:[2017,2025],cargo:{l:100,w:128,h:38},type:"Sedan"},G90:{y:[2017,2025],cargo:{l:105,w:132,h:40},type:"Sedan"},GV70:{y:[2022,2025],cargo:{l:95,w:108,h:75},type:"SUV"},GV80:{y:[2021,2025],cargo:{l:108,w:118,h:80},type:"SUV"},GV90:{y:[2025,2025],cargo:{l:120,w:122,h:88},type:"SUV"} },
  GMC:{ Acadia:{y:[2007,2025],cargo:{l:115,w:120,h:85},type:"SUV"},Canyon:{y:[2004,2025],cargo:{l:155,w:132,h:50},type:"Truck"},"Hummer EV":{y:[2022,2025],cargo:{l:137,w:127,h:56},type:"Truck"},"Hummer EV SUV":{y:[2023,2025],cargo:{l:110,w:125,h:85},type:"SUV"},"Sierra 1500":{y:[2000,2025],cargo:{l:198,w:163,h:56},type:"Truck"},Terrain:{y:[2010,2025],cargo:{l:95,w:108,h:75},type:"SUV"},Yukon:{y:[1992,2025],cargo:{l:130,w:125,h:88},type:"SUV"},"Yukon XL":{y:[1992,2025],cargo:{l:190,w:130,h:90},type:"SUV"} },
  Honda:{ Accord:{y:[1998,2025],cargo:{l:103,w:133,h:36},type:"Sedan"},Civic:{y:[2001,2025],cargo:{l:84,w:120,h:36},type:"Sedan"},"CR-V":{y:[1997,2025],cargo:{l:100,w:107,h:83},type:"SUV"},Fit:{y:[2007,2020],cargo:{l:84,w:110,h:78},type:"Hatchback"},"HR-V":{y:[2016,2025],cargo:{l:88,w:103,h:72},type:"SUV"},Odyssey:{y:[1999,2025],cargo:{l:150,w:140,h:100},type:"Minivan"},Passport:{y:[2019,2025],cargo:{l:108,w:115,h:83},type:"SUV"},Pilot:{y:[2003,2025],cargo:{l:120,w:120,h:90},type:"SUV"},Prologue:{y:[2024,2025],cargo:{l:105,w:115,h:80},type:"SUV"},Ridgeline:{y:[2006,2025],cargo:{l:127,w:150,h:48},type:"Truck"} },
  Hyundai:{ Elantra:{y:[2001,2025],cargo:{l:88,w:128,h:36},type:"Sedan"},"Ioniq 5":{y:[2022,2025],cargo:{l:100,w:108,h:80},type:"SUV"},"Ioniq 6":{y:[2023,2025],cargo:{l:95,w:125,h:38},type:"Sedan"},"Ioniq 9":{y:[2025,2025],cargo:{l:120,w:125,h:90},type:"SUV"},Kona:{y:[2018,2025],cargo:{l:85,w:102,h:68},type:"SUV"},Palisade:{y:[2020,2025],cargo:{l:120,w:120,h:88},type:"SUV"},"Santa Cruz":{y:[2022,2025],cargo:{l:122,w:107,h:42},type:"Truck"},"Santa Fe":{y:[2001,2025],cargo:{l:108,w:115,h:83},type:"SUV"},Sonata:{y:[2005,2025],cargo:{l:88,w:130,h:36},type:"Sedan"},Tucson:{y:[2005,2025],cargo:{l:95,w:108,h:75},type:"SUV"},Venue:{y:[2020,2025],cargo:{l:82,w:100,h:68},type:"SUV"} },
  Infiniti:{ Q50:{y:[2014,2025],cargo:{l:98,w:125,h:38},type:"Sedan"},QX50:{y:[2014,2025],cargo:{l:100,w:108,h:75},type:"SUV"},QX55:{y:[2022,2025],cargo:{l:90,w:108,h:68},type:"SUV"},QX60:{y:[2014,2025],cargo:{l:112,w:118,h:83},type:"SUV"},QX80:{y:[2014,2025],cargo:{l:125,w:125,h:90},type:"SUV"} },
  Jeep:{ Cherokee:{y:[2014,2024],cargo:{l:95,w:108,h:75},type:"SUV"},Compass:{y:[2007,2025],cargo:{l:90,w:105,h:72},type:"SUV"},Gladiator:{y:[2020,2025],cargo:{l:152,w:127,h:50},type:"Truck"},"Grand Cherokee":{y:[1993,2025],cargo:{l:108,w:112,h:83},type:"SUV"},"Grand Cherokee L":{y:[2022,2025],cargo:{l:120,w:115,h:85},type:"SUV"},"Grand Wagoneer":{y:[2022,2025],cargo:{l:130,w:118,h:90},type:"SUV"},Renegade:{y:[2015,2025],cargo:{l:85,w:102,h:70},type:"SUV"},Wrangler:{y:[1997,2025],cargo:{l:85,w:100,h:68},type:"SUV"} },
  Kia:{ Carnival:{y:[2022,2025],cargo:{l:150,w:140,h:100},type:"Minivan"},EV6:{y:[2022,2025],cargo:{l:100,w:108,h:75},type:"SUV"},EV9:{y:[2024,2025],cargo:{l:120,w:120,h:88},type:"SUV"},Forte:{y:[2010,2025],cargo:{l:85,w:120,h:36},type:"Sedan"},K5:{y:[2021,2025],cargo:{l:88,w:128,h:36},type:"Sedan"},Seltos:{y:[2021,2025],cargo:{l:88,w:105,h:72},type:"SUV"},Sorento:{y:[2003,2025],cargo:{l:108,w:115,h:83},type:"SUV"},Soul:{y:[2010,2025],cargo:{l:90,w:110,h:80},type:"Hatchback"},Sportage:{y:[2005,2025],cargo:{l:95,w:108,h:75},type:"SUV"},Stinger:{y:[2018,2023],cargo:{l:100,w:118,h:78},type:"Sedan"},Telluride:{y:[2020,2025],cargo:{l:120,w:120,h:88},type:"SUV"} },
  Lexus:{ ES:{y:[2007,2025],cargo:{l:98,w:128,h:38},type:"Sedan"},GX:{y:[2003,2025],cargo:{l:108,w:115,h:83},type:"SUV"},IS:{y:[2001,2025],cargo:{l:88,w:118,h:36},type:"Sedan"},LX:{y:[1998,2025],cargo:{l:125,w:125,h:88},type:"SUV"},NX:{y:[2015,2025],cargo:{l:92,w:108,h:72},type:"SUV"},RX:{y:[1999,2025],cargo:{l:100,w:112,h:75},type:"SUV"},RZ:{y:[2023,2025],cargo:{l:95,w:108,h:72},type:"SUV"},TX:{y:[2024,2025],cargo:{l:115,w:118,h:83},type:"SUV"},UX:{y:[2019,2025],cargo:{l:85,w:105,h:68},type:"SUV"} },
  Lincoln:{ Aviator:{y:[2020,2025],cargo:{l:115,w:120,h:83},type:"SUV"},Corsair:{y:[2020,2025],cargo:{l:95,w:108,h:75},type:"SUV"},Nautilus:{y:[2019,2025],cargo:{l:100,w:110,h:78},type:"SUV"},Navigator:{y:[1998,2025],cargo:{l:130,w:125,h:90},type:"SUV"} },
  Mazda:{ "CX-30":{y:[2020,2025],cargo:{l:88,w:105,h:70},type:"SUV"},"CX-5":{y:[2013,2025],cargo:{l:95,w:108,h:75},type:"SUV"},"CX-50":{y:[2023,2025],cargo:{l:98,w:110,h:75},type:"SUV"},"CX-70":{y:[2025,2025],cargo:{l:112,w:118,h:83},type:"SUV"},"CX-90":{y:[2024,2025],cargo:{l:115,w:118,h:85},type:"SUV"},Mazda3:{y:[2004,2025],cargo:{l:88,w:120,h:38},type:"Sedan"},"Mazda3 Hatchback":{y:[2004,2025],cargo:{l:90,w:108,h:72},type:"Hatchback"},Mazda6:{y:[2003,2021],cargo:{l:90,w:122,h:36},type:"Sedan"} },
  "Mercedes-Benz":{ "C-Class":{y:[2001,2025],cargo:{l:98,w:120,h:38},type:"Sedan"},"E-Class":{y:[1994,2025],cargo:{l:105,w:128,h:40},type:"Sedan"},"EQB":{y:[2022,2025],cargo:{l:90,w:108,h:72},type:"SUV"},"EQS SUV":{y:[2023,2025],cargo:{l:120,w:122,h:88},type:"SUV"},GLA:{y:[2015,2025],cargo:{l:85,w:100,h:68},type:"SUV"},GLC:{y:[2016,2025],cargo:{l:95,w:108,h:75},type:"SUV"},GLE:{y:[2016,2025],cargo:{l:112,w:118,h:83},type:"SUV"},GLB:{y:[2020,2025],cargo:{l:90,w:108,h:72},type:"SUV"},GLS:{y:[2017,2025],cargo:{l:120,w:122,h:88},type:"SUV"} },
  Mitsubishi:{ "Eclipse Cross":{y:[2018,2025],cargo:{l:88,w:105,h:72},type:"SUV"},Outlander:{y:[2003,2025],cargo:{l:108,w:115,h:80},type:"SUV"},"Outlander PHEV":{y:[2018,2025],cargo:{l:105,w:115,h:78},type:"SUV"},"Outlander Sport":{y:[2011,2025],cargo:{l:88,w:103,h:72},type:"SUV"} },
  Nissan:{ Altima:{y:[2002,2025],cargo:{l:93,w:130,h:36},type:"Sedan"},Ariya:{y:[2023,2025],cargo:{l:98,w:108,h:72},type:"SUV"},Armada:{y:[2004,2025],cargo:{l:125,w:125,h:88},type:"SUV"},Frontier:{y:[2005,2025],cargo:{l:127,w:111,h:46},type:"Truck"},Kicks:{y:[2018,2025],cargo:{l:85,w:102,h:68},type:"SUV"},Murano:{y:[2003,2025],cargo:{l:108,w:108,h:80},type:"SUV"},Pathfinder:{y:[2005,2025],cargo:{l:115,w:118,h:85},type:"SUV"},Rogue:{y:[2008,2025],cargo:{l:105,w:111,h:83},type:"SUV"},Sentra:{y:[2000,2025],cargo:{l:85,w:120,h:36},type:"Sedan"},Titan:{y:[2004,2025],cargo:{l:198,w:163,h:56},type:"Truck"},Versa:{y:[2007,2025],cargo:{l:80,w:115,h:36},type:"Sedan"} },
  Polestar:{ "Polestar 2":{y:[2021,2025],cargo:{l:95,w:115,h:72},type:"Hatchback"},"Polestar 3":{y:[2024,2025],cargo:{l:108,w:118,h:80},type:"SUV"},"Polestar 4":{y:[2025,2025],cargo:{l:100,w:115,h:75},type:"SUV"} },
  RAM:{ "1500":{y:[2002,2025],cargo:{l:168,w:145,h:56},type:"Truck"},"2500":{y:[2003,2025],cargo:{l:183,w:157,h:56},type:"Truck"},"1500 TRX":{y:[2021,2025],cargo:{l:165,w:145,h:56},type:"Truck"},"ProMaster City":{y:[2015,2024],cargo:{l:175,w:168,h:130},type:"Van"} },
  Rivian:{ R1S:{y:[2022,2025],cargo:{l:120,w:125,h:90},type:"SUV"},R1T:{y:[2021,2025],cargo:{l:137,w:130,h:54},type:"Truck"},R2:{y:[2026,2026],cargo:{l:100,w:112,h:80},type:"SUV"} },
  Subaru:{ Ascent:{y:[2019,2025],cargo:{l:120,w:120,h:88},type:"SUV"},Crosstrek:{y:[2013,2025],cargo:{l:88,w:108,h:75},type:"SUV"},Forester:{y:[1998,2025],cargo:{l:107,w:105,h:83},type:"SUV"},Impreza:{y:[2002,2025],cargo:{l:90,w:108,h:75},type:"Hatchback"},Legacy:{y:[1995,2024],cargo:{l:90,w:128,h:36},type:"Sedan"},Outback:{y:[1995,2025],cargo:{l:108,w:115,h:83},type:"SUV"},Solterra:{y:[2023,2025],cargo:{l:100,w:108,h:75},type:"SUV"} },
  Tesla:{ "Model 3":{y:[2017,2025],cargo:{l:95,w:120,h:38},type:"Sedan"},"Model S":{y:[2012,2025],cargo:{l:95,w:128,h:38},type:"Sedan"},"Model X":{y:[2015,2025],cargo:{l:120,w:120,h:90},type:"SUV"},"Model Y":{y:[2020,2025],cargo:{l:105,w:115,h:83},type:"SUV"},Cybertruck:{y:[2024,2025],cargo:{l:163,w:122,h:56},type:"Truck"} },
  Toyota:{ "4Runner":{y:[1996,2025],cargo:{l:110,w:115,h:83},type:"SUV"},bZ4X:{y:[2023,2025],cargo:{l:95,w:108,h:75},type:"SUV"},Camry:{y:[1997,2025],cargo:{l:95,w:148,h:38},type:"Sedan"},Corolla:{y:[1993,2025],cargo:{l:84,w:120,h:36},type:"Sedan"},"Corolla Cross":{y:[2022,2025],cargo:{l:88,w:105,h:72},type:"SUV"},Crown:{y:[2023,2025],cargo:{l:98,w:128,h:38},type:"Sedan"},Highlander:{y:[2001,2025],cargo:{l:115,w:125,h:85},type:"SUV"},"Land Cruiser":{y:[1998,2025],cargo:{l:120,w:120,h:88},type:"SUV"},RAV4:{y:[1996,2025],cargo:{l:105,w:111,h:83},type:"SUV"},Sequoia:{y:[2001,2025],cargo:{l:130,w:130,h:88},type:"SUV"},Sienna:{y:[1998,2025],cargo:{l:150,w:142,h:100},type:"Minivan"},Tacoma:{y:[1995,2025],cargo:{l:127,w:111,h:46},type:"Truck"},Tundra:{y:[2000,2025],cargo:{l:168,w:145,h:56},type:"Truck"},Venza:{y:[2021,2025],cargo:{l:95,w:112,h:75},type:"SUV"} },
  Volkswagen:{ Atlas:{y:[2018,2025],cargo:{l:120,w:120,h:88},type:"SUV"},"Atlas Cross Sport":{y:[2020,2025],cargo:{l:108,w:120,h:80},type:"SUV"},Golf:{y:[2000,2025],cargo:{l:95,w:108,h:75},type:"Hatchback"},"ID.4":{y:[2021,2025],cargo:{l:100,w:108,h:75},type:"SUV"},"ID.Buzz":{y:[2024,2025],cargo:{l:130,w:125,h:95},type:"Minivan"},Jetta:{y:[2000,2025],cargo:{l:85,w:108,h:36},type:"Sedan"},Taos:{y:[2022,2025],cargo:{l:88,w:105,h:72},type:"SUV"},Tiguan:{y:[2009,2025],cargo:{l:95,w:108,h:75},type:"SUV"} },
  Volvo:{ S60:{y:[2011,2025],cargo:{l:90,w:120,h:38},type:"Sedan"},V60:{y:[2015,2025],cargo:{l:100,w:112,h:72},type:"Wagon"},XC40:{y:[2019,2025],cargo:{l:88,w:105,h:72},type:"SUV"},XC60:{y:[2010,2025],cargo:{l:100,w:112,h:75},type:"SUV"},XC90:{y:[2016,2025],cargo:{l:115,w:120,h:83},type:"SUV"} },
};
Object.values(CARS).forEach(ms => Object.values(ms).forEach(m => { m.years = range(m.y[0], m.y[1]); }));

/* ─── folded-seat cargo dimensions ──────────────────────────────────────── */
// When rear seats are folded, the usable depth extends into the passenger area.
// Width and height stay the same; depth (l) increases by a car-type multiplier.
const FOLD_MULTIPLIER = { SUV:1.75, Hatchback:1.70, Minivan:1.85, Van:1.75, Wagon:1.80, Sedan:1.22, Truck:1.0 };
function getFoldedCargo(cargo, carType) {
  const mult = FOLD_MULTIPLIER[carType] ?? 1.55;
  return { ...cargo, l: Math.round(cargo.l * mult) };
}

/* ─── packing ─────────────────────────────────────────────────────────────── */
function packBoxes(inputBoxes, cargo) {
  const placed = [];
  const sorted = [...inputBoxes].sort((a,b) => b.l*b.w*b.h - a.l*a.w*a.h);
  for (const box of sorted) {
    const rots = [[box.l,box.w,box.h],[box.l,box.h,box.w],[box.w,box.l,box.h],[box.w,box.h,box.l],[box.h,box.l,box.w],[box.h,box.w,box.l]];
    let ok = false;
    const eps = [{x:0,y:0,z:0}];
    for (const p of placed) eps.push({x:p.x+p.rl,y:p.y,z:p.z},{x:p.x,y:p.y+p.rw,z:p.z},{x:p.x,y:p.y,z:p.z+p.rh});
    eps.sort((a,b) => a.z-b.z||a.y-b.y||a.x-b.x);
    outer: for (const ep of eps) {
      for (const [rl,rw,rh] of rots) {
        let z = ep.z;
        for (const p of placed) if (ep.x<p.x+p.rl&&ep.x+rl>p.x&&ep.y<p.y+p.rw&&ep.y+rw>p.y) z=Math.max(z,p.z+p.rh);
        if (ep.x+rl>cargo.l||ep.y+rw>cargo.w||z+rh>cargo.h) continue;
        if (placed.some(p=>ep.x<p.x+p.rl&&ep.x+rl>p.x&&ep.y<p.y+p.rw&&ep.y+rw>p.y&&z<p.z+p.rh&&z+rh>p.z)) continue;
        placed.push({...box,x:ep.x,y:ep.y,z,rl,rw,rh}); ok=true; break outer;
      }
    }
    if (!ok) return {fits:false,arrangement:placed,failedBox:box};
  }
  return {fits:true,arrangement:placed};
}

/* ─── canvas renderer ─────────────────────────────────────────────────────── */
function renderView(canvas, cargo, arr, view, hlId, unit="cm") {
  if (!canvas||!cargo) return;
  const ctx=canvas.getContext("2d"), W=canvas.width, H=canvas.height;
  const [dX,dY]=view==="top"?[cargo.l,cargo.w]:[cargo.w,cargo.h];
  const pad=48, sc=Math.min((W-2*pad)/dX,(H-2*pad)/dY);
  const ox=Math.floor((W-dX*sc)/2), oy=Math.floor((H-dY*sc)/2);
  ctx.clearRect(0,0,W,H); ctx.fillStyle="#F9FAFB"; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(0,0,0,0.04)"; ctx.lineWidth=1;
  for(let x=0;x<=dX;x+=10){ctx.beginPath();ctx.moveTo(ox+x*sc,oy);ctx.lineTo(ox+x*sc,oy+dY*sc);ctx.stroke();}
  for(let y=0;y<=dY;y+=10){ctx.beginPath();ctx.moveTo(ox,oy+y*sc);ctx.lineTo(ox+dX*sc,oy+y*sc);ctx.stroke();}
  ctx.fillStyle="rgba(59,130,246,0.04)"; ctx.fillRect(ox,oy,dX*sc,dY*sc);
  ctx.strokeStyle="#3B82F6"; ctx.lineWidth=2; ctx.setLineDash([8,4]);
  ctx.strokeRect(ox,oy,dX*sc,dY*sc); ctx.setLineDash([]);
  ctx.fillStyle="#6B7280"; ctx.font="bold 12px system-ui,sans-serif"; ctx.textAlign="center";
  ctx.fillText(`${fmtDim(dX,unit)} ${unitLbl(unit)}`,ox+dX*sc/2,oy-14);
  ctx.save(); ctx.translate(ox-18,oy+dY*sc/2); ctx.rotate(-Math.PI/2); ctx.fillText(`${fmtDim(dY,unit)} ${unitLbl(unit)}`,0,0); ctx.restore();
  const lbl=view==="top"?"TOP VIEW":"SIDE VIEW";
  ctx.font="bold 11px system-ui,sans-serif"; ctx.textAlign="left";
  const tw=ctx.measureText(lbl).width;
  ctx.fillStyle="rgba(59,130,246,0.1)"; ctx.fillRect(8,H-28,tw+16,20);
  ctx.fillStyle="#3B82F6"; ctx.fillText(lbl,16,H-13);
  for (const b of arr) {
    let bx,by,bw,bh;
    if(view==="top"){bx=ox+b.x*sc;by=oy+b.y*sc;bw=b.rl*sc;bh=b.rw*sc;}
    else{bx=ox+b.y*sc;by=oy+(dY-b.z-b.rh)*sc;bw=b.rw*sc;bh=b.rh*sc;}
    const hl=b.id===hlId;
    ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(bx+2,by+2,bw,bh);
    ctx.fillStyle=b.color+(hl?"33":"22"); ctx.fillRect(bx,by,bw,bh);
    const g=ctx.createLinearGradient(bx,by,bx,by+bh);
    g.addColorStop(0,"rgba(255,255,255,0.5)"); g.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=g; ctx.fillRect(bx,by,bw,bh/2);
    ctx.strokeStyle=b.color; ctx.lineWidth=hl?2.5:1.5; ctx.strokeRect(bx,by,bw,bh);
    if(bw>30&&bh>20){
      const fs=Math.max(10,Math.min(13,Math.min(bw,bh)/5));
      ctx.fillStyle=b.color; ctx.font=`bold ${fs}px system-ui,sans-serif`; ctx.textAlign="center";
      const name=(b.productName||"").substring(0,Math.floor(bw/(fs*0.55)));
      ctx.fillText(name,bx+bw/2,by+bh/2+(view==="top"&&bh>34?-5:fs/3));
      if(bh>34&&view==="top"){
        ctx.font=`${fs-2}px system-ui,sans-serif`; ctx.fillStyle=b.color+"99";
        ctx.fillText(`${fmtDim(b.rl,unit)}×${fmtDim(b.rw,unit)}×${fmtDim(b.rh,unit)}${unitLbl(unit)}`,bx+bw/2,by+bh/2+fs*1.1);
      }
    }
  }
}

/* ─── car trunk 3d renderer ──────────────────────────────────────────────── */
// Photorealistic interior view — looking straight into the open trunk.
// Coordinate system: cx = depth (0 = opening, cargo.l = back wall)
//                    cy = width  (0 = left wall, cargo.w = right wall)
//                    cz = height (0 = floor, cargo.h = ceiling)
/* ─── car trunk 3d renderer — Three.js WebGL ─────────────────────────────── */
// Builds a photorealistic 3D interior scene: PBR materials, real shadows,
// ACES tone-mapping, strong directional daylight from the open trunk.
// Scene is cached on the canvas element and rebuilt only when cargo/carType changes.

function render3D(canvas, cargo, arr, hlId, carType = "SUV", unit = "cm") {
  if (!canvas || !cargo || typeof THREE === "undefined") return;

  const cacheKey = `${cargo.l}|${cargo.w}|${cargo.h}|${carType}`;
  let st = _r3dCache.get(canvas);

  if (!st || st.key !== cacheKey) {
    // Dispose old scene if it exists
    if (st) {
      st.renderer.dispose();
      st.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => m.dispose());
        }
      });
    }
    st = _buildScene(canvas, cargo, carType);
    st.key = cacheKey;
    _r3dCache.set(canvas, st);
  }

  _updateBoxes(st.boxGroup, arr, hlId, unit);
  st.renderer.render(st.scene, st.camera);
}

function _buildScene(canvas, cargo, carType) {
  const { l, w, h } = cargo; // trunk dimensions in cm
  const W = canvas.width, H = canvas.height;

  // ── Renderer ──────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  // outputEncoding for r128 compatibility
  if (typeof THREE.sRGBEncoding !== "undefined") {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }

  // ── Scene ─────────────────────────────────────────────────────────────────
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14161B);

  // ── Camera ────────────────────────────────────────────────────────────────
  // Positioned just outside the trunk opening, slightly above the sill,
  // looking inward and slightly downward — matches the reference image angle.
  const camera = new THREE.PerspectiveCamera(62, W / H, 1, l * 10);
  camera.position.set(-w * 0.38, h * 0.38, w / 2);
  camera.lookAt(l * 0.42, h * 0.12, w / 2);
  scene.add(camera);

  // ── Lighting ──────────────────────────────────────────────────────────────
  // 1. Hemisphere — warm sky / cool ground bounce
  const hemi = new THREE.HemisphereLight(0xDDEEFF, 0x604828, 0.45);
  scene.add(hemi);

  // 2. Sun — strong warm directional light from outside (through the opening)
  //    This is the dominant light; it creates realistic shadows inside the trunk.
  const sun = new THREE.DirectionalLight(0xFFF4E0, 3.8);
  sun.position.set(-w * 0.7, h * 1.4, w * 0.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far  = l * 8;
  sun.shadow.camera.left   = -w * 0.8;
  sun.shadow.camera.right  =  w * 1.8;
  sun.shadow.camera.top    =  h * 2;
  sun.shadow.camera.bottom = -h * 0.5;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  // 3. Dome / overhead fill — simulates the headliner dome light
  const dome = new THREE.PointLight(0xFFFFEE, 0.8, l * 2.8, 1.4);
  dome.position.set(l * 0.28, h * 0.96, w * 0.5);
  scene.add(dome);

  // 4. Rear fill — prevents the back of the trunk going pitch black
  const fill = new THREE.DirectionalLight(0x7090CC, 0.55);
  fill.position.set(l * 1.2, h * 0.6, w * 0.5);
  scene.add(fill);

  // ── Material palette ──────────────────────────────────────────────────────
  // Carpet: warm cream/beige — the key visual element from the reference image
  const matCarpet = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xC0B8AC),
    roughness: 0.88,
    metalness: 0.0,
  });

  // Plastic trim panels (walls, ceiling)
  const matTrim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x272A32),
    roughness: 0.84,
    metalness: 0.04,
  });

  // Headliner (darker than trim)
  const matHeadliner = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x222530),
    roughness: 0.92,
    metalness: 0.0,
  });

  // Back wall / seat back fabric
  const matSeat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x30343C),
    roughness: 0.87,
    metalness: 0.0,
  });

  // Chrome sill — high metalness, very low roughness
  const matChrome = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xD8DCE8),
    roughness: 0.06,
    metalness: 0.96,
  });

  // ── Interior panels ───────────────────────────────────────────────────────
  // Coordinate system: X=depth(0=opening,l=back), Y=height(0=floor,h=ceiling), Z=width(0=left,w=right)
  const T = 1.5; // panel thickness in cm

  const addBox = (geo, mat, px, py, pz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.receiveShadow = true;
    m.castShadow   = false;
    scene.add(m); return m;
  };

  // Floor (carpet)
  addBox(new THREE.BoxGeometry(l + T*2, T, w + T*2), matCarpet, l/2, -T/2, w/2);

  // Ceiling (headliner)
  addBox(new THREE.BoxGeometry(l, T, w), matHeadliner, l/2, h + T/2, w/2);

  // Left wall (Z = 0)
  addBox(new THREE.BoxGeometry(l, h + T, T), matTrim, l/2, h/2, -T/2);

  // Right wall (Z = w)
  addBox(new THREE.BoxGeometry(l, h + T, T), matTrim, l/2, h/2, w + T/2);

  // Back wall (X = l) — slightly darker panel
  addBox(new THREE.BoxGeometry(T, h, w), matSeat, l + T/2, h/2, w/2);

  // Chrome trunk sill across the opening bottom
  addBox(new THREE.BoxGeometry(T * 4, 5, w + 10), matChrome, -T, 2.5, w/2);

  // ── Horizontal trim ribs on side walls ────────────────────────────────────
  const ribMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x1E2028), roughness: 0.80, metalness: 0.06,
  });
  const ribH = [0.28, 0.54, 0.74];
  ribH.forEach(frac => {
    // Left wall rib
    const rg = new THREE.BoxGeometry(l * 0.88, T * 2.5, T * 2.5);
    addBox(rg, ribMat, l * 0.46, h * frac, 0);
    // Right wall rib
    const rg2 = new THREE.BoxGeometry(l * 0.88, T * 2.5, T * 2.5);
    addBox(rg2, ribMat, l * 0.46, h * frac, w);
  });

  // ── Seat backs at the back wall ───────────────────────────────────────────
  if (carType !== "Truck") {
    const nSeats   = (carType === "Minivan" || carType === "Van") ? 3 : 2;
    const seatTopY = h * (carType === "Sedan" ? 0.68 : 0.74);
    for (let si = 0; si < nSeats; si++) {
      const z0 = (si + 0.06) / nSeats * w;
      const z1 = (si + 0.94) / nSeats * w;
      const sw2 = z1 - z0;
      const sg = new THREE.BoxGeometry(T * 5, seatTopY, sw2 * 0.92);
      const seat = new THREE.Mesh(sg, matSeat);
      seat.position.set(l - T * 1.5, seatTopY / 2, z0 + sw2 / 2);
      seat.receiveShadow = true;
      scene.add(seat);
      // Seat top (headrest area)
      if (carType !== "Sedan") {
        const hg = new THREE.BoxGeometry(T * 3, h * 0.10, sw2 * 0.55);
        addBox(hg, matSeat, l - T * 1.2, seatTopY + h * 0.05, z0 + sw2 / 2);
      }
    }
  }

  // ── Tie-down hooks (chrome detail on floor) ───────────────────────────────
  [[l*0.25, w*0.05], [l*0.25, w*0.95], [l*0.72, w*0.05], [l*0.72, w*0.95]].forEach(([hx,hz]) => {
    addBox(new THREE.BoxGeometry(6, 2, 6), matChrome, hx, 1.5, hz);
  });

  // ── Box group (populated per frame) ───────────────────────────────────────
  const boxGroup = new THREE.Group();
  scene.add(boxGroup);

  return { renderer, scene, camera, boxGroup };
}

function _updateBoxes(boxGroup, arr, hlId, unit = "cm") {
  // Dispose old meshes
  while (boxGroup.children.length > 0) {
    const ch = boxGroup.children[0];
    if (ch.geometry) ch.geometry.dispose();
    if (ch.material) {
      const mats = Array.isArray(ch.material) ? ch.material : [ch.material];
      mats.forEach(m => m.dispose());
    }
    boxGroup.remove(ch);
  }

  arr.forEach(b => {
    const { x, y, z, rl, rw, rh, color, id } = b;
    const hl   = id === hlId;
    const col  = new THREE.Color(color);

    // Box mesh — cargo space: x=depth, y=width, z=height → Three: X=depth, Y=height, Z=width
    const geo = new THREE.BoxGeometry(rl, rh, rw);
    const mat = new THREE.MeshStandardMaterial({
      color:     col,
      roughness: hl ? 0.32 : 0.52,
      metalness: 0.02,
      emissive:  hl ? col.clone().multiplyScalar(0.18) : new THREE.Color(0x000000),
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + rl/2, z + rh/2, y + rw/2);
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    boxGroup.add(mesh);

    // White edge wireframe for selected box
    if (hl) {
      const edges   = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
      const lines   = new THREE.LineSegments(edges, lineMat);
      lines.position.copy(mesh.position);
      boxGroup.add(lines);
    }

    // Label sprite
    const labelTex = _makeLabel(b.productName || "", color, `${fmtDim(rl,unit)}×${fmtDim(rw,unit)}×${fmtDim(rh,unit)}`, unit);
    const spriteMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
    const sprite    = new THREE.Sprite(spriteMat);
    sprite.position.set(x + rl/2, z + rh + 4, y + rw/2);
    // Scale sprite so it's roughly the width of the box, a reasonable height
    const spriteW = Math.max(20, Math.min(rl, 60));
    sprite.scale.set(spriteW, spriteW * 0.28, 1);
    boxGroup.add(sprite);
  });
}

function _makeLabel(name, color, dims, unit = "cm") {
  const W = 512, H = 128;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  // Pill background
  ctx.fillStyle = "rgba(10,12,18,0.78)";
  ctx.beginPath(); ctx.roundRect(6, 6, W-12, H-12, 16); ctx.fill();

  // Color accent strip
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.roundRect(6, 6, 10, H-12, [16,0,0,16]); ctx.fill();

  // Name
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 44px system-ui,sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(name.substring(0, 14), 30, H * 0.4);

  // Dimensions
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "32px system-ui,sans-serif";
  ctx.fillText(dims + " " + unit, 30, H * 0.75);

  return new THREE.CanvasTexture(c);
}

/* ─── confetti ────────────────────────────────────────────────────────────── */
function Confetti({ active }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!active) return;
    const c = ref.current; if (!c) return;
    c.width=window.innerWidth; c.height=window.innerHeight;
    const ctx=c.getContext("2d");
    const COLS=["#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6","#EC4899","#06B6D4","#F97316"];
    const pts=Array.from({length:160},()=>({x:Math.random()*c.width,y:Math.random()*c.height-c.height,vx:(Math.random()-0.5)*2,vy:Math.random()*4+2,rot:Math.random()*Math.PI*2,rs:(Math.random()-0.5)*0.15,w:Math.random()*12+5,h:Math.random()*6+3,r:Math.random()*5+3,shape:Math.random()>0.4?"rect":"circle",color:COLS[Math.floor(Math.random()*COLS.length)]}));
    let raf,frame=0;
    const draw=()=>{frame++;ctx.clearRect(0,0,c.width,c.height);for(const p of pts){p.y+=p.vy;p.x+=p.vx+Math.sin(frame*0.03+p.r)*0.5;p.rot+=p.rs;const alpha=Math.max(0,1-p.y/c.height*0.9);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.globalAlpha=alpha;ctx.fillStyle=p.color;if(p.shape==="rect")ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);else{ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fill();}ctx.restore();if(p.y>c.height+10){p.y=-10;p.x=Math.random()*c.width;}}raf=requestAnimationFrame(draw);};
    raf=requestAnimationFrame(draw);const t=setTimeout(()=>{cancelAnimationFrame(raf);ctx.clearRect(0,0,c.width,c.height);},5000);return()=>{cancelAnimationFrame(raf);clearTimeout(t);};
  },[active]);
  if(!active) return null;
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999,width:"100vw",height:"100vh"}}/>;
}

/* ─── ui atoms ────────────────────────────────────────────────────────────── */
const Label = ({children}) => (
  <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",color:"#6B7280",textTransform:"uppercase",marginBottom:6}}>{children}</div>
);
const Input = (props) => (
  <input {...props} style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"10px 14px",fontSize:14,color:"#111827",background:"#fff",outline:"none",fontFamily:"inherit",...(props.style||{})}}/>
);
const SelectInput = ({children,...props}) => (
  <select {...props} style={{width:"100%",boxSizing:"border-box",border:"1.5px solid #E5E7EB",borderRadius:8,padding:"10px 14px",fontSize:14,color:"#111827",background:"#fff",outline:"none",fontFamily:"inherit",cursor:"pointer",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 12px center",paddingRight:36}}>{children}</select>
);
const StepBadge = ({n}) => (
  <div style={{width:28,height:28,borderRadius:"50%",background:"#1E3A5F",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>{n}</div>
);
const Card = ({children,style={}}) => (
  <div style={{background:"#fff",border:"1.5px solid #E5E7EB",borderRadius:12,padding:"20px",boxShadow:"0 1px 3px rgba(0,0,0,0.04)",...style}}>{children}</div>
);

/* ─── empty form state ───────────────────────────────────────────────────── */
const emptyForm = () => ({ name:"", packages:[{l:"",w:"",h:""}] });

/* ─── main app ────────────────────────────────────────────────────────────── */
export default function App() {
  const [products,setProducts]         = useState([]);
  const [form,setForm]                 = useState(emptyForm());
  const [formError,setFormError]       = useState("");
  const [itemType,setItemType]         = useState("boxed"); // "boxed" | "assembled"
  const [assembledForm,setAssembledForm] = useState({name:"",l:"",w:"",h:""});
  const [assembledError,setAssembledError] = useState("");
  const [scanLoading,setScanLoading]   = useState(false);
  const [scanError,setScanError]       = useState("");
  const [scanPreview,setScanPreview]   = useState(null);
  const [make,setMake]                 = useState("");
  const [model,setModel]               = useState("");
  const [year,setYear]                 = useState("");
  const [result,setResult]             = useState(null);
  const [hlId,setHlId]                 = useState(null);
  const [dragging,setDragging]         = useState(null);
  const [activeView,setActiveView]     = useState("both");
  const [showConfetti,setShowConfetti] = useState(false);
  const [unit,setUnit]                 = useState("cm"); // "cm" | "in"

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [user,setUser]                 = useState(null);
  const [authLoading,setAuthLoading]   = useState(true);
  const [showHistory,setShowHistory]   = useState(false);
  const [history,setHistory]           = useState([]);
  const [showCarsPanel,setShowCarsPanel] = useState(false);
  const [savedCars,setSavedCars]       = useState([]);
  const [saveCarChecked,setSaveCarChecked] = useState(false);
  const [carNickname,setCarNickname]   = useState("");

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 640;

  const topRef=useRef(null),sideRef=useRef(null),threeRef=useRef(null),arrRef=useRef([]),dragRef=useRef(null),resultRef=useRef(null);

  // ── Auth effect: listen for login/logout ────────────────────────────────────
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) loadUserCars(session.user);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadUserCars(session.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Auth helpers ─────────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };
  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null); setHistory([]); setShowHistory(false);
  };

  // ── Load/save user car ────────────────────────────────────────────────────
  // ── Load all user's saved cars and pre-fill with most recent ─────────────
  const loadUserCars = async (u) => {
    if (!supabase) return;
    const { data } = await supabase
      .from("user_cars")
      .select("id,make,model,year,nickname,updated_at")
      .eq("user_id", u.id)
      .order("updated_at", { ascending: false });
    if (data?.length) {
      setSavedCars(data);
      // Auto-fill the dropdowns with the most recently used car
      const latest = data[0];
      setMake(latest.make); setModel(latest.model); setYear(String(latest.year));
    }
  };

  // ── Save current car to garage (always a new entry unless nickname exists) ─
  const saveCarToGarage = async () => {
    if (!supabase || !user || !make || !model || !year) return;
    const nickname = carNickname.trim() || `${make} ${model}`;
    // Check if an identical car+nickname combo already exists to avoid duplicates
    const { data: existing } = await supabase
      .from("user_cars")
      .select("id")
      .eq("user_id", user.id)
      .eq("make", make)
      .eq("model", model)
      .eq("year", +year)
      .eq("nickname", nickname)
      .single();
    if (!existing) {
      await supabase.from("user_cars")
        .insert({ user_id: user.id, make, model, year: +year, nickname });
    } else {
      // Update the timestamp so it floats to the top as most recently used
      await supabase.from("user_cars")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
    // Refresh the garage list
    await loadUserCars(user);
    setSaveCarChecked(false);
    setCarNickname("");
  };

  // ── Load a saved car into the dropdowns ───────────────────────────────────
  const selectSavedCar = (car) => {
    setMake(car.make); setModel(car.model); setYear(String(car.year));
    setResult(null); setShowCarsPanel(false);
    // Mark as most recently used
    if (supabase && user) {
      supabase.from("user_cars")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", car.id);
    }
  };

  // ── Delete a car from the garage ──────────────────────────────────────────
  const deleteSavedCar = async (carId) => {
    if (!supabase || !user) return;
    await supabase.from("user_cars").delete().eq("id", carId);
    setSavedCars(prev => prev.filter(c => c.id !== carId));
  };

  // ── Legacy wrapper used at checkFit time (silently updates timestamp) ──────
  const saveUserCar = async () => {
    if (!supabase || !user || !make || !model || !year) return;
    if (saveCarChecked) {
      await saveCarToGarage();
    } else {
      // Just update the timestamp on the matching car so it stays as default
      const match = savedCars.find(c => c.make===make && c.model===model && String(c.year)===String(year));
      if (match) {
        await supabase.from("user_cars")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", match.id);
      }
    }
  };

  // ── Save/load history ─────────────────────────────────────────────────────
  const saveToHistory = async (fitResult) => {
    if (!supabase || !user) return;
    await supabase.from("user_history").insert({
      user_id: user.id,
      product_names: products.map(p => p.name).join(", "),
      car_make: make, car_model: model, car_year: +year,
      result: fitResult,
    });
  };
  const loadHistory = async () => {
    if (!supabase || !user) return;
    const { data } = await supabase
      .from("user_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(15);
    setHistory(data || []);
  };

  // ── Community product DB — coming soon ───────────────────────────────────
  // (feature deferred — will be added in a future release)

  const makes  = Object.keys(CARS).sort();
  const models = make ? Object.keys(CARS[make]).sort() : [];
  const years  = make&&model ? [...CARS[make][model].years].sort((a,b)=>b-a) : [];
  const cargo  = make&&model ? CARS[make][model].cargo : null;
  const carType= make&&model ? CARS[make][model].type  : "";

  const updatePkg = (i,field,val) => setForm(f=>({...f,packages:f.packages.map((p,idx)=>idx===i?{...p,[field]:val}:p)}));
  const addPackage = () => setForm(f=>({...f,packages:[...f.packages,{l:"",w:"",h:""}]}));
  const removePkg  = i => setForm(f=>({...f,packages:f.packages.filter((_,idx)=>idx!==i)}));

  const addAssembledProduct = () => {
    setAssembledError("");
    const {name,l,w,h} = assembledForm;
    if (!name.trim()) { setAssembledError("Please enter a product name."); return; }
    if (!l||!w||!h||isNaN(+l)||isNaN(+w)||isNaN(+h)||+l<=0||+w<=0||+h<=0) { setAssembledError("All dimensions must be positive numbers."); return; }
    const color = BOX_COLORS[products.length % BOX_COLORS.length];
    setProducts(prev=>[...prev,{id:Date.now(),name:name.trim(),boxes:[{l:toCm(l,unit),w:toCm(w,unit),h:toCm(h,unit)}],color,assembled:true}]);
    setAssembledForm({name:"",l:"",w:"",h:""});
    setResult(null);
  };

  const scanScreenshot = async (file) => {
    if (!file || !file.type.startsWith("image/")) { setScanError("Please upload an image file."); return; }
    setScanLoading(true); setScanError(""); setScanPreview(URL.createObjectURL(file));

    // Convert image to base64
    const base64 = await new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(",")[1]);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });

    try {
      const resp = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: file.type, data: base64 },
              },
              {
                type: "text",
                text: `You are extracting packaging box dimensions from a product page screenshot.

Look at the screenshot and find any dimensions that describe the SHIPPING BOX or PACKAGE — the physical measurements of the box the product arrives in.

Common labels to look for:
- Width / Height / Length / Depth (when shown alongside "Package(s)" count or weight)
- "Package dimensions", "Box dimensions", "Shipping dimensions"
- "Package 1", "Package 2" etc (multiple box types)
- Any table or list of dimensions near a "Package(s):" or "Weight:" field

CRITICAL RULE — Package(s) count is a QUANTITY MULTIPLIER:
When you see a "Package(s): N" field next to a set of dimensions, you MUST include exactly N copies of that box in the boxes array. Do NOT include just 1 entry — include N entries with identical dimensions.

Example: A product page shows:
  Frame — Width: 52cm, Height: 5cm, Length: 69cm, Package(s): 1
  Wire basket — Width: 21cm, Height: 14cm, Length: 50cm, Package(s): 4
Correct output: 5 box entries — 1 copy of the Frame box, then 4 copies of the Wire basket box.
Wrong output: 2 box entries (one per component) — this IGNORES the Package(s) count.

If a "This product comes as X packages" summary is visible, the total number of entries in your boxes array MUST equal X.

Dimension mapping:
- l = Length (the longest dimension)
- w = Width
- h = Height
- Convert inches to centimetres (× 2.54, round to nearest integer)
- Round all values to the nearest integer

Also extract the product name if visible. If not visible, use an empty string.

Return ONLY valid JSON, no markdown, no explanation:
{"name":"Product Name","boxes":[{"l":86,"w":37,"h":21},{"l":86,"w":37,"h":21}]}

If there are truly no dimensions visible, return:
{"error":"No dimensions visible in screenshot"}`,
              },
            ],
          }],
        }),
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data = await resp.json();
      const raw = data.content.filter(c => c.type === "text").map(c => c.text).join("");
      const stripped = raw.replace(/```(?:json)?\s*/gi,"").replace(/```/g,"").trim();
      let json;
      try { json = JSON.parse(stripped); }
      catch { const m = stripped.match(/\{[\s\S]*\}/); if (m) json = JSON.parse(m[0]); else throw new Error("Could not parse response"); }

      if (json.error) throw new Error(json.error);
      if (!json.boxes?.length) throw new Error("No packaging dimensions found in this screenshot");

      // Auto-fill the form — convert to current unit for display
      setForm({
        name: json.name || "",
        packages: json.boxes.map(b => ({
          l: unit === "in" ? String(toIn(b.l)) : String(b.l),
          w: unit === "in" ? String(toIn(b.w)) : String(b.w),
          h: unit === "in" ? String(toIn(b.h)) : String(b.h),
        })),
      });
      setScanError("");
    } catch (err) {
      setScanError(err.message || "Could not read dimensions. Try a clearer screenshot.");
    } finally {
      setScanLoading(false);
    }
  };

  const onScanFile = (file) => scanScreenshot(file);
  const onScanDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onScanFile(f); };
  const onScanDragOver = (e) => e.preventDefault();

  const addProduct = () => {
    setFormError("");
    if (!form.name.trim()) { setFormError("Please enter a product name."); return; }
    for (let i=0;i<form.packages.length;i++) {
      const{l,w,h}=form.packages[i];
      if(!l||!w||!h||isNaN(+l)||isNaN(+w)||isNaN(+h)||+l<=0||+w<=0||+h<=0){setFormError(`Package ${i+1}: all dimensions must be positive numbers.`);return;}
    }
    const color=BOX_COLORS[products.length%BOX_COLORS.length];
    setProducts(prev=>[...prev,{id:Date.now(),name:form.name.trim(),boxes:form.packages.map(p=>({l:toCm(p.l,unit),w:toCm(p.w,unit),h:toCm(p.h,unit)})),color}]);
    setForm(emptyForm()); setResult(null);
  };

  const removeProduct = id=>{setProducts(p=>p.filter(x=>x.id!==id));setResult(null);};

  const scrollToResult = () => setTimeout(() => resultRef.current?.scrollIntoView({ behavior:"smooth", block:"start" }), 80);

  const checkFit = () => {
    if (!cargo) return;
    const ready = products.filter(p => p.boxes?.length);
    if (!ready.length) return;

    // GTM — fire when user clicks Check if it fits
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "check_fit_clicked",
      car_make: make,
      car_model: model,
      car_year: year,
      car_type: carType,
      product_count: ready.length,
    });
    const boxes = ready.flatMap(p => p.boxes.map((b,i) => ({
      ...b, id:`${p.id}-${i}`, productId:p.id, productName:p.name, color:p.color, assembled:p.assembled||false,
    })));

    // 1. Try normal trunk
    const normal = packBoxes(boxes, cargo);
    if (normal.fits) {
      arrRef.current = normal.arrangement;
      setResult({ fits:true, fitsFolded:false, fitsDisassembled:false, arrangement:normal.arrangement });
      window.dataLayer.push({ event:"check_fit_result", fit_result:"fits", car_make:make, car_model:model });
      saveUserCar(); saveToHistory("fits");
      setShowConfetti(false); setTimeout(()=>setShowConfetti(true), 30);
      scrollToResult();
      return;
    }

    // 2. Try with seats folded (only for car types that have foldable rear seats)
    const foldedCargo = getFoldedCargo(cargo, carType);
    const folded = (carType !== "Truck") ? packBoxes(boxes, foldedCargo) : { fits:false };
    if (folded.fits) {
      arrRef.current = folded.arrangement;
      setResult({ fits:false, fitsFolded:true, foldedCargo, arrangement:folded.arrangement, failedBox:normal.failedBox });
      window.dataLayer.push({ event:"check_fit_result", fit_result:"fits_folded", car_make:make, car_model:model });
      saveUserCar(); saveToHistory("fits_folded");
      setShowConfetti(false); setTimeout(()=>setShowConfetti(true), 30);
      scrollToResult();
      return;
    }

    // 3. Check if any assembled products could help if disassembled
    const hasAssembled = ready.some(p => p.assembled);
    let fitsDisassembled = false;
    let disassemblyNote = "";
    if (hasAssembled) {
      // Heuristic: check if the assembled item's longest dimension is the blocker.
      // If removing it from the equation allows everything else to fit, disassembly is the key suggestion.
      const assembledProducts = ready.filter(p => p.assembled);
      const nonAssembledBoxes = boxes.filter(b => !b.assembled);
      const nonAssembledFit = nonAssembledBoxes.length > 0 ? packBoxes(nonAssembledBoxes, cargo) : { fits:true };

      // Check if assembled item itself could fit if we split it differently —
      // specifically if its volume fits but shape doesn't, disassembly might help
      for (const ap of assembledProducts) {
        const b = ap.boxes[0];
        const dims = [b.l, b.w, b.h].sort((a,z)=>z-a); // largest first
        const bootDims = [cargo.l, cargo.w, cargo.h].sort((a,z)=>z-a);
        const bootFolded = [foldedCargo.l, foldedCargo.w, foldedCargo.h].sort((a,z)=>z-a);
        // If longest dimension exceeds trunk but volume could fit if broken into 2 pieces
        if (dims[0] > bootDims[0] && dims[0] <= bootFolded[0] * 1.4) {
          fitsDisassembled = true;
          disassemblyNote = `"${ap.name}" is too large assembled. Disassembling it may allow it to fit${carType!=="Truck"?" — possibly with seats folded too":""}.`;
        }
      }
      if (!fitsDisassembled && nonAssembledFit.fits) {
        fitsDisassembled = true;
        disassemblyNote = `Everything else fits, but the assembled item is too large. Try disassembling it first.`;
      }
    }

    arrRef.current = normal.arrangement;
    setResult({ fits:false, fitsFolded:false, fitsDisassembled, disassemblyNote, arrangement:normal.arrangement, failedBox:normal.failedBox });
    window.dataLayer.push({ event:"check_fit_result", fit_result: fitsDisassembled ? "fits_disassembled" : "no_fit", car_make:make, car_model:model });
    saveUserCar(); saveToHistory(fitsDisassembled ? "fits_disassembled" : "no_fit");
    setShowConfetti(false);
    scrollToResult();
  };

  const redraw=useCallback((hl=hlId)=>{
    if(!result||!cargo) return;
    renderView(topRef.current,cargo,arrRef.current,"top",hl,unit);
    renderView(sideRef.current,cargo,arrRef.current,"side",hl,unit);
    render3D(threeRef.current,cargo,arrRef.current,hl,carType,unit);
  },[result,cargo,hlId,carType,unit]);

  // Redraw when result changes
  useEffect(()=>{redraw();},[redraw]);

  // Redraw when activeView changes — canvases are unmounted/remounted by React
  // so we need a tick delay to let the new canvas element attach to the DOM first
  useEffect(()=>{
    if(!result||!cargo) return;
    const t = setTimeout(()=>redraw(), 0);
    return ()=>clearTimeout(t);
  },[activeView,result,cargo,unit]);

  const getXY=(e,canvas)=>{
    const r=canvas.getBoundingClientRect(),sw=canvas.width/r.width,sh=canvas.height/r.height;
    const mx=(e.clientX-r.left)*sw,my=(e.clientY-r.top)*sh;
    const pad=48,sc=Math.min((canvas.width-2*pad)/cargo.l,(canvas.height-2*pad)/cargo.w);
    const ox=(canvas.width-cargo.l*sc)/2,oy=(canvas.height-cargo.w*sc)/2;
    return{cx:(mx-ox)/sc,cy:(my-oy)/sc};
  };
  const onMD=useCallback(e=>{
    if(!result||!cargo) return;
    const{cx,cy}=getXY(e,topRef.current);
    for(let i=arrRef.current.length-1;i>=0;i--){const b=arrRef.current[i];if(cx>=b.x&&cx<=b.x+b.rl&&cy>=b.y&&cy<=b.y+b.rw){dragRef.current={idx:i,offX:cx-b.x,offY:cy-b.y};setDragging(i);setHlId(b.id);break;}}
  },[result,cargo]);
  const onMM=useCallback(e=>{
    if(!dragRef.current||!cargo) return;
    const{cx,cy}=getXY(e,topRef.current),{idx,offX,offY}=dragRef.current,b=arrRef.current[idx];
    arrRef.current=arrRef.current.map((box,i)=>i===idx?{...box,x:Math.max(0,Math.min(cargo.l-b.rl,cx-offX)),y:Math.max(0,Math.min(cargo.w-b.rw,cy-offY))}:box);
    redraw(b.id);
  },[cargo,redraw]);
  const onMU=useCallback(()=>{dragRef.current=null;setDragging(null);},[]);
  const onTS=useCallback(e=>{e.preventDefault();onMD({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});},[onMD]);
  const onTM=useCallback(e=>{e.preventDefault();onMM({clientX:e.touches[0].clientX,clientY:e.touches[0].clientY});},[onMM]);

  const canCheck=cargo&&products.length>0;
  const canAdd=form.name.trim()&&form.packages.every(p=>p.l&&p.w&&p.h);
  const canAddAssembled=assembledForm.name.trim()&&assembledForm.l&&assembledForm.w&&assembledForm.h;

  return (
    <div style={{fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",background:"#F3F4F6",minHeight:"100vh",color:"#111827"}}>
      <Confetti active={showConfetti}/>

      <nav style={{background:"#fff",borderBottom:"1px solid #E5E7EB",padding:"0 24px",display:"flex",alignItems:"center",height:56,gap:12}}>
        <div style={{width:32,height:32,borderRadius:8,background:"#1E3A5F",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <span style={{fontWeight:700,fontSize:16,color:"#111827"}}>Will it <span style={{color:"#3B82F6"}}>Fit?</span></span>
        {!isMobile&&<span style={{background:"#FEF9C3",color:"#854D0E",fontWeight:600,fontSize:12,padding:"3px 10px",borderRadius:99,border:"1px solid #FDE68A"}}>Trunk Space Checker</span>}

        {/* ── Auth button (right-aligned) ── */}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {!authLoading && (
            user ? (
              <>
                <button onClick={()=>{setShowHistory(true);loadHistory();}}
                  style={{background:"#EFF6FF",color:"#2563EB",border:"1.5px solid #BFDBFE",borderRadius:8,
                    padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  📋 {isMobile?"":"History"}
                </button>
                <button onClick={()=>{setShowCarsPanel(true);loadUserCars(user);}}
                  style={{background:"#F0FDF4",color:"#15803D",border:"1.5px solid #BBF7D0",borderRadius:8,
                    padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  🚗 {isMobile?"":"My Cars"}
                </button>
                <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,
                  background:"#F9FAFB",border:"1.5px solid #E5E7EB",cursor:"pointer"}}
                  onClick={handleLogout} title="Sign out">
                  {user.user_metadata?.avatar_url
                    ? <img src={user.user_metadata.avatar_url} alt="" style={{width:22,height:22,borderRadius:"50%"}}/>
                    : <div style={{width:22,height:22,borderRadius:"50%",background:"#1E3A5F",color:"#fff",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {(user.user_metadata?.name||user.email||"?")[0].toUpperCase()}
                      </div>
                  }
                  {!isMobile&&<span style={{fontSize:12,color:"#374151",fontWeight:500,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {user.user_metadata?.name || user.email?.split("@")[0]}
                  </span>}
                  <span style={{fontSize:10,color:"#9CA3AF"}}>✕</span>
                </div>
              </>
            ) : (
              <button onClick={handleLogin} disabled={!supabase}
                title={!supabase ? "Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable login" : ""}
                style={{background:"#fff",color:supabase?"#374151":"#9CA3AF",
                  border:`1.5px solid ${supabase?"#E5E7EB":"#F3F4F6"}`,borderRadius:8,
                  padding:"6px 12px",fontSize:12,fontWeight:600,
                  cursor:supabase?"pointer":"not-allowed",fontFamily:"inherit",
                  display:"flex",alignItems:"center",gap:6,opacity:supabase?1:0.6}}>
                <svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {isMobile ? "Sign in" : "Sign in with Google"}
              </button>
            )
          )}
        </div>
      </nav>
      <ExtensionBanner />

      {/* ── Page wrapper ── */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:isMobile?"16px":"40px 24px 24px",display:"flex",flexDirection:"column",gap:isMobile?16:24}}>

        {/* ── Header — full width ── */}
        <div>
          <h1 style={{fontSize:isMobile?22:32,fontWeight:800,color:"#111827",lineHeight:1.2,margin:"0 0 8px"}}>Don't guess at the warehouse.</h1>

          <p style={{fontSize:12,color:"#92400E",margin:"0 0 16px",lineHeight:1.6,background:"#FFFBEB",border:"1px solid #FDE68A",borderLeft:"3px solid #F59E0B",borderRadius:"0 6px 6px 0",padding:"8px 12px",display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={{flexShrink:0,fontSize:14}}>⚠️</span>
            <span>This tool provides the best approximation, there could be cases where the product might not fit.</span>
          </p>

          <p style={{fontSize:isMobile?13:15,color:"#6B7280",margin:0,lineHeight:1.6}}>
            Screenshot the packaging section of any product page — from <strong>IKEA</strong>, <strong>Home Depot</strong>, <strong>Canadian Tire</strong> and more — and we'll read the dimensions automatically.
          </p>
        </div>

        {/* ── 2-col middle: Products (left) | Car (right) ── */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) minmax(0,1fr)",gap:isMobile?16:24,alignItems:"start"}}>

          {/* ── Products card ── */}
          <Card>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <StepBadge n={1}/>
              <span style={{fontWeight:700,fontSize:16}}>Your Products</span>
            </div>

            {/* ── Item type toggle ── */}
            <div style={{marginBottom:16}}>
              <Label>Is the item new in its box, or already assembled?</Label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["boxed","📦 New / In box"],["assembled","🔧 Already assembled"]].map(([val,label])=>(
                  <button key={val} onClick={()=>{setItemType(val);setFormError("");setAssembledError("");}}
                    style={{padding:"10px 8px",borderRadius:8,border:`1.5px solid ${itemType===val?"#3B82F6":"#E5E7EB"}`,
                      background:itemType===val?"#EFF6FF":"#fff",color:itemType===val?"#1D4ED8":"#6B7280",
                      fontWeight:600,fontSize:isMobile?12:13,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",textAlign:"center"}}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Assembled item form ── */}
            {itemType==="assembled"&&(
              <div style={{marginBottom:12}}>
                <div style={{background:"#F0F9FF",border:"1px solid #BAE6FD",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#0369A1",marginBottom:12,lineHeight:1.5}}>
                  ℹ️ Enter the assembled dimensions of the item. The tool will also check if disassembling it would help it fit.
                </div>
                <div style={{marginBottom:10}}>
                  <Label>Product Name</Label>
                  <Input placeholder="e.g. IKEA BILLY Bookcase (assembled)"
                    value={assembledForm.name}
                    onChange={e=>setAssembledForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <Label>Assembled Dimensions ({unitLbl(unit)})</Label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:isMobile?6:8,marginBottom:8}}>
                  {[["l","LENGTH"],["w","WIDTH"],["h","HEIGHT"]].map(([field,lbl])=>(
                    <div key={field}>
                      <div style={{fontSize:10,color:"#9CA3AF",marginBottom:3,fontWeight:600,letterSpacing:"0.06em"}}>{lbl}</div>
                      <Input placeholder={field.toUpperCase()} value={assembledForm[field]}
                        onChange={e=>setAssembledForm(f=>({...f,[field]:e.target.value}))}
                        style={{padding:"9px 10px"}}/>
                    </div>
                  ))}
                </div>
                {assembledError&&<div style={{fontSize:12,color:"#EF4444",marginBottom:8}}>{assembledError}</div>}
                <button onClick={addAssembledProduct} disabled={!canAddAssembled}
                  style={{width:"100%",background:canAddAssembled?"#1E3A5F":"#F3F4F6",color:canAddAssembled?"#fff":"#9CA3AF",
                    border:"none",borderRadius:8,padding:"10px",fontSize:13,fontWeight:600,
                    cursor:canAddAssembled?"pointer":"not-allowed",fontFamily:"inherit",transition:"background 0.2s"}}>
                  + Add Assembled Item
                </button>
              </div>
            )}

            {/* ── Boxed item: screenshot + manual fields ── */}
            {itemType==="boxed"&&(<>

            {/* ── Screenshot upload zone ── */}
            <div style={{marginBottom:16}}>
              <Label>📸 Screenshot Auto-fill</Label>
              <div
                onDrop={onScanDrop}
                onDragOver={onScanDragOver}
                onClick={()=>!scanLoading&&document.getElementById("screenshotInput").click()}
                style={{
                  border:`2px dashed ${scanLoading?"#93C5FD":scanPreview?"#6EE7B7":"#D1D5DB"}`,
                  borderRadius:10,
                  padding:scanPreview?"10px":"20px 16px",
                  textAlign:"center",
                  cursor:scanLoading?"default":"pointer",
                  background:scanLoading?"#EFF6FF":scanPreview?"#F0FDF4":"#FAFAFA",
                  transition:"all 0.2s",
                  position:"relative",
                  minHeight:scanPreview?0:88,
                  display:"flex",
                  flexDirection:scanPreview?"row":"column",
                  alignItems:"center",
                  justifyContent:"center",
                  gap:10,
                }}>
                <input
                  id="screenshotInput"
                  type="file"
                  accept="image/*"
                  style={{display:"none"}}
                  onChange={e=>{ if(e.target.files[0]) onScanFile(e.target.files[0]); e.target.value=""; }}
                />
                {scanLoading ? (
                  <>
                    <div style={{width:20,height:20,border:"2.5px solid #3B82F6",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
                    <span style={{fontSize:13,color:"#3B82F6",fontWeight:600}}>Reading dimensions…</span>
                  </>
                ) : scanPreview ? (
                  <>
                    <img src={scanPreview} alt="preview" style={{width:52,height:52,objectFit:"cover",borderRadius:6,flexShrink:0,border:"1.5px solid #D1FAE5"}}/>
                    <div style={{flex:1,textAlign:"left",minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#065F46",marginBottom:2}}>✓ Screenshot scanned</div>
                      <div style={{fontSize:11,color:"#6B7280"}}>Tap to replace with a different screenshot</div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{fontSize:28,lineHeight:1}}>📷</div>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:2}}>
                        {isMobile ? "Tap to upload a screenshot" : "Drop a screenshot here or click to upload"}
                      </div>
                      <div style={{fontSize:11,color:"#9CA3AF"}}>
                        Screenshot the packaging section of any retailer's product page
                      </div>
                    </div>
                  </>
                )}
              </div>
              {scanError&&(
                <div style={{fontSize:12,color:"#EF4444",marginTop:6,display:"flex",gap:6,alignItems:"flex-start"}}>
                  <span style={{flexShrink:0}}>⚠️</span>
                  <span>{scanError} — you can still enter dimensions manually below.</span>
                </div>
              )}
              {/* How-to hint */}
              {!scanPreview&&!scanLoading&&(
                <div style={{fontSize:11,color:"#9CA3AF",marginTop:6,lineHeight:1.5}}>
                  💡 On IKEA or Home Depot: scroll to the "Packaging" section on the product page → screenshot it → upload here.
                </div>
              )}
            </div>

            {/* ── Divider ── */}
            <div style={{display:"flex",alignItems:"center",gap:10,margin:"4px 0 16px"}}>
              <div style={{flex:1,height:1,background:"#E5E7EB"}}/>
              <span style={{fontSize:11,color:"#9CA3AF",fontWeight:600,letterSpacing:"0.06em"}}>OR ENTER MANUALLY</span>
              <div style={{flex:1,height:1,background:"#E5E7EB"}}/>
            </div>

            {/* ── Manual fields ── */}
            <div style={{marginBottom:12}}>
              <Label>Product Name</Label>
              <Input placeholder="e.g. KALLAX Shelf Unit, Tool Cabinet…" value={form.name}
                onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                onKeyDown={e=>e.key==="Enter"&&canAdd&&addProduct()}/>
            </div>

            <div style={{marginBottom:8,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
              <Label>Box Dimensions — find these on the product page under "Packaging"</Label>
              <div style={{display:"flex",flexShrink:0,border:"1.5px solid #E5E7EB",borderRadius:8,overflow:"hidden"}}>
                {["cm","in"].map(u=>(
                  <button key={u} onClick={()=>setUnit(u)}
                    style={{padding:"4px 12px",fontSize:12,fontWeight:700,border:"none",cursor:"pointer",fontFamily:"inherit",
                      background:unit===u?"#1E3A5F":"#fff",
                      color:unit===u?"#fff":"#9CA3AF",
                      transition:"all 0.15s"}}>
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {form.packages.map((pkg,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr auto",gap:isMobile?6:8,marginBottom:8,alignItems:"center"}}>
                <div>
                  {i===0&&<div style={{fontSize:10,color:"#9CA3AF",marginBottom:3,fontWeight:600,letterSpacing:"0.06em"}}>LENGTH</div>}
                  <Input placeholder="L" value={pkg.l} onChange={e=>updatePkg(i,"l",e.target.value)} style={{padding:"9px 10px"}}/>
                </div>
                <div>
                  {i===0&&<div style={{fontSize:10,color:"#9CA3AF",marginBottom:3,fontWeight:600,letterSpacing:"0.06em"}}>WIDTH</div>}
                  <Input placeholder="W" value={pkg.w} onChange={e=>updatePkg(i,"w",e.target.value)} style={{padding:"9px 10px"}}/>
                </div>
                <div>
                  {i===0&&<div style={{fontSize:10,color:"#9CA3AF",marginBottom:3,fontWeight:600,letterSpacing:"0.06em"}}>HEIGHT</div>}
                  <Input placeholder="H" value={pkg.h} onChange={e=>updatePkg(i,"h",e.target.value)} style={{padding:"9px 10px"}}/>
                </div>
                <div style={{paddingTop:i===0?18:0}}>
                  {form.packages.length>1&&(
                    <button onClick={()=>removePkg(i)} style={{background:"none",border:"1.5px solid #E5E7EB",borderRadius:6,color:"#9CA3AF",cursor:"pointer",fontSize:16,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"inherit"}}>×</button>
                  )}
                </div>
              </div>
            ))}

            {form.packages.length>0&&(
              <div style={{fontSize:11,color:"#9CA3AF",marginBottom:8}}>
                Package {form.packages.length} of {form.packages.length} — products with multiple boxes (e.g. flat-pack furniture) can have more than one.
              </div>
            )}

            <div style={{display:"flex",gap:8,marginTop:4,marginBottom:formError?8:0}}>
              <button onClick={addPackage} style={{flex:1,background:"#F9FAFB",color:"#6B7280",border:"1.5px dashed #D1D5DB",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                + Add another box
              </button>
              <button onClick={addProduct} disabled={!canAdd}
                style={{flex:1,background:canAdd?"#1E3A5F":"#F3F4F6",color:canAdd?"#fff":"#9CA3AF",border:"none",borderRadius:8,padding:"8px 16px",fontSize:13,fontWeight:600,cursor:canAdd?"pointer":"not-allowed",fontFamily:"inherit",transition:"background 0.2s"}}>
                + Add Product
              </button>
            </div>
            {formError&&<div style={{fontSize:12,color:"#EF4444",marginTop:4}}>{formError}</div>}

            </>)} {/* end itemType===boxed */}

            {products.length>0&&(
              <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10}}>
                {products.map(p=>(
                  <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 14px",background:"#F9FAFB",borderRadius:10,border:"1.5px solid #E5E7EB",borderLeft:`3px solid ${p.color}`}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:"#111827",marginBottom:4,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                        {p.name}
                        {p.assembled&&<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99,background:"#FEF3C7",color:"#92400E",border:"1px solid #FDE68A"}}>ASSEMBLED</span>}
                      </div>
                      <div style={{fontSize:12,color:"#9CA3AF",marginBottom:6}}>
                        {p.boxes.length} package{p.boxes.length!==1?"s":""} · {p.boxes.reduce((s,b)=>s+b.l*b.w*b.h/1e6,0).toFixed(3)} m³
                      </div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {p.boxes.map((b,i)=>(
                          <span key={i} style={{fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,background:p.color+"18",color:p.color,border:`1px solid ${p.color}44`,letterSpacing:"0.03em"}}>
                          {fmtDim(b.l,unit)}×{fmtDim(b.w,unit)}×{fmtDim(b.h,unit)} {unitLbl(unit)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button onClick={()=>removeProduct(p.id)} style={{background:"none",border:"none",color:"#9CA3AF",cursor:"pointer",fontSize:18,lineHeight:1,padding:"2px 4px",flexShrink:0,fontFamily:"inherit"}} title="Remove">×</button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Car card ── */}
          <Card style={{marginTop:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <StepBadge n={2}/>
              <span style={{fontWeight:700,fontSize:16}}>Your Car</span>
            </div>

            {/* ── Saved cars quick-select (logged in + has saved cars) ── */}
            {user && savedCars.length > 0 && (
              <div style={{marginBottom:16}}>
                <Label>Your Garage</Label>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  {savedCars.map(car=>{
                    const isActive = car.make===make && car.model===model && String(car.year)===String(year);
                    return (
                      <button key={car.id} onClick={()=>selectSavedCar(car)}
                        style={{padding:"7px 12px",borderRadius:8,border:`1.5px solid ${isActive?"#1E3A5F":"#E5E7EB"}`,
                          background:isActive?"#1E3A5F":"#F9FAFB",color:isActive?"#fff":"#374151",
                          fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
                          transition:"all 0.15s",textAlign:"left"}}>
                        <div style={{fontWeight:700}}>{car.nickname||`${car.make} ${car.model}`}</div>
                        <div style={{fontSize:10,opacity:0.75,marginTop:1}}>
                          {car.make} {car.model} · {car.year}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <Label>{user && savedCars.length > 0 ? "Or select a different car" : "Make"}</Label>
                <SelectInput value={make} onChange={e=>{setMake(e.target.value);setModel("");setYear("");setResult(null);}}>
                  <option value="">Select Make</option>
                  {makes.map(m=><option key={m} value={m}>{m}</option>)}
                </SelectInput>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <Label>Model</Label>
                  <SelectInput value={model} onChange={e=>{setModel(e.target.value);setYear("");setResult(null);}} disabled={!make}>
                    <option value="">Select Model</option>
                    {models.map(m=><option key={m} value={m}>{m}</option>)}
                  </SelectInput>
                </div>
                <div>
                  <Label>Year</Label>
                  <SelectInput value={year} onChange={e=>{setYear(e.target.value);setResult(null);}} disabled={!model}>
                    <option value="">Select Year</option>
                    {years.map(y=><option key={y} value={y}>{y}</option>)}
                  </SelectInput>
                </div>
              </div>

              {/* ── Save to garage checkbox + nickname ── */}
              {user && make && model && year && (
                <div>
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",userSelect:"none"}}>
                    <input type="checkbox" checked={saveCarChecked}
                      onChange={e=>setSaveCarChecked(e.target.checked)}
                      style={{width:15,height:15,accentColor:"#1E3A5F",cursor:"pointer"}}/>
                    <span style={{fontSize:13,color:"#374151",fontWeight:500}}>Save this car to my garage</span>
                  </label>
                  {saveCarChecked&&(
                    <div style={{marginTop:8}}>
                      <Input
                        placeholder={`Nickname (e.g. "My Rogue", "Wife's SUV")`}
                        value={carNickname}
                        onChange={e=>setCarNickname(e.target.value)}
                        style={{fontSize:13}}/>
                      <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>
                        Give it a nickname so you can tell your cars apart. Defaults to "{make} {model}" if left blank.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {cargo&&(
                <div style={{background:"#EFF6FF",border:"1.5px solid #BFDBFE",borderRadius:10,padding:"12px 14px",fontSize:13,color:"#1E40AF"}}>
                  <div style={{fontWeight:700,marginBottom:4}}>{make} {model} {year} · {carType}</div>
                  <div style={{color:"#3B82F6"}}>Trunk space: {fmtDim(cargo.l,unit)} × {fmtDim(cargo.w,unit)} × {fmtDim(cargo.h,unit)} {unitLbl(unit)} &nbsp;≈&nbsp; {Math.round(cargo.l*cargo.w*cargo.h/1000)} L</div>
                  <div style={{color:"#93C5FD",fontSize:11,marginTop:4}}>* Approximate. Rear seats may need to be folded.</div>
                </div>
              )}
            </div>
            <button onClick={checkFit} disabled={!canCheck}
              style={{width:"100%",marginTop:20,padding:"14px",borderRadius:10,border:"none",background:canCheck?"#1E3A5F":"#F3F4F6",color:canCheck?"#fff":"#9CA3AF",fontWeight:700,fontSize:15,cursor:canCheck?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"inherit",transition:"background 0.2s"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              Check if it fits →
            </button>
          </Card>
        </div>{/* end 2-col grid */}

        {/* ── Result — full width ── */}
        <div ref={resultRef} style={{display:"flex",flexDirection:"column",gap:16}}>
          {result&&(
            <div style={{borderRadius:12,padding:isMobile?"14px":"20px 24px",display:"flex",alignItems:"flex-start",gap:isMobile?12:16,
              background: result.fits ? "#ECFDF5" : result.fitsFolded ? "#EFF6FF" : result.fitsDisassembled ? "#FFFBEB" : "#FEF2F2",
              border:`2px solid ${result.fits?"#6EE7B7":result.fitsFolded?"#93C5FD":result.fitsDisassembled?"#FDE68A":"#FCA5A5"}`,
              animation:"slideDown 0.3s ease"}}>
              <div style={{fontSize:isMobile?28:40,lineHeight:1,flexShrink:0}}>
                {result.fits?"🎉":result.fitsFolded?"🚗":result.fitsDisassembled?"🔧":"📦"}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:isMobile?16:20,fontWeight:800,marginBottom:4,
                  color:result.fits?"#065F46":result.fitsFolded?"#1E40AF":result.fitsDisassembled?"#92400E":"#991B1B"}}>
                  {result.fits
                    ? "Yes — everything fits!"
                    : result.fitsFolded
                    ? "Fits with rear seats folded down"
                    : result.fitsDisassembled
                    ? "May fit if disassembled"
                    : "Doesn't fit in the trunk"}
                </div>
                <div style={{fontSize:14,lineHeight:1.6,
                  color:result.fits?"#047857":result.fitsFolded?"#1D4ED8":result.fitsDisassembled?"#B45309":"#B91C1C"}}>
                  {result.fits
                    ? `All ${products.length} product(s) · ${arrRef.current.length} box${arrRef.current.length!==1?"es":""} total — fits in the ${make} ${model}.`
                    : result.fitsFolded
                    ? <>
                        Doesn't fit with seats up, but <strong>fits when the rear seats are folded flat</strong>. The extended trunk space gives {fmtDim(result.foldedCargo?.l,unit)} {unitLbl(unit)} of depth.
                      </>
                    : result.fitsDisassembled
                    ? result.disassemblyNote
                    : `"${result.failedBox?.productName||"A box"}" couldn't be placed. Try a larger vehicle, or check if the item can be disassembled.`}
                </div>
                {result.fitsFolded&&(
                  <div style={{marginTop:8,fontSize:12,color:"#3B82F6",background:"#DBEAFE",borderRadius:6,padding:"6px 10px",display:"inline-block"}}>
                    ⚠️ Ensure your {make} {model} has fold-flat rear seats before loading
                  </div>
                )}
                {result.fitsDisassembled&&(
                  <div style={{marginTop:8,fontSize:12,color:"#92400E",background:"#FEF3C7",borderRadius:6,padding:"6px 10px"}}>
                    💡 Check the product manual for disassembly instructions. Re-run the check with the individual component dimensions once disassembled.
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{background:"#fff",border:"2px dashed #D1D5DB",borderRadius:14,padding:result?(isMobile?14:20):0,minHeight:isMobile?0:480,display:"flex",flexDirection:"column",gap:16}}>
            {!result&&(
              <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,padding:isMobile?24:40}}>
                <div style={{width:72,height:72,borderRadius:16,background:"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                </div>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:700,color:"#374151",marginBottom:6}}>Ready to Check</div>
                  <div style={{fontSize:14,color:"#9CA3AF",lineHeight:1.6}}>Add your product dimensions and select your car<br/>to see if everything fits.</div>
                </div>
              </div>
            )}

            {result&&(
              <>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                  {!isMobile&&<div style={{fontSize:13,color:"#6B7280"}}>💡 Drag boxes in the top view to rearrange</div>}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    {[["both","All"],["top","Top"],["side","Side"],["3d","3D"]].map(([v,lbl])=>(
                      <button key={v} onClick={()=>setActiveView(v)} style={{padding:isMobile?"6px 10px":"6px 14px",borderRadius:8,border:"1.5px solid",fontSize:isMobile?12:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",borderColor:activeView===v?"#3B82F6":"#E5E7EB",background:activeView===v?"#EFF6FF":"#fff",color:activeView===v?"#2563EB":"#6B7280"}}>{lbl}</button>
                    ))}
                  </div>
                </div>

                <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                  {(activeView==="both"||activeView==="top")&&(
                    <div style={{flex:1,minWidth:isMobile?0:240}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Top View — Looking Down</div>
                      <canvas ref={topRef} width={560} height={400} style={{width:"100%",display:"block",borderRadius:10,border:"1.5px solid #E5E7EB",cursor:dragging!==null?"grabbing":"grab"}}
                        onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU} onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onMU}/>
                    </div>
                  )}
                  {(activeView==="both"||activeView==="side")&&(
                    <div style={{flex:1,minWidth:isMobile?0:240}}>
                      <div style={{fontSize:11,fontWeight:600,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Side View — From the Back</div>
                      <canvas ref={sideRef} width={560} height={340} style={{width:"100%",display:"block",borderRadius:10,border:"1.5px solid #E5E7EB",cursor:"default"}}/>
                    </div>
                  )}
                </div>

                {(activeView==="both"||activeView==="3d")&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>3D View — Trunk Opening</div>
                    <canvas ref={threeRef} width={860} height={520} style={{width:"100%",display:"block",borderRadius:10,border:"1.5px solid #E5E7EB"}}/>
                  </div>
                )}

                <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
                  {products.map(p=>(
                    <div key={p.id} style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:"#374151",cursor:"default"}} onMouseEnter={()=>setHlId(`${p.id}-0`)} onMouseLeave={()=>setHlId(null)}>
                      <div style={{width:12,height:12,borderRadius:3,background:p.color,flexShrink:0}}/>
                      <span style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{p.name}</span>
                      <span style={{color:"#9CA3AF",fontSize:12}}>({p.boxes.length} pkg)</span>
                    </div>
                  ))}
                </div>

                <div style={{background:"#F9FAFB",borderRadius:10,padding:"14px 16px",border:"1.5px solid #E5E7EB"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#6B7280",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:12}}>Packing Summary</div>
                  <div style={{display:"grid",gridTemplateColumns:`repeat(auto-fill,minmax(${isMobile?140:175}px,1fr))`,gap:12}}>
                    {arrRef.current.map((b,i)=>(
                      <div key={i} style={{borderLeft:`3px solid ${b.color}`,paddingLeft:10}}>
                        <div style={{fontSize:13,fontWeight:600,color:"#111827",marginBottom:2}}>{b.productName?.substring(0,22)}</div>
                        <div style={{fontSize:12,color:"#6B7280"}}>{fmtDim(b.rl,unit)}×{fmtDim(b.rw,unit)}×{fmtDim(b.rh,unit)} {unitLbl(unit)}</div>
                        <div style={{fontSize:11,color:"#9CA3AF"}}>x{Math.round(b.x)} y{Math.round(b.y)} z{Math.round(b.z)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── My Cars (Garage) slide-in panel ── */}
      {showCarsPanel&&(
        <>
          <div onClick={()=>setShowCarsPanel(false)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:200,backdropFilter:"blur(2px)"}}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:isMobile?"100vw":420,
            background:"#fff",zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.12)",
            display:"flex",flexDirection:"column",animation:"slideIn 0.22s ease"}}>
            {/* Header */}
            <div style={{padding:"18px 20px",borderBottom:"1px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:"#111827"}}>My Garage</div>
                <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>Your saved cars — click one to load it</div>
              </div>
              <button onClick={()=>setShowCarsPanel(false)}
                style={{background:"none",border:"none",fontSize:20,color:"#9CA3AF",cursor:"pointer",padding:"4px 6px",fontFamily:"inherit",lineHeight:1}}>✕</button>
            </div>
            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
              {savedCars.length===0&&(
                <div style={{textAlign:"center",padding:"40px 20px",color:"#9CA3AF",fontSize:14,lineHeight:1.6}}>
                  No cars saved yet.<br/>Select a car and check the "Save this car to my garage" box when running a check.
                </div>
              )}
              {savedCars.map(car=>{
                const isActive = car.make===make && car.model===model && String(car.year)===String(year);
                return (
                  <div key={car.id}
                    style={{borderRadius:10,border:`1.5px solid ${isActive?"#1E3A5F":"#E5E7EB"}`,
                      background:isActive?"#F0F4FF":"#F9FAFB",padding:"14px 16px",
                      display:"flex",alignItems:"center",gap:12,cursor:"pointer",transition:"all 0.15s"}}
                    onClick={()=>selectSavedCar(car)}>
                    {/* Car icon */}
                    <div style={{width:40,height:40,borderRadius:10,
                      background:isActive?"#1E3A5F":"#E5E7EB",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>
                      🚗
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,color:isActive?"#1E3A5F":"#111827",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {car.nickname || `${car.make} ${car.model}`}
                      </div>
                      <div style={{fontSize:12,color:"#6B7280",marginTop:2}}>
                        {car.make} {car.model} · {car.year}
                        {car.make&&CARS[car.make]?.[car.model]?
                          ` · ${CARS[car.make][car.model].type}`:""
                        }
                      </div>
                      {isActive&&(
                        <div style={{fontSize:10,color:"#1E3A5F",fontWeight:700,marginTop:3,
                          letterSpacing:"0.05em",textTransform:"uppercase"}}>
                          Currently selected
                        </div>
                      )}
                    </div>
                    <button
                      onClick={e=>{e.stopPropagation();deleteSavedCar(car.id);}}
                      title="Remove from garage"
                      style={{background:"none",border:"1px solid #FCA5A5",borderRadius:6,
                        color:"#EF4444",cursor:"pointer",fontSize:12,padding:"4px 8px",
                        fontFamily:"inherit",flexShrink:0,lineHeight:1}}>
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Footer — add current car shortcut */}
            {make&&model&&year&&(
              <div style={{padding:"14px 16px",borderTop:"1px solid #E5E7EB",background:"#F9FAFB"}}>
                <div style={{fontSize:12,color:"#6B7280",marginBottom:8}}>
                  Current: <strong>{make} {model} {year}</strong>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <Input
                    placeholder={`Nickname (e.g. "My Rogue")`}
                    value={carNickname}
                    onChange={e=>setCarNickname(e.target.value)}
                    style={{fontSize:13,flex:1}}/>
                  <button onClick={async()=>{await saveCarToGarage();setShowCarsPanel(false);}}
                    style={{background:"#1E3A5F",color:"#fff",border:"none",borderRadius:8,
                      padding:"10px 14px",fontSize:13,fontWeight:600,cursor:"pointer",
                      fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>
                    + Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── History slide-in panel ── */}
      {showHistory&&(
        <>
          {/* Backdrop */}
          <div onClick={()=>setShowHistory(false)}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:200,backdropFilter:"blur(2px)"}}/>
          {/* Panel */}
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:isMobile?"100vw":420,
            background:"#fff",zIndex:201,boxShadow:"-4px 0 24px rgba(0,0,0,0.12)",
            display:"flex",flexDirection:"column",animation:"slideIn 0.22s ease"}}>
            {/* Header */}
            <div style={{padding:"18px 20px",borderBottom:"1px solid #E5E7EB",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontWeight:700,fontSize:16,color:"#111827"}}>My Check History</div>
                <div style={{fontSize:12,color:"#9CA3AF",marginTop:2}}>Last 15 checks — saved to your account</div>
              </div>
              <button onClick={()=>setShowHistory(false)}
                style={{background:"none",border:"none",fontSize:20,color:"#9CA3AF",cursor:"pointer",padding:"4px 6px",fontFamily:"inherit",lineHeight:1}}>✕</button>
            </div>
            {/* Body */}
            <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexDirection:"column",gap:10}}>
              {history.length===0&&(
                <div style={{textAlign:"center",padding:"40px 20px",color:"#9CA3AF",fontSize:14}}>
                  No checks yet — run your first fit check to see history here.
                </div>
              )}
              {history.map((h,i)=>{
                const resultMeta = {
                  fits:           { bg:"#ECFDF5", border:"#6EE7B7", color:"#065F46", icon:"🎉", label:"Fits" },
                  fits_folded:    { bg:"#EFF6FF", border:"#93C5FD", color:"#1E40AF", icon:"🚗", label:"Fits (seats folded)" },
                  fits_disassembled:{ bg:"#FFFBEB", border:"#FDE68A", color:"#92400E", icon:"🔧", label:"Try disassembling" },
                  no_fit:         { bg:"#FEF2F2", border:"#FCA5A5", color:"#991B1B", icon:"📦", label:"Doesn't fit" },
                }[h.result] || { bg:"#F3F4F6", border:"#E5E7EB", color:"#6B7280", icon:"❓", label:h.result };
                const date = new Date(h.created_at);
                const dateStr = date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
                return (
                  <div key={h.id||i} style={{borderRadius:10,border:`1.5px solid ${resultMeta.border}`,
                    background:resultMeta.bg,padding:"12px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:16}}>{resultMeta.icon}</span>
                        <span style={{fontSize:12,fontWeight:700,color:resultMeta.color}}>{resultMeta.label}</span>
                      </div>
                      <span style={{fontSize:11,color:"#9CA3AF"}}>{dateStr}</span>
                    </div>
                    <div style={{fontSize:13,fontWeight:600,color:"#111827",marginBottom:2,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.product_names||"—"}</div>
                    <div style={{fontSize:12,color:"#6B7280"}}>{h.car_make} {h.car_model} {h.car_year}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideIn { from{opacity:0;transform:translateX(32px)} to{opacity:1;transform:translateX(0)} }
        * { box-sizing: border-box; }
        button, a { touch-action: manipulation; }
        input, select, textarea { font-size: 16px !important; }
        select:disabled { opacity: 0.5; cursor: not-allowed; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #F3F4F6; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
      `}</style>
    </div>
  );
}
