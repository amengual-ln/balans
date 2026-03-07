import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Movements from './pages/Movements';
import Accounts from './pages/Accounts';
import Cards from './pages/Cards';
import Debts from './pages/Debts';
import Subscriptions from './pages/Subscriptions';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/movements" replace />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
