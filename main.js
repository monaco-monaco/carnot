import * as THREE from "three";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";



const scene = new THREE.Scene();



// ---------------- CAMERA & RENDERER ----------------

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

camera.position.set(10, 4, 0);

camera.lookAt(0, 4, 0);



const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);



scene.add(new THREE.AmbientLight(0xffffff, 0.6));

const light = new THREE.DirectionalLight(0xffffff, 2);

light.position.set(10, 15, 10);

scene.add(light);



// ---------------- UI ELEMENTS ----------------

const vSlider = document.getElementById("vSlider"), vVal = document.getElementById("vVal");

const nSlider = document.getElementById("nSlider"), nVal = document.getElementById("nVal");

const tSlider = document.getElementById("tSlider"), tVal = document.getElementById("tVal");

const pSlider = document.getElementById("pSlider"), pVal = document.getElementById("pVal");



const TOP_Y = 10;

const cylinderRadius = 0.82;

const PISTON_COLLISION_OFFSET = 1.2;

const crankRadius = 3;

const crankCenterY = -3;



let n = +nSlider.value, T = +tSlider.value, V = +vSlider.value;



const loader = new GLTFLoader();

let piston = null, rod = null, crankshaft = null;



loader.load("models/engine.glb", (gltf) => {

  scene.add(gltf.scene);

  piston = gltf.scene.getObjectByName("piston");

  rod = gltf.scene.getObjectByName("rod");

  crankshaft = gltf.scene.getObjectByName("crankshaft");

  updateMechanism();

});



let particles = [];

const geo = new THREE.SphereGeometry(0.08, 8, 8);

const mat = new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x113355 });



function rebuildParticles() {

  const diff = n - particles.length;

  if (diff > 0) {

    for (let i = 0; i < diff; i++) {

      const p = new THREE.Mesh(geo, mat);

      p.position.set((Math.random() - 0.5) * 1.2, 8, (Math.random() - 0.5) * 1.2);

      p.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01);

      particles.push(p); scene.add(p);

    }

  } else if (diff < 0) {

    for (let i = 0; i < -diff; i++) scene.remove(particles.pop());

  }

}

rebuildParticles();



function updateMechanism() {

  if (!piston || !rod || !crankshaft) return;

  const pistonY = TOP_Y - V;

  piston.position.y = pistonY;



  const H = pistonY - crankCenterY;

  let cosTheta = (crankRadius * crankRadius + H * H - 64) / (2 * crankRadius * H);

  cosTheta = Math.max(-1, Math.min(1, cosTheta));

  const angle = Math.acos(cosTheta);



  crankshaft.rotation.x = angle;

  const crankPin = new THREE.Vector3(0, crankCenterY + Math.cos(angle) * crankRadius, Math.sin(angle) * crankRadius);

  rod.position.copy(crankPin);

  const dir = new THREE.Vector3().subVectors(piston.position, crankPin);

  rod.rotation.x = Math.atan2(dir.z, dir.y);

}



function updateUI() {

  nVal.innerText = n;

  tVal.innerText = T.toFixed(1);

  vVal.innerText = V.toFixed(1);

}



vSlider.oninput = () => { if (!isPlaying) { V = +vSlider.value; updateMechanism(); updateUI(); } };

nSlider.oninput = () => { n = +nSlider.value; rebuildParticles(); updateUI(); };

tSlider.oninput = () => { if (!isPlaying) { T = +tSlider.value; updateUI(); } };

pSlider.oninput = () => { if (isPlaying) return; T = (+pSlider.value * V) / n; tSlider.value = T; updateUI(); };



// ---------------- CANVAS GRAPH & CYCLES ----------------

const canvas = document.getElementById("pvCanvas");

const ctx = canvas.getContext("2d");

const modeSelect = document.getElementById("modeSelect");

const clearBtn = document.getElementById("clearBtn");

const playBtn = document.getElementById("playBtn");

const speedSlider = document.getElementById("speedSlider");



const V_MIN = 1.5, V_MAX = 8.5, P_MIN = 0, P_MAX = 150;

const PAD_L = 35, PAD_B = 25, PAD_T = 10, PAD_R = 10;

const W = canvas.width - PAD_L - PAD_R, H = canvas.height - PAD_T - PAD_B;



let mode = 'free';

let isDrawing = false, isPlaying = false;

let path = [], pathIndex = 0;



let ctrlP1 = { v: 2.5, p: 130 };

let ctrlP2 = { v: 6.5, p: 35 };

let draggedPoint = null;



function toPixels(v, p) {

  return { x: PAD_L + ((v - V_MIN) / (V_MAX - V_MIN)) * W, y: PAD_T + (1 - (p - P_MIN) / (P_MAX - P_MIN)) * H };

}



function fromPixels(x, y) {

  return { v: V_MIN + ((x - PAD_L) / W) * (V_MAX - V_MIN), p: P_MIN + (1 - (y - PAD_T) / H) * (P_MAX - P_MIN) };

}



function drawGrid() {

  ctx.clearRect(0, 0, canvas.width, canvas.height);



  ctx.font = "bold 13px sans-serif";

  ctx.fillStyle = "#222";

  ctx.fillText("P", 8, 30);

  ctx.fillText("V", canvas.width - 40, canvas.height - 7);



  ctx.font = "10px sans-serif";

  ctx.fillStyle = "#666";



  for (let i = 0; i <= 4; i++) {

    const x = PAD_L + (i / 4) * W;

    ctx.strokeStyle = "#eee"; ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, canvas.height - PAD_B); ctx.stroke();

    ctx.fillText((V_MIN + (i / 4) * (V_MAX - V_MIN)).toFixed(1), x - 8, canvas.height - 10);

  }

  for (let i = 0; i <= 5; i++) {

    const y = PAD_T + H - (i / 5) * H;

    ctx.strokeStyle = "#eee"; ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(canvas.width - PAD_R, y); ctx.stroke();

    ctx.fillText((P_MIN + (i / 5) * (P_MAX - P_MIN)).toFixed(0), 5, y + 4);

  }



  ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5;

  ctx.beginPath();

  ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, canvas.height - PAD_B);

  ctx.lineTo(canvas.width - PAD_R, canvas.height - PAD_B);

  ctx.stroke();

}



function clearCanvas() { drawGrid(); path = []; isPlaying = false; playBtn.innerText = "Запуск"; }



function drawHandle(v, p, label) {

  const { x, y } = toPixels(v, p);

  ctx.fillStyle = "#44aaff"; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "white"; ctx.stroke();



  ctx.fillStyle = "#111";

  ctx.font = "bold 11px sans-serif";

  ctx.fillText(label, x + 8, y - 8);

}



function addCurve(v1, p1, v2, p2, type) {

  const steps = 15;

  const gamma = 1.4;

  for (let i = 0; i <= steps; i++) {

    let v = v1 + (v2 - v1) * (i / steps);

    let p;

    if (type === 'iso') p = (p1 * v1) / v;

    else if (type === 'adiabat') p = (p1 * Math.pow(v1, gamma)) / Math.pow(v, gamma);

    else if (type === 'line') p = p1 + (p2 - p1) * (i / steps);

    path.push({ v, p });

  }

}



// ---------------- ПОЛНОСТЬЮ ПОЧИНЕННЫЙ ЦИКЛ КАРНО ----------------

function drawCycle() {

  drawGrid();

  path = [];



  let v1 = Math.max(2.1, Math.min(7.9, ctrlP1.v));

  let p1 = Math.max(10, Math.min(145, ctrlP1.p));

  let v3 = Math.max(2.1, Math.min(7.9, ctrlP2.v));

  let p3 = Math.max(5, Math.min(140, ctrlP2.p));



  if (v3 - v1 < 0.5) {

    if (draggedPoint === 1) v1 = v3 - 0.5;

    else v3 = v1 + 0.5;

  }



  const gamma = 1.4;



  if (mode === 'carnot') {

    // Честные вычисления точек пересечения изотерм и адиабат

    // Система: p1*v1 = p2*v2 (изотерма) и p2*v2^γ = p3*v3^γ (адиабата)

    // => v2 = (p3*v3^γ / (p1*v1))^(1/(γ-1))

    let v2 = Math.pow((p3 * Math.pow(v3, gamma)) / (p1 * v1), 1 / (gamma - 1));

    let v4 = Math.pow((p1 * Math.pow(v1, gamma)) / (p3 * v3), 1 / (gamma - 1));



    // Если v2 или v4 выходят за [v1, v3] — цикл физически невозможен

    // Корректируем p3, а не обрезаем v2/v4

    if (v2 <= v1 + 0.05 || v2 >= v3 - 0.05 || v4 <= v1 + 0.05 || v4 >= v3 - 0.05 || isNaN(v2) || isNaN(v4)) {

      // p3 должно быть между адиабатой и изотермой от точки 1

      const p3_min = p1 * Math.pow(v1 / v3, gamma) + 1;

      const p3_max = p1 * v1 / v3 - 1;

      if (p3_min < p3_max) {

        p3 = Math.max(p3_min, Math.min(p3_max, p3));

        ctrlP2.p = p3;

      }

      // Пересчитываем

      v2 = Math.pow((p3 * Math.pow(v3, gamma)) / (p1 * v1), 1 / (gamma - 1));

      v4 = Math.pow((p1 * Math.pow(v1, gamma)) / (p3 * v3), 1 / (gamma - 1));

    }



    // Финальная страховка от NaN

    if (isNaN(v2) || isNaN(v4) || v2 <= v1 || v2 >= v3 || v4 <= v1 || v4 >= v3) {

      v2 = v1 + (v3 - v1) * 0.3;

      v4 = v1 + (v3 - v1) * 0.7;

    }



    const p2 = p1 * v1 / v2;

    const p4 = p3 * v3 / v4;



    addCurve(v1, p1, v2, p2, 'iso');       // 1→2 изотермическое расширение

    addCurve(v2, p2, v3, p3, 'adiabat');   // 2→3 адиабатическое расширение

    addCurve(v3, p3, v4, p4, 'iso');       // 3→4 изотермическое сжатие

    addCurve(v4, p4, v1, p1, 'adiabat');   // 4→1 адиабатическое сжатие

  }

  else if (mode === 'diesel') {

    const p4 = p3;

    const p1d = p1 * Math.pow(v1 / v3, gamma);

    const v3d = v3 * Math.pow(p3 / p1, 1 / gamma);



    addCurve(v3, p1d, v1, p1, 'adiabat');

    addCurve(v1, p1, v3d, p1, 'line');

    addCurve(v3d, p1, v3, p4, 'adiabat');

    addCurve(v3, p4, v3, p1d, 'line');

  }

  else if (mode === 'otto') {

    const p1o = p3;

    const p2 = p3 * Math.pow(v3 / v1, gamma);

    const p3o = p1;

    const p4o = p1 * Math.pow(v1 / v3, gamma);



    addCurve(v3, p1o, v1, p2, 'adiabat');

    addCurve(v1, p2, v1, p3o, 'line');

    addCurve(v1, p3o, v3, p4o, 'adiabat');

    addCurve(v3, p4o, v3, p1o, 'line');

  }



  ctx.beginPath();

  path.forEach((pt, idx) => {

    const { x, y } = toPixels(pt.v, pt.p);

    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);

  });

  ctx.closePath();

  ctx.strokeStyle = "red"; ctx.lineWidth = 2; ctx.stroke();



  drawHandle(v1, p1, "Min");

  drawHandle(v3, p3, "Max");

}



modeSelect.onchange = () => {

  mode = modeSelect.value;

  clearCanvas();

  if (mode !== 'free') {

    draggedPoint = null;

    drawCycle();

  }

};



canvas.addEventListener("mousedown", (e) => {

  if (isPlaying) return;

  const rect = canvas.getBoundingClientRect();

  const x = e.clientX - rect.left, y = e.clientY - rect.top;



  if (mode !== 'free') {

    const p1Px = toPixels(ctrlP1.v, ctrlP1.p);

    const p2Px = toPixels(ctrlP2.v, ctrlP2.p);

    if (Math.hypot(x - p1Px.x, y - p1Px.y) < 15) draggedPoint = 1;

    else if (Math.hypot(x - p2Px.x, y - p2Px.y) < 15) draggedPoint = 2;

  } else {

    isDrawing = true; path = []; clearCanvas(); ctx.beginPath();

  }

});



canvas.addEventListener("mousemove", (e) => {

  if (isPlaying) return;

  const rect = canvas.getBoundingClientRect();

  const x = e.clientX - rect.left, y = e.clientY - rect.top;



  if (mode !== 'free' && draggedPoint) {

    let { v, p } = fromPixels(x, y);

    if (draggedPoint === 1) ctrlP1 = { v: Math.max(2, Math.min(v, ctrlP2.v - 0.5)), p };

    else ctrlP2 = { v: Math.max(ctrlP1.v + 0.5, Math.min(v, 8)), p };

    drawCycle();

  } else if (mode === 'free' && isDrawing) {

    if (x >= PAD_L && x <= canvas.width - PAD_R && y >= PAD_T && y <= canvas.height - PAD_B) {

      ctx.lineTo(x, y); ctx.strokeStyle = "red"; ctx.lineWidth = 2; ctx.stroke();

      const { v, p } = fromPixels(x, y);

      path.push({ v, p: Math.max(0.1, p) });

    }

  }

});



canvas.addEventListener("mouseup", () => {

  isDrawing = false; draggedPoint = null;

  if (mode === 'free' && path.length > 5) {

    ctx.lineTo(toPixels(path[0].v, path[0].p).x, toPixels(path[0].v, path[0].p).y); ctx.stroke();

  }

});



clearBtn.onclick = () => { clearCanvas(); if (mode !== 'free') drawCycle(); };



playBtn.onclick = () => {

  if (path.length === 0) return alert("График пуст!");

  isPlaying = !isPlaying;

  playBtn.innerText = isPlaying ? "Стоп" : "Запуск";

  pathIndex = 0;

};



clearCanvas();

updateUI();

const clock = new THREE.Clock(); 

// ---------------- АНИМАЦИЯ СО СРЕДНЕЙ СКОРОСТЬЮ ----------------

function animate() {

  requestAnimationFrame(animate);



  if (isPlaying && path.length > 0) {



    const delta = clock.getDelta();



    const speed = +speedSlider.value;



    const pointsPerSecond = 20 + speed * 40;



    pathIndex = (pathIndex + pointsPerSecond * delta) % path.length;



    const idx1 = Math.floor(pathIndex);

    const idx2 = (idx1 + 1) % path.length;



    const t = pathIndex - idx1;



    const p1 = path[idx1];

    const p2 = path[idx2];



    const vInterp = THREE.MathUtils.lerp(p1.v, p2.v, t);

    const pInterp = THREE.MathUtils.lerp(p1.p, p2.p, t);



    V = Math.max(2, Math.min(8, vInterp));

    T = (pInterp * V) / n;



    vSlider.value = V;

    tSlider.value = T;



    updateUI();

    updateMechanism();

  }



  const y = piston ? piston.position.y : 8;

  const P = (n * T) / (TOP_Y - y);



  pSlider.value = P; pVal.innerText = P.toFixed(0);



  for (const p of particles) {

    const v = p.userData.v;

    const speed = 0.01 * T;

    v.normalize().multiplyScalar(speed);

    p.position.add(v);



    const dx = p.position.x, dz = p.position.z;

    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > cylinderRadius) {

      const nx = dx / dist, nz = dz / dist;

      const dot = v.x * nx + v.z * nz;

      v.x -= 2 * dot * nx; v.z -= 2 * dot * nz;

      p.position.x = nx * cylinderRadius; p.position.z = nz * cylinderRadius;

    }



    const collisionY = (piston?.position.y ?? 8) + PISTON_COLLISION_OFFSET;

    if (p.position.y < collisionY) { p.position.y = collisionY; v.y *= -1; }

    if (p.position.y > TOP_Y) { p.position.y = TOP_Y; v.y *= -1; }

  }



  renderer.render(scene, camera);

}



animate();



window.addEventListener("resize", () => {

  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

});