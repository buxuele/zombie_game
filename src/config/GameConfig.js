// Global Game Configuration & Physics Constants

export const GAME_CONFIG = {
  // Viewport Dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Ground Baseline
  GROUND_Y: 540,
  ROAD_HEIGHT: 180,

  // Base Physics
  GRAVITY: 800,
  JUMP_FORCE: 480,
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

  // Vehicle Defaults
  FALLBACK_PUSH_TIME_SUCCESS: 0.42,
  FALLBACK_PUSH_TIME_FAIL: 1.2
};
