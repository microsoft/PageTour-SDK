import { AnnouncementFeedbackOptions } from "./announcementfeedbackoptions"
import { PageTourFeedbackOptions } from "./pagetourfeedbackoptions"

interface Feedback {
    pagetourFeedbackOptions: PageTourFeedbackOptions
    announcementFeedbackOptions: AnnouncementFeedbackOptions
}

export { Feedback }