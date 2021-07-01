class LocalStorageService {
  public get = <T>(key: string): T => {
    if (window.localStorage) {
      const val = window.localStorage.getItem(key)
      return JSON.parse(val)
    }

    return null
  }

  public set = <T>(key: string, object: T): void => {
    if (!key) {
      throw new Error(`Please provide a key while storing the object`)
    }
    if (window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(object))
    }
  }
}

export { LocalStorageService }
