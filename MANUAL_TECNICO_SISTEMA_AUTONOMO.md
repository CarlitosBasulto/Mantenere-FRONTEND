# 📘 MANUAL TÉCNICO, FUNCIONAL Y DE ARQUITECTURA: SISTEMA AUTÓNOMO
**Plataforma Mantenere**  
*Documento de Ingeniería de Software y Arquitectura de Sistemas*

---

## 1. Introducción y Visión General del Sistema Autónomo

### 1.1 Propósito y Objetivos de Negocio
El **Sistema Autónomo** de Mantenere es una solución de arquitectura multi-inquilino (*multi-tenant* a nivel de datos) diseñada específicamente para cadenas comerciales, franquicias o empresas corporativas que cuentan con su propia infraestructura operativa:
1. **Gestión Multitienda Centralizada:** Permite a una sola organización gestionar $N$ sucursales físicas, cada una con su propio personal, catálogo de áreas y parque de equipos.
2. **Autonomía Operativa y Cuadrilla Propia:** Permite a la empresa operar con técnicos internos de nómina (`tecnico-autonomo`) y gerentes dedicados por tienda (`gerente-sucursal`), sin depender de intermediarios externos ni mezclarse con los clientes estándar de la plataforma base de Mantenere.
3. **Trazabilidad Integral de Mantenimiento:** Gestiona el ciclo completo desde el inventario técnico de equipos (Levantamiento), reportes de fallas por sucursal, visitas de inspección con checklist, cotizaciones internas de refacciones, ejecución de trabajos y emisión de reportes técnicos con firmas digitales.
4. **Aislamiento Estricto de Datos:** Todo dato generado (sucursales, órdenes de trabajo, técnicos, cotizaciones, inventarios) está protegido mediante una clave foránea raíz (`admin_autonomo_id`), garantizando que ninguna organización pueda acceder o interferir en los datos de otra.

---

### 1.2 Diagrama de Arquitectura de Alto Nivel
La arquitectura desacoplada comunica el cliente web en React con la API RESTful de Laravel 12 y un servidor de WebSockets en tiempo real (Laravel Reverb), respaldado por MySQL y Cloudinary:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 CLIENTE WEB (REACT 19)                  │
                  │       (mantenere-frontend-production.up.railway.app)    │
                  └───────────────┬─────────────────────────▲───────────────┘
                                  │                         │
                     HTTPS / JSON │ Interceptor             │ WebSockets (WSS)
                     Bearer JWT   │ Axios                   │ Canales Privados (Echo)
                                  │                         │
                  ┌───────────────▼─────────────────────────┴───────────────┐
                  │              RAILWAY CONTAINER (BACKEND)                │
                  │                                                         │
                  │   ┌──────────────────────┐   ┌──────────────────────┐   │
                  │   │   LARAVEL 12 (HTTP)  │   │    LARAVEL REVERB    │   │
                  │   │   (Port: $PORT/8085) │   │     (Port: 6001)     │   │
                  │   └──────────┬───────────┘   └──────────▲───────────┘   │
                  │              │                          │               │
                  │              └───── ShouldBroadcastNow ─┘               │
                  └──────────────┬──────────────────────────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │                               │
    ┌────────────▼─────────────┐   ┌─────────────▼────────────┐
    │   MYSQL DATABASE (RAILWAY)│   │   CLOUDINARY STORAGE     │
    │   Tablas con tenant ID:   │   │   Imágenes de equipos,   │
    │   admin_autonomo_id       │   │   evidencias y reportes  │
    └──────────────────────────┘   └──────────────────────────┘
```

---

## 2. Arquitectura del Backend (Laravel 12 & PHP 8.2+)

### 2.1 Controladores Especializados (`App\Http\Controllers\Autonomo\*`)
El backend aísla la lógica autónoma en un namespace dedicado:

| Controlador | Ruta del Archivo | Responsabilidad Técnica |
| :--- | :--- | :--- |
| `NegocioController` | `app/Http/Controllers/Autonomo/NegocioController.php` | CRUD de sucursales del tenant, asignación/creación de `gerente-sucursal`, sincronización de áreas y equipos (`syncLevantamiento`), y consultas de inventario. |
| `TrabajoController` | `app/Http/Controllers/Autonomo/TrabajoController.php` | Gestión de órdenes de servicio (`Trabajo`), asignación de técnicos de nómina, transición de estados (`Pendiente`, `Asignado`, `En proceso`, `Finalizado`). |
| `TrabajadorController` | `app/Http/Controllers/Autonomo/TrabajadorController.php` | Alta, edición, estado (`toggleEstado`) y perfil de los técnicos de nómina pertenecientes al `admin_autonomo_id`. |
| `UsuarioController` | `app/Http/Controllers/Autonomo/UsuarioController.php` | Administración de usuarios subordinados (`hierarchy_level >= 4`), cambio de contraseñas (`Hash::make`), modificación de roles y bloqueo de cuentas. |
| `AdminAutonomoController` | `app/Http/Controllers/Api/AdminAutonomoController.php` | Tableros ejecutivos, métricas agregadas por sucursal, y alta/consulta del **Gerente General** corporativo (`getGerenteGeneral`, `asignarGerenteGeneral`). |
| `ReporteController` | `app/Http/Controllers/Api/ReporteController.php` | Generación y persistencia de reportes finales de servicio con almacenamiento de firmas (`firma_cliente`, `firma_tecnico`). |
| `ChecklistEquipoController` | `app/Http/Controllers/Api/ChecklistEquipoController.php` | Registro de puntos de inspección física y pruebas de operación por equipo durante el diagnóstico en campo. |

---

### 2.2 Modelos Eloquent y Esquema de Base de Datos
Cada modelo del ecosistema autónomo implementa relaciones que garantizan la integridad referencial y el filtrado por inquilino:

```
 ┌───────────────┐        1:N         ┌───────────────┐        1:N         ┌───────────────────┐
 │     User      ├────────────────────►    Negocio    ├────────────────────►  LevantamientoArea │
 │ (Propietario) │                    │  (Sucursal)   │                    │     (Áreas)       │
 └───────┬───────┘                    └───────┬───────┘                    └─────────┬─────────┘
         │                                    │                                      │ 1:N
         │ 1:N                                │ 1:N                                  ▼
         │                                    │                            ┌───────────────────┐
         ▼                                    ▼                            │LevantamientoEquipo│
 ┌───────────────┐                    ┌───────────────┐                    │     (Equipos)     │
 │  Trabajador   │                    │    Trabajo    │                    └─────────▲─────────┘
 │   (Técnico)   │                    │   (Órdenes)   │◄─────────────────────────────┤ (equipo_id)
 └───────┬───────┘                    └───────┬───────┘                              │
         │ 1:N                                │ 1:N                                  │
         ▼                                    ▼                                      │
 ┌───────────────┐                    ┌───────────────┐                    ┌─────────┴─────────┐
 │ Trabajo (Asig)│                    │  Cotizacion   │                    │MantenimientoSolict│
 └───────────────┘                    └───────────────┘                    └───────────────────┘
```

#### Atributo Clave de Aislamiento: `admin_autonomo_id`
Implementado a través de la migración `2026_06_11_000002_add_admin_autonomo_id_to_tables.php`, inyecta la columna `unsignedBigInteger('admin_autonomo_id')->nullable()` en:
* `negocios`
* `trabajos`
* `trabajadores`
* `cotizaciones`
* `users`

**Regla de Resolución en Backend:**
```php
private function resolveAdminId($user): ?int
{
    return strtolower($user->role->name) === 'propietario-autonomo'
        ? $user->id
        : ($user->admin_autonomo_id ?? null);
}
```

---

### 2.3 Sistema de Jerarquías y Middleware de Seguridad
El archivo `bootstrap/app.php` registra los alias de middleware que blindan la API:

1. **`autonomo.role` (`App\Http\Middleware\EnsureAutonomoRole`):**
   * Valida que el usuario posea un rol del ecosistema autónomo (`hierarchy_level >= 4`).
   * Permite exclusivamente la supervisión técnica de `root` (nivel 0) y `admin` (nivel 1).
   * Deniega con `403 Forbidden` a roles externos no autorizados.

2. **`role.hierarchy` (`App\Http\Middleware\CheckRoleHierarchy`):**
   * Previene la escalada de privilegios horizontal o vertical: ningún usuario puede crear, modificar o eliminar a otro usuario con un nivel jerárquico igual o superior al suyo.
   * Blindaje específico: El `administrador-general` (nivel 5) tiene terminantemente prohibido modificar, bloquear o eliminar al `propietario-autonomo` (nivel 4).

```
   Nivel 0: root
   Nivel 1: Admin Base
   Nivel 2: Cliente Base
   Nivel 3: tecnico-normal
   ────────────────────────────────── Frontera Ecosistema Autónomo
   Nivel 4: propietario-autonomo  (Dueño de la Empresa)
   Nivel 5: administrador-general (Director de Operaciones)
   Nivel 6: gerente-sucursal      (Encargado de Tienda)
   Nivel 7: tecnico-autonomo      (Técnico de Nómina)
```

---

### 2.4 Comunicación en Tiempo Real y WebSockets (Laravel Reverb)
El backend utiliza **Laravel Reverb** (`laravel/reverb: ^1.11`), un servidor WebSocket nativo para Laravel de alto rendimiento:

* **Eventos que transmiten en vivo:**
  * `App\Events\NotificationSent`: Implementa `ShouldBroadcastNow`. Transmite notificaciones instantáneas de estado al canal privado `user.{userId}` con nombre `NotificationSent`.
  * `App\Events\ChatMessageSent`: Implementa `ShouldBroadcastNow`. Transmite mensajes y acuerdos de cotización en vivo al canal privado `trabajo.{trabajoId}` con nombre `ChatMessageSent`.
* **Reglas de Autorización de Canales (`routes/channels.php`):**
  ```php
  Broadcast::channel('user.{id}', function ($user, $id) {
      return (int) $user->id === (int) $id;
  });

  Broadcast::channel('trabajo.{trabajoId}', function ($user, $trabajoId) {
      return $user !== null;
  });
  ```

---

### 2.5 Gestión de Almacenamiento Multimedia (Cloudinary)
Integrado mediante `cloudinary-labs/cloudinary-laravel: ^3.0`:
* **Modo Dual Local / Producción:**
  * Si el entorno es local (`app()->environment('local')`), los archivos se almacenan en el disco público (`storage/trabajos/fotos`).
  * En producción (Railway), se transmiten a la API de Cloudinary:
    ```php
    $result = cloudinary()->uploadApi()->upload($file->getRealPath(), [
        'folder'      => 'mantenere/trabajos',
        'quality'     => 'auto:low',
        'fetch_format'=> 'auto'
    ]);
    $fotoUrl = $result['secure_url'];
    ```
  * Optimiza ancho de banda mediante compresión automática (`quality: auto:low`) y entrega sobre CDN global con HTTPS (`secure_url`).

---

## 3. Arquitectura del Frontend (React.js 19 & TypeScript)

### 3.1 Estructura de Módulos y Enrutamiento (`App.tsx`)
El enrutamiento está protegido por `<ProtectedRoute allowedRoles={[...]}>`:

```
src/pages/ecosistema_autonomo/
├── admin_autonomo/
│   ├── AdminGeneralMisSucursales.tsx   # Dashboard multitienda, métricas en vivo y semáforos
│   ├── AutonomoDetalleTrabajo.tsx      # Orquestador del detalle de trabajo (canCotizar: true)
│   ├── AutonomoListaTrabajadores.tsx   # Gestión de cuadrilla técnica de nómina
│   ├── AutonomoMiPerfil.tsx            # Datos fiscales y asignación del Gerente General
│   └── AutonomoPerfilEmpresa.tsx       # Edición y geolocalización de sucursales
├── gerente_sucursal/
│   ├── GerenteSucursalMiSucursal.tsx   # Panel exclusivo de la sucursal asignada
│   └── GerenteSucursalDetalleTrabajo.tsx# Vista del trabajo para tienda (canCotizar: false)
└── tecnico_autonomo/
    └── DashboardTecnicoAutonomo.tsx    # Tablero de asignaciones filtradas para el técnico
```

---

### 3.2 Orquestador Central: `DetalleTrabajoUnificado.tsx`
Es el núcleo de ejecución operativa del sistema (más de 10,000 líneas con gestión de estados multi-rol). Se divide en 5 pestañas condicionales:

```
┌───────────────┬───────────────┬───────────────┬───────────────┬───────────────┐
│     DATOS     │   REGISTRO    │  COTIZACIÓN   │    TRABAJO    │    REPORTE    │
└───────────────┴───────────────┴───────────────┴───────────────┴───────────────┘
```

1. **Tab Datos:** Ficha técnica de la orden, datos de la sucursal, prioridad, equipo afectado y fechas programadas.
2. **Tab Registro:** Solo visible en trabajos tipo `"Visita"` para el técnico. Permite pulsar *"Comenzar Registro"*, fotografiar fallas y llenar listas de verificación (Checklist) asociadas al equipo.
3. **Tab Cotización:**
   * **Vista Administrador / Técnico:** Formulario dinámico de refacciones, horas hombre y chat técnico en vivo en drawer lateral.
   * **Vista Gerente Sucursal (`canCotizar: false`):** Bitácora oficial de presupuestos recibidos con botones: *Aceptar Propuesta*, *Re-Cotizar*, *Rechazar* (con ventana de 3 horas de arrepentimiento) y *Descargar PDF*.
4. **Tab Trabajo:** Ejecución en campo. Registro de hora de llegada, botón *"Comenzar Trabajo"* (estado a `En Proceso`), carga obligatoria de fotos **Antes / Después**, y control de pausas por insumos.
5. **Tab Reporte:** Redacción de actividades efectuadas, piezas instaladas, recomendaciones y recolección de firmas táctiles en pantalla del gerente y técnico.

---

### 3.3 Conexión a WebSockets en el Cliente (`src/services/echo.ts`)
Implementa un patrón **Resilient WebSocket Stub**:
* Si la aplicación corre bajo HTTPS y Reverb está en HTTP, o si el socket no responde, `echo.ts` activa un stub silencioso (`noOpEcho`) para evitar excepciones no controladas en componentes visuales.
* En conexión activa, inicializa `Echo` con el broadaster `reverb`:
  ```typescript
  new Echo({
      broadcaster: 'reverb',
      key:         import.meta.env.VITE_REVERB_APP_KEY,
      wsHost:      import.meta.env.VITE_REVERB_HOST,
      wsPort:      import.meta.env.VITE_REVERB_PORT,
      forceTLS:    import.meta.env.VITE_REVERB_SCHEME === 'https',
      authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
      auth: {
          headers: {
              get Authorization() {
                  const token = localStorage.getItem('token');
                  return token ? `Bearer ${token}` : '';
              }
          }
      }
  });
  ```

---

### 3.4 Capa de Red e Interceptores HTTP (`src/services/api.ts`)
* Utiliza una instancia singleton de `axios` con `baseURL: import.meta.env.VITE_API_URL`.
* **Request Interceptor:** Inyecta de forma reactiva el encabezado `Authorization: Bearer <token>` desde `localStorage`.
* **Response Interceptor:** Detecta respuestas HTTP `401 Unauthorized`. Si el token expiró o fue revocado, limpia automáticamente `localStorage` y redirige a `/inicio-sesion`.

---

## 4. Infraestructura, Variables de Entorno y Despliegue en Railway

### 4.1 Arquitectura de Despliegue en Contenedores
Tanto el Backend como el Frontend se encuentran desplegados en **Railway** en proyectos aislados con integración continua (CI/CD) desde sus repositorios en GitHub.

#### El Desafío del Proceso Dual en Backend: `start.sh`
Para evitar el costo y la sobrecarga de provisionar dos contenedores separados para HTTP y WebSockets, el contenedor de Railway ejecuta `Procfile`:
```dockerfile
web: bash start.sh
```
El script `start.sh` inicializa Reverb como demonio en segundo plano y transfiere el control principal a Laravel:
```bash
#!/bin/bash
# 1. Iniciar servidor WebSocket Reverb en segundo plano
php artisan reverb:start --host=0.0.0.0 --port=6001 &
REVERB_PID=$!
echo "Started Reverb WebSocket on port 6001 (PID $REVERB_PID)"

# 2. Iniciar servidor HTTP en primer plano sobre el puerto asignado por Railway
PORT_TO_USE="${PORT:-8080}"
echo "Starting Laravel HTTP server on port $PORT_TO_USE"
exec php artisan serve --host=0.0.0.0 --port=$PORT_TO_USE
```

---

### 4.2 Matriz de Variables de Entorno Críticas

#### Backend (Laravel 12 en Railway):
| Variable de Entorno | Ejemplo / Valor en Producción | Función |
| :--- | :--- | :--- |
| `APP_NAME` | `Mantenere` | Nombre de la aplicación. |
| `APP_ENV` | `production` | Modo de ejecución de Laravel. |
| `APP_KEY` | `base64:...` | Clave AES-256 para encriptación de sesiones y tokens. |
| `APP_DEBUG` | `false` | Desactiva trazas de error sensibles en producción. |
| `APP_URL` | `https://mantenere-backend-production...up.railway.app` | URL base del backend. |
| `FRONTEND_URL` | `https://mantenere-frontend-production.up.railway.app` | Origen para validación de CORS. |
| `DB_CONNECTION` | `mysql` | Driver de base de datos. |
| `DB_HOST` | `autorack.proxy.rlwy.net` (Host provisto por Railway) | Dirección del clúster MySQL. |
| `DB_PORT` | `12345` (Puerto provisto por Railway) | Puerto de conexión MySQL. |
| `DB_DATABASE` | `railway` | Base de datos de producción. |
| `DB_USERNAME` | `root` | Usuario de MySQL. |
| `DB_PASSWORD` | `...` | Contraseña provista por Railway. |
| `BROADCAST_CONNECTION` | `reverb` | Habilita Reverb como broadcast driver. |
| `REVERB_APP_ID` | `100001` | ID interno de Reverb. |
| `REVERB_APP_KEY` | `mantenere-reverb-key` | Llave pública de conexión para clientes. |
| `REVERB_APP_SECRET` | `mantenere-reverb-secret` | Llave privada para firma de paquetes en backend. |
| `REVERB_HOST` | `0.0.0.0` | Host de enlace del servidor WebSocket. |
| `REVERB_PORT` | `6001` | Puerto de escucha de WebSockets. |
| `REVERB_SCHEME` | `http` (enlace interno) / `https` (vía proxy) | Protocolo de conexión. |
| `CLOUDINARY_URL` | `cloudinary://<KEY>:<SECRET>@<CLOUD_NAME>` | Conexión a la API de Cloudinary. |
| `MAIL_MAILER` | `smtp` | Driver de correo electrónico. |
| `MAIL_HOST` | `smtp.gmail.com` | Servidor SMTP. |
| `MAIL_PORT` | `587` | Puerto TLS de Gmail. |
| `MAIL_USERNAME` | `notificaciones@mantenere.com` | Cuenta de correo emisora. |
| `MAIL_PASSWORD` | `app-specific-password` | Contraseña de aplicación de Google. |

#### Frontend (React en Railway):
| Variable de Entorno | Valor en Producción | Función |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://mantenere-backend-production...up.railway.app/api` | Endpoint base para llamadas Axios. |
| `VITE_REVERB_APP_KEY`| `mantenere-reverb-key` | Debe coincidir exactamente con el backend. |
| `VITE_REVERB_HOST` | Dominio público del backend en Railway | Host para la negociación del WebSocket. |
| `VITE_REVERB_PORT` | `443` (a través del proxy seguro de Railway) | Puerto externo del WebSocket. |
| `VITE_REVERB_SCHEME`| `https` | Fuerza WebSocket Seguro (`wss://`). |

---

## 5. Manejo de Errores, Logs, Seguridad y Monitoreo

### 5.1 Estrategia de Logging y Diagnóstico
* En `config/logging.php`, el canal principal está configurado como `stack` con driver `daily`:
  * Genera archivos rotativos en `storage/logs/laravel-YYYY-MM-DD.log`.
  * Los errores no controlados (500) registran el *stack trace* completo, el ID del usuario autenticado y la URL solicitada.
* **Depuración de Notificaciones por Correo:** Si el servidor SMTP de Gmail experimenta límites de tasa (*rate limit*), se puede conmutar temporalmente a `MAIL_MAILER=log` para auditar el HTML de los correos emitidos en el log local sin abortar las peticiones del usuario.

### 5.2 Seguridad en Endpoints y Protección de Datos
1. **Tokens Personales de Acceso (Laravel Sanctum):**
   * Autenticación basada en cabeceras HTTP `Authorization: Bearer <hash>`.
   * Los tokens se almacenan en la tabla `personal_access_tokens` con capacidades específicas y timestamps de último uso.
2. **CORS Riguroso (`config/cors.php`):**
   * Responde a peticiones preflight `OPTIONS`.
   * Permite únicamente los métodos `GET`, `POST`, `PUT`, `DELETE` desde los orígenes declarados en el frontend de Railway y localhost para desarrollo.
3. **Protección de Canales de WebSocket:**
   * Ningún cliente puede escuchar un canal privado sin autenticarse primero en el endpoint `/api/broadcasting/auth`.
   * Las reglas del closure en `routes/channels.php` verifican que el usuario solo pueda suscribirse a su propio ID (`user.{id}`).

---

## 6. Guía de Mantenimiento y Troubleshooting

### 6.1 Problemas Frecuentes y Soluciones

#### A. Error de "Mixed Content" o Falla de Conexión en WebSockets
* **Síntoma:** El navegador muestra error rojo: `Mixed Content: The page at 'https://...' was loaded over HTTPS, but attempted to connect to an insecure WebSocket endpoint 'ws://...'`.
* **Causa:** `VITE_REVERB_SCHEME` está configurado como `http` en un sitio servido por `https`.
* **Solución:** Establecer `VITE_REVERB_SCHEME=https` y `VITE_REVERB_PORT=443` en las variables del frontend de Railway, y regenerar el build.

#### B. Error de CORS (Cross-Origin Resource Sharing)
* **Síntoma:** Llamadas a la API fallan con `No 'Access-Control-Allow-Origin' header is present on the requested resource`.
* **Causa:** El backend devolvió un error fatal 500 antes de que el middleware de CORS pudiera adjuntar las cabeceras a la respuesta.
* **Solución:** Revisar el log en Railway (`storage/logs/laravel.log`) para solucionar la excepción interna de PHP; corregida la excepción, las cabeceras de CORS volverán a emitirse normalmente.

#### C. Tablas de Base de Datos Desincronizadas tras Despliegue
* **Síntoma:** Error `Unknown column 'admin_autonomo_id' in where clause`.
* **Causa:** No se corrieron las migraciones tras el commit en Railway.
* **Solución:** Conectarse mediante Railway CLI o ejecutar desde la consola de comandos de Railway:
  ```bash
  php artisan migrate --force
  ```

---

### 6.2 Cheat Sheet de Comandos de Operación y Desarrollo

#### Backend (Entorno Local en PowerShell / Terminal):
```powershell
# Iniciar servidor API local en puerto 8085
php artisan serve --port=8085

# Iniciar servidor WebSocket Reverb local
php artisan reverb:start --port=6001

# Limpieza total de caché de configuración y rutas
php artisan config:clear
php artisan route:clear
php artisan cache:clear

# Ejecutar migraciones pendientes
php artisan migrate

# Estado y verificación de rutas registradas para el ecosistema autónomo
php artisan route:list --path=autonomo
```

#### Frontend (React / Vite):
```powershell
# Ejecutar entorno de desarrollo local
npm run dev

# Compilar paquete de producción (valida errores de tipos TypeScript)
npm run build

# Previsualizar el bundle de producción localmente
npm run preview
```

#### Control de Versiones Git (Flujo de Ramas):
```powershell
# Ver estado actual
git status

# Desplegar a Producción (dispara webhook de Railway automáticamente)
git checkout main
git push origin main

# Trabajar en nuevas características (rama de desarrollo aislada)
git checkout desarrollo
git add .
git commit -m "feat(modulo): descripción del cambio"
git push origin desarrollo
```

---

## 7. Paquete de Entrega y Artefactos del Sistema

### 7.1 Aplicación en Producción (Sistema Completo)
* **URL de acceso Frontend (Producción):**  
  [https://mantenere-frontend-production.up.railway.app](https://mantenere-frontend-production.up.railway.app)
* **URL de API Backend (Railway):**  
  [https://mantenere-backend-production.up.railway.app](https://mantenere-backend-production.up.railway.app)  
  *Endpoint API:* `https://mantenere-backend-production.up.railway.app/api`
* **Servidor WebSockets (Laravel Reverb en Railway):**  
  `wss://mantenere-backend-production.up.railway.app/app/mantenere-reverb-key`

---

### 7.2 Repositorio de Código Fuente
Control de versiones profesional alojado en **GitHub**, estructurado en repositorios independientes para Frontend y Backend con sincronización continua hacia Railway:
* **Repositorio Frontend:**  
  `https://github.com/CarlitosBasulto/Mantenere-FRONTEND.git`  
  *Rama principal (Producción):* `main`  
  *Rama de características en desarrollo:* `desarrollo`
* **Repositorio Backend:**  
  `https://github.com/CarlitosBasulto/Mantenere-BACKEND.git`  
  *Rama principal (Producción):* `main`  
  *Rama de características en desarrollo:* `desarrollo`

---

### 7.3 Código Ejecutable y Compilación (Builds)
* **Frontend:**
  * Bundle estático optimizado generado automáticamente en Railway mediante `npm run build` (compilación con Vite + TypeScript y minificación de assets).
  * Enrutamiento SPA (*Single Page Application*) con soporte de redirecciones en el servidor web.
* **Backend:**
  * Contenedor Docker/Nixpacks en Railway con **PHP 8.3+** y **Laravel 12**.
  * Gestor de dependencias mediante **Composer** (`composer install --no-dev --optimize-autoloader`).
  * Ejecución dual concurrente mediante `Procfile` y script `start.sh`:
    * Proceso demonio en segundo plano: **Laravel Reverb** (WebSockets) en puerto interno `6001`.
    * Proceso en primer plano: Servidor HTTP Laravel en puerto `$PORT` asignado dinámicamente por Railway.
* **Base de Datos:**
  * Instancia **MySQL** remota gestionada en Railway con conexiones seguras SSL.
  * Migraciones ejecutadas y controladas con aislamiento multi-inquilino a través de la clave `admin_autonomo_id`.
  * Almacenamiento multimedia persistente desacoplado en la nube a través de **Cloudinary** (`mantenere/trabajos`).

---

### 7.4 Matriz de Credenciales de Acceso de Prueba (Validación del Sistema)

| Rol / Nivel | Nombre de Usuario | Correo Electrónico | Contraseña | ¿Puede Cotizar? | Contexto / Vinculación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Propietario Autónomo**<br>`(Nivel 4)` | Admin Autónomo | `autonomo01@gmail.com` | `123456` | ✅ **`true`** | Titular de la empresa (`admin_autonomo_id: 4`). Control total multitienda. |
| **Administrador General**<br>`(Nivel 5)` | Diego Basulto | `diego01@gmail.com` | `12345678` | ✅ **`true`** | Director operativo subordinado a `admin_autonomo_id: 4`. |
| **Gerente de Sucursal**<br>`(Nivel 6)` | Daniel Basulto | `daniel01@gmail.com` | `12345678` | ❌ **`false`** | Encargado en tienda *"Mi viejo molino 60 norte"* (`negocio_id: 1`). |
| **Técnico Autónomo**<br>`(Nivel 7)` | Técnico Pruebas | `tecnico01@gmail.com` | `12345678` | ⚠️ *Propone refacciones* | Técnico de nómina en cuadrilla (`trabajadores`). |
| **Root Global (Nivel 0)** | Root Access | `root@mantenere.com` | `MantenereRoot2026!` | ✅ *Supervisión* | Acceso maestro de auditoría de plataforma. |
| **Admin Base (Nivel 1)** | Admin Base | `admin@mantenere.com` | `AdminBase2026!` | ✅ *Supervisión* | Administrador central de la plataforma Mantenere. |

---
*Manual técnico compilado y validado en base a la arquitectura actual de código fuente de Mantenere.*
