import { useNavigate } from "react-router-dom";
import styles from "./ListaTrabajos.module.css";

const trabajos = [
    { id: 1, titulo: "Electricidad - Mc Donals", estado: "Activo" },
    { id: 2, titulo: "Plomería - Mc Donals", estado: "Asignado" },
    { id: 3, titulo: "Pintor - Mc Donals", estado: "Finalizado" }
];

export default function ListaTrabajos() {

    const navigate = useNavigate();

    return (
        <div>

            {trabajos.map((t) => (
                <div
                    key={t.id}
                    className={styles.card}
                    onClick={() => navigate(`/menu/trabajo/${t.id}`)}
                >
                    <h3>{t.titulo}</h3>
                    <p>{t.estado}</p>
                </div>
            ))}

        </div>
    );
}
