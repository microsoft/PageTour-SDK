interface TokenProviderOptions {
  acquireToken: () => Promise<string>
}

export { TokenProviderOptions }
