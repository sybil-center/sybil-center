export type Optionals<T, Keys extends keyof T> = Omit<T, Keys> & {
  [Key in Keys]?: T[Key]
}
