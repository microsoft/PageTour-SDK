import { Tutorial } from './tutorial'
import { PageContext } from './pagecontext'
import { Tags } from './tags'

interface NavigatorOptions {
  navigateToContext?: (context: PageContext) => void
  getStartPageUrl?: (startUrl: string) => string
  getCurrentPageContext?: () => PageContext
  callbackBeforeTourStep?: (tour: Tutorial) => void
  callbackAfterTourStep?: (step: any) => void
  callbackBeforeTourStart?: (tour: Tutorial) => void
  callbackOnTourStart?: (tour: Tutorial) => void
  callbackAfterTourEnd?: (tour: Tutorial) => void
  callbackOnTourStepFailure?: (tour: Tutorial, failedStepIndex: number, stepErrorMessage: string) => void
  callbackOnAuthoringStart?: () => void
  callbackOnAuthoringEnd?: () => void
  callbackOnTourSaved?: (tour: Tutorial) => void
  callbackOnTourSavedFailed?: (errorMessage: string) => void
  callbackOnTourExported?: (tour: Tutorial) => void
  callbackOnTourDeleted?: (tour: Tutorial) => void
  callbackForTags?: () => Promise<Tags>
  callbackOnVolumeMute?: () => void
  callbackOnVolumeUnmute?: (transcript: string) => void
}

export { NavigatorOptions }
