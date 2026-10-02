import type { VehicleType } from "@/config/categories";

export type GenerationSeed = readonly [name: string, yearFrom: number, yearTo: number | null];
export type EngineSeed = readonly [label: string, fuel: string, engineCc: number, powerHp: number];

export type ModelSeed = {
  name: string;
  type: VehicleType;
  bodies: readonly string[];
  /** Approximate price of a recent example in EUR; used to derive realistic seed prices. */
  price: number;
  generations?: readonly GenerationSeed[];
  engines?: readonly EngineSeed[];
  years?: readonly [number, number];
  popularity?: number;
};

export type MakeSeed = { name: string; models: readonly ModelSeed[] };

const car = (
  name: string,
  bodies: string[],
  price: number,
  generations: GenerationSeed[] = [],
  engines: EngineSeed[] = [],
  popularity = 1,
): ModelSeed => ({ name, type: "car", bodies, price, generations, engines, popularity });

const model = (type: VehicleType, name: string, bodies: string[], price: number, years: [number, number] = [2008, 2025], engines: EngineSeed[] = []): ModelSeed => ({
  name,
  type,
  bodies,
  price,
  years,
  engines,
  popularity: 1,
});

const E = (label: string, fuel: string, cc: number, hp: number): EngineSeed => [label, fuel, cc, hp];

export const MAKES: readonly MakeSeed[] = [
  {
    name: "BMW",
    models: [
      car("1 Series", ["hatchback"], 32000, [["E87", 2004, 2011], ["F20", 2011, 2019], ["F40", 2019, null]], [E("116i", "petrol", 1598, 136), E("118d", "diesel", 1995, 150), E("120d", "diesel", 1995, 190), E("118i", "petrol", 1499, 140)], 2),
      car("3 Series", ["sedan", "wagon"], 48000, [["E90", 2005, 2012], ["F30", 2012, 2019], ["G20", 2019, null]], [E("318d", "diesel", 1995, 150), E("320d", "diesel", 1995, 190), E("320d xDrive", "diesel", 1995, 190), E("330i", "petrol", 1998, 258), E("330d", "diesel", 2993, 286), E("330e", "plugin-hybrid", 1998, 292)], 5),
      car("5 Series", ["sedan", "wagon"], 65000, [["E60", 2003, 2010], ["F10", 2010, 2017], ["G30", 2017, 2023], ["G60", 2023, null]], [E("520d", "diesel", 1995, 190), E("525d", "diesel", 2993, 218), E("530d xDrive", "diesel", 2993, 286), E("530i", "petrol", 1998, 252), E("540i xDrive", "petrol", 2998, 340)], 4),
      car("X1", ["crossover"], 45000, [["E84", 2009, 2015], ["F48", 2015, 2022], ["U11", 2022, null]], [E("sDrive18d", "diesel", 1995, 150), E("xDrive20d", "diesel", 1995, 190)], 2),
      car("X3", ["suv"], 58000, [["F25", 2010, 2017], ["G01", 2017, 2024], ["G45", 2024, null]], [E("xDrive20d", "diesel", 1995, 190), E("xDrive30d", "diesel", 2993, 286)], 3),
      car("X5", ["suv"], 85000, [["E70", 2007, 2013], ["F15", 2013, 2018], ["G05", 2018, null]], [E("xDrive30d", "diesel", 2993, 286), E("xDrive40d", "diesel", 2993, 340), E("xDrive45e", "plugin-hybrid", 2998, 394)], 3),
      model("motorcycle", "R 1250 GS", ["adventure"], 22000, [2019, 2024], [E("R 1250 GS", "petrol", 1254, 136)]),
      model("motorcycle", "S 1000 RR", ["sport"], 23000, [2015, 2025], [E("S 1000 RR", "petrol", 999, 207)]),
      model("motorcycle", "R nineT", ["naked"], 17000, [2014, 2024], [E("R nineT", "petrol", 1170, 110)]),
    ],
  },
  {
    name: "Mercedes-Benz",
    models: [
      car("A-Class", ["hatchback", "sedan"], 35000, [["W176", 2012, 2018], ["W177", 2018, null]], [E("A 180 d", "diesel", 1461, 116), E("A 200", "petrol", 1332, 163), E("A 250 e", "plugin-hybrid", 1332, 218)], 2),
      car("C-Class", ["sedan", "wagon"], 50000, [["W204", 2007, 2014], ["W205", 2014, 2021], ["W206", 2021, null]], [E("C 200 d", "diesel", 1597, 136), E("C 220 d", "diesel", 2143, 170), E("C 300", "petrol", 1991, 258), E("C 220 d 4MATIC", "diesel", 1993, 200)], 4),
      car("E-Class", ["sedan", "wagon"], 65000, [["W212", 2009, 2016], ["W213", 2016, 2023], ["W214", 2023, null]], [E("E 220 d", "diesel", 1950, 194), E("E 350 d", "diesel", 2987, 258), E("E 300 e", "plugin-hybrid", 1991, 320)], 4),
      car("S-Class", ["sedan"], 120000, [["W221", 2005, 2013], ["W222", 2013, 2020], ["W223", 2020, null]], [E("S 350 d", "diesel", 2925, 286), E("S 500 4MATIC", "petrol", 2999, 435)], 1),
      car("GLC", ["suv"], 62000, [["X253", 2015, 2022], ["X254", 2022, null]], [E("GLC 220 d 4MATIC", "diesel", 1950, 194), E("GLC 300 e", "plugin-hybrid", 1999, 313)], 2),
      car("GLE", ["suv"], 85000, [["W166", 2015, 2019], ["V167", 2019, null]], [E("GLE 350 d", "diesel", 2925, 272), E("GLE 400 d", "diesel", 2925, 330)], 2),
      model("van", "Sprinter", ["cargo-van", "minibus", "chassis-cab"], 55000, [2010, 2025], [E("314 CDI", "diesel", 2143, 143), E("316 CDI", "diesel", 2143, 163), E("319 CDI", "diesel", 2987, 190)]),
      model("van", "Vito", ["cargo-van", "passenger-van"], 45000, [2010, 2025], [E("114 CDI", "diesel", 2143, 136), E("116 CDI", "diesel", 2143, 163)]),
      model("truck", "Actros", ["tractor-unit", "tipper"], 135000, [2012, 2025], [E("1845", "diesel", 12809, 449), E("1851", "diesel", 12809, 510)]),
      model("truck", "Atego", ["box", "refrigerated"], 70000, [2010, 2025], [E("1224", "diesel", 5132, 238)]),
    ],
  },
  {
    name: "Audi",
    models: [
      car("A3", ["hatchback", "sedan"], 35000, [["8P", 2003, 2012], ["8V", 2012, 2020], ["8Y", 2020, null]], [E("1.6 TDI", "diesel", 1598, 115), E("2.0 TDI", "diesel", 1968, 150), E("35 TFSI", "petrol", 1498, 150)], 3),
      car("A4", ["sedan", "wagon"], 47000, [["B8", 2007, 2015], ["B9", 2015, 2024]], [E("2.0 TDI", "diesel", 1968, 150), E("2.0 TDI quattro", "diesel", 1968, 190), E("40 TFSI", "petrol", 1984, 204), E("3.0 TDI quattro", "diesel", 2967, 272)], 4),
      car("A6", ["sedan", "wagon"], 62000, [["C6", 2004, 2011], ["C7", 2011, 2018], ["C8", 2018, null]], [E("2.0 TDI", "diesel", 1968, 190), E("3.0 TDI quattro", "diesel", 2967, 272), E("45 TFSI", "petrol", 1984, 265)], 4),
      car("Q5", ["suv"], 60000, [["8R", 2008, 2017], ["FY", 2017, null]], [E("2.0 TDI quattro", "diesel", 1968, 190), E("40 TDI quattro", "diesel", 1968, 204)], 3),
      car("Q7", ["suv"], 85000, [["4L", 2006, 2015], ["4M", 2015, null]], [E("3.0 TDI quattro", "diesel", 2967, 272), E("50 TDI quattro", "diesel", 2967, 286)], 2),
    ],
  },
  {
    name: "Volkswagen",
    models: [
      car("Golf", ["hatchback", "wagon"], 30000, [["V", 2003, 2008], ["VI", 2008, 2012], ["VII", 2012, 2019], ["VIII", 2019, null]], [E("1.6 TDI", "diesel", 1598, 105), E("2.0 TDI", "diesel", 1968, 150), E("1.4 TSI", "petrol", 1395, 125), E("1.5 TSI", "petrol", 1498, 150), E("GTI", "petrol", 1984, 245)], 6),
      car("Passat", ["sedan", "wagon"], 40000, [["B6", 2005, 2010], ["B7", 2010, 2014], ["B8", 2014, 2023]], [E("1.6 TDI", "diesel", 1598, 120), E("2.0 TDI", "diesel", 1968, 150), E("2.0 TDI 4Motion", "diesel", 1968, 190), E("1.4 TSI GTE", "plugin-hybrid", 1395, 218)], 5),
      car("Polo", ["hatchback"], 22000, [["6R", 2009, 2017], ["AW", 2017, null]], [E("1.0 TSI", "petrol", 999, 95), E("1.4 TDI", "diesel", 1422, 90)], 3),
      car("Tiguan", ["suv"], 42000, [["5N", 2007, 2016], ["AD", 2016, 2024]], [E("2.0 TDI", "diesel", 1968, 150), E("2.0 TDI 4Motion", "diesel", 1968, 190), E("1.5 TSI", "petrol", 1498, 150)], 3),
      car("Touareg", ["suv"], 75000, [["7P", 2010, 2018], ["CR", 2018, null]], [E("3.0 TDI", "diesel", 2967, 262), E("3.0 V6 TDI", "diesel", 2967, 286)], 2),
      car("Touran", ["minivan"], 35000, [], [E("1.6 TDI", "diesel", 1598, 115), E("2.0 TDI", "diesel", 1968, 150)], 1),
      model("van", "Transporter", ["cargo-van", "passenger-van"], 45000, [2008, 2025], [E("2.0 TDI", "diesel", 1968, 150), E("2.0 BiTDI", "diesel", 1968, 204)]),
      model("van", "Crafter", ["cargo-van", "chassis-cab"], 52000, [2010, 2025], [E("2.0 TDI", "diesel", 1968, 140)]),
      model("van", "Caddy", ["cargo-van", "passenger-van"], 28000, [2010, 2025], [E("2.0 TDI", "diesel", 1968, 102)]),
    ],
  },
  {
    name: "Opel",
    models: [
      car("Astra", ["hatchback", "wagon"], 26000, [["H", 2004, 2010], ["J", 2009, 2015], ["K", 2015, 2021], ["L", 2021, null]], [E("1.6 CDTI", "diesel", 1598, 110), E("1.4 Turbo", "petrol", 1364, 140), E("1.4 LPG", "lpg", 1364, 140)], 3),
      car("Corsa", ["hatchback"], 20000, [["D", 2006, 2014], ["E", 2014, 2019], ["F", 2019, null]], [E("1.2", "petrol", 1229, 80), E("1.3 CDTI", "diesel", 1248, 95)], 2),
      car("Insignia", ["sedan", "wagon"], 35000, [["A", 2008, 2017], ["B", 2017, 2022]], [E("2.0 CDTI", "diesel", 1956, 170), E("1.6 CDTI", "diesel", 1598, 136)], 2),
      car("Zafira", ["minivan"], 28000, [], [E("1.6 CDTI", "diesel", 1598, 136), E("1.6 CNG", "cng", 1598, 150)], 1),
      model("van", "Vivaro", ["cargo-van", "passenger-van"], 36000, [2010, 2025], [E("1.6 CDTI", "diesel", 1598, 120)]),
    ],
  },
  {
    name: "Toyota",
    models: [
      car("Corolla", ["sedan", "hatchback", "wagon"], 28000, [["E150", 2006, 2012], ["E180", 2013, 2018], ["E210", 2018, null]], [E("1.6 VVT-i", "petrol", 1598, 132), E("1.8 Hybrid", "hybrid", 1798, 122), E("2.0 Hybrid", "hybrid", 1987, 184)], 3),
      car("Yaris", ["hatchback"], 20000, [], [E("1.5 Hybrid", "hybrid", 1490, 116), E("1.33", "petrol", 1329, 99)], 2),
      car("RAV4", ["suv"], 40000, [["XA40", 2013, 2018], ["XA50", 2018, null]], [E("2.5 Hybrid AWD", "hybrid", 2487, 222), E("2.2 D-4D", "diesel", 2231, 150)], 3),
      car("C-HR", ["crossover"], 32000, [], [E("1.8 Hybrid", "hybrid", 1798, 122)], 2),
      car("Land Cruiser", ["suv"], 80000, [], [E("2.8 D-4D", "diesel", 2755, 204), E("3.0 D-4D", "diesel", 2982, 190)], 1),
      model("construction", "8FBE15", ["forklift"], 18000, [2010, 2024]),
    ],
  },
  {
    name: "Skoda",
    models: [
      car("Octavia", ["sedan", "wagon"], 30000, [["II", 2004, 2013], ["III", 2013, 2020], ["IV", 2020, null]], [E("1.6 TDI", "diesel", 1598, 105), E("2.0 TDI", "diesel", 1968, 150), E("1.4 TSI", "petrol", 1395, 150), E("1.4 TSI G-TEC", "cng", 1395, 110), E("2.0 TDI 4x4", "diesel", 1968, 150)], 5),
      car("Superb", ["sedan", "wagon"], 42000, [["II", 2008, 2015], ["III", 2015, 2023]], [E("2.0 TDI", "diesel", 1968, 150), E("2.0 TDI 4x4", "diesel", 1968, 190)], 3),
      car("Fabia", ["hatchback", "wagon"], 18000, [], [E("1.0 TSI", "petrol", 999, 95), E("1.4 TDI", "diesel", 1422, 90)], 2),
      car("Kodiaq", ["suv"], 42000, [], [E("2.0 TDI 4x4", "diesel", 1968, 190), E("1.5 TSI", "petrol", 1498, 150)], 2),
      car("Karoq", ["crossover"], 33000, [], [E("1.6 TDI", "diesel", 1598, 115), E("1.5 TSI", "petrol", 1498, 150)], 1),
    ],
  },
  {
    name: "Renault",
    models: [
      car("Clio", ["hatchback", "wagon"], 19000, [["III", 2005, 2012], ["IV", 2012, 2019], ["V", 2019, null]], [E("1.5 dCi", "diesel", 1461, 90), E("0.9 TCe", "petrol", 898, 90), E("1.2 LPG", "lpg", 1149, 75)], 3),
      car("Megane", ["hatchback", "wagon"], 25000, [["III", 2008, 2016], ["IV", 2016, 2022]], [E("1.5 dCi", "diesel", 1461, 110), E("1.3 TCe", "petrol", 1332, 140)], 3),
      car("Captur", ["crossover"], 24000, [], [E("1.5 dCi", "diesel", 1461, 90), E("1.3 TCe", "petrol", 1332, 130)], 1),
      model("van", "Trafic", ["cargo-van", "passenger-van"], 38000, [2010, 2025], [E("2.0 dCi", "diesel", 1997, 145), E("1.6 dCi", "diesel", 1598, 125)]),
      model("van", "Master", ["cargo-van", "chassis-cab", "dropside"], 42000, [2010, 2025], [E("2.3 dCi", "diesel", 2298, 135)]),
      model("truck", "T", ["tractor-unit"], 110000, [2014, 2025], [E("T 480", "diesel", 12777, 480)]),
    ],
  },
  {
    name: "Peugeot",
    models: [
      car("208", ["hatchback"], 20000, [], [E("1.2 PureTech", "petrol", 1199, 100), E("1.5 BlueHDi", "diesel", 1499, 100)], 2),
      car("308", ["hatchback", "wagon"], 27000, [], [E("1.6 BlueHDi", "diesel", 1560, 120), E("1.2 PureTech", "petrol", 1199, 130)], 2),
      car("3008", ["crossover"], 35000, [], [E("1.5 BlueHDi", "diesel", 1499, 130), E("Hybrid4", "plugin-hybrid", 1598, 300)], 2),
      car("508", ["sedan", "wagon"], 38000, [], [E("2.0 BlueHDi", "diesel", 1997, 163)], 1),
      model("van", "Boxer", ["cargo-van", "chassis-cab"], 38000, [2010, 2025], [E("2.2 HDi", "diesel", 2179, 140)]),
    ],
  },
  {
    name: "Ford",
    models: [
      car("Focus", ["hatchback", "wagon"], 25000, [["Mk2", 2004, 2011], ["Mk3", 2011, 2018], ["Mk4", 2018, null]], [E("1.6 TDCi", "diesel", 1560, 115), E("1.0 EcoBoost", "petrol", 999, 125), E("2.0 TDCi", "diesel", 1997, 150)], 3),
      car("Fiesta", ["hatchback"], 18000, [], [E("1.0 EcoBoost", "petrol", 999, 100), E("1.4 TDCi", "diesel", 1399, 70)], 2),
      car("Mondeo", ["sedan", "wagon"], 33000, [], [E("2.0 TDCi", "diesel", 1997, 150), E("2.0 Hybrid", "hybrid", 1999, 187)], 2),
      car("Kuga", ["suv"], 35000, [], [E("2.0 TDCi AWD", "diesel", 1997, 150), E("2.5 PHEV", "plugin-hybrid", 2488, 225)], 2),
      car("Ranger", ["pickup"], 42000, [], [E("2.0 EcoBlue", "diesel", 1996, 213), E("3.2 TDCi", "diesel", 3198, 200)], 1),
      model("van", "Transit", ["cargo-van", "minibus", "chassis-cab"], 42000, [2010, 2025], [E("2.0 EcoBlue", "diesel", 1995, 130), E("2.2 TDCi", "diesel", 2198, 125)]),
      model("van", "Transit Custom", ["cargo-van", "passenger-van"], 40000, [2013, 2025], [E("2.0 EcoBlue", "diesel", 1995, 170)]),
    ],
  },
  {
    name: "Dacia",
    models: [
      car("Duster", ["suv"], 18000, [["I", 2010, 2017], ["II", 2017, 2024]], [E("1.5 dCi 4x4", "diesel", 1461, 110), E("1.6 LPG", "lpg", 1598, 115), E("1.3 TCe", "petrol", 1332, 130)], 3),
      car("Sandero", ["hatchback"], 13000, [], [E("1.0 TCe LPG", "lpg", 999, 100), E("0.9 TCe", "petrol", 898, 90)], 2),
      car("Logan", ["sedan", "wagon"], 12000, [], [E("1.5 dCi", "diesel", 1461, 90), E("1.0 LPG", "lpg", 999, 100)], 2),
    ],
  },
  {
    name: "Hyundai",
    models: [
      car("i30", ["hatchback", "wagon"], 24000, [], [E("1.6 CRDi", "diesel", 1582, 136), E("1.4 T-GDi", "petrol", 1353, 140)], 2),
      car("i20", ["hatchback"], 18000, [], [E("1.2", "petrol", 1248, 84)], 1),
      car("Tucson", ["suv"], 33000, [], [E("1.6 CRDi", "diesel", 1598, 136), E("1.6 T-GDi Hybrid", "hybrid", 1598, 230)], 2),
      model("construction", "HX220", ["excavator"], 120000, [2015, 2024]),
    ],
  },
  {
    name: "Kia",
    models: [
      car("Ceed", ["hatchback", "wagon"], 24000, [], [E("1.6 CRDi", "diesel", 1598, 136), E("1.5 T-GDi", "petrol", 1482, 160)], 2),
      car("Sportage", ["suv"], 34000, [], [E("1.6 CRDi AWD", "diesel", 1598, 136), E("1.6 T-GDi HEV", "hybrid", 1598, 230)], 2),
      car("Sorento", ["suv"], 45000, [], [E("2.2 CRDi AWD", "diesel", 2151, 202)], 1),
    ],
  },
  {
    name: "Honda",
    models: [
      car("Civic", ["hatchback", "sedan"], 28000, [], [E("1.5 VTEC Turbo", "petrol", 1498, 182), E("2.0 e:HEV", "hybrid", 1993, 184), E("1.6 i-DTEC", "diesel", 1597, 120)], 1),
      car("CR-V", ["suv"], 40000, [], [E("2.0 Hybrid AWD", "hybrid", 1993, 184), E("1.6 i-DTEC 4WD", "diesel", 1597, 160)], 1),
      model("motorcycle", "CBR600RR", ["sport"], 13000, [2008, 2024], [E("CBR600RR", "petrol", 599, 121)]),
      model("motorcycle", "CB500F", ["naked"], 7000, [2013, 2025], [E("CB500F", "petrol", 471, 48)]),
      model("motorcycle", "Africa Twin", ["adventure"], 16000, [2016, 2025], [E("CRF1100L", "petrol", 1084, 102)]),
      model("motorcycle", "PCX 125", ["scooter"], 3800, [2012, 2025], [E("PCX 125", "petrol", 125, 12)]),
    ],
  },
  {
    name: "Mazda",
    models: [
      car("3", ["hatchback", "sedan"], 27000, [], [E("2.0 Skyactiv-G", "petrol", 1998, 122), E("1.8 Skyactiv-D", "diesel", 1759, 116)], 1),
      car("6", ["sedan", "wagon"], 33000, [], [E("2.2 Skyactiv-D", "diesel", 2191, 150), E("2.5 Skyactiv-G", "petrol", 2488, 194)], 1),
      car("CX-5", ["suv"], 36000, [], [E("2.2 Skyactiv-D AWD", "diesel", 2191, 184), E("2.0 Skyactiv-G", "petrol", 1998, 165)], 2),
    ],
  },
  {
    name: "Volvo",
    models: [
      car("XC60", ["suv"], 55000, [], [E("D4 AWD", "diesel", 1969, 190), E("B5 AWD", "hybrid", 1969, 250), E("T8 Recharge", "plugin-hybrid", 1969, 455)], 2),
      car("XC90", ["suv"], 75000, [], [E("D5 AWD", "diesel", 1969, 235), E("B5 AWD", "hybrid", 1969, 235)], 2),
      car("V60", ["wagon"], 45000, [], [E("D4", "diesel", 1969, 190), E("B4", "hybrid", 1969, 197)], 1),
      car("S60", ["sedan"], 44000, [], [E("D4", "diesel", 1969, 190)], 1),
      model("truck", "FH", ["tractor-unit"], 135000, [2012, 2025], [E("FH 500", "diesel", 12777, 500), E("FH 460", "diesel", 12777, 460)]),
      model("truck", "FM", ["tipper", "box"], 105000, [2012, 2025], [E("FM 410", "diesel", 10837, 410)]),
      model("construction", "EC220", ["excavator"], 140000, [2012, 2024]),
      model("construction", "L90", ["wheel-loader"], 120000, [2010, 2024]),
    ],
  },
  {
    name: "Nissan",
    models: [
      car("Qashqai", ["crossover"], 30000, [["J10", 2006, 2013], ["J11", 2013, 2021], ["J12", 2021, null]], [E("1.5 dCi", "diesel", 1461, 110), E("1.3 DIG-T", "petrol", 1332, 140), E("1.6 dCi 4x4", "diesel", 1598, 130)], 3),
      car("X-Trail", ["suv"], 38000, [], [E("1.6 dCi 4x4", "diesel", 1598, 130)], 1),
      car("Navara", ["pickup"], 40000, [], [E("2.3 dCi 4x4", "diesel", 2298, 190)], 1),
    ],
  },
  {
    name: "Seat",
    models: [
      car("Leon", ["hatchback", "wagon"], 26000, [], [E("2.0 TDI", "diesel", 1968, 150), E("1.5 TSI", "petrol", 1498, 150)], 2),
      car("Ibiza", ["hatchback"], 18000, [], [E("1.0 TSI", "petrol", 999, 95)], 1),
    ],
  },
  {
    name: "Citroen",
    models: [
      car("C3", ["hatchback"], 18000, [], [E("1.2 PureTech", "petrol", 1199, 83), E("1.5 BlueHDi", "diesel", 1499, 100)], 1),
      car("C4", ["hatchback"], 24000, [], [E("1.5 BlueHDi", "diesel", 1499, 130)], 1),
      car("Berlingo", ["minivan"], 25000, [], [E("1.5 BlueHDi", "diesel", 1499, 100)], 1),
      model("van", "Jumper", ["cargo-van", "chassis-cab"], 37000, [2010, 2025], [E("2.2 BlueHDi", "diesel", 2179, 140)]),
    ],
  },
  {
    name: "Fiat",
    models: [
      car("500", ["hatchback", "convertible"], 17000, [], [E("1.2", "petrol", 1242, 69), E("1.0 Hybrid", "hybrid", 999, 70)], 1),
      car("Tipo", ["sedan", "hatchback", "wagon"], 19000, [], [E("1.6 MultiJet", "diesel", 1598, 120), E("1.4 LPG", "lpg", 1368, 120)], 1),
      model("van", "Ducato", ["cargo-van", "chassis-cab", "minibus"], 40000, [2010, 2025], [E("2.3 MultiJet", "diesel", 2287, 140)]),
    ],
  },
  {
    name: "Tesla",
    models: [
      car("Model 3", ["sedan"], 45000, [], [E("Long Range AWD", "electric", 0, 498), E("RWD", "electric", 0, 325)], 2),
      car("Model Y", ["crossover"], 50000, [], [E("Long Range AWD", "electric", 0, 514)], 2),
    ],
  },
  {
    name: "Porsche",
    models: [
      car("Cayenne", ["suv"], 110000, [], [E("3.0 V6", "petrol", 2995, 340), E("E-Hybrid", "plugin-hybrid", 2995, 470), E("3.0 Diesel", "diesel", 2967, 262)], 1),
      car("Macan", ["crossover"], 75000, [], [E("2.0", "petrol", 1984, 265), E("S", "petrol", 2894, 380)], 1),
      car("911", ["coupe", "convertible"], 140000, [], [E("Carrera", "petrol", 2981, 385), E("Carrera S", "petrol", 2981, 450)], 1),
    ],
  },
  {
    name: "Land Rover",
    models: [
      car("Range Rover Sport", ["suv"], 100000, [], [E("3.0 SDV6", "diesel", 2993, 306), E("P400e", "plugin-hybrid", 1997, 404)], 1),
      car("Discovery", ["suv"], 75000, [], [E("3.0 SDV6", "diesel", 2993, 306)], 1),
    ],
  },
  {
    name: "Mitsubishi",
    models: [
      car("L200", ["pickup"], 35000, [], [E("2.4 DI-D 4WD", "diesel", 2442, 181)], 1),
      car("Outlander", ["suv"], 35000, [], [E("2.4 PHEV", "plugin-hybrid", 2360, 224), E("2.2 DI-D", "diesel", 2268, 150)], 1),
    ],
  },
  {
    name: "Lexus",
    models: [
      car("RX", ["suv"], 70000, [], [E("450h AWD", "hybrid", 3456, 313)], 1),
      car("IS", ["sedan"], 45000, [], [E("300h", "hybrid", 2494, 223)], 1),
    ],
  },
  {
    name: "Jeep",
    models: [
      car("Grand Cherokee", ["suv"], 65000, [], [E("3.0 CRD", "diesel", 2987, 250)], 1),
      car("Wrangler", ["suv"], 55000, [], [E("2.0 Turbo", "petrol", 1995, 272), E("2.2 CRD", "diesel", 2143, 200)], 1),
    ],
  },
  {
    name: "Suzuki",
    models: [
      car("Vitara", ["crossover"], 25000, [], [E("1.4 BoosterJet AllGrip", "petrol", 1373, 140)], 1),
      car("Swift", ["hatchback"], 17000, [], [E("1.2 Hybrid", "hybrid", 1197, 83)], 1),
      model("motorcycle", "V-Strom 650", ["adventure"], 9500, [2012, 2024], [E("DL650", "petrol", 645, 71)]),
      model("motorcycle", "GSX-R750", ["sport"], 12500, [2011, 2023], [E("GSX-R750", "petrol", 750, 150)]),
    ],
  },
  {
    name: "Subaru",
    models: [
      car("Forester", ["suv"], 38000, [], [E("2.0 e-Boxer", "hybrid", 1995, 150), E("2.0D", "diesel", 1998, 147)], 1),
      car("Outback", ["wagon"], 42000, [], [E("2.5i", "petrol", 2498, 169)], 1),
    ],
  },
  {
    name: "Iveco",
    models: [
      model("van", "Daily", ["cargo-van", "chassis-cab", "dropside"], 48000, [2010, 2025], [E("35S16", "diesel", 2287, 156), E("50C18", "diesel", 2998, 180)]),
      model("truck", "Stralis", ["tractor-unit"], 90000, [2010, 2019], [E("AS440S46", "diesel", 12882, 460)]),
      model("truck", "S-Way", ["tractor-unit"], 115000, [2019, 2025], [E("AS440S49", "diesel", 12882, 490)]),
    ],
  },
  { name: "MAN", models: [model("truck", "TGX", ["tractor-unit"], 130000, [2010, 2025], [E("18.470", "diesel", 12419, 470), E("18.510", "diesel", 12419, 510)]), model("truck", "TGS", ["tipper", "box", "flatbed"], 110000, [2010, 2025], [E("26.440", "diesel", 10518, 440)])] },
  { name: "Scania", models: [model("truck", "R", ["tractor-unit"], 140000, [2010, 2025], [E("R 450", "diesel", 12742, 450), E("R 500", "diesel", 12742, 500)]), model("truck", "S", ["tractor-unit"], 150000, [2016, 2025], [E("S 500", "diesel", 12742, 500)])] },
  { name: "DAF", models: [model("truck", "XF", ["tractor-unit"], 120000, [2010, 2025], [E("XF 480", "diesel", 12902, 480)]), model("truck", "CF", ["box", "tipper"], 95000, [2010, 2025], [E("CF 400", "diesel", 10837, 400)])] },
  {
    name: "Yamaha",
    models: [
      model("motorcycle", "MT-07", ["naked"], 8500, [2014, 2025], [E("MT-07", "petrol", 689, 73)]),
      model("motorcycle", "MT-09", ["naked"], 11000, [2014, 2025], [E("MT-09", "petrol", 890, 119)]),
      model("motorcycle", "YZF-R1", ["sport"], 20000, [2009, 2025], [E("R1", "petrol", 998, 200)]),
      model("motorcycle", "Tracer 9", ["touring"], 15000, [2021, 2025], [E("Tracer 9", "petrol", 890, 119)]),
      model("motorcycle", "XMAX 300", ["scooter"], 7000, [2017, 2025], [E("XMAX 300", "petrol", 292, 28)]),
    ],
  },
  {
    name: "Kawasaki",
    models: [
      model("motorcycle", "Ninja 650", ["sport"], 8500, [2012, 2025], [E("Ninja 650", "petrol", 649, 68)]),
      model("motorcycle", "Z900", ["naked"], 10500, [2017, 2025], [E("Z900", "petrol", 948, 125)]),
      model("motorcycle", "Versys 650", ["touring"], 9500, [2010, 2025], [E("Versys 650", "petrol", 649, 67)]),
    ],
  },
  {
    name: "KTM",
    models: [
      model("motorcycle", "390 Duke", ["naked"], 6000, [2013, 2025], [E("390 Duke", "petrol", 373, 44)]),
      model("motorcycle", "790 Adventure", ["adventure"], 13000, [2019, 2025], [E("790 Adventure", "petrol", 799, 95)]),
      model("motorcycle", "450 SX-F", ["cross"], 11000, [2015, 2025], [E("450 SX-F", "petrol", 450, 63)]),
    ],
  },
  { name: "Harley-Davidson", models: [model("motorcycle", "Sportster", ["cruiser"], 13000, [2008, 2022], [E("Iron 883", "petrol", 883, 50)]), model("motorcycle", "Fat Boy", ["cruiser"], 24000, [2010, 2025], [E("Fat Boy 114", "petrol", 1868, 94)])] },
  { name: "Ducati", models: [model("motorcycle", "Monster", ["naked"], 13000, [2010, 2025], [E("Monster 937", "petrol", 937, 111)]), model("motorcycle", "Multistrada V4", ["adventure"], 26000, [2021, 2025], [E("Multistrada V4 S", "petrol", 1158, 170)])] },
  { name: "Hobby", models: [model("caravan", "De Luxe", ["standard"], 25000, [2008, 2025]), model("caravan", "Prestige", ["standard", "twin-axle"], 32000, [2010, 2025]), model("caravan", "Ontour", ["compact"], 21000, [2010, 2025])] },
  { name: "Knaus", models: [model("caravan", "Sport", ["standard"], 27000, [2008, 2025]), model("camper", "Sky TI", ["semi-integrated"], 72000, [2012, 2025], [E("2.3 MultiJet", "diesel", 2287, 140)]), model("camper", "Van TI", ["semi-integrated"], 68000, [2014, 2025], [E("2.0 TDI", "diesel", 1968, 140)])] },
  { name: "Adria", models: [model("caravan", "Altea", ["standard"], 22000, [2008, 2025]), model("caravan", "Adora", ["standard", "twin-axle"], 28000, [2010, 2025]), model("camper", "Coral", ["semi-integrated", "alcove"], 65000, [2010, 2025], [E("2.3 MultiJet", "diesel", 2287, 140)]), model("camper", "Twin", ["van-conversion"], 58000, [2012, 2025], [E("2.2 BlueHDi", "diesel", 2179, 140)])] },
  { name: "Fendt", models: [model("caravan", "Bianco", ["standard"], 30000, [2010, 2025]), model("agri", "Vario 724", ["tractor"], 180000, [2012, 2025], [E("724 Vario", "diesel", 6057, 246)]), model("agri", "Vario 936", ["tractor"], 260000, [2012, 2025], [E("936 Vario", "diesel", 9038, 360)])] },
  { name: "Dethleffs", models: [model("caravan", "Camper", ["standard"], 28000, [2010, 2025]), model("camper", "Trend", ["semi-integrated"], 70000, [2012, 2025], [E("2.3 MultiJet", "diesel", 2287, 140)])] },
  { name: "Hymer", models: [model("camper", "B-Class", ["integrated"], 90000, [2010, 2025], [E("2.3 MultiJet", "diesel", 2287, 150)]), model("camper", "Exsis", ["semi-integrated"], 78000, [2012, 2025], [E("2.3 MultiJet", "diesel", 2287, 140)])] },
  { name: "Bürstner", models: [model("camper", "Lyseo", ["semi-integrated"], 75000, [2012, 2025], [E("2.3 MultiJet", "diesel", 2287, 140)])] },
  { name: "John Deere", models: [model("agri", "6155R", ["tractor"], 150000, [2012, 2025], [E("6155R", "diesel", 6800, 155)]), model("agri", "8R 370", ["tractor"], 290000, [2014, 2025], [E("8R 370", "diesel", 9000, 370)]), model("agri", "S780", ["combine"], 380000, [2018, 2025], [E("S780", "diesel", 13500, 543)])] },
  { name: "Claas", models: [model("agri", "Arion 650", ["tractor"], 140000, [2012, 2025], [E("Arion 650", "diesel", 6800, 205)]), model("agri", "Lexion 760", ["combine"], 300000, [2012, 2025], [E("Lexion 760", "diesel", 12800, 530)])] },
  { name: "New Holland", models: [model("agri", "T7.270", ["tractor"], 160000, [2012, 2025], [E("T7.270", "diesel", 6700, 270)]), model("agri", "CX8.80", ["combine"], 280000, [2015, 2025], [E("CX8.80", "diesel", 11100, 449)])] },
  { name: "Case IH", models: [model("agri", "Puma 165", ["tractor"], 140000, [2012, 2025], [E("Puma 165", "diesel", 6700, 165)])] },
  { name: "Massey Ferguson", models: [model("agri", "MF 5713", ["tractor"], 85000, [2014, 2025], [E("MF 5713", "diesel", 4400, 130)])] },
  { name: "Беларус", models: [model("agri", "МТЗ 82", ["tractor"], 28000, [2005, 2025], [E("МТЗ 82.1", "diesel", 4750, 81)]), model("agri", "МТЗ 1221", ["tractor"], 45000, [2005, 2025], [E("МТЗ 1221.2", "diesel", 7120, 132)])] },
  { name: "Amazone", models: [model("agri", "UX 5201", ["sprayer"], 55000, [2012, 2025])] },
  { name: "Horsch", models: [model("agri", "Pronto 6 DC", ["seeder"], 90000, [2012, 2025])] },
  { name: "Kverneland", models: [model("agri", "PG 100", ["plough"], 22000, [2010, 2025])] },
  { name: "Caterpillar", models: [model("construction", "320", ["excavator"], 160000, [2010, 2025], [E("320", "diesel", 4400, 162)]), model("construction", "966", ["wheel-loader"], 210000, [2010, 2025], [E("966M", "diesel", 9300, 290)]), model("construction", "428", ["backhoe-loader"], 75000, [2010, 2025], [E("428F", "diesel", 4400, 92)]), model("construction", "D6", ["bulldozer"], 230000, [2010, 2025], [E("D6T", "diesel", 9300, 215)])] },
  { name: "JCB", models: [model("construction", "3CX", ["backhoe-loader"], 70000, [2008, 2025], [E("3CX Eco", "diesel", 4400, 92)]), model("construction", "JS220", ["excavator"], 120000, [2010, 2025], [E("JS220", "diesel", 4800, 173)]), model("construction", "8026", ["mini-excavator"], 30000, [2012, 2025], [E("8026 CTS", "diesel", 1500, 24)])] },
  { name: "Komatsu", models: [model("construction", "PC210", ["excavator"], 125000, [2010, 2025], [E("PC210LC", "diesel", 6690, 165)]), model("construction", "WA380", ["wheel-loader"], 150000, [2010, 2025], [E("WA380", "diesel", 6690, 191)])] },
  { name: "Liebherr", models: [model("construction", "R 920", ["excavator"], 150000, [2012, 2025], [E("R 920", "diesel", 4500, 150)]), model("construction", "LTM 1060", ["crane"], 420000, [2010, 2025], [E("LTM 1060-3.1", "diesel", 7790, 455)])] },
  { name: "Bobcat", models: [model("construction", "E35", ["mini-excavator"], 38000, [2012, 2025], [E("E35z", "diesel", 1600, 25)])] },
  { name: "Bomag", models: [model("construction", "BW 213", ["roller"], 85000, [2010, 2025], [E("BW 213 D-5", "diesel", 4040, 130)])] },
  { name: "Linde", models: [model("construction", "H30", ["forklift"], 22000, [2010, 2025], [E("H30D", "diesel", 2700, 60)])] },
  { name: "Schmitz Cargobull", models: [model("trailer", "S.KO", ["box", "refrigerated"], 45000, [2010, 2025]), model("trailer", "S.CS", ["curtainsider"], 32000, [2010, 2025])] },
  { name: "Krone", models: [model("trailer", "Profi Liner", ["curtainsider"], 30000, [2010, 2025]), model("trailer", "Cool Liner", ["refrigerated"], 48000, [2010, 2025])] },
  { name: "Kögel", models: [model("trailer", "Cargo", ["curtainsider", "box"], 29000, [2010, 2025])] },
  { name: "Wielton", models: [model("trailer", "NW", ["tipper"], 35000, [2012, 2025])] },
  { name: "Goldhofer", models: [model("trailer", "STZ", ["lowloader"], 90000, [2010, 2025])] },
  { name: "Humbaur", models: [model("trailer", "HTK", ["car-trailer", "platform"], 4500, [2010, 2025]), model("trailer", "Steely", ["platform"], 1800, [2010, 2025])] },
  { name: "Brenderup", models: [model("trailer", "1205", ["platform"], 1300, [2008, 2025]), model("trailer", "Cargo", ["box"], 3500, [2010, 2025])] },
  { name: "Böckmann", models: [model("trailer", "AN-AL", ["car-trailer"], 5000, [2012, 2025]), model("trailer", "BT", ["boat"], 3200, [2010, 2025])] },
];
