import { ConfigStore } from '../common/configstore'
import * as tourBoxHtml from './tour-box.html'
import * as AnnouncementBoxHtml from './announcement-page.html'
import { DomUtils } from '../common/domutils'
import * as viewCoverPageModalTemplate from './view-cover-page-modal.html'
import { RunTourAction } from '../models/runtouraction'
import { StepAction } from '../models/stepaction'
import Popper, { Placement } from 'popper.js'
import { Tutorial } from '../pagetour'
import { PageContext } from '../models/pagecontext'
import { Step } from '../models/step'
import { PageTourTheme } from '../models/pagetourtheme'
import { DataStore } from '../common/datastore'

declare const $: any
class PageTourPlay {
  private tour: any = JSON.parse('{}')
  private tether: any = {}
  private totalSteps = 0
  private tourBox: any = {}
  private datastore: any = {}
  private currentStep = 0
  private delay = 750
  private maxRetryCount = 5
  private modal: any = null
  private dock: any = null
  private defaultFontFamily = 'Segoe UI'
  private autoPlayTest: boolean

  // Template Functions
  private tourBoxHtmlFn: any = tourBoxHtml

  private announcementBoxFn: any = AnnouncementBoxHtml
  private viewCoverPageTemplateFn: any = viewCoverPageModalTemplate
  public isTourPlaying: boolean

  tourTheme: PageTourTheme

  constructor(private configStore: ConfigStore, private dataStore: DataStore) {
    this.isTourPlaying = false
    this.tourTheme = configStore.Options.theme
  }

  public playTour = async (tourId: any, action: RunTourAction, startInterval: any, autoPlayTest: boolean = false) => {
    try {
      const tour = await this.dataStore.GetTourById(tourId)
      this.autoPlayTest = autoPlayTest

      switch(tour.tourtype.toLowerCase()){ 
        case "announcement":
          this.runAnnouncement(tour, action, startInterval, null, autoPlayTest)
          break;
        case "smarttip":
          this.runSmartTip(tour, action, startInterval, null, autoPlayTest)
          break;
        case "pagetour":
        case "default":
          this.runTour(tour, action, startInterval, null, autoPlayTest)
          break;
      }
    } catch (err) {
      throw new Error(err as string)
    }
  }

  // This method runs tour.
  public runTour = (
    objTour: Tutorial,
    action: RunTourAction,
    startInterval: any,
    callback: any = null,
    autoPlayTest: boolean = false,
  ) => {
    if (this.isTourPlaying) {
      return
    }
    this.isTourPlaying = true
    this.tour = objTour
    if (objTour.steps[0].delayBefore) {
      startInterval = parseInt(String(objTour.steps[0].delayBefore), 10) * 1000
    }
    if (objTour.coverPage && objTour.coverPage.location.toLowerCase() === 'start') {
      this.showCoverPageModal(objTour, action, callback, startInterval, autoPlayTest)
    } else {
      this.beginTourSteps(objTour, action, callback, startInterval, autoPlayTest)(
        objTour,
        action,
        callback,
        startInterval,
        autoPlayTest,
      )
    }
  }

  public runSmartTip = (
    objTour: Tutorial,
    action: RunTourAction,
    startInterval: any,
    callback: any = null,
    autoPlayTest: boolean = false,
  ) => {
    objTour.steps.forEach((element,i) => {
      let selectedElement = document.querySelector(element.selector);
      // let img = document.createElement('img');
      // img.src = 'https://fxpsitstoragenew.z13.web.core.windows.net/effective-thinking-concept-solution-bulb-260nw-1165554163.jpg';
      // img.title = element.message;
      // img.height = 40;
      // img.width = 40;
      // //img.setAttribute("data-tooltip", element.message);
      // selectedElement.appendChild(img);
      // selectedElement.insertBefore(img, selectedElement.nextSibling);

      let div = document.createElement('div');
      div.className = "hrw-hint";
      div.addEventListener("mouseover", function() {
        let availableSmartTips = document.querySelectorAll('[id^="smarttip_"]');
        availableSmartTips.forEach((tips) => {
          tips.className = "triangle-border top";
        });
        console.log(availableSmartTips);
        let smartTip = document.getElementById("smarttip_" + objTour.id + "_" + i)
        smartTip.className = "triangle-border top active"
      });
      div.innerHTML = "<a href='#' role='button' class='smarttip hrw-focusable' aria-label='Smart tip'><div class='smarttip-bubble'></div><div class='smarttip-bubble-out'></div></a><div id=smarttip_" + objTour.id + "_" + i +"  class='triangle-border top'><div>"+ element.message +"</div>";
      selectedElement.appendChild(div);
    });
  }

  public runAnnouncement = (
    objTour: Tutorial,
    action: RunTourAction,
    startInterval: any,
    callback: any = null,
    autoPlayTest: boolean = false,
  ) => {
    // if (this.isTourPlaying) {
    //   return
    // }
    // this.isTourPlaying = true
    this.tour = objTour
    this.LaunchAnnouncement(this.tour,action, startInterval, callback, autoPlayTest)(
      objTour,
      action,
      callback,
      startInterval,
      autoPlayTest,
    );
  }

  private LaunchAnnouncement = (
    tour: Tutorial,
    action: RunTourAction,
    startInterval: any,
    callback: any = null,
    autoPlayTest: boolean = false,
  ) => {
    let self = this
    return function(
      tour: Tutorial,
      action: RunTourAction,
      startInterval: any,
      callback: any = null,
      autoPlayTest: boolean = false,
    ) {
      const opts = self.configStore.Options
      if (opts.navigator.callbackBeforeTourStart != null) {
        opts.navigator.callbackBeforeTourStart(self.tour)
      }

      self.initializeAnnouncement(tour)

      let retVal = {} as PageContext
      retVal.state = tour.steps[0].pagestatename
      retVal.url = tour.steps[0].pagecontext

      self.navigateToStart(retVal)

      if (autoPlayTest === true) {
        const opts = self.configStore.Options
        if (opts.navigator.callbackOnTourStart != null) {
          opts.navigator.callbackOnTourStart(self.tour)
        }
        let tourEndsWithCoverPage = tour.coverPage && tour.coverPage.location.toLowerCase() === 'end'
        self.executeNextStep(tour, action, 0, 0, tourEndsWithCoverPage, callback, startInterval)
        setInterval(() => {
          self.goToNextStep(StepAction.Next, tour, action, callback, startInterval)
          if (self.currentStep === self.totalSteps - 1) {
            clearInterval()
          }
        }, startInterval)
      } else {
        setTimeout(() => {
          const opts = self.configStore.Options
          if (opts.navigator.callbackOnTourStart != null) {
            opts.navigator.callbackOnTourStart(self.tour)
          }

          self.executeAnnouncementNextStep(tour, action, 0, 0, callback, startInterval)

          const nextButton: HTMLButtonElement = document.querySelector('#anno-next-step')
          if (nextButton) {
            nextButton.addEventListener('click', () => {
              self.goToAnnouncementNextStep(StepAction.Next, tour, action, callback, startInterval)
            })
          }

          const previousButton: HTMLButtonElement = document.querySelector('#anno-previous-step')
          if (previousButton) {
            previousButton.addEventListener('click', () => {
              self.goToAnnouncementNextStep(StepAction.Previous, tour, action, callback, startInterval)
            })
          }

          const exitButton: HTMLButtonElement = document.querySelector('#anno-exit-step')
          if (exitButton) {
            exitButton.addEventListener('click', () => {
              self.goToAnnouncementNextStep(StepAction.Exit, tour, action, callback, startInterval)
            })
          }
        }, startInterval)
      }
    }
  }

  private beginTourSteps = (
    tour: Tutorial,
    action: RunTourAction,
    callback: any,
    startInterval: any,
    autoPlayTest: boolean = false,
  ) => {
    let self = this
    return function(
      tour: Tutorial,
      action: RunTourAction,
      callback: any,
      startInterval: any,
      autoPlayTest: boolean = false,
    ) {
      const opts = self.configStore.Options
      if (opts.navigator.callbackBeforeTourStart != null) {
        opts.navigator.callbackBeforeTourStart(self.tour)
      }
      if (tour.coverPage && tour.coverPage.location === 'start') {
        self.modal = document.getElementById('cover-page-modal')
        self.modal.parentNode.removeChild(self.modal)
        // self.disablePageInspector(true)
      }

      self.initialize(tour)

      let retVal = {} as PageContext
      retVal.state = tour.steps[0].pagestatename
      retVal.url = tour.steps[0].pagecontext

      self.navigateToStart(retVal)

      if (autoPlayTest === true) {
        const opts = self.configStore.Options
        if (opts.navigator.callbackOnTourStart != null) {
          opts.navigator.callbackOnTourStart(self.tour)
        }
        let tourEndsWithCoverPage = tour.coverPage && tour.coverPage.location.toLowerCase() === 'end'
        self.executeNextStep(tour, action, 0, 0, tourEndsWithCoverPage, callback, startInterval)
        setInterval(() => {
          self.goToNextStep(StepAction.Next, tour, action, callback, startInterval)
          if (self.currentStep === self.totalSteps - 1) {
            clearInterval()
          }
        }, startInterval)
      } else {
        setTimeout(() => {
          const opts = self.configStore.Options
          if (opts.navigator.callbackOnTourStart != null) {
            opts.navigator.callbackOnTourStart(self.tour)
          }
          let tourEndsWithCoverPage = tour.coverPage && tour.coverPage.location.toLowerCase() === 'end'

          self.executeNextStep(tour, action, 0, 0, tourEndsWithCoverPage, callback, startInterval)

          const nextButton: HTMLButtonElement = document.querySelector('#pagetour-next-step')
          if (nextButton) {
            nextButton.addEventListener('click', () => {
              self.goToNextStep(StepAction.Next, tour, action, callback, startInterval)
            })
          }

          const previousButton: HTMLButtonElement = document.querySelector('#pagetour-previous-step')
          if (previousButton) {
            previousButton.addEventListener('click', () => {
              self.goToNextStep(StepAction.Previous, tour, action, callback, startInterval)
            })
          }

          const exitButton: HTMLButtonElement = document.querySelector('#pagetour-exit-step')
          if (exitButton) {
            exitButton.addEventListener('click', () => {
              self.goToNextStep(StepAction.Exit, tour, action, callback, startInterval)
            })
          }
        }, startInterval)
      }
    }
  }

  private goToNextStep = (
    stepAction: StepAction,
    tour: Tutorial,
    action: RunTourAction,
    callback: any,
    startInterval: any,
    autoPlayTest: boolean = false,
  ) => {
    const self = this
    const opts = self.configStore.Options
    // self.ApplyTheme(self.currentStep)
    if (stepAction === StepAction.Next) {
      let tourEndsWithCoverPage = tour.coverPage && tour.coverPage.location.toLowerCase() === 'end'
      const nextButton: HTMLButtonElement = document.querySelector('#pagetour-next-step')
      nextButton.classList.add('loadingNextStep')
      nextButton.disabled = true

      if (self.currentStep === this.totalSteps - 1) {
        self.isTourPlaying = false
      }
      let element = document.querySelector(self.getElementSelector(self.currentStep))
      let stepType = self.tour.steps[self.currentStep].type
      self.executeAction(tour, stepType, element, self.currentStep)
      if (self.currentStep === self.totalSteps - 1) {
        self.removeTether()
        if (tourEndsWithCoverPage) {
          self.showCoverPageModal(tour, action, callback, startInterval)
        } else {
          if (callback != null) callback()
        }

        if (self.currentStep === this.totalSteps - 1) {
          if (opts.navigator.callbackAfterTourEnd != null) {
            opts.navigator.callbackAfterTourEnd(tour)
          }
        }
      } else {
        let prevStep = tour.steps[self.currentStep]
        self.currentStep = self.currentStep + 1
        let newStep = tour.steps[self.currentStep]
        let delay = self.getDelayBeforeNextStep(prevStep, newStep)

        setTimeout(() => {
          self.executeNextStep(tour, action, self.currentStep, 0, tourEndsWithCoverPage, callback, startInterval)
        }, delay)
      }
      self.cleanupAction(element)
    } else if (stepAction === StepAction.Exit) {
      let element = document.querySelector(self.getElementSelector(self.currentStep))
      self.cleanupAction(element)
      self.removeTether()
      if (callback != null) callback()
      if (opts.navigator.callbackAfterTourEnd != null) {
        opts.navigator.callbackAfterTourEnd(self.tour)
      }
      self.isTourPlaying = false
    } else if (stepAction === StepAction.Previous) {
      let tourEndsWithCoverPage = tour.coverPage && tour.coverPage.location.toLowerCase() === 'end'
      const previousButton: HTMLButtonElement = document.querySelector('#pagetour-previous-step')
      previousButton.classList.add('loadingNextStep')
      previousButton.disabled = true

      if (self.currentStep === 0) {
        return
      }
      let element = document.querySelector(self.getElementSelector(self.currentStep))
      let stepType = self.tour.steps[self.currentStep].type
      // self.executeAction(tour, stepType, element, self.currentStep)
      let prevStep = self.currentStep === 1 ? tour.steps[0] : tour.steps[self.currentStep - 2]
      self.currentStep = self.currentStep - 1
      let newStep = tour.steps[self.currentStep]
      let delay = self.getDelayBeforeNextStep(prevStep, newStep)

      setTimeout(() => {
        self.executeNextStep(tour, action, self.currentStep, 0, tourEndsWithCoverPage, callback, startInterval)
      }, delay)
      self.cleanupAction(element)
    }
  }

  /**
   * gotoAnnoucementNextStep - 
   * @param stepAction - enum with value Next, Exit, Previous.
   * @param tour - tour object to be displayed.
   * @param action - enum with value Preview, Play.
   * @param callback - the callback function to be executed after some action.
   * @param startInterval - time in milliseconds to delay the start event.
   * @param autoPlayTest 
   * @returns null
   */
  private goToAnnouncementNextStep = (
    stepAction: StepAction,
    tour: Tutorial,
    action: RunTourAction,
    callback: any,
    startInterval: any,
    autoPlayTest: boolean = false,
  ) => {
    const self = this
    const opts = self.configStore.Options
    // self.ApplyTheme(self.currentStep)
    if (stepAction === StepAction.Next) {
      const nextButton: HTMLButtonElement = document.querySelector('#anno-next-step')
      nextButton.classList.add('loadingNextStep')
      nextButton.disabled = true

      if (self.currentStep === this.totalSteps - 1) {
        self.isTourPlaying = false
      }

      // let element = document.querySelector(self.getElementSelector(self.currentStep))
      // let stepType = self.tour.steps[self.currentStep].type
      // self.executeAction(tour, stepType, element, self.currentStep)
      if (self.currentStep === self.totalSteps - 1) {
        self.removeTether()
        // if (callback != null) callback()

        if (self.currentStep === this.totalSteps - 1) {
          if (opts.navigator.callbackAfterTourEnd != null) {
            opts.navigator.callbackAfterTourEnd(tour)
          }
          // code to dismiss the announcement if it is last step
          let element = document.querySelector(self.getElementSelector(self.currentStep))
          self.cleanupAction(element)
          if (opts.navigator.callbackAfterTourEnd != null) {
            opts.navigator.callbackAfterTourEnd(self.tour)
          }
          self.isTourPlaying = false
        }
      } else {
        let prevStep = tour.steps[self.currentStep]
        self.currentStep = self.currentStep + 1
        let newStep = tour.steps[self.currentStep]
        let delay = self.getDelayBeforeNextStep(prevStep, newStep)

        setTimeout(() => {
          self.executeAnnouncementNextStep(tour, action, self.currentStep, 0, callback, startInterval)
        }, delay)
      }
      // self.cleanupAction(element)
    } else if (stepAction === StepAction.Exit) {
      let element = document.querySelector(self.getElementSelector(self.currentStep))
      self.cleanupAction(element)
      self.removeTether()
      if (callback != null) callback()
      if (opts.navigator.callbackAfterTourEnd != null) {
        opts.navigator.callbackAfterTourEnd(self.tour)
      }
      self.isTourPlaying = false
    } else if (stepAction === StepAction.Previous) {
      const previousButton: HTMLButtonElement = document.querySelector('#anno-previous-step')
      const nextButton: HTMLButtonElement = document.querySelector("#anno-next-step");
      previousButton.classList.add('loadingNextStep')
      previousButton.disabled = true
      nextButton.innerText = "Next"
      

      if (self.currentStep === 0) {
        return
      }
      let element = document.querySelector(self.getElementSelector(self.currentStep))
      let stepType = self.tour.steps[self.currentStep].type
      // self.executeAction(tour, stepType, element, self.currentStep)
      let prevStep = self.currentStep === 1 ? tour.steps[0] : tour.steps[self.currentStep - 2]
      self.currentStep = self.currentStep - 1
      let newStep = tour.steps[self.currentStep]
      let delay = self.getDelayBeforeNextStep(prevStep, newStep)

      setTimeout(() => {
        self.executeAnnouncementNextStep(tour, action, self.currentStep, 0, callback, startInterval)
      }, delay)
      self.cleanupAction(element)
    }
  }

  private getDelayBeforeNextStep = (currentStepObj: Step, nextStep: Step) => {
    let currentStepPageState = currentStepObj.pagestatename
    let nextStepPageState = nextStep.pagestatename
    if (nextStep.delayBefore) {
      return parseInt(String(nextStep.delayBefore), 10) * 1000
    }

    if (currentStepPageState && currentStepPageState !== '' && (nextStepPageState && nextStepPageState !== '')) {
      if (currentStepPageState === nextStepPageState) {
        return 0
      } else {
        return 1000 // delay before next state change
      }
    } else {
      return 1000 // delay before next url change
    }

    return 0
  }

  private initialize = (tour: any) => {
    this.totalSteps = tour.steps.length
    this.currentStep = 0
    this.setupTourBox(tour)
  }

  private initializeAnnouncement = (tour: any) => {
    this.totalSteps = tour.steps.length
    this.currentStep = 0
    this.setupAnnouncementBox(tour)
  }

  private navigateToStart = (pageContext: PageContext) => {
    if (!pageContext) {
      return
    }
    const opts = this.configStore.Options
    if (opts.navigator && opts.navigator.navigateToContext) {
      opts.navigator.navigateToContext(pageContext)
    } else {
      window.location.href = window.location.protocol + '//' + window.location.host + pageContext
    }
  }

  private setupTourBox = (tour: any) => {
    this.totalSteps = tour.steps.length
    this.tourBox = DomUtils.appendToBody(this.tourBoxHtmlFn())
    //this.tourBox.style.zIndex = '20000'
  }

  private setupAnnouncementBox = (tour: any) => {
    this.totalSteps = tour.steps.length
    this.tourBox = DomUtils.appendToBody(this.announcementBoxFn())
    this.tourBox.style.zIndex = '20000'
  }

  private executeAction = (tour: Tutorial, action: any, element: HTMLElement, step: number) => {
    if (element != null) {
      element.focus()
      switch (action) {
        case 'click':
          element.click()
          break
        case 'highlight':
          break
        case 'setValue':
          this.setControlValue(element, tour.steps[step].value)
          break
      }
    }
  }

  private executeNextStep = (
    tour: Tutorial,
    action: RunTourAction,
    stepCount: number,
    retryCount = 0,
    tourEndsWithCoverPage = false,
    callback: any,
    startInterval: any,
  ) => {
    let elementSelector = this.getElementSelector(stepCount)
    const opts = this.configStore.Options
    if (
      retryCount > this.maxRetryCount ||
      (elementSelector === null || elementSelector === '' || elementSelector === ' ' || elementSelector === 'undefined')
    ) {
      let self = this
      self.isTourPlaying = false

      if (action === RunTourAction.Play) {
        // on any failure disable auto play of that tour
        self.updateUserActions(tour, 'Completed', stepCount.toString(), 'Failed after retry')
      }
      let stepErrorMsg: string = null
      if (opts.navigator.callbackOnTourStepFailure != null) {
        if (
          tour.steps != null &&
          tour.steps.length >= stepCount &&
          tour.steps[stepCount] != null &&
          tour.steps[stepCount].errormessage != null &&
          tour.steps[stepCount].errormessage !== 'undefined' &&
          tour.steps[stepCount].errormessage !== '' &&
          tour.steps[stepCount].errormessage !== ' '
        ) {
          stepErrorMsg = tour.steps[stepCount].errormessage
        }
        opts.navigator.callbackOnTourStepFailure(self.tour, stepCount, stepErrorMsg)
      }
      self.removeTether()
      return
    }

    let currentStep = tour.steps[stepCount]
    let nextStepWillBe: Step
    if (stepCount + 1 < tour.steps.length) {
      nextStepWillBe = tour.steps[stepCount + 1]
    }

    let ignoreCurrentStep: Boolean = false
    if (currentStep.ignoreStepIf && currentStep.ignoreStepIf === true) {
      if (currentStep.ignoreStepIfConditions && currentStep.ignoreStepIfConditions === 'NextStepElementFound') {
        let nextStepElementSelector = this.getElementSelector(stepCount + 1)
        if (
          nextStepElementSelector &&
          nextStepElementSelector !== '' &&
          nextStepElementSelector !== ' ' &&
          nextStepElementSelector !== 'undefined'
        ) {
          let nextStepElement = document.querySelector(nextStepElementSelector)
          if (this.isValidElement(nextStepElement)) {
            ignoreCurrentStep = true
          }
        }
      }
    }

    let element = document.querySelector(elementSelector)
    if (this.isValidElement(element)) {
      const previoustButton: HTMLButtonElement = document.querySelector('#pagetour-previous-step')
      const nextButton: HTMLButtonElement = document.querySelector('#pagetour-next-step')

      previoustButton.hidden = false
      previoustButton.disabled = false
      nextButton.hidden = false
      nextButton.disabled = false
      if (stepCount === 0) {
        // First step with element.
        if (action === RunTourAction.Play && (!opts.isCoverPageTourStart || !tour.coverPage ||tour.coverPage==null || tour.coverPage.location.toLowerCase() != 'start')) {
          this.updateUserActions(tour, 'Started', '0', 'Playing')
        }
        previoustButton.hidden = true
        previoustButton.disabled = true
      }

      if (!ignoreCurrentStep) {
        if (opts.navigator.callbackBeforeTourStep != null) {
          opts.navigator.callbackBeforeTourStep(this.tour)
        }
        if (stepCount === this.totalSteps - 1 && !tourEndsWithCoverPage) {
          nextButton.hidden = true
          nextButton.disabled = true
        }
        nextButton.classList.remove('loadingNextStep')
        previoustButton.classList.remove('loadingNextStep')
        nextButton.disabled = false
        previoustButton.disabled = false

        let stepDescription = this.tour.steps[stepCount].message
        let stepHeadingElement = document.getElementById('usermessageboxtitle')
        let stepDescriptionElement = document.getElementById('usermessageboxdescription')
        let stepCounter = document.getElementById('usermessageboxcounter')

        if (this.tour.title !== undefined && this.tour.title !== '') {
          stepHeadingElement.innerText = this.tour.title + '.'
        } else {
          stepHeadingElement.innerText = ''
        }

        stepCounter.innerText = stepCount + 1 + ' / ' + this.tour.steps.length

        stepDescriptionElement.innerText = stepDescription

        this.tether = this.getTetherObject(stepCount, elementSelector)
        this.addTourOutline(element)
        this.scrollIntoView(element)
        this.ApplyTheme(stepCount)
        this.srSpeak(`${this.tour.title} dialog`, 'assertive', 'dialog')
        let tourBoxElement: HTMLElement = document.getElementById('pagetour-tourBox')
        DomUtils.manageTabbing(tourBoxElement)
        if (opts.navigator.callbackAfterTourStep != null) {
          opts.navigator.callbackAfterTourStep(this.tour.steps[stepCount])
        }
      }

      if (stepCount === this.totalSteps - 1) {
        if (action === RunTourAction.Play) {
          this.updateUserActions(tour, 'Completed', stepCount.toString(), 'Competed all steps')
        }
      } else if (ignoreCurrentStep && ignoreCurrentStep === true) {
        let self: any = this
        self.goToNextStep(StepAction.Next, tour, action, callback, startInterval)
      }
    } else {
      let self: any = this
      if (ignoreCurrentStep && ignoreCurrentStep === true) {
        self.goToNextStep(StepAction.Next, tour, action, callback, startInterval)
      } else {
        setTimeout(function() {
          self.executeNextStep(tour, action, stepCount, retryCount + 1)
        }, this.delay)
      }
    }
  }


  private executeAnnouncementNextStep = (
    tour: Tutorial,
    action: RunTourAction,
    stepCount: number,
    retryCount = 0,
    callback: any,
    startInterval: any,
  ) => {
    const opts = this.configStore.Options
    if (retryCount > this.maxRetryCount) {
      let self = this
      self.isTourPlaying = false

      if (action === RunTourAction.Play) {
        // on any failure disable auto play of that tour
        self.updateUserActions(tour, 'Completed', stepCount.toString(), 'Failed after retry')
      }
      let stepErrorMsg: string = null
      if (opts.navigator.callbackOnTourStepFailure != null) {
        if (
          tour.steps != null &&
          tour.steps.length >= stepCount &&
          tour.steps[stepCount] != null &&
          tour.steps[stepCount].errormessage != null &&
          tour.steps[stepCount].errormessage !== 'undefined' &&
          tour.steps[stepCount].errormessage !== '' &&
          tour.steps[stepCount].errormessage !== ' '
        ) {
          stepErrorMsg = tour.steps[stepCount].errormessage
        }
        opts.navigator.callbackOnTourStepFailure(self.tour, stepCount, stepErrorMsg)
      }
      self.removeTether()
      return
    }

    let currentStep = tour.steps[stepCount]
    let nextStepWillBe: Step
    if (stepCount + 1 < tour.steps.length) {
      nextStepWillBe = tour.steps[stepCount + 1]
    }

      const previoustButton: HTMLButtonElement = document.querySelector('#anno-previous-step')
      const nextButton: HTMLButtonElement = document.querySelector('#anno-next-step')
      const annoCounter: HTMLButtonElement = document.querySelector('#annoboxcounter')

      previoustButton.hidden = false
      previoustButton.disabled = false
      nextButton.hidden = false
      nextButton.disabled = false
      if (stepCount === 0) {
        // First step with element.
        if (action === RunTourAction.Play) {
          this.updateUserActions(tour, 'Started', '0', 'Playing')
        }
        previoustButton.hidden = true
        previoustButton.disabled = true
        annoCounter.style.width = '78%'
      }
      if (opts.navigator.callbackBeforeTourStep != null) {
        opts.navigator.callbackBeforeTourStep(this.tour)
      }
      if (stepCount === this.totalSteps - 1) {
        // nextButton.hidden = true
        // nextButton.disabled = true
        nextButton.innerText = "Let's go!"
        annoCounter.style.width = '78%'
      }
        nextButton.classList.remove('loadingNextStep')
        previoustButton.classList.remove('loadingNextStep')
        nextButton.disabled = false
        previoustButton.disabled = false

        let stepDescription = this.tour.steps[stepCount].message
        let stepHeadingElement = document.getElementById('announcementboxtitle')
        let stepDescriptionElement = document.getElementById('announcementboxdescription')
        let stepCounter = document.getElementById('annoboxcounter')
        let imgHeaderContainer = document.getElementById('imgHeaderContainer') as HTMLImageElement
        let videoSourceContainer = document.getElementById('videoSourceContainer') as HTMLSourceElement
        let videoHeaderContainer = document.getElementById('videoHeaderContainer') as HTMLVideoElement

        imgHeaderContainer.onload = function () {
          imgHeaderContainer.className = 'noLoadingImage'
       }

        if (this.tour.steps[stepCount].mediaUrl !== undefined && this.tour.steps[stepCount].mediaUrl !== '') {
          if (this.validImageURL(this.tour.steps[stepCount].mediaUrl)) {
            imgHeaderContainer.src = this.tour.steps[stepCount].mediaUrl
            imgHeaderContainer.style.display = 'block'
            videoHeaderContainer.style.display ='none'
            imgHeaderContainer.className = 'loadingImage'
            imgHeaderContainer.alt = 'Image of Announcement'
          } else if(this.validVideoUrl(this.tour.steps[stepCount].mediaUrl)) {
            videoSourceContainer.src = this.tour.steps[stepCount].mediaUrl;
            videoHeaderContainer.style.display ='block'
            videoHeaderContainer.load();
            videoHeaderContainer.play();
            imgHeaderContainer.style.display = 'none'
          }
        }
        else {
          imgHeaderContainer.src = this.configStore.Options.announcementDefaultImage
          imgHeaderContainer.style.display = 'block'
          videoHeaderContainer.style.display ='none'
        }

        stepCounter.innerText = stepCount + 1 + ' of ' + this.tour.steps.length
        stepHeadingElement.innerText = this.tour.steps[stepCount].headerText
        stepDescriptionElement.innerHTML = stepDescription

        //this.tether = this.getTetherObject(stepCount)
        this.ApplyAnnouncementTheme(stepCount)
        this.srSpeak(`${this.tour.headerText} dialog`, 'assertive', 'dialog')
        let tourBoxElement: HTMLElement = document.getElementById('anno-tourBox')
        DomUtils.manageTabbing(tourBoxElement)
        if (opts.navigator.callbackAfterTourStep != null) {
          opts.navigator.callbackAfterTourStep(this.tour.steps[stepCount])
        }

      if (stepCount === this.totalSteps - 1) {
        if (action === RunTourAction.Play) {
          this.updateUserActions(tour, 'Completed', stepCount.toString(), 'Competed all steps')
        }
      }
  }
  
  private validImageURL(text: string) {
    let pattern = /^(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)+$/;
    let result = !!pattern.test(text);
    return result;
  }

  private validVideoUrl(text: string) {
    let pattern = /^(http(s?):)([/|.|\w|\s|-])*\.(?:mp4|mov|wmv|avi|)+$/;
    let result = !!pattern.test(text);
    return result;
  }

  private isValidElement = (element: HTMLElement) => {
    return element && !element.getAttribute('disabled')
  }

  private ApplyTheme(stepCount: number) {
    let tourBoxElement = document.getElementById('pagetour-tourBox')
    let arrow = document.getElementById('arrowpointer')
    let ptnavigationdiv = document.getElementById('ptnavigationdiv')
    let previousIcon = document.getElementById('ptpreviousimg')
    let nextIcon = document.getElementById('ptnextimg')
    let counter = document.getElementById('usermessageboxcounter')
    let tourboxdata = document.getElementById('tourboxdata')

    if (this.tourTheme.isRounded) {
      tourboxdata.style.borderRadius = this.tourTheme.borderRadius ? `${this.tourTheme.borderRadius}px` : '10px'
    } else {
      tourboxdata.style.borderRadius = '0px'
    }

    ptnavigationdiv.style.background = this.tourTheme.primaryColor
    previousIcon.style.color = this.tourTheme.secondaryColor
    nextIcon.style.color = this.tourTheme.secondaryColor
    counter.style.color = this.tourTheme.secondaryColor
    tourboxdata.style.borderColor = this.tourTheme.primaryColor
    tourboxdata.style.color = this.tourTheme.textColor
    tourboxdata.style.fontFamily = this.tourTheme.fontFamily ? this.tourTheme.fontFamily : this.defaultFontFamily
    tourBoxElement.style.borderColor = this.tourTheme.primaryColor
    tourBoxElement.style.borderLeftWidth = '3px'
    let position = this.tour.steps[stepCount].position
    const BORDER_WIDTH_THICK = 6
    const BORDER_WIDTH_NORMAL = 1
    switch (position) {
      case 'aboveLeft':
        arrow.className = 'arrow-pointer arrow-down'
        arrow.style.alignSelf = 'flex-start'
        arrow.style.margin = '0px 10px'
        tourBoxElement.style.flexDirection = 'column-reverse'
        arrow.style.borderTopColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderRightColor = 'transparent'
        arrow.style.borderBottomColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(0, -4, 0, -12)
        break
      case 'aboveRight':
        arrow.className = 'arrow-pointer arrow-down'
        arrow.style.alignSelf = 'flex-end'
        arrow.style.margin = '0px 10px'
        tourBoxElement.style.flexDirection = 'column-reverse'
        arrow.style.borderTopColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderRightColor = 'transparent'
        arrow.style.borderBottomColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(0, -4, 0, -12)
        break
      case 'belowLeft':
        arrow.className = 'arrow-pointer arrow-up'
        arrow.style.alignSelf = 'flex-start'
        arrow.style.margin = '0px 10px'
        tourBoxElement.style.flexDirection = 'column'
        arrow.style.borderBottomColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderTopColor = 'transparent'
        arrow.style.borderRightColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(0, 4, 0, 12)
        break
      case 'belowRight':
        arrow.className = 'arrow-pointer arrow-up'
        arrow.style.alignSelf = 'flex-end'
        arrow.style.margin = '0px 10px'
        tourBoxElement.style.flexDirection = 'column'
        arrow.style.borderBottomColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderTopColor = 'transparent'
        arrow.style.borderRightColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(0, 4, 0, 12)
        break
      case 'left':
        arrow.className = 'arrow-pointer arrow-right'
        arrow.style.alignSelf = 'center'
        arrow.style.margin = '0px 0px'
        tourBoxElement.style.flexDirection = 'row-reverse'
        arrow.style.borderLeftColor = this.tourTheme.primaryColor
        arrow.style.borderRightColor = 'transparent'
        arrow.style.borderTopColor = 'transparent'
        arrow.style.borderBottomColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(-4, 0, -12, 0)
        break
      case 'right':
        arrow.className = 'arrow-pointer arrow-left'
        arrow.style.alignSelf = 'center'
        arrow.style.margin = '0px 0px'
        tourBoxElement.style.flexDirection = 'row'
        arrow.style.borderRightColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderTopColor = 'transparent'
        arrow.style.borderBottomColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_THICK,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(4, 0, 12, 0)
        break
      case 'above':
        arrow.className = 'arrow-pointer arrow-down'
        arrow.style.alignSelf = 'center'
        arrow.style.margin = '0px 0px'
        tourBoxElement.style.flexDirection = 'column-reverse'
        arrow.style.borderTopColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderRightColor = 'transparent'
        arrow.style.borderBottomColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(0, -4, 0, -12)
        break
      case 'below':
        arrow.className = 'arrow-pointer arrow-up'
        arrow.style.alignSelf = 'center'
        arrow.style.margin = '0px 0px'
        tourBoxElement.style.flexDirection = 'column'
        arrow.style.borderBottomColor = this.tourTheme.primaryColor
        arrow.style.borderLeftColor = 'transparent'
        arrow.style.borderTopColor = 'transparent'
        arrow.style.borderRightColor = 'transparent'
        tourboxdata.style.borderWidth = this.getBorderWidthCSSString(
          BORDER_WIDTH_THICK,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
          BORDER_WIDTH_NORMAL,
        )
        tourboxdata.style.boxShadow = this.getBoxShadowCSSString(0, 4, 0, -12)
    }
    tourBoxElement.style.zIndex = '9999999'
  }

  private ApplyAnnouncementTheme(stepCount: number) {
    let tourBoxElement = document.getElementById('anno-tourBox')
    // let annoClosebtn = document.getElementById('playtourBoxCloseIcon')
    //let ptnavigationdiv = document.getElementById('annonavigationdiv')
    let previousIcon = document.getElementById('anno-previous-step')
    let nextIcon = document.getElementById('anno-next-step')
    let tourboxdata = document.getElementById('announcementboxdata')
    // let annoboxHeaderdata = document.getElementById('announcementheader')
    // let annoboxBodydata = document.getElementById('annobodybox')

    if (this.tourTheme.isRounded) {
      tourboxdata.style.borderRadius = this.tourTheme.borderRadius ? `${this.tourTheme.borderRadius}px` : '10px'
    } else {
      tourboxdata.style.borderRadius = '0px'
    }

    nextIcon.style.color = this.tourTheme.secondaryColor
    previousIcon.style.background = this.tourTheme.secondaryColor
    nextIcon.style.background = this.tourTheme.primaryColor
    nextIcon.style.borderColor = this.tourTheme.primaryColor
    tourboxdata.style.borderColor = this.tourTheme.primaryColor
    tourboxdata.style.color = this.tourTheme.textColor
    tourboxdata.style.fontFamily = this.tourTheme.fontFamily ? this.tourTheme.fontFamily : this.defaultFontFamily
    tourBoxElement.style.borderColor = this.tourTheme.primaryColor
    tourBoxElement.style.borderLeftWidth = '3px'
    // annoboxHeaderdata.style.background = this.tourTheme.primaryColor
    // annoboxHeaderdata.style.color = this.tourTheme.secondaryColor
    // annoboxBodydata.style.background = this.tourTheme.secondaryColor
    // annoClosebtn.style.color = this.tourTheme.secondaryColor
  }

  private getBorderWidthCSSString(top: number, right: number, bottom: number, left: number) {
    return `${top}px ${right}px ${bottom}px ${left}px`
  }

  private getBoxShadowCSSString(
    horizontalPos1: number,
    verticalPos1: number,
    horizontalPos2: number,
    verticalPos2: number,
  ) {
    return `${horizontalPos1}px ${verticalPos1}px 6px 4px rgba(0, 0, 0, 0.26),
     ${horizontalPos2}px ${verticalPos2}px 22px 4px rgba(0, 0, 0, 0.24)`
  }

  private getTetherObject = (stepCount: string | number, target: any) => {
    let position = this.tour.steps[stepCount].position
    let tetherObject: any = {}
    tetherObject.target = target
    let tourBoxElement = document.getElementById('pagetour-tourBox')
    tetherObject.element = tourBoxElement

    tourBoxElement.className = 'pagetour-onplay-tourbox'

    let popperPosition: Placement = 'auto'

    switch (position) {
      case 'aboveLeft':
        popperPosition = 'top-start'
        break
      case 'aboveRight':
        popperPosition = 'top-end'
        break
      case 'belowLeft':
        popperPosition = 'bottom-start'
        break
      case 'belowRight':
        popperPosition = 'bottom-end'
        break
      case 'left':
        popperPosition = 'left'
        break
      case 'right':
        popperPosition = 'right'
        break
      case 'above':
        popperPosition = 'top'
        break
      case 'below':
        popperPosition = 'bottom'
    }

    const targetDom = document.querySelector(target)

    let popperInstance = new Popper(targetDom, tourBoxElement, {
      placement: popperPosition,
    })

    popperInstance.enableEventListeners()
    popperInstance.scheduleUpdate()

    return popperInstance
  }

  scrollIntoView(element: any) {
    if (!this.isElementInViewport(element)) {
      element.scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest',
      })
    }
  }

  private isElementInViewport(element: any) {
    let top = element.offsetTop
    let left = element.offsetLeft
    let width = element.offsetWidth
    let height = element.offsetHeight

    while (element.offsetParent) {
      element = element.offsetParent
      top += element.offsetTop
      left += element.offsetLeft
    }

    return (
      top >= window.pageYOffset &&
      left >= window.pageXOffset &&
      top + height <= window.pageYOffset + window.innerHeight &&
      left + width <= window.pageXOffset + window.innerWidth
    )
  }

  private getElementSelector = (stepCount: any) => {
    let stepToConsider: any
    if (stepCount) {
      stepToConsider = stepCount
    } else {
      stepToConsider = this.currentStep
    }

    let currentStepForElement = this.tour.steps[stepToConsider]
    let elementSelector = currentStepForElement.key
    let ignoreKey = currentStepForElement.ignoreelementkey

    if (ignoreKey && ignoreKey === true) {
      return currentStepForElement.selector
    }

    if (elementSelector && elementSelector.length !== 0) {
      let foundElementByKey = document.querySelector(elementSelector)
      if (foundElementByKey) {
        return elementSelector
      }
    }

    return currentStepForElement.selector
  }

  private cleanupAction = (element: HTMLElement) => {
    if (element && element.style) {
      element.style.outline = this.datastore['pagetour_lastoutline']
    }

    let elementOnRemovedListener = this.datastore['pagetour_nodeRemovedListener']
    if (elementOnRemovedListener) {
      elementOnRemovedListener.removeEventListener('DOMNodeRemoved', this.elementDomRemoved)
      this.datastore['pagetour_nodeRemovedListener'] = null
    }
  }

  private addTourOutline = (element: HTMLElement) => {
    // if (element && !element.getAttribute('disabled')) {
    //   this.datastore['pagetour_lastoutline'] = element.style.outline
    //   element.style.outline = '#f00 solid 1px'

    //   let elementOnRemovedListener = this.datastore['pagetour_nodeRemovedListener']
    //   if (elementOnRemovedListener) {
    //     elementOnRemovedListener.removeEventListener('DOMNodeRemoved', this.elementDomRemoved)
    //     this.datastore['pagetour_nodeRemovedListener'] = null
    //   }

    //   element.addEventListener('DOMNodeRemoved', this.elementDomRemoved)

    //   this.datastore['pagetour_nodeRemovedListener'] = element
    // }

    if(element && !element.getAttribute('disabled'))
    {
      let width = element.offsetWidth;
      let height = element.offsetHeight;
      var rect = element.getBoundingClientRect();
      let pagetourHelperLayer = document.getElementById("pagetour-elementLayer");
      
      pagetourHelperLayer.style.left = rect.left.toString() + 'px';
      pagetourHelperLayer.style.top = rect.top.toString() + 'px';
      pagetourHelperLayer.style.height = height.toString() + 'px';
      pagetourHelperLayer.style.width = width.toString() + 'px';
    }
  }

  private elementDomRemoved = (event: any) => {
    if (event) {
      let elementOnRemovedListener = this.datastore['pagetour_nodeRemovedListener']
      let elementRemoved = event.target
      if (elementRemoved) {
        if (elementOnRemovedListener) {
          elementRemoved.removeEventListener('DOMNodeRemoved', this.elementDomRemoved)
          this.datastore['pagetour_nodeRemovedListener'] = null

          if (elementOnRemovedListener.isEqualNode(elementRemoved)) {
            this.goToNextStep(StepAction.Exit, this.tour, RunTourAction.Play, null, null)
          }
        }
      }
    }
  }

  private updateUserActions = async (tour: Tutorial, userAction: string, step: string, operation: string) => {
    try {
      let response = await this.configStore.Options.userActionProvider.recordUserAction(
        tour,
        userAction,
        step,
        operation,
      )
    } catch (err) {}
    return
  }

  /// Creates and shows Cover Page Dialog
  private showCoverPageModal = (
    tourObj: any,
    action: RunTourAction,
    callback: any,
    startInterval: any,
    autoplaytest: boolean = false,
  ) => {
    let content = tourObj.coverPage.content
    let title = tourObj.title
    let locationValue = this.tour.coverPage.location

    this.modal = document.getElementById('coverPageDock')
    if (!this.modal) {
      let chooseElementDock = this.viewCoverPageTemplateFn()
      this.dock = DomUtils.appendToBody(chooseElementDock)
      DomUtils.show(this.dock)
      let coverPageTitleElement = document.getElementById('cover-page-title')
      let titleContentElement = document.createElement('p')
      titleContentElement.innerText = title
      titleContentElement.setAttribute('role', 'heading')
      titleContentElement.setAttribute('aria-level', '1')
      coverPageTitleElement.appendChild(titleContentElement)
      let coverPageContentElement = document.getElementById('cover-page-body-content')
      let contentElement = document.createElement('div')
      contentElement.innerText = content
      coverPageContentElement.appendChild(contentElement)
    } else {
      this.modal.style.display = 'block'
    }

    this.modal = document.getElementById('cover-page-modal')
    this.modal.style.fontFamily = this.tourTheme.fontFamily ? this.tourTheme.fontFamily : this.defaultFontFamily
    this.modal.style.display = 'block'

    let startTourCoverPageButton = document.getElementById('starttour-cover-page-btn') as HTMLButtonElement
    let closeBtn = document.getElementById('cover-page-close-btn') as HTMLButtonElement
    let cancelBtn = document.getElementById('cancel-cover-page-btn') as HTMLButtonElement

    let coverpagebox = document.getElementById('cover-page-display-content')

    coverpagebox.style.borderColor = this.tourTheme.primaryColor
    if (this.tourTheme.isRounded) {
      coverpagebox.style.borderRadius = this.tourTheme.borderRadius ? `${this.tourTheme.borderRadius}px` : '10px'
    }
    coverpagebox.style.color = this.tourTheme.textColor
    startTourCoverPageButton.style.background = this.tourTheme.primaryColor
    startTourCoverPageButton.style.color = this.tourTheme.secondaryColor
    startTourCoverPageButton.style.display = 'inline'
    if (locationValue.toLowerCase() === 'start') {
      startTourCoverPageButton.innerHTML = 'Begin Tour'
      startTourCoverPageButton.title = 'Begin Tour'
      cancelBtn.style.display = 'inline'
      if(this.configStore.Options.isCoverPageTourStart){
        this.updateUserActions(this.tour, 'Started', '0', 'Playing')
      }
      startTourCoverPageButton.onclick = (event: MouseEvent) => {
        this.beginTourSteps(this.tour, action, callback, startInterval)(this.tour, action, callback, startInterval)
      }
    } else {
      cancelBtn.style.display = 'none'
      startTourCoverPageButton.innerHTML = 'Finish tour'
      startTourCoverPageButton.title = 'Finish Tour'
      startTourCoverPageButton.onclick = this.closeCoverPageModal(callback)
    }

    closeBtn.onclick = this.closeCoverPageModal(callback)
    cancelBtn.onclick = this.closeCoverPageModal(callback)
    DomUtils.manageTabbing(this.modal)
    if (autoplaytest === true) {
      let self = this
      if (locationValue.toLowerCase() === 'start') {
        setTimeout(() => {
          self.beginTourSteps(self.tour, action, callback, startInterval, autoplaytest)(
            self.tour,
            action,
            callback,
            startInterval,
            autoplaytest,
          )
        }, startInterval)
      } else {
        setTimeout(() => {
          self.closeCoverPageModal(callback)
        }, startInterval)
      }
    }
  }

  private closeCoverPageModal = (callback: any) => {
    return () => {
      this.isTourPlaying = false
      this.modal = document.getElementById('cover-page-modal')
      this.modal.parentNode.removeChild(this.modal)
      // this.disablePageInspector(true);
      if (callback != null) callback()
    }
  }

  private removeTether = () => {
    const boxes: any = document.querySelectorAll('.pagetour-onplay-tourbox')
    if (boxes) {
      for (let i = 0; i < boxes.length; i++) {
        boxes[i].style.display = 'none'
      }
    }
    if (this.tether) {
      if (this.tether.destroy) {
        this.tether.destroy()
      }
      this.tether = {}
    }
    if (this.tourBox) {
      DomUtils.removeFromDom(this.tourBox)
    }
  }

  private setControlValue = (control: HTMLElement, value: string) => {
    let type = control.getAttribute('type')
    switch (type && type.toLowerCase()) {
      case 'text':
      case 'textarea':
      case 'select-one':
        control.setAttribute('value', value)
        control.focus()
        ;(control as HTMLInputElement).value = value
        control.dispatchEvent(new Event('input', { bubbles: true }))
        break
      case 'checkbox':
        control.focus()
        control.setAttribute('checked', value)
        break
      default:
        control.focus()
        control.setAttribute('value', value)
        break
    }
    control.innerText = value
  }

  private srSpeak(text: string, priority: string, role?: string, parentId?: string) {
    let el = document.createElement('div')
    let id = 'speak-' + Date.now()
    el.setAttribute('id', id)
    el.setAttribute('aria-live', priority || 'polite')
    if (role) {
      el.setAttribute('role', role)
    }
    el.classList.add('sr-only')
    if (parentId) {
      document.getElementById(parentId).appendChild(el)
    } else {
      document.body.appendChild(el)
    }
    window.setTimeout(function() {
      document.getElementById(id).innerText = text
    }, 100)

    window.setTimeout(function() {
      document.body.removeChild(document.getElementById(id))
    }, 1000)
    return
  }
}

export { PageTourPlay }
