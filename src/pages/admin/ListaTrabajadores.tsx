import React from 'react';
import ListaTrabajadoresUnificado from '../ListaTrabajadores/ListaTrabajadoresUnificado';
import { getTrabajadores, createTrabajador, toggleEstado } from "../../services/base/trabajadoresService";

const ListaTrabajadores: React.FC = () => {
    return (
        <ListaTrabajadoresUnificado 
            config={{
                isAutonomo: false,
                basePath: '/menu',
                trabajadoresService: {
                    getTrabajadores,
                    createTrabajador,
                    toggleEstado
                }
            }}
        />
    );
};

export default ListaTrabajadores;
