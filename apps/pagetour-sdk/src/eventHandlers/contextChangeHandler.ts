import { EventHandler } from './eventHandler'
import { PageTour } from '../pagetour'
import { PageTourManager } from '../manageTours/pagetourManager'
import { ConfigStore } from '../common/configstore'

class ContextChangeHandler implements EventHandler {
  constructor(private pageTourManager: PageTourManager, private configStore: ConfigStore) {}

  attach() {
    document.addEventListener(PageTour.ContextChangeEvent, this.handleContextChanged)
  }
  dettach() {
    document.removeEventListener(PageTour.ContextChangeEvent, this.handleContextChanged)
  }

  private handleContextChanged = async () => {
    const tourId = this.extractUrlValue('tourId', window.location.href)
    const autoplayTest = this.extractUrlValue('autoplay', window.location.href)
    if (tourId && autoplayTest == null) {
      await this.pageTourManager.autoPlayByTourId(tourId, this.configStore.Options.tourStartDelayInMs)
    } else if (this.configStore.Options.autoPlayEnabled && tourId && autoplayTest) {
      return new Promise((resolve) =>
        setTimeout(() => this.pageTourManager.autoPlayTest(tourId, this.configStore.Options.autoPlayDelay), 5000),
      )
    }
  }

  private extractUrlValue = (key: string, url: string) => {
    if (typeof url === 'undefined') {
      url = window.location.href
    }
    url = this.recursiveDecodeURIComponent(url)
    const match = url.match('[?&]' + key + '=([^&]+)')
    return match ? match[1] : null
  }

  private recursiveDecodeURIComponent = (uriComponent: string): string => {
    try {
      const decodedURIComponent = decodeURIComponent(uriComponent)
      if (decodedURIComponent === uriComponent) {
        return decodedURIComponent
      }
      return this.recursiveDecodeURIComponent(decodedURIComponent)
    } catch (e) {
      return uriComponent
    }
  }
}

export { ContextChangeHandler }
