import React from 'react';
import DetalleTrabajoUnificado from '../DetalleTrabajo/DetalleTrabajoUnificado';

const AdminDetalleTrabajo: React.FC = () => {
    return (
        <DetalleTrabajoUnificado 
            config={{
                basePath: '/menu',
                initialTabDefault: 'Trabajo',
                canCotizar: true,
                notificarEcosistema: true
            }} 
        />
    );
};

export default AdminDetalleTrabajo;
