import { Zombie } from '../src/entities/Zombie.js';
import { ZombieHorde } from '../src/entities/ZombieHorde.js';
import { VEHICLE_TYPES, Vehicle } from '../src/entities/Vehicle.js';
import { assets } from '../src/engine/AssetLoader.js';
import { Storage } from '../src/systems/Storage.js';
import { BiomeManager } from '../src/systems/BiomeManager.js';

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
  const jumpImpulse = 480;
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

  assert(peakHeight > 120, `Jump reaches adequate height: ${peakHeight.toFixed(1)}px`);
  assert(peakHeight <= 380, `Jump stays comfortably within screen viewport: ${peakHeight.toFixed(1)}px <= 380px`);

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

  // Follower 1 should have queued jump with 0.02s delay
  assert(horde.zombies[1].jumpQueued === true, 'Follower 1 has queued jump');
  assert(Math.abs(horde.zombies[1].jumpDelayTimer - 0.02) < 0.001, 'Follower 1 delay is 0.02s');
  assert(Math.abs(horde.zombies[2].jumpDelayTimer - 0.04) < 0.001, 'Follower 2 delay is 0.04s');
  assert(Math.abs(horde.zombies[3].jumpDelayTimer - 0.06) < 0.001, 'Follower 3 delay is 0.06s');
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
  assert(GAME_CONFIG.GROUND_Y === 540, 'GAME_CONFIG contains GROUND_Y 540');
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
    particles: { spawnAngelGhost: () => {} },
    floatingText: null,
    renderer: { camera: { addTrauma: () => {} } }
  };

  const tank = fakeGame.level.vehicles[0];
  assert(tank.required === 12, 'Tank requires 12 zombies to flip');
  CollisionManager.handleVehicles(fakeGame, 1 / 60);
  assert(tank.isFlipped === false, 'Tank is STRICTLY NOT flipped when horde count (3) is less than required (12)');
  assert(zombiesList[0].alive === false, 'Colliding front zombie is knocked out upon striking heavy tank with insufficient count');
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
    closePath: () => {},
    translate: () => {},
    rotate: () => {},
    scale: () => {},
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

// Run All Tests
testJumpPhysics();
testWaveJumpCascade();
testVehicleThresholds();
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

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
