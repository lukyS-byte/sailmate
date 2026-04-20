import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import VoyagePage from './pages/VoyagePage'
import ExpensesPage from './pages/ExpensesPage'
import RoutePage from './pages/RoutePage'
import SuppliesPage from './pages/SuppliesPage'
import LogbookPage from './pages/LogbookPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/voyage" element={<VoyagePage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/route" element={<RoutePage />} />
        <Route path="/supplies" element={<SuppliesPage />} />
        <Route path="/log" element={<LogbookPage />} />
      </Routes>
    </Layout>
  )
}
