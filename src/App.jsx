import { Navigate, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Owner from './pages/Owner';
import Visitor from './pages/Visitor';
import JoinDevice from './pages/JoinDevice';

export default function App() {
  return (
    <div className="min-h-dvh bg-mesh">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Owner />} />
        <Route path="/join" element={<JoinDevice />} />
        <Route path="/l/:id" element={<Visitor />} />
        <Route path="/setup" element={<Navigate to="/create" replace />} />
        <Route path="/google-track" element={<Navigate to="/create" replace />} />
      </Routes>
    </div>
  );
}
