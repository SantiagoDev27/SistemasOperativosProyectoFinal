const express = require('express');
const client = require('prom-client');
const os = require('os');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const INSTANCE_ID = process.env.INSTANCE_ID || 'Instancia Local';
const HOSTNAME = os.hostname();

// Carga la plantilla HTML una sola vez en memoria e inyecta los datos del contenedor
const htmlTemplate = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const renderedHtml = htmlTemplate
    .replace('{{INSTANCE_ID}}', INSTANCE_ID)
    .replace('{{HOSTNAME}}', HOSTNAME);

// --- Configuración de métricas de Prometheus ---
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total de solicitudes HTTP recibidas',
    labelNames: ['method', 'route', 'status_code', 'instance'],
    registers: [register],
});

const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duración de las solicitudes HTTP en segundos',
    labelNames: ['method', 'route', 'status_code', 'instance'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
});

// Middleware para medir tasa de solicitudes y latencia
app.use((req, res, next) => {
    if (req.path === '/metrics') return next();

    const endTimer = httpRequestDuration.startTimer();
    res.on('finish', () => {
        const labels = {
            method: req.method,
            route: req.path,
            status_code: res.statusCode,
            instance: INSTANCE_ID,
        };
        httpRequestsTotal.inc(labels);
        endTimer(labels);
    });
    next();
});

// --- Rutas ---
app.get('/', (req, res) => {
    res.send(renderedHtml);
});

// Simula trabajo pesado: /slow?ms=500 tarda 500 ms en responder
app.get('/slow', async (req, res) => {
    const parsedMs = parseInt(req.query.ms, 10);
    const rawMs = Number.isNaN(parsedMs) || parsedMs < 0 ? 1000 : parsedMs;
    const ms = Math.min(rawMs, 30000);

    await new Promise((resolve) => setTimeout(resolve, ms));

    res.json({
        server: INSTANCE_ID,
        contenedor: HOSTNAME,
        esperó_ms: ms,
    });
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(PORT, () => {
    console.log(`${INSTANCE_ID} (${HOSTNAME}) escuchando en el puerto ${PORT}`);
});