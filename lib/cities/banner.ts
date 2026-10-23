export const BANNER_W = 20;
export const BANNER_H = 40;
export const BANNER_MAX_LAYERS = 16;

export const DYE_COLORS = [
  { id: "white", label: "Белый", hex: "#F9FFFE" },
  { id: "orange", label: "Оранжевый", hex: "#F9801D" },
  { id: "magenta", label: "Пурпурный", hex: "#C74EBD" },
  { id: "light_blue", label: "Голубой", hex: "#3AB3DA" },
  { id: "yellow", label: "Жёлтый", hex: "#FED83D" },
  { id: "lime", label: "Лаймовый", hex: "#80C71F" },
  { id: "pink", label: "Розовый", hex: "#F38BAA" },
  { id: "gray", label: "Серый", hex: "#474F52" },
  { id: "light_gray", label: "Светло-серый", hex: "#9D9D97" },
  { id: "cyan", label: "Бирюзовый", hex: "#169C9C" },
  { id: "purple", label: "Фиолетовый", hex: "#8932B8" },
  { id: "blue", label: "Синий", hex: "#3C44AA" },
  { id: "brown", label: "Коричневый", hex: "#835432" },
  { id: "green", label: "Зелёный", hex: "#5E7C16" },
  { id: "red", label: "Красный", hex: "#B02E26" },
  { id: "black", label: "Чёрный", hex: "#1D1D21" },
] as const;

export type DyeColor = (typeof DYE_COLORS)[number]["id"];
const COLOR_BY_ID = new Map<string, (typeof DYE_COLORS)[number]>(
  DYE_COLORS.map((color) => [color.id, color]),
);

export function isDyeColor(value: string): value is DyeColor {
  return COLOR_BY_ID.has(value);
}

export function dyeHex(color: DyeColor): string {
  const found = COLOR_BY_ID.get(color);
  if (!found) throw new Error(`Unknown banner dye: ${color}`);
  return found.hex;
}

type Mask = (x: number, y: number) => number;

const VANILLA_MASK_RLE = {
  stripe_bottom: "/wD/AAoAFL///wX/",
  stripe_top: "//8F/xS//wD/AAoA",
  stripe_left:
    "CP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAA==",
  stripe_right:
    "DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/wwACP8MAAj/DAAI/w==",
  stripe_center:
    "BwABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8HAA==",
  stripe_middle: "/wBVABS/UP8Uv/8AVQA=",
  stripe_downright:
    "A/8RAAP/EQAE/xAABP8QAAX/DwAF/xAABf8PAAX/EAAF/w8ABf8QAAX/DwAF/xAABf8PAAX/EAAF/w8ABf8QAAX/DwAF/xAABf8PAAX/EAAF/w8ABf8QAAX/DwAF/xAABf8PAAX/EAAF/w8ABf8QAAX/DwAF/xAABf8PAAX/EAAF/w8ABf8QAAX/DwAF/xAABP8QAAT/EQAD/xEAA/8=",
  stripe_downleft:
    "EQAD/xEAA/8QAAT/EAAE/w8ABf8PAAX/DgAF/w8ABf8OAAX/DwAF/w4ABf8PAAX/DgAF/w8ABf8OAAX/DwAF/w4ABf8PAAX/DgAF/w8ABf8OAAX/DwAF/w4ABf8PAAX/DgAF/w8ABf8OAAX/DwAF/w4ABf8PAAX/DgAF/w8ABf8OAAX/DwAF/w4ABf8PAAX/DwAE/xAABP8QAAP/EQAD/xEA",
  small_stripes:
    "Av8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgAC/wIAAv8CAAL/AgA=",
  cross:
    "Av8Bvw4AAb8E/wG/DgABvwX/Ab8MAAG/Bv8BvwwAAb8D/wG/A/8BvwoAAb8D/wK/A/8BvwoAAb8D/wG/AQABvwP/Ab8IAAG/A/8BvwIAAb8D/wG/CAABvwP/Ab8DAAG/A/8BvwYAAb8D/wG/BAABvwP/Ab8GAAG/A/8BvwUAAb8D/wG/BAABvwP/Ab8GAAG/A/8BvwQAAb8D/wG/BwABvwP/Ab8CAAG/A/8BvwgAAb8D/wG/AgABvwP/Ab8JAAG/A/8CvwP/Ab8KAAG/A/8CvwP/Ab8LAAG/Bv8BvwwAAb8G/wG/DQABvwT/Ab8OAAG/BP8Bvw4AAb8E/wG/DgABvwT/Ab8NAAG/Bv8BvwwAAb8G/wG/CwABvwP/Ar8D/wG/CgABvwP/Ar8D/wG/CQABvwP/Ab8CAAG/A/8BvwgAAb8D/wG/AgABvwP/Ab8HAAG/A/8BvwQAAb8D/wG/BgABvwP/Ab8EAAG/A/8BvwUAAb8D/wG/BgABvwP/Ab8EAAG/A/8BvwYAAb8D/wG/AwABvwP/Ab8IAAG/A/8BvwIAAb8D/wG/CAABvwP/Ab8BAAG/A/8BvwoAAb8D/wK/A/8BvwoAAb8D/wG/A/8BvwwAAb8G/wG/DAABvwX/Ab8OAAG/BP8Bvw4AAb8C/w==",
  straight_cross:
    "CAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/CAAJvwL/Cb8o/wm/Av8JvwgAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvxAAAb8C/wG/EAABvwL/Ab8QAAG/Av8BvwgA",
  diagonal_left:
    "E/8BvxP/Ab8S/wG/AQAS/wG/AQAR/wG/AgAR/wG/AgAQ/wG/AwAQ/wG/AwAP/wG/BAAP/wG/BAAO/wG/BQAO/wG/BQAN/wG/BgAN/wG/BgAM/wG/BwAM/wG/BwAL/wG/CAAL/wG/CAAK/wG/CQAK/wG/CQAJ/wG/CgAJ/wG/CgAI/wG/CwAI/wG/CwAH/wG/DAAH/wG/DAAG/wG/DQAG/wG/DQAF/wG/DgAF/wG/DgAE/wG/DwAE/wG/DwAD/wG/EAAD/wG/EAAC/wG/EQAC/wG/EQAB/wG/EgAB/wG/EgABvxMAAb8TAA==",
  diagonal_right:
    "Ab8T/wG/E/8BAAG/Ev8BAAG/Ev8CAAG/Ef8CAAG/Ef8DAAG/EP8DAAG/EP8EAAG/D/8EAAG/D/8FAAG/Dv8FAAG/Dv8GAAG/Df8GAAG/Df8HAAG/DP8HAAG/DP8IAAG/C/8IAAG/C/8JAAG/Cv8JAAG/Cv8KAAG/Cf8KAAG/Cf8LAAG/CP8LAAG/CP8MAAG/B/8MAAG/B/8NAAG/Bv8NAAG/Bv8OAAG/Bf8OAAG/Bf8PAAG/BP8PAAG/BP8QAAG/A/8QAAG/A/8RAAG/Av8RAAG/Av8SAAG/Af8SAAG/Af8TAAG/EwABvw==",
  diagonal_up_left:
    "Ab8TAAG/EwAB/wG/EgAB/wG/EgAC/wG/EQAC/wG/EQAD/wG/EAAD/wG/EAAE/wG/DwAE/wG/DwAF/wG/DgAF/wG/DgAG/wG/DQAG/wG/DQAH/wG/DAAH/wG/DAAI/wG/CwAI/wG/CwAJ/wG/CgAJ/wG/CgAK/wG/CQAK/wG/CQAL/wG/CAAL/wG/CAAM/wG/BwAM/wG/BwAN/wG/BgAN/wG/BgAO/wG/BQAO/wG/BQAP/wG/BAAP/wG/BAAQ/wG/AwAQ/wG/AwAR/wG/AgAR/wG/AgAS/wG/AQAS/wG/AQAT/wG/E/8Bvw==",
  diagonal_up_right:
    "EwABvxMAAb8SAAG/Af8SAAG/Af8RAAG/Av8RAAG/Av8QAAG/A/8QAAG/A/8PAAG/BP8PAAG/BP8OAAG/Bf8OAAG/Bf8NAAG/Bv8NAAG/Bv8MAAG/B/8MAAG/B/8LAAG/CP8LAAG/CP8KAAG/Cf8KAAG/Cf8JAAG/Cv8JAAG/Cv8IAAG/C/8IAAG/C/8HAAG/DP8HAAG/DP8GAAG/Df8GAAG/Df8FAAG/Dv8FAAG/Dv8EAAG/D/8EAAG/D/8DAAG/EP8DAAG/EP8CAAG/Ef8CAAG/Ef8BAAG/Ev8BAAG/Ev8BvxP/Ab8T/w==",
  half_vertical:
    "Cv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAA==",
  half_vertical_right:
    "CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/woACv8KAAr/CgAK/w==",
  half_horizontal: "//+R/xSA/wB9AA==",
  half_horizontal_bottom: "/wB9ABSA//+R/w==",
  square_top_left:
    "Cf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACf8BvwoACr//AP8AFAA=",
  square_top_right:
    "CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgABvwn/CgAKv/8A/wAKAA==",
  square_bottom_left:
    "/wD/AAoACr8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAAn/Ab8KAA==",
  square_bottom_right:
    "/wD/ABQACr8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8KAAG/Cf8=",
  triangle_bottom:
    "/wCuAAL/EgAC/xEABP8QAAT/DwAG/w4ABv8NAAj/DAAI/wsACv8KAAr/CQAM/wgADP8HAA7/BgAO/wUAEP8EABD/AwAS/wIAEv8BABT/",
  triangle_top:
    "FP8BvxL/Ar8S/wG/AQABvxD/Ab8CAAG/EP8BvwMAAb8O/wG/BAABvw7/Ab8FAAG/DP8BvwYAAb8M/wG/BwABvwr/Ab8IAAG/Cv8BvwkAAb8I/wG/CgABvwj/Ab8LAAG/Bv8BvwwAAb8G/wG/DQABvwT/Ab8OAAG/BP8Bvw8AAb8C/wG/EAABvwL/Ab8RAAK//wCaAA==",
  triangles_bottom:
    "/wD/AJgAAr8FAAK/BQACvwMAAb8C/wG/AwABvwL/Ab8DAAG/Av8BvwIAAb8C/wG/AwABvwL/Ab8DAAG/Av8BvwEAAb8E/wG/AQABvwT/Ab8BAAG/BP8CvwT/Ab8BAAG/BP8BvwEAAb8E/wG/Bv8Bvwb/Ab8a/w==",
  triangles_top:
    "Gv8Bvwb/Ab8G/wG/BP8BvwEAAb8E/wG/AQABvwT/Ar8E/wG/AQABvwT/Ab8BAAG/BP8BvwEAAb8C/wG/AwABvwL/Ab8DAAG/Av8BvwIAAb8C/wG/AwABvwL/Ab8DAAG/Av8BvwMAAr8FAAK/BQACv/8A/wCYAA==",
  circle:
    "/wAiAAK/EAACvwL/Ar8NAAG/Bv8BvwsAAb8I/wG/CgABvwj/Ab8JAAG/Cv8BvwgAAb8K/wG/CQABvwj/Ab8KAAG/CP8BvwsAAb8G/wG/DQACvwL/Ar8QAAK//wAiAA==",
  rhombus:
    "qQACvxEAAb8C/wG/EAABvwL/Ab8PAAG/BP8Bvw4AAb8E/wG/DQABvwb/Ab8MAAG/Bv8BvwsAAb8I/wG/CgABvwj/Ab8JAAG/Cv8BvwgAAb8K/wG/BwABvwz/Ab8GAAG/DP8BvwcAAb8K/wG/CAABvwr/Ab8JAAG/CP8BvwoAAb8I/wG/CwABvwb/Ab8MAAG/Bv8Bvw0AAb8E/wG/DgABvwT/Ab8PAAG/Av8BvxAAAb8C/wG/EQACv6kA",
  border:
    "Kv8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAABP8QAAT/EAAE/xAAKv8=",
  curly_border:
    "Cf8CvxD/Ar8CAAK/Df8BvwYAAb8M/wG/BgABvwr/Ar8IAAK/CP8BvwoAAb8G/wK/DAACvwP/Ab8QAAG/Av8BvxAAAb8B/wG/EgACvxIAAb8B/wG/EAABvwL/Ab8QAAG/A/8CvwwAAr8G/wG/CgABvwj/Ab8KAAG/Bv8CvwwAAr8D/wG/EAABvwL/Ab8QAAG/Af8BvxIAAr8SAAG/Af8BvxAAAb8C/wG/EAABvwP/Ar8MAAK/Bv8BvwoAAb8I/wG/CgABvwb/Ar8MAAK/A/8BvxAAAb8C/wG/EAABvwH/Ab8SAAK/EgABvwH/Ab8QAAG/Av8BvxAAAb8D/wK/DAACvwb/Ab8KAAG/CP8CvwgAAr8K/wG/BgABvwz/Ab8GAAG/Df8CvwIAAr8Q/wK/Cf8=",
  bricks:
    "BP8B5gEABP8B5gEABP8B5gEABv8BvwEABP8BvwEABP8BvwEAAv8FvwEABb8BAAW/AQACvxQAAf8B5gEABP8B5gEABP8B5gEABP8B5gH/Ab8BAAT/Ab8BAAT/Ab8BAAT/A78BAAW/AQAFvwEABb8UAAT/AeYBAAT/AeYBAAT/AeYBAAb/Ab8BAAT/Ab8BAAT/Ab8BAAL/Bb8BAAW/AQAFvwEAAr8UAAH/AeYBAAT/AeYBAAT/AeYBAAT/AeYB/wG/AQAE/wG/AQAE/wG/AQAE/wO/AQAFvwEABb8BAAW/FAAE/wHmAQAE/wHmAQAE/wHmAQAG/wG/AQAE/wG/AQAE/wG/AQAC/wW/AQAFvwEABb8BAAK/FAAB/wHmAQAE/wHmAQAE/wHmAQAE/wHmAf8BvwEABP8BvwEABP8BvwEABP8DvwEABb8BAAW/AQAFvxQABP8B5gEABP8B5gEABP8B5gEABv8BvwEABP8BvwEABP8BvwEAAv8FvwEABb8BAAW/AQACvxQAAf8B5gEABP8B5gEABP8B5gEABP8B5gH/Ab8BAAT/Ab8BAAT/Ab8BAAT/A78BAAW/AQAFvwEABb8UAAT/AeYBAAT/AeYBAAT/AeYBAAb/Ab8BAAT/Ab8BAAT/Ab8BAAL/Bb8BAAW/AQAFvwEAAr8UAAH/AeYBAAT/AeYBAAT/AeYBAAT/AeYB/wG/AQAE/wG/AQAE/wG/AQAE/wO/AQAFvwEABb8BAAW/FAA=",
  gradient:
    "FP8B+QP4AfkC+AH3A/gB+QH4AfkB+wH4AfcB+gH3AfkD8gHxAfIB8wLyAvMB8gHxAfIB8QHzAfIB8wLyAfEB7QHsAe4C7AHrAe0B6wHtAewC6wHsAeoC7AHqAe0B6wHsBOUB5gPlAuQB5QHnAeYD5QLkAeYB5wHfAt4B3wHeAd8B4AHeAt8B4QHeAt8D3gHgAd4B4AHZAtgB1wHZAtcB2gHYAdcC2AHXAdgB2QHYAdcB2AHXAdkB0QHSA9MF0gHRAtIB0QLTBNIBzQTMAc0EzALLAcwBywHMAcoBzAHNAcwBzQHHA8YBxALFAsQDxQHEAcYBxQHGAcIBxgHFAccCvwLAAcECvwLAA74BvwK+AcEBvAG/Ab4BvwG6AbgBuQK3AboBtgG6AbkBuAO5AbYBuQS4AbkBsgGxBbMBsgGxAbMBsQKyAbEBswWyAawBqwGsAa0BqwOtBawBqgGsAakBrAGtAawBqwGnAaQCpgGlAaQCpQGmAaMBpASlAakBpAOlAZ8BoQGfAZ4BoAGiAZ0FnwGcAaIBoAKfAaABnAGfAZoFmQGYAZkBmgGYAZkBmAGWAZgCmQGXAZoBmAGaAZEDkgGUApIBkwGPAZMDkgGRAZIBkAGRAZQCkQGKBIwBjQSMAYsBjAGLB4wDhgKHAoYBhAGGAoUBhgGFAoYBhwGFAYYBhAGHAX8BgAF/AX4BfwGAAn0GfwGAAX8BfgF/AoACeQF4AXkBeAJ5AXgBeQF6AXkBdwN4AnkBegF4AXkBcwFxAXIBcwFyA3MBcgFzAXIBcwFyAXMCcgJxAnIBbQNsAW0BbAFuA2wBawFsAWsBagFsAW0DbAFrAWYBaAFlAmYBZQFmAWUCZgFlAWYBZAFoAWUBYwFlA2YCXwFgAV8BYQFfAWACXwFhAV8CXgFhAV8DYAJeAlkBWAFZAVoBWwNaAVkBWANZAVgCWQFYAVoBWQFTAlEDUwFQAVECVAFSAVQBUQRSAlABUQFMAUsBTAFNAkwBTgFKAkwBTQFLBEwBSwNMAUcBRgFHA0YBRAJGAUQBRwFGAUUBRAFHAUUCRgFFAUYBQAE+Aj8CQQE/Aj4BQQI/AUABPwFAAT8BQAM/BDkBOAE8AjgBOQE6AzkBOAI3AToBNwE5ATgBMwEwAzMBMQEzAjIBMQE0ATEBMwIyATQBMgEwATQBMwEtBCwBKwIsASsCLAEuASsBLAEtAiwCKwEsASYBJQEnAiYBJAElASYBJwElAiYBIwEnASUBJgIlAicBIAIeASECIAEhAR0DHwEeAiABHwEgASEBHwEeAR8KGQEbARoBGwMaARkBGAIZARMBFQISARQCEwIUAhIBFAETARECEgERARICEwMMAQsBDAENAQ8CDQELCAwCDRQA",
  gradient_up:
    "FAADDAELAQwBDQEPAg0BCwgMAg0BEwEVAhIBFAITAhQCEgEUARMBEQISAREBEgITChkBGwEaARsDGgEZARgCGQEgAh4BIQIgASEBHQMfAR4CIAEfASABIQEfAR4BHwEmASUBJwImASQBJQEmAScBJQImASMBJwElASYCJQInAS0ELAErAiwBKwIsAS4BKwEsAS0CLAIrASwBMwEwAzMBMQEzAjIBMQE0ATEBMwIyATQBMgEwATQBMwQ5ATgBPAI4ATkBOgM5ATgCNwE6ATcBOQE4AUABPgI/AkEBPwI+AUECPwFAAT8BQAE/AUADPwFHAUYBRwNGAUQCRgFEAUcBRgFFAUQBRwFFAkYBRQFGAUwBSwFMAU0CTAFOAUoCTAFNAUsETAFLA0wBUwJRA1MBUAFRAlQBUgFUAVEEUgJQAVECWQFYAVkBWgFbA1oBWQFYA1kBWAJZAVgBWgFZAl8BYAFfAWEBXwFgAl8BYQFfAl4BYQFfA2ACXgFmAWgBZQJmAWUBZgFlAmYBZQFmAWQBaAFlAWMBZQNmAW0DbAFtAWwBbgNsAWsBbAFrAWoBbAFtA2wBawFzAXEBcgFzAXIDcwFyAXMBcgFzAXIBcwJyAnECcgJ5AXgBeQF4AnkBeAF5AXoBeQF3A3gCeQF6AXgBeQF/AYABfwF+AX8BgAJ9Bn8BgAF/AX4BfwKAA4YChwKGAYQBhgKFAYYBhQKGAYcBhQGGAYQBhwGKBIwBjQSMAYsBjAGLB4wBkQOSAZQCkgGTAY8BkwOSAZEBkgGQAZEBlAKRAZoFmQGYAZkBmgGYAZkBmAGWAZgCmQGXAZoBmAGaAZ8BoQGfAZ4BoAGiAZ0FnwGcAaIBoAKfAaABnAGfAacBpAKmAaUBpAKlAaYBowGkBKUBqQGkA6UBrAGrAawBrQGrA60FrAGqAawBqQGsAa0BrAGrAbIBsQWzAbIBsQGzAbECsgGxAbMFsgG6AbgBuQK3AboBtgG6AbkBuAO5AbYBuQS4AbkCvwLAAcECvwLAA74BvwK+AcEBvAG/Ab4BvwHHA8YBxALFAsQDxQHEAcYBxQHGAcIBxgHFAccBzQTMAc0EzALLAcwBywHMAcoBzAHNAcwBzQHRAdID0wXSAdEC0gHRAtME0gHZAtgB1wHZAtcB2gHYAdcC2AHXAdgB2QHYAdcB2AHXAdkB3wLeAd8B3gHfAeAB3gLfAeEB3gLfA94B4AHeAeAE5QHmA+UC5AHlAecB5gPlAuQB5gHnAe0B7AHuAuwB6wHtAesB7QHsAusB7AHqAuwB6gHtAesB7APyAfEB8gHzAvIC8wHyAfEB8gHxAfMB8gHzAvIB8QH5A/gB+QL4AfcD+AH5AfgB+QH7AfgB9wH6AfcB+RT/",
  creeper:
    "/wAaAAa/BgAGvwIAAb8E/wG/BgABvwT/Ab8CAAG/BP8BvwYAAb8E/wG/AgABvwT/Ab8GAAG/BP8BvwIAAb8E/wG/BgABvwT/Ab8CAAa/BgAGvwgABr8OAAG/BP8Bvw4AAb8E/wG/CwAEvwT/BL8IAAG/Cv8BvwgAAb8K/wG/CAABvwr/Ab8IAAG/Cv8BvwgAAb8B/wi/Af8BvwgAAb8B/wG/BgABvwH/Ab8IAAG/Af8BvwYAAb8B/wG/CAADvwYAA7+kAA==",
  skull:
    "9gAB9QHxAfYB6QHiAegB8QHuDAAD8QH7Av8B8QHpDAAB8Qb/AfsMAAb/AfgB+wwAAf8CPAL/AjwB/wwAAfYC/wI+Af8B+gHoDAAB7AY8AekMAAHeAdwC4QHpAeEB7AHiCAAC/wwAAv8EAAL/Ab8KAAG/Av8EAAH/Ab8C/wG/BgABvwL/Ab8B/wcAAb8C/wG/AgABvwL/Ab8MAAG/Af8CvwH/Ab8NAAK/BP8CvwgAAf8DvwL/BAAC/wO/Af8EAAT/CAAE/wQAAv8MAAL/3gA=",
  flower:
    "5QACvw0AAr8CAAG/Av8BvwIAAr8HAAG/Av8BvwEAAb8C/wG/AQABvwL/Ab8HAAG/Cv8BvwYAAb8BAAP/Br8D/wEAAb8DAAG/Af8BvwL/Ab8GAAG/Av8BvwH/Ab8CAAG/A/8BvwIABL8CAAG/A/8BvwMAAr8B/wG/AQABvwT/Ab8BAAG/Af8CvwYAAf8BvwEAAb8E/wG/AQABvwH/CAAB/wG/AQABvwT/Ab8BAAG/Af8GAAK/Af8BvwEAAb8E/wG/AQABvwH/Ar8DAAG/A/8BvwIABL8CAAG/A/8BvwIAAb8B/wG/Av8BvwYAAb8C/wG/Af8BvwMAAb8BAAP/Br8D/wEAAb8GAAG/Cv8BvwcAAb8C/wG/AQABvwL/Ab8BAAG/Av8BvwcAAr8CAAG/Av8BvwIAAr8NAAK/5QA=",
  mojang:
    "/gABvxMAAv8JAAS/BQAC/wcAAb8F/wG/AgABvwEAAr8GAAG/Bf8B/gL/Ab8B/wG/CAABvwT/BL8F/wG/BQABvwT/BgABvwH/Af4BvwUAAb8D/wgAAb8B/wG/BQABvwL/Ab8JAAG/Af8BvwQAAb8C/wG/CgAB/wG/BAABvwL/Ab8KAAG/BQABvwP/EAABvwL/Af4Bvw8AAb8E/wG/DgABvwX/Ar8GAAK/BQABvw3/Ab8HAAu/4AA=",
  globe:
    "5QAC/xAAAv8CAAL/DAAE/wQAAv8IAAb/AgAC/wIAAv8FAAH/AwAC/wIABP8DAAG/BAAD/wUABf8DvwQAAf8CAAL/AwAD/wK/AgABvwQAAf8CAAT/AgAEvwIAAb8EAAH/AgAF/wG/AgADvwEAAb8EAAH/AgAF/wG/AwACvwEAAb8EAAH/AgABvwT/BwABvwQAAf8DAAG/Av8BvwcAAb8EAAH/Ab8DAAL/BAACvwIAAb8EAAL/Ab8CAAG/Af8EAAK/AgABvwQAA/8BvwYABL8BAAG/BQAC/wG/AwACvwEABb8IAAL/AQABvwH/Ab8BAAO/DAAD/wO/EAAB/wG/0QA=",
  piglin:
    "/wBDABD/BAAB/w4AAf8EAAH/AgAC/wYAAv8CAAH/BAAB/wIAAv8GAAL/AgAB/wQAAf8CAAL/BgAC/wIAAf8EAAH/AgAC/wYAAv8CAAH/BAAB/wIAAv8GAAL/AgAB/wQAAf8OAAH/BAAQ//8ALwA=",
  flow: "/wAIAAG/Ae8K/wHvAb8GAAHvAf8KAAH/Ae8GAAL/AQABvwHvBP8B7wG/AQAC/wYAAv8BAAHvAf8EAAH/Ae8BAAL/BgAC/wEAAv8BAAK/AQAC/wEAAv8GAAL/AQAC/wEAAe8B/wEAAv8BAAL/BgAC/wEAAe8B/wEAAf8B7wEAAv8BAAL/BgAC/wEAAb8B7wH/Ae8BvwEAAv8BAAL/BgAB7wH/BwAB/wHvAQAC/wYAAb8B7wf/Ae8BvwEAAv8SAAH/Ae8LAAG/Ae8F/wHvAb8LAAHvAf8SAAH/Ae8SAAK/+gA=",
  guster:
    "9wABvwHvAv8B7wG/DgAG/w8ABP8PAAG/AQAC/wEAAb8OAAHvBP8B7x4AAb8B7wr/Ae8BvwYAAb8M/wG/HAABvwHvBv8B7wG/CgABvwj/Ab8gAAG/Ae8C/wHvAb8OAAG/BP8BvyQAAe8BvxIAAb8B7+UA",
} as const;

const decodedMaskCache = new Map<string, Uint8Array>();
const BASE64_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function decodeBase64(value: string): Uint8Array {
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const char of value) {
    if (char === "=") break;
    const digit = BASE64_ALPHABET.indexOf(char);
    if (digit < 0) continue;

    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }

  return Uint8Array.from(output);
}

function vanillaMask(assetName: keyof typeof VANILLA_MASK_RLE): Mask {
  let alpha = decodedMaskCache.get(assetName);

  if (!alpha) {
    const rle = decodeBase64(VANILLA_MASK_RLE[assetName]);
    const pixelCount = BANNER_W * BANNER_H;
    alpha = new Uint8Array(pixelCount);

    if (rle.length % 2 !== 0) {
      throw new Error(`Invalid RLE mask for Minecraft pattern "${assetName}"`);
    }

    let offset = 0;
    for (let index = 0; index < rle.length; index += 2) {
      const runLength = rle[index];
      const value = rle[index + 1];
      if (runLength === 0 || offset + runLength > pixelCount) {
        throw new Error(
          `Corrupt RLE mask for Minecraft pattern "${assetName}"`,
        );
      }
      alpha.fill(value, offset, offset + runLength);
      offset += runLength;
    }

    if (offset !== pixelCount) {
      throw new Error(
        `Minecraft pattern "${assetName}" has ${offset} mask pixels; expected ${pixelCount}`,
      );
    }

    decodedMaskCache.set(assetName, alpha);
  }

  return (x, y) => {
    if (x < 0 || x >= BANNER_W || y < 0 || y >= BANNER_H) return 0;
    return alpha![Math.floor(y) * BANNER_W + Math.floor(x)] / 255;
  };
}

const PATTERN_DEFS = [
  {
    id: "bs",
    name: "stripe_bottom",
    label: "Нижняя полоса",
    mask: vanillaMask("stripe_bottom"),
  },
  {
    id: "ts",
    name: "stripe_top",
    label: "Верхняя полоса",
    mask: vanillaMask("stripe_top"),
  },
  {
    id: "ls",
    name: "stripe_left",
    label: "Левая полоса",
    mask: vanillaMask("stripe_left"),
  },
  {
    id: "rs",
    name: "stripe_right",
    label: "Правая полоса",
    mask: vanillaMask("stripe_right"),
  },
  {
    id: "cs",
    name: "stripe_center",
    label: "Вертикальная полоса",
    mask: vanillaMask("stripe_center"),
  },
  {
    id: "ms",
    name: "stripe_middle",
    label: "Горизонтальная полоса",
    mask: vanillaMask("stripe_middle"),
  },
  {
    id: "drs",
    name: "stripe_downright",
    label: "Диагональ \\",
    mask: vanillaMask("stripe_downright"),
  },
  {
    id: "dls",
    name: "stripe_downleft",
    label: "Диагональ /",
    mask: vanillaMask("stripe_downleft"),
  },
  {
    id: "ss",
    name: "small_stripes",
    label: "Частые полоски",
    mask: vanillaMask("small_stripes"),
  },
  { id: "cr", name: "cross", label: "Косой крест", mask: vanillaMask("cross") },
  {
    id: "sc",
    name: "straight_cross",
    label: "Прямой крест",
    mask: vanillaMask("straight_cross"),
  },
  {
    id: "ld",
    name: "diagonal_left",
    label: "Диагональ: низ слева",
    mask: vanillaMask("diagonal_left"),
  },
  {
    id: "rd",
    name: "diagonal_right",
    label: "Диагональ: низ справа",
    mask: vanillaMask("diagonal_right"),
  },
  {
    id: "lud",
    name: "diagonal_up_left",
    label: "Диагональ: верх слева",
    mask: vanillaMask("diagonal_up_left"),
  },
  {
    id: "rud",
    name: "diagonal_up_right",
    label: "Диагональ: верх справа",
    mask: vanillaMask("diagonal_up_right"),
  },
  {
    id: "vh",
    name: "half_vertical",
    label: "Левая половина",
    mask: vanillaMask("half_vertical"),
  },
  {
    id: "vhr",
    name: "half_vertical_right",
    label: "Правая половина",
    mask: vanillaMask("half_vertical_right"),
  },
  {
    id: "hh",
    name: "half_horizontal",
    label: "Верхняя половина",
    mask: vanillaMask("half_horizontal"),
  },
  {
    id: "hhb",
    name: "half_horizontal_bottom",
    label: "Нижняя половина",
    mask: vanillaMask("half_horizontal_bottom"),
  },
  {
    id: "tl",
    name: "square_top_left",
    label: "Квадрат: верх слева",
    mask: vanillaMask("square_top_left"),
  },
  {
    id: "tr",
    name: "square_top_right",
    label: "Квадрат: верх справа",
    mask: vanillaMask("square_top_right"),
  },
  {
    id: "bl",
    name: "square_bottom_left",
    label: "Квадрат: низ слева",
    mask: vanillaMask("square_bottom_left"),
  },
  {
    id: "br",
    name: "square_bottom_right",
    label: "Квадрат: низ справа",
    mask: vanillaMask("square_bottom_right"),
  },
  {
    id: "bt",
    name: "triangle_bottom",
    label: "Шеврон",
    mask: vanillaMask("triangle_bottom"),
  },
  {
    id: "tt",
    name: "triangle_top",
    label: "Перевёрнутый шеврон",
    mask: vanillaMask("triangle_top"),
  },
  {
    id: "bts",
    name: "triangles_bottom",
    label: "Зубцы снизу",
    mask: vanillaMask("triangles_bottom"),
  },
  {
    id: "tts",
    name: "triangles_top",
    label: "Зубцы сверху",
    mask: vanillaMask("triangles_top"),
  },
  { id: "mc", name: "circle", label: "Круг", mask: vanillaMask("circle") },
  { id: "mr", name: "rhombus", label: "Ромб", mask: vanillaMask("rhombus") },
  { id: "bo", name: "border", label: "Кайма", mask: vanillaMask("border") },
  {
    id: "cbo",
    name: "curly_border",
    label: "Фигурная кайма",
    mask: vanillaMask("curly_border"),
  },
  { id: "bri", name: "bricks", label: "Кирпичи", mask: vanillaMask("bricks") },
  {
    id: "gra",
    name: "gradient",
    label: "Градиент сверху",
    mask: vanillaMask("gradient"),
  },
  {
    id: "gru",
    name: "gradient_up",
    label: "Градиент снизу",
    mask: vanillaMask("gradient_up"),
  },
  { id: "cre", name: "creeper", label: "Крипер", mask: vanillaMask("creeper") },
  { id: "sku", name: "skull", label: "Череп", mask: vanillaMask("skull") },
  { id: "flo", name: "flower", label: "Цветок", mask: vanillaMask("flower") },
  { id: "moj", name: "mojang", label: "Буква M", mask: vanillaMask("mojang") },
  { id: "glb", name: "globe", label: "Глобус", mask: vanillaMask("globe") },
  { id: "pig", name: "piglin", label: "Пятачок", mask: vanillaMask("piglin") },
  { id: "flow", name: "flow", label: "Поток", mask: vanillaMask("flow") },
  { id: "guster", name: "guster", label: "Вихрь", mask: vanillaMask("guster") },
] as const;

export type PatternId = (typeof PATTERN_DEFS)[number]["id"];

export interface PatternInfo {
  id: PatternId;
  name: string;
  label: string;
  mask: Mask;
}

export const BANNER_PATTERNS: readonly PatternInfo[] = PATTERN_DEFS;

const PATTERN_BY_ID = new Map<string, PatternInfo>(
  BANNER_PATTERNS.map((pattern) => [pattern.id, pattern]),
);
const PATTERN_BY_NAME = new Map<string, PatternInfo>(
  BANNER_PATTERNS.map((pattern) => [pattern.name, pattern]),
);

export function isPatternId(value: string): value is PatternId {
  return PATTERN_BY_ID.has(value);
}

export function patternInfo(id: PatternId): PatternInfo {
  const found = PATTERN_BY_ID.get(id);
  if (!found) throw new Error(`Unknown banner pattern: ${id}`);
  return found;
}

export interface BannerLayer {
  pattern: PatternId;
  color: DyeColor;
}

export interface Banner {
  base: DyeColor;
  layers: BannerLayer[];
}

export const DEFAULT_BANNER: Banner = { base: "white", layers: [] };

export type ParseResult =
  | { ok: true; banner: Banner }
  | { ok: false; error: string };

export function serializeBanner(banner: Banner): string {
  return [
    banner.base,
    ...banner.layers.map((layer) => `${layer.pattern}:${layer.color}`),
  ].join("|");
}

export function parseBannerCode(raw: string): ParseResult {
  const parts = raw.trim().toLowerCase().split("|");
  const base = parts[0]?.trim() ?? "";
  if (!isDyeColor(base))
    return { ok: false, error: `Неизвестный цвет «${base}»` };

  const layerParts = parts.slice(1).filter((part) => part.trim() !== "");
  if (layerParts.length > BANNER_MAX_LAYERS) {
    return {
      ok: false,
      error: `Слишком много слоёв (максимум ${BANNER_MAX_LAYERS})`,
    };
  }

  const layers: BannerLayer[] = [];
  for (const part of layerParts) {
    const [pattern, color, extra] = part
      .split(":")
      .map((value) => value.trim());
    if (extra !== undefined || !pattern || !color) {
      return { ok: false, error: `Не удалось разобрать слой «${part}»` };
    }
    if (!isPatternId(pattern))
      return { ok: false, error: `Неизвестный узор «${pattern}»` };
    if (!isDyeColor(color))
      return { ok: false, error: `Неизвестный цвет «${color}»` };
    layers.push({ pattern, color });
  }

  return { ok: true, banner: { base, layers } };
}

export function toGiveCommand(banner: Banner): string {
  const patterns = banner.layers
    .map(
      (layer) =>
        `{pattern:"minecraft:${patternInfo(layer.pattern).name}",color:"${layer.color}"}`,
    )
    .join(",");
  return `/give @p ${banner.base}_banner[banner_patterns=[${patterns}]]`;
}

function colorFromToken(token: string): DyeColor | null {
  const value = token.toLowerCase();
  if (/^\d+$/.test(value)) return DYE_COLORS[Number(value)]?.id ?? null;
  return isDyeColor(value) ? value : null;
}

function patternFromToken(token: string): PatternInfo | null {
  const value = token.toLowerCase().replace(/^minecraft:/, "");
  if (value === "field_masoned") return PATTERN_BY_NAME.get("bricks") ?? null;
  if (value === "bordure_indented")
    return PATTERN_BY_NAME.get("curly_border") ?? null;
  return PATTERN_BY_ID.get(value) ?? PATTERN_BY_NAME.get(value) ?? null;
}

function parseGiveCommand(text: string): ParseResult {
  const baseMatch = /\b([a-z_]+)_banner\b/i.exec(text);
  const base = baseMatch?.[1]?.toLowerCase();
  if (!base || !isDyeColor(base)) {
    return {
      ok: false,
      error:
        "Не нашёл баннер в команде (ожидается что-то вроде white_banner[...])",
    };
  }

  const layers: BannerLayer[] = [];
  for (const match of text.matchAll(/\{[^{}]*\}/g)) {
    const object = match[0];
    const pattern = /["']?pattern["']?\s*[:=]\s*["']?([a-z_:0-9]+)["']?/i.exec(
      object,
    )?.[1];
    const color = /["']?color["']?\s*[:=]\s*["']?([a-z_0-9]+)["']?/i.exec(
      object,
    )?.[1];
    if (!pattern || !color) continue;

    const info = patternFromToken(pattern);
    if (!info) return { ok: false, error: `Неизвестный узор «${pattern}»` };
    const dye = colorFromToken(color);
    if (!dye) return { ok: false, error: `Неизвестный цвет «${color}»` };
    layers.push({ pattern: info.id, color: dye });
  }

  if (layers.length > BANNER_MAX_LAYERS) {
    return {
      ok: false,
      error: `Слишком много слоёв (максимум ${BANNER_MAX_LAYERS})`,
    };
  }
  return { ok: true, banner: { base, layers } };
}

export function parseBannerInput(raw: string): ParseResult {
  const text = raw.trim();
  if (!text) return { ok: false, error: "Вставьте код флага" };
  if (text.length > 4000) return { ok: false, error: "Слишком длинный текст" };
  return text.includes("|") ? parseBannerCode(text) : parseGiveCommand(text);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

export function renderBannerPixels(banner: Banner): string[][] {
  const base = hexToRgb(dyeHex(banner.base));
  const grid: [number, number, number][][] = Array.from(
    { length: BANNER_H },
    () =>
      Array.from(
        { length: BANNER_W },
        () => [...base] as [number, number, number],
      ),
  );

  for (const layer of banner.layers) {
    const mask = patternInfo(layer.pattern).mask;
    const color = hexToRgb(dyeHex(layer.color));
    for (let y = 0; y < BANNER_H; y++) {
      for (let x = 0; x < BANNER_W; x++) {
        const alpha = mask(x, y);
        if (alpha <= 0) continue;
        const current = grid[y][x];
        grid[y][x] =
          alpha >= 1
            ? color
            : [
                current[0] + (color[0] - current[0]) * alpha,
                current[1] + (color[1] - current[1]) * alpha,
                current[2] + (color[2] - current[2]) * alpha,
              ];
      }
    }
  }

  return grid.map((row) => row.map(rgbToHex));
}

/** Compact SVG paths grouped by color. */
export function bannerSvgPaths(banner: Banner): { color: string; d: string }[] {
  const pixels = renderBannerPixels(banner);
  const byColor = new Map<string, string[]>();

  pixels.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === color) end++;
      const paths = byColor.get(color) ?? [];
      paths.push(`M${x} ${y}h${end - x}v1h-${end - x}z`);
      byColor.set(color, paths);
      x = end;
    }
  });

  return [...byColor].map(([color, paths]) => ({ color, d: paths.join("") }));
}
