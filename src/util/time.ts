export const msToHours = (ms: number) => {
    return Math.floor(ms / 1000 / 60 / 60)
  }
  
export const msToMinutes = (ms: number) => {
    return Math.floor(ms % 3600000 / 1000 / 60)
  }
  
export const msToSeconds = (ms: number) => {
    return Math.floor(ms % 60000 / 1000)
  }
  
export const msToTime = (ms: number) => {
    const hours = msToHours(ms)
    const minutes = msToMinutes(ms)
    const seconds = msToSeconds(ms)
    return `${hours ? hours : ''}${hours ? 'h ' : ''}${minutes}m ${seconds}s`
  }