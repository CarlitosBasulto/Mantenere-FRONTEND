<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Api\TrabajadorController;
use App\Http\Controllers\Api\NegocioController;
use App\Http\Controllers\Api\TrabajoController;
use App\Http\Controllers\ActividadController; // <-- FIJATE QUE YA NO DICE \Api\


/*Route::post('/ping', function () {
 return response()->json(['pong' => true]); });*/

Route::get('/ping', function () {
    return response()->json(['pong' => true]);
});



Route::middleware(['auth:sanctum', 'role.hierarchy'])
    ->group(function () {
        Route::get('/users', [UserController::class , 'index']);
        Route::get('/users/{user}', [UserController::class , 'show']);
        Route::post('/users', [UserController::class , 'store']);
        Route::put('/users/{user}', [UserController::class , 'update']);
        Route::delete('/users/{user}', [UserController::class , 'destroy']);
    });

Route::post('/login', [AuthController::class , 'login']);

Route::middleware('auth:sanctum')->post('/logout', [AuthController::class , 'logout']);


// Rutas para Trabajadores
Route::get('/trabajadores', [TrabajadorController::class , 'index']);
Route::get('/trabajadores/{id}', [TrabajadorController::class , 'show']);
Route::post('/trabajadores', [TrabajadorController::class , 'store']);
Route::put('/trabajadores/{id}', [TrabajadorController::class , 'update']);
Route::patch('/trabajadores/{id}/estado', [TrabajadorController::class , 'toggleEstado']);

// 🛠️ RUTAS DE TRABAJOS
Route::get('/trabajos', [App\Http\Controllers\Api\TrabajoController::class , 'index']);
Route::post('/trabajos', [App\Http\Controllers\Api\TrabajoController::class , 'store']);
Route::get('/trabajos/{id}', [App\Http\Controllers\Api\TrabajoController::class , 'show']);
Route::put('/trabajos/{id}', [App\Http\Controllers\Api\TrabajoController::class , 'update']);
Route::put('/trabajos/{id}/asignar', [App\Http\Controllers\Api\TrabajoController::class , 'asignarTrabajador']);
Route::put('/trabajos/{id}/estado', [App\Http\Controllers\Api\TrabajoController::class , 'cambiarEstado']);


// 🏢 RUTAS DE NEGOCIOS
Route::get('/negocios', [NegocioController::class , 'index']); // Listar todos
Route::post('/negocios', [NegocioController::class , 'store']); // Crear nuevo
Route::get('/negocios/{id}', [NegocioController::class , 'show']); // Ver uno
Route::put('/negocios/{id}', [NegocioController::class , 'update']); // Editar

// 📋 RUTAS DE REPORTES
Route::get('/reportes/trabajo/{trabajo_id}', [App\Http\Controllers\Api\ReporteController::class , 'showByTrabajo']);
Route::post('/reportes', [App\Http\Controllers\Api\ReporteController::class , 'store']);

// 💰 RUTAS DE COTIZACIONES
Route::get('/cotizaciones/trabajo/{trabajo_id}', [App\Http\Controllers\Api\CotizacionController::class , 'showByTrabajo']);
Route::post('/cotizaciones', [App\Http\Controllers\Api\CotizacionController::class , 'store']);
Route::put('/cotizaciones/{id}', [App\Http\Controllers\Api\CotizacionController::class , 'update']);
Route::put('/cotizaciones/{id}/estado', [App\Http\Controllers\Api\CotizacionController::class , 'updateStatus']);
Route::delete('/cotizaciones/{id}', [App\Http\Controllers\Api\CotizacionController::class , 'destroy']);

// 🔔 RUTAS DE NOTIFICACIONES
Route::get('/notificaciones/usuario/{user_id}', [App\Http\Controllers\Api\NotificacionController::class , 'indexByUsuario']);
Route::post('/notificaciones', [App\Http\Controllers\Api\NotificacionController::class , 'store']);
Route::put('/notificaciones/{id}/leer', [App\Http\Controllers\Api\NotificacionController::class , 'markAsRead']);
Route::put('/notificaciones/usuario/{user_id}/leer-todas', [App\Http\Controllers\Api\NotificacionController::class , 'markAllAsRead']);

// 🧰 RUTAS DE CHECKLIST DE EQUIPO
Route::get('/checklist/trabajo/{trabajo_id}', [App\Http\Controllers\Api\ChecklistEquipoController::class , 'showByTrabajo']);
Route::post('/checklist', [App\Http\Controllers\Api\ChecklistEquipoController::class , 'store']);

Route::post('/actividades', [ActividadController::class , 'store']);
Route::get('/trabajos/{id}/actividades', [ActividadController::class , 'getByTrabajo']);
Route::delete('/actividades/{id}', [ActividadController::class , 'destroy']);