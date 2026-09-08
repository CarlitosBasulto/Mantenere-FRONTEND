import { useState, useEffect, useRef } from 'react';
import { getNegocio, getNegocios, updateNegocio, uploadImage } from '../../../services/negociosService';
import { compressImage } from '../../../utils/imageCompression';
import { useModal } from '../../../context/ModalContext';

export interface NegocioDataReturn {
    businessName: string;
    setBusinessName: React.Dispatch<React.SetStateAction<string>>;
    businessImage: string | null;
    setBusinessImage: React.Dispatch<React.SetStateAction<string | null>>;
    businessDetails: any;
    businessAreas: any[];
    setBusinessAreas: React.Dispatch<React.SetStateAction<any[]>>;
    bannerY: number;
    setBannerY: React.Dispatch<React.SetStateAction<number>>;
    isAdjustingPosition: boolean;
    setIsAdjustingPosition: React.Dispatch<React.SetStateAction<boolean>>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    handleBannerChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    saveBannerPosition: () => Promise<void>;
    getBusinessAddress: () => string;
}

/**
 * Hook que centraliza toda la información del negocio/sucursal:
 * nombre, imagen de portada, áreas del levantamiento y detalles completos.
 *
 * @param id         - ID del negocio (string de useParams)
 * @param onLoaded   - Callback que recibe el nombre ya resuelto para sincronizar
 *                     otros estados del componente padre (e.g. newRequestData.cliente)
 */
export const useNegocioData = (
    id: string | undefined,
    onLoaded?: (name: string) => void
): NegocioDataReturn => {
    const { showAlert } = useModal();

    const [businessName, setBusinessName] = useState('Cargando...');
    const [businessImage, setBusinessImage] = useState<string | null>(null);
    const [businessDetails, setBusinessDetails] = useState<any>(null);
    const [businessAreas, setBusinessAreas] = useState<any[]>([]);
    const [bannerY, setBannerY] = useState(50);
    const [isAdjustingPosition, setIsAdjustingPosition] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar posición Y del banner desde el parámetro en la URL de imagen
    useEffect(() => {
        if (businessImage) {
            const match = businessImage.match(/[?&]posy=(\d+)/);
            setBannerY(match ? Number(match[1]) : 50);
        }
    }, [businessImage]);

    // Cargar datos del negocio
    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const all = await getNegocios();
                const current = all.find((n: any) => n.id === Number(id));
                const individual = await getNegocio(Number(id));

                if (individual?.areas) {
                    setBusinessAreas(individual.areas);
                }

                if (individual || current) {
                    setBusinessDetails({ ...current, ...individual });
                }

                let fullName = 'Desconocido';
                if (current) {
                    const plaza = current.nombrePlaza || current.nombre_plaza;
                    fullName = plaza ? `${current.nombre} - ${plaza}` : current.nombre;
                    setBusinessImage(current.imagen_portada || null);
                } else if (individual?.nombre) {
                    const indPlaza = individual.nombrePlaza || individual.nombre_plaza;
                    fullName = indPlaza ? `${individual.nombre} - ${indPlaza}` : individual.nombre;
                    setBusinessImage(individual.imagen_portada || null);
                }

                setBusinessName(fullName);
                onLoaded?.(fullName);
            } catch (err) {
                console.error('Error cargando nombre del negocio:', err);
                setBusinessName('Desconocido');
                onLoaded?.('Desconocido');
            }
        };

        fetchBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const saveBannerPosition = async () => {
        if (!id || !businessImage) return;
        const baseUrl = businessImage.split(/[?#]/)[0];
        const newUrl = `${baseUrl}?posy=${bannerY}`;
        try {
            await updateNegocio(Number(id), { imagen_portada: newUrl });
            setBusinessImage(newUrl);
            showAlert('Éxito', 'Posición de portada guardada', 'success');
        } catch (error) {
            console.error('Error al guardar posición de portada:', error);
            showAlert('Error', 'No se pudo guardar la posición', 'error');
        }
    };

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        try {
            const compressedFile = await compressImage(file, 1600, 1600, 0.6);
            const url = await uploadImage(compressedFile);
            await updateNegocio(Number(id), { imagen_portada: url });
            setBusinessImage(url);
            showAlert('Éxito', 'Imagen de portada actualizada', 'success');
        } catch (error) {
            console.error('Error al actualizar imagen de portada:', error);
            showAlert('Error', 'No se pudo actualizar la imagen', 'error');
        }
    };

    const getBusinessAddress = () => {
        if (!businessDetails) return '';
        const neg = businessDetails;
        const ubicacion =
            neg.tipo === 'W/M'
                ? [neg.calleAv, neg.manzana ? `Mza ${neg.manzana}` : '', neg.lote ? `Lote ${neg.lote}` : '']
                      .filter(Boolean)
                      .join(', ')
                : [neg.calle, neg.numero ? `#${neg.numero}` : '', neg.colonia].filter(Boolean).join(', ');
        const estadoCiudad = [neg.ciudad, neg.estado].filter(Boolean).join(', ');
        return [ubicacion, estadoCiudad, neg.cp ? `CP ${neg.cp}` : ''].filter(Boolean).join(' · ');
    };

    return {
        businessName,
        setBusinessName,
        businessImage,
        setBusinessImage,
        businessDetails,
        businessAreas,
        setBusinessAreas,
        bannerY,
        setBannerY,
        isAdjustingPosition,
        setIsAdjustingPosition,
        fileInputRef,
        handleBannerChange,
        saveBannerPosition,
        getBusinessAddress,
    };
};
