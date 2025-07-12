"use client"

import type React from "react"
import { useAuth } from "../contexts/AuthContext"
import Header from "../components/Header"
import QuickActions from "../components/QuickActions"

const Home: React.FC = () => {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Bem-vindo(a), {user.nome.split(" ")[0]}!</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">Escolha uma das opções abaixo para começar</p>
        </div>

        {/* Quick Actions */}
        <div className="max-w-6xl mx-auto">
          <QuickActions />
        </div>

        {/* Additional spacing for better visual balance */}
        <div className="h-16"></div>
      </main>
    </div>
  )
}

export default Home
