import type React from "react"

interface CardProps {
  children: React.ReactNode
  className?: string
}

export function Card({ children, className = "" }: CardProps) {
  return <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>{children}</div>
}

export function CardHeader({ children, className = "" }: CardProps) {
  return <div className={`p-6 pb-4 ${className}`}>{children}</div>
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`p-6 pt-0 ${className}`}>{children}</div>
}

export function CardTitle({ children, className = "" }: CardProps) {
  return <h3 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
}

export function CardDescription({ children, className = "" }: CardProps) {
  return <p className={`text-sm text-gray-600 mt-1 ${className}`}>{children}</p>
}

export function CardFooter({ children, className = "" }: CardProps) {
  return <div className={`flex items-center p-6 border-t border-gray-200 ${className}`}>{children}</div>
}