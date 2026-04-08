<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Negocio;
use Illuminate\Http\Request;

class NegocioController extends Controller
{
    // 🔍 Obtener todos los negocios (Para ListaNegocios del Admin)
    public function index()
    {
        $negocios = Negocio::all();
        return response()->json($negocios);
    }

    // 🔍 Obtener un solo negocio (Para Editar PerfilEmpresa)
    public function show($id)
    {
        $negocio = Negocio::find($id);

        if (!$negocio) {
            return response()->json(['message' => 'Negocio no encontrado'], 404);
        }

        return response()->json($negocio);
    }

    // ➕ Registrar un nuevo negocio (Para PerfilEmpresa POST)
    public function store(Request $request)
    {
        // Validación de datos básicos
        $request->validate([
            'nombre' => 'required|string|max:255',
            'tipo' => 'required|in:FC,FS,MALL,W/M',
            'gerente' => 'nullable|string',
            'telefonoGerente' => 'nullable|string',
            'subgerente' => 'nullable|string',
            'telefonoSubgerente' => 'nullable|string',
        ]);

        // Crear el registro masivo
        $negocio = Negocio::create($request->all());

        return response()->json([
            'message' => 'Negocio creado exitosamente',
            'data' => $negocio
        ], 201);
    }

    // ✏️ Actualizar un negocio existente
    public function update(Request $request, $id)
    {
        $negocio = Negocio::find($id);

        if (!$negocio) {
            return response()->json(['message' => 'Negocio no encontrado'], 404);
        }

        // Actualizamos los datos básicos de la empresa
        $negocio->update($request->except('levantamiento'));

        // Sincronizamos el levantamiento si viene en la petición
        if ($request->has('levantamiento')) {
            $areasData = $request->input('levantamiento', []);
            
            // 1. Recolectar IDs de áreas que llegan para no borrarlas
            $incomingAreaIds = collect($areasData)->pluck('id')->filter(function($id) {
                return is_numeric($id); // Solo IDs válidos, los nuevos traen strings como "1689..."
            })->toArray();

            // Borramos áreas que ya no existen en el request
            $negocio->areas()->whereNotIn('id', $incomingAreaIds)->delete();

            foreach ($areasData as $areaInput) {
                // Si el ID es texto (generado en frontend como Date.now()), creamos una nueva
                $area = is_numeric($areaInput['id']) 
                    ? $negocio->areas()->find($areaInput['id']) 
                    : new \App\Models\LevantamientoArea();

                if (!$area && is_numeric($areaInput['id'])) continue;

                $area->nombreArea = $areaInput['nombreArea'];
                $negocio->areas()->save($area);

                // Sincronizar Equipos
                $equiposData = $areaInput['equipos'] ?? [];
                
                $incomingEqIds = collect($equiposData)->pluck('id')->filter(function($id) {
                    return is_numeric($id);
                })->toArray();

                $area->equipos()->whereNotIn('id', $incomingEqIds)->delete();

                foreach ($equiposData as $eqInput) {
                    $equipo = is_numeric($eqInput['id']) 
                        ? $area->equipos()->find($eqInput['id']) 
                        : new \App\Models\LevantamientoEquipo();

                    if (!$equipo && is_numeric($eqInput['id'])) continue;

                    $equipo->fill([
                        'nombre' => $eqInput['nombre'],
                        'marca' => $eqInput['marca'],
                        'modelo' => $eqInput['modelo'],
                        'serie' => $eqInput['serie'] ?? null,
                        'anioFabricacion' => $eqInput['anioFabricacion'] ?? null,
                        'anioUso' => $eqInput['anioUso'] ?? null,
                        'foto' => $eqInput['foto'] ?? null,
                    ]);
                    $area->equipos()->save($equipo);
                }
            }
        }

        // Refrescamos el modelo para devolverlo completo
        $negocio->load('areas.equipos');

        return response()->json([
            'message' => 'Negocio actualizado correctamente',
            'data' => $negocio
        ]);
    }
}
