import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const colors = JSON.parse(
  await readFile(path.join(root, "src/brand/colors.json"), "utf8"),
);
const source = await readFile(path.join(root, "src/brand/artwork.svg"), "utf8");
const artwork = source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!colors[key]) throw new Error(`Unknown brand color: ${key}`);
  return colors[key];
});
const symbols = new Map(
  [
    ...artwork.matchAll(
      /<symbol id="([^"]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g,
    ),
  ].map((match) => [match[1], match]),
);
function sceneDefinitions(id, included = new Set()) {
  if (included.has(id)) return "";
  const symbol = symbols.get(id);
  if (!symbol) throw new Error(`Missing artwork: ${id}`);
  included.add(id);
  const dependencies = [
    ...symbol[0].matchAll(/(?:href|xlink:href)="#([^"]+)"/g),
  ];
  return (
    symbol[0] +
    dependencies.map((match) => sceneDefinitions(match[1], included)).join("\n")
  );
}
const exports = {
  mark: [64, 64],
  bow: [192, 168],
  gift: [160, 176],
  envelope: [320, 230],
  welcome: [720, 520],
  mail: [360, 238],
  help: [640, 500],
};
const svgDir = path.join(root, "public/brand/illustrations");
const emailDir = path.join(root, "public/brand/email");
const sceneMotion = {
  welcome: ["welcome"],
  gift: ["gift"],
  help: ["gift", "help"],
};
const emailFormats = { mark: "png", bow: "png", welcome: "gif", mail: "png" };
await Promise.all([
  mkdir(svgDir, { recursive: true }),
  mkdir(emailDir, { recursive: true }),
]);
const emailImages = {};
for (const [id, [width, height]] of Object.entries(exports)) {
  const symbol = symbols.get(id);
  if (!symbol) throw new Error(`Missing artwork: ${id}`);
  const [x, y, viewWidth, viewHeight] = symbol[2].split(/\s+/).map(Number);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol[2]}" width="${width}" height="${height}"><defs>${sceneDefinitions(id)}</defs><use href="#${id}" x="${x}" y="${y}" width="${viewWidth}" height="${viewHeight}"/></svg>`;
  await writeFile(path.join(svgDir, `${id}.svg`), svg);
  const motionLayers = sceneMotion[id];
  let animatedSvg;
  if (motionLayers) {
    const styles = await Promise.all(
      motionLayers.map((layer) =>
        readFile(path.join(root, "src/brand", `${layer}-motion.css`), "utf8"),
      ),
    );
    animatedSvg = svg.replace("<defs>", `<style>\n${styles.join("\n")}</style><defs>`);
    await writeFile(path.join(svgDir, `${id}-animated.svg`), animatedSvg);
  }
  const format = emailFormats[id];
  if (!format) continue;
  const image = format === "gif"
    ? await renderWelcomeGif(animatedSvg, width, height)
    : await sharp(Buffer.from(svg)).png().toBuffer();
  await writeFile(path.join(emailDir, `${id}.${format}`), image);
  emailImages[id] = image.toString("base64");
}
await writeFile(
  path.join(root, "src/brand/email-images.json"),
  JSON.stringify(emailImages, null, 2) + "\n",
);

async function renderWelcomeGif(svg, sourceWidth, sourceHeight) {
  const width = 325;
  const height = Math.round((width * sourceHeight) / sourceWidth);
  const frameDelay = 100;
  // Capture one wave and stop once Santa's arm is back at rest.
  const duration = 4800;
  const frames = [];
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(
      `<style>
        body { margin: 0; }
        body > svg { display: block; width: 100vw; height: 100vh; }
        svg * { animation-play-state: paused !important; }
      </style>${svg}`,
    );
    await page.evaluate(() => {
      const animations = document.getAnimations();
      if (!animations.some((animation) => animation.animationName === "santa-wave")) {
        throw new Error("The welcome SVG is missing Santa's wave");
      }
      // CSS delays also seek the rendered copies of symbols referenced by <use>.
      for (const { effect } of animations) {
        effect.target.style.animationDelay =
          `calc(${effect.getTiming().delay}ms - var(--email-frame-time, 0ms))`;
      }
    });
    for (let time = 0; time < duration; time += frameDelay) {
      await page.evaluate((frameTime) => {
        document.documentElement.style.setProperty("--email-frame-time", `${frameTime}ms`);
      }, time);
      frames.push(await page.screenshot({ omitBackground: true }));
    }
  } finally {
    await browser.close();
  }
  return sharp(frames, { join: { animated: true } })
    .gif({ delay: frames.map(() => frameDelay), loop: 1, dither: 0 })
    .toBuffer();
}

function hsl(hex) {
  const [r, g, b] = hex.match(/[\da-f]{2}/gi).map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min,
    light = (max + min) / 2;
  let hue = 0;
  if (delta)
    hue =
      (max === r
        ? (g - b) / delta + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4) * 60;
  const saturation = delta ? delta / (1 - Math.abs(2 * light - 1)) : 0;
  return `${hue.toFixed(2)} ${(saturation * 100).toFixed(2)}% ${(light * 100).toFixed(2)}%`;
}
const semantic = {
  background: "paper",
  foreground: "ink",
  card: "surface",
  "card-foreground": "ink",
  popover: "surface",
  "popover-foreground": "ink",
  primary: "cranberry",
  "primary-foreground": "surface",
  secondary: "sage",
  "secondary-foreground": "ink",
  muted: "sage",
  "muted-foreground": "muted",
  accent: "sage",
  "accent-foreground": "ink",
  destructive: "error",
  "destructive-foreground": "surface",
  border: "line",
  input: "controlLine",
  ring: "pine",
};
const variables = Object.entries(semantic).map(
  ([key, color]) => `    --${key}: ${hsl(colors[color])};`,
);
const raw = Object.entries(colors).map(
  ([key, value]) =>
    `    --brand-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value};`,
);
await writeFile(
  path.join(root, "src/app/brand-tokens.css"),
  `/* Generated by npm run brand:build from src/brand/colors.json. */\n:root {\n${[...variables, ...raw].join("\n")}\n    --radius: 0.75rem;\n}\n`,
);
await writeFile(
  path.join(root, "public/brand/manifest.json"),
  JSON.stringify(
    {
      version: 3,
      author:
        "Original code-authored SVG family, refined from the first approved visual study",
      source: "src/brand/artwork.svg",
      colors: "src/brand/colors.json",
      sourceSha256: createHash("sha256").update(source).digest("hex"),
      build: "npm run brand:build",
      web: [
        ...Object.keys(exports).map((id) => `illustrations/${id}.svg`),
        ...Object.keys(sceneMotion).map((id) => `illustrations/${id}-animated.svg`),
      ],
      email: Object.keys(emailImages).map((id) => ({
        master: `illustrations/${id}${emailFormats[id] === "gif" ? "-animated" : ""}.svg`,
        export: `email/${id}.${emailFormats[id]}`,
        embedded: true,
      })),
      notes:
        "The same gift, envelope, star, palette, and stroke treatment are reused across every scene. Storyset is retired and is not used by these exports. Email artwork uses inline PNGs and an animated welcome GIF.",
    },
    null,
    2,
  ) + "\n",
);
console.log("Built shared web artwork, email images, and brand tokens.");
