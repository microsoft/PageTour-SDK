interface UserInfoOptions {
  getCurrentUser: () => string
  getCurrentUserPermissions: () => string[]
}

export { UserInfoOptions }
