interface Window {
  LANG: string
  clipboardData?: {
    setData?: (title: string, s: string) => void
  }
}

declare module '*.csv' {
  const out: Array<{ [key: string]: any }>
  export default out
}
