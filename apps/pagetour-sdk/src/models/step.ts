import { State } from './state'

interface Step {
  key: string

  delayBefore?: number

  selector: string

  silent: Boolean

  pagecontext: string

  pagestate: State

  pagestatename: string

  type: string

  position: string

  message: string

  errormessage: string

  value: string

  executeonload: Boolean

  ignoreStepIf: Boolean

  ignoreStepIfConditions: string
}

export { Step }
