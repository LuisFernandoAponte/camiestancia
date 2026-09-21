export type EstadoBovino = "disponible" | "vendido" | "cuarentena" | "preñez" | "fallecido";

export interface Bovino {
  id: string;
  chip: string;
  nombre: string;
  raza: string;
  sexo: "M" | "H";
  nacimiento: string;
  pesoInicial: number;
  pesoActual: number;
  potrero: string;
  estado: EstadoBovino;
  precio?: number;
  foto: string;
}

import bull from "@/assets/bull-portrait.jpg";
import calves from "@/assets/calves.jpg";
import hero from "@/assets/hero-cattle.jpg";

export const bovinos: Bovino[] = [
  { id: "EG-001", chip: "BO-7710-001", nombre: "Imperador", raza: "Nelore PO", sexo: "M", nacimiento: "2021-03-12", pesoInicial: 32, pesoActual: 780, potrero: "Norte-A", estado: "disponible", precio: 4200, foto: bull },
  { id: "EG-002", chip: "BO-7710-002", nombre: "Estrela", raza: "Brahman", sexo: "H", nacimiento: "2022-06-08", pesoInicial: 28, pesoActual: 510, potrero: "Sur-B", estado: "preñez", foto: calves },
  { id: "EG-003", chip: "BO-7710-003", nombre: "Trovão", raza: "Nelore", sexo: "M", nacimiento: "2020-11-20", pesoInicial: 30, pesoActual: 920, potrero: "Norte-C", estado: "disponible", precio: 5100, foto: bull },
  { id: "EG-004", chip: "BO-7710-004", nombre: "Aurora", raza: "Gyr Lechero", sexo: "H", nacimiento: "2023-01-15", pesoInicial: 26, pesoActual: 380, potrero: "Este-A", estado: "cuarentena", foto: calves },
  { id: "EG-005", chip: "BO-7710-005", nombre: "Sertão", raza: "Brahman", sexo: "M", nacimiento: "2021-08-30", pesoInicial: 31, pesoActual: 690, potrero: "Sur-A", estado: "vendido", foto: hero },
  { id: "EG-006", chip: "BO-7710-006", nombre: "Luna", raza: "Nelore PO", sexo: "H", nacimiento: "2022-12-02", pesoInicial: 27, pesoActual: 450, potrero: "Este-B", estado: "disponible", precio: 3800, foto: calves },
  { id: "EG-007", chip: "BO-7710-007", nombre: "Caudilho", raza: "Brangus", sexo: "M", nacimiento: "2020-05-18", pesoInicial: 33, pesoActual: 1010, potrero: "Norte-A", estado: "disponible", precio: 5600, foto: bull },
  { id: "EG-008", chip: "BO-7710-008", nombre: "Manaca", raza: "Nelore", sexo: "H", nacimiento: "2023-04-22", pesoInicial: 25, pesoActual: 320, potrero: "Sur-C", estado: "preñez", foto: calves },
];

export const eventosSalud = [
  { id: 1, animal: "EG-001", tipo: "Vacuna Aftosa", fecha: "2026-05-10", proxima: "2026-11-10", veterinario: "Dr. Mendoza", estado: "aplicada" },
  { id: 2, animal: "EG-004", tipo: "Tratamiento parasitario", fecha: "2026-05-18", proxima: "2026-08-18", veterinario: "Dra. Rivero", estado: "aplicada" },
  { id: 3, animal: "EG-002", tipo: "Chequeo preñez", fecha: "2026-05-20", proxima: "2026-06-20", veterinario: "Dr. Mendoza", estado: "pendiente" },
  { id: 4, animal: "EG-008", tipo: "Vacuna Brucelosis", fecha: "2026-04-30", proxima: "2026-10-30", veterinario: "Dra. Rivero", estado: "aplicada" },
  { id: 5, animal: "EG-006", tipo: "Desparasitación", fecha: "2026-05-25", proxima: "2026-08-25", veterinario: "Dr. Mendoza", estado: "pendiente" },
];

export const reproduccion = [
  { id: 1, hembra: "EG-002", padre: "EG-001", inseminacion: "2025-12-15", gestacion: 157, partoEstimado: "2026-09-21", estado: "confirmada" },
  { id: 2, hembra: "EG-008", padre: "EG-007", inseminacion: "2026-01-20", gestacion: 121, partoEstimado: "2026-10-27", estado: "confirmada" },
  { id: 3, hembra: "EG-006", padre: "EG-003", inseminacion: "2026-05-02", gestacion: 19, partoEstimado: "2027-02-06", estado: "evaluación" },
];

export const finanzas = {
  ingresosMes: 78450,
  egresosMes: 32100,
  margen: 46350,
  proyeccionAnual: 612000,
  porLote: [
    { lote: "Lote 24-A", ingresos: 32400, egresos: 12800 },
    { lote: "Lote 24-B", ingresos: 21800, egresos: 8900 },
    { lote: "Lote 25-A", ingresos: 24250, egresos: 10400 },
  ],
  serie: [
    { mes: "Ene", ingresos: 48000, egresos: 22000 },
    { mes: "Feb", ingresos: 52000, egresos: 25000 },
    { mes: "Mar", ingresos: 61000, egresos: 28000 },
    { mes: "Abr", ingresos: 70000, egresos: 30000 },
    { mes: "May", ingresos: 78450, egresos: 32100 },
  ],
};

export const alertasWA = [
  { id: 1, animal: "EG-002", tipo: "Parto próximo", mensaje: "Recordatorio: parto estimado de Estrela (EG-002) el 21/09/2026.", destinatario: "Dr. Mendoza", telefono: "59171234567" },
  { id: 3, animal: "EG-006", tipo: "Desparasitación", mensaje: "Tratamiento pendiente para Luna (EG-006) - 25/05/2026.", destinatario: "Gestor de campo", telefono: "59172345678" },
  { id: 2, animal: "EG-001", tipo: "Vacuna programada", mensaje: "Próxima vacuna aftosa de Imperador (EG-001): 10/11/2026.", destinatario: "Veterinario", telefono: "59171234567" },
];

export const testimonios = [
  { nombre: "Carlos Mendoza", cargo: "Frigorífico San Javier", texto: "La genética y el manejo de La Estancia Guayaba son referencia en el oriente boliviano. Trabajamos con ellos hace 12 años." },
  { nombre: "Ana Paula Soruco", cargo: "Ganadera independiente", texto: "Compré tres vientres y el seguimiento postventa fue impecable. Animales sanos y con genealogía documentada." },
  { nombre: "Roberto Áñez", cargo: "Cooperativa Pailón", texto: "Su programa de inseminación nos ayudó a mejorar el rendimiento del hato en menos de dos zafras." },
];
