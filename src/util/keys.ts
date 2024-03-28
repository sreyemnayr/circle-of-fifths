
export const keyString = (keyInt: number, mode: number = -1) => {
    const major_notes = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']
    const minor_notes = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']
    if (keyInt < 0) {
      return "?"
    }
    if (mode == 1){
      return major_notes[keyInt % 12]
    } else if (mode == 0) {
      return minor_notes[keyInt % 12] + "m"
    } else {
      return `${major_notes[keyInt % 12]} / ${minor_notes[relativeKey(keyInt, 1)]}m`
    }
  }
  
  export const relativeKey = (keyInt: number, mode: number) => {
    if(mode == 1) {
      return majorKeyIntToMinor(keyInt)
    } else {
      return minorKeyIntToMajor(keyInt)
    }
  }
  
  export const majorKeyIntToMinor = (keyInt: number) => (keyInt + 9) % 12
  
  export const minorKeyIntToMajor = (keyInt: number) => (keyInt + 3) % 12
  
  export const upOneFifth = (key: number, mode: number) => (mode == 1) ? [relativeKey((key + 7) % 12, 1), (key + 7) % 12] : [relativeKey((relativeKey(key,0) + 7) % 12, 1), (relativeKey(key,0) + 7) % 12 ]