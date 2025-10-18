"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { Alert } from "./alerts"

type AlertType = "sucesso" | "erro" | "aviso"

interface AlertData {
  id: string
  type: AlertType
  title: string
  message?: string
  autoClose?: boolean
}

interface AlertContextType {
  showAlert: (type: AlertType, title: string, message?: string, autoClose?: boolean) => void
  showSucesso: (title: string, message?: string) => void
  showErro: (title: string, message?: string) => void
  showAviso: (title: string, message?: string) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertData[]>([])

  const showAlert = (type: AlertType, title: string, message?: string, autoClose = true) => {
    const id = Math.random().toString(36).substring(7)
    setAlerts((prev) => [...prev, { id, type, title, message, autoClose }])
  }

  const showSucesso = (title: string, message?: string) => {
    showAlert("sucesso", title, message, true)
  }

  const showErro = (title: string, message?: string) => {
    showAlert("erro", title, message, true)
  }

  const showAviso = (title: string, message?: string) => {
    showAlert("aviso", title, message, true)
  }

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id))
  }

  return (
    <AlertContext.Provider value={{ showAlert, showSucesso, showErro, showAviso }}>
      {children}

      {/* Container de alertas fixo no topo */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
        <div className="pointer-events-auto space-y-3">
          {alerts.map((alert) => (
            <Alert
              key={alert.id}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              autoClose={alert.autoClose}
              onClose={() => removeAlert(alert.id)}
            />
          ))}
        </div>
      </div>
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("useAlert deve ser usado dentro de um AlertProvider")
  }
  return context
}
