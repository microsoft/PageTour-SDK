import { ConfigStore } from './configstore'

class AuthorizationService {
  constructor(private configStore: ConfigStore) {}

  public getCurrentUserRoles = async (): Promise<string[]> => {
    return this.configStore.Options.userInfo.getCurrentUserPermissions()
  }

  public isAuthorized = async (permission: string): Promise<Boolean> => {
    const roles: any = await this.getCurrentUserRoles()
    return roles.indexOf(permission) !== -1
  }

  public isAuthorizedToAddTour = async (): Promise<Boolean> => {
    const roles: any = await this.getCurrentUserRoles()
    return roles.indexOf('admin') !== 1 || roles.indexOf('create') !== -1
  }

  public isAuthorizedToEditTour = async (): Promise<Boolean> => {
    const roles: any = await this.getCurrentUserRoles()
    return roles.indexOf('admin') !== 1 || roles.indexOf('update') !== -1
  }

  public isAuthorizedToExportTour = async (): Promise<Boolean> => {
    const roles: any = await this.getCurrentUserRoles()
    return roles.indexOf('admin') !== 1 || roles.indexOf('export') !== -1
  }

  public isAuthorizedToDeleteTour = async (): Promise<Boolean> => {
    const roles: any = await this.getCurrentUserRoles()
    return roles.indexOf('admin') !== 1 || roles.indexOf('delete') !== -1
  }
}

export { AuthorizationService }
