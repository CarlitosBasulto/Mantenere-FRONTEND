import React from 'react';
import DetalleTrabajoUnificado from '../../DetalleTrabajo/DetalleTrabajoUnificado';

const GerenteSucursalDetalleTrabajo: React.FC = () => {
    return (
        <DetalleTrabajoUnificado 
            config={{
                basePath: '/gerente-sucursal',
                initialTabDefault: 'Trabajo',
                canCotizar: false,
                notificarEcosistema: true
            }} 
        />
    );
};

export default GerenteSucursalDetalleTrabajo;
