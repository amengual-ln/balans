import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Movements from './pages/Movements';
import Accounts from './pages/Accounts';
import Cards from './pages/Cards';
import Debts from './pages/Debts';
import Subscriptions from './pages/Subscriptions';
import Investments from './pages/Investments';
import BottomNav from './components/BottomNav';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/debts" element={<Debts />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}
