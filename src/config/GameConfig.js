// Global Game Configuration & Physics Constants

export const GAME_CONFIG = {
  // Viewport Dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Ground Baseline (Lowered to 580px to expand sky & background visible area to 80.5%)
  GROUND_Y: 580,
  ROAD_HEIGHT: 140,

  // Base Physics
  GRAVITY: 800,
  JUMP_FORCE: 540,
  JUMP_GLIDE_MAX_TIME: 1.05,
  JUMP_WAVE_STEP: 0.01,
  JUMP_WAVE_MAX_DELAY: 0.16,
  TERMINAL_VELOCITY: 1200,

  // Dynamic Game Speeds
  BASE_SPEED: 300,
  MAX_SPEED: 650,
  SPEED_ACCELERATION: 2.0,

  // Horde Limits
  MAX_HORDE_SIZE: 30,
  DEFAULT_ZOMBIE_WIDTH: 34,
  DEFAULT_ZOMBIE_HEIGHT: 48,

  // Difficulty & Progression Milestones
  LATE_GAME_HARD_DISTANCE: 25000,
  MID_GAME_DISTANCE: 12000,

  // Core vehicle anticipation timing
  FALLBACK_PUSH_TIME_SUCCESS: 0.42,
  FALLBACK_PUSH_TIME_FAIL: 0.75,
  VEHICLE_PUSH_VISIBLE_COUNT: 16
};
