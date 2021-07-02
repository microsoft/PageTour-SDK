interface IRepositoryConfiguration {
  baseUrl: string
  getEndPoint?: string
  postEndPoint?: string
  deleteEndPoint?: string
  putEndPoint?: string
  exportEndpoint?: string
}

export { IRepositoryConfiguration }
