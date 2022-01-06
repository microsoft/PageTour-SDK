import { PageTourAuthor } from './authoringtour/pagetourauthor'
import { PageTourManager } from './managetours/pagetourmanager'
import { PageTourPlay } from './playtour/pagetourplay'
import { ConfigStore } from './common/configstore'
import { PageTourOptions } from './models/pagetouroptions'
import { AuthorizationService } from './common/authorizationservice'
import { LocalStorageService } from './common/localstorage'
import { Tutorial } from './models/tutorial'
import { EventHandler } from './eventhandlers/eventhandler'
import { ContextChangeHandler } from './eventhandlers/contextchangehandler'
import { PageContext } from './models/pagecontext'
import { IPagetourRepository } from './repository/ipagetourrepository'
import { DataStore } from './common/datastore'
class PageTour {
  public static ContextChangeEvent = 'PageTour:ContextChangeEvent'

  private constructor() {
    this.eventHandlers = []
  }
  private static me: PageTour
  private pageTourManager: PageTourManager
  private pageTourAuthor: PageTourAuthor
  private dataStore: DataStore
  private authService: AuthorizationService
  private eventHandlers: EventHandler[]

  /**
   * 
   * @param repository: IPagetourRepository  
   * @param options: PageTourOptions
   * 
   * Initialize the PageTour Library
   */
  public static init = (repository: IPagetourRepository, options: PageTourOptions): Promise<Boolean> => {
    
    return new Promise<Boolean>((resolve, reject)=>{
      if (options.navigator) {
        if (options.navigator.callbackForTags) {
          options.navigator.callbackForTags().then(function (data) {
            options.tags.includedTags = options.tags.includedTags
              ? options.tags.includedTags.concat(data.includedTags)
              : data.includedTags
            options.tags.excludedTags = options.tags.excludedTags
              ? options.tags.excludedTags.concat(data.excludedTags)
              : data.excludedTags
            PageTour.initializePageTourServices(repository, options).then(()=>{
              resolve(true);
            });
          })
        }
      }else{
        PageTour.initializePageTourServices(repository, options).then(()=>{
          resolve(true);
        });
      }
      
    })

    
  }

  private static initializePageTourServices = async (repository: IPagetourRepository, options: PageTourOptions): Promise<void> => {
    PageTour.initializeServices(repository, options)
    let pageContext = PageTour.GetInstance().getPageContext()
    await PageTour.GetInstance().autoPlayByContext(pageContext, 0, false)
    
  }

  /**
   * Get an instance of PageTour
   * @returns Instance of type PageTour
   * @throws Error if library has not been initialized
   */
  public static GetInstance = (): PageTour => {
    if (PageTour.me) {
      return PageTour.me
    }
    throw new Error(
      `The PageTour Library is not yet Initialized. Please call PageTour.init(config) method first with a configuration object.`,
    )
  }

  /**
   * Creates PageTour Manager Dialog and attaches it to the DOM
   */
  public openPageTourManageDialog = async () => {
    await this.pageTourManager.InitManagerDock()
  }

  /**
   * Closes and removes Manage Tour Dialog from the DOM
   */
  public closePageTourManageDialog = () => {
    this.pageTourManager.CloseManagerDock()
  }

  /**
   * Creates PageTour Author Dialog and attaches it to the DOM
   */
  public openPageTourAuthorDialog = () => {
    this.pageTourAuthor.AddTour("Pagetour")
  }

  /**
   * Creates PageTour Edit Dialog and attaches it to the DOM
   */
  public openPageTourEditDialog = (tour: Tutorial) => {
    this.pageTourAuthor.EditTour(tour)
  }
  /**
   * @param tourId: string
   * Deletes tour with the given tourId
   */
  public deleteTourById = async (tourId: string) => {
    await this.pageTourManager.deleteTourById(tourId)
  }

  /**
   * @returns current page context
   */
  public getPageContext = () => {
    return this.dataStore.getPageContext()
  }

  /**
   * @param {*} pageContext
   * @param {*} tags
   * 
   */
  public getTours = async (pageContext: any): Promise<Tutorial[]> => {
    return this.dataStore.GetToursByPageContext(pageContext)
  }

  public autoPlayByContext = async (pageContext: PageContext, startDelay?: any, autoPlayViewedTour: boolean = true) => {
    let startDelayInMs = this.pageTourManager.configStore.Options.tourStartDelayInMs
    if (startDelay) {
      startDelayInMs = startDelay
    }

    await this.pageTourManager.autoPlayByContext(pageContext, startDelayInMs, autoPlayViewedTour)
  }

  public autoPlayByTourId = async (tourId: string, startDelay: any) => {
    let startDelayInMs = this.pageTourManager.configStore.Options.tourStartDelayInMs
    if (startDelay) {
      startDelayInMs = startDelay
    }

    await this.pageTourManager.autoPlayByTourId(tourId, startDelayInMs)
  }

  public autoPlayByTourObject = async (tour: Tutorial, startDelay?: any) => {
    let startDelayInMs = this.pageTourManager.configStore.Options.tourStartDelayInMs
    await this.pageTourManager.autoPlayByTourObject(tour, startDelayInMs)
  }

  public destroy = () => {
    if (!PageTour.me || !PageTour.me.eventHandlers) {
      return
    }
    for (const handler of PageTour.me.eventHandlers) {
      handler.dettach()
    }
    PageTour.me = null
  }

  public isAllowed = async (permission: string): Promise<Boolean> => {
    return this.authService.isAuthorized(permission)
  }

  private static initializeServices = (repository: IPagetourRepository, config: PageTourOptions,) => {
    PageTour.me = new PageTour()
    const configStore = new ConfigStore(config)
    const dataStore = new DataStore(repository, configStore)
    const localStorageService = new LocalStorageService()
    const authorizationService = new AuthorizationService(configStore)
    const pageTourPlay = new PageTourPlay(configStore, dataStore)
    const pageTourAuthor = new PageTourAuthor(pageTourPlay, configStore, dataStore)
    const pageTourManager = new PageTourManager(
      pageTourPlay,
      pageTourAuthor,
      authorizationService,
      configStore,
      dataStore,
    )

    PageTour.me.eventHandlers.push(new ContextChangeHandler(pageTourManager, configStore))

    for (const handler of PageTour.me.eventHandlers) {
      handler.attach()
    }

    PageTour.me.pageTourManager = pageTourManager
    PageTour.me.pageTourAuthor = pageTourAuthor
    PageTour.me.dataStore = dataStore
    PageTour.me.authService = authorizationService
  }
}

export { PageTour, Tutorial, IPagetourRepository }
