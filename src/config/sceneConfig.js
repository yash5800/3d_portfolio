import { AgXToneMapping } from 'three'

/**
 * External URLs for redirection and iframe embed
 */
export const SCREEN_URL = 'https://yash5800.github.io/portfolio_OS/'
export const LINKEDIN_URL = 'https://www.linkedin.com/in/alaparthi-yaswanth-kiran/'
export const GITHUB_URL = 'https://github.com/yash5800'

/**
 * Screen dimensions & projection settings
 * - The `screen` quad is ~1.7673 x 1.0435 world units.
 * - 1280 CSS px across keeps the page crisp (drei maps 1 CSS px to distanceFactor / 400 world units).
 */
export const SCREEN_PX_WIDTH = 1280
export const SCREEN_SURFACE_OFFSET = 0.004

/**
 * Below this on-screen pixel width, the screen is too small to use comfortably,
 * so the canvas retains pointer events for orbiting/zooming.
 */
export const INTERACTIVE_WIDTH_PX = 420

/**
 * Duration for camera transitions in seconds
 */
export const FOCUS_MOVE_SECONDS = 0.9

/**
 * Default camera settings
 */
export const CAMERA_SETTINGS = {
  position: [9.865841502386758, -16.311039629618953, 9.030291952385834 ],
  fov: 45,
}


/** Live unique visitor total painted on the cybertv glass. */
export const VISITOR_COUNT_URL = 'https://ffjokerking580.goatcounter.com/counter/TOTAL.json'
export const VISITOR_COUNT_REFRESH_MS = 5 * 60 * 1000

/**
 * Idle float for the cybertv robot: a slow, out-of-phase hover so it reads as
 * suspended in the air rather than sliding on a fixed loop.
 * - bob/drift are world units; tilt/pointerLean are radians.
 */
export const CYBERTV_FLOAT = {
  bob: 0.075,
  bobSpeed: 0.9,
  drift: 0.035,
  driftSpeed: 0.42,
  tiltX: 0.035,
  tiltY: 0.06,
  tiltZ: 0.03,
  tiltSpeed: 0.55,
  pointerLean: 0.05,
  leanDamping: 3.2,
}

/**
 * Three.js WebGL renderer settings
 */
export const GL_SETTINGS = {
  toneMapping: AgXToneMapping,
}

/**
 * Default OrbitControls target focus point in 3D space
 */
export const CONTROLS_TARGET = [
  -0.5829776723882855,
  -22.208699781242366,
  -1.636812209640024,
]

/**
 * Horizontal orbit angle limits (azimuth)
 */
export const MIN_ORBIT_AZIMUTH = 0.05403868953614546
export const MAX_ORBIT_AZIMUTH = 1.5

/**
 * Zoom distance constraints for OrbitControls
 */
export const MIN_ZOOM_DISTANCE = 1
export const MAX_ZOOM_DISTANCE = 18

/**
 * Camera position and target coordinates when focused on the PC screen
 */
export const SCREEN_FOCUS_POSITION = [
  -0.6132593229144409,
  -20.86669450920054,
  -1.0499672737921837,
]

export const SCREEN_FOCUS_TARGET = [
  -0.6265679778670212,
  -20.878672956460704,
  -2.3501741919712167,
]

/**
 * Meshes that can sit between the camera and the monitor.
 * Raycasting these occluders prevents the 3D HTML overlay from showing through them.
 */
export const OCCLUDER_NAMES = [
  'wall_part',
  'room002',
  'room004',
  'chair001',
  'seat001',
  'table001',
  'pc',
  'pc_glass',
  'keyboard',
  'lamp001',
  'plant1001',
  'plant2001',
  'smallshelf001',
  'floor',
]
