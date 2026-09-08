import React from 'react';
import ListaTrabajadoresUnificado from '../../ListaTrabajadores/ListaTrabajadoresUnificado';
import { getTrabajadores, createTrabajador, toggleEstado } from "../../../services/autonomo/trabajadoresService";

const AutonomoListaTrabajadores: React.FC = () => {
    return (
        <ListaTrabajadoresUnificado 
            config={{
                isAutonomo: true,
                basePath: '/autonomo',
                trabajadoresService: {
                    getTrabajadores,
                    createTrabajador,
                    toggleEstado
                }
            }}
        />
    );
};

export default AutonomoListaTrabajadores;
