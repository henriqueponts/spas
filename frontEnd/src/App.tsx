import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Registro from './pages/Registro'
import Login from './pages/Login'

function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}></Route>
        <Route path="/Registro" element={<Registro />}></Route>
        <Route path="/Login" element={<Login />}></Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
