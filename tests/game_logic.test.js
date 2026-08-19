import { Zombie } from '../src/entities/Zombie.js';
import { ZombieHorde } from '../src/entities/ZombieHorde.js';
import { VEHICLE_TYPES, Vehicle } from '../src/entities/Vehicle.js';
import { Storage } from '../src/systems/Storage.js';

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

// 10. Dynamic Moving Traffic & Trampoline Launch Test
function testTrampolineAndMovingTraffic() {
  console.log('\n--- Testing Trampoline & Moving Traffic ---');
  const movingCar = new Vehicle(1000, 540, 'CAR', true);
  assert(movingCar.isMoving === true, 'Vehicle initialized as moving');
  assert(movingCar.moveSpeed === 160, 'Moving vehicle has forward velocity 160px/s');

  const dt = 0.5;
  movingCar.update(dt, null, null);
  assert(movingCar.x === 1000 - 160 * 0.5, `Vehicle moves towards player: ${movingCar.x} === 920`);

  const z = new Zombie(0, 200, 486, true);
  z.jump(680); // Trampoline super jump impulse
  assert(z.vy === -680, 'Trampoline launches zombie skyward with -680 vy');
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
testTrampolineAndMovingTraffic();

console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
