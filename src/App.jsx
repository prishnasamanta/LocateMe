import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Owner from './pages/Owner';
import Visitor from './pages/Visitor';

export default function App() {
  return (
    <div className="min-h-dvh bg-mesh">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<Owner />} />
        <Route path="/l/:id" element={<Visitor />} />
      </Routes>
    </div>
  );
}
