import { PageContext } from '../models/pagecontext'
import { Tutorial } from '../models/tutorial'
import { TutorialSearchFilter } from '../models/tutorialsearchfilter'
import { IPagetourRepository } from '../repository/ipagetourrepository'
import { ConfigStore } from './configstore'

class DataStore {
  private isRepositoryInitialized: boolean
  private repository: IPagetourRepository
  private configStore: ConfigStore

  constructor(repository: IPagetourRepository, configStore: ConfigStore) {
    this.repository = repository
    this.configStore = configStore
  }

  public GetTourById = async (tutorialId: string): Promise<Tutorial> => {
    let repository: IPagetourRepository = await this.GetRepository()
    let token = await this.acquireToken()
    return repository.GetTourById(tutorialId, token)
  }

  public GetToursByPageContext = async (pageContext: any, getFutureAndExpired?: boolean): Promise<Tutorial[]> => {
    let repository: IPagetourRepository = await this.GetRepository()

    let contextParam = {} as PageContext
    const opts = this.configStore.Options
    if ((pageContext === undefined || pageContext === null) && opts.navigator && opts.navigator.getCurrentPageContext) {
      pageContext = opts.navigator.getCurrentPageContext();
      contextParam.state = pageContext.state
      contextParam.url = pageContext.url
    } else {
      if (typeof pageContext === 'string') {
        contextParam.state = pageContext
        contextParam.url = pageContext
      } else {
        if (pageContext.hasOwnProperty('state')) {
          contextParam.state = pageContext.state
        }
        if (pageContext.hasOwnProperty('url')) {
          contextParam.url = pageContext.url
        }
      }
    }

    let pageContextUrl = this.getContextUrlParams(contextParam)
    let searchFilter: TutorialSearchFilter = {
      active: getFutureAndExpired ? !getFutureAndExpired : true,
      pageContextState: pageContextUrl.pageContextState,

      pageContextUrl: pageContextUrl.pageContextUrl,
      includeTags: this.configStore.Options.tags.includedTags,
      excludeTags: this.configStore.Options.tags.excludedTags,
    }
    let token = await this.acquireToken()
    return repository.GetToursByPageContext(searchFilter, token)
  }

  public CreateTour = async (tutorial: Tutorial): Promise<Tutorial> => {
    let repository: IPagetourRepository = await this.GetRepository()
    let token = await this.acquireToken()
    return repository.CreateTour(tutorial, token)
  }

  public UpdateTour = async (tutorial: Tutorial): Promise<Tutorial> => {
    let repository: IPagetourRepository = await this.GetRepository()
    let token = await this.acquireToken()
    return repository.UpdateTour(tutorial, token)
  }

  public DeleteTour = async (tutorialId: string): Promise<Boolean> => {
    let repository: IPagetourRepository = await this.GetRepository()
    let token = await this.acquireToken()
    return repository.DeleteTour(tutorialId, token)
  }

  public ExportTour = async (tutorial: Tutorial): Promise<Tutorial> => {
    if (!this.configStore.Options.exportFeatureFlag) {
      throw new Error('ExportFeatureFlag is turned off')
    }
    let repository: IPagetourRepository = await this.GetRepository()
    if (!repository.ExportTour) {
      throw Error(
        'ExportTour method is not implemented in the repository. Please implement the ExportTour method in order to export tours',
      )
    }
    let token = await this.acquireToken()
    return repository.ExportTour(tutorial, token)
  }

  public isExportTourImplemented = async (): Promise<Boolean> => {
    let repository: IPagetourRepository = await this.GetRepository()
    return !repository.ExportTour == undefined
  }

  private GetRepository = async (): Promise<IPagetourRepository> => {
    if (this.isRepositoryInitialized === undefined || this.isRepositoryInitialized === false) {
      await this.repository.isInitialized().then((response: boolean) => {
        this.isRepositoryInitialized = response
      })
    }
    if (this.isRepositoryInitialized === true) {
      return this.repository
    } else {
      throw Error('Repository has not been initialized, use initialize repository method')
    }
  }

  public getPageContext = (): PageContext => {
    const opts = this.configStore.Options
    let retVal = {} as PageContext

    retVal.state = ''

    let pageContext = window.location.href
      .replace(window.location.host, '')
      .replace(window.location.protocol + '//', '')

    retVal.url = pageContext

    if (opts.navigator && opts.navigator.getCurrentPageContext) {
      retVal = opts.navigator.getCurrentPageContext()
    }

    if (retVal == null) {
      retVal = {} as PageContext
      retVal.state = pageContext
      retVal.url = pageContext
    }

    if (retVal.state == null || retVal.state === '') {
      retVal.state = pageContext
    }

    if (retVal.url == null || retVal.url === '') {
      retVal.url = pageContext
    }

    return retVal
  }

  private getContextUrlParams = (context: PageContext): any => {
    let retValState = ''
    let retValUrl = ''

    if (context.state !== null && context.state !== '') {
      retValState = context.state
    }

    if (context.url !== null && context.url !== '') {
      retValUrl = context.url
    }

    if (retValState !== null && retValState !== '' && (retValUrl !== null && retValUrl !== '')) {
      if (retValState === retValUrl) {
        return {
          pageContextUrl: retValUrl,
          pageContextState: '',
        }
      } else {
        return {
          pageContextUrl: retValUrl,
          pageContextState: retValState,
        }
      }
    } else if (retValState !== null && retValState !== '') {
      return {
        pageContextUrl: retValUrl,
        pageContextState: retValState,
      }
    } else {
      return {
        pageContextUrl: retValUrl,
        pageContextState: '',
      }
    }
  }
  private acquireToken = async (): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const opts = this.configStore.Options
      try {
        let token = opts.tokenProvider.acquireToken()
        resolve(token)
      } catch (err) {
        throw err
      }
    })
  }
}
export { DataStore }
