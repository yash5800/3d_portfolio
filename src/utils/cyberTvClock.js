/**
 * Paints the retro pixel face that plays on the cybertv screen: time, date,
 * an ECG divider and the site's visitor total.
 *
 * Everything is drawn as a grid of chunky cells (1px gap between cells) so it
 * reads like an LED matrix, with dim "off" cells and a soft glow around lit
 * ones. Layout is fixed-width so nothing shuffles as the numbers change.
 */

/** Texture size: matched to the screen quad's ~1.12 aspect ratio. */
export const CLOCK_TEXTURE_WIDTH = 256
export const CLOCK_TEXTURE_HEIGHT = 228

/** Shown until the visitor count loads (and if it can't be reached). */
export const VISITOR_PLACEHOLDER = '----'

/** 5x7 matrix digits. */
const DIGITS = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ',': ['00', '00', '00', '00', '00', '11', '10'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
}

const COLON = ['00', '00', '11', '00', '11', '00', '00']

/** Compact 3x5 letters for the AM/PM tag, date line and labels. */
const LETTERS = {
  A: ['010', '101', '111', '101', '101'],
  B: ['110', '101', '110', '101', '110'],
  C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'],
  F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'],
  H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'],
  K: ['101', '101', '110', '101', '101'],
  L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'],
  N: ['101', '111', '111', '111', '101'],
  O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '111', '011'],
  R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'],
  T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '011'],
  V: ['101', '101', '101', '101', '010'],
  W: ['101', '101', '111', '111', '101'],
  X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'],
  Z: ['111', '001', '010', '100', '111'],
  '·': ['0', '0', '1', '0', '0'],
  '[': ['11', '10', '10', '10', '11'],
  ']': ['11', '01', '01', '01', '11'],
}

/** Compact 3x5 digits for the date inside the meta line. */
const SMALL_DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '001', '001', '001'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
}

/** Group-of-people mark beside the visitor total. */
const PEOPLE = [
  '01000100010',
  '11101110111',
  '11101110111',
  '01000100010',
  '01000100010',
]

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

const TIME_CELL = 8
const TIME_GAP = 5
const MERIDIEM_CELL = 4
const MERIDIEM_GAP = 4
const META_CELL = 4
const META_SPACING = 5
const LABEL_CELL = 3
const LABEL_SPACING = 3
const VISITOR_CELL = 6

const COLOR = {
  time: '#d8f6ff',
  timeGlow: 'rgba(105, 235, 225, 0.4)',
  timeGrid: 'rgba(120, 235, 220, 0.05)',
  timeDim: '#42655f',
  meridiem: '#8fe6d8',
  meta: '#63e5ce',
  visitors: '#ffc84a',
  visitorsGlow: 'rgba(255, 185, 55, 0.4)',
  visitorsGrid: 'rgba(255, 195, 75, 0.045)',
  visitorsPlaceholder: '#8a6a20',
  label: '#48cdb9',
  frame: 'rgba(78, 235, 210, 0.4)',
  divider: 'rgba(78, 235, 210, 0.35)',
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string[]} glyph - Rows of '0'/'1' cells
 * @param {number} x - Left edge of the glyph
 * @param {number} y - Top edge of the glyph
 * @param {number} cell - Cell pitch in canvas pixels
 * @param {{ color: string, grid?: string, glow?: string }} style
 */
function drawGlyph(ctx, glyph, x, y, cell, { color, grid, glow }) {
  const block = cell - 1

  if (grid) {
    ctx.fillStyle = grid
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        ctx.fillRect(x + col * cell, y + row * cell, block, block)
      }
    }
  }

  ctx.save()
  if (glow) {
    ctx.shadowColor = glow
    ctx.shadowBlur = 3
  }
  ctx.fillStyle = color
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (glyph[row][col] === '1') {
        ctx.fillRect(x + col * cell, y + row * cell, block, block)
      }
    }
  }
  ctx.restore()
}

/** @param {string[]} glyph */
function glyphWidth(glyph, cell) {
  return glyph[0].length * cell
}

/** Finds the small letter or digit glyph for a character. */
function smallGlyph(character) {
  return LETTERS[character] ?? SMALL_DIGITS[character] ?? null
}

/** @param {string} text */
function textWidth(text, cell, spacing) {
  let width = 0
  for (let i = 0; i < text.length; i++) {
    const glyph = smallGlyph(text[i])
    width += glyph ? glyphWidth(glyph, cell) : cell
    if (i < text.length - 1) width += spacing
  }
  return width
}

/**
 * Draws a string of 3x5 letters, left to right.
 *
 * @returns {number} The x position just past the last glyph
 */
function drawText(ctx, text, x, y, cell, spacing, style) {
  let cursor = x
  for (const character of text) {
    if (character === ' ') {
      cursor += cell + spacing
      continue
    }
    const glyph = smallGlyph(character)
    if (!glyph) {
      cursor += cell + spacing
      continue
    }
    drawGlyph(ctx, glyph, cursor, y, cell, style)
    cursor += glyphWidth(glyph, cell) + spacing
  }
  return cursor - spacing
}

/**
 * Splits a date into the pieces the face displays.
 *
 * @param {Date} date
 * @returns {{
 *   hour: string, minute: string, meridiem: 'AM' | 'PM',
 *   weekday: string, month: string, day: string, meta: string,
 * }}
 */
export function getClockParts(date) {
  const hours24 = date.getHours()
  const hour12 = hours24 % 12 || 12
  const weekday = WEEKDAYS[date.getDay()]
  const month = MONTHS[date.getMonth()]
  const day = String(date.getDate()).padStart(2, '0')
  return {
    hour: String(hour12).padStart(2, '0'),
    minute: String(date.getMinutes()).padStart(2, '0'),
    meridiem: hours24 < 12 ? 'AM' : 'PM',
    weekday,
    month,
    day,
    meta: `${weekday} · ${month} ${day}`,
  }
}

/** Paints the rounded teal bezel that frames the glass. */
function drawFrame(ctx, w, h) {
  ctx.save()
  ctx.strokeStyle = COLOR.frame
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(70, 230, 205, 0.45)'
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.roundRect(5, 5, w - 10, h - 10, 13)
  ctx.stroke()
  ctx.restore()
}

/** Paints the flat ECG line with a spike through the middle. */
function drawPulseDivider(ctx, w, y) {
  const center = w / 2
  const pulse = [
    [-34, 0],
    [-16, 0],
    [-11, -2],
    [-7, 8],
    [-2, -10],
    [3, 4],
    [7, -2],
    [12, 0],
    [34, 0],
  ]

  ctx.save()
  ctx.strokeStyle = COLOR.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(24, y)
  ctx.lineTo(center - 34, y)
  ctx.moveTo(center + 34, y)
  ctx.lineTo(w - 24, y)
  ctx.stroke()

  ctx.strokeStyle = COLOR.meta
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.shadowColor = 'rgba(90, 235, 215, 0.5)'
  ctx.shadowBlur = 4
  ctx.beginPath()
  pulse.forEach(([dx, dy], index) => {
    const px = center + dx
    const py = y + dy
    if (index === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.restore()
}

/** Chooses a visitor-number size that always fits beside the people mark. */
function visitorCellFor(text) {
  if (text.length <= 6) return VISITOR_CELL
  if (text.length <= 8) return 5
  if (text.length <= 9) return 4
  return 3
}

/**
 * Paints one full frame of the cybertv face.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Date} [date] - Time to show (defaults to now)
 * @param {boolean} [colonVisible] - Blink state for the colon
 * @param {string} [visitors] - Formatted visitor total, or the placeholder
 */
export function drawClock(ctx, date = new Date(), colonVisible = true, visitors = VISITOR_PLACEHOLDER) {
  const { width: w, height: h } = ctx.canvas
  const { hour, minute, meridiem, meta } = getClockParts(date)

  // Faintly lit glass rather than a flat black rectangle.
  const background = ctx.createLinearGradient(0, 0, 0, h)
  background.addColorStop(0, '#04100f')
  background.addColorStop(0.55, '#071817')
  background.addColorStop(1, '#030908')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, w, h)

  drawFrame(ctx, w, h)

  // Time, with the colon blinking between seconds.
  const digits = [hour[0], hour[1], minute[0], minute[1]]
  const digitWidth = glyphWidth(DIGITS[0], TIME_CELL)
  const colonWidth = glyphWidth(COLON, TIME_CELL)
  const timeWidth = digits.length * digitWidth + colonWidth + digits.length * TIME_GAP
  const meridiemWidth = 2 * glyphWidth(LETTERS.A, MERIDIEM_CELL) + MERIDIEM_GAP
  const timeGroupWidth = timeWidth + TIME_GAP + meridiemWidth

  const timeY = 22
  let x = Math.round((w - timeGroupWidth) / 2)

  digits.forEach((digit, index) => {
    drawGlyph(ctx, DIGITS[digit], x, timeY, TIME_CELL, {
      color: COLOR.time,
      grid: COLOR.timeGrid,
      glow: COLOR.timeGlow,
    })
    x += digitWidth + TIME_GAP

    if (index === 1) {
      drawGlyph(ctx, COLON, x, timeY, TIME_CELL, {
        color: colonVisible ? COLOR.time : COLOR.timeDim,
        grid: COLOR.timeGrid,
        glow: colonVisible ? COLOR.timeGlow : undefined,
      })
      x += colonWidth + TIME_GAP
    }
  })

  let tagX = x
  const tagY = timeY + (DIGITS[0].length - LETTERS.A.length) * TIME_CELL
  for (const letter of meridiem) {
    drawGlyph(ctx, LETTERS[letter], tagX, tagY, MERIDIEM_CELL, {
      color: COLOR.meridiem,
    })
    tagX += glyphWidth(LETTERS[letter], MERIDIEM_CELL) + MERIDIEM_GAP
  }

  // Date line: MON · NOV 03
  const metaY = 88
  drawText(
    ctx,
    meta,
    Math.round((w - textWidth(meta, META_CELL, META_SPACING)) / 2),
    metaY,
    META_CELL,
    META_SPACING,
    { color: COLOR.meta },
  )

  drawPulseDivider(ctx, w, 120)

  // Visitor total, with its little group-of-people mark.
  const count = visitors && visitors.length ? visitors : VISITOR_PLACEHOLDER
  const placeholder = count === VISITOR_PLACEHOLDER
  const cell = visitorCellFor(count)
  const gap = Math.max(3, cell - 1)
  let countWidth = 0
  for (let i = 0; i < count.length; i++) {
    const glyph = DIGITS[count[i]]
    countWidth += glyph ? glyphWidth(glyph, cell) : cell
    if (i < count.length - 1) countWidth += gap
  }
  const iconCell = Math.max(3, cell - 1)
  const iconWidth = glyphWidth(PEOPLE, iconCell)
  const iconGap = 14
  const visitorWidth = iconWidth + iconGap + countWidth
  const visitorsY = 132
  const visitorsX = Math.round((w - visitorWidth) / 2)

  drawGlyph(
    ctx,
    PEOPLE,
    visitorsX,
    visitorsY + (DIGITS[0].length * cell - PEOPLE.length * iconCell),
    iconCell,
    { color: COLOR.visitors, glow: COLOR.visitorsGlow },
  )

  let countX = visitorsX + iconWidth + iconGap
  for (const character of count) {
    const glyph = DIGITS[character]
    if (!glyph) {
      countX += cell + gap
      continue
    }
    drawGlyph(ctx, glyph, countX, visitorsY, cell, {
      color: placeholder ? COLOR.visitorsPlaceholder : COLOR.visitors,
      grid: placeholder ? undefined : COLOR.visitorsGrid,
      glow: placeholder ? undefined : COLOR.visitorsGlow,
    })
    countX += glyphWidth(glyph, cell) + gap
  }

  // "[ TOTAL VISITORS ]"
  const label = '[ TOTAL VISITORS ]'
  drawText(
    ctx,
    label,
    Math.round((w - textWidth(label, LABEL_CELL, LABEL_SPACING)) / 2),
    190,
    LABEL_CELL,
    LABEL_SPACING,
    { color: COLOR.label },
  )

  // CRT touches: scanlines, a soft top-edge sheen and a bulged vignette.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.13)'
  for (let y = 1; y < h; y += 3) ctx.fillRect(0, y, w, 1)

  const sheen = ctx.createLinearGradient(0, 0, 0, h * 0.4)
  sheen.addColorStop(0, 'rgba(170, 255, 240, 0.055)')
  sheen.addColorStop(1, 'rgba(170, 255, 240, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h * 0.4)

  const vignette = ctx.createRadialGradient(
    w / 2,
    h / 2,
    h * 0.3,
    w / 2,
    h / 2,
    h * 0.8,
  )
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)
}
