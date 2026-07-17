import { NavLink, Route, Routes } from "react-router-dom";
import { useCarrera } from "./context/CarreraContext";
import { excelExportUrl } from "./api/client";
import DashboardPage from "./pages/DashboardPage";
import AlumnosPage from "./pages/AlumnosPage";
import TrayectoriaPage from "./pages/TrayectoriaPage";
import ResumenCohortePage from "./pages/ResumenCohortePage";
import RetencionPage from "./pages/RetencionPage";
import AprobacionPage from "./pages/AprobacionPage";
import PromediosPage from "./pages/PromediosPage";
import TitulacionPage from "./pages/TitulacionPage";
import EgresoPage from "./pages/EgresoPage";
import ImportarPage from "./pages/ImportarPage";
import BitacoraPage from "./pages/BitacoraPage";
import AdminPage from "./pages/AdminPage";

function nav(className: { isActive: boolean }) {
  return className.isActive ? "active" : "";
}

export default function App() {
  const { carreras, carreraActual, setCarreraActual } = useCarrera();

  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>Trayectoria Escolar</h1>
        <nav>
          <NavLink to="/" end className={nav}>Dashboard</NavLink>
          <NavLink to="/alumnos" className={nav}>Alumnos</NavLink>

          <div className="group-title">Informes</div>
          <NavLink to="/resumen-cohorte" className={nav}>Resumen por cohorte</NavLink>
          <NavLink to="/retencion" className={nav}>Retención y rezago</NavLink>
          <NavLink to="/aprobacion" className={nav}>Aprobación por materia</NavLink>
          <NavLink to="/promedios" className={nav}>Promedio / reprobación</NavLink>
          <NavLink to="/titulacion" className={nav}>Titulación</NavLink>
          <NavLink to="/egreso" className={nav}>Egreso</NavLink>

          <div className="group-title">Datos</div>
          <NavLink to="/importar" className={nav}>Importar CSV</NavLink>
          <NavLink to="/bitacora" className={nav}>Bitácora de cargas</NavLink>
          <NavLink to="/administracion" className={nav}>Administración</NavLink>
        </nav>
      </aside>

      <div className="main">
        <div className="topbar">
          <select value={carreraActual} onChange={(e) => setCarreraActual(e.target.value)}>
            {carreras.length === 0 && <option value="">(sin carreras cargadas)</option>}
            {carreras.map((c) => (
              <option key={c.id} value={c.clave}>
                {c.nombre}
              </option>
            ))}
          </select>
          {carreraActual && (
            <a href={excelExportUrl(carreraActual)}>
              <button className="secundario">Exportar a Excel</button>
            </a>
          )}
        </div>

        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/alumnos" element={<AlumnosPage />} />
          <Route path="/alumnos/:cve" element={<TrayectoriaPage />} />
          <Route path="/resumen-cohorte" element={<ResumenCohortePage />} />
          <Route path="/retencion" element={<RetencionPage />} />
          <Route path="/aprobacion" element={<AprobacionPage />} />
          <Route path="/promedios" element={<PromediosPage />} />
          <Route path="/titulacion" element={<TitulacionPage />} />
          <Route path="/egreso" element={<EgresoPage />} />
          <Route path="/importar" element={<ImportarPage />} />
          <Route path="/bitacora" element={<BitacoraPage />} />
          <Route path="/administracion" element={<AdminPage />} />
        </Routes>
      </div>
    </div>
  );
}
