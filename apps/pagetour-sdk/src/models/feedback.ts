import { AnnouncementFeedbackOptions } from "./announcementfeedbackoptions"
import { FeedbackTypeEnum } from "./feedbacktypeenum"
import { PageTourFeedbackOptions } from "./pagetourfeedbackoptions"

interface Feedback {
    pagetourFeedbackOptions?: PageTourFeedbackOptions
    announcementFeedbackOptions?: AnnouncementFeedbackOptions
    // enabled: boolean
    // type?: string 
    // heading?: string
    // description?: string
    // //isFeedbackGiven?: boolean
    // privacyDescription?: string
    // privacyURL?: string
}

export { Feedback }