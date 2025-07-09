interface SeparatorProps {
  className?: string
}

export function Separator({ className = "" }: SeparatorProps) {
  return <div className={`shrink-0 bg-gray-200 h-px w-full ${className}`} />
}
