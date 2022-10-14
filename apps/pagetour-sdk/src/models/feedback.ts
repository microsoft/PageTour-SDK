import { AnnouncementFeedbackOptions } from "./announcementfeedbackoptions"
import { PageTourFeedbackOptions } from "./pagetourfeedbackoptions"

interface Feedback {
    PagetourFeedbackOptions?: PageTourFeedbackOptions
    AnnouncementFeedbackOptions?: AnnouncementFeedbackOptions
}

export { Feedback }