import { PageTourOptions } from '../models/pagetouroptions'
import { PageContext } from '../models/pagecontext'

class ConfigStore {
  private options: PageTourOptions
  private defaultOptions: PageTourOptions = {
    autoPlayDelay: 5000,
    tourStartDelayInMs: 500,
    exportFeatureFlag: true,
    autoPlayEnabled: true,
    isCoverPageTourStart: false,
    enableTranscript: false,
    theme: {
      primaryColor: '#0063b1',
      secondaryColor: '#fdfdfd',
      textColor: '#252423',
      navigationButtonColor: '#0063b1',
      isRounded: false
    },
    navigator: {
      navigateToContext: (context: PageContext) => {
        const url = `${location.origin}${context.url}`
        if (location.href.startsWith(url)) {
          return
        }
        const newUrl = window.location.protocol + '//' + window.location.host + context.url
        if (window.location.href !== newUrl) {
          window.location.href = newUrl
        }
      },
      getCurrentPageContext: (): PageContext => {
        let context: any = {}
        const pageUrl = window.location.href
          .replace(window.location.host, '')
          .replace(window.location.protocol + '//', '')

        context.state = pageUrl
        context.url = pageUrl
        return context
      },
    },
    tokenProvider: {
      acquireToken: () => {
        return null
      },
    },
    userActionProvider: {
      recordUserAction: (tutorial: any, userAction: string, step: string, operation: string) => {
        //'record user action function not implemented'
        return null
      },
    },
    userInfo: {
      getCurrentUser: () => {
        //'Please Provide userInfo.getCurrentUser function in the configuration'
        return ''
      },
      getCurrentUserPermissions: () => {
        //'Please Provide userInfo.getCurrentUserPermissions function in the configuration'
        return ['admin']
      },
    },
    tags: {
      includedTags: [],
      excludedTags: [],
      tagHelpText: "Enter the tag values"
    },
    zIndex: "100000",
    textAreaCharacterLength: 500,
    enableBeacon: false,
    enableAnnouncement: false,
    feedback : {
      PagetourFeedbackOptions: {
        enabled: false,
        type: '5-star',
        heading: "Feedback : PageTour",
        description: "Was this Tour helpful?",
      },
      AnnouncementFeedbackOptions: {
        enabled: false,
        type: 'like-dislike',
        heading: 'Was this Announcement helpful?',
        submitMessage: 'Thank you for your feedback!'     
      }
    }
    
  }
  constructor(options: PageTourOptions) {
    this.extendOptions(options)
  }
  public get Options(): PageTourOptions {
    return this.options;
  }
  public get DefaultOptions(): PageTourOptions {
    return this.defaultOptions;
  }
  private extendOptions = (inputOptions: PageTourOptions): PageTourOptions => {
    return (this.options = { ...this.defaultOptions, ...inputOptions })
  }
}

export { ConfigStore }
