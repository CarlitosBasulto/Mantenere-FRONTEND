import React from 'react';
import PerfilEmpresaUnificado from '../../PerfilEmpresa/PerfilEmpresaUnificado';

const AutonomoPerfilEmpresa: React.FC = () => {
    return (
        <PerfilEmpresaUnificado 
            config={{
                isAutonomo: true,
                canDelete: false, // Autónomo no elimina sucursales directamente
                useMapLocation: true,
                notificationRoleTarget: 'autonomo' // Notifica al ecosistema autónomo
            }} 
        />
    );
};

export default AutonomoPerfilEmpresa;
