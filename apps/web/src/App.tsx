import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Movements from './pages/Movements';
import Accounts from './pages/Accounts';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/movements" replace />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/accounts" element={<Accounts />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
