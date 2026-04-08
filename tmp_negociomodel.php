<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Negocio extends Model
{
    use HasFactory;

    // Agrega esta propiedad al inicio de la clase para cargar automáticamente las áreas y equipos
    protected $with = ['areas.equipos'];

    protected $fillable = [
        'nombre', 'tipo', 'encargado', 'nombrePlaza',
        'estado', 'ciudad', 'calle', 'numero', 'colonia', 'cp',
        'referencia', 'manzana', 'lote', 'calleAv',
        'gerente', 'telefonoGerente', 'subgerente', 'telefonoSubgerente',
        'telefono', 'correo', 'imagenPerfil', 'estado_aprobacion', 'user_id'
    ];

    /**
     * Get the user that owns the negocio.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function areas()
    {
        return $this->hasMany(LevantamientoArea::class);
    }
}
