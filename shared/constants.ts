export const DEFAULT_TIME_CONTROL = '10+0'

export const TIME_CONTROL_CATEGORIES = [
  {
    key: 'bullet',
    label: 'Bullet',
    options: ['1+0', '2+1'],
  },
  {
    key: 'blitz',
    label: 'Blitz',
    options: ['3+0', '3+2', '5+0', '5+3'],
  },
  {
    key: 'rapid',
    label: 'Rapid',
    options: ['10+0', '15+10'],
  },
  {
    key: 'classical',
    label: 'Classical',
    options: ['30+0', '30+20'],
  },
] as const

export type TimeControlCategory = typeof TIME_CONTROL_CATEGORIES[number]['key']

export function parseTimeControl(tc: string) {
  const [base, inc] = tc.split('+').map(Number)
  return {
    base: (base || 10) * 60 * 1000,
    increment: (inc || 0) * 1000,
  }
}
