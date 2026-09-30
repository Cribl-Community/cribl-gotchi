import { PALETTES, SIZES } from './catalog.ts';
import type { FeatureId, Look, PetRun } from './types.ts';

function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function has(look: Look, feature: FeatureId): boolean {
  return look.features.includes(feature);
}

export function paintPet(ctx: CanvasRenderingContext2D, pet: PetRun | null, now: number): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 128, 128);
  ctx.save();
  ctx.scale(2, 2);
  rect(ctx, 0, 0, 64, 64, '#9bbc0f');
  for (let y = 0; y < 64; y += 2) rect(ctx, 0, y, 64, 1, 'rgba(15,56,15,0.05)');

  if (!pet) {
    rect(ctx, 24, 22, 16, 20, '#8bac0f');
    rect(ctx, 22, 26, 20, 14, '#8bac0f');
    rect(ctx, 28, 30, 3, 3, '#0f380f');
    rect(ctx, 36, 30, 3, 3, '#0f380f');
    rect(ctx, 30, 36, 6, 2, '#0f380f');
    ctx.restore();
    return;
  }

  const t = now / 1000;
  const sick = pet.anim === 'SICK' || pet.health < 40;
  const stressed = pet.anim === 'STRESSED' || Boolean(pet.activeHazard);
  const bob =
    pet.anim === 'HAPPY' || pet.anim === 'PETTED'
      ? -Math.abs(Math.sin(t * 8)) * 4
      : pet.anim === 'DEAD'
        ? 0
        : Math.sin(t * 3) * 1.4;
  const shake = sick || stressed ? Math.sin(t * 42) * 1.3 : 0;
  const palette = PALETTES[pet.look.color] ?? PALETTES.lcd;
  const scale = SIZES[pet.look.size]?.scale ?? 1;

  ctx.translate(32 + shake, 34 + bob);
  ctx.scale(scale, scale);
  ctx.translate(-32, -34);

  if (!pet.isAlive || pet.anim === 'DEAD') {
    rect(ctx, 22, 18, 20, 24, '#8a8f70');
    rect(ctx, 18, 16, 28, 4, '#6d7358');
    rect(ctx, 30, 22, 4, 8, '#0f380f');
    rect(ctx, 28, 26, 8, 2, '#0f380f');
    const gy = 8 + Math.sin(t * 2) * 2;
    rect(ctx, 40, gy, 8, 8, 'rgba(15,56,15,0.35)');
    rect(ctx, 42, gy + 2, 2, 2, '#0f380f');
    rect(ctx, 46, gy + 2, 2, 2, '#0f380f');
    ctx.restore();
    return;
  }

  const body = sick ? '#6b4c8a' : palette.body;
  const dark = sick ? '#2a1c40' : palette.dark;
  const light = palette.light;

  if (pet.evolutionStage === 1) drawBlob(ctx, body, dark, light);
  else if (pet.evolutionStage === 2) drawSerpent(ctx, body, dark, light, t);
  else drawTitan(ctx, body, dark, light, t);

  drawFace(ctx, pet, dark, light, t);
  drawHat(ctx, pet, t);
  if (has(pet.look, 'sweat') || stressed) {
    rect(ctx, 44, 16 + Math.sin(t * 6), 3, 4, '#d7fff6');
  }
  if (pet.anim === 'PETTED' || pet.anim === 'HAPPY') {
    rect(ctx, 46, 12 - (t % 1) * 6, 3, 3, '#e23d6b');
    rect(ctx, 14, 14 - ((t + 0.4) % 1) * 5, 2, 2, '#e23d6b');
  }
  if (pet.anim === 'SLEEP') {
    rect(ctx, 46, 14, 3, 3, dark);
    rect(ctx, 50, 10, 2, 2, dark);
  }
  ctx.restore();
}

function drawBlob(ctx: CanvasRenderingContext2D, body: string, dark: string, light: string): void {
  rect(ctx, 18, 24, 28, 22, body);
  rect(ctx, 22, 20, 20, 8, body);
  rect(ctx, 16, 28, 4, 12, body);
  rect(ctx, 44, 28, 4, 12, body);
  rect(ctx, 24, 44, 6, 4, dark);
  rect(ctx, 36, 44, 6, 4, dark);
  rect(ctx, 26, 28, 6, 4, light);
}

function drawSerpent(
  ctx: CanvasRenderingContext2D,
  body: string,
  dark: string,
  light: string,
  t: number,
): void {
  for (let i = 0; i < 5; i += 1) {
    const y = 22 + Math.sin(t * 4 + i) * 2;
    rect(ctx, 12 + i * 8, y, 10, 10, i === 4 ? light : body);
  }
  rect(ctx, 44, 20, 10, 8, dark);
  rect(ctx, 18, 40, 4, 6, dark);
  rect(ctx, 40, 40, 4, 6, dark);
}

function drawTitan(
  ctx: CanvasRenderingContext2D,
  body: string,
  dark: string,
  light: string,
  t: number,
): void {
  rect(ctx, 16, 22, 32, 22, body);
  rect(ctx, 22, 12, 20, 12, dark);
  rect(ctx, 18, 10, 4, 8, light);
  rect(ctx, 42, 10, 4, 8, light);
  rect(ctx, 12, 26, 5, 8, dark);
  rect(ctx, 47, 26 + Math.sin(t * 6), 5, 8, dark);
  rect(ctx, 20, 42, 8, 6, '#2b2b2b');
  rect(ctx, 36, 42, 8, 6, '#2b2b2b');
  rect(ctx, 22, 44, 4, 4, light);
  rect(ctx, 38, 44, 4, 4, light);
  rect(ctx, 30, 30, 4, 6, light);
}

function drawFace(
  ctx: CanvasRenderingContext2D,
  pet: PetRun,
  dark: string,
  light: string,
  t: number,
): void {
  const sleep = pet.anim === 'SLEEP';
  const y = pet.evolutionStage === 2 ? 22 : pet.evolutionStage === 3 ? 16 : 26;
  const x = pet.evolutionStage === 2 ? 46 : 26;
  if (sleep) {
    rect(ctx, x, y + 2, 5, 2, dark);
    rect(ctx, x + 8, y + 2, 5, 2, dark);
  } else if (has(pet.look, 'lasers')) {
    rect(ctx, x, y, 4, 4, '#ff2d2d');
    rect(ctx, x + 8, y, 4, 4, '#ff2d2d');
    rect(ctx, x + 4, y + 1, 14, 2, '#ffb4b4');
  } else {
    rect(ctx, x, y, 4, 4, dark);
    rect(ctx, x + 8, y, 4, 4, dark);
    rect(ctx, x + 1, y + 1, 2, 2, light);
  }
  if (has(pet.look, 'eyeball')) rect(ctx, x + 4, y - 6, 4, 4, dark);
  if (has(pet.look, 'unibrow')) rect(ctx, x - 1, y - 3, 14, 2, dark);
  const mouthY = y + 8;
  if (pet.anim === 'EAT') rect(ctx, x + 2, mouthY, 8, 5, '#1a1208');
  else if (has(pet.look, 'void')) rect(ctx, x + 2, mouthY, 8, 5, '#140818');
  else if (has(pet.look, 'fangs')) {
    rect(ctx, x + 2, mouthY, 8, 2, dark);
    rect(ctx, x + 3, mouthY + 2, 2, 3, light);
    rect(ctx, x + 7, mouthY + 2, 2, 3, light);
  } else if (pet.anim === 'SICK') rect(ctx, x + 2, mouthY + Math.sin(t * 8), 8, 2, dark);
  else rect(ctx, x + 3, mouthY, 6, 2, dark);
  if (has(pet.look, 'mustache')) rect(ctx, x + 1, mouthY - 2, 10, 2, dark);
  if (has(pet.look, 'halo')) {
    rect(ctx, x - 2, y - 10, 16, 2, '#f2d15a');
    rect(ctx, x + 2, y - 12, 8, 2, '#f2d15a');
  }
}

function drawHat(ctx: CanvasRenderingContext2D, pet: PetRun, t: number): void {
  const jammed = pet.activeHazard?.jammed === pet.look.hat;
  const tilt = jammed ? 4 : 0;
  const y = pet.evolutionStage === 3 ? 6 : 14;
  if (has(pet.look, 'party') || pet.look.hat === 'top_hat') {
    rect(ctx, 24 + tilt, y, 16, 3, pet.look.hat === 'top_hat' ? '#1b1b1b' : '#e23d6b');
    rect(ctx, 28 + tilt, y - 8, 8, 8, pet.look.hat === 'top_hat' ? '#1b1b1b' : '#ffd15c');
  }
  if (pet.look.hat === 'sunglasses') rect(ctx, 24, 24, 18, 4, '#161616');
  if (pet.look.hat === 'visor') rect(ctx, 22, 22, 22, 5, '#39d6c4');
  if (pet.look.hat === 'crown') {
    rect(ctx, 22, 10, 20, 4, '#f2d15a');
    rect(ctx, 22, 6, 4, 6, '#f2d15a');
    rect(ctx, 30, 4 + Math.sin(t * 5), 4, 8, '#f2d15a');
    rect(ctx, 38, 6, 4, 6, '#f2d15a');
  }
  if (pet.look.hat === 'collar') rect(ctx, 22, 40, 20, 3, '#a56b3c');
}
