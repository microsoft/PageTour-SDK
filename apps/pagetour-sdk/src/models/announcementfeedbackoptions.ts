
import { AnnouncementFeedbackEnum } from "./announcementfeedbackenum"
import { FeedbackOptions } from "./feedbackoptions"

interface AnnouncementFeedbackOptions extends FeedbackOptions {
    type?: AnnouncementFeedbackEnum,
    submitMessage?: string
}

export {AnnouncementFeedbackOptions}