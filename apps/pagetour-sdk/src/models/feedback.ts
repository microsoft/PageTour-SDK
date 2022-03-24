import { FeedbackTypeEnum } from "./feedbacktypeenum"

interface Feedback {
    enabled: boolean
    type?: string 
    heading: string
    description: string
    isFeedbackGiven: boolean

    // not sure about this implmementation
    //userFeedbackValue: number
}

export { Feedback }