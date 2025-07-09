import type React from "react"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "outline"
  className?: string
}

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"

  const variants = {
    default: "bg-blue-100 text-blue-800",
    outline: "border border-gray-200 text-gray-700",
  }

  return <span className={`${baseClasses} ${variants[variant]} ${className}`}>{children}</span>
}
