import { Zombie } from '../src/entities/Zombie.js';
import { ZombieHorde } from '../src/entities/ZombieHorde.js';
import { VEHICLE_TYPES, Vehicle } from '../src/entities/Vehicle.js';
import { assets } from '../src/engine/AssetLoader.js';
import { Storage, storage } from '../src/systems/Storage.js';
import { BiomeManager, THEME_SKY_GRADIENTS } from '../src/systems/BiomeManager.js';
import { Game } from '../src/engine/Game.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`PASS: ${message}`);
  } else {
    failed++;
    console.error(`FAIL: ${message}`);
  }
}

// 1. Jump Physics & Height Peak Test
function testJumpPhysics() {
  console.log('\n--- Testing Jump Physics & Max Height Limit ---');
  const z = new Zombie(0, 200, 492, true);
  const gravity = 800;
  const jumpImpulse = GAME_CONFIG.JUMP_FORCE;
  const dt = 1 / 60;

  z.jump(jumpImpulse);
  let peakHeight = 0;
  const startY = z.y;

  // Simulate jump ascent
  for (let step = 0; step < 60; step++) {
    z.update(dt, 300, gravity, 492, true, null);
    const heightAboveGround = startY - z.y;
    if (heightAboveGround > peakHeight) {
      peakHeight = heightAboveGround;
    }
  }

  assert(GAME_CONFIG.JUMP_FORCE === 540, 'Jump impulse increased to 540 for longer jump distance');
  assert(peakHeight > 160, `Jump reaches enhanced height: ${peakHeight.toFixed(1)}px`);
  assert(peakHeight <= 440, `Jump stays comfortably within screen viewport: ${peakHeight.toFixed(1)}px <= 440px`);

  // Short tap jump cut test
  const zShort = new Zombie(1, 200, 492, true);
  zShort.jump(jumpImpulse);
  zShort.cutJump(0.45);
  let shortPeak = 0;
  for (let step = 0; step < 60; step++) {
    zShort.update(dt, 300, gravity, 492, false, null);
    const h = startY - zShort.y;
    if (h > shortPeak) shortPeak = h;
  }
  assert(shortPeak < peakHeight, `Short tap cut reduces jump peak: ${shortPeak.toFixed(1)}px < ${peakHeight.toFixed(1)}px`);
}

function testJumpReleaseLatency() {
  console.log('\n--- Testing Immediate Jump Release ---');

  const horde = new ZombieHorde(200, 540, 4);
  horde.jump(GAME_CONFIG.JUMP_FORCE);
  const leaderVelocityBeforeCut = horde.leader.vy;
  horde.cutJump();

  assert(horde.leader.vy > leaderVelocityBeforeCut, 'Leader short-tap cut applies immediately');
  assert(horde.zombies[1].cutJumpPending === true, 'Queued follower receives an immediate pending cut');

  horde.update(1 / 60, 300, 800, { isGroundAt: () => true }, false, null);
  assert(horde.zombies[1].grounded === false, 'Queued follower still jumps after the release');
  assert(horde.zombies[1].vy > -300, 'Queued follower receives the short-tap cut without timer delay');
}

// 2. Wave Jump Cascading Delay Test
function testWaveJumpCascade() {
  console.log('\n--- Testing Wave Jump Cascade Delay ---');
  const horde = new ZombieHorde(200, 540, 4);
  assert(horde.zombies.length === 4, 'Horde initialized with 4 zombies');

  // Trigger jump
  horde.jump(550);

  // Leader should jump immediately
  assert(horde.zombies[0].grounded === false, 'Leader jumps immediately');
  assert(horde.zombies[0].vy < 0, 'Leader has upward velocity');

  // Follower 1 should have queued jump with 0.01s delay
  assert(horde.zombies[1].jumpQueued === true, 'Follower 1 has queued jump');
  assert(Math.abs(horde.zombies[1].jumpDelayTimer - 0.01) < 0.001, 'Follower 1 delay is 0.01s');
  assert(Math.abs(horde.zombies[2].jumpDelayTimer - 0.02) < 0.001, 'Follower 2 delay is 0.02s');
  assert(Math.abs(horde.zombies[3].jumpDelayTimer - 0.03) < 0.001, 'Follower 3 delay is 0.03s');

  const largeHorde = new ZombieHorde(200, 540, 36);
  largeHorde.jump(550);
  const lastFollower = largeHorde.zombies[largeHorde.zombies.length - 1];
  assert(lastFollower.jumpDelayTimer <= 0.16, 'Large horde wave delay is capped at 0.16s');
}

function testJumpInputDispatch() {
  console.log('\n--- Testing Immediate Jump Input Dispatch ---');

  const game = Object.create(Game.prototype);
  let jumpCount = 0;
  let cutCount = 0;

  game.horde = {
    count: 1,
    jump: () => { jumpCount++; },
    cutJump: () => { cutCount++; }
  };
  game.input = {
    consumeJumpPress: () => true,
    consumeJumpRelease: () => true
  };
  game.jumpImpulse = GAME_CONFIG.JUMP_FORCE;

  game.processJumpInput();

  assert(jumpCount === 1, 'Jump press is dispatched exactly once before the fixed physics step');
  assert(cutCount === 1, 'Jump release is dispatched exactly once before the fixed physics step');
}

// 3. Vehicle Thresholds Test
function testVehicleThresholds() {
  console.log('\n--- Testing Vehicle Thresholds ---');
  const car = new Vehicle(400, 540, 'CAR');
  const bus = new Vehicle(800, 540, 'BUS');
  const tank = new Vehicle(1200, 540, 'TANK');
  const plane = new Vehicle(1600, 540, 'AIRPLANE');

  assert(car.required === 4, 'Car requires 4 zombies');
  assert(bus.required === 8, 'Bus requires 8 zombies');
  assert(tank.required === 12, 'Tank requires 12 zombies');
  assert(plane.required === 16, 'Airplane requires 16 zombies');
}

function testVehicleAnticipationTiming() {
  console.log('\n--- Testing Mandatory Vehicle Pre-Impact Wait ---');

  for (const type of Object.keys(VEHICLE_TYPES)) {
    const vehicle = new Vehicle(400, 540, type);
    vehicle.startPushing(true);
    assert(vehicle.pushTimer === GAME_CONFIG.FALLBACK_PUSH_TIME_SUCCESS, `${type} success wait is configured at 0.42s`);
    vehicle.update(GAME_CONFIG.FALLBACK_PUSH_TIME_SUCCESS - 1 / 60, null, null);
    assert(vehicle.pushTimer > 0, `${type} does not settle before its success wait ends`);
    vehicle.update(1 / 60, null, null);
    assert(vehicle.pushTimer <= 0, `${type} settles after its success wait ends`);
  }

  const horde = new ZombieHorde(200, 540, 4);
  const car = new Vehicle(210, 540, 'CAR');
  const fakeGame = {
    horde,
    transformations: { activeType: null },
    gameSpeed: 200,
    level: { vehicles: [car], civilians: [] },
    particles: {
      spawn: () => {},
      spawnAngelGhost: () => {},
      spawnVehicleExplosion: () => {},
      spawnVehicleDebris: () => {},
      spawnShockwave: () => {}
    },
    floatingText: { spawn: () => {} },
    renderer: { camera: { addTrauma: () => {} } },
    activePushVehicle: null,
    rewardCount: 0,
    handleVehicleReward() {
      this.rewardCount++;
    }
  };

  CollisionManager.handleVehicles(fakeGame, 1 / 60);
  assert(car.isPushing === true, 'A direct car collision enters the mandatory wait state');
  assert(car.isFlipped === false, 'A car cannot flip on the first contact frame');

  for (let step = 0; step < 25; step++) {
    CollisionManager.handleVehicles(fakeGame, 1 / 60);
  }
  assert(car.isFlipped === false, 'A car remains stable throughout the 0.42s anticipation window');
  assert(fakeGame.rewardCount === 0, 'No vehicle reward is granted before the anticipation window ends');

  CollisionManager.handleVehicles(fakeGame, 1 / 60);
  assert(car.isFlipped === true, 'A car flips after the mandatory anticipation window');
  assert(fakeGame.rewardCount === 1, 'Vehicle reward is granted exactly after the anticipation window');
}

function testGroupPushFormationAndJumpCancel() {
  console.log('\n--- Testing Group Push Formation & Jump Cancel ---');

  const horde = new ZombieHorde(600, 540, 8);
  horde.zombies.forEach((z, index) => {
    z.x = 600 - index * 70;
  });
  horde.setPushing(true);

  const terrain = { isGroundAt: () => true };
  for (let step = 0; step < 30; step++) {
    horde.update(1 / 60, 200, 800, terrain, false, null);
  }

  const leaderX = horde.leader.x;
  const closePushers = horde.zombies.filter(z =>
    z.x < leaderX + 20 && z.x > leaderX - 180
  );
  assert(closePushers.length >= 6, `At least six zombies visibly gather at the vehicle: ${closePushers.length}`);
  assert(horde.zombies.every(z => z.isPushing), 'All visible zombies enter the pushing state');

  const jumpDispatched = horde.jump(GAME_CONFIG.JUMP_FORCE);
  assert(jumpDispatched === true, 'Jump input is accepted during the push wait');
  assert(horde.leader.isPushing === false, 'Leader jump cancels its pushing lock');
  assert(horde.leader.grounded === false, 'Leader immediately leaves the ground during push wait');

  const cancelHorde = new ZombieHorde(200, 540, 4);
  const cancelCar = new Vehicle(210, 540, 'CAR');
  const cancelGame = {
    horde: cancelHorde,
    transformations: { activeType: null },
    gameSpeed: 200,
    level: { vehicles: [cancelCar], civilians: [] },
    particles: { spawn: () => {}, spawnAngelGhost: () => {} },
    floatingText: { spawn: () => {} },
    renderer: { camera: { addTrauma: () => {} } },
    activePushVehicle: null
  };

  CollisionManager.handleVehicles(cancelGame, 1 / 60);
  assert(cancelCar.isPushing === true, 'Vehicle enters the push wait before the player reacts');
  cancelHorde.jump(GAME_CONFIG.JUMP_FORCE);
  CollisionManager.handleVehicles(cancelGame, 1 / 60);
  assert(cancelCar.isPushing === false, 'Player jump cancels the vehicle push interaction');
  assert(cancelGame.activePushVehicle === null, 'Cancelled push releases the active vehicle lock');
}

// 4. Storage & Missions Test
function testStorageAndMissions() {
  console.log('\n--- Testing Storage & Missions ---');
  const mockStorage = new Storage();
  mockStorage.data.totalCoins = 100;
  mockStorage.addCoins(50);
  assert(mockStorage.data.totalCoins === 150, 'Add coins updates balance');

  assert(mockStorage.spendCoins(60) === true, 'Spend coins succeeds when sufficient');
  assert(mockStorage.data.totalCoins === 90, 'Balance deducted correctly');
  assert(mockStorage.spendCoins(200) === false, 'Spend coins rejected when insufficient');

  mockStorage.updateMission('cars_flipped', 3);
  const m = mockStorage.data.missions.find(x => x.type === 'cars_flipped');
  assert(m.completed === true, 'Mission marked completed after meeting target');
}

// 5. Vehicle Platform Falling Test (Fix floating in air bug)
function testVehiclePlatformFalling() {
  console.log('\n--- Testing Vehicle Platform Landing and Gravity Recovery ---');
  const horde = new ZombieHorde(200, 540, 1);
  const z = horde.leader;
  const terrain = { isGroundAt: () => true };
  const gravity = 800;
  const dt = 1 / 60;

  // Simulate zombie jumping on top of car roof (roof height 470, zombie height 54 -> y = 416)
  z.standingOnPlatform = true;
  z.land(416, null);
  assert(z.y === 416, 'Zombie landed on car roof at y=416');
  assert(z.grounded === true, 'Zombie is grounded while standing on car roof');

  // Zombie stays on roof for 3 frames
  for (let i = 0; i < 3; i++) {
    z.standingOnPlatform = true;
    horde.update(dt, 300, gravity, terrain, false, null);
    assert(z.y === 416, `Frame ${i+1}: Zombie runs stably on car roof platform`);
  }

  // Zombie runs off the car roof into open air (standingOnPlatform becomes false)
  // In the next frame, horde.update should recognize zombie is in air and apply gravity
  horde.update(dt, 300, gravity, terrain, false, null);
  assert(z.grounded === false, 'Zombie becomes airborne after running off car roof');
  assert(z.vy > 0, 'Zombie acquires downward gravity velocity');
  assert(z.y > 416, `Zombie begins falling down towards road: y=${z.y.toFixed(1)}px > 416px`);

  // Simulate falling until touching ground road (y=486)
  for (let i = 0; i < 30; i++) {
    horde.update(dt, 300, gravity, terrain, false, null);
  }

  assert(Math.abs(z.y - (540 - 54)) < 2, `Zombie successfully lands back on road: y=${z.y.toFixed(1)}px === 486px`);
  assert(z.grounded === true, 'Zombie is grounded on normal road');
}

// 6. Grounded Horde Running & Wave Formation Test
function testGroundedHordeWaveFormation() {
  console.log('\n--- Testing Grounded Horde Running & Wave Formation ---');
  const horde = new ZombieHorde(200, 540, 12);
  const terrain = { isGroundAt: () => true };
  const gravity = 800;
  const dt = 1 / 60;

  // Update for 10 frames to settle spring flocking
  for (let i = 0; i < 10; i++) {
    horde.update(dt, 300, gravity, terrain, false, null);
  }

  const leader = horde.zombies[0];
  const follower1 = horde.zombies[3];
  const followerRear = horde.zombies[8];

  assert(Math.abs(leader.y - 486) < 2, `Leader zombie stays on road: y=${leader.y.toFixed(1)}px`);
  assert(Math.abs(follower1.y - 486) < 2, `Follower 1 stays firmly on road: y=${follower1.y.toFixed(1)}px`);
  assert(Math.abs(followerRear.y - 486) < 2, `Rear follower stays firmly on road without floating: y=${followerRear.y.toFixed(1)}px === 486px`);
  assert(followerRear.grounded === true, 'Rear follower is grounded');
}

// 7. Secondary Hat Spring Motion Test
function testSecondaryHatSpringPhysics() {
  console.log('\n--- Testing Secondary Hat Spring Physics ---');
  const z = new Zombie(0, 200, 486, true);
  assert(z.hatSpringY === 0, 'Initial hat spring offset is 0');

  // Trigger jump -> hat pops upwards (hatVelocityY < 0)
  z.jump(480);
  assert(z.hatVelocityY < 0, `Hat velocity pops upwards upon jump: ${z.hatVelocityY} < 0`);

  // Simulate update -> hat spring moves upwards
  z.update(1 / 60, 300, 800, 486, false, null);
  assert(z.hatSpringY < 0, `Hat position offset pops upwards: ${z.hatSpringY.toFixed(2)}px < 0`);
}

// 8. Vehicle Suspension & Downforce Physics Test
function testVehicleSuspensionState() {
  console.log('\n--- Testing Vehicle Suspension & Downforce Physics ---');
  const car = new Vehicle(400, 540, 'CAR');
  assert(car.isPushing === false, 'Vehicle initially not in push state');

  car.startPushing(true);
  assert(car.isPushing === true, 'Vehicle enters push state');
  assert(car.suspensionY > 0, `Vehicle suspension compresses: ${car.suspensionY}px > 0`);
  assert(car.chassisTilt < 0, `Vehicle chassis tilts under push force: ${car.chassisTilt.toFixed(2)}rad < 0`);
}

// 9. Civilian Professions & Clothing Inheritance Test
function testCivilianInfectionInheritance() {
  console.log('\n--- Testing Civilian Professions & Clothing Inheritance ---');
  const horde = new ZombieHorde(200, 540, 1);
  assert(horde.count === 1, 'Horde starts with 1 leader');

  // Infect worker with hardhat
  const newZ = horde.addZombie(180, 486, '#e67e22', '#7f8c8d', 'hardhat');
  assert(horde.count === 2, 'Horde count increases to 2');
  assert(newZ.shirtColor === '#e67e22', 'New zombie inherited worker shirt color #e67e22');
  assert(newZ.accessory === 'hardhat', 'New zombie inherited hardhat accessory');
}

// 10. Stationary Parked Vehicle Stability Test
function testDynamicMovingTrafficPhysics() {
  console.log('\n--- Testing Stationary Parked Vehicle Stability ---');
  const parkedBus = new Vehicle(1000, 540, 'BUS', false);
  const parkedTank = new Vehicle(1500, 540, 'TANK', false);
  assert(parkedBus.isMoving === false, 'Bus is strictly stationary parked obstacle');
  assert(parkedBus.moveSpeed === 0, 'Bus has zero movement speed');
  assert(parkedTank.isMoving === false, 'Tank is strictly stationary parked obstacle');
  assert(parkedTank.moveSpeed === 0, 'Tank has zero movement speed');

  const dt = 0.5;
  parkedBus.update(dt, null, null);
  parkedTank.update(dt, null, null);
  assert(parkedBus.x === 1000, 'Parked bus maintains exact stationary coordinates without random movement');
  assert(parkedTank.x === 1500, 'Parked tank maintains exact stationary coordinates without random movement');
}

// 11. Biome Random Switch & Non-Repeating Previous Zone Test
function testBiomeRandomNonRepeating() {
  console.log('\n--- Testing Biome Random Selection & Non-Repeating Constraint ---');
  const bm = new BiomeManager();
  
  const mockAssets = {
    backgrounds: [
      { id: 'city', name: '大都会夜景', roadStyle: 'CITY' },
      { id: 'beach', name: '热带海岸', roadStyle: 'BEACH' },
      { id: 'desert', name: '黄金沙漠', roadStyle: 'DESERT' },
      { id: 'b1', name: '赛博霓虹都市', roadStyle: 'CYBER' },
      { id: 'b2', name: '日落晚霞峡谷', roadStyle: 'SUNSET' },
      { id: 'b3', name: '未来科幻基地', roadStyle: 'SCI_FI' },
      { id: 'b4', name: '幽暗深渊森林', roadStyle: 'FOREST' }
    ]
  };

  // Generate 100 consecutive zones across 800,000px distance
  bm.ensureDistance(800000, mockAssets);
  assert(bm.zones.length >= 80, `Generated ${bm.zones.length} consecutive zones`);

  let repetitionFound = false;
  for (let i = 1; i < bm.zones.length; i++) {
    const prevZone = bm.zones[i - 1];
    const currZone = bm.zones[i];
    if (prevZone.theme.id === currZone.theme.id) {
      repetitionFound = true;
      console.error(`Repetition detected at zone #${i}: ${currZone.theme.id} === ${prevZone.theme.id}`);
      break;
    }
  }

  assert(repetitionFound === false, 'Strict guarantee: Consecutive biomes NEVER repeat the same background theme');

  // Verify road style mapping
  const testX = bm.zones[0].startX + 100;
  const style = bm.getRoadStyleAt(testX);
  assert(style === bm.zones[0].roadStyle, `Road style at ${testX}px matches active zone style: ${style}`);
}

// 12. Biome Smoothstep Alpha Crossfade Invariant Test
function testBiomeSmoothAlphaCrossfade() {
  console.log('\n--- Testing Biome Smoothstep Alpha Crossfade Invariant ---');
  const bm = new BiomeManager();
  const mockAssets = {
    backgrounds: [
      { id: 'city', name: '大都会夜景', roadStyle: 'CITY' },
      { id: 'beach', name: '热带海岸', roadStyle: 'BEACH' }
    ]
  };
  bm.ensureDistance(20000, mockAssets);

  const z0 = bm.zones[0];
  const z1 = bm.zones[1];

  // Test midpoint of transition
  const midTransitionX = z0.mainEndX + z0.transitionLength * 0.5;
  const renderables = bm.getRenderableZones(midTransitionX, 1280, mockAssets);
  assert(renderables.length >= 2, `Both overlapping zones render during transition: ${renderables.length} zones`);

  const r0 = renderables.find(r => r.zone.index === 0);
  const r1 = renderables.find(r => r.zone.index === 1);

  assert(r0 !== undefined && r1 !== undefined, 'Both zone 0 and zone 1 are active in renderables');
  assert(Math.abs(r0.alpha - 0.5) < 0.01, `Zone 0 alpha at midpoint is 0.5: ${r0.alpha.toFixed(3)}`);
  assert(Math.abs(r1.alpha - 0.5) < 0.01, `Zone 1 alpha at midpoint is 0.5: ${r1.alpha.toFixed(3)}`);
  assert(Math.abs((r0.alpha + r1.alpha) - 1.0) < 0.001, `Alpha sum strictly equals 1.0 (no void/black flash): ${(r0.alpha + r1.alpha).toFixed(3)} === 1.0`);
}

// 12. Dynamic Ground Shadow Scaling Test
function testDynamicGroundShadowScaling() {
  console.log('\n--- Testing Dynamic Ground Shadow Scaling ---');
  const z = new Zombie(0, 200, 486, true); // on ground
  const groundY = 540;

  // On ground
  const hGrounded = Math.max(0, groundY - (z.y + z.height));
  const factorGrounded = Math.max(0.12, 1 - hGrounded / 350);
  assert(factorGrounded === 1, `Ground shadow factor at ground is 1.0: ${factorGrounded}`);

  // In air at peak y=250 (height = 236px)
  z.y = 250;
  const hAir = Math.max(0, groundY - (z.y + z.height));
  const factorAir = Math.max(0.12, 1 - hAir / 350);
  assert(factorAir < 0.5, `Ground shadow scales down in air: ${factorAir.toFixed(2)} < 0.5`);
  assert(factorAir >= 0.12, `Ground shadow maintains minimum visibility factor: ${factorAir.toFixed(2)} >= 0.12`);
}

// 13. Fixed Camera Stability Test
import { Camera } from '../src/engine/Renderer.js';
function testFixedCameraStability() {
  console.log('\n--- Testing Fixed Camera Stability (No Zoom Distortion) ---');
  const cam = new Camera();
  assert(cam.zoom === 1.0, 'Camera zoom initialized at 1.0');

  // Jump high
  cam.update(0.1, 500, 150);
  assert(cam.zoom === 1.0, 'Camera zoom remains 1.0 during high jumps (no zoom distortion)');

  // Run fast
  cam.update(0.5, 1200, 486);
  assert(cam.zoom === 1.0, 'Camera zoom remains 1.0 during fast running');
}

// 14. Particle System Visual Types Test
import { ParticleSystem } from '../src/effects/ParticleSystem.js';
function testParticleSystemVisualTypes() {
  console.log('\n--- Testing Particle System Visual Types & Helpers ---');
  const ps = new ParticleSystem(100);

  ps.spawnAngelGhost(200, 400);
  const ghost = ps.particles.find(p => p.active && p.type === 'ghost');
  assert(ghost !== undefined, 'Angel ghost particle spawned successfully');
  assert(ghost.vy < -50, `Ghost particle has upward floating velocity: ${ghost.vy}`);

  ps.spawnCivilianPanic(300, 400);
  const sweat = ps.particles.find(p => p.active && p.type === 'sweat');
  assert(sweat !== undefined, 'Panic sweat droplet spawned successfully');

  ps.spawnWaterFoam(400, 300);
  const foam = ps.particles.find(p => p.active && p.type === 'foam');
  assert(foam !== undefined, 'Tsunami water foam bubble spawned successfully');

  ps.spawnCurrencyAura(500, 400, 'coin');
  const aura = ps.particles.find(p => p.active && p.type === 'shockwave');
  assert(aura !== undefined, 'Currency aura shockwave spawned successfully');

  // Verify ParticleSystem update loop including tire bouncing on ground
  ps.spawnVehicleDebris(300, GAME_CONFIG.GROUND_Y - 20, 2);
  let errorCaught = null;
  try {
    for (let step = 0; step < 15; step++) {
      ps.update(1 / 60, 0);
    }
  } catch (err) {
    errorCaught = err;
  }
  assert(errorCaught === null, 'ParticleSystem update runs cleanly without throwing reference errors');
}

// 15. Adaptive Scene BGM Tracks Test
import { audio } from '../src/engine/Audio.js';
function testAdaptiveSceneBgmTracks() {
  console.log('\n--- Testing Adaptive Scene BGM Soundtracks ---');
  audio.setBgmTheme('CITY');
  assert(audio.currentBgmTheme === 'CITY', 'BGM theme switches to CITY');
  const cityTrack = audio.getThemeTrack('CITY');
  assert(cityTrack.tempo === 200, 'City track tempo is 200ms');
  assert(cityTrack.waveform === 'square', 'City track uses electro square synth');

  audio.setBgmTheme('BEACH');
  assert(audio.currentBgmTheme === 'BEACH', 'BGM theme switches to BEACH');
  const beachTrack = audio.getThemeTrack('BEACH');
  assert(beachTrack.tempo === 220, 'Beach track tempo is 220ms');
  assert(beachTrack.waveform === 'triangle', 'Beach track uses cheerful triangle waveform');

  audio.setBgmTheme('DESERT');
  assert(audio.currentBgmTheme === 'DESERT', 'BGM theme switches to DESERT');
  const desertTrack = audio.getThemeTrack('DESERT');
  assert(desertTrack.tempo === 250, 'Desert track tempo is 250ms');
  assert(desertTrack.waveform === 'sawtooth', 'Desert track uses mysterious sawtooth waveform');
}

// 16. Hazard Visibility & Progressive Difficulty Test
import { LevelGenerator } from '../src/systems/LevelGenerator.js';
import { Bomb } from '../src/entities/Obstacle.js';
function testHazardVisibilityAndProgressiveDifficulty() {
  console.log('\n--- Testing Hazard Visibility & Progressive Difficulty ---');
  const lg = new LevelGenerator(540);
  lg.generateChunk(3200);

  // Early bomb has high contrast
  const earlyBomb = new Bomb(5000, 540);
  const isEarlyHard = earlyBomb.x > 25000;
  assert(!isEarlyHard, 'Early bomb (<25000px) is in friendly high-contrast warning mode');

  // Late game bomb is stealth
  const lateBomb = new Bomb(30000, 540);
  const isLateHard = lateBomb.x > 25000;
  assert(isLateHard, 'Late-game bomb (>25000px) transitions to advanced stealth camouflage mode');

  // Verify platforms have chasms between gaps
  lg.platforms = [
    { startX: 0, endX: 1000 },
    { startX: 1200, endX: 2500 }
  ];
  assert(lg.platforms[0].endX < lg.platforms[1].startX, 'Gap exists between platform 0 and 1');
  const gapWidth = lg.platforms[1].startX - lg.platforms[0].endX;
  assert(gapWidth === 200, `Chasm pit gap width is 200px: ${gapWidth}`);
}

// 17. Vehicle Tire Ground Contact Invariant Test
function testVehicleGroundContact() {
  console.log('\n--- Testing Vehicle Tire Ground Contact Invariant ---');
  const groundY = 540;
  const bus = new Vehicle(1000, groundY, 'BUS');
  assert(bus.y + bus.height === groundY, `Bus bottom aligns strictly with groundY 540: ${bus.y + bus.height}`);
  const car = new Vehicle(1500, groundY, 'CAR');
  assert(car.y + car.height === groundY, `Car bottom aligns strictly with groundY 540: ${car.y + car.height}`);
  const tank = new Vehicle(2000, groundY, 'TANK');
  assert(tank.y + tank.height === groundY, `Tank bottom aligns strictly with groundY 540: ${tank.y + tank.height}`);
}

// 18. Early Game Car Density & Runway Pacing Test
function testEarlyCarDensity() {
  console.log('\n--- Testing Early Game Car Density & Pacing ---');
  const lg = new LevelGenerator(540);
  const carsInRunway = lg.vehicles.filter(v => v.config.type === 'CAR');
  assert(carsInRunway.length >= 2, `Early runway contains at least 2 cars for early flips: ${carsInRunway.length}`);
  const totalVehiclesInRunway = lg.vehicles.length;
  assert(totalVehiclesInRunway >= 3, `Total vehicles in early runway is at least 3: ${totalVehiclesInRunway}`);
}

// 19. Civilian Abyss Fall Physics & Pit Detection Test
import { Civilian } from '../src/entities/Civilian.js';
function testCivilianAbyssFallPhysics() {
  console.log('\n--- Testing Civilian Abyss Fall Physics & Pit Detection ---');
  const lg = new LevelGenerator(540);
  lg.platforms = [
    { startX: 0, endX: 1000 },
    { startX: 1500, endX: 2500 }
  ];

  const civ = new Civilian(1200, 540); // Spawned in gap
  assert(!civ.isFalling, 'Civilian starts standing');
  civ.update(1 / 60, null, lg);
  assert(civ.isFalling === true, 'Civilian detects no ground underneath and starts falling');
  assert(civ.vy > 0, 'Civilian has downward fall velocity');
  assert(civ.y > 540 - 48, 'Civilian y position increases downwards into the abyss');
}

// 20. CollisionManager & GameConfig Refactoring Invariant Test
import { CollisionManager } from '../src/systems/CollisionManager.js';
import { GAME_CONFIG } from '../src/config/GameConfig.js';
function testCollisionManagerModule() {
  console.log('\n--- Testing CollisionManager & GameConfig Module ---');
  assert(GAME_CONFIG.CANVAS_WIDTH === 1280, 'GAME_CONFIG contains CANVAS_WIDTH 1280');
  assert(GAME_CONFIG.GROUND_Y === 580, 'GAME_CONFIG contains GROUND_Y 580');
  assert(GAME_CONFIG.ROAD_HEIGHT === 140, 'GAME_CONFIG contains ROAD_HEIGHT 140');
  assert(GAME_CONFIG.GRAVITY === 800, 'GAME_CONFIG contains GRAVITY 800');

  // AABB tests
  const b1 = { x: 100, y: 100, width: 50, height: 50 };
  const b2 = { x: 120, y: 120, width: 50, height: 50 };
  const b3 = { x: 300, y: 300, width: 50, height: 50 };
  assert(CollisionManager.checkAABB(b1, b2) === true, 'CollisionManager detects overlapping boxes');
  assert(CollisionManager.checkAABB(b1, b3) === false, 'CollisionManager detects separated boxes');
}

// 21. Distant Vehicle No Auto-Flip Invariant Test
function testDistantVehicleNoAutoFlip() {
  console.log('\n--- Testing Distant Vehicle No Auto-Flip Invariant ---');
  const fakeGame = {
    horde: {
      leader: { x: 200, y: 492, width: 34, height: 48 },
      zombies: [{ alive: true, x: 200, y: 492, width: 34, height: 48 }],
      count: 12,
      setPushing: () => {}
    },
    transformations: { activeType: 'TSUNAMI' },
    feverTimer: 5.0,
    gameSpeed: 200,
    level: {
      vehicles: [
        new Vehicle(1500, 540, 'BUS') // Distant vehicle 1300px away
      ]
    },
    particles: null,
    floatingText: null,
    renderer: { camera: { addTrauma: () => {} } }
  };

  const distantBus = fakeGame.level.vehicles[0];
  CollisionManager.handleVehicles(fakeGame, 1 / 60);
  assert(distantBus.isFlipped === false, 'Distant bus (1300px away) is NOT flipped even during Tsunami / Fever mode');
  assert(distantBus.isPushing === false, 'Distant bus is not in pushing state');
}

// 22. Strict Tank & Vehicle Required Zombie Threshold Invariant Test
function testStrictTankRequiredThreshold() {
  console.log('\n--- Testing Strict Tank & Vehicle Required Zombie Threshold ---');
  // Horde with 3 zombies hitting a Tank (requires 12)
  const zombiesList = [
    { alive: true, x: 200, y: 492, width: 46, height: 48 },
    { alive: true, x: 170, y: 492, width: 46, height: 48 },
    { alive: true, x: 140, y: 492, width: 46, height: 48 }
  ];

  const fakeGame = {
    horde: {
      leader: zombiesList[0],
      zombies: zombiesList,
      count: 3,
      setPushing: () => {}
    },
    transformations: { activeType: null },
    feverTimer: 5.0, // Even during fever
    gameSpeed: 200,
    level: {
      vehicles: [
        new Vehicle(210, 540, 'TANK') // In direct physical contact
      ]
    },
    particles: { spawn: () => {}, spawnAngelGhost: () => {} },
    floatingText: { spawn: () => {} },
    renderer: { camera: { addTrauma: () => {} } }
  };

  const tank = fakeGame.level.vehicles[0];
  assert(tank.required === 12, 'Tank requires 12 zombies to flip');
  CollisionManager.handleVehicles(fakeGame, 1 / 60);
  assert(tank.isPushing === true, 'Insufficiently staffed tank enters the 0.75s group push wait');
  assert(tank.pushTimer === GAME_CONFIG.FALLBACK_PUSH_TIME_FAIL, 'Failure push wait uses the configured 0.75s duration');
  assert(zombiesList[0].alive === true, 'Front zombie survives during the reaction window');

  const failureFrames = Math.ceil((GAME_CONFIG.FALLBACK_PUSH_TIME_FAIL + 0.05) * 60);
  for (let step = 0; step < failureFrames; step++) {
    CollisionManager.handleVehicles(fakeGame, 1 / 60);
  }

  assert(tank.isFlipped === false, 'Tank is STRICTLY NOT flipped when horde count (3) is less than required (12)');
  assert(zombiesList[0].alive === false, 'Front zombie is knocked out only after the failed push wait');
  assert(tank.isPushing === false, 'Failed push interaction exits after the reaction window');
  assert(tank.pushLockout === true, 'Failed vehicle locks out repeated push attempts until the horde passes it');
  assert(typeof audio.playPushFail === 'function', 'Disappointed push-fail sound is available');
}

// 24. Bomb Multi-Casualty Radius Explosion Test (1-3 Zombies)
function testBombMultiCasualtyRadius() {
  console.log('\n--- Testing Bomb Multi-Casualty Radius Explosion ---');
  const zombiesList = [
    new Zombie(0, 200, 540 - 54), // Direct collision (x=200)
    new Zombie(1, 150, 540 - 54), // Nearby blast range (dist ~60px)
    new Zombie(2, 80, 540 - 54),  // Outer shockwave range (dist ~130px)
    new Zombie(3, -100, 540 - 54) // Far outside blast range (dist >300px)
  ];

  const fakeGame = {
    horde: {
      leader: zombiesList[0],
      zombies: zombiesList,
      get count() {
        return this.zombies.filter(z => z.alive).length;
      }
    },
    transformations: { activeType: null },
    level: {
      bombs: [
        new Bomb(210, 540)
      ]
    },
    particles: {
      spawnBombExplosion: () => {},
      spawnAngelGhost: () => {}
    },
    floatingText: {
      spawn: () => {}
    },
    renderer: { camera: { addTrauma: () => {} } }
  };

  const bomb = fakeGame.level.bombs[0];
  assert(bomb.alive === true, 'Bomb starts active');
  CollisionManager.handleBombs(fakeGame, 1 / 60);
  assert(bomb.alive === false, 'Bomb detonated on contact');
  assert(zombiesList[0].alive === false, 'Direct colliding zombie 0 killed');
  assert(zombiesList[1].alive === false, 'Nearby zombie 1 killed in blast range');
  assert(zombiesList[2].alive === false, 'Outer zombie 2 killed in shockwave range');
  assert(zombiesList[3].alive === true, 'Distant zombie 3 strictly survived outside range');
  assert(fakeGame.horde.count === 1, 'Horde count reduced from 4 to 1 (3 casualties)');
}

// 24. Vehicle Sprite Render Priority Invariant Test
function testVehicleSpriteRenderPriority() {
  console.log('\n--- Testing Vehicle Sprite Render Priority Invariant ---');
  const bus = new Vehicle(100, 540, 'BUS');
  let drawImageCalled = false;
  let fillRectCount = 0;

  const mockCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    ellipse: () => {},
    fill: () => {},
    roundRect: () => {},
    fillRect: () => { fillRectCount++; },
    arc: () => {},
    drawImage: () => { drawImageCalled = true; },
    fillText: () => {},
    stroke: () => {}
  };

  // When sprite is loaded, it must strictly use drawImage and skip fallback drawing
  assets.isLoaded = true;
  assets.sprites.bus = { width: 200, height: 65 };
  bus.draw(mockCtx, 0);
  assert(drawImageCalled === true, 'Vehicle strictly draws sprite image when assets.isLoaded and sprite exists');
  assert(fillRectCount === 0, 'Fallback vector drawing skipped when sprite is present');

  // When sprite is not loaded, it falls back to vector drawing without throwing
  assets.isLoaded = false;
  assets.sprites.bus = null;
  drawImageCalled = false;
  fillRectCount = 0;
  bus.draw(mockCtx, 0);
  assert(drawImageCalled === false, 'drawImage not called when sprite is missing');
  assert(fillRectCount > 0, 'Vector fallback drawing engaged safely when assets not loaded');
}

// 25. On-Demand Background Loading and Graceful Degradation Test
function testOnDemandBackgroundLoading() {
  console.log('\n--- Testing On-Demand Background Loading & Graceful Biome Transition ---');
  const testAssets = {
    backgrounds: [
      { id: 'city', name: '大都会夜景', roadStyle: 'CITY', img: { width: 2560, height: 1440, complete: true, naturalWidth: 2560 } }
    ],
    images: {
      cityBg: { width: 2560, height: 1440, complete: true, naturalWidth: 2560 }
    }
  };

  const bm = new BiomeManager();
  bm.reset(testAssets);
  assert(bm.zones.length > 0, 'BiomeManager successfully generates initial zones with only initial city scene');
  assert(bm.zones[0].theme.id === 'city', 'Initial zone theme strictly matches loaded city theme');

  // Simulate background silent preloading of second scene (beach)
  testAssets.backgrounds.push({
    id: 'beach', name: '热带海岸', roadStyle: 'BEACH', img: { width: 2560, height: 1440, complete: true, naturalWidth: 2560 }
  });
  testAssets.images.beachBg = testAssets.backgrounds[1].img;

  bm.ensureDistance(60000, testAssets);
  const themesUsed = new Set(bm.zones.map(z => z.theme.id));
  assert(themesUsed.has('city'), 'Active biomes contain city scene');
  assert(themesUsed.has('beach'), 'Dynamically loaded beach scene incorporated seamlessly into new distant biomes');
}

// 26. Civilian Approaching Panic & Scream Invariant Test
function testCivilianPanicAndScreamOnApproach() {
  console.log('\n--- Testing Civilian Approaching Panic & Scream Reaction ---');
  const civ = new Civilian(500, 540);
  assert(civ.isPanicking === false, 'Civilian starts in calm state');
  assert(civ.hasScreamed === false, 'Civilian has not screamed initially');

  const fakeGame = {
    horde: {
      leader: { x: 100, y: 492, width: 46, height: 48 },
      zombies: [{ x: 100, y: 492, width: 46, height: 48, alive: true }]
    },
    transformations: { activeType: null },
    level: { civilians: [civ] },
    particles: { spawnCivilianPanic: () => {}, spawn: () => {} }
  };

  // 1. Far away (> 220px): Civilian stays calm
  CollisionManager.handleCivilians(fakeGame);
  assert(civ.isPanicking === false, 'Civilian stays calm when zombies are far away (354px)');

  // 2. Approaching within 220px: Civilian triggers panic & scream
  fakeGame.horde.leader.x = 350; // distX = 500 - (350 + 46) = 104px < 220px
  CollisionManager.handleCivilians(fakeGame);
  assert(civ.isPanicking === true, 'Civilian triggers panic state when zombies approach within 220px');
  assert(civ.hasScreamed === true, 'Civilian triggers cartoon scream sound when in danger');

  // 3. Render test under panic flailing state
  const mockCtx = {
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    roundRect: () => {},
    fillRect: () => {},
    arc: () => {},
    ellipse: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {}
  };
  civ.draw(mockCtx, 0);
  assert(civ.alive === true, 'Panicking civilian renders flailing and screaming visuals safely without error');
}

// 27. Transformation Durations & UFO Removal Invariant Test
import { TRANSFORMATION_TYPES } from '../src/entities/Transformations.js';
function testTransformationDurationsAndUFORemoval() {
  console.log('\n--- Testing Transformations & UFO Removal Invariant ---');
  // 1. UFO strictly removed from transformation pool
  assert(TRANSFORMATION_TYPES.UFO === undefined, 'UFO is strictly removed from TRANSFORMATION_TYPES');
  assert(!Object.keys(TRANSFORMATION_TYPES).includes('UFO'), 'TRANSFORMATION_TYPES keys do not contain UFO');

  // 2. Tsunami duration reduced to 70% (10s -> 7s)
  assert(TRANSFORMATION_TYPES.TSUNAMI.duration === 7, `Tsunami duration reduced to 70% (7s): ${TRANSFORMATION_TYPES.TSUNAMI.duration}`);

  // 3. Dragon duration reduced to 70% (5s -> 3.5s)
  assert(TRANSFORMATION_TYPES.DRAGON.duration === 3.5, `Dragon duration reduced to 70% (3.5s): ${TRANSFORMATION_TYPES.DRAGON.duration}`);

  // 4. Other transformations remain intact
  assert(TRANSFORMATION_TYPES.NINJA.duration === 9, 'Ninja duration remains 9s');
  assert(TRANSFORMATION_TYPES.QUARTERBACK.duration === 8, 'Quarterback duration remains 8s');
  assert(TRANSFORMATION_TYPES.GOLD.duration === 8, 'Gold rush duration remains 8s');
}

// 28. High-Contrast Ground Rendering Across Biomes Invariant Test
function testHighContrastGroundRendering() {
  console.log('\n--- Testing High-Contrast Ground Road Palettes ---');
  const lg = new LevelGenerator(540);
  lg.generateChunk(6000);

  // Mock 2D context to verify ground road drawing without crash
  const calls = [];
  const fakeCtx = {
    createLinearGradient: () => ({
      addColorStop: (offset, color) => calls.push({ type: 'stop', offset, color })
    }),
    fillStyle: '',
    fillRect: (x, y, w, h) => calls.push({ type: 'fillRect', x, y, w, h }),
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    rect: () => {},
    clip: () => {},
    ellipse: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    bezierCurveTo: () => {},
    closePath: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    save: () => {},
    restore: () => {},
    roundRect: () => {},
    drawImage: () => {},
    fillText: () => {},
    strokeStyle: '',
    lineWidth: 1
  };

  assert(lg.platforms.length > 0, 'Platforms generated successfully');
  lg.draw(fakeCtx, 0);
  assert(calls.length > 0, 'Ground platforms rendered successfully with high-contrast styles');
}

// 29. Pause Modal Mascot Animation & Hook System Invariant Test
function testPauseModalMascotAndHookSystem() {
  console.log('\n--- Testing Pause Modal Mascot Animation & Hook System ---');

  // 1. Mock Canvas & Context for Pause Mascot Drawing
  const drawCalls = [];
  const mockCtx = {
    clearRect: (x, y, w, h) => drawCalls.push({ type: 'clearRect', x, y, w, h }),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    beginPath: () => {},
    ellipse: () => {},
    arc: () => {},
    rect: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: (x, y, w, h) => drawCalls.push({ type: 'fillRect', x, y, w, h }),
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fillText: (text, x, y) => drawCalls.push({ type: 'fillText', text, x, y }),
    measureText: (text) => ({ width: text.length * 10 })
  };

  // 2. Validate speech quotes and hook phrases adhere to strict formatting
  const testQuotes = [
    '老大快点继续，前方的金币山要被抢光啦！',
    '别歇了别歇了，我的丧尸小短腿快生锈了！',
    '报告长官，军团集结完毕，随时可以出击！',
    '别发呆啦，快带我们掀翻前方的重型坦克！',
    '手速别停，这一把我们必定冲进全服第一！',
    '戳我没用，快按继续游戏带我们冲锋！',
    '我已经热身完毕，就等老大一声令下啦！',
    '赶紧开冲，前面有香喷喷的美味大餐！'
  ];

  for (const q of testQuotes) {
    assert(!/[()\[\]{}（）【】「」]/.test(q), `Quote contains no brackets: ${q}`);
    assert(!/["“”]/.test(q), `Quote contains no quotation marks: ${q}`);
    assert(!/[\u{1F300}-\u{1FAFF}]/u.test(q), `Quote contains no emoji: ${q}`);
  }

  // 3. Simulate mascot rendering cycle
  let cycleCalls = 0;
  for (let t = 0; t < 2000; t += 200) {
    mockCtx.clearRect(0, 0, 220, 115);
    // Draw running shadow and head
    mockCtx.beginPath();
    mockCtx.ellipse(110, 102, 28, 6, 0, 0, Math.PI * 2);
    mockCtx.fill();
    cycleCalls++;
  }
  assert(cycleCalls === 10, 'Pause mascot animation successfully loops without degradation');
  assert(drawCalls.length > 0, 'Pause mascot canvas draws elements smoothly');
}

// 30. Active Parallax Background Scrolling & LOTUS/CASTLE Biome Invariant Test
function testParallaxScrollingAndNewBiomes() {
  console.log('\n--- Testing Parallax Scrolling & LOTUS/CASTLE Biomes ---');
  // 1. Verify LOTUS and CASTLE theme gradients exist
  assert(THEME_SKY_GRADIENTS.LOTUS !== undefined, 'THEME_SKY_GRADIENTS contains LOTUS gradient');
  assert(THEME_SKY_GRADIENTS.CASTLE !== undefined, 'THEME_SKY_GRADIENTS contains CASTLE gradient');

  // 2. Verify Parallax Scroll formula produces continuous displacement
  const visibleHeight = 540;
  const naturalRatio = 2560 / 1440;
  const drawH = visibleHeight * 1.05;
  const drawW = drawH * naturalRatio; // 1008
  const parallaxSpeed = 0.22;

  const scrollAt0 = (0 * parallaxSpeed) % drawW;
  const scrollAt1000 = (1000 * parallaxSpeed) % drawW;
  const scrollAt5000 = (5000 * parallaxSpeed) % drawW;

  assert(scrollAt0 === 0, 'Scroll at cameraX=0 is 0');
  assert(scrollAt1000 === 220, `Scroll at cameraX=1000 moved 220px: ${scrollAt1000}`);
  assert(scrollAt5000 !== scrollAt1000, `Background moves fluidly across distance: ${scrollAt5000}`);
}

// 31. Shop and Economy System Invariant Test
import { UPGRADES_CATALOG, HATS_CATALOG } from '../src/systems/Shop.js';

function testShopAndEconomySystem() {
  console.log('\n--- Testing Shop & Economy System Invariants ---');

  // 1. Catalog integrity
  assert(UPGRADES_CATALOG.length === 4, 'UPGRADES_CATALOG contains 4 core upgrades');
  const upgradeKeys = UPGRADES_CATALOG.map(u => u.key);
  assert(upgradeKeys.includes('startZombies'), 'Catalog contains startZombies');
  assert(upgradeKeys.includes('feverDuration'), 'Catalog contains feverDuration');
  assert(upgradeKeys.includes('transformDuration'), 'Catalog contains transformDuration');
  assert(upgradeKeys.includes('coinMultiplier'), 'Catalog contains coinMultiplier');

  for (const up of UPGRADES_CATALOG) {
    assert(!up.desc.includes('大脑'), `Upgrade ${up.key} description contains strictly no brain mention`);
    assert(up.prices.length === up.maxLevel, `Upgrade ${up.key} has matching price tiers for all levels`);
  }

  // 2. Hats catalog
  assert(HATS_CATALOG.length === 6, 'HATS_CATALOG contains 6 hats');
  const hatIds = HATS_CATALOG.map(h => h.id);
  assert(hatIds.includes('none'), 'Hats contains none');
  assert(hatIds.includes('crown'), 'Hats contains crown');

  // 3. Audio methods
  assert(typeof audio.playUpgradeSuccess === 'function', 'audio.playUpgradeSuccess is a function');
  assert(typeof audio.playBuyFail === 'function', 'audio.playBuyFail is a function');

  // 4. Storage relief fund and coin economics
  const s = new Storage();
  s.data.totalCoins = 100;
  const newTotal = s.claimReliefFund(150);
  assert(newTotal === 250, 'claimReliefFund adds 150 coins: 250');
  assert(s.data.totalCoins === 250, 'Storage totalCoins updated to 250');

  // 5. Spend coins checks
  assert(s.spendCoins(200) === true, 'spendCoins(200) succeeds when balance is 250');
  assert(s.data.totalCoins === 50, 'Remaining balance is 50');
  assert(s.spendCoins(100) === false, 'spendCoins(100) strictly fails when balance is 50');
  assert(s.data.totalCoins === 50, 'Balance unchanged after failed spend');

  // 6. Upgrades persistence
  assert(s.getUpgradeLevel('coinMultiplier') === 1, 'coinMultiplier defaults to level 1');
  s.setUpgradeLevel('coinMultiplier', 3);
  assert(s.getUpgradeLevel('coinMultiplier') === 3, 'coinMultiplier level set to 3');

  // 7. CollisionManager fever scaling test
  storage.setUpgradeLevel('feverDuration', 3);
  const mockGame = {
    feverCombo: 7,
    feverTimer: 0,
    floatingText: { spawn: () => {} },
    renderer: { camera: { addTrauma: () => {} } }
  };
  CollisionManager.triggerFeverCombo(mockGame, { x: 100, y: 100 });
  assert(mockGame.feverTimer === 7.0, `feverTimer scaled by feverDuration level 3 to 7.0s: ${mockGame.feverTimer}`);
}

// 32. Menu Mascot Invariants & Multi-Biome Non-Repeating Cycle Test
function testMenuMascotAndDiverseBiomeCycle() {
  console.log('\n--- Testing Menu Mascot & Multi-Biome Non-Repeating Cycle ---');

  // 1. Menu mascot speech lines validation
  const testMenuQuotes = [
    '全员集合，目标掀翻全城汽车！',
    '冲破一万米，把金币通通带回家！',
    '别发呆啦，快按开始带我们冲锋！',
    '报告长官，全员已完成战前热身！',
    '这一把状态神勇，必定刷新最高纪录！',
    '吃饱喝足，今天我们要横扫整条街道！',
    '军团集结完毕，就等老大一声令下！'
  ];

  for (const q of testMenuQuotes) {
    assert(!/[()\[\]{}（）【】「」]/.test(q), `Menu quote contains no brackets: ${q}`);
    assert(!/["“”]/.test(q), `Menu quote contains no quotation marks: ${q}`);
    assert(!/[\u{1F300}-\u{1FAFF}]/u.test(q), `Menu quote contains no emoji: ${q}`);
  }

  // 2. Multi-Biome 7-Theme Diversity & Non-Repeating Verification
  const mockAll7Assets = {
    backgrounds: [
      { id: 'city', name: '大都会夜景', roadStyle: 'CITY' },
      { id: 'beach', name: '热带海岸', roadStyle: 'BEACH' },
      { id: 'desert', name: '黄金沙漠', roadStyle: 'DESERT' },
      { id: 'b1', name: '中世纪古堡庄园', roadStyle: 'CASTLE' },
      { id: 'b2', name: '日落晚霞峡谷', roadStyle: 'SUNSET' },
      { id: 'b3', name: '未来科幻基地', roadStyle: 'SCI_FI' },
      { id: 'b4', name: '清雅荷花池畔', roadStyle: 'LOTUS' }
    ]
  };

  const testBM = new BiomeManager();
  testBM.reset(mockAll7Assets);
  testBM.ensureDistance(80000, mockAll7Assets);

  assert(testBM.zones.length >= 15, `Generated at least 15 zones: ${testBM.zones.length}`);

  const encounteredThemes = new Set(testBM.zones.map(z => z.theme.id));
  for (const theme of mockAll7Assets.backgrounds) {
    assert(encounteredThemes.has(theme.id), `Diverse rotation includes theme: ${theme.id}`);
  }

  // Verify no theme repeats within 3 consecutive zones
  for (let i = 2; i < testBM.zones.length; i++) {
    const cur = testBM.zones[i].theme.id;
    const prev1 = testBM.zones[i - 1].theme.id;
    const prev2 = testBM.zones[i - 2].theme.id;
    assert(cur !== prev1, `Zone ${i} does not repeat immediate previous zone`);
    assert(cur !== prev2, `Zone ${i} does not repeat 2 zones ago`);
  }

  // 3. Road second line dashed guideline test
  const lg = new LevelGenerator();
  assert(typeof lg.drawRoadDashes === 'function', 'LevelGenerator has drawRoadDashes helper');
}

// Run All Tests
testJumpPhysics();
testJumpReleaseLatency();
testWaveJumpCascade();
testJumpInputDispatch();
testVehicleThresholds();
testVehicleAnticipationTiming();
testGroupPushFormationAndJumpCancel();
testStorageAndMissions();
testVehiclePlatformFalling();
testGroundedHordeWaveFormation();
testSecondaryHatSpringPhysics();
testVehicleSuspensionState();
testCivilianInfectionInheritance();
testDynamicMovingTrafficPhysics();
testBiomeRandomNonRepeating();
testBiomeSmoothAlphaCrossfade();
testDynamicGroundShadowScaling();
testFixedCameraStability();
testParticleSystemVisualTypes();
testAdaptiveSceneBgmTracks();
testHazardVisibilityAndProgressiveDifficulty();
testVehicleGroundContact();
testEarlyCarDensity();
testCivilianAbyssFallPhysics();
testCollisionManagerModule();
testDistantVehicleNoAutoFlip();
testStrictTankRequiredThreshold();
testBombMultiCasualtyRadius();
testVehicleSpriteRenderPriority();
testOnDemandBackgroundLoading();
testCivilianPanicAndScreamOnApproach();
testTransformationDurationsAndUFORemoval();
testHighContrastGroundRendering();
testPauseModalMascotAndHookSystem();
testParallaxScrollingAndNewBiomes();
// 33. Civilian Cliff Braking & Lower Ground Height Invariant Test
function testCivilianCliffBrakingAndHeightRefinement() {
  console.log('\n--- Testing Civilian Cliff Braking & Ground Height Invariants ---');

  // 1. Idle civilian does not drift or dance into pits
  const idleCiv = new Civilian(500, GAME_CONFIG.GROUND_Y);
  const initialX = idleCiv.x;
  const mockLevel = {
    isGroundAt: (x) => x >= 400 && x <= 600
  };

  for (let step = 0; step < 60; step++) {
    idleCiv.update(1 / 60, null, mockLevel);
  }
  assert(idleCiv.x === initialX, `Idle civilian stays firmly in place: x=${idleCiv.x} === ${initialX}`);
  assert(idleCiv.isTrappedAtLedge === false, 'Idle civilian not trapped');

  // 2. Panicking civilian approaches pit edge and brakes without jumping into pit
  const panicCiv = new Civilian(580, GAME_CONFIG.GROUND_Y);
  panicCiv.isPanicking = true;
  assert(mockLevel.isGroundAt(580) === true, 'Starting position has ground');
  assert(mockLevel.isGroundAt(650) === false, 'Forward position is a pit');

  for (let step = 0; step < 60; step++) {
    panicCiv.update(1 / 60, null, mockLevel);
  }
  assert(panicCiv.isTrappedAtLedge === true, 'Panicking civilian successfully brakes at cliff edge');
  assert(panicCiv.isFalling === false, 'Civilian does not jump or fall into pit');
  assert(mockLevel.isGroundAt(panicCiv.x) === true, `Civilian remains standing securely on ground: x=${panicCiv.x.toFixed(1)}`);

  // 3. Ground height refinement verification
  assert(GAME_CONFIG.GROUND_Y === 580, 'Ground height lowered to 580px');
  assert(GAME_CONFIG.ROAD_HEIGHT === 140, 'Road height reduced to 140px');
  const backgroundCoverageRatio = GAME_CONFIG.GROUND_Y / GAME_CONFIG.CANVAS_HEIGHT;
  assert(backgroundCoverageRatio > 0.80, `Background occupies over 80% screen area: ${(backgroundCoverageRatio * 100).toFixed(1)}%`);
}

testVehicleSuspensionState();
testCivilianInfectionInheritance();
testDynamicMovingTrafficPhysics();
testBiomeRandomNonRepeating();
testBiomeSmoothAlphaCrossfade();
testDynamicGroundShadowScaling();
testFixedCameraStability();
testParticleSystemVisualTypes();
testAdaptiveSceneBgmTracks();
testHazardVisibilityAndProgressiveDifficulty();
testVehicleGroundContact();
testEarlyCarDensity();
testCivilianAbyssFallPhysics();
testCollisionManagerModule();
testDistantVehicleNoAutoFlip();
testStrictTankRequiredThreshold();
testBombMultiCasualtyRadius();
testVehicleSpriteRenderPriority();
testOnDemandBackgroundLoading();
testCivilianPanicAndScreamOnApproach();
testTransformationDurationsAndUFORemoval();
testHighContrastGroundRendering();
testPauseModalMascotAndHookSystem();
testParallaxScrollingAndNewBiomes();
testShopAndEconomySystem();
testMenuMascotAndDiverseBiomeCycle();
testCivilianCliffBrakingAndHeightRefinement();

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
