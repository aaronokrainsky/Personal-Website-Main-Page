import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const SCALE = 0.05;

const defaults = {
  wristCirc: 220,
  metacarpalHeight: 28,
  metacarpalWidth: 100,
  thumbWidth: 60,
  thumbHeight: 60,
  wristHeight: 45,
  wristWidth: 65,
  foreWristLength: 100,
  wristMetaLength: 80,
  thick: 3,
  metaToThumbLength: 80,
  velcroThickness: 4,
  filamentType: "petg",
  support: "balanced",
  vents: 0,
  thumbRelief: true,
  hand: "left",
  camera: "iso"
};

const state = { ...defaults };
const isHomePreview = Boolean(document.querySelector("[data-home-preview]"));
const derivedCache = {
  key: "",
  thumbRelief: null,
  strapSlots: null,
  ventExclusion: null
};
let renderTimer = null;
let lastRenderKey = "";
let lastSpecValues = null;
let lastPrintEstimate = null;

const inputs = {
  wristCirc: document.querySelector("#wristCirc"),
  metacarpalHeight: document.querySelector("#metacarpalHeight"),
  metacarpalWidth: document.querySelector("#metacarpalWidth"),
  thumbWidth: document.querySelector("#thumbWidth"),
  thumbHeight: document.querySelector("#thumbHeight"),
  wristHeight: document.querySelector("#wristHeight"),
  wristWidth: document.querySelector("#wristWidth"),
  foreWristLength: document.querySelector("#foreWristLength"),
  wristMetaLength: document.querySelector("#wristMetaLength"),
  thick: document.querySelector("#thick"),
  metaToThumbLength: document.querySelector("#metaToThumbLength"),
  velcroThickness: document.querySelector("#velcroThickness"),
  filamentType: document.querySelector("#filamentType"),
  support: null,
  vents: document.querySelector("#ventilation"),
  thumbRelief: null
};

const output = {
  printTime: document.querySelector("#printTime"),
  filamentUse: document.querySelector("#filamentUse"),
  filamentCost: document.querySelector("#filamentCost"),
  filamentPrice: document.querySelector("#filamentPrice"),
  ventLabel: document.querySelector("#ventilationValue"),
  shellLength: document.querySelector("#shellLength"),
  wristOpening: document.querySelector("#wristOpening"),
  palmOpening: document.querySelector("#palmOpening"),
  thickness: document.querySelector("#thickness"),
  straps: document.querySelector("#straps"),
  viewport: document.querySelector("#braceViewport"),
  exportStl: document.querySelector("#exportStl"),
  export3mf: document.querySelector("#export3mf")
};

const slicer = {
  layerHeight: 0.2,
  lineWidth: 0.45,
  printSpeed: 45,
  travelOverhead: 1.35,
  layerChangeSeconds: 2.2,
  filamentDensity: 1.24
};

const filamentProfiles = {
  pla: { label: "PLA", pricePerKg: 14.99, density: 1.24 },
  plaPlus: { label: "PLA+ / Tough PLA", pricePerKg: 15.99, density: 1.24 },
  petg: { label: "PETG", pricePerKg: 15.99, density: 1.27 },
  abs: { label: "ABS", pricePerKg: 15.99, density: 1.05 },
  asa: { label: "ASA", pricePerKg: 20.99, density: 1.07 },
  tpu: { label: "TPU 95A", pricePerKg: 22.99, density: 1.21 },
  nylon: { label: "Nylon / PA", pricePerKg: 34.99, density: 1.12 },
  pc: { label: "Polycarbonate", pricePerKg: 31.99, density: 1.20 },
  plaCf: { label: "PLA-CF", pricePerKg: 34.99, density: 1.22 },
  paCf: { label: "PA-CF / Nylon-CF", pricePerKg: 39.99, density: 1.24 }
};

const meshResolution = {
  preview: { thetaSegments: 240, ySegments: 420 },
  export: { thetaSegments: 320, ySegments: 560 }
};

const supportProfiles = {
  flex: { strapBias: 0, note: "Flexible support keeps the walls light and uses larger strap spacing." },
  balanced: { strapBias: 1, note: "Balanced support uses the CAD wall thickness with reinforced Velcro slots." },
  rigid: { strapBias: 1, note: "Rigid support keeps the same sleeve shape and adds tighter strap spacing." }
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8faf9);

const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
output.viewport.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 16;
controls.maxDistance = 52;
controls.autoRotate = false;
controls.autoRotateSpeed = 0.55;

const modelGroup = new THREE.Group();
scene.add(modelGroup);

scene.add(new THREE.HemisphereLight(0xffffff, 0x9aa9a6, 2.1));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
keyLight.position.set(8, -12, 18);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0xd9f0ec, 1.1);
fillLight.position.set(-11, 7, 12);
scene.add(fillLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(44, 44),
  new THREE.MeshStandardMaterial({ color: 0xeef3f2, roughness: 0.9 })
);
ground.position.z = -2.35;
ground.receiveShadow = true;
if (!isHomePreview) {
  scene.add(ground);
}

const grid = new THREE.GridHelper(44, 44, 0xcfd9d7, 0xdfe7e5);
grid.rotation.x = Math.PI / 2;
grid.position.z = -2.32;
if (!isHomePreview) {
  scene.add(grid);
}

const materials = {
  shell: new THREE.MeshPhysicalMaterial({
    color: 0x0f7f72,
    roughness: 0.48,
    metalness: 0.02,
    clearcoat: 0.28,
    side: THREE.DoubleSide
  }),
  rim: new THREE.MeshStandardMaterial({ color: 0x08584f, roughness: 0.55 }),
  strap: new THREE.MeshStandardMaterial({ color: 0x384f7c, roughness: 0.72 }),
  buckle: new THREE.MeshStandardMaterial({ color: 0xf8faf9, roughness: 0.45, metalness: 0.04 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf0c5a5, roughness: 0.72, transparent: true, opacity: 0.28, depthWrite: false }),
  marker: new THREE.MeshStandardMaterial({ color: 0xb4873e, roughness: 0.55 })
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function geometryStateKey() {
  return [
    state.wristCirc,
    state.metacarpalHeight,
    state.metacarpalWidth,
    state.thumbWidth,
    state.thumbHeight,
    state.wristHeight,
    state.wristWidth,
    state.foreWristLength,
    state.wristMetaLength,
    state.thick,
    state.metaToThumbLength,
    state.velcroThickness,
    state.vents,
    state.hand
  ].join("|");
}

function resetDerivedCache() {
  const key = geometryStateKey();
  if (derivedCache.key !== key) {
    derivedCache.key = key;
    derivedCache.thumbRelief = null;
    derivedCache.strapSlots = null;
    derivedCache.ventExclusion = null;
  }
}

function angleDistance(a, b) {
  const tau = Math.PI * 2;
  return Math.abs((((a - b + Math.PI) % tau) + tau) % tau - Math.PI);
}

function readState() {
  state.wristCirc = clamp(Number(inputs.wristCirc?.value) || defaults.wristCirc, 130, 260);
  state.metacarpalHeight = clamp(Number(inputs.metacarpalHeight.value) || defaults.metacarpalHeight, 18, 50);
  state.metacarpalWidth = clamp(Number(inputs.metacarpalWidth.value) || defaults.metacarpalWidth, 65, 120);
  state.thumbWidth = clamp(Number(inputs.thumbWidth.value) || defaults.thumbWidth, 20, 60);
  const thumbHeightValue = Number(inputs.thumbHeight.value);
  state.thumbHeight = clamp(Number.isFinite(thumbHeightValue) ? thumbHeightValue : defaults.thumbHeight, 0, 80);
  state.wristHeight = clamp(Number(inputs.wristHeight.value) || defaults.wristHeight, 30, 75);
  state.wristWidth = clamp(Number(inputs.wristWidth.value) || defaults.wristWidth, 40, 90);
  state.foreWristLength = clamp(Number(inputs.foreWristLength.value) || defaults.foreWristLength, 70, 160);
  state.wristMetaLength = clamp(Number(inputs.wristMetaLength.value) || defaults.wristMetaLength, 55, 110);
  state.thick = defaults.thick;
  state.metaToThumbLength = clamp(Number(inputs.metaToThumbLength.value) || defaults.metaToThumbLength, 20, 100);
  state.velcroThickness = clamp(Number(inputs.velcroThickness.value) || defaults.velcroThickness, 2, 8);
  state.filamentType = filamentProfiles[inputs.filamentType?.value] ? inputs.filamentType.value : defaults.filamentType;
  state.support = defaults.support;
  state.vents = clamp(Math.round(Number(inputs.vents?.value) || defaults.vents), 0, 3);
  state.thumbRelief = true;
}

function selectedFilamentProfile() {
  return filamentProfiles[state.filamentType] || filamentProfiles[defaults.filamentType];
}

function spec() {
  const profile = supportProfiles[state.support];
  const shellLength = state.foreWristLength + state.wristMetaLength;
  const topOpening = Math.round(Math.PI * Math.sqrt((state.metacarpalWidth ** 2 + state.metacarpalHeight ** 2) / 2));
  const area = Math.round((shellLength * (state.wristCirc + topOpening) * 0.5 * 0.82) / 100);
  const straps = clamp(3 + profile.strapBias, 3, 4);
  const printTime = ((area * state.thick) / 78).toFixed(1);

  return { profile, shellLength, topOpening, area, straps, printTime };
}

function clearModel() {
  while (modelGroup.children.length) {
    const child = modelGroup.children.pop();
    child.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
    });
  }
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function sectionAt(yMm, insetMm = 0) {
  const wristT = smoothstep(-state.foreWristLength, 0, yMm);
  const metaT = smoothstep(0, state.wristMetaLength, yMm);
  const forearmRatio = clamp(state.wristHeight / Math.max(state.wristWidth, 1), 0.55, 1.1);
  const forearmWidth = state.wristCirc / (2.2 + 1.65 * forearmRatio);
  const forearmHeight = forearmWidth * forearmRatio;
  const bottomWidth = Math.max(42, forearmWidth);
  const bottomHeight = Math.max(32, forearmHeight);
  const wristWidth = state.wristWidth;
  const wristHeight = state.wristHeight;
  const metaWidth = state.metacarpalWidth;
  const metaHeight = state.metacarpalHeight;

  const lowWidth = bottomWidth + (wristWidth - bottomWidth) * wristT;
  const lowHeight = bottomHeight + (wristHeight - bottomHeight) * wristT;
  const width = yMm < 0 ? lowWidth : wristWidth + (metaWidth - wristWidth) * metaT;
  const height = yMm < 0 ? lowHeight : wristHeight + (metaHeight - wristHeight) * metaT;

  return {
    rx: Math.max(4, width / 2 - insetMm) * SCALE,
    rz: Math.max(4, height / 2 - insetMm) * SCALE
  };
}

function pointOnBrace(theta, yMm, insetMm = 0) {
  const section = sectionAt(yMm, insetMm);
  return new THREE.Vector3(
    Math.sin(theta) * section.rx,
    yMm * SCALE,
    Math.cos(theta) * section.rz
  );
}

function filletInsetAtDistance(distanceMm, radiusMm) {
  if (distanceMm >= radiusMm || radiusMm <= 0) {
    return 0;
  }

  const x = radiusMm - Math.max(0, distanceMm);
  return radiusMm - Math.sqrt(Math.max(0, radiusMm * radiusMm - x * x));
}

function thumbReliefCurveTheta(yMm) {
  const { sideSplit, topY, bottomY, palmarStart } = thumbReliefProfile();
  const t = clamp((topY - yMm) / Math.max(topY - bottomY, 1), 0, 1);
  const curveEase = smoothstep(0.04, 0.92, t);
  const roundedBottom = 1 - Math.pow(1 - curveEase, 1.65);
  return sideSplit + (palmarStart - sideSplit) * roundedBottom;
}

function distanceToThumbReliefEdge(theta, yMm, averageRadiusMm) {
  if (!state.thumbRelief) {
    return Infinity;
  }

  const { sideSplit, topY, bottomY, palmarStart } = thumbReliefProfile();
  const radiusMm = state.thick * 0.75;
  const distances = [];

  if (yMm >= bottomY - radiusMm && yMm <= topY + radiusMm) {
    const clampedY = clamp(yMm, bottomY, topY);
    const curveTheta = thumbReliefCurveTheta(clampedY);
    distances.push(Math.hypot((theta - curveTheta) * averageRadiusMm, yMm - clampedY));
  }

  const minTheta = Math.min(sideSplit, palmarStart);
  const maxTheta = Math.max(sideSplit, palmarStart);
  const lowerTheta = clamp(theta, minTheta, maxTheta);
  distances.push(Math.hypot((theta - lowerTheta) * averageRadiusMm, yMm - bottomY));

  return Math.min(...distances);
}

function smoothedThumbBoundaryTheta(theta, yMm, averageRadiusMm) {
  if (!state.thumbRelief) {
    return theta;
  }

  const { sideSplit, topY, bottomY, palmarStart } = thumbReliefProfile();
  if (yMm < bottomY || yMm > topY) {
    return theta;
  }

  const curveTheta = thumbReliefCurveTheta(yMm);
  const minTheta = Math.min(sideSplit, palmarStart);
  const maxTheta = Math.max(sideSplit, palmarStart);
  const lowerTheta = clamp(theta, minTheta, maxTheta);
  const boundaryTheta = Math.abs(theta - curveTheta) < Math.abs(theta - lowerTheta) ? curveTheta : lowerTheta;
  const distanceMm = Math.abs(theta - boundaryTheta) * averageRadiusMm;
  const smoothBandMm = 2.4;

  if (distanceMm > smoothBandMm) {
    return theta;
  }

  const blend = 1 - smoothstep(0, smoothBandMm, distanceMm);
  return theta + (boundaryTheta - theta) * blend * 0.65;
}

function exposedEdgeInset(theta, yMm, thetaMin, thetaMax, yMin, yMax) {
  const radiusMm = state.thick * 0.5;
  const section = sectionAt(yMm, 0);
  const averageRadiusMm = ((section.rx + section.rz) / 2) / SCALE;
  const edgeDistances = [
    yMm - yMin,
    yMax - yMm,
    (theta - thetaMin) * averageRadiusMm,
    (thetaMax - theta) * averageRadiusMm
  ];

  return Math.min(
    radiusMm,
    Math.max(
      ...edgeDistances.map((distance) => filletInsetAtDistance(distance, radiusMm)),
      filletInsetAtDistance(distanceToThumbReliefEdge(theta, yMm, averageRadiusMm), radiusMm)
    )
  );
}

function pointOnSmoothedBrace(theta, yMm, insetMm = 0) {
  const section = sectionAt(yMm, 0);
  const averageRadiusMm = ((section.rx + section.rz) / 2) / SCALE;
  const smoothedTheta = smoothedThumbBoundaryTheta(theta, yMm, averageRadiusMm);
  return pointOnBrace(smoothedTheta, yMm, insetMm);
}

function thumbReliefProfile() {
  resetDerivedCache();
  if (derivedCache.thumbRelief) {
    return derivedCache.thumbRelief;
  }

  const splitHalf = splitThetaHalf();
  const side = state.hand === "left" ? -1 : 1;
  const sideSplit = side * (Math.PI / 2 - splitHalf);
  const topClearance = 8;
  const maxTopY = state.wristMetaLength - topClearance;
  const bottomY = clamp(state.wristMetaLength - state.metaToThumbLength, -state.foreWristLength + 14, maxTopY - 12);
  const topY = clamp(bottomY + state.thumbHeight, bottomY, maxTopY);
  const section = sectionAt((bottomY + topY) * 0.5, 0);
  const averageRadiusMm = ((section.rx + section.rz) / 2) / SCALE;
  const openingTheta = clamp((state.thumbWidth / Math.max(averageRadiusMm, 1)) * 0.62, 0.38, 1.38);
  const palmarStart = sideSplit - side * openingTheta;

  derivedCache.thumbRelief = { side, sideSplit, topY, bottomY, palmarStart };
  return derivedCache.thumbRelief;
}

function isThumbReliefCutout(theta, yMm) {
  if (!state.thumbRelief) {
    return false;
  }

  const { sideSplit, topY, bottomY } = thumbReliefProfile();
  const curveTheta = thumbReliefCurveTheta(yMm);
  const onThumbSide = theta >= Math.min(sideSplit, curveTheta) && theta <= Math.max(sideSplit, curveTheta);
  const inVerticalSpan = yMm <= topY && yMm >= bottomY;

  return inVerticalSpan && onThumbSide;
}

function strapSlotSpecs() {
  resetDerivedCache();
  if (derivedCache.strapSlots) {
    return derivedCache.strapSlots;
  }

  const { side, topY } = thumbReliefProfile();
  const yMax = state.wristMetaLength;
  const topYRegular = state.wristMetaLength - 18;
  const middleY = -state.foreWristLength * 0.38;
  const lowerY = -state.foreWristLength * 0.78;
  const thumbTheta = side * 0.72;
  const nonThumbTheta = -side * 0.72;
  const palmarThetas = [-0.72, 0.72];
  const nonPalmarThetas = [-2.48, 2.48];
  const allSlotThetas = [...palmarThetas, ...nonPalmarThetas];
  const slitThetaHalf = 0.055 + state.velcroThickness * 0.004;
  const regularHalfHeight = 13 + state.velcroThickness * 0.8;
  const regularTopHalfHeight = regularHalfHeight * 0.72;
  const thumbTopClearance = 2;
  const thumbTopAvailable = yMax - topY - thumbTopClearance;
  const thumbTopHalfHeight = thumbTopAvailable >= regularTopHalfHeight * 2
    ? regularTopHalfHeight
    : clamp((thumbTopAvailable - 1) * 0.5, 4, regularTopHalfHeight);
  const thumbSideTopY = Math.min(topYRegular, topY + thumbTopClearance + thumbTopHalfHeight);
  const specs = [
    { theta: nonThumbTheta, y: topYRegular, halfTheta: slitThetaHalf, halfHeight: regularTopHalfHeight },
    ...nonPalmarThetas.map((theta) => ({ theta, y: topYRegular, halfTheta: slitThetaHalf, halfHeight: regularTopHalfHeight })),
    ...allSlotThetas.flatMap((theta) => [middleY, lowerY].map((y) => ({ theta, y, halfTheta: slitThetaHalf, halfHeight: regularHalfHeight })))
  ];

  if (thumbTopAvailable >= 9) {
    specs.push({ theta: thumbTheta, y: thumbSideTopY, halfTheta: slitThetaHalf, halfHeight: thumbTopHalfHeight });
  }

  derivedCache.strapSlots = specs;
  return derivedCache.strapSlots;
}

function isStrapSlot(theta, yMm) {
  return strapSlotSpecs().some((slot) =>
    angleDistance(theta, slot.theta) < slot.halfTheta &&
    Math.abs(yMm - slot.y) < slot.halfHeight
  );
}

function ventilationLabel(value = state.vents) {
  return ["Off", "Low", "Medium", "High"][value] || "Off";
}

function ventExclusionData() {
  resetDerivedCache();
  if (derivedCache.ventExclusion) {
    return derivedCache.ventExclusion;
  }
  const splitHalf = splitThetaHalf();
  const splitEdges = [
    -Math.PI / 2 + splitHalf,
    Math.PI / 2 - splitHalf,
    Math.PI / 2 + splitHalf,
    Math.PI * 1.5 - splitHalf
  ];

  let thumb = null;
  if (state.thumbRelief) {
    const { sideSplit, topY, bottomY, palmarStart } = thumbReliefProfile();
    thumb = {
      minTheta: Math.min(sideSplit, palmarStart) - 0.2,
      maxTheta: Math.max(sideSplit, palmarStart) + 0.2,
      minY: bottomY - 12,
      maxY: topY + 12
    };
  }

  derivedCache.ventExclusion = {
    yMin: -state.foreWristLength,
    yMax: state.wristMetaLength,
    rimClearanceMm: 18,
    splitEdges,
    slots: strapSlotSpecs(),
    thumb
  };
  return derivedCache.ventExclusion;
}

function isNearVentExclusion(theta, yMm) {
  const data = ventExclusionData();
  if (yMm < data.yMin + data.rimClearanceMm || yMm > data.yMax - data.rimClearanceMm) {
    return true;
  }

  if (data.splitEdges.some((edge) => angleDistance(theta, edge) < 0.16)) {
    return true;
  }

  if (data.slots.some((slot) =>
    angleDistance(theta, slot.theta) < slot.halfTheta + 0.075 &&
    Math.abs(yMm - slot.y) < slot.halfHeight + 8
  )) {
    return true;
  }

  if (data.thumb) {
    if (yMm >= data.thumb.minY && yMm <= data.thumb.maxY && theta >= data.thumb.minTheta && theta <= data.thumb.maxTheta) {
      return true;
    }
  }

  return false;
}

function isInsideHex(dxMm, dyMm, radiusMm) {
  const x = Math.abs(dxMm);
  const y = Math.abs(dyMm);
  const apothem = Math.sqrt(3) * radiusMm * 0.5;
  return x <= radiusMm && y <= apothem && Math.sqrt(3) * x + y <= Math.sqrt(3) * radiusMm;
}

function isVentHole(theta, yMm) {
  if (state.vents <= 0 || isHomePreview || isNearVentExclusion(theta, yMm)) {
    return false;
  }

  const spacingByLevel = [0, 24, 20, 17];
  const radiusByLevel = [0, 3.2, 3.8, 4.3];
  const spacingMm = spacingByLevel[state.vents];
  const radiusMm = radiusByLevel[state.vents];
  const rowSpacingMm = spacingMm * Math.sqrt(3) * 0.5;
  const section = sectionAt(yMm, 0);
  const averageRadiusMm = ((section.rx + section.rz) / 2) / SCALE;
  const xMm = theta * averageRadiusMm;
  const yOriginMm = -state.foreWristLength + 26;
  const row = Math.round((yMm - yOriginMm) / rowSpacingMm);

  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    const candidateRow = row + rowOffset;
    const centerY = yOriginMm + candidateRow * rowSpacingMm;
    const xOffset = candidateRow % 2 === 0 ? 0 : spacingMm * 0.5;
    const col = Math.round((xMm - xOffset) / spacingMm);

    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      const centerX = xOffset + (col + colOffset) * spacingMm;
      if (isInsideHex(xMm - centerX, yMm - centerY, radiusMm)) {
        return true;
      }
    }
  }

  return false;
}

function isCutout(theta, yMm) {
  if (isStrapSlot(theta, yMm)) {
    return true;
  }

  if (isThumbReliefCutout(theta, yMm)) {
    return true;
  }

  if (isVentHole(theta, yMm)) {
    return true;
  }

  return false;
}

function isThumbSplitClearance(theta, yMm) {
  if (!state.thumbRelief) {
    return false;
  }

  const { side, sideSplit, topY, bottomY } = thumbReliefProfile();
  const thetaTolerance = 0.055;
  return Math.abs(theta - sideSplit) < thetaTolerance &&
    yMm <= topY + state.thick * 1.5 &&
    yMm >= bottomY - state.thick * 1.5;
}

function splitThetaHalf() {
  const splitGapMm = clamp(state.metacarpalWidth * 0.18, 16, 28);
  const splitRadius = (sectionAt((state.wristMetaLength - state.foreWristLength) / 2, 0).rx + sectionAt((state.wristMetaLength - state.foreWristLength) / 2, 0).rz) / (2 * SCALE);
  return clamp(splitGapMm / Math.max(splitRadius, 1), 0.18, 0.34);
}

function buildBraceMesh(thetaMin, thetaMax, resolution = meshResolution.preview) {
  const { thetaSegments, ySegments } = resolution;
  const yMin = -state.foreWristLength;
  const yMax = state.wristMetaLength;
  const positions = [];
  const normals = [];
  const indices = [];
  const outerIndex = [];
  const innerIndex = [];

  for (let iy = 0; iy <= ySegments; iy += 1) {
    const yMm = yMin + (iy / ySegments) * (yMax - yMin);
    outerIndex[iy] = [];
    innerIndex[iy] = [];

    for (let it = 0; it <= thetaSegments; it += 1) {
      const theta = thetaMin + (it / thetaSegments) * (thetaMax - thetaMin);
      const outerInset = exposedEdgeInset(theta, yMm, thetaMin, thetaMax, yMin, yMax);
      const innerInset = state.thick - outerInset;
      const outer = pointOnSmoothedBrace(theta, yMm, outerInset);
      const inner = pointOnSmoothedBrace(theta, yMm, innerInset);
      const normal = new THREE.Vector3(Math.sin(theta), 0, Math.cos(theta)).normalize();

      outerIndex[iy][it] = positions.length / 3;
      positions.push(outer.x, outer.y, outer.z);
      normals.push(normal.x, normal.y, normal.z);

      innerIndex[iy][it] = positions.length / 3;
      positions.push(inner.x, inner.y, inner.z);
      normals.push(-normal.x, -normal.y, -normal.z);
    }
  }

  const cutoutGrid = [];
  const strapGrid = [];
  const thumbGrid = [];
  for (let iy = 0; iy < ySegments; iy += 1) {
    const yA = yMin + (iy / ySegments) * (yMax - yMin);
    const yB = yMin + ((iy + 1) / ySegments) * (yMax - yMin);
    const yMid = (yA + yB) / 2;
    const cutoutRow = new Uint8Array(thetaSegments);
    const strapRow = new Uint8Array(thetaSegments);
    const thumbRow = new Uint8Array(thetaSegments);

    for (let it = 0; it < thetaSegments; it += 1) {
      const thetaA = thetaMin + (it / thetaSegments) * (thetaMax - thetaMin);
      const thetaB = thetaMin + ((it + 1) / thetaSegments) * (thetaMax - thetaMin);
      const thetaMid = (thetaA + thetaB) / 2;
      const strap = isStrapSlot(thetaMid, yMid);
      const thumb = isThumbReliefCutout(thetaMid, yMid);
      const vent = isVentHole(thetaMid, yMid);
      strapRow[it] = strap ? 1 : 0;
      thumbRow[it] = thumb ? 1 : 0;
      cutoutRow[it] = strap || thumb || vent ? 1 : 0;
    }

    cutoutGrid[iy] = cutoutRow;
    strapGrid[iy] = strapRow;
    thumbGrid[iy] = thumbRow;
  }

  for (let iy = 0; iy < ySegments; iy += 1) {
    const yA = yMin + (iy / ySegments) * (yMax - yMin);
    const yB = yMin + ((iy + 1) / ySegments) * (yMax - yMin);
    const yMid = (yA + yB) / 2;

    for (let it = 0; it < thetaSegments; it += 1) {
      const thetaA = thetaMin + (it / thetaSegments) * (thetaMax - thetaMin);
      const thetaB = thetaMin + ((it + 1) / thetaSegments) * (thetaMax - thetaMin);
      const thetaMid = (thetaA + thetaB) / 2;
      const isCurrentCutout = cutoutGrid[iy][it] === 1;
      const isCurrentStrap = strapGrid[iy][it] === 1;
      const isCurrentThumb = thumbGrid[iy][it] === 1;

      if (!isCurrentCutout) {
        const a = outerIndex[iy][it];
        const b = outerIndex[iy][it + 1];
        const c = outerIndex[iy + 1][it + 1];
        const d = outerIndex[iy + 1][it];
        const ai = innerIndex[iy][it];
        const bi = innerIndex[iy][it + 1];
        const ci = innerIndex[iy + 1][it + 1];
        const di = innerIndex[iy + 1][it];
        indices.push(a, d, b, b, d, c);
        indices.push(ai, bi, di, bi, ci, di);
      }

      const leftOpen = isCurrentCutout && (it === 0 || cutoutGrid[iy][it - 1] === 0);
      const rightOpen = isCurrentCutout && (it === thetaSegments - 1 || cutoutGrid[iy][it + 1] === 0);
      const addCutoutThetaCap = (itEdge) => {
        const o1 = outerIndex[iy][itEdge];
        const o2 = outerIndex[iy + 1][itEdge];
        const i1 = innerIndex[iy][itEdge];
        const i2 = innerIndex[iy + 1][itEdge];
        indices.push(o1, i1, o2, i1, i2, o2);
      };

      if (leftOpen) {
        const thetaEdge = thetaMin + (it / thetaSegments) * (thetaMax - thetaMin);
        if (!isCurrentThumb || angleDistance(thetaEdge, thumbReliefProfile().sideSplit) >= 0.08) {
          addCutoutThetaCap(it);
        }
      }
      if (rightOpen) {
        const thetaEdge = thetaMin + ((it + 1) / thetaSegments) * (thetaMax - thetaMin);
        if (!isCurrentThumb || angleDistance(thetaEdge, thumbReliefProfile().sideSplit) >= 0.08) {
          addCutoutThetaCap(it + 1);
        }
      }

      if (isCurrentCutout) {
        const bottomOpen = iy === 0 || cutoutGrid[iy - 1][it] === 0;
        const topOpen = iy === ySegments - 1 || cutoutGrid[iy + 1][it] === 0;
        const addCutoutYCap = (iyEdge) => {
          const o1 = outerIndex[iyEdge][it];
          const o2 = outerIndex[iyEdge][it + 1];
          const i1 = innerIndex[iyEdge][it];
          const i2 = innerIndex[iyEdge][it + 1];
          indices.push(o1, o2, i1, o2, i2, i1);
        };

        if (bottomOpen) {
          addCutoutYCap(iy);
        }
        if (topOpen) {
          addCutoutYCap(iy + 1);
        }
      }
    }
  }

  for (let it = 0; it < thetaSegments; it += 1) {
    const addCap = (iy) => {
      const a = outerIndex[iy][it];
      const b = outerIndex[iy][it + 1];
      const c = innerIndex[iy][it + 1];
      const d = innerIndex[iy][it];
      indices.push(a, b, d, b, c, d);
    };
    addCap(0);
    addCap(ySegments);
  }

  for (let iy = 0; iy < ySegments; iy += 1) {
    const yA = yMin + (iy / ySegments) * (yMax - yMin);
    const yB = yMin + ((iy + 1) / ySegments) * (yMax - yMin);
    const yMid = (yA + yB) / 2;
    const addSeam = (it) => {
      const theta = thetaMin + (it / thetaSegments) * (thetaMax - thetaMin);
      const cellIndex = it === 0 ? 0 : thetaSegments - 1;
      if (cutoutGrid[iy][cellIndex] === 1) {
        return;
      }
      if (isThumbSplitClearance(theta, yMid)) {
        return;
      }
      const a = outerIndex[iy][it];
      const b = outerIndex[iy + 1][it];
      const c = innerIndex[iy + 1][it];
      const d = innerIndex[iy][it];
      indices.push(a, b, d, b, c, d);
    };
    addSeam(0);
    addSeam(thetaSegments);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addCapsule(group, radius, length, position, rotation, material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 16, 32), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addEllipsoid(group, position, scale, material) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.scale.set(scale.x, scale.y, scale.z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
  return mesh;
}

function addBox(group, width, height, depth, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function signedTriangleVolume(a, b, c) {
  return a.dot(b.cross(c)) / 6;
}

function meshVolumeMm3(mesh) {
  const geometry = mesh.geometry;
  const position = geometry.attributes.position;
  const index = geometry.index;
  const matrix = mesh.matrixWorld;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;

  const readVertex = (vertexIndex, target) => {
    target.fromBufferAttribute(position, vertexIndex).applyMatrix4(matrix);
  };

  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      readVertex(index.getX(i), a);
      readVertex(index.getX(i + 1), b);
      readVertex(index.getX(i + 2), c);
      volume += signedTriangleVolume(a, b, c);
    }
  } else {
    for (let i = 0; i < position.count; i += 3) {
      readVertex(i, a);
      readVertex(i + 1, b);
      readVertex(i + 2, c);
      volume += signedTriangleVolume(a, b, c);
    }
  }

  return Math.abs(volume) / (SCALE ** 3);
}

function estimatePrint() {
  modelGroup.updateMatrixWorld(true);
  let volumeMm3 = 0;

  modelGroup.traverse((object) => {
    if (object.isMesh && object.material === materials.shell) {
      volumeMm3 += meshVolumeMm3(object);
    }
  });

  const baselineVolumeMm3 = 56000;
  const scale = clamp(volumeMm3 / baselineVolumeMm3, 0.86, 1.14);
  const grams = 70 * scale;
  const hours = 3.5 * scale;

  return {
    volumeMm3,
    grams,
    hours
  };
}

function addHandGhost() {
  const group = new THREE.Group();
  group.name = "ghost-hand-preview";
  modelGroup.add(group);

  const side = state.hand === "left" ? -1 : 1;
  const inset = state.thick + 2;
  const wrist = sectionAt(0, inset);
  const palm = sectionAt(state.wristMetaLength * 0.68, inset);
  const lower = sectionAt(-state.foreWristLength * 0.55, inset);
  const palmY = state.wristMetaLength * SCALE * 0.52;
  const wristY = -state.foreWristLength * SCALE * 0.26;
  const lowerY = -state.foreWristLength * SCALE * 0.66;
  const topY = state.wristMetaLength * SCALE;
  const skinZ = -Math.min(wrist.rz, palm.rz) * 0.12;

  addEllipsoid(group, { x: 0, y: palmY, z: skinZ }, {
    x: Math.max(0.45, palm.rx * 0.72),
    y: Math.max(1.05, state.wristMetaLength * SCALE * 0.46),
    z: Math.max(0.22, palm.rz * 0.56)
  }, materials.skin);

  addEllipsoid(group, { x: 0, y: wristY, z: skinZ }, {
    x: Math.max(0.36, wrist.rx * 0.62),
    y: Math.max(1.2, state.foreWristLength * SCALE * 0.36),
    z: Math.max(0.24, wrist.rz * 0.56)
  }, materials.skin);

  addEllipsoid(group, { x: 0, y: lowerY, z: skinZ }, {
    x: Math.max(0.4, lower.rx * 0.58),
    y: Math.max(0.8, state.foreWristLength * SCALE * 0.25),
    z: Math.max(0.24, lower.rz * 0.52)
  }, materials.skin);

  const fingerBaseY = topY + 0.28;
  const fingerZ = skinZ + Math.max(0.02, palm.rz * 0.08);
  const fingerSpacing = state.metacarpalWidth * SCALE * 0.145;
  const fingerRadius = clamp(state.metacarpalWidth * SCALE * 0.035, 0.13, 0.22);
  const fingers = [
    { x: -1.45 * fingerSpacing, length: 1.55, radius: fingerRadius * 0.86 },
    { x: -0.48 * fingerSpacing, length: 1.92, radius: fingerRadius },
    { x: 0.48 * fingerSpacing, length: 1.8, radius: fingerRadius * 0.96 },
    { x: 1.36 * fingerSpacing, length: 1.42, radius: fingerRadius * 0.78 }
  ];

  fingers.forEach((finger) => {
    addCapsule(
      group,
      finger.radius,
      finger.length,
      { x: finger.x, y: fingerBaseY + finger.length * 0.5, z: fingerZ },
      { x: 0, y: 0, z: 0 },
      materials.skin
    );
  });

  const { bottomY, topY: thumbTopY, palmarStart, sideSplit } = thumbReliefProfile();
  const thumbMidY = ((bottomY + thumbTopY) * 0.5) * SCALE;
  const thumbLength = clamp(state.thumbWidth * SCALE * 0.9, 0.95, 1.75);
  const thumbRadius = clamp(state.thumbWidth * SCALE * 0.085, 0.16, 0.27);
  const thumbTheta = (palmarStart + sideSplit) * 0.5;
  const thumbBase = pointOnBrace(thumbTheta, (bottomY + thumbTopY) * 0.5, inset + 3);
  const thumbAngle = side * -0.95;

  addCapsule(
    group,
    thumbRadius,
    thumbLength,
    {
      x: thumbBase.x + side * thumbLength * 0.32,
      y: thumbMidY + thumbLength * 0.12,
      z: thumbBase.z + 0.08
    },
    { x: 0.2, y: 0, z: thumbAngle },
    materials.skin
  );
}

function buildModel() {
  clearModel();
  if (!isHomePreview) {
    addHandGhost();
  }
  buildShellMeshes(meshResolution.preview).forEach((shell) => {
    modelGroup.add(shell);
  });
}

function buildShellMeshes(resolution) {
  const splitHalf = splitThetaHalf();
  const panels = [
    [-Math.PI / 2 + splitHalf, Math.PI / 2 - splitHalf],
    [Math.PI / 2 + splitHalf, Math.PI * 1.5 - splitHalf]
  ];

  return panels.map(([thetaMin, thetaMax]) => {
    const shell = new THREE.Mesh(buildBraceMesh(thetaMin, thetaMax, resolution), materials.shell);
    shell.castShadow = true;
    shell.receiveShadow = true;
    return shell;
  });
}

function formatHours(hours) {
  const totalMinutes = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h} hr ${m.toString().padStart(2, "0")} min` : `${m} min`;
}

async function exportStl() {
  const exportGroup = buildExportGroup();
  const { STLExporter } = await import("three/addons/exporters/STLExporter.js");
  const exporter = new STLExporter();
  const stl = exporter.parse(exportGroup, { binary: false });
  downloadBlob(stl, `brace-${state.hand}-thumb-${Math.round(state.thumbWidth)}mm.stl`, "model/stl");
}

async function export3mf() {
  const exportGroup = buildExportGroup();
  const files = build3mfFiles(exportGroup);
  const archive = createZip(files);
  downloadBlob(archive, `brace-${state.hand}-thumb-${Math.round(state.thumbWidth)}mm.3mf`, "model/3mf");
}

function buildExportGroup() {
  const exportGroup = new THREE.Group();

  buildShellMeshes(meshResolution.export).forEach((mesh) => {
    mesh.scale.multiplyScalar(1 / SCALE);
    exportGroup.add(mesh);
  });

  orientExportGroupForPrinting(exportGroup);
  lowerExportGroupSlightlyIntoBed(exportGroup);
  exportGroup.updateMatrixWorld(true);

  return exportGroup;
}

function downloadBlob(data, filename, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function orientExportGroupForPrinting(group) {
  group.rotation.x = Math.PI / 2;
  group.updateMatrixWorld(true);
}

function lowerExportGroupSlightlyIntoBed(group) {
  const bedIntersectionMm = 0.1;
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  group.position.z -= bounds.min.z + bedIntersectionMm;
}

function build3mfFiles(group) {
  const modelXml = build3mfModelXml(group);
  return [
    {
      name: "[Content_Types].xml",
      data: stringToBytes(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`)
    },
    {
      name: "_rels/.rels",
      data: stringToBytes(`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`)
    },
    {
      name: "3D/3dmodel.model",
      data: stringToBytes(modelXml)
    }
  ];
}

function build3mfModelXml(group) {
  group.updateMatrixWorld(true);
  let objectId = 1;
  const resources = [];
  const buildItems = [];

  group.children.forEach((mesh) => {
    if (!mesh.isMesh) {
      return;
    }

    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const index = geometry.index;
    const vertices = [];
    const triangles = [];
    const matrix = mesh.matrixWorld;
    const point = new THREE.Vector3();

    for (let i = 0; i < position.count; i += 1) {
      point.fromBufferAttribute(position, i).applyMatrix4(matrix);
      vertices.push(`<vertex x="${format3mfNumber(point.x)}" y="${format3mfNumber(point.y)}" z="${format3mfNumber(point.z)}"/>`);
    }

    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        triangles.push(`<triangle v1="${index.getX(i)}" v2="${index.getX(i + 1)}" v3="${index.getX(i + 2)}"/>`);
      }
    } else {
      for (let i = 0; i < position.count; i += 3) {
        triangles.push(`<triangle v1="${i}" v2="${i + 1}" v3="${i + 2}"/>`);
      }
    }

    resources.push(`<object id="${objectId}" type="model">
  <mesh>
    <vertices>
      ${vertices.join("\n      ")}
    </vertices>
    <triangles>
      ${triangles.join("\n      ")}
    </triangles>
  </mesh>
</object>`);
    buildItems.push(`<item objectid="${objectId}"/>`);
    objectId += 1;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <resources>
    ${resources.join("\n    ")}
  </resources>
  <build>
    ${buildItems.join("\n    ")}
  </build>
</model>`;
}

function format3mfNumber(value) {
  return Number(value.toFixed(5)).toString();
}

function stringToBytes(value) {
  return new TextEncoder().encode(value);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const data = file.data;
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, data.length, true);
    view.setUint32(22, data.length, true);
    view.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);

    chunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralOffset = offset;
  centralDirectory.forEach((entry) => {
    chunks.push(entry);
    offset += entry.length;
  });

  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, offset - centralOffset, true);
  endView.setUint32(16, centralOffset, true);
  chunks.push(endRecord);

  return new Blob(chunks, { type: "model/3mf" });
}

function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc ^= data[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function renderSpecs(values, printEstimate) {
  const filament = selectedFilamentProfile();
  const adjustedGrams = printEstimate.grams * (filament.density / slicer.filamentDensity);
  const materialCost = (adjustedGrams / 1000) * filament.pricePerKg;

  output.printTime.textContent = `~${formatHours(printEstimate.hours)}`;
  if (output.filamentUse) {
    output.filamentUse.textContent = `~${adjustedGrams.toFixed(0)} g`;
  }
  if (output.filamentCost) {
    output.filamentCost.textContent = `~$${materialCost.toFixed(2)}`;
  }
  if (output.filamentPrice) {
    output.filamentPrice.textContent = `$${filament.pricePerKg.toFixed(2)}/kg`;
  }
  if (output.ventLabel) {
    output.ventLabel.textContent = ventilationLabel();
  }
  if (output.shellLength) {
    output.shellLength.textContent = `${values.shellLength.toFixed(0)} mm`;
  }
  if (output.wristOpening) {
    output.wristOpening.textContent = `${state.wristCirc.toFixed(0)} mm`;
  }
  if (output.palmOpening) {
    output.palmOpening.textContent = `${values.topOpening.toFixed(0)} mm`;
  }
  if (output.thickness) {
    output.thickness.textContent = `${state.thick.toFixed(1)} mm`;
  }
  if (output.straps) {
    output.straps.textContent = values.straps;
  }
}

function setCamera(mode = state.camera) {
  state.camera = mode;
  const targetY = (state.wristMetaLength - state.foreWristLength) * SCALE * 0.5;
  if (isHomePreview) {
    camera.position.set(5.5, -7.5, 24);
  } else if (mode === "top") {
    camera.position.set(0, targetY, 23);
  } else if (mode === "side") {
    camera.position.set(15, -12, 8);
  } else {
    camera.position.set(8, -12, 19);
  }
  controls.target.set(0, targetY, 0);
  controls.update();
}

function resizeRenderer() {
  const rect = output.viewport.getBoundingClientRect();
  renderer.setSize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)), false);
  camera.aspect = rect.width / Math.max(1, rect.height);
  camera.updateProjectionMatrix();
}

function updateScrollSpin() {
  if (!isHomePreview) {
    return;
  }

  const rect = output.viewport.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  const travel = viewportHeight + rect.height;
  const progress = clamp((viewportHeight - rect.top) / travel, 0, 1);

  modelGroup.rotation.y = progress * Math.PI * 2.2;
  modelGroup.rotation.x = -0.1 + Math.sin(progress * Math.PI) * 0.16;
  modelGroup.rotation.z = -0.04 + progress * 0.08;
}

function render() {
  readState();
  resetDerivedCache();
  const renderKey = geometryStateKey();
  if (renderKey === lastRenderKey) {
    if (lastSpecValues && lastPrintEstimate) {
      renderSpecs(lastSpecValues, lastPrintEstimate);
    }
    return;
  }
  lastRenderKey = renderKey;
  const values = spec();
  buildModel();
  const printEstimate = estimatePrint();
  lastSpecValues = values;
  lastPrintEstimate = printEstimate;
  renderSpecs(values, printEstimate);
}

function scheduleRender() {
  window.clearTimeout(renderTimer);
  renderTimer = window.setTimeout(render, 220);
}

function animate() {
  updateScrollSpin();
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

Object.values(inputs).filter(Boolean).forEach((input) => {
  input.addEventListener("input", scheduleRender);
  input.addEventListener("change", () => {
    window.clearTimeout(renderTimer);
    render();
  });
});

document.querySelectorAll("[data-hand]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-hand]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.hand = button.dataset.hand;
    render();
  });
});

document.querySelectorAll("[data-camera]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-camera]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    setCamera(button.dataset.camera);
  });
});

const resetButton = document.querySelector("#reset");
if (resetButton) {
  resetButton.addEventListener("click", () => {
  Object.assign(state, defaults);
  Object.entries(inputs).filter(([, input]) => Boolean(input)).forEach(([key, input]) => {
    if (input.type === "checkbox") {
      input.checked = defaults[key];
    } else {
      input.value = defaults[key];
    }
  });
  document.querySelectorAll("[data-hand]").forEach((item) => item.classList.toggle("active", item.dataset.hand === defaults.hand));
  document.querySelectorAll("[data-camera]").forEach((item) => item.classList.toggle("active", item.dataset.camera === defaults.camera));
  render();
  setCamera(defaults.camera);
  });
}

if (output.exportStl) {
  output.exportStl.addEventListener("click", exportStl);
}

if (output.export3mf) {
  output.export3mf.addEventListener("click", export3mf);
}

window.addEventListener("resize", resizeRenderer);
window.addEventListener("scroll", updateScrollSpin, { passive: true });

resizeRenderer();
try {
  render();
} catch (error) {
  console.error("Initial render failed", error);
}
setCamera(defaults.camera);
animate();
