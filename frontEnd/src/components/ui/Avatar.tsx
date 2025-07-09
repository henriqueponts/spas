import type React from "react"

interface AvatarProps {
  children: React.ReactNode
  className?: string
}

export function Avatar({ children, className = "" }: AvatarProps) {
  return <div className={`relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full ${className}`}>{children}</div>
}

export function AvatarFallback({ children, className = "" }: AvatarProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-gray-100 text-gray-600 text-sm font-medium ${className}`}
    >
      {children}
    </div>
  )
}
