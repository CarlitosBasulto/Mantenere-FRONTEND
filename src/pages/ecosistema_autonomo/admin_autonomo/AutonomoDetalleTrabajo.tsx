import React from 'react';
import DetalleTrabajoUnificado from '../../DetalleTrabajo/DetalleTrabajoUnificado';

const AutonomoDetalleTrabajo: React.FC = () => {
    return (
        <DetalleTrabajoUnificado 
            config={{
                basePath: '/autonomo',
                initialTabDefault: 'Datos',
                canCotizar: true,
                notificarEcosistema: false // Autónomo notifica de otra forma o a sí mismo, base logic already handles targetAdminId
            }} 
        />
    );
};

export default AutonomoDetalleTrabajo;
