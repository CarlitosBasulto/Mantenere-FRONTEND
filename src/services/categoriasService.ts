import api from './api';

export interface CategoriaEquipo {
  id: number;
  nombre: string;
  created_at?: string;
  updated_at?: string;
}

export const categoriasService = {
  getCategorias: async (): Promise<CategoriaEquipo[]> => {
    const response = await api.get<CategoriaEquipo[]>('/categorias-equipos');
    return response.data;
  },

  createCategoria: async (nombre: string): Promise<CategoriaEquipo> => {
    const response = await api.post<{ message: string; data: CategoriaEquipo }>('/categorias-equipos', { nombre });
    return response.data.data;
  },

  deleteCategoria: async (id: number): Promise<void> => {
    await api.delete(`/categorias-equipos/${id}`);
  },

  // Agregar un consumo manual al equipo
  addConsumoManual: async (data: { equipo_id: number; pieza: string; cantidad: number; costo_estimado?: number | null, categoria_id?: number | null }) => {
      try {
          const response = await api.post('/equipos-consumo', data);
          return response.data;
      } catch (error) {
          console.error('Error al registrar consumo manual:', error);
          throw error;
      }
  },

  // Actualizar la categoría de un consumo específico
  updateConsumoCategoria: async (id: number, categoria_id: number) => {
      try {
          const response = await api.put(`/equipos-consumo/${id}/categoria`, { categoria_id });
          return response.data;
      } catch (error) {
          console.error('Error al actualizar categoría del consumo:', error);
          throw error;
      }
  }
};
