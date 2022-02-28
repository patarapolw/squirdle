interface Window {
  clipboardData?: {
    setData?: (title: string, s: string) => void
  }
}

declare const require: (m: string) => any
