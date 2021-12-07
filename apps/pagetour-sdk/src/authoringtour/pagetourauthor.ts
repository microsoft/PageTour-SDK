import { PageTourPlay } from '../playtour/pagetourplay'
import * as stepModalTemplate from './step-detail-modal.html'
import * as chooseElementTemplate from './chose-element-modal.html'
import * as addTourModalTemplate from './add-tour-modal.html'
import * as createCoverPageModalTemplate from './create-cover-page-modal.html'
import * as createAnnouncementModalTemplate from './add-announcement-page-modal.html'
import { DomUtils } from '../common/domutils'
import { ConfigStore } from '../common/configstore'
import { debounce } from 'debounce'
import { PageContext } from '../models/pagecontext'
import unique from 'unique-selector'
import { RunTourAction } from '../models/runtouraction'
import { Step } from '../models/step'
import { DataStore } from '../common/datastore'
import { Tutorial } from '../models/tutorial'
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { SpeechConfig, AudioConfig, SpeechSynthesizer, SpeechRecognizer } from 'microsoft-cognitiveservices-speech-sdk';


declare const $: any

class PageTourAuthor {
  // private modal: any = null;
  private selectedElement: HTMLElement = null
  private lastSelectedElement: HTMLElement = null
  private lastSelectedElementOriginal: HTMLElement = null
  private stepList: any = []
  private editStepIndex = -1
  private tour: any = null
  private tourCoverPageLocation = ''
  private tourCoverPageContent = ''
  private lastSelectedElementStore: any = {}
  private chooseState = Object.freeze({ Choose: 1, Chosen: 2 })
  private domLookupBox: HTMLInputElement = null
  private ckEditor: any = null;
  // Template Functions
  private stepModalTemplateFn: any = stepModalTemplate
  private chooseElementTemplateFn: any = chooseElementTemplate
  private addTourModalTemplateFn: any = addTourModalTemplate
  private createCoverPageTemplateFn: any = createCoverPageModalTemplate

  private createAnnouncementTemplateFn: any = createAnnouncementModalTemplate

  // Debounce Functions
  private bodyMouseMoveFunction: any

  constructor(private pageTourPlay: PageTourPlay, private configStore: ConfigStore, private dataStore: DataStore) {
    this.bodyMouseMoveFunction = debounce(this.onBodyMouseMove, 50)
  }

  public InitAuthoringDock = (tourType : string) => {
    this.addTourDialog(tourType)
  }

  // Adds Tour.
  public AddTour = (tourType : string) => {
    // Clear Tour and StepsList while creating new tour
    this.tour = null
    this.stepList = []
    this.InitAuthoringDock(tourType)
  }

  /// Edit Tour
  public EditTour = (objTour: any) => {
    this.InitAuthoringDock(objTour.tourtype)
    document.getElementById('tutorial-modal-title').innerText = 'Edit Tour'
    let addTourDialogCloseBtn = document.getElementById('add-tour-modal-close')
    addTourDialogCloseBtn.setAttribute('aria-label', 'Close Edit Tour dialog')
    document.getElementById('add-tour-modal-cancel-btn').setAttribute('aria-label', 'cancel and close Edit Tour dialog')
    document.getElementById('tour-type').setAttribute('disabled', 'true')
    this.tour = objTour
    this.loadTour()
    this.validateTourInputs()
    this.resetIsTourPlaying()
    this.tourTypeChanged()
  }


  /// Deletes Tour
  public DeleteTour = async (tourId: any) => {
    this.resetIsTourPlaying()
    return this.dataStore.DeleteTour(tourId)
  }

  /// Exports Tour
  public ExportTour = async (tours: any) => {
    return this.dataStore.ExportTour(tours)
  }

  /*#BeginRegion:Add tour dialog methods*/

  /// Adds Tour Dialog
  private addTourDialog = (tourType : string) => {
    if (this.configStore.Options.navigator.callbackOnAuthoringStart) {
      this.configStore.Options.navigator.callbackOnAuthoringStart()
    }
    let addTourModal = document.getElementById('add-tour-modal')
    if (!addTourModal) {
      let addTourBox = this.addTourModalTemplateFn()
      const addTourModal = DomUtils.appendToBody(addTourBox)
      DomUtils.show(addTourModal)
    } else {
      addTourModal.style.display = 'block'
    }
    let tourForm = document.getElementById('add-tour-form')
    DomUtils.manageTabbing(tourForm)
    ;(document.getElementById('tour-activeon') as HTMLInputElement).value = new Date().toISOString().split('T')[0]
    let defaultExpiresOn = new Date().setMonth(new Date().getMonth() + 6)
    ;(document.getElementById('tour-expireson') as HTMLInputElement).value = new Date(defaultExpiresOn)
      .toISOString()
      .split('T')[0];
    (document.getElementById("tour-type") as HTMLSelectElement).value = tourType;

    document.getElementById('tour-title').onkeyup = this.checkTourTitle
    document.getElementById('tour-description').onkeyup = this.checkTourDescription
    document.getElementById('tour-activeon').onchange = this.checkTourActiveon
    document.getElementById('tour-expireson').onchange = this.checkTourExpireson
    document.getElementById('tour-tags').onkeyup = this.checkTourTags
    document.getElementById('cover-page-btn').onclick = this.createCoverPageModal
    document.getElementById('add-step-btn').onclick = this.createChooseElementModal
    document.getElementById('add-announcement-btn').onclick = this.addAnnouncementPage
    document.getElementById('preview-tour-step-btn').onclick = this.previewTour
    document.getElementById('add-tour-modal-close').onclick = this.closeAddTourModal
    document.getElementById('add-tour-modal-cancel-btn').onclick = this.closeAddTourModal
    document.getElementById('save-tour-modal-btn').onclick = this.saveTour
    document.getElementById('tour-type').onchange = this.tourTypeChanged
    this.tourTypeChanged()
    this.resetIsTourPlaying()
  }

  /*# BeginRegion: Tour Dialogue Validations */

  /// Validates Tour Title
  private checkTourTitle = () => {
    const tourTitleTextArea: HTMLTextAreaElement = document.getElementById('tour-title') as HTMLTextAreaElement
    let value = tourTitleTextArea.value
    document.getElementById('tour-title-error').style.display = value === '' ? 'block' : 'none'
    document.getElementById('tour-title-character-limit').innerText = 74 - value.length + ' characters remaining.'
  }

  /// Validates Tour Description
  private checkTourDescription = () => {
    const tourDescriptionTextArea: HTMLTextAreaElement = document.getElementById(
      'tour-description',
    ) as HTMLTextAreaElement
    let value = tourDescriptionTextArea.value
    document.getElementById('tour-description-error').style.display = value === '' ? 'block' : 'none'
    document.getElementById('tour-description-character-limit').innerText =
      100 - value.length + ' characters remaining.'
  }

  /// Validates Tour ActiveOn
  private checkTourActiveon = () => {
    const tourActiveOnInputElement: HTMLInputElement = document.getElementById('tour-activeon') as HTMLInputElement
    document.getElementById('tour-activeon-error').style.display =
      tourActiveOnInputElement.value === '' ? 'block' : 'none'
  }

  /// Validates Tour Active ExpiresOn
  private checkTourExpireson = () => {
    const tourExpiresOnInputElement: HTMLInputElement = document.getElementById('tour-expireson') as HTMLInputElement
    document.getElementById('tour-expireson-error').style.display =
      tourExpiresOnInputElement.value === '' ? 'block' : 'none'
  }

  /// Validates Tour Tags
  private checkTourTags = () => {
    const tourTagsTextArea: HTMLTextAreaElement = document.getElementById('tour-tags') as HTMLTextAreaElement
    let value = tourTagsTextArea.value
    document.getElementById('tour-tags-character-limit').innerText = 74 - value.length + ' characters remaining.'
  }

  /*# EndRegion: Tour Dialogue Validations */

  /// Closes Tour Dialog
  private closeAddTourModal = () => {
    let addTourModal = document.getElementById('add-tour-modal')
    let tourForm = document.getElementById('add-tour-form')
    DomUtils.removeTabbing(tourForm)
    addTourModal.parentNode.removeChild(addTourModal)
    // this.stepList.length = 0 /// Clears all the steps that are held.
    this.tourCoverPageContent = ''
    this.tourCoverPageLocation = ''
  }

  /// Hides Tour Dialog
  private hideAddTourModal = () => {
    let tourForm = document.getElementById('add-tour-form')
    DomUtils.removeTabbing(tourForm)
    document.getElementById('add-tour-modal').style.display = 'none'
  }

  /// Unhides Tour Dialog
  private unHideAddTourModal = () => {
    document.getElementById('add-tour-modal').style.display = 'block'
  }

  private resetIsTourPlaying = () => {
    if (this.pageTourPlay) {
      this.pageTourPlay.isTourPlaying = false
    }
  }

  private getCurrentUrl = () => {
    return window.location.href.replace(window.location.origin, '')
  }

  /// Saves Tour Dialog
  private saveTour = async () => {
    let tourForm = document.getElementById('tour-form')

    if (!this.validateTourInputs()) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    const saveTourModalButton: HTMLButtonElement = document.getElementById('save-tour-modal-btn') as HTMLButtonElement
    saveTourModalButton.disabled = true

    let tourTitleBox: HTMLTextAreaElement = document.getElementById('tour-title') as HTMLTextAreaElement
    let tourDescriptionBox: HTMLTextAreaElement = document.getElementById('tour-description') as HTMLTextAreaElement
    let tourActiveOnBox: HTMLInputElement = document.getElementById('tour-activeon') as HTMLInputElement
    let tourExpiresOnBox: HTMLInputElement = document.getElementById('tour-expireson') as HTMLInputElement
    let isTourAutoPlayEnabledFlag: HTMLInputElement = document.getElementById('isAutoPlayEnabled') as HTMLInputElement
    let tags: HTMLTextAreaElement = document.getElementById('tour-tags') as HTMLTextAreaElement
    let tourTypeElement = document.getElementById('tour-type') as HTMLSelectElement
    let tourType = tourTypeElement.value;
    let tourTitle = tourTitleBox.value
    let tourDescription = tourDescriptionBox.value
    let tourActiveOn = new Date(tourActiveOnBox.value).toUTCString()
    let tourExpiresOn = new Date(tourExpiresOnBox.value).toUTCString()
    let isTourAutoPlayEnabled = isTourAutoPlayEnabledFlag.checked
    let currentDate = new Date()

    let tagsArray = tags.value.length > 0 ? tags.value.split(',') : []

    let pageStates = []
    for (let i = 0; i < this.stepList.length; i++) {
      if (pageStates.indexOf(this.stepList[i].pagestatename) === -1) {
        pageStates.push(this.stepList[i].pagestatename)
      }
    }

    let pageContexts = []
    for (let i = 0; i < this.stepList.length; i++) {
      if (pageContexts.indexOf(this.stepList[i].pagecontext) === -1) {
        pageContexts.push(this.stepList[i].pagecontext)
      }
    }

    let pagetourJson: any = {
      title: tourTitle,
      description: tourDescription,
      pagecontext: pageContexts,
      pagestates: pageStates,
      steps: this.stepList,
      coverPage: {
        location: this.tourCoverPageLocation,
        content: this.tourCoverPageContent,
      },
      startpageurl: this.stepList[0].pagecontext,
      startpagestate: this.stepList[0].pagestatename,
      expireson: tourExpiresOn,
      isautoplayenabled: isTourAutoPlayEnabled,
      activeon: tourActiveOn,
      isactive: true,
      isdeleted: false,
      version: 1,
      lastmodifiedon: currentDate.toUTCString(),
      lastmodifiedby: this.getCurrentUser(),
      tags: tagsArray,
      tourtype: tourType
    }

    if (this.configStore.Options.appInfo) {
      for (let [key, value] of Array.from(this.configStore.Options.appInfo.entries())) {
        pagetourJson[key] = value
      }
    }

    if (this.tour == null || this.tour.id == null) {
      pagetourJson.createdon = currentDate.toUTCString()
      pagetourJson.createdby = this.getCurrentUser()
      try {
        const response = await this.dataStore.CreateTour(pagetourJson)
        // tslint:disable-next-line: no-floating-promises

        if (this.configStore.Options.navigator.callbackOnTourSaved) {
          this.configStore.Options.navigator.callbackOnTourSaved(response)
        }
      } catch (err) {
        if (this.configStore.Options.navigator.callbackOnTourSavedFailed) {
          this.configStore.Options.navigator.callbackOnTourSavedFailed(err as string)
        }
      }
    } else {
      pagetourJson.id = this.tour.id
      pagetourJson.createdon = this.tour.createdon
      pagetourJson.createdby = this.tour.createdby
      try {
        const response = await this.dataStore.UpdateTour(pagetourJson)
        if (this.configStore.Options.navigator.callbackOnTourSaved) {
          this.configStore.Options.navigator.callbackOnTourSaved(response)
        }
      } catch (error) {
        if (this.configStore.Options.navigator.callbackOnTourSavedFailed) {
          this.configStore.Options.navigator.callbackOnTourSavedFailed(error as string)
        }
      }
    }

    this.closeAddTourModal()
  }

  private tourTypeChanged = () => {
    let tourtypeselect = document.getElementById("tour-type") as HTMLSelectElement;
    let autoPlayCheckbox = document.getElementById("isAutoPlayEnabled") as HTMLInputElement
    var tourtype = tourtypeselect.options[tourtypeselect.selectedIndex].value;
    if(tourtype.toLowerCase() == "announcement"){
      document.getElementById("add-announcement-btn").style.display = 'inline'
      document.getElementById("add-step-btn").style.display = 'none'
      document.getElementById("cover-page-btn").style.display = 'none'
      autoPlayCheckbox.checked = true;
      autoPlayCheckbox.disabled = true;
    }
    else {
      document.getElementById("add-announcement-btn").style.display = 'none'
      document.getElementById("add-step-btn").style.display = 'inline'
      document.getElementById("cover-page-btn").style.display = 'inline'
      autoPlayCheckbox.checked = false;
      autoPlayCheckbox.disabled = false;
    }

  }

  /// Validates Add/Edit Tour dialog inputs.
  private validateTourInputs = () => {
    /// Validates the input boxes
    this.checkTourTitle()
    this.checkTourDescription()
    this.checkTourActiveon()
    this.checkTourExpireson()
    this.checkTourTags()

    let controlsList = ['tour-title', 'tour-description', 'tour-activeon', 'tour-expireson']

    /// Valdiates and Sets the focus on controls on the page.
    return this.validateandSetFocus(controlsList)
  }

  /// Sets Focus on errored Controls
  private validateandSetFocus = (controlsList: string[]) => {
    for (let index = 0; index < controlsList.length - 1; index++) {
      if (document.getElementById(controlsList[index] + '-error').style.display === 'block') {
        document.getElementById(controlsList[index]).focus()
        return false
      }
    }
    return true
  }

  /// Loads Tour Dialog
  private loadTour = () => {
    ;(document.getElementById('tour-title') as HTMLTextAreaElement).value = this.tour.title
    ;(document.getElementById('tour-description') as HTMLTextAreaElement).value = this.tour.description
    ;(document.getElementById('tour-tags') as HTMLTextAreaElement).value = this.tour.tags
    ;(document.getElementById('tour-activeon') as HTMLInputElement).value = this.tour.activeon.split('T')[0]
    ;(document.getElementById('tour-expireson') as HTMLInputElement).value = this.tour.expireson.split('T')[0]
    ;(document.getElementById('isAutoPlayEnabled') as HTMLInputElement).checked = this.tour.isautoplayenabled
    ;(document.getElementById('tour-type') as HTMLSelectElement).value = this.tour.tourtype
    this.stepList = this.tour.steps

    if (this.tour.coverPage) {
      this.tourCoverPageLocation = this.tour.coverPage.location
      this.tourCoverPageContent = this.tour.coverPage.content
    } else {
      this.tourCoverPageLocation = ''
      this.tourCoverPageContent = ''
    }

    if (this.tourCoverPageContent !== '' && this.tourCoverPageLocation !== '') {
      let addCoverPageButton = document.getElementById('cover-page-btn')
      addCoverPageButton.innerHTML = '<i class="pagetour__icon icon-pencil icon-inline"></i>Edit Cover Page'
      addCoverPageButton.title = 'Edit Cover Page'
    }
    this.populateSteps()
  }

  /// Plays preview of a Tour
  private previewTour = () => {
    if (this.stepList !== undefined && this.stepList != null && this.stepList.length !== 0) {
      this.hideAddTourModal()
      let tour: any = {
        steps: [],
      }
      tour.steps = this.stepList
      tour.coverPage = {}
      tour.title = (document.getElementById('tour-title') as HTMLTextAreaElement).value
      tour.description = (document.getElementById('tour-description') as HTMLTextAreaElement).value
      tour.coverPage.location = this.tourCoverPageLocation
      tour.coverPage.content = this.tourCoverPageContent
      if(this.tour && this.tour.tourtype && this.tour.tourtype.toLowerCase() == "announcement")
        this.pageTourPlay.runAnnouncement(tour, RunTourAction.Preview, 0, this.addTourDialog)
      else
        this.pageTourPlay.runTour(tour, RunTourAction.Preview, 0, this.addTourDialog)
    }
  }

  /*#EndRegion:Add tour dialog methods*/

  /*#BeginRegion: Tour Dialog - Steps table*/

  /// Populates all the steps of tour in step table on Tour Dialog.
  private populateSteps = () => {
    let tourStepsTableBody = document.getElementById('tour-steps-table-body')
    while (tourStepsTableBody.firstChild) {
      tourStepsTableBody.removeChild(tourStepsTableBody.firstChild)
    }

    for (let i = 0; i < this.stepList.length; i++) {
      let tr = document.createElement('tr')
      let tdexpander = document.createElement('td')
      let tdStepCount = document.createElement('td')
      let tdStepType = document.createElement('td')
      let tdStepHeader = document.createElement('td')
      let tdStepMessage = document.createElement('td')
      let tdStepMediaUrl = document.createElement('td')
      let tdStepMoveup = document.createElement('td')
      let tdStepEdit = document.createElement('td')
      let tdStepDelete = document.createElement('td')
      let expander = this.getButton('expander', i)
      let stepCount = document.createTextNode((i + 1).toString())
      let stepType = document.createTextNode(this.stepList[i].type)
      let stepHeaderText = document.createTextNode(this.stepList[i].headerText)
      let stepMediaUrl = document.createTextNode(this.stepList[i].mediaUrl)
      let stepMessage = this.getStepMessageElement(i)
      let stepMoveup = this.getButton('moveup', i)
      let stepMovedown = this.getButton('movedown', i)

      let stepEdit = this.getButton('edit', i)
      let stepDelete = this.getButton('delete', i)

      tdexpander.setAttribute('class', 'expander-column')
      tdStepCount.setAttribute('class', 'step-column')
      tdStepType.setAttribute('class', 'step-type-column')
      tdStepMoveup.setAttribute('class', 'reorder-column')
      tdStepEdit.setAttribute('class', 'button-column')
      tdStepDelete.setAttribute('class', 'button-column')
      tdStepHeader.setAttribute('class', 'message-desc')

      tdexpander.appendChild(expander)
      tdStepCount.appendChild(stepCount)
      tdStepType.appendChild(stepType)
      tdStepMessage.appendChild(stepMessage)
      tdStepMoveup.appendChild(stepMoveup)
      tdStepMoveup.appendChild(stepMovedown)
      tdStepEdit.appendChild(stepEdit)
      tdStepDelete.appendChild(stepDelete)
      tdStepHeader.appendChild(stepHeaderText)
      tdStepMediaUrl.appendChild(stepMediaUrl)

      tr.appendChild(tdexpander)
      tr.appendChild(tdStepCount)
      if(this.tour && this.tour.tourtype && this.tour.tourtype.toLowerCase() == 'announcement') {
        document.getElementById("step-tourtype-header").innerText = 'Header Text'
        document.getElementById("step-tourtype-header").style.width = '250px'
        document.getElementById("step-announcement-image-url").style.display = 'inline'
        tr.appendChild(tdStepHeader)
        tr.appendChild(tdStepMediaUrl)
      }
      else {
        document.getElementById("step-tourtype-header").innerText = 'Type'
        document.getElementById("step-announcement-image-url").style.display = 'none'
        tr.appendChild(tdStepType)
      }
      tr.appendChild(tdStepMessage)
      tr.appendChild(tdStepMoveup)
      tr.appendChild(tdStepEdit)
      tr.appendChild(tdStepDelete)


      tourStepsTableBody.appendChild(tr)
    }

    if (this.stepList.length > 0) {
      ;(document.getElementById('save-tour-modal-btn') as HTMLButtonElement).disabled = false
      ;(document.getElementById('preview-tour-step-btn') as HTMLButtonElement).disabled = false
    } else {
      document.getElementById('save-tour-modal-btn').setAttribute('disabled', 'disabled')
      document.getElementById('preview-tour-step-btn').setAttribute('disabled', 'disabled')
    }
    let tourForm = document.getElementById('add-tour-form')
    DomUtils.manageTabbing(tourForm)
  }

  /// Returns Toggle, Move Up,Move Down, EDIT and DELETE buttons to display in step details of tour Dialog
  private getButton = (buttonType: any, index: number) => {
    let button = document.createElement('button')
    button.setAttribute('type', 'button')
    let icon = document.createElement('i')

    switch (buttonType) {
      case 'expander':
        button.classList.add('button-44')
        button.setAttribute('title', 'Expand row')
        button.setAttribute('id', 'button-drop_' + index)
        icon.setAttribute('id', 'icon-drop_' + index)
        if (this.stepList[index].message.length <= 100) {
          button.style.display = 'none'
        } else {
          button.style.display = 'block'
        }
        button.addEventListener(
          'click',
          (event) => {
            return this.toggleStepMessage(index)
          },
          false,
        )
        icon.classList.add('pagetour__icon', 'icon-drop')
        break
      case 'edit':
        button.classList.add('button-36')
        button.setAttribute('title', 'Edit step')
        button.setAttribute('id', 'button-edit_' + index)
        icon.setAttribute('id', 'icon-edit_' + index)
        button.addEventListener(
          'click',
          (event) => {
            return this.editStep(index)
          },
          false,
        )
        icon.classList.add('pagetour__icon', 'icon-pencil')
        break
      case 'delete':
        button.classList.add('button-36')
        button.setAttribute('title', 'Delete step')
        button.setAttribute('id', 'button-delete_' + index)
        icon.setAttribute('id', 'icon-delete_' + index)
        button.addEventListener(
          'click',
          (event) => {
            return this.deleteStep(index)
          },
          false,
        )
        icon.classList.add('pagetour__icon', 'icon-recyclebin')
        break
      case 'moveup':
        button.classList.add('button-32')
        button.setAttribute('title', 'Move step up')
        button.setAttribute('id', 'button-moveup_' + index)
        icon.setAttribute('id', 'icon-moveup_' + index)
        if (index === 0) {
          button.setAttribute('disabled', 'disabled')
        }
        button.addEventListener(
          'click',
          (event) => {
            return this.moveUp(index)
          },
          false,
        )
        icon.classList.add('pagetour__icon', 'icon-order-up')
        break
      case 'movedown':
        button.classList.add('button-32')
        button.setAttribute('title', 'Move step down')
        button.setAttribute('id', 'button-movedown_' + index)
        icon.setAttribute('id', 'icon-movedown_' + index)
        if (index === this.stepList.length - 1) {
          button.setAttribute('disabled', 'disabled')
        }
        button.addEventListener(
          'click',
          (event) => {
            return this.moveDown(index)
          },
          false,
        )
        icon.classList.add('pagetour__icon', 'icon-order-down')
        break
    }
    button.appendChild(icon)
    return button
  }

  /// Gets the Step Message for steps table in Tour dialog with appropriate styling
  private getStepMessageElement = (index: number) => {
    let msgElement = document.createElement('div')
    msgElement.classList.add('message-desc')
    msgElement.setAttribute('id', 'step-message-element_' + index)
    msgElement.appendChild(document.createTextNode(this.stepList[index].message))

    return msgElement
  }

  /// This is a method to execute deletion of a step from tour
  private deleteStep = (index: any) => {
    this.stepList.splice(index, 1)
    this.populateSteps()
    let nextFocusableElement = this.getNextFocusableElementAfterDeleteStep(index)
    nextFocusableElement.focus()
    event.preventDefault()
    event.stopPropagation()
  }

  private getNextFocusableElementAfterDeleteStep(index: any): HTMLElement {
    let nextFocusableElement: HTMLElement
    switch (this.stepList.length) {
      // If no steps exist in the list
      case 0:
        nextFocusableElement = document.getElementById('add-tour-modal-cancel-btn')
        break
      // If only a single element is present in the list
      case 1:
        nextFocusableElement = document.getElementById('button-edit_0')
        break
      // For 2 or more elements in the list
      default:
        // If the last step in the list was deleted
        if (index > this.stepList.length - 1) {
          nextFocusableElement = document.getElementById('add-tour-modal-cancel-btn')
        }
        // if any step other than the last was deleted
        else {
          let moveUp: HTMLButtonElement = document.getElementById(`button-moveup_${index}`) as HTMLButtonElement
          let moveDown = document.getElementById(`button-movedown_${index}`) as HTMLButtonElement
          let edit = document.getElementById(`button-edit_${index}`) as HTMLButtonElement
          if (!moveUp.disabled) {
            nextFocusableElement = moveUp
          } else if (!moveDown.disabled) {
            nextFocusableElement = moveDown
          } else {
            nextFocusableElement = edit
          }
        }
    }
    return nextFocusableElement
  }
  /// This is a method to edit a step in a tour
  private editStep = (index: any) => {
    this.editStepIndex = index;
    let tourtypeselect = document.getElementById("tour-type") as HTMLSelectElement;
    var tourtype = tourtypeselect.options[tourtypeselect.selectedIndex].value;
    switch(tourtype.toLowerCase()) {
      case "announcement":
        this.editAnnouncementStep();
        break;
      case "pagetour":
        this.editTourStep();
        break;
    }
  }

  private editTourStep() {
    this.createChooseElementModal()
    document.getElementById('choose-element-title').innerText = 'Edit Step - Choose an element'
    document.getElementById('close-btn').setAttribute('aria-label', 'Close Edit step dialog')
    document.getElementById('cancel-choose-element-btn').setAttribute('aria-label', 'cancel and Close Edit Step dialog')
    event.preventDefault()
    event.stopPropagation()

    if (this.stepList && this.editStepIndex !== -1 && this.stepList.length > this.editStepIndex) {
      const editingStep = this.stepList[this.editStepIndex]
      if (editingStep && editingStep.selector && editingStep.selector !== '') {
        this.ignoreStepIfSetup(editingStep)
        let elementfromselector = document.querySelector(editingStep.selector)
        if (elementfromselector) {
          this.lastSelectedElement = elementfromselector
          this.lastSelectedElementOriginal = elementfromselector
          this.toggleChooseElement(this.chooseState.Chosen, editingStep)
        }
      }
    }
  }

  private editAnnouncementStep() {
    this.addAnnouncementPage()
    document.getElementById('announcement-page-modal-title').innerText = 'Edit Announcement Step'
    document.getElementById('announcement-page-close-btn').setAttribute('aria-label', 'Close Edit Announcement step dialog')
    document.getElementById('cancel-announcement-page-btn').setAttribute('aria-label', 'Cancel and Close Edit Announcement Step dialog')
    event.preventDefault()
    event.stopPropagation()
    if (this.stepList && this.editStepIndex !== -1 && this.stepList.length > this.editStepIndex) {
      const editingStep = this.stepList[this.editStepIndex]
      document.getElementById('input-announcement-header-text').innerText = editingStep.headerText;
      document.getElementById('anno-message-editor').innerHTML = editingStep.message;
      if (editingStep.mediaUrl)
        document.getElementById('input-announcement-image-video').innerText = editingStep.mediaUrl;
      if (editingStep.transcript)
        document.getElementById('transcript-message-for-announcement').innerText = editingStep.transcript;
    }
  }

  private ignoreStepIfSetup = (tourstep: Step) => {
    let ignoreNextIfNextStepElementFound: HTMLInputElement = document.getElementById(
      'ignoreStep-IfNextStepElementFound-chkbox',
    ) as HTMLInputElement
    if (tourstep.ignoreStepIf && tourstep.ignoreStepIf === true) {
      let conditions: string[] = tourstep.ignoreStepIfConditions.split(',')
      for (let conditionIndex in conditions) {
        if (conditions[conditionIndex] === 'NextStepElementFound') {
          if (ignoreNextIfNextStepElementFound) {
            ignoreNextIfNextStepElementFound.checked = true
          }
        }
      }
    } else {
      if (ignoreNextIfNextStepElementFound) {
        ignoreNextIfNextStepElementFound.checked = false
      }
    }
  }

  /// This method moves a step one position up in display of steps in steps table and one step before in execution order
  private moveUp = (index: number) => {
    if (index > 0) {
      let step = this.stepList[index - 1]
      this.stepList[index - 1] = this.stepList[index]
      this.stepList[index] = step
      this.populateSteps()
    }
    event.preventDefault()
    event.stopPropagation()
  }

  /// This method moves a step one position down in display of steps in steps table and one step after in execution order
  private moveDown = (index: number) => {
    if (index < this.stepList.length - 1) {
      let step = this.stepList[index + 1]
      this.stepList[index + 1] = this.stepList[index]
      this.stepList[index] = step
      this.populateSteps()
    }
    event.preventDefault()
    event.stopPropagation()
  }

  /// This method shows the step message in steps table of Tour dialogue as expanded or collapsed.
  private toggleStepMessage = (index: number) => {
    let iconExpander = document.getElementById('icon-drop_' + index)

    if (iconExpander.classList.contains('icon-drop')) {
      iconExpander.parentElement.setAttribute('title', 'Collapse row')
      document.getElementById('step-message-element_' + index).setAttribute('class', 'message-desc-expanded')
      document.getElementById('icon-drop_' + index).setAttribute('class', 'pagetour__icon icon-drop-up')
    } else {
      document.getElementById('step-message-element_' + index).setAttribute('class', 'message-desc')
      document.getElementById('icon-drop_' + index).setAttribute('class', 'pagetour__icon icon-drop')
    }
  }

  /*#EndRegion: Tour Dialog - Steps table*/

  /*#BeginRegion: Choose element dialog methods*/

  /// Creates and shows Choose Element Dialog
  private createChooseElementModal = () => {
    this.hideAddTourModal()
    this.resetStepDetailsModal() /// clears left out data in Create Record box while going back forth between popup modals.
    let authoringDeck = document.getElementById('authoringDock')
    if (!authoringDeck) {
      let chooseElementDock = this.chooseElementTemplateFn()
      const chooseElementDockModal = DomUtils.appendToBody(chooseElementDock)
      DomUtils.show(chooseElementDockModal)
    } else {
      authoringDeck.style.display = 'block'
    }
    authoringDeck = document.getElementById('authoringDock')
    this.dragElement(authoringDeck)
    authoringDeck.style.display = 'block'

    let closeBtn = document.getElementById('close-btn')
    closeBtn.onclick = this.closeChooseElementModal

    const chooseElement = document.getElementById('choose-element-btn')
    chooseElement.addEventListener('click', this.enablePageInspector)

    let cancelChooseElement = document.getElementById('cancel-choose-element-btn')
    cancelChooseElement.onclick = this.closeChooseElementModal

    let nextElement = document.getElementById('select-element-next-btn')
    nextElement.addEventListener('click', this.createRecordBox)
    DomUtils.manageTabbing(authoringDeck)
    this.showHideIgnoreKeyElement(false, null)
  }

  /// Changes the text on Button as per the Chosebn state either Choose or Choose again.
  private toggleChooseElement = (state: any, editingStep: any) => {
    let chooseElement: HTMLButtonElement = document.getElementById('choose-element-btn') as HTMLButtonElement
    let chooseElementText = document.getElementById('choose-element-text')
    let nextButton = document.getElementById('select-element-next-btn') as HTMLButtonElement

    switch (state) {
      case this.chooseState.Choose:
        chooseElement.innerText = 'Choose'
        chooseElement.disabled = false
        chooseElementText.innerText = ''
        nextButton.setAttribute('disabled', 'disabled')
        this.showHideIgnoreKeyElement(false, editingStep)
        break
      case this.chooseState.Chosen:
        chooseElement.innerText = 'Choose again'
        chooseElement.disabled = false
        chooseElementText.innerText = 'Element Selected'
        nextButton.disabled = false

        if (this.lastSelectedElement) {
          let idVal = this.lastSelectedElement.getAttribute('id')
          if (idVal && idVal !== '') {
            this.showHideIgnoreKeyElement(true, editingStep)
          } else {
            this.showHideIgnoreKeyElement(false, editingStep)
          }
        }
        break
    }
  }

  private showHideIgnoreKeyElement = (show: boolean, editingStep: any) => {
    let ignoreKeyCheckboxElement: HTMLInputElement = document.getElementById(
      'ignore-element-key-chkbox',
    ) as HTMLInputElement
    let ignoreKeyCheckboxElementLbl = document.getElementById('ignore-element-key-chkbox-lbl')
    if (show && show === true) {
      ignoreKeyCheckboxElement.style.visibility = 'visible'
      ignoreKeyCheckboxElementLbl.style.visibility = 'visible'

      if (this.lastSelectedElement) {
        if (editingStep && editingStep.ignoreelementkey && editingStep.ignoreelementkey === true) {
          ignoreKeyCheckboxElement.checked = true
        }
      }
    } else {
      ignoreKeyCheckboxElement.style.visibility = 'hidden'
      ignoreKeyCheckboxElementLbl.style.visibility = 'hidden'
      ignoreKeyCheckboxElement.checked = false
    }
  }

  /// Closes Choose element Dialog
  private closeChooseElementModal = () => {
    const authoringDeckModal = document.getElementById('authoringDock')
    DomUtils.removeTabbing(authoringDeckModal)
    authoringDeckModal.parentNode.removeChild(authoringDeckModal)
    this.disablePageInspector(true)
    this.removeStepDetailModal()
    this.unHideAddTourModal()
    this.populateSteps() /// Populates steps in Add Tour Dialogue.
  }

  /// hides Choose Element Dialog
  private hideChooseElementModal = () => {
    const authoringDeck = document.getElementById('authoringDock')
    DomUtils.removeTabbing(authoringDeck)
    authoringDeck.style.display = 'none'
    // toggleChooseElement(false, true);
    // this.disablePageInspector(); // parameter : true/false????
  }

  /// Unhides Choose Element Dialog
  private unHideChooseElementModal = () => {
    const authoringDeck = document.getElementById('authoringDock')
    authoringDeck.style.display = 'block'
    authoringDeck.style.zIndex = '20000'
    if (this.lastSelectedElement != null) {
      this.toggleChooseElement(this.chooseState.Chosen, null)
    }
    DomUtils.manageTabbing(authoringDeck)
  }

  /// Removes the Element Selector box from page
  private disablePageInspector = (abort: any) => {
    const inspectorInline = document.getElementsByClassName('inspectorOutline')
    if (inspectorInline && inspectorInline.length > 0) {
      for (const elem of Array.from(inspectorInline)) {
        if (abort) {
          elem.parentNode.removeChild(elem)
        } else {
          DomUtils.off(elem as HTMLElement)
        }
      }
      if (abort) {
        if (this.lastSelectedElement) {
          this.lastSelectedElement.style.outline = this.lastSelectedElementStore['outline']
        }
        this.lastSelectedElementStore['outline'] = {}
        this.lastSelectedElement = null
      }
    }
    const body = document.querySelector('body')
    const mouseEveDebounce: any = body.onmousemove
    mouseEveDebounce && mouseEveDebounce.clear()
    body.removeEventListener('mousemove', this.bodyMouseMoveFunction)
  }

  private showDomData = (element: HTMLElement) => {
    this.lastSelectedElement = element
    if (element && this.domLookupBox) {
      const id = element.getAttribute('id')
      if (id) {
        this.domLookupBox.value = `#${id}`
      } else {
        this.domLookupBox.value = 'Id not present for the selection'
      }
    }
  }

  private enablePageInspector = (event: Event) => {
    event.stopPropagation()
    this.disablePageInspector(true)
    this.hideChooseElementModal()
    // toggleChooseElement(true, false);

    const inspector = DomUtils.appendToBody(`<div class='inspectorOutline'/>`)
    inspector.style.display = 'none'
    inspector.style.position = 'fixed'
    inspector.style.zIndex = '19000'
    inspector.style.border = '1px solid red'
    inspector.style.background = 'rgba(255, 0, 0, .3)'

    inspector.addEventListener('click', (event) => {
      if (this.lastSelectedElement) {
        if (event.altKey) {
          this.lastSelectedElement.click()
        } else {
          this.selectedElement = this.lastSelectedElement
          this.disablePageInspector(false)
          this.unHideChooseElementModal()
          this.lastSelectedElementStore['outline'] = this.selectedElement.style.outline
          this.selectedElement.style.outline = '#f00 solid 1px'
          DomUtils.hide(inspector)
          if (this.lastSelectedElement != null) {
            this.toggleChooseElement(this.chooseState.Chosen, null)
          }
        }
      }
    })

    const body = document.querySelector('body')
    body.addEventListener('mousemove', this.bodyMouseMoveFunction)
  }

  private onBodyMouseMove = (event: HTMLElementEventMap['mousemove']) => {
    const inspector: HTMLElement = document.querySelector('.inspectorOutline')
    let el: HTMLElement = event.target as any
    if (el === document.body) {
      DomUtils.hide(inspector)
      return
    } else if (el.className === 'inspectorOutline') {
      DomUtils.hide(inspector)
      el = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement
      if (el.className === 'authoringElement') {
        return
      }
    } else if (el.className === 'authoringElement') {
      return
    }
    this.lastSelectedElementOriginal = el
    const offset = DomUtils.offset(el)

    const width = DomUtils.outerWidth(el) - 1
    const height = DomUtils.outerHeight(el) - 1
    const left = offset.left
    const top = offset.top

    inspector.style.width = `${width}px`
    inspector.style.height = `${height}px`
    inspector.style.left = `${left}px`
    inspector.style.top = `${top}px`
    this.showDomData(el)
    DomUtils.show(inspector)
  }

  /// Helps in dragging Choose Element Dialog
  private dragElement = (elmnt: HTMLElement) => {
    let pos1 = 0
    let pos2 = 0
    let pos3 = 0
    let pos4 = 0

    let closeDragElement = () => {
      document.onmouseup = null
      document.onmousemove = null
    }

    let elementDrag = (event: HTMLElementEventMap['mousemove']) => {
      let e: HTMLElementEventMap['mousemove'] = event || (window.event as any)
      pos1 = pos3 - e.clientX
      pos2 = pos4 - e.clientY
      pos3 = e.clientX
      pos4 = e.clientY
      elmnt.style.top = elmnt.offsetTop - pos2 + 'px'
      elmnt.style.left = elmnt.offsetLeft - pos1 + 'px'
      e.preventDefault()
    }

    let dragMouseDown = (event: HTMLElementEventMap['mousedown']) => {
      let e: HTMLElementEventMap['mousedown'] = event || (window.event as any)
      pos3 = e.clientX
      pos4 = e.clientY
      document.onmouseup = closeDragElement
      document.onmousemove = elementDrag
      event.preventDefault()
    }

    elmnt.onmousedown = dragMouseDown
  }

  /*#EndRegion: Choose element dialog methods*/

  /// Creates and shows Cover Page Dialog
  private createCoverPageModal = () => {
    this.hideAddTourModal()
    let coverPageModal = document.getElementById('coverPageDock')
    if (!coverPageModal) {
      const chooseElementDock = this.createCoverPageTemplateFn()
      let dock = DomUtils.appendToBody(chooseElementDock)
      this.updateModalTitle()
      let coverPageTextArea = document.getElementById('cover-page-content') as HTMLTextAreaElement
      coverPageTextArea.value = this.tourCoverPageContent
      DomUtils.show(dock)
    } else {
      coverPageModal.style.display = 'block'
    }
    coverPageModal = document.getElementById('cover-page-modal')
    coverPageModal.style.display = 'block'
    let coverPageForm = document.getElementById('cover-page-form')
    DomUtils.manageTabbing(coverPageForm)

    let coverPagePositionElement = document.getElementById('cover-location-select') as HTMLSelectElement

    coverPagePositionElement.value = this.tourCoverPageLocation
    coverPagePositionElement.onchange = this.checkCoverPagePosition

    const closeBtn = document.getElementById('cover-page-close-btn')
    closeBtn.onclick = this.closeCoverPageModal

    const cancelChooseElement = document.getElementById('cancel-cover-page-btn')
    cancelChooseElement.onclick = this.closeCoverPageModal

    const saveCoverPageElement = document.getElementById('save-cover-page-btn')
    saveCoverPageElement.onclick = this.saveCoverPage
  }

  private addAnnouncementPage = () => {
    this.hideAddTourModal()
    let announcementPageModal = document.getElementById('announcementPageDock')
    if (!announcementPageModal) {
      const chooseElementDock = this.createAnnouncementTemplateFn()
      let dock = DomUtils.appendToBody(chooseElementDock)
      this.updateModalTitle()
      DomUtils.show(dock)
    } else {
      announcementPageModal.style.display = 'block'
    }
    announcementPageModal = document.getElementById('announcement-page-modal')
    announcementPageModal.style.display = 'block'

    ClassicEditor
    .create(document.getElementById('anno-message-editor'), {
      toolbar: ['heading','|', 'bold','italic','link','bulletedList', 'numberedList'],
      heading: {
        options:[
          { model: 'heading3', view: 'h4', title: 'Heading', class: 'ck-heading_heading3' },
          { model:'paragraph', title: "Paragraph", class: 'ck-heading_paragraph'}
        ]
      },
      link: {
        addTargetToExternalLinks: true
      }
    })
    .then( (editor: any) => {
      this.ckEditor = editor; 
    })
    .then((error:any) => {
      console.log(error);
    });

    let announcementPageForm = document.getElementById('announcement-page-form')
    DomUtils.manageTabbing(announcementPageForm)

    const closeBtn = document.getElementById('announcement-page-close-btn')
    closeBtn.onclick = this.closeAnnouncementPageModal

    const cancelChooseElement = document.getElementById('cancel-announcement-page-btn')
    cancelChooseElement.onclick = this.closeAnnouncementPageModal

    const saveAnnouncementPageElement = document.getElementById('save-announcement-page-btn')
    saveAnnouncementPageElement.onclick = this.saveAnnouncementPage

    const recordAnnouncementPageElement = document.getElementById('record-announcement-page-btn')
    recordAnnouncementPageElement.onclick = this.recordAnnouncementPage

  }

  /// Validates input in CoverPage Position Select Box
  private checkCoverPagePosition = () => {
    const coverPagePositionElement = document.getElementById('cover-location-select') as HTMLSelectElement

    if (coverPagePositionElement.selectedIndex === -1) {
      document.getElementById('location-select-error').style.display = 'block'
      return
    }
    const value = coverPagePositionElement.options[coverPagePositionElement.selectedIndex].value
    if (value === '' || value.toLowerCase() === 'select') {
      document.getElementById('location-select-error').style.display = 'block'
    } else {
      document.getElementById('location-select-error').style.display = 'none'
    }
  }

  private updateModalTitle = () => {
    if (this.tourCoverPageContent !== '' && this.tourCoverPageLocation !== '') {
      document.getElementById('cover-page-modal-title').innerText = 'Edit Cover Page'
    }
  }
  /// Validates input in CoverPage Body Text Area
  private checkCoverPageBodyText = () => {
    let coverPageTextArea = document.getElementById('cover-page-content') as HTMLTextAreaElement
    if (coverPageTextArea.value === '') {
      document.getElementById('coverpage-bodytext-error').style.display = 'block'
    } else {
      document.getElementById('coverpage-bodytext-error').style.display = 'none'
    }
  }

  private closeCoverPageModal = () => {
    let coverPageModal = document.getElementById('cover-page-modal')
    coverPageModal.parentNode.removeChild(coverPageModal)
    this.disablePageInspector(true)
    this.unHideAddTourModal()
    this.populateSteps() /// Populates steps in Add Tour Dialogue.
  }

  private saveCoverPage = () => {
    let coverPageElement = document.getElementById('cover-location-select') as HTMLSelectElement
    let positionSelectedElement = coverPageElement.options[coverPageElement.selectedIndex]

    if (!positionSelectedElement) {
      this.checkCoverPagePosition()
      this.checkCoverPageBodyText()
      coverPageElement.focus()
      return
    }

    let positionValue = positionSelectedElement.value

    if (positionValue === '') {
      this.checkCoverPagePosition()
      coverPageElement.focus()
      return
    }
    let coverPageTextArea = document.getElementById('cover-page-content') as HTMLTextAreaElement
    if (coverPageTextArea.value === '') {
      this.checkCoverPageBodyText()
      coverPageTextArea.focus()
      return
    }

    this.tourCoverPageLocation = positionValue
    this.tourCoverPageContent = coverPageTextArea.value

    // changes made for editing cover page
    let addCoverPageButton = document.getElementById('cover-page-btn')
    addCoverPageButton.innerHTML = '<i class="pagetour__icon icon-pencil icon-inline"></i>Edit Cover Page'
    addCoverPageButton.title = 'Edit Cover Page'

    this.closeCoverPageModal()
  }

  /*#EndRegion: Closes Cover page dialog methods*/

  private closeAnnouncementPageModal = () => {
    let announcementPageModal = document.getElementById('announcement-page-modal')
    announcementPageModal.parentNode.removeChild(announcementPageModal)
    this.unHideAddTourModal()
    this.populateSteps() /// Populates steps in Add Tour Dialogue.
  }

  private saveAnnouncementPage = () => {
    let announcementHeader = document.getElementById('input-announcement-header-text') as HTMLTextAreaElement
    if (announcementHeader.value === '') {
      document.getElementById('anno-header-error').style.display = 'block'
      return;
    } else {
      document.getElementById('anno-header-error').style.display = 'none'
    }

    let mediaUrl = document.getElementById('input-announcement-image-video') as HTMLTextAreaElement
    if (mediaUrl.value !== '' && !this.validateUrl(mediaUrl.value)) {
      document.getElementById('anno-media-error').style.display = 'block'
      return;
    } else {
      document.getElementById('anno-media-error').style.display = 'none'
    }
    let messageContent = this.ckEditor.getData();
    if(messageContent === ''){
      document.getElementById('anno-message-error').style.display = 'block'
      return;
    } else {
      document.getElementById('anno-message-error').style.display = 'none'
    }

    this.getAnnouncementPageDetails()
    this.populateSteps()
    this.closeAnnouncementPageModal()
  }

  private recordAnnouncementPage = () => {
    let speechConfig = SpeechConfig.fromSubscription("", "");
    let transcriptDiv = document.getElementById('transcript-message-for-announcement');
    speechConfig.speechRecognitionLanguage = "en-US";
    let audioConfig  = AudioConfig.fromDefaultMicrophoneInput();
    let recognizer = new SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(
      function (result) {
        transcriptDiv.innerHTML += result.text;
        window.console.log(result);

        recognizer.close();
        recognizer = undefined;
      },
      function (err) {
        transcriptDiv.innerHTML += err;
        window.console.log(err);

        recognizer.close();
        recognizer = undefined;
      });
  }
  private validateUrl(text: string) {
    let imgPattern = /^(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)+$/;
    let result = !!imgPattern.test(text);
    if(!result) {
      let videoPattern = /^(http(s?):)([/|.|\w|\s|-])*\.(?:mp4|mov|wmv|avi|)+$/;
      result = !!videoPattern.test(text);
    }
    return result;
  }
  private getAnnouncementPageDetails = () => {
    let headerElement = document.getElementById('input-announcement-header-text') as HTMLTextAreaElement
    let mediaUrlElement = document.getElementById('input-announcement-image-video') as HTMLTextAreaElement
    let transcriptElement = document.getElementById('transcript-message-for-announcement') as HTMLTextAreaElement
    let pageContext = this.getPageContext()
    if(this.tour == null)
      this.tour = {}
    this.tour.tourtype = 'announcement'
    
    let newStep: any = {}
    newStep.headerText = headerElement.value;
    newStep.mediaUrl = mediaUrlElement.value;
    newStep.message = this.ckEditor.getData();
    newStep.pagecontext = pageContext.url
    newStep.pagestatename = pageContext.state
    newStep.transcript = transcriptElement.value;

    if (this.editStepIndex !== -1) {
      this.stepList[this.editStepIndex] = newStep
      this.editStepIndex = -1
    } else {
      this.stepList.push(newStep)
    }
  }

  /*# BeginRegion:Step Details Record Box methods*/

  /// Creates and Shows Step details recording dialog
  private createRecordBox = (event: Event) => {
    event.stopPropagation()
    this.hideChooseElementModal()
    let stepDetailModal = document.getElementById('step-detail-modal')
    if (!stepDetailModal) {
      let recordBox = this.stepModalTemplateFn()
      recordBox = DomUtils.appendToBody(recordBox)
      DomUtils.show(recordBox)

      let eventTypeElement = document.getElementById('event-type-select')
      eventTypeElement.onchange = this.checkEventType

      let positionSelectElement = document.getElementById('position-select')
      positionSelectElement.onchange = this.checkPositionSelect

      let messageForStepElement = document.getElementById('message-for-step')
      messageForStepElement.onkeyup = this.checkPositionSelect

      let valueForStepElement = document.getElementById('value-for-step')
      valueForStepElement.onkeyup = this.checkValueForStep

      let saveAddNewStepBtn = document.getElementById('save-add-new-btn')
      saveAddNewStepBtn.onclick = this.saveAndAddNewStep

      let saveReturnBtn = document.getElementById('save-return-btn')
      saveReturnBtn.onclick = this.saveAndReturn

      let backToStepDetailBtn = document.getElementById('back-step-detail-btn')
      backToStepDetailBtn.onclick = this.backToStepDetails

      let stepDetailCloseBtn = document.getElementById('step-detail-close-btn')
      stepDetailCloseBtn.onclick = this.stopPagetourRecording

      let delayBeforeStepSlider: HTMLInputElement = document.getElementById('delayBeforeStepSlider') as HTMLInputElement
      let delayBeforeStepValue: HTMLInputElement = document.getElementById('delay-for-step') as HTMLInputElement
      delayBeforeStepValue.value = delayBeforeStepSlider.value

      delayBeforeStepValue.oninput = () => {
        delayBeforeStepSlider.value = delayBeforeStepValue.value
      }
      delayBeforeStepSlider.oninput = () => {
        delayBeforeStepValue.value = delayBeforeStepSlider.value
      }

      /// Loads Step details in a Record box during Edit.
      if (this.editStepIndex !== -1) {
        document.getElementById('step-detail-modal-title').innerText = 'Edit Step - Details'
        this.populateStepDetails()
      }
    } else {
      stepDetailModal.style.display = 'block'
    }
    let stepDetailForm = document.getElementById('step-detail-form')
    DomUtils.manageTabbing(stepDetailForm)
  }

  /*#BeginRegion: Step Details validations*/

  /// Validates input in Event Type Select Box
  private checkEventType = () => {
    let eventTypeElement: HTMLSelectElement = document.getElementById('event-type-select') as HTMLSelectElement

    let value = eventTypeElement.options[eventTypeElement.selectedIndex].value
    let hintText = null
    if (value === '') {
      document.getElementById('event-type-select-error').style.display = 'block'
      document.getElementById('event-type-info').style.display = 'none'
    } else {
      document.getElementById('event-type-select-error').style.display = 'none'
      switch (value) {
        case 'click':
          hintText = `<strong>Click event: </strong>
                                Highlights the chosen element and displays message, 
                                Then upon pressing next, a click event takes place on the element.`
          break
        case 'highlight':
          hintText = `<strong>Highlight event: </strong>
                                Highlights the chosen element and displays message, 
                                Then upon pressing next, a Highlight event takes place on the element.`
          break
        case 'setValue':
          hintText = `<strong>Set Value: </strong>
                                Highlights the chosen element and displays message, 
                                Then upon pressing next, a Set value takes place on the element.`
          break
      }

      let stepModalTitleMsgElement = document.getElementById('event-type-info')
      stepModalTitleMsgElement.innerHTML = hintText
      stepModalTitleMsgElement.style.display = 'block'
    }

    this.toggleValueDisplay()
  }

  /// Validates the input in Position Select Box
  private checkPositionSelect = () => {
    let positionSelectElement: HTMLSelectElement = document.getElementById('position-select') as HTMLSelectElement
    document.getElementById('position-select-error').style.display =
      positionSelectElement.options[positionSelectElement.selectedIndex].value === '' ? 'block' : 'none'
  }

  /// Validates the input in Message to User Text Box
  private checkMessageForStep = () => {
    let messageForStepErrorElement: HTMLTextAreaElement = document.getElementById(
      'message-for-step',
    ) as HTMLTextAreaElement
    document.getElementById('message-for-step-error').style.display =
      messageForStepErrorElement.value === '' ? 'block' : 'none'
  }

  /// Validates the input in Value for Step Text Box
  private checkValueForStep = () => {
    let valueForStepElement: HTMLTextAreaElement = document.getElementById('value-for-step') as HTMLTextAreaElement
    document.getElementById('value-for-step-error').style.display =
      (valueForStepElement.disabled === false && valueForStepElement.value === '') === true ? 'block' : 'none'
  }

  /// Validates the input for delay before step input box
  private checkDelayValue = () => {
    let delayInputSlider: HTMLInputElement = document.getElementById('delayBeforeStepSlider') as HTMLInputElement
    let delayInputBox: HTMLInputElement = document.getElementById('delay-for-step') as HTMLInputElement

    let min = parseInt(delayInputSlider.min)
    let max = parseInt(delayInputSlider.max)
    let delayValue = parseInt(delayInputBox.value, 10)

    document.getElementById('delay-for-step-error').style.display =
      delayValue < min || delayValue > max ? 'block' : 'none'
  }

  /// Executes inputs of all controls in Step Details Record Dialog
  private checkRecordBoxInputs = () => {
    this.checkEventType()
    this.checkPositionSelect()
    this.checkMessageForStep()
    this.checkValueForStep()
    this.checkDelayValue()

    let controlsList = ['event-type-select', 'position-select', 'message-for-step', 'value-for-step', 'delay-for-step']

    if (!this.validateandSetFocus(controlsList)) {
      event.preventDefault()
      event.stopPropagation()
      return false
    }

    return true
  }

  /*#EndRegion: Step Details validations*/

  /// Enables and disables Value for Step Text Box based on Event Type selected.
  /// When Event Type is 'Set Value', the 'Value for Step' box is enabled.
  /// All the validations of 'Value for Step' is enabled
  private toggleValueDisplay = () => {
    let eventTypeSelectBtn: HTMLSelectElement = document.getElementById('event-type-select') as HTMLSelectElement
    let valueForStepArea: HTMLTextAreaElement = document.getElementById('value-for-step') as HTMLTextAreaElement
    let valueForStepAreaLabel: HTMLElement = document.getElementById('value-for-step-label')
    if (eventTypeSelectBtn.value === 'setValue') {
      valueForStepArea.disabled = false
      valueForStepArea.setAttribute('aria-required', 'true')
      valueForStepAreaLabel.innerHTML = 'Value*:'
    } else {
      valueForStepArea.value = '' /// This cleans the disabled textbox, as this textbox is not required.
      valueForStepArea.disabled = true
      valueForStepArea.removeAttribute('aria-required')
      document.getElementById('value-for-step-error').style.display = 'none'
    }
  }

  /// Closes Step Details Record Dialog and opens Add Tour dialog
  private stopPagetourRecording = () => {
    let stepDetailModal = document.getElementById('step-detail-modal')
    stepDetailModal.parentNode.removeChild(stepDetailModal)
    const authoringDeck = document.getElementById('authoringDock')
    authoringDeck.parentNode.removeChild(authoringDeck)
    this.editStepIndex = -1
    this.disablePageInspector(true)
    this.unHideAddTourModal()
    this.populateSteps() /// Populates steps in Add Tour Dialogue.
  }

  /// Removes Step Details Record box.
  private removeStepDetailModal = () => {
    let stepDetailModal = document.getElementById('step-detail-modal')
    if (stepDetailModal != null) {
      stepDetailModal.parentNode.removeChild(stepDetailModal)
      this.editStepIndex = -1
    }
  }

  /// Takes back to Choose element Dailog from Step details Record Dialog
  private backToStepDetails = () => {
    document.getElementById('step-detail-modal').style.display = 'none'
    let authoringDeck = document.getElementById('authoringDock')
    authoringDeck.style.display = 'block'
    DomUtils.manageTabbing(authoringDeck)
  }

  /// Saves Step Details, closes Step Details Record Dialog
  /// Opens Choose Element Dailog for adding new Step
  private saveAndAddNewStep = () => {
    if (!this.checkRecordBoxInputs()) {
      return
    }
    this.getStepDetails()
    this.backToStepDetails()
    this.removeStepDetailModal()
    this.toggleChooseElement(this.chooseState.Choose, null)
    this.disablePageInspector(true)
    let chooseElementDock = document.getElementById('authoringDock')
    DomUtils.manageTabbing(chooseElementDock)
  }

  /// Saves Step Details, closes Step Details Record Dialog
  /// Opens Choose Element Dailog for adding new Step
  private saveAndReturn = () => {
    if (!this.checkRecordBoxInputs()) {
      return
    }
    this.getStepDetails()
    this.removeStepDetailModal()
    this.closeChooseElementModal()
    this.unHideAddTourModal()
    this.populateSteps() /// Populates steps in Add Tour Dialogue.
  }

  /// Extracts the content from Step Details Record box and pushes to new step to StepDetials array
  private getStepDetails = () => {
    let eventTypeElement: HTMLSelectElement = document.getElementById('event-type-select') as HTMLSelectElement
    let positionSelectElement: HTMLSelectElement = document.getElementById('position-select') as HTMLSelectElement
    let messageForStepElement: HTMLTextAreaElement = document.getElementById('message-for-step') as HTMLTextAreaElement
    let errorMessageForStepElement: HTMLTextAreaElement = document.getElementById(
      'error-message-for-step',
    ) as HTMLTextAreaElement
    let valueForStepElement: HTMLTextAreaElement = document.getElementById('value-for-step') as HTMLTextAreaElement
    let delayBeforeStepSlider: HTMLInputElement = document.getElementById('delayBeforeStepSlider') as HTMLInputElement
    let transcriptForStepElement: HTMLTextAreaElement = document.getElementById(
      'transcript-message-for-step',
    ) as HTMLTextAreaElement

    let eventType = eventTypeElement.options[eventTypeElement.selectedIndex].value
    let position = positionSelectElement.options[positionSelectElement.selectedIndex].value
    let message = messageForStepElement.value
    let errorMessage = errorMessageForStepElement.value
    let value = valueForStepElement.value
    let delayBefore: number = parseInt((document.getElementById('delay-for-step') as HTMLInputElement).value, 10)

    let newStep: any = {}
    newStep.type = eventType
    newStep.position = position
    newStep.message = message
    newStep.delayBefore = delayBefore
    newStep.errorMessage = errorMessage ? errorMessage : ''
    newStep.value = value
    let id = this.lastSelectedElement.getAttribute('id')
    newStep.key = id ? '#' + this.lastSelectedElement.getAttribute('id') : ''
    newStep.selector = ''
    let options = {
      selectorTypes: ['Class', 'Tag', 'NthChild'],
    }
    let elementSelector = unique(this.lastSelectedElementOriginal, options)
    newStep.selector = elementSelector.toString()
    let pageContext = this.getPageContext()
    newStep.pagecontext = pageContext.url
    newStep.pagestatename = pageContext.state

    let ignoreKeyCheckboxElement: HTMLInputElement = document.getElementById(
      'ignore-element-key-chkbox',
    ) as HTMLInputElement
    if (ignoreKeyCheckboxElement) {
      newStep.ignoreelementkey = ignoreKeyCheckboxElement.checked
    } else {
      newStep.ignoreelementkey = false
    }

    let ignoreNextIfNextStepElementFound: HTMLInputElement = document.getElementById(
      'ignoreStep-IfNextStepElementFound-chkbox',
    ) as HTMLInputElement
    if (ignoreNextIfNextStepElementFound && ignoreNextIfNextStepElementFound.checked) {
      newStep.ignoreStepIf = true
      newStep.ignoreStepIfConditions = 'NextStepElementFound'
    } else {
      newStep.ignoreStepIf = false
    }

    newStep.transcript = transcriptForStepElement.value;

    /// Updates the step in stepDetails during edit of a step or pushes a new step to the stepDetails array.
    if (this.editStepIndex !== -1) {
      this.stepList[this.editStepIndex] = newStep
      this.editStepIndex = -1
    } else {
      this.stepList.push(newStep)
    }
  }

  /// Resets the Create Record Box and sets to default values.
  private resetStepDetailsModal = () => {
    let stepDetailModal = document.getElementById('step-detail-modal')
    if (stepDetailModal) {
      ;(document.getElementById('event-type-select') as HTMLSelectElement).value = 'click'
      ;(document.getElementById('position-select') as HTMLSelectElement).value = 'right'
      ;(document.getElementById('message-for-step') as HTMLTextAreaElement).value = ''
      ;(document.getElementById('error-message-for-step') as HTMLTextAreaElement).value = ''
      ;(document.getElementById('value-for-step') as HTMLTextAreaElement).value = ''
    }
  }

  /// This loads the details of a step in the Record box.
  private populateStepDetails = () => {
    let step = this.stepList[this.editStepIndex]
    ;(document.getElementById('event-type-select') as HTMLSelectElement).value = step.type
    ;(document.getElementById('position-select') as HTMLSelectElement).value = step.position
    ;(document.getElementById('message-for-step') as HTMLTextAreaElement).value = step.message
    ;(document.getElementById('error-message-for-step') as HTMLTextAreaElement).value = step.errorMessage
    ;(document.getElementById('value-for-step') as HTMLTextAreaElement).value = step.value
    ;(document.getElementById('transcript-message-for-step') as HTMLTextAreaElement).value = step.transcript
    if (step.delayBefore) {
      let delayBeforeStepSlider: HTMLInputElement = document.getElementById('delayBeforeStepSlider') as HTMLInputElement
      let delayBeforeStepValue: HTMLInputElement = document.getElementById('delay-for-step') as HTMLInputElement
      delayBeforeStepSlider.value = String(step.delayBefore)
      delayBeforeStepValue.value = delayBeforeStepSlider.value
    }
    this.toggleValueDisplay()
  }

  private getPageContext = () => {
    return this.dataStore.getPageContext()
  }

  private getCurrentUser = () => {
    const opts = this.configStore.Options
    return opts.userInfo.getCurrentUser()
  }
  /*#EndRegion:Step Details Record Box methods*/
}

export { PageTourAuthor }
