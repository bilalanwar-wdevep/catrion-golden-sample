import './App.css'
import Header from './components/Header'
import { SystemDetailsForm } from './components/SystemDetails'

function App() {
  return (
    <div className="h-screen w-screen bg-gray-900 text-white overflow-hidden flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <SystemDetailsForm />
      </main>
    </div>
  )
}

export default App