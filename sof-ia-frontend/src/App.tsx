import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

/**
 * Componente principal de la aplicación
 * Configura el enrutador de React Router
 */
function App() {
  return <RouterProvider router={router} />;
}

export default App;