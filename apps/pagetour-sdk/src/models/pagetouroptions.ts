import { NavigatorOptions } from './navigatoroptions'
import { TokenProviderOptions } from './tokenprovideroptions'
import { UserInfoOptions } from './userinfooptions'
import { PageTourTheme } from './pagetourtheme'
import { Tags } from './tags'
import { UserActionProvider } from './useractionprovider'

interface PageTourOptions {
  tokenProvider?: TokenProviderOptions
  userInfo?: UserInfoOptions
  theme?: PageTourTheme
  tourStartDelayInMs?: number
  tags?: Tags
  appInfo?: Map<string, string>
  navigator?: NavigatorOptions
  autoPlayDelay?: number
  exportFeatureFlag?: boolean
  autoPlayEnabled?: boolean
  userActionProvider?: UserActionProvider
  isCoverPageTourStart?:Boolean
  announcementDefaultImage?: string,
  enableTranscript?: boolean,
  zIndex?: string, 
  textAreaCharacterLength?: number
  enableBeacon?: boolean
}

export { PageTourOptions }
