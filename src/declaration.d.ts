interface Window {
  LANG: string
  TRANSLATION: Record<string, any>
  DAILY: {
    startingDate: string
    names: string[]
  }
  clipboardData?: {
    setData?: (title: string, s: string) => void
  }
}

declare module '*.csv' {
  const out: Array<{ [key: string]: any }>
  export default out
}
