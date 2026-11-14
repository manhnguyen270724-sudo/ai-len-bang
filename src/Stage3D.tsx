import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import type { Student, Group } from './core';
import { chasePhase, runnerPosition, REVEAL_SECONDS } from './choreography';
import { Stage, type Concept } from './Scene';

export type RacerType = 'duck' | 'pony' | 'corgi' | 'runner';

type Props = {
  concept: Concept;
  students: Student[];
  running: boolean;
  selected: string[];
  groups: Group[];
  // Race Mode Props
  raceMode?: boolean;
  racerType?: RacerType;
  raceSeed?: number;
  roomId?: string;
  onRaceFinish?: (ranked: Student[]) => void;
};

const PALETTE = ['#845ec2', '#d65db1', '#ff6f91', '#ff9671', '#ffc75f', '#00c9a7', '#4d80e4', '#2c73d2'];
const SKIN_TONES = ['#fedac2', '#fcd0b3', '#f5c19d', '#e0aa85'];
const HAIR_COLORS = ['#2c2420', '#4a3728', '#6a4935', '#242132', '#8c593e'];

// 1. Plush / Velvet Material with Three.js Sheen
function velvetMaterial(color: string | number, roughness = 0.92, sheenRoughness = 0.45) {
  const c = new T.Color(color);
  return new T.MeshPhysicalMaterial({
    color: c,
    roughness,
    metalness: 0.02,
    sheen: 1.0, // High-end velvet / cloth sheen reflection!
    sheenRoughness,
    sheenColor: c.clone().lerp(new T.Color('#ffffff'), 0.38),
  });
}

function createSphere(parent: T.Object3D, color: string | number, r: number, x = 0, y = 0, z = 0, roughness = 0.92) {
  const mesh = new T.Mesh(new T.SphereGeometry(r, 20, 16), velvetMaterial(color, roughness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createBox(parent: T.Object3D, color: string | number, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0, roughness = 0.92) {
  const mesh = new T.Mesh(new T.BoxGeometry(sx, sy, sz), velvetMaterial(color, roughness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createCylinder(parent: T.Object3D, color: string | number, rt: number, rb: number, h: number, seg = 24, x = 0, y = 0, z = 0, roughness = 0.92) {
  const mesh = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg), velvetMaterial(color, roughness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createTorus(parent: T.Object3D, color: string | number, r: number, tube: number, x = 0, y = 0, z = 0, roughness = 0.92) {
  const mesh = new T.Mesh(new T.TorusGeometry(r, tube, 12, 48), velvetMaterial(color, roughness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createCone(parent: T.Object3D, color: string | number, r: number, h: number, x = 0, y = 0, z = 0, roughness = 0.92) {
  const mesh = new T.Mesh(new T.ConeGeometry(r, h, 14), velvetMaterial(color, roughness));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// 2. Chibi Character with Soft Velvet / Plush Fabric Craft
function buildChibiCharacter(index: number, avatar?: Student['avatar']) {
  const root = new T.Group();
  const skin = SKIN_TONES[index % SKIN_TONES.length];
  const hairColor = HAIR_COLORS[index % HAIR_COLORS.length];
  const uniformColor = PALETTE[index % PALETTE.length];
  const isFemale = avatar === 'female' || (avatar === undefined && index % 2 === 1);

  const body = new T.Group();
  root.add(body);

  // Velvet School Torso / Jacket
  const torso = createCylinder(body, uniformColor, 0.22, 0.26, 0.42, 16, 0, 0.62, 0);
  torso.scale.set(1.05, 1, 0.85);

  // White inner shirt collar & school tie
  createBox(body, '#ffffff', 0.12, 0.12, 0.05, 0, 0.77, 0.13, 0.8);
  createBox(body, '#e74c3c', 0.05, 0.16, 0.03, 0, 0.68, 0.145, 0.8);

  // Backpack on back
  const backpack = createBox(body, PALETTE[(index + 3) % PALETTE.length], 0.28, 0.32, 0.16, 0, 0.64, -0.16);
  createBox(backpack, '#ffffff', 0.18, 0.1, 0.04, 0, -0.05, -0.09);

  // Head
  const headGroup = new T.Group();
  headGroup.position.set(0, 1.15, 0.02);
  body.add(headGroup);

  const headMesh = createSphere(headGroup, skin, 0.34, 0, 0, 0, 0.85);
  headMesh.scale.set(1.08, 0.96, 0.98);

  // Cheeks (blush)
  for (const side of [-1, 1]) {
    const blush = createSphere(headGroup, '#ff8fa3', 0.065, side * 0.22, -0.05, 0.27, 0.95);
    blush.scale.set(1, 0.6, 0.3);
  }

  // Large expressive eyes with white catchlight reflections
  const eyebrows: T.Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = createSphere(headGroup, '#1c1b29', 0.055, side * 0.125, 0.02, 0.31, 0.3);
    eye.scale.set(0.9, 1.25, 0.5);

    const catchlight = createSphere(headGroup, '#ffffff', 0.02, side * 0.135 - 0.015, 0.045, 0.332, 0.1);
    catchlight.scale.set(1, 1, 0.5);

    const brow = createBox(headGroup, hairColor, 0.08, 0.025, 0.02, side * 0.125, 0.11, 0.315);
    eyebrows.push(brow);
  }

  createSphere(headGroup, '#df987d', 0.02, 0, -0.04, 0.34, 0.7);
  const mouth = createSphere(headGroup, '#994444', 0.035, 0, -0.11, 0.315, 0.7);
  mouth.scale.set(1, 0.5, 0.3);

  // Hair styling
  if (isFemale) {
    if (index % 2 === 0) {
      const hairBase = createSphere(headGroup, hairColor, 0.36, 0, 0.06, -0.04, 0.92);
      hairBase.scale.set(1.12, 1.05, 1.05);
      const bangs = createSphere(headGroup, hairColor, 0.22, 0, 0.17, 0.24, 0.92);
      bangs.scale.set(1.3, 0.45, 0.6);
      for (const side of [-1, 1]) {
        createSphere(headGroup, hairColor, 0.14, side * 0.32, 0.25, -0.05, 0.92);
        createTorus(headGroup, PALETTE[(index + 1) % PALETTE.length], 0.09, 0.025, side * 0.3, 0.24, -0.05);
      }
    } else {
      const hairBase = createSphere(headGroup, hairColor, 0.37, 0, 0.04, -0.06, 0.92);
      hairBase.scale.set(1.15, 1.1, 1.12);
      createSphere(headGroup, hairColor, 0.24, 0, 0.16, 0.24, 0.92);
      const pin = createSphere(headGroup, '#ffd166', 0.05, 0.28, 0.16, 0.25, 0.4);
      createSphere(pin, '#ef476f', 0.025, 0, 0, 0.035);
    }
  } else {
    if (index % 2 === 0) {
      const hairBase = createSphere(headGroup, hairColor, 0.36, 0, 0.06, -0.04, 0.92);
      hairBase.scale.set(1.12, 1.05, 1.05);
      for (let s = 0; s < 5; s++) {
        const a = (s - 2) * 0.28;
        const spike = createCone(headGroup, hairColor, 0.08, 0.18, Math.sin(a) * 0.24, 0.36, Math.cos(a) * 0.12);
        spike.rotation.z = -a * 0.7;
        spike.rotation.x = 0.2;
      }
    } else {
      const hairBase = createSphere(headGroup, hairColor, 0.36, 0, 0.05, -0.04, 0.92);
      hairBase.scale.set(1.1, 1.04, 1.05);
      const band = createTorus(body, '#333647', 0.28, 0.035, 0, 0.86, 0.02);
      band.rotation.x = Math.PI / 2;
      for (const side of [-1, 1]) {
        createCylinder(body, '#ef476f', 0.09, 0.09, 0.08, 16, side * 0.26, 0.88, 0.02);
      }
    }
  }

  // Limbs
  const limbs: T.Group[] = [];
  const arms: T.Group[] = [];
  for (const side of [-1, 1]) {
    const armPivot = new T.Group();
    armPivot.position.set(side * 0.28, 0.78, 0);
    body.add(armPivot);
    arms.push(armPivot);
    limbs.push(armPivot);

    createCylinder(armPivot, uniformColor, 0.075, 0.075, 0.24, 12, 0, -0.12, 0);
    createSphere(armPivot, skin, 0.065, 0, -0.26, 0);
  }

  const legs: T.Group[] = [];
  for (const side of [-1, 1]) {
    const legPivot = new T.Group();
    legPivot.position.set(side * 0.13, 0.42, 0);
    body.add(legPivot);
    legs.push(legPivot);
    limbs.push(legPivot);

    createCylinder(legPivot, '#3a3f58', 0.075, 0.07, 0.26, 12, 0, -0.13, 0);
    const shoe = createBox(legPivot, uniformColor, 0.13, 0.1, 0.22, 0, -0.32, 0.05);
    createBox(shoe, '#ffffff', 0.14, 0.04, 0.23, 0, -0.035, 0);
    createSphere(shoe, '#ffffff', 0.06, 0, -0.01, 0.09);
  }

  return { root, body, headGroup, eyebrows, mouth, arms, legs, limbs };
}

// 3. Cute 3D Racer Mounts (Thú Đua Vải Nhung)
function buildDuckMount(color = '#f1c40f') {
  const mount = new T.Group();
  // Chubby yellow duck body
  const duckBody = createSphere(mount, color, 0.42, 0, 0.32, 0);
  duckBody.scale.set(1, 0.85, 1.25);
  // Duck tail pointing up
  const tail = createCone(mount, color, 0.16, 0.25, 0, 0.45, -0.48);
  tail.rotation.x = -1.2;
  // Duck head
  createSphere(mount, color, 0.26, 0, 0.65, 0.32);
  // Orange beak
  const beak = createBox(mount, '#e67e22', 0.2, 0.08, 0.18, 0, 0.62, 0.56);
  beak.rotation.x = 0.1;
  // Cute duck eyes
  for (const s of [-1, 1]) {
    createSphere(mount, '#1e272e', 0.045, s * 0.13, 0.72, 0.44);
    createSphere(mount, '#ffffff', 0.018, s * 0.14 - 0.01, 0.74, 0.47);
  }
  // Racing cap / helmet on duck head
  const helmet = createSphere(mount, '#e74c3c', 0.22, 0, 0.84, 0.28);
  helmet.scale.set(1.1, 0.6, 1.1);
  createBox(helmet, '#ffffff', 0.2, 0.04, 0.16, 0, -0.04, 0.18);
  return mount;
}

function buildPonyMount(color = '#e84393') {
  const mount = new T.Group();
  // Cute hobby horse / plush pony body
  const ponyBody = createBox(mount, color, 0.45, 0.36, 0.72, 0, 0.34, 0);
  // Pony head & neck
  const neck = createCylinder(mount, color, 0.15, 0.18, 0.38, 12, 0, 0.65, 0.3);
  neck.rotation.x = -0.35;
  const head = createSphere(mount, color, 0.24, 0, 0.85, 0.42);
  head.scale.set(0.9, 0.95, 1.2);
  // Muzzle
  createSphere(mount, '#fff0f5', 0.16, 0, 0.78, 0.62);
  // Ears
  for (const s of [-1, 1]) {
    const ear = createCone(mount, color, 0.08, 0.18, s * 0.14, 1.05, 0.38);
    ear.rotation.z = -s * 0.3;
  }
  // Colorful yarn mane
  for (let m = 0; m < 4; m++) {
    createSphere(mount, ['#f1c40f', '#00cec9', '#9b59b6', '#ff7675'][m % 4], 0.085, 0, 0.68 + m * 0.09, 0.24 - m * 0.06);
  }
  // Cute fluffy tail
  createSphere(mount, '#fdcb6e', 0.12, 0, 0.45, -0.42);
  return mount;
}

function buildCorgiMount() {
  const mount = new T.Group();
  const fur = '#e17055';
  const white = '#ffffff';
  // Fluffy corgi body
  const corgiBody = createSphere(mount, fur, 0.42, 0, 0.32, 0);
  corgiBody.scale.set(0.95, 0.82, 1.35);
  // White chest & belly
  createSphere(mount, white, 0.32, 0, 0.26, 0.28);
  // Corgi head
  const head = createSphere(mount, fur, 0.26, 0, 0.62, 0.38);
  head.scale.set(1.05, 0.92, 0.95);
  // White muzzle & nose
  createSphere(mount, white, 0.16, 0, 0.55, 0.56);
  createSphere(mount, '#2d3436', 0.05, 0, 0.6, 0.68); // black nose
  // Big pointed corgi ears
  for (const s of [-1, 1]) {
    const ear = createCone(mount, fur, 0.13, 0.32, s * 0.22, 0.85, 0.32);
    ear.rotation.z = -s * 0.35;
    createCone(ear, '#fab1a0', 0.09, 0.24, 0, -0.02, 0.03); // pink inner ear
    // Eyes
    createSphere(mount, '#2d3436', 0.045, s * 0.11, 0.66, 0.55);
    createSphere(mount, '#ffffff', 0.016, s * 0.12 - 0.01, 0.68, 0.58);
  }
  // Heart-shaped peach bottom rear & tiny wagging stubby tail
  createSphere(mount, white, 0.18, 0, 0.35, -0.5);
  const tail = createSphere(mount, fur, 0.08, 0, 0.44, -0.56);
  mount.userData.tail = tail;
  return mount;
}

// 4. Mascots (UFO, Cat, Storm) with Velvet / Plush Touch
function buildUFO() {
  const root = new T.Group();
  const lowerDish = createSphere(root, '#6c5ce7', 1.25, 0, 0, 0, 0.7);
  lowerDish.scale.set(1.3, 0.24, 1.3);
  const rim = createTorus(root, '#a29bfe', 1.45, 0.18, 0, 0.08, 0, 0.6);
  rim.rotation.x = Math.PI / 2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bulb = createSphere(root, i % 2 ? '#55efc4' : '#ffeaa7', 0.085, Math.cos(a) * 1.45, 0.09, Math.sin(a) * 1.45, 0.4);
    (bulb.material as T.MeshPhysicalMaterial).emissive = new T.Color(i % 2 ? '#00b894' : '#fdcb6e');
    (bulb.material as T.MeshPhysicalMaterial).emissiveIntensity = 0.9;
  }
  const domeMat = new T.MeshPhysicalMaterial({
    color: '#81ecec',
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    transmission: 0.8,
    thickness: 0.5,
  });
  const dome = new T.Mesh(new T.SphereGeometry(0.72, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5), domeMat);
  dome.position.set(0, 0.18, 0);
  root.add(dome);

  // Tiny alien
  const alien = new T.Group();
  alien.position.set(0, 0.3, 0);
  root.add(alien);
  createSphere(alien, '#2ecc71', 0.22, 0, 0.15, 0, 0.8);
  for (const s of [-1, 1]) {
    createSphere(alien, '#1e272e', 0.065, s * 0.09, 0.18, 0.16, 0.3);
    const ant = createCylinder(alien, '#27ae60', 0.015, 0.015, 0.15, 8, s * 0.1, 0.36, 0);
    ant.rotation.z = -s * 0.35;
    createSphere(alien, '#f1c40f', 0.035, s * 0.15, 0.44, 0);
  }
  const nozzle = createCylinder(root, '#00cec9', 0.45, 0.55, 0.18, 24, 0, -0.15, 0, 0.5);
  (nozzle.material as T.MeshPhysicalMaterial).emissive = new T.Color('#00cec9');
  (nozzle.material as T.MeshPhysicalMaterial).emissiveIntensity = 0.8;
  return root;
}

function buildCat() {
  const root = new T.Group();
  const cushion = createCylinder(root, '#b83b5e', 1.4, 1.5, 0.32, 32, 0, 0.16, 0, 0.95);
  createTorus(cushion, '#f08a5d', 1.48, 0.065, 0, 0.08, 0);

  const catBody = new T.Group();
  catBody.position.set(0, 0.4, 0);
  root.add(catBody);

  const fur = '#f39c12';
  const white = '#fff5e4';
  const bodySphere = createSphere(catBody, fur, 0.82, 0, 0.55, 0, 0.95);
  bodySphere.scale.set(1.05, 0.95, 0.92);
  const chest = createSphere(catBody, white, 0.52, 0, 0.55, 0.48, 0.95);
  chest.scale.set(0.85, 1, 0.4);

  const head = new T.Group();
  head.position.set(0, 1.35, 0.2);
  catBody.add(head);

  const headSphere = createSphere(head, fur, 0.62, 0, 0, 0, 0.95);
  headSphere.scale.set(1.12, 0.92, 0.95);
  const muzzle = createSphere(head, white, 0.28, 0, -0.12, 0.45, 0.95);
  muzzle.scale.set(1.3, 0.75, 0.6);
  createSphere(head, '#e84393', 0.06, 0, -0.06, 0.65, 0.5);

  for (const s of [-1, 1]) {
    const eye = createSphere(head, '#2ed573', 0.11, s * 0.24, 0.08, 0.54, 0.2);
    eye.scale.set(0.9, 1.1, 0.4);
    const pupil = createBox(head, '#2f3542', 0.03, 0.16, 0.05, s * 0.24, 0.08, 0.59);
    pupil.scale.set(1, 1, 0.5);
    createSphere(head, '#ffffff', 0.035, s * 0.26 - 0.02, 0.12, 0.61, 0.1);
    const ear = createCone(head, fur, 0.28, 0.48, s * 0.44, 0.52, -0.05);
    ear.rotation.z = -s * 0.32;
    ear.rotation.x = -0.15;
    const innerEar = createCone(ear, '#ff9999', 0.18, 0.38, 0, -0.02, 0.06);
    innerEar.scale.set(0.85, 0.85, 0.5);
  }

  const crown = createCylinder(head, '#ffd700', 0.22, 0.28, 0.24, 6, 0, 0.64, 0.05, 0.3);
  (crown.material as T.MeshPhysicalMaterial).metalness = 0.8;
  (crown.material as T.MeshPhysicalMaterial).roughness = 0.25;

  const paw = new T.Group();
  paw.position.set(-0.62, 0.85, 0.55);
  catBody.add(paw);
  const armMesh = createCylinder(paw, fur, 0.2, 0.24, 0.65, 16, 0, -0.3, 0);
  armMesh.rotation.z = 0.2;
  const pawMitt = createSphere(paw, white, 0.26, 0.05, -0.65, 0.12, 0.95);
  pawMitt.scale.set(1.15, 0.85, 1.25);
  createSphere(pawMitt, '#ff7675', 0.1, 0, -0.15, 0.08);
  for (let b = 0; b < 3; b++) {
    createSphere(pawMitt, '#ff7675', 0.05, (b - 1) * 0.15, -0.14, 0.22);
  }
  root.userData.paw = paw;

  const tail = new T.Group();
  tail.position.set(0.68, 0.3, -0.5);
  catBody.add(tail);
  createTorus(tail, fur, 0.45, 0.12, 0, 0.25, 0);
  createSphere(tail, white, 0.15, 0.45, 0.35, 0);
  root.userData.tail = tail;

  return root;
}

function buildStorm() {
  const root = new T.Group();
  const ringCount = 11;
  for (let i = 0; i < ringCount; i++) {
    const fraction = i / ringCount;
    const r = 0.25 + fraction * 1.35;
    const y = 0.15 + fraction * 2.8;
    const swirl = createTorus(root, i % 2 ? '#74b9ff' : '#a29bfe', r, 0.11 + fraction * 0.05, 0, y, 0, 0.6);
    swirl.rotation.x = Math.PI / 2;
    (swirl.material as T.MeshPhysicalMaterial).transparent = true;
    (swirl.material as T.MeshPhysicalMaterial).opacity = 0.68 + (1 - fraction) * 0.3;
    root.userData[`ring${i}`] = swirl;
  }
  for (let p = 0; p < 8; p++) {
    const paper = createBox(root, '#ffffff', 0.28, 0.38, 0.02, 0, 0, 0, 0.9);
    createBox(paper, '#e84118', 0.08, 0.04, 0.03, 0.06, 0.1, 0.015);
    root.userData[`paper${p}`] = paper;
  }
  for (let c = 0; c < 3; c++) {
    const clock = new T.Group();
    root.add(clock);
    createCylinder(clock, '#d63031', 0.18, 0.18, 0.08, 20, 0, 0, 0, 0.4);
    createCylinder(clock, '#ffffff', 0.15, 0.15, 0.09, 20, 0, 0, 0, 0.4);
    for (const s of [-1, 1]) createSphere(clock, '#f1c40f', 0.07, s * 0.14, 0.16, 0);
    root.userData[`clock${c}`] = clock;
  }
  return root;
}

// 5. Checkered Finish Line & Race Track Archway
function buildFinishLineArch() {
  const arch = new T.Group();
  // Two checkered pillar posts
  for (const side of [-1, 1]) {
    const post = new T.Group();
    post.position.set(side * 4.2, 0, -4.5);
    arch.add(post);
    createCylinder(post, '#2d3436', 0.3, 0.35, 3.8, 16, 0, 1.9, 0, 0.5);
    // Gold globe atop post
    createSphere(post, '#f1c40f', 0.4, 0, 3.9, 0, 0.3);
  }
  // Checkered Banner across the archway
  const banner = createBox(arch, '#2d3436', 8.6, 0.75, 0.12, 0, 3.5, -4.5, 0.4);
  for (let b = 0; b < 14; b++) {
    const isWhite = b % 2 === 0;
    createBox(banner, isWhite ? '#ffffff' : '#2d3436', 0.58, 0.34, 0.13, -3.8 + b * 0.58, 0.18, 0.01);
    createBox(banner, !isWhite ? '#ffffff' : '#2d3436', 0.58, 0.34, 0.13, -3.8 + b * 0.58, -0.18, 0.01);
  }
  // Checkered Ground Finish Line
  const line = new T.Group();
  line.position.set(0, 0.03, -4.5);
  arch.add(line);
  for (let b = 0; b < 16; b++) {
    const isW = b % 2 === 0;
    createBox(line, isW ? '#ffffff' : '#2d3436', 0.52, 0.02, 0.6, -3.9 + b * 0.52, 0, 0);
  }
  return arch;
}

export function Stage3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const [failed, setFailed] = useState(false);
  latest.current = props;

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setFailed(true);
      return;
    }
    setFailed(false);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(38, el.clientWidth / (el.clientHeight || 1), 0.1, 120);
    // Adjusted camera for the much wider, grand arena
    camera.position.set(0, 8.8, 17.5);
    camera.lookAt(0, 1.0, 0);

    const isUFO = props.concept === 'ufo';
    const isCat = props.concept === 'cat';
    const isRace = !!props.raceMode;

    scene.fog = new T.FogExp2(
      isRace ? '#fef3c7' : isUFO ? '#161933' : isCat ? '#f9ede3' : '#dff0ec',
      isUFO ? 0.018 : 0.015
    );

    const hemiLight = new T.HemisphereLight(
      isRace ? '#fffbeb' : isUFO ? '#c3caff' : isCat ? '#fff8e7' : '#e0f7f6',
      isRace ? '#fde68a' : isUFO ? '#30264e' : isCat ? '#c89e7e' : '#8fa9a3',
      2.4
    );
    scene.add(hemiLight);

    const sun = new T.DirectionalLight(isUFO ? '#e0e7ff' : '#fff5eb', 3.6);
    sun.position.set(-6, 15, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    const rimLight = new T.PointLight(isRace ? '#f59e0b' : isUFO ? '#a29bfe' : isCat ? '#ff7675' : '#74b9ff', 18, 26);
    rimLight.position.set(6, 6, -5);
    scene.add(rimLight);

    // ==========================================
    // EXPANDED WIDE GROUND / ISLAND (Radius 9.8!)
    // ==========================================
    const islandGroup = new T.Group();
    islandGroup.position.set(0, -0.4, 0);
    scene.add(islandGroup);

    // Broad velvet/felt ground platform (Radius 9.8)
    const islandMat = velvetMaterial(
      isRace ? '#f8e8a6' : isUFO ? '#3d375f' : isCat ? '#eacbb0' : '#a2cfc4',
      0.95
    );
    const island = new T.Mesh(new T.CylinderGeometry(9.8, 9.4, 0.7, 80), islandMat);
    island.receiveShadow = true;
    island.castShadow = true;
    islandGroup.add(island);

    // Outer decorative rim
    const rimMesh = createTorus(
      islandGroup,
      isRace ? '#f59e0b' : isUFO ? '#7e6ea8' : isCat ? '#ffecd9' : '#d2f3ec',
      9.7,
      0.1,
      0,
      0.35,
      0
    );
    rimMesh.rotation.x = Math.PI / 2;

    // Sub-island rock taper
    const subRock = createCylinder(
      islandGroup,
      isRace ? '#b45309' : isUFO ? '#201d36' : isCat ? '#be987b' : '#699e94',
      9.1,
      3.2,
      2.6,
      40,
      0,
      -1.5,
      0,
      0.95
    );
    subRock.receiveShadow = true;

    // Outer running track curbs / fence posts around the wide perimeter
    for (let f = 0; f < 20; f++) {
      const fa = (f / 20) * Math.PI * 2;
      const fencePost = createCylinder(
        islandGroup,
        f % 2 ? '#ffffff' : '#f59e0b',
        0.1,
        0.1,
        0.55,
        10,
        Math.cos(fa) * 9.2,
        0.55,
        Math.sin(fa) * 9.2
      );
      fencePost.castShadow = true;
    }

    // Finish line archway (visible in race mode)
    const finishArch = buildFinishLineArch();
    finishArch.visible = isRace;
    scene.add(finishArch);

    // Thematic Scenery Around Island
    if (!isRace) {
      if (isUFO) {
        const starGeo = new T.BufferGeometry();
        const starPos: number[] = [];
        for (let i = 0; i < 240; i++) {
          starPos.push(Math.sin(i * 47.1) * 32, 2 + ((i * 19) % 140) / 8, -8 - Math.abs(Math.cos(i * 13)) * 25);
        }
        starGeo.setAttribute('position', new T.Float32BufferAttribute(starPos, 3));
        scene.add(new T.Points(starGeo, new T.PointsMaterial({ color: '#f5e6ff', size: 0.08 })));

        const planet = createSphere(scene, '#9b59b6', 1.4, -8, 6.5, -12, 0.8);
        const pRing = createTorus(planet, '#e8d5f5', 2.2, 0.14, 0, 0, 0);
        pRing.rotation.x = 1.2;
      } else if (isCat) {
        for (let i = 0; i < 4; i++) {
          createSphere(scene, PALETTE[i * 2], 0.42, -6.5 + i * 4.4, 0.28, 3.2, 0.95);
        }
      } else {
        const school = new T.Group();
        school.position.set(-6.5, 0, -5.2);
        createBox(school, '#f7f1e3', 3.2, 2.5, 1.4, 0, 1.25, 0);
        const roof = new T.Mesh(new T.ConeGeometry(2.4, 1.2, 4), velvetMaterial('#34495e'));
        roof.rotation.y = Math.PI / 4;
        roof.position.set(0, 3.1, 0);
        school.add(roof);
        scene.add(school);
      }
    }

    // Mascots
    const mascot = isRace ? new T.Group() : isUFO ? buildUFO() : isCat ? buildCat() : buildStorm();
    mascot.position.set(0, 3.8, -2.1);
    if (isCat) {
      mascot.scale.setScalar(1.22);
      mascot.position.set(0, 0, -2.6);
    }
    if (!isUFO && !isCat && !isRace) {
      mascot.scale.setScalar(1.15);
      mascot.position.set(0, 0.2, -2.4);
    }
    scene.add(mascot);

    // UFO Beam
    const beamMat = new T.MeshBasicMaterial({
      color: '#55efc4',
      transparent: true,
      opacity: 0.18,
      side: T.DoubleSide,
      depthWrite: false,
    });
    const beam = new T.Mesh(new T.ConeGeometry(1.65, 4.4, 48, 1, true), beamMat);
    beam.position.set(0, 1.9, -2.1);
    beam.visible = isUFO && !isRace;
    scene.add(beam);

    const beamLight = new T.PointLight('#55efc4', 12, 8);
    beamLight.position.set(0, 2.2, -2.1);
    beamLight.visible = isUFO && !isRace;
    scene.add(beamLight);

    // Visible Characters (Up to 25 students supported in race room!)
    const maxStudents = isRace ? 25 : 24;
    const visible = props.students.slice(0, maxStudents);
    const extras = props.students.filter(
      (s) => props.selected.includes(s.id) && !visible.some((v) => v.id === s.id)
    );
    let slot = visible.length - 1;
    for (const extra of extras) {
      while (slot >= 0 && props.selected.includes(visible[slot].id)) slot--;
      if (slot < 0) break;
      visible[slot--] = extra;
    }

    // Build Student Actors with their Mounts
    const actors = visible.map((student, i) => {
      const studentIndex = props.students.findIndex((s) => s.id === student.id);
      const actor = buildChibiCharacter(studentIndex, student.avatar);

      // Mount for race mode
      let mount: T.Group | null = null;
      if (isRace) {
        const type = props.racerType || 'duck';
        if (type === 'duck') mount = buildDuckMount(PALETTE[i % PALETTE.length]);
        else if (type === 'pony') mount = buildPonyMount(PALETTE[i % PALETTE.length]);
        else if (type === 'corgi') mount = buildCorgiMount();

        if (mount) {
          actor.root.add(mount);
          // Seat chibi comfortably atop the mount
          actor.body.position.set(0, 0.42, -0.05);
          actor.body.scale.setScalar(0.85);
          actor.limbs.forEach((l) => (l.rotation.x = 0.4));
        }
      }

      // Spacious starting positions across the wide arena
      const cols = Math.min(8, visible.length);
      const row = Math.floor(i / cols);
      const col = i % cols;
      const home = isRace
        ? new T.Vector3((i - (visible.length - 1) / 2) * 0.65, 0, 4.2 + (i % 2) * 0.6)
        : new T.Vector3((col - (cols - 1) / 2) * 1.55, 0, 0.6 + row * 1.85);

      actor.root.position.copy(home);
      scene.add(actor.root);

      const label = document.createElement('span');
      label.className = `actor-label ${isRace ? 'racer-badge' : ''}`;
      label.textContent = isRace ? `#${i + 1} ${student.name.split(' ').slice(-2).join(' ')}` : student.name.split(' ').slice(-2).join(' ');
      label.title = student.name;
      el.appendChild(label);

      return { ...actor, home, student, label, mount, racerNum: i + 1 };
    });

    // Grouping Docks
    const docks = props.groups.slice(0, 24).map((g, i) => {
      const angle = (i / Math.min(props.groups.length, 24)) * Math.PI * 2;
      const point = new T.Vector3(Math.sin(angle) * 5.8, 0, Math.cos(angle) * 4.6);
      const dock = createTorus(scene, PALETTE[i % PALETTE.length], 0.68, 0.09, point.x, 0.03, point.z);
      dock.rotation.x = Math.PI / 2;
      return { g, point };
    });

    // Resize Observer
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.position.z = w / h < 1.3 ? 21.5 : 17.5;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    let started = performance.now();
    let wasRunning = false;
    let raceReported = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const projected = new T.Vector3();
    let lastLabelUpdate = 0;

    // Race Simulation Twists & Turns (Deterministic seed based on props.raceSeed)
    const seed = props.raceSeed || 12345;
    const raceSpeeds = visible.map((_, i) => {
      const pseudo = Math.sin(seed * 9.2 + i * 3.7) * 43758.5453;
      const rnd = pseudo - Math.floor(pseudo);
      const twistTime1 = 2.0 + (i % 3) * 1.5;
      const twistTime2 = 6.0 + (i % 4) * 1.2;
      const isRocket = (i * 7 + 3) % 5 === 0;
      const isSlip = (i * 11 + 5) % 4 === 0;
      return { base: 0.85 + rnd * 0.35, twistTime1, twistTime2, isRocket, isSlip };
    });

    // Animation Loop
    renderer.setAnimationLoop((now) => {
      if (document.hidden) return;
      const state = latest.current;
      if (state.running && !wasRunning) {
        started = now;
        raceReported = false;
      }
      wasRunning = state.running;

      const elapsed = (now - started) / 1000;
      const t = reduce.matches ? 0 : now / 1000;
      const phase = chasePhase(elapsed);
      const revealing = state.running && phase.reveal && !reduce.matches;

      // Identify target for non-race modes
      const targetActor = actors.find((a) => state.selected.includes(a.student.id));
      const targetIndex = targetActor ? props.students.findIndex((s) => s.id === targetActor.student.id) : 0;
      const target = runnerPosition(targetIndex, REVEAL_SECONDS);

      // ==========================================
      // CAMERA CHOREOGRAPHY
      // ==========================================
      if (!reduce.matches) {
        if (state.raceMode && state.running) {
          // Dynamic tracking camera during race
          const raceProgress = Math.min(1, elapsed / 10);
          camera.position.x = Math.sin(elapsed * 0.5) * 2.5;
          camera.position.y = T.MathUtils.lerp(camera.position.y, 6.8, 0.05);
          camera.position.z = T.MathUtils.lerp(camera.position.z, 14.5 - raceProgress * 4.5, 0.05);
          camera.lookAt(0, 1.2, -raceProgress * 4.0);
        } else if (revealing && !state.raceMode) {
          const camTargetX = target.x * 0.45;
          const camTargetZ = target.z + 5.8;
          camera.position.x = T.MathUtils.lerp(camera.position.x, camTargetX, 0.06);
          camera.position.y = T.MathUtils.lerp(camera.position.y, 4.6, 0.06);
          camera.position.z = T.MathUtils.lerp(camera.position.z, camTargetZ, 0.06);
          camera.lookAt(target.x * 0.8, 1.8 + phase.lift * 1.5, target.z);
        } else if (state.running) {
          camera.position.x = Math.sin(t * 0.4) * 1.2;
          camera.position.y = T.MathUtils.lerp(camera.position.y, 9.2, 0.04);
          camera.position.z = T.MathUtils.lerp(camera.position.z, 18.5, 0.04);
          camera.lookAt(0, 1.2, 0);
        } else {
          // Living diorama gentle orbit
          const camX = Math.sin(t * 0.2) * 1.6;
          const camZ = 17.5 + Math.cos(t * 0.2) * 0.8;
          camera.position.x = T.MathUtils.lerp(camera.position.x, camX, 0.05);
          camera.position.y = T.MathUtils.lerp(camera.position.y, 8.8, 0.05);
          camera.position.z = T.MathUtils.lerp(camera.position.z, camZ, 0.05);
          camera.lookAt(0, 1.0, 0);
        }
      }

      // Mascot Movement (Normal Modes)
      if (!state.raceMode) {
        const patrol = new T.Vector3(
          Math.sin(elapsed * 1.15) * 4.5,
          isUFO ? 4.2 : isCat ? 0 : 0.25,
          -2.4 + Math.cos(elapsed * 0.95) * 1.8
        );
        const destination = new T.Vector3(
          target.x + (isCat ? 0.88 : 0),
          isUFO ? 4.2 : isCat ? 0 : 0.25,
          target.z + (isCat ? -0.3 : 0)
        );

        if (state.running && !reduce.matches) {
          mascot.position.copy(patrol);
          if (revealing) {
            const arrival = new T.Vector3(
              Math.sin(REVEAL_SECONDS * 1.15) * 4.5,
              patrol.y,
              -2.4 + Math.cos(REVEAL_SECONDS * 0.95) * 1.8
            );
            mascot.position.copy(arrival).lerp(destination, phase.approach);
            mascot.position.y += phase.lift * (isUFO ? 1.6 : isCat ? 1.2 : 1.9);
          }
        } else {
          mascot.position.set(Math.sin(t * 0.6) * 0.5, isUFO ? 3.8 : isCat ? 0 : 0.3, -2.6);
        }

        if (isUFO) {
          mascot.rotation.z = Math.sin(t * 1.8) * 0.08;
          mascot.rotation.y = t * 1.2;
          beam.visible = revealing && phase.approach > 0.75;
          beamLight.visible = beam.visible;
          beam.position.set(target.x, mascot.position.y - 2.1, target.z);
          beamLight.position.set(target.x, 2.2, target.z);
        } else if (isCat) {
          mascot.rotation.y = revealing ? 0 : Math.sin(t * 0.8) * 0.25;
          const paw = mascot.userData.paw as T.Group;
          if (paw) {
            paw.rotation.z = revealing ? -phase.lift * 0.75 : Math.sin(t * 3) * 0.12;
            paw.rotation.x = revealing ? phase.lift * 0.3 : 0;
          }
          const tail = mascot.userData.tail as T.Group;
          if (tail) tail.rotation.z = Math.sin(t * 2.5) * 0.25;
        } else {
          mascot.rotation.y = t * 3.2;
          for (let p = 0; p < 8; p++) {
            const paper = mascot.userData[`paper${p}`] as T.Mesh;
            if (paper) {
              const pa = t * 3 + p * 0.8;
              const pr = 0.9 + Math.sin(p) * 0.5;
              paper.position.set(Math.cos(pa) * pr, 0.4 + p * 0.32, Math.sin(pa) * pr);
              paper.rotation.set(pa * 1.4, pa, p);
            }
          }
        }
      }

      // ==========================================
      // RACE MODE / NORMAL MODE ACTORS UPDATE
      // ==========================================
      const currentRankings: { actor: typeof actors[0]; zProgress: number }[] = [];

      actors.forEach((actor, i) => {
        const studentIndex = props.students.findIndex((s) => s.id === actor.student.id);
        const chosen = state.selected.includes(actor.student.id);

        if (state.raceMode) {
          // RACE MODE: Racing from Start (Z = 4.5) to Finish Line (Z = -4.5)
          const params = raceSpeeds[i] || { base: 1, twistTime1: 3, twistTime2: 7, isRocket: false, isSlip: false };
          let progress = (elapsed / 10) * params.base;

          // Twists and unpredictable surges!
          if (elapsed > params.twistTime1 && elapsed < params.twistTime1 + 1.8) {
            progress += params.isRocket ? (elapsed - params.twistTime1) * 0.25 : -(elapsed - params.twistTime1) * 0.15;
          }
          if (elapsed > params.twistTime2 && elapsed < params.twistTime2 + 2.0) {
            progress += params.isSlip ? -(elapsed - params.twistTime2) * 0.2 : (elapsed - params.twistTime2) * 0.18;
          }

          const clampedProg = state.running ? Math.min(1.08, Math.max(0, progress)) : 0;
          const currentZ = T.MathUtils.lerp(actor.home.z, -4.8, clampedProg);
          const laneWobble = Math.sin(elapsed * 4 + i) * 0.22;
          const currentX = actor.home.x + laneWobble;

          actor.root.position.set(currentX, 0, currentZ);
          actor.root.rotation.set(0, Math.PI, 0); // Face forward towards finish line

          // Gallop / Duck Waddle animation
          if (state.running && !reduce.matches) {
            const gallop = Math.sin(t * 18 + i * 2);
            actor.root.position.y = Math.abs(gallop) * 0.18;
            if (actor.mount) {
              actor.mount.rotation.x = gallop * 0.12;
              actor.mount.rotation.z = Math.sin(t * 12 + i) * 0.08;
            }
          }

          currentRankings.push({ actor, zProgress: -currentZ });
        } else {
          // NORMAL MODES: Expansive wide wandering and capture
          actor.root.position.copy(actor.home);
          actor.root.rotation.set(0, Math.sin(t * 0.7 + i) * 0.15, 0);
          actor.root.scale.setScalar(1);

          actor.eyebrows.forEach((brow, bi) => {
            brow.rotation.z = state.running ? (bi === 0 ? 0.35 : -0.35) : 0;
          });

          if (state.running && !reduce.matches) {
            // WIDER RUNNING: Scale runner position out across the grand island (1.45x)
            const rawPath = runnerPosition(studentIndex, chosen && revealing ? REVEAL_SECONDS : elapsed);
            const path = { x: rawPath.x * 1.45, z: rawPath.z * 1.35 };
            actor.root.position.set(path.x, 0, path.z);

            const rawAhead = runnerPosition(
              studentIndex,
              Math.min(elapsed, chosen && revealing ? REVEAL_SECONDS : Infinity) + 0.04
            );
            const ahead = { x: rawAhead.x * 1.45, z: rawAhead.z * 1.35 };
            actor.root.rotation.y = Math.atan2(ahead.x - path.x, ahead.z - path.z);
          }

          if (state.groups.length) {
            const dock = docks.find((d) => d.g.members.some((s) => s.id === actor.student.id));
            if (dock) {
              const memberIndex = dock.g.members.findIndex((s) => s.id === actor.student.id);
              const angle = memberIndex * 2.4;
              const point = new T.Vector3(
                dock.point.x + Math.sin(angle) * 0.55,
                0,
                dock.point.z + Math.cos(angle) * 0.55
              );
              if (!state.running) actor.root.position.copy(point);
              else if (revealing) {
                const rawPath = runnerPosition(studentIndex, REVEAL_SECONDS);
                const path = new T.Vector3(rawPath.x * 1.45, 0, rawPath.z * 1.35);
                actor.root.position.copy(path).lerp(point, phase.lift);
                actor.root.position.y = Math.sin(phase.lift * Math.PI) * 0.7;
              }
            }
          } else if (revealing && chosen) {
            const rawCaught = runnerPosition(studentIndex, REVEAL_SECONDS);
            const caught = new T.Vector3(rawCaught.x * 1.45, 0, rawCaught.z * 1.35);
            const offset = state.selected.indexOf(actor.student.id) * 0.35;
            const targetLift = new T.Vector3(
              target.x * 1.45 + offset,
              isUFO ? 4.8 : isCat ? 2.8 : 4.2,
              target.z * 1.35 + 0.25
            );
            actor.root.position.copy(caught).lerp(targetLift, phase.lift);

            actor.arms.forEach((arm, ai) => {
              arm.rotation.x = -Math.PI * 0.75 + Math.sin(t * 12 + ai) * 0.35;
            });
            actor.legs.forEach((leg, li) => {
              leg.rotation.x = Math.sin(t * 10 + li * Math.PI) * 0.4;
            });

            if (!isUFO && !isCat) {
              actor.root.position.x += Math.sin(phase.lift * 16) * phase.lift * 0.45;
              actor.root.rotation.y = phase.lift * 15;
            }
            if (isUFO) actor.root.scale.setScalar(1 - phase.lift * 0.65);
          }

          if (!reduce.matches) {
            const active = state.running;
            actor.root.position.y += Math.abs(Math.sin(t * (active ? 18 : 2.5) + i)) * (active ? 0.16 : 0.03);
            actor.root.rotation.z += active ? Math.sin(t * 14 + i) * 0.09 : 0;
            if (!(revealing && chosen)) {
              actor.limbs.forEach((limb, k) => {
                limb.rotation.x = Math.sin(t * (active ? 22 : 2.5) + i + k * Math.PI) * (active ? 0.88 : 0.08);
              });
            }
          }
        }

        // Project 3D coordinate to HTML Label
        if (now - lastLabelUpdate > 35) {
          projected.copy(actor.root.position).add(new T.Vector3(0, 1.8, 0)).project(camera);
          const screenX = (projected.x * 0.5 + 0.5) * el.clientWidth;
          const screenY = (-projected.y * 0.5 + 0.5) * el.clientHeight;
          actor.label.style.transform = `translate(-50%, -50%) translate(${screenX}px, ${screenY}px)`;
          actor.label.style.opacity = projected.z < 1 ? '1' : '0';
          actor.label.classList.toggle('picked', chosen && revealing);
        }
      });

      // Report Race Ranking when finished
      if (state.raceMode && elapsed >= 10 && !raceReported && state.running) {
        raceReported = true;
        currentRankings.sort((a, b) => b.zProgress - a.zProgress);
        const rankedStudents = currentRankings.map((r) => r.actor.student);
        state.onRaceFinish?.(rankedStudents);
      }

      if (now - lastLabelUpdate > 35) lastLabelUpdate = now;
      renderer.render(scene, camera);
    });

    const lost = (event: Event) => {
      event.preventDefault();
      setFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);

    return () => {
      observer.disconnect();
      renderer.setAnimationLoop(null);
      renderer.domElement.removeEventListener('webglcontextlost', lost);

      const geometries = new Set<T.BufferGeometry>();
      const materials = new Set<T.Material>();
      scene.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Points) {
          geometries.add(o.geometry);
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      actors.forEach((a) => a.label.remove());
      renderer.domElement.remove();
    };
  }, [
    props.concept,
    props.raceMode,
    props.racerType,
    props.raceSeed,
    props.students.map((s) => s.id + ':' + s.name + ':' + s.avatar).join('|'),
    props.groups.map((g) => g.id).join('|'),
    props.selected.join('|'),
  ]);

  if (failed)
    return (
      <>
        <Stage {...props} />
        <p className="webgl-note">Thiết bị không hỗ trợ 3D. Đang dùng sân chơi 2D.</p>
      </>
    );

  return (
    <div className={`stage stage-3d world-${props.concept} ${props.raceMode ? 'world-race' : ''}`}>
      <div className="three-host" ref={host} />
      <div className="scene-caption">
        <span className="live-dot" />
        {props.raceMode
          ? props.running
            ? 'ĐUA THÚ CUỒNG NHIỆT · ĐANG RƯỢT ĐUỔI GẮNG SỨC!'
            : `PHÒNG ĐUA: ${props.roomId || 'RACE-27A'} · SẴN SÀNG XUẤT PHÁT`
          : props.running
            ? 'CUỘC PHIÊU LƯU BẮT ĐẦU'
            : 'VŨ TRỤ 3D VẢI NHUNG · SẴN SÀNG KHÁM PHÁ'}
      </div>
      <div className="world-tag">
        {props.raceMode
          ? 'TRƯỜNG ĐUA THÚ TOP 1-2-3'
          : props.concept === 'ufo'
            ? 'TRẠM KHÔNG GIAN 07'
            : props.concept === 'cat'
              ? 'VƯƠNG QUỐC HOÀNG THƯỢNG'
              : 'HỌC VIỆN DEADLINE'}
        <span>✦</span>
      </div>
      <div className="stage-note">
        {props.raceMode
          ? `Tối đa 25 bạn tham gia cuộc đua · Bứt tốc bất ngờ & Twist đảo chiều`
          : props.students.length > 24
            ? `24 nhân vật đại diện · ${props.students.length} sinh viên tham gia`
            : 'Mặt đất mở rộng · Chất liệu nhung 3D mềm mại'}
        <span>✦</span>
      </div>
      {!props.students.length && (
        <div className="stage-empty">Thêm danh sách để bắt đầu cuộc đua nhé!</div>
      )}
    </div>
  );
}
