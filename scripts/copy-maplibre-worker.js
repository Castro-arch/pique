// O MapLibre GL (site) acha o próprio worker por import.meta.url, que o Metro
// não resolve. Copiamos o worker para public/ e o mapa aponta para ele
// (setWorkerUrl em GameMapSatellite). Roda sozinho depois do npm install.
const fs = require('fs');
const path = require('path');

const from = path.join(__dirname, '..', 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const to = path.join(__dirname, '..', 'public', 'maplibre-gl-worker.mjs');
if (fs.existsSync(from)) fs.copyFileSync(from, to);
