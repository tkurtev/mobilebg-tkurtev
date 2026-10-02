import { COLOR_OPTIONS } from "@/config/options";

/**
 * Illustrated placeholder photos for seeded demo listings. Real listings use uploaded
 * images from object storage; these keep the demo dataset free of third-party photos.
 */
export const DEMO_SHAPES = [
  "sedan", "hatchback", "wagon", "coupe", "suv", "pickup", "minivan", "van", "truck", "tractor-unit",
  "motorcycle", "caravan", "camper", "tractor", "excavator", "loader", "trailer", "wheel", "part",
] as const;

export type DemoShape = (typeof DEMO_SHAPES)[number];

const BODY_TO_SHAPE: Record<string, DemoShape> = {
  sedan: "sedan", hatchback: "hatchback", wagon: "wagon", coupe: "coupe", convertible: "coupe",
  suv: "suv", crossover: "suv", pickup: "pickup", minivan: "minivan",
  "cargo-van": "van", "passenger-van": "van", minibus: "van", "chassis-cab": "van", dropside: "van",
  "tractor-unit": "tractor-unit", box: "truck", tipper: "truck", flatbed: "truck", refrigerated: "truck", tanker: "truck",
  naked: "motorcycle", sport: "motorcycle", touring: "motorcycle", adventure: "motorcycle", cruiser: "motorcycle",
  scooter: "motorcycle", cross: "motorcycle", atv: "motorcycle",
  standard: "caravan", compact: "caravan", "twin-axle": "caravan",
  alcove: "camper", "semi-integrated": "camper", integrated: "camper", "van-conversion": "camper",
  tractor: "tractor", combine: "tractor", sprayer: "tractor", seeder: "tractor", plough: "tractor",
  excavator: "excavator", "mini-excavator": "excavator", crane: "excavator",
  "wheel-loader": "loader", "backhoe-loader": "loader", bulldozer: "loader", forklift: "loader", roller: "loader",
  "car-trailer": "trailer", platform: "trailer", curtainsider: "trailer", lowloader: "trailer", boat: "trailer",
};

export function demoShapeFor(attributeSet: string, bodyType: string | null): DemoShape {
  if (attributeSet === "tires") return "wheel";
  if (attributeSet === "parts") return "part";
  if (attributeSet === "trailer") return "trailer";
  if (attributeSet === "caravan") return "caravan";
  if (attributeSet === "camper") return "camper";
  if (attributeSet === "truck" && bodyType && bodyType !== "tractor-unit") return "truck";
  return (bodyType && BODY_TO_SHAPE[bodyType]) || "sedan";
}

export function demoImageFile(shape: DemoShape, color: string, variant: number): string {
  return `${shape}-${color}-${variant}.svg`;
}

function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 255;
    const next = amount < 0 ? c * (1 + amount) : c + (255 - c) * amount;
    return Math.max(0, Math.min(255, Math.round(next)));
  };
  return `#${[16, 8, 0].map((shift) => channel(shift).toString(16).padStart(2, "0")).join("")}`;
}

const GLASS = `fill="#28323b" fill-opacity="0.88"`;
const LINE = `stroke="#000" stroke-opacity="0.16" stroke-width="2" fill="none"`;

function wheel(cx: number, cy: number, r: number): string {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 5;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r * 0.52).toFixed(1)}" y2="${(cy + Math.sin(a) * r * 0.52).toFixed(1)}" stroke="#7d838a" stroke-width="${Math.max(3, r * 0.09).toFixed(1)}"/>`;
  }).join("");
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1d2126"/><circle cx="${cx}" cy="${cy}" r="${r * 0.6}" fill="#c9cdd2"/>${spokes}<circle cx="${cx}" cy="${cy}" r="${r * 0.16}" fill="#5f656c"/>`;
}

function car(body: string, windows: string[], wheels: [number, number, number][], color: string, extras = ""): string {
  return `<path d="${body}" fill="${color}"/><path d="${body}" fill="url(#lower)"/>${windows.map((w) => `<path d="${w}" ${GLASS}/>`).join("")}${extras}${wheels.map(([x, y, r]) => wheel(x, y, r)).join("")}`;
}

const SHAPES: Record<DemoShape, (color: string) => string> = {
  sedan: (c) =>
    car(
      "M110 418 L110 372 Q112 352 140 346 L250 336 L318 272 Q328 264 344 264 L478 264 Q496 264 510 276 L586 336 L664 348 Q694 354 698 384 L698 418 Q698 428 688 428 L640 428 A50 50 0 0 0 540 428 L262 428 A50 50 0 0 0 162 428 L120 428 Q110 428 110 418 Z",
      ["M266 336 L326 278 Q332 272 342 272 L400 272 L400 336 Z", "M410 272 L474 272 Q488 272 498 282 L560 336 L410 336 Z"],
      [[212, 424, 46], [590, 424, 46]],
      c,
      `<path d="M400 342 L400 414 M264 340 L264 410" ${LINE}/><rect x="680" y="360" width="16" height="10" rx="3" fill="#eef1f4"/><rect x="112" y="358" width="10" height="14" rx="2" fill="#a3201b"/>`,
    ),
  hatchback: (c) =>
    car(
      "M150 418 L150 340 Q150 300 180 286 L232 268 Q246 262 262 262 L462 262 Q480 262 494 274 L570 334 L640 346 Q668 352 670 380 L670 418 Q670 428 660 428 L622 428 A48 48 0 0 0 526 428 L292 428 A48 48 0 0 0 196 428 L158 428 Q150 428 150 418 Z",
      ["M188 334 L196 296 Q200 282 216 278 L262 272 L380 272 L380 334 Z", "M390 272 L458 272 Q472 272 482 282 L544 334 L390 334 Z"],
      [[244, 424, 44], [574, 424, 44]],
      c,
      `<path d="M385 340 L385 414" ${LINE}/><rect x="654" y="356" width="14" height="10" rx="3" fill="#eef1f4"/><rect x="152" y="330" width="8" height="18" rx="2" fill="#a3201b"/>`,
    ),
  wagon: (c) =>
    car(
      "M110 418 L110 330 Q110 300 132 292 L200 270 Q214 264 230 264 L478 264 Q496 264 510 276 L586 336 L664 348 Q694 354 698 384 L698 418 Q698 428 688 428 L640 428 A50 50 0 0 0 540 428 L262 428 A50 50 0 0 0 162 428 L120 428 Q110 428 110 418 Z",
      ["M136 334 L144 300 Q148 288 162 284 L222 274 L300 274 L300 336 Z", "M310 274 L400 274 L400 336 L310 336 Z", "M410 274 L474 274 Q488 274 498 284 L558 336 L410 336 Z"],
      [[212, 424, 46], [590, 424, 46]],
      c,
      `<path d="M150 262 L470 258" stroke="#3b4148" stroke-width="5"/><path d="M400 342 L400 414" ${LINE}/><rect x="680" y="360" width="16" height="10" rx="3" fill="#eef1f4"/>`,
    ),
  coupe: (c) =>
    car(
      "M110 418 L110 382 Q112 362 140 356 L270 344 L340 286 Q350 278 366 278 L460 278 Q478 278 492 290 L580 346 L664 356 Q694 362 698 390 L698 418 Q698 428 688 428 L640 428 A50 50 0 0 0 540 428 L262 428 A50 50 0 0 0 162 428 L120 428 Q110 428 110 418 Z",
      ["M292 344 L346 294 Q352 288 362 288 L420 288 L420 344 Z", "M430 288 L458 288 Q472 288 484 298 L550 346 L430 346 Z"],
      [[212, 424, 46], [590, 424, 46]],
      c,
      `<path d="M425 350 L425 414" ${LINE}/><rect x="680" y="368" width="16" height="9" rx="3" fill="#eef1f4"/>`,
    ),
  suv: (c) =>
    car(
      "M110 412 L110 320 Q110 296 134 290 L190 278 L238 214 Q248 204 266 204 L506 204 Q526 204 538 218 L590 284 L664 298 Q696 304 700 336 L700 412 Q700 424 688 424 L648 424 A56 56 0 0 0 536 424 L270 424 A56 56 0 0 0 158 424 L122 424 Q110 424 110 412 Z",
      ["M206 282 L252 222 Q258 214 270 214 L380 214 L380 282 Z", "M390 214 L500 214 Q514 214 522 224 L566 282 L390 282 Z"],
      [[214, 418, 52], [592, 418, 52]],
      c,
      `<path d="M240 200 L500 200" stroke="#3b4148" stroke-width="5"/><path d="M385 288 L385 410" ${LINE}/><rect x="682" y="314" width="16" height="12" rx="3" fill="#eef1f4"/>`,
    ),
  pickup: (c) =>
    car(
      "M100 416 L100 330 L370 330 L370 270 Q372 236 392 230 L500 226 Q516 226 528 240 L586 302 L668 314 Q700 320 708 350 L710 416 Q710 426 700 426 L656 426 A56 56 0 0 0 544 426 L270 426 A56 56 0 0 0 158 426 L110 426 Q100 426 100 416 Z",
      ["M386 300 L390 248 Q394 238 406 238 L470 236 L470 300 Z", "M480 236 L498 236 Q510 236 520 248 L566 300 L480 300 Z"],
      [[214, 420, 52], [600, 420, 52]],
      c,
      `<path d="M100 344 L370 344" ${LINE}/><rect x="692" y="332" width="14" height="12" rx="3" fill="#eef1f4"/>`,
    ),
  minivan: (c) =>
    car(
      "M120 414 L120 300 Q120 262 150 250 L210 228 Q224 222 244 222 L488 222 Q508 222 524 236 L604 306 L664 318 Q694 324 698 354 L698 414 Q698 424 688 424 L642 424 A50 50 0 0 0 542 424 L262 424 A50 50 0 0 0 162 424 L130 424 Q120 424 120 414 Z",
      ["M146 304 L150 270 Q154 254 172 248 L230 234 L320 234 L320 304 Z", "M330 234 L440 234 L440 304 L330 304 Z", "M450 234 L486 234 Q502 234 514 246 L574 304 L450 304 Z"],
      [[212, 420, 48], [592, 420, 48]],
      c,
    ),
  van: (c) =>
    car(
      "M90 414 L90 220 Q90 196 116 196 L540 196 Q566 196 584 214 L650 290 L690 304 Q712 312 712 340 L712 414 Q712 424 700 424 L660 424 A52 52 0 0 0 556 424 L254 424 A52 52 0 0 0 150 424 L100 424 Q90 424 90 414 Z",
      ["M560 222 Q574 222 584 234 L636 296 L560 296 Z"],
      [[202, 420, 50], [608, 420, 50]],
      c,
      `<path d="M548 210 L548 410 M300 200 L300 410" ${LINE}/><rect x="696" y="320" width="14" height="14" rx="3" fill="#eef1f4"/>`,
    ),
  truck: (c) =>
    `<rect x="70" y="160" width="436" height="244" rx="6" fill="#eef0f2" stroke="#c4c9cf" stroke-width="3"/><path d="M70 330 L506 330" stroke="${c}" stroke-width="18"/>` +
    car("M514 404 L514 200 Q514 176 538 176 L640 176 Q668 176 680 204 L716 300 L716 404 Z", ["M590 196 L650 196 Q664 196 672 214 L700 290 L590 290 Z"], [[150, 424, 46], [250, 424, 46], [640, 424, 46]], c, `<rect x="70" y="402" width="646" height="14" fill="#2c3137"/>`),
  "tractor-unit": (c) =>
    `<rect x="160" y="396" width="380" height="20" fill="#2c3137"/><rect x="230" y="378" width="120" height="18" rx="3" fill="#4a5058"/>` +
    car("M470 404 L470 160 Q470 136 496 136 L640 136 Q670 136 682 166 L716 290 L716 404 Z", ["M560 160 L644 160 Q660 160 668 180 L700 280 L560 280 Z"], [[250, 424, 46], [350, 424, 46], [640, 424, 46]], c, `<path d="M540 170 L540 400" ${LINE}/><rect x="700" y="320" width="14" height="16" rx="3" fill="#eef1f4"/>`),
  motorcycle: (c) =>
    `${wheel(230, 410, 62)}${wheel(570, 410, 62)}<path d="M300 352 L230 410" stroke="#3a3f45" stroke-width="12"/><path d="M520 240 L570 410" stroke="#555b62" stroke-width="12"/><path d="M500 236 L548 226" stroke="#2b3036" stroke-width="10" stroke-linecap="round"/>` +
    `<path d="M380 330 L486 330 L470 392 L400 394 Z" fill="#6f757c"/><path d="M350 300 Q400 262 474 280 L496 318 L376 334 Z" fill="${c}"/><path d="M286 300 L372 298 L366 318 L290 322 Z" fill="#23282d"/><path d="M520 300 Q560 300 592 336" stroke="${c}" stroke-width="10" fill="none"/>`,
  caravan: (c) =>
    `<path d="M660 392 L748 404" stroke="#3a3f45" stroke-width="10"/><path d="M130 400 L130 214 Q130 172 172 172 L618 172 Q660 172 660 214 L660 400 Q660 410 650 410 L140 410 Q130 410 130 400 Z" fill="#f3f3ef" stroke="#c9ccc7" stroke-width="3"/>` +
    `<rect x="130" y="328" width="530" height="18" fill="${c}"/><rect x="192" y="226" width="118" height="62" rx="8" ${GLASS}/><rect x="470" y="226" width="130" height="62" rx="8" ${GLASS}/><rect x="356" y="216" width="70" height="180" rx="6" fill="#e3e5e0" stroke="#c9ccc7" stroke-width="3"/>${wheel(400, 428, 40)}`,
  camper: (c) =>
    `<path d="M90 414 L90 200 Q90 168 122 168 L520 168 L520 150 Q520 132 540 132 L600 132 Q622 132 630 152 L640 200 L660 290 L700 304 Q716 312 716 340 L716 414 Q716 424 704 424 L664 424 A52 52 0 0 0 560 424 L254 424 A52 52 0 0 0 150 424 L100 424 Q90 424 90 414 Z" fill="#f3f3ef" stroke="#c9ccc7" stroke-width="3"/>` +
    `<rect x="90" y="330" width="626" height="18" fill="${c}"/><rect x="150" y="214" width="120" height="60" rx="8" ${GLASS}/><rect x="320" y="214" width="110" height="60" rx="8" ${GLASS}/><path d="M566 214 L626 214 L652 292 L566 292 Z" ${GLASS}/>${wheel(202, 420, 50)}${wheel(612, 420, 50)}`,
  tractor: (c) =>
    `<path d="M330 330 L640 330 Q662 330 664 352 L664 392 L330 392 Z" fill="${c}"/><rect x="560" y="250" width="12" height="80" fill="#3a3f45"/><path d="M196 336 L196 158 L384 158 L384 336 Z" fill="${shade(c, -0.25)}"/>` +
    `<rect x="212" y="174" width="74" height="140" ${GLASS}/><rect x="296" y="174" width="74" height="140" ${GLASS}/>${wheel(262, 372, 96)}${wheel(592, 414, 56)}`,
  excavator: (c) =>
    `<rect x="160" y="384" width="460" height="76" rx="38" fill="#2c3137"/>${[220, 300, 380, 460, 540].map((x) => `<circle cx="${x}" cy="422" r="20" fill="#6a7078"/>`).join("")}` +
    `<path d="M200 372 L200 296 L520 296 L548 372 Z" fill="${c}"/><rect x="392" y="196" width="118" height="100" rx="6" fill="${shade(c, -0.2)}"/><rect x="404" y="208" width="92" height="76" ${GLASS}/>` +
    `<path d="M520 270 L652 136 L716 300" stroke="${c}" stroke-width="30" fill="none" stroke-linejoin="round"/><path d="M690 300 L750 300 L732 352 L690 340 Z" fill="#3a3f45"/>`,
  loader: (c) =>
    `<path d="M190 380 L190 270 L470 270 L520 380 Z" fill="${c}"/><rect x="250" y="150" width="140" height="122" rx="6" fill="${shade(c, -0.2)}"/><rect x="264" y="164" width="112" height="96" ${GLASS}/>` +
    `<path d="M480 300 L640 350" stroke="${shade(c, -0.15)}" stroke-width="26"/><path d="M620 300 L720 300 L700 410 L620 390 Z" fill="#3a3f45"/>${wheel(250, 400, 70)}${wheel(520, 400, 70)}`,
  trailer: (c) =>
    `<path d="M680 380 L760 392" stroke="#3a3f45" stroke-width="10"/><rect x="100" y="340" width="580" height="30" rx="4" fill="${c}"/><rect x="100" y="300" width="580" height="12" fill="${shade(c, -0.2)}"/>` +
    `${[120, 300, 480, 660].map((x) => `<rect x="${x}" y="300" width="10" height="44" fill="${shade(c, -0.2)}"/>`).join("")}${wheel(360, 410, 38)}${wheel(450, 410, 38)}`,
  wheel: () =>
    `<circle cx="400" cy="290" r="206" fill="#1d2126"/>${Array.from({ length: 36 }, (_, i) => {
      const a = (i * Math.PI) / 18;
      return `<line x1="${(400 + Math.cos(a) * 176).toFixed(1)}" y1="${(290 + Math.sin(a) * 176).toFixed(1)}" x2="${(400 + Math.cos(a) * 204).toFixed(1)}" y2="${(290 + Math.sin(a) * 204).toFixed(1)}" stroke="#3a4047" stroke-width="10"/>`;
    }).join("")}${wheel(400, 290, 140).replace('fill="#1d2126"', 'fill="#2a2f35"')}`,
  part: (c) =>
    `<circle cx="380" cy="300" r="190" fill="#9aa0a7"/><circle cx="380" cy="300" r="170" fill="#b3b8be"/><circle cx="380" cy="300" r="70" fill="#7b8189"/>` +
    `${Array.from({ length: 5 }, (_, i) => {
      const a = (i * 2 * Math.PI) / 5;
      return `<circle cx="${(380 + Math.cos(a) * 40).toFixed(1)}" cy="${(300 + Math.sin(a) * 40).toFixed(1)}" r="9" fill="#3a3f45"/>`;
    }).join("")}<path d="M520 170 Q600 300 520 430 L480 410 Q540 300 480 190 Z" fill="${c}"/>`,
};

function background(variant: number): string {
  if (variant % 2 === 1) {
    return `<rect width="800" height="600" fill="#cdd8e2"/><path d="M0 360 Q140 300 280 340 T560 330 T800 340 L800 450 L0 450 Z" fill="#aebdb3"/><rect y="440" width="800" height="160" fill="#7f868d"/><path d="M0 520 L800 520" stroke="#e8e8e2" stroke-width="6" stroke-dasharray="60 40"/>`;
  }
  return `<rect width="800" height="600" fill="#eceef1"/><rect y="440" width="800" height="160" fill="#dde1e5"/><path d="M0 440 L800 440" stroke="#cfd4d9" stroke-width="2"/>`;
}

function interior(color: string): string {
  return `<rect width="800" height="600" fill="#d9e2ea"/><path d="M0 0 L800 0 L800 250 Q400 200 0 250 Z" fill="#b9c9d6"/><path d="M0 330 Q400 250 800 330 L800 600 L0 600 Z" fill="#2b3137"/>` +
    `<rect x="300" y="300" width="200" height="70" rx="10" fill="#14181c"/><rect x="314" y="312" width="172" height="46" rx="6" fill="#33536b"/>` +
    `<circle cx="230" cy="430" r="120" fill="none" stroke="#15191d" stroke-width="26"/><path d="M130 440 L330 440" stroke="#15191d" stroke-width="22"/><rect x="560" y="390" width="160" height="40" rx="8" fill="${shade(color, -0.3)}"/>`;
}

export function renderDemoImage(shape: DemoShape, colorKey: string, variant: number): string {
  const hex = COLOR_OPTIONS.find((option) => option.value === colorKey)?.hex ?? "#8a9097";
  const isVehicle = !["wheel", "part"].includes(shape);
  let content: string;
  if (variant === 3 && ["sedan", "hatchback", "wagon", "coupe", "suv", "pickup", "minivan"].includes(shape)) {
    content = interior(hex);
  } else {
    const shadow = isVehicle ? `<ellipse cx="400" cy="472" rx="330" ry="16" fill="#000" fill-opacity="0.18"/>` : "";
    const flip = variant === 2 ? ` transform="translate(800 0) scale(-1 1)"` : "";
    content = `${background(variant)}${shadow}<g${flip}>${SHAPES[shape](hex)}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600"><defs><linearGradient id="lower" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></linearGradient></defs>${content}</svg>`;
}

export function parseDemoImageFile(file: string): { shape: DemoShape; color: string; variant: number } | null {
  const match = /^([a-z-]+?)-([a-z]+)-([1-3])\.svg$/.exec(file);
  if (!match) return null;
  const [, shape, color, variant] = match;
  if (!shape || !color || !variant) return null;
  if (!(DEMO_SHAPES as readonly string[]).includes(shape)) return null;
  if (!COLOR_OPTIONS.some((option) => option.value === color)) return null;
  return { shape: shape as DemoShape, color, variant: Number(variant) };
}
