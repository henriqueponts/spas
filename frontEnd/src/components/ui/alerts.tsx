"use client"

import { X, CheckCircle, XCircle, AlertTriangle } from "lucide-react"
import { useState } from "react"

type AlertType = "sucesso" | "erro" | "aviso"

interface AlertProps {
  type: AlertType
  title: string
  message?: string
  onClose?: () => void
  autoClose?: boolean
  autoCloseDuration?: number
}

const alertStyles = {
  sucesso: {
    container: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    title: "text-green-900 dark:text-green-100",
    message: "text-green-700 dark:text-green-300",
    IconComponent: CheckCircle,
  },
  erro: {
    container: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
    message: "text-red-700 dark:text-red-300",
    IconComponent: XCircle,
  },
  aviso: {
    container: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800",
    icon: "text-yellow-600 dark:text-yellow-400",
    title: "text-yellow-900 dark:text-yellow-100",
    message: "text-yellow-700 dark:text-yellow-300",
    IconComponent: AlertTriangle,
  },
}

export function Alert({ type, title, message, onClose, autoClose = false, autoCloseDuration = 5000 }: AlertProps) {
  const [isVisible, setIsVisible] = useState(true)
  const styles = alertStyles[type]
  const IconComponent = styles.IconComponent

  // Auto close functionality
  if (autoClose && isVisible) {
    setTimeout(() => {
      handleClose()
    }, autoCloseDuration)
  }

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border ${styles.container} shadow-sm animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <IconComponent className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />

      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold text-sm ${styles.title}`}>{title}</h3>
        {message && <p className={`mt-1 text-sm ${styles.message}`}>{message}</p>}
      </div>

      <button
        onClick={handleClose}
        className={`flex-shrink-0 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${styles.icon}`}
        aria-label="Fechar alerta"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
