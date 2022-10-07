
import { AnnouncementFeedbackEnum } from "./announcementfeedbackenum"
import { FeedbackOptions } from "./feedbackoptions"

interface AnnouncementFeedbackOptions extends FeedbackOptions {
    submitMessage?: string
}

export {AnnouncementFeedbackOptions}