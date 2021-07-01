import { UserActions } from './useractions'
interface UserActionProvider {
  recordUserAction: (tutorial: any, userAction: string, step: string, operation: string) => Promise<UserActions>
}

export { UserActionProvider }
