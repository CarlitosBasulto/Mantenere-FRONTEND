# Proyecto Frontend Escalable - Mantenere

Este proyecto ha sido estructurado siguiendo prácticas de arquitectura escalable para facilitar el crecimiento y mantenimiento a largo plazo.

## Estructura de Directorios

La estructura en `src/` está organizada de la siguiente manera:

- **`assets/`**: Archivos estáticos como imágenes, fuentes e iconos.
- **`components/`**: Componentes de UI compartidos y agnósticos al dominio (botones, inputs, modales).
- **`config/`**: Configuraciones globales del entorno y constantes.
- **`features/`**: Módulos específicos del dominio. Cada característica debe contener sus propios componentes, hooks, servicios y tipos.
  - Ejemplo: `src/features/auth/`
- **`hooks/`**: Hooks personalizados globales.
- **`layouts/`**: Componentes de diseño que envuelven las páginas (MainLayout, AuthLayout).
- **`pages/`**: Puntos de entrada de las rutas. Deben ser componentes ligeros que componen características y layouts.
- **`routes/`**: Configuración de rutas de la aplicación.
- **`services/`**: Lógica de comunicación con APIs externas (Axios, Fetch).
- **`styles/`**: Estilos globales y temas.
- **`types/`**: Definiciones de tipos TypeScript globales.
- **`utils/`**: Funciones de utilidad y helpers.

## Tecnologías

- **React**: Biblioteca de UI.
- **TypeScript**: Tipado estático.
- **Vite**: Build tool y servidor de desarrollo.
- **Axios**: Cliente HTTP para peticiones API.
- **React Router**: Enrutamiento declarativo.
- **Tailwind CSS** (Recomendado agregar si se desea utilidades de estilo rápidas).

## Primeros Pasos

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Cómo agregar una nueva característica

1. Crea una nueva carpeta en `src/features/` con el nombre de la característica.
2. Agrega sus componentes, hooks y servicios dentro de esa carpeta.
3. Exporta él/los componentes principales desde un `index.ts` en la carpeta de la característica.
4. Importa la característica en una página dentro de `src/pages/`.
5. Agrega la ruta en `src/routes/AppRoutes.tsx`.
