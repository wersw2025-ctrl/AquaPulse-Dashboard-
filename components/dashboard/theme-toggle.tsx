'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle light and dark mode"
      className="group relative inline-flex h-8 w-[3.75rem] shrink-0 items-center rounded-full border border-surface-border bg-secondary p-0.5 transition-[color,background-color,border-color,transform] duration-300 ease-in-out hover:border-primary/40 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        aria-hidden="true"
        className="absolute left-0.5 top-0.5 size-[1.625rem] rounded-full bg-card shadow-sm ring-1 ring-black/5 transition-[transform,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] dark:translate-x-7 dark:bg-primary dark:shadow-[0_0_14px_-2px_var(--primary)] dark:ring-white/10"
      />
      <span className="relative z-10 flex size-[1.625rem] items-center justify-center text-primary transition-colors duration-300 dark:text-muted-foreground">
        <Sun
          className="size-3.5 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-45 dark:-rotate-90 dark:scale-75 dark:group-hover:-rotate-90"
          aria-hidden="true"
        />
      </span>
      <span className="relative z-10 flex size-[1.625rem] items-center justify-center text-muted-foreground transition-colors duration-300 dark:text-primary-foreground">
        <Moon
          className="size-3.5 rotate-90 scale-75 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:rotate-0 dark:scale-100 dark:group-hover:-rotate-12"
          aria-hidden="true"
        />
      </span>
    </button>
  )
}
