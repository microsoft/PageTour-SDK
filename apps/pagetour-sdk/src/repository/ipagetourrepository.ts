import { Tutorial } from '../models/tutorial'
import { TutorialSearchFilter } from '../models/tutorialsearchfilter'
import { UserActions } from '../models/useractions'
import { IRepositoryConfiguration } from './irepositoryconfiguration'

interface IPagetourRepository {
  isInitialized(): Promise<boolean>
  /**
   *
   * @param tutorialId Id of the tutorial to be fetched
   * @returns Tutorial with the given tutorial id, if it exists else null
   */
  GetTourById(tutorialId: string, token: string): Promise<Tutorial>

  /**
   *
   * @param pageContextUrl url path to fetch tours created for the specicfic path
   * @param getFutureAndExpired boolean to specify if expired tours need to be fetched
   * @returns List of tours existing in the page context
   */
  GetToursByPageContext(searchFilter: TutorialSearchFilter, token: string): Promise<Tutorial[]>

  /**
   *
   * @param tutorial
   * @returns Created tutorial object
   */
  CreateTour(tutorial: any, token: string): Promise<Tutorial>

  /**
   *
   * @param tutorial
   * @returns Updated tutorial object
   */
  UpdateTour(tutorial: any, token: string): Promise<Tutorial>

  /**
   *
   * @param tutorial
   * @returns boolean denoting delete success status
   */
  DeleteTour(tutorialId: string, token: string): Promise<Boolean>

  /**
   *
   * @param tutorial
   * @returns Exported tutorial object
   */
  ExportTour?(tutorial: any, token: string): Promise<boolean>

  InitializeRepository(repositoryConfiguration?: IRepositoryConfiguration): void
}

export { IPagetourRepository }
