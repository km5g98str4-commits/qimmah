export class PortabilityError extends Error {
  store?: string

  constructor(message: string, store?: string) {
    super(message)
    this.name = 'PortabilityError'
    this.store = store
  }
}
