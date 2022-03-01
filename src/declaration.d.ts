interface Window {
  LANG: string
  tr: Record<string, any>
  clipboardData?: {
    setData?: (title: string, s: string) => void
  }
}

declare const require: (m: string) => any

declare module '*.csv' {
  const out: Array<{ [key: string]: any }>
  export default out
}
