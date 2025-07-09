import type React from "react"

interface AlertProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "destructive"
}

export function Alert({ children, className = "", variant = "default" }: AlertProps) {
  const variants = {
    default: "border-gray-200 text-gray-900",
    destructive: "border-red-200 bg-red-50 text-red-900",
  }

  return <div className={`relative w-full rounded-lg border p-4 ${variants[variant]} ${className}`}>{children}</div>
}

export function AlertTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <h5 className={`mb-1 font-medium leading-none tracking-tight ${className}`}>{children}</h5>
}

export function AlertDescription({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>
}
