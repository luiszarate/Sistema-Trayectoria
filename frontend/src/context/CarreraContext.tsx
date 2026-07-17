import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { get } from "../api/client";
import type { Carrera } from "../api/types";

interface CarreraContextValue {
  carreras: Carrera[];
  carreraActual: string;
  setCarreraActual: (clave: string) => void;
  recargarCarreras: () => void;
}

const CarreraContext = createContext<CarreraContextValue | null>(null);

export function CarreraProvider({ children }: { children: ReactNode }) {
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [carreraActual, setCarreraActualState] = useState<string>(
    () => localStorage.getItem("carreraActual") || ""
  );

  const cargar = () => {
    get<Carrera[]>("/carreras").then((data) => {
      setCarreras(data);
      if (!carreraActual && data.length > 0) {
        setCarreraActualState(data[0].clave);
      }
    });
  };

  useEffect(cargar, []);

  const setCarreraActual = (clave: string) => {
    setCarreraActualState(clave);
    localStorage.setItem("carreraActual", clave);
  };

  return (
    <CarreraContext.Provider value={{ carreras, carreraActual, setCarreraActual, recargarCarreras: cargar }}>
      {children}
    </CarreraContext.Provider>
  );
}

export function useCarrera() {
  const ctx = useContext(CarreraContext);
  if (!ctx) throw new Error("useCarrera debe usarse dentro de CarreraProvider");
  return ctx;
}
