import { BaseEntity } from './baseentity'
import { CoverPage } from './coverpage'
import { Step } from './step'
import { State } from './state'
import { Feedback } from './feedback'

interface Tutorial extends BaseEntity {
  id: string

  description: string

  tutorialid: string

  title: string

  pagecontext: string[]

  coverPage: CoverPage

  feedback: Feedback

  applicationname: string

  steps: Step[]

  startpageurl: string

  pagestates: string[]

  startpagestate: State

  expireson: Date

  isautoplayenabled: boolean

  activeon: Date

  isactive: boolean

  isdeleted: boolean

  version: number

  isexported: boolean

  isviewed: boolean

  tags: string[]

  createdby: string

  lastmodifiedby: string

  tourtype: string
}

export { Tutorial }
