import React from 'react';
import { useNavigate } from 'react-router-dom';
import { isAutonomoAdmin } from '../../../utils/roles';
import type { Trabajo } from '../../../types/trabajo.types';

interface SummaryGridProps {
    flatJobs: Trabajo[];
    activeSummaryTab: string | null;
    setActiveSummaryTab: (tab: string | null) => void;
    user: any;
    styles: Record<string, string>;
}

/**
 * Tablero mini de conteos por estado. Muestra 6 columnas clickeables que
 * expanden una lista de mini-cards para ese estado.
 */
const SummaryGrid: React.FC<SummaryGridProps> = ({
    flatJobs,
    activeSummaryTab,
    setActiveSummaryTab,
    user,
    styles,
}) => {
    const navigate = useNavigate();

    const colPorAutorizar = flatJobs.filter(t => ['Solicitud', 'Pendiente', 'Cotización Enviada'].includes(t.estado) && t.prioridad !== 'Emergencia');
    const colSosActivo = flatJobs.filter(t => t.prioridad === 'Emergencia' && !['Finalizado', 'Completado', 'Rechazada', 'Cotización Rechazada'].includes(t.estado));
    const colAutorizados = flatJobs.filter(t => ['En Espera', 'Aceptada', 'Cotización Aceptada'].includes(t.estado) && t.prioridad !== 'Emergencia');
    const colPorHacer = flatJobs.filter(t => t.estado === 'Asignado' && t.tipo !== 'Trabajo' && t.prioridad !== 'Emergencia');
    const colEnProceso = flatJobs.filter(t => (t.estado === 'En Proceso' || (t.estado === 'Asignado' && t.tipo === 'Trabajo')) && t.prioridad !== 'Emergencia');
    const colFinalizados = flatJobs.filter(t => ['Finalizado', 'Completado'].includes(t.estado));

    const getBasePath = (): string => {
        if (user?.role === 'tecnico') return '/tecnico';
        if (user?.role === 'cliente') return '/cliente';
        if (isAutonomoAdmin(user?.role)) return '/autonomo';
        if (user?.role === 'encargado' || user?.role === 'gerente-sucursal') return '/gerente-sucursal';
        return '/menu';
    };

    const renderMiniCard = (trabajo: any) => {
        const encargados = trabajo.negocio?.encargados || [];
        const nombreEncargado = encargados.length > 0 ? encargados[0].name : (trabajo.negocio?.encargado !== 'No Especificado' ? trabajo.negocio?.encargado : '');
        const enviadoPor = nombreEncargado ? `${nombreEncargado} (Encargado)` : '(Encargado)';
        const problema = trabajo.descripcion || trabajo.titulo;

        return (
            <div
                key={trabajo.id}
                style={{
                    padding: '14px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0',
                    cursor: 'pointer', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', transition: 'transform 0.15s, box-shadow 0.15s'
                }}
                onClick={() => {
                    const basePath = getBasePath();
                    if (trabajo.isMantenimiento) {
                        navigate(`${basePath}/mantenimiento-detalle/${trabajo.original_id}`);
                    } else {
                        navigate(`${basePath}/trabajo-detalle/${trabajo.id}`);
                    }
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}>#{trabajo.id} - {trabajo.titulo}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', marginLeft: '8px' }}>{trabajo.fecha}</div>
                </div>
                <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px', lineHeight: '1.4' }}>
                    <strong>Enviado por:</strong> {enviadoPor}<br />
                    <strong>Problema:</strong> {problema}
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>{trabajo.prioridad || 'Media'}</span>
                    <span style={{ fontSize: '10px', background: '#fffbeb', padding: '3px 8px', borderRadius: '4px', color: '#b45309', fontWeight: 600 }}>{trabajo.estado}</span>
                </div>
            </div>
        );
    };

    // Vista de detalle de una columna
    if (activeSummaryTab) {
        const tabMap: Record<string, { items: any[]; badgeBg: string }> = {
            'Por Autorizar': { items: colPorAutorizar, badgeBg: '#eab308' },
            'SOS Activo':    { items: colSosActivo,    badgeBg: '#ef4444' },
            'Autorizados':   { items: colAutorizados,  badgeBg: '#3b82f6' },
            'Por Hacer':     { items: colPorHacer,     badgeBg: '#f97316' },
            'En Proceso':    { items: colEnProceso,    badgeBg: '#10b981' },
            'Finalizados':   { items: colFinalizados,  badgeBg: '#a855f7' },
        };
        const { items = [], badgeBg = '#f59e0b' } = tabMap[activeSummaryTab] || {};

        return (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <button
                        onClick={() => setActiveSummaryTab(null)}
                        style={{
                            background: '#f1f5f9', border: 'none', color: '#475569', fontWeight: 700, fontSize: '12px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '8px', transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                    >
                        ← Volver
                    </button>
                    <span style={{
                        fontSize: '11px', fontWeight: 800, textTransform: 'uppercase',
                        background: badgeBg, color: 'white', padding: '4px 10px', borderRadius: '12px'
                    }}>
                        {activeSummaryTab} ({items.length})
                    </span>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '320px', paddingRight: '4px' }}>
                    {items.map(renderMiniCard)}
                    {items.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>
                            No hay trabajos en esta sección.
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Vista de cuadrícula principal
    const TABS = [
        { key: 'Por Autorizar', icon: '🟡', count: colPorAutorizar.length, cls: styles.miniCardYellow },
        { key: 'SOS Activo',    icon: '🔴', count: colSosActivo.length,    cls: styles.miniCardRed    },
        { key: 'Autorizados',   icon: '🔵', count: colAutorizados.length,  cls: styles.miniCardBlue   },
        { key: 'Por Hacer',     icon: '🟠', count: colPorHacer.length,     cls: styles.miniCardOrange },
        { key: 'En Proceso',    icon: '🟢', count: colEnProceso.length,    cls: styles.miniCardGreen  },
        { key: 'Finalizados',   icon: '🟣', count: colFinalizados.length,  cls: styles.miniCardPurple },
    ];

    return (
        <div className={styles.miniTableroGrid}>
            {TABS.map(tab => (
                <div key={tab.key} className={`${styles.miniCard} ${tab.cls}`} onClick={() => setActiveSummaryTab(tab.key)}>
                    <span className={styles.miniIcon}>{tab.icon}</span>
                    <span className={styles.miniCount}>{tab.count}</span>
                    <span className={styles.miniLabel}>{tab.key}</span>
                </div>
            ))}
        </div>
    );
};

export default SummaryGrid;
