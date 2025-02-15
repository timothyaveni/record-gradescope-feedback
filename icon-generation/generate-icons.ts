// generateIconsWithPango.ts
import { spawnSync } from 'child_process';
import { createCanvas, loadImage } from 'canvas';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const SIZE = 512;

// The main emoji (video camera)
const MAIN_EMOJI = '📹';
// The overlay emojis for each state
const STATES = [
  { filename: 'icon_idle.png',      overlayEmoji: ''    },
  { filename: 'icon_pending.png',   overlayEmoji: '⌛'   },
  { filename: 'icon_check.png',     overlayEmoji: '✅'   },
  { filename: 'icon_recording.png', overlayEmoji: '🔴'   },
  { filename: 'icon_error.png',     overlayEmoji: '❌'   },
];

/**
 * Rasterize an emoji to a temporary PNG using pango-view and return the file path.
 *
 * @param emoji The emoji to rasterize
 * @param fontSize A rough point-size for pango to render
 * @returns Path to the generated PNG (in the system temp folder)
 */
function rasterizeEmoji(emoji: string, fontSize = 256): string | null {
  if (!emoji) return null;

  // Generate a unique file in the OS temp directory
  const tmpFile = path.join(
    os.tmpdir(),
    `emoji_${Date.now()}_${Math.random()}.png`
  );

  // We rely on the system's installed "Noto Color Emoji" or any color-emoji font.
  // pango-view usage:
  //   pango-view --text="📹" \
  //              --font="Noto Color Emoji 256" \
  //              --background=transparent \
  //              --no-display \
  //              --output=/tmp/somefile.png
  const args = [
    `--text=${emoji}`,
    `--font=Noto Color Emoji ${fontSize}`,
    '--background=transparent',
    '--no-display',
    `--output=${tmpFile}`,
  ];

  // Spawn pango-view
  const result = spawnSync('pango-view', args, { encoding: 'utf-8' });

  if (result.error) {
    console.error(`Error running pango-view: ${result.error.message}`);
    return null;
  }

  if (result.stderr) {
    // pango-view might print warnings on stderr. We'll log them.
    console.warn(`pango-view stderr: ${result.stderr}`);
  }

  return tmpFile;
}

/**
 * Draw a rasterized PNG of an emoji (produced by pango-view) into the canvas,
 * scaling and centering as needed.
 */
async function drawEmojiFromFile(
  ctx: CanvasRenderingContext2D,
  filePath: string,
  targetSize: number,
  centerX: number,
  centerY: number
) {
  if (!fs.existsSync(filePath)) return;

  const img = await loadImage(filePath);

  // The loaded image might be (near) the bounding box of the emoji.
  // We'll scale it so that the largest dimension fits targetSize.
  const maxDim = Math.max(img.width, img.height);
  const scale = targetSize / maxDim;

  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;

  // Center around (centerX, centerY)
  const x = centerX - drawWidth / 2;
  const y = centerY - drawHeight / 2;

  ctx.drawImage(img, x, y, drawWidth, drawHeight);
}

async function generateIcons() {
  for (const { filename, overlayEmoji } of STATES) {
    // 1) Rasterize the main emoji with pango-view
    const mainFile = rasterizeEmoji(MAIN_EMOJI, 512);
    // 2) Rasterize the overlay emoji (if any)
    let overlayFile: string | null = null;
    if (overlayEmoji) {
      overlayFile = rasterizeEmoji(overlayEmoji, 512);
    }

    // 3) Create a transparent 512x512 canvas
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, SIZE, SIZE);

    // 4) Draw the main emoji in the center
    if (mainFile) {
      await drawEmojiFromFile(ctx, mainFile, 400, SIZE / 2, SIZE / 2);
    }

    // 5) Draw the overlay in the bottom-right corner (half scale)
    if (overlayFile) {
      // We'll aim for a smaller target size
      const overlayTargetSize = 300; // half of 400
      const margin = 10;
      const centerX = SIZE - overlayTargetSize / 2 - margin;
      const centerY = SIZE - overlayTargetSize / 2 - margin;
      await drawEmojiFromFile(ctx, overlayFile, overlayTargetSize, centerX, centerY);
    }

    // 6) Write out the final PNG
    const outPath = path.join(process.cwd(), filename);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`Generated: ${filename}`);

    // 7) Clean up temp files if desired
    if (mainFile && fs.existsSync(mainFile)) fs.unlinkSync(mainFile);
    if (overlayFile && fs.existsSync(overlayFile)) fs.unlinkSync(overlayFile);
  }
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
});

