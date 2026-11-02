import { MathUtils } from 'three'

/**
 * Roaming brain for the micro duck: a small waypoint walker that lives on the
 * open floor in front of the desk. Kept free of React/three scene code so the
 * movement can be reasoned about (and simulated) on its own.
 *
 * All coordinates are in the room model's own space (the same space the
 * furniture meshes use).
 */

/** Height the duck stands at, in room units (the desk is ~2.45 units tall). */
export const DUCK_HEIGHT = 0.85
/** Top surface of the room's floor slab — the duck's standing plane. */
export const FLOOR_Y = 0.6
/** Cruising speed in room units per second. */
export const WALK_SPEED = 0.42
/** How fast the duck swings around to face its next waypoint (radians/second). */
export const TURN_SPEED = 2.2
/** Acceleration / braking, in room units per second squared. */
export const ACCEL = 1.6
export const BRAKE = 2.4
/** Distance at which a waypoint counts as reached. */
export const ARRIVE_RADIUS = 0.2
/** Idle pause between waypoints, in seconds. */
export const MIN_PAUSE = 0.5
export const MAX_PAUSE = 2
/** Below this speed the duck counts as standing still. */
export const STILL_SPEED = 0.03

/**
 * Spots the duck wanders between (x, z). They sit on the empty floor in front
 * of the desk, between the chair and the welcome mat, and stay well clear of
 * the furniture (and of the open side of the room that the camera looks from).
 */
export const WAYPOINTS = [
  [0.35, 2.35],
  [-0.75, 2.2],
  [-0.9, 1.15],
  [0.05, 0.95],
  [1.15, 1.1],
  [1.5, 2.05],
]

/** Hard limits of the walkable floor, used as a safety net around the waypoints. */
export const BOUNDS = { minX: -1.15, maxX: 1.7, minZ: 0.45, maxZ: 2.6 }

/** Footprint and height of the welcome mat, which sits a hair above the tiles. */
export const MAT = { minX: 0.78, maxX: 2.4, minZ: -0.03, maxZ: 2.48, y: 0.64 }

/** Height of whatever the duck is standing on at (x, z) — tiles or welcome mat. */
export function groundHeightAt(x, z) {
  const onMat = x >= MAT.minX && x <= MAT.maxX && z >= MAT.minZ && z <= MAT.maxZ
  return onMat ? MAT.y : FLOOR_Y
}

/** Fresh roam state, starting at `index` and heading for `next`. */
export function createRoamState(index = 0, next = (index + 1) % WAYPOINTS.length) {
  const [x, z] = WAYPOINTS[index]
  const [targetX, targetZ] = WAYPOINTS[next]

  return {
    x,
    z,
    yaw: Math.atan2(targetX - x, targetZ - z),
    speed: 0,
    target: next,
    pause: 0,
    time: 0,
  }
}

/**
 * Advance the roam state by `delta` seconds.
 * Returns the duck's current speed so the caller can drive the walk animation.
 */
export function stepRoamState(duck, delta) {
  // Clamp so a dropped frame can't teleport the duck across the room.
  const dt = Math.min(delta, 0.05)
  duck.time += dt

  const [goalX, goalZ] = WAYPOINTS[duck.target]
  const dx = goalX - duck.x
  const dz = goalZ - duck.z
  const distance = Math.hypot(dx, dz)

  // Turn along the shortest arc toward the waypoint.
  const wantedYaw = Math.atan2(dx, dz)
  const turn = Math.atan2(Math.sin(wantedYaw - duck.yaw), Math.cos(wantedYaw - duck.yaw))
  duck.yaw += MathUtils.clamp(turn, -TURN_SPEED * dt, TURN_SPEED * dt)

  let wantedSpeed = 0

  if (duck.pause > 0) {
    duck.pause = Math.max(0, duck.pause - dt)
  } else if (distance <= ARRIVE_RADIUS) {
    duck.pause = MIN_PAUSE + Math.random() * (MAX_PAUSE - MIN_PAUSE)
    duck.target = (duck.target + 1) % WAYPOINTS.length
  } else {
    // Brake all the way down to a standstill on the last stretch, and ease off
    // while swinging round: no sideways slide, and no circling the waypoint
    // waiting for the speed to bleed off.
    const facing = Math.max(0, Math.cos(turn))
    const approach = MathUtils.clamp(distance / 0.5, 0, 1)
    wantedSpeed = WALK_SPEED * facing * approach
  }

  // Accelerate/brake instead of snapping between still and full speed.
  const change = wantedSpeed > duck.speed ? ACCEL * dt : BRAKE * dt
  duck.speed = MathUtils.clamp(
    duck.speed + MathUtils.clamp(wantedSpeed - duck.speed, -change, change),
    0,
    WALK_SPEED,
  )

  // Walk wherever the beak points — no strafing.
  if (duck.speed > 0) {
    duck.x = MathUtils.clamp(duck.x + Math.sin(duck.yaw) * duck.speed * dt, BOUNDS.minX, BOUNDS.maxX)
    duck.z = MathUtils.clamp(duck.z + Math.cos(duck.yaw) * duck.speed * dt, BOUNDS.minZ, BOUNDS.maxZ)
  }

  return duck.speed
}
