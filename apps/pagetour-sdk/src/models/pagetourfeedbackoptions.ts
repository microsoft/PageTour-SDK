
import { FeedbackOptions } from "./feedbackoptions"
import { PagetourFeedbackEnum } from "./pagetourfeedbackenum"

interface PageTourFeedbackOptions extends FeedbackOptions{
    type?: PagetourFeedbackEnum,
    description?: string
}

export {PageTourFeedbackOptions}