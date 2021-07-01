import { ConfigStore } from './configstore'
import { PageContext } from '../models/pagecontext'

class DataService {
  private configStore: ConfigStore

  constructor(configStore: ConfigStore) {
    this.configStore = configStore
  }

  public httpRequest = <T>(url: string, type: string, data: any): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      this.acquireToken((token: string) => {
        let requestData = data
        if (type !== 'GET' && type !== 'DELETE') {
          requestData = JSON.stringify(data)
        }

        const ajaxRequest = new XMLHttpRequest()
        ajaxRequest.open(type.toUpperCase(), url, true)
        ajaxRequest.setRequestHeader('Content-Type', 'application/json')
        ajaxRequest.setRequestHeader('Authorization', `Bearer ${token}`)
        ajaxRequest.onreadystatechange = () => {
          if (ajaxRequest.readyState === 4) {
            if (ajaxRequest.status !== 200) {
              reject(ajaxRequest.responseText)
            } else {
              const response = JSON.parse(ajaxRequest.responseText) as T
              resolve(response)
            }
          }
        }
        ajaxRequest.send(requestData)
      })
    })
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
      retVal = opts.navigator.getCurrentPageContext(retVal)
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

  public getContextUrlString = (context: PageContext): string => {
    let retValState = ''
    let retValUrl = ''

    if (context.state !== null && context.state !== '') {
      retValState = encodeURIComponent(context.state)
    }

    if (context.url !== null && context.url !== '') {
      retValUrl = encodeURIComponent(context.url)
    }

    if (retValState !== null && retValState !== '' && (retValUrl !== null && retValUrl !== '')) {
      if (retValState === retValUrl) {
        return 'pageContextUrl=' + retValUrl
      } else {
        return 'pageContextState=' + retValState + '&pageContextUrl=' + retValUrl
      }
    } else if (retValState !== null && retValState !== '') {
      return 'pageContextState=' + retValState
    } else {
      return 'pageContextUrl=' + retValUrl
    }
  }

  public getContextUrlParams = (context: PageContext): any => {
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

  public acquireToken = (callback: (token: string) => void) => {
    const opts = this.configStore.Options
    opts.tokenProvider.acquireToken()
  }
}

export { DataService }
