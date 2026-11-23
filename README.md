# Infraestructura Containerizada con Docker, Nginx, Prometheus y Grafana

Proyecto final de la asignatura **Sistemas Operativos** (Universidad Autónoma de Occidente). Implementa una infraestructura multicontenedor con **Nginx** como proxy inverso y balanceador de carga, tres instancias de un backend en **Node.js** (comparativa técnica F-22 Raptor vs. Chengdu J-20) y una pila completa de monitoreo con **Prometheus**, **Nginx Prometheus Exporter**, **cAdvisor** y **Grafana**.

---

## Arquitectura y estructura del proyecto

Todos los servicios se comunican internamente mediante la red Docker personalizada `monitoring-net` (`bridge`) y utilizan volúmenes nombrados (`prometheus_data` y `grafana_data`) para la persistencia de datos.

```text
.
├── backend/
│   ├── Dockerfile          # Imagen ligera basada en node:20-alpine
│   ├── index.html          # Interfaz web comparativa F-22 vs. J-20
│   ├── package.json        # Dependencias (express, prom-client)
│   └── server.js           # Servidor Express con /, /slow y /metrics
├── load-tests/
│   ├── test_home.js        # Prueba de carga k6 para la ruta /
│   └── test_slow.js        # Prueba de carga k6 para /slow?ms=500
├── nginx/
│   └── nginx.conf          # Proxy inverso, balanceo Round-Robin y /stub_status
├── prometheus/
│   └── prometheus.yml      # Configuración de scraping (backends, nginx, cadvisor)
├── docker-compose.yml      # Orquestación de los 8 contenedores, red y volúmenes
└── README.md
```

---

## Requisitos previos

Antes de iniciar, verifica que cuentas con las siguientes herramientas instaladas en tu máquina física:

* **Docker** y **Docker Compose** (v2):
  ```bash
  docker --version
  docker compose version
  ```
* **k6** (para ejecutar las pruebas de carga desde el host):
  * En Windows (PowerShell):
    ```powershell
    winget install k6 --source winget
    ```
  * Verifica la instalación con:
    ```bash
    k6 version
    ```

---

## Cómo levantar la infraestructura

1. Clona este repositorio y entra a la carpeta del proyecto:
   ```bash
   git clone https://github.com/SantiagoDev27/SistemasOperativosProyectoFinal.git
   cd Proyecto-final-docker
   ```

2. Construye las imágenes e inicia todos los contenedores en segundo plano:
   ```bash
   docker compose up -d --build
   ```

3. Verifica que los 8 contenedores (`backend1`, `backend2`, `backend3`, `nginx-proxy`, `nginx-exporter`, `cadvisor`, `prometheus` y `grafana`) estén en estado `Up`:
   ```bash
   docker compose ps
   ```

Para detener los servicios conservando los datos de Prometheus y Grafana:
```bash
docker compose down
```
*(Si deseas eliminar también los volúmenes persistentes, ejecuta `docker compose down -v`).*

---

## URLs de acceso a los servicios

Una vez iniciada la infraestructura, accede desde el navegador de tu máquina física a:

| Servicio | URL de acceso | Notas / Credenciales |
| :--- | :--- | :--- |
| **Aplicación Web (Nginx)** | `http://localhost` | Punto de entrada principal balanceado entre los 3 backends. |
| **Endpoint de latencia controlada** | `http://localhost/slow?ms=500` | Simula un retardo no bloqueante de 500 ms (máx. 30.000 ms). |
| **Prometheus** | `http://localhost:9090` | Verifica los targets en estado `UP` en `http://localhost:9090/targets`. |
| **Grafana** | `http://localhost:3000` | Usuario y contraseña iniciales: `admin` / `admin`. Data Source: `http://prometheus:9090`. |
| **cAdvisor** | `http://localhost:8081` | Métricas de CPU, memoria, red y disco por contenedor. |

---

## Verificación del balanceo de carga

### 1. Desde el navegador
Abre `http://localhost` y recarga la página varias veces. En la barra superior verás cómo alterna secuencialmente el identificador del servidor y el hostname del contenedor (`Backend 1`, `Backend 2`, `Backend 3`), comprobando la distribución *Round-Robin* configurada en Nginx.

### 2. Desde la terminal (opcional)
Puedes enviar múltiples solicitudes al endpoint `/slow` con retardo mínimo para ver la rotación en formato JSON:
```bash
for i in {1..6}; do curl -s "http://localhost/slow?ms=10"; echo ""; done
```

### 3. Prueba de tolerancia a fallos (opcional)
Nginx cuenta con `proxy_connect_timeout 2s` y `proxy_next_upstream`. Para comprobarlo:
```bash
docker stop backend2
```
Al recargar `http://localhost`, el sitio seguirá respondiendo sin errores alternando únicamente entre `Backend 1` y `Backend 3`. Luego vuelve a encenderlo:
```bash
docker start backend2
```

---

## Ejecución de las pruebas de carga (k6)

Con la infraestructura en ejecución, abre Grafana (`http://localhost:3000`) en paralelo para observar el comportamiento de las métricas en tiempo real y ejecuta los tres escenarios desde la raíz del proyecto:

1. **Escenario 1 — Carga normal sobre `/` (50 usuarios virtuales durante 1 minuto):**
   ```bash
   k6 run --vus 50 --duration 1m load-tests/test_home.js
   ```

2. **Escenario 2 — Carga intensa sobre `/` (200 usuarios virtuales durante 2 minutos):**
   ```bash
   k6 run --vus 200 --duration 2m load-tests/test_home.js
   ```

3. **Escenario 3 — Peticiones lentas sobre `/slow?ms=500` (50 usuarios virtuales durante 1 minuto):**
   ```bash
   k6 run --vus 50 --duration 1m load-tests/test_slow.js
   ```

---

## Métricas monitoreadas en Grafana

Tras agregar Prometheus (`http://prometheus:9090`) como *Data Source* en Grafana, el dashboard principal visualiza:

* **Backend:** Tasa de solicitudes por instancia (`http_requests_total`) y latencia p95 (`http_request_duration_seconds_bucket`).
* **Nginx:** Tasa total de solicitudes (`nginx_http_requests_total`) y conexiones activas (`nginx_connections_active`).
* **Contenedores (cAdvisor):** Uso de CPU (`%`), memoria (`MiB`), tráfico de red recibido (`KiB/s`) y actividad de disco (`KiB/s`).

---

## Integrantes

* **Markus Santiago Salazar Varela** — Universidad Autónoma de Occidente (UAO).
