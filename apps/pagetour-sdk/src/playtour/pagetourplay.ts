import { ConfigStore } from '../common/configstore'
import * as tourBoxHtml from './tour-box.html'
import * as feedbackPageHtml from './feedback-page.html'
import * as announcementFeedbackPageHtml from './announcement-feedback-element.html'
import * as AnnouncementBoxHtml from './announcement-page.html'
import * as SmartTipBoxHtml from './smarttip.html'
import * as SmartTipPopperHtml from './smarttip-popper.html'
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
import { TourTypeEnum } from '../models/tourtypeenum'
import { querySelectorDeep } from 'query-selector-shadow-dom'
import { PageTourOptions } from '../models/pagetouroptions'
import { isUndefined } from 'util'
import { type } from 'os'
import { AnnouncementFeedbackStep } from '../models/announcementfeedbackstep'

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
  private feedbackModal: any = null
  private dock: any = null
  private defaultFontFamily = 'Segoe UI'
  private autoPlayTest: boolean
  private isMuted: boolean = false
  private announcementFeedbackObj: any = JSON.parse('{}')

  // Template Functions
  private tourBoxHtmlFn: any = tourBoxHtml
  private feedbackPageFn: any = feedbackPageHtml
  private announcementFeedbackPageFn: any = announcementFeedbackPageHtml
  private smartTipFn: any = SmartTipBoxHtml
  private smartTipPopperFn: any = SmartTipPopperHtml
  private announcementBoxFn: any = AnnouncementBoxHtml
  private viewCoverPageTemplateFn: any = viewCoverPageModalTemplate
  public isTourPlaying: boolean

  tourTheme: PageTourTheme

  constructor(private configStore: ConfigStore, private dataStore: DataStore) {
    
    this.isTourPlaying = false
    this.tourTheme = configStore.Options.theme
    this.hideSmartTipOnClick();
  }

  private hideSmartTipOnClick() {
    let objThis = this;
    window.addEventListener("mouseup", function() {
      objThis.hideSmartTip();
    });
  }

  private hideSmartTip()
  {
    Array.from(document.getElementsByClassName("smarttip-container") as HTMLCollectionOf<HTMLElement>).forEach(element => {
      element.style.display = "none"
    });
  }

  public playTour = async (tourId: any, action: RunTourAction, startInterval: any, autoPlayTest: boolean = false) => {
    try {
      const tour = await this.dataStore.GetTourById(tourId)
      this.autoPlayTest = autoPlayTest

      switch(tour.tourtype){ 
        case  TourTypeEnum.Announcement:
          this.runAnnouncement(tour, action, startInterval, null, autoPlayTest)
          break;
        case TourTypeEnum.Beacon:
          this.runSmartTip(tour, action, startInterval, null, autoPlayTest)
          break;
        case TourTypeEnum.PageTour:
        case TourTypeEnum.InteractiveGuide:
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
    const opts = this.configStore.Options;
    objTour.steps.forEach((element,i) => {
        setTimeout(() => this.makeSmartTipVisible(element, i, objTour, callback), element.delayBefore * 1000)
    });
    if(opts.navigator.callbackOnTourStart != null) {
      opts.navigator.callbackOnTourStart(objTour)
    }
  }

  private makeSmartTipVisible(element : any, i: number, objTour: Tutorial, callback: any) {
      let selectedElement = querySelectorDeep(element.selector) as HTMLElement;
      let zIndex = this.configStore.Options.zIndex;
      let smartTipId = `smarttip_${objTour.id}_${i}`;
      let smartTipElement = document.getElementById(smartTipId);
      const opts = this.configStore.Options;
      
      if(!smartTipElement) {
        if(selectedElement && !selectedElement.getAttribute('disabled'))
          {
            if(document.contains(document.getElementById(`${smartTipId}-popup`)))
            {
              document.getElementById(`${smartTipId}-popup`).remove();
            }
            let smartTipPopup =  DomUtils.appendToBody(this.smartTipPopperFn());
            smartTipPopup.id = `${smartTipId}-popup`;
            (smartTipPopup.getElementsByClassName("smarttip-content")[0] as HTMLParagraphElement).innerText = element.message;
            (smartTipPopup.getElementsByClassName("smarttip-dismiss")[0] as HTMLButtonElement).addEventListener('click', () => { this.dismissSmartTip(smartTipId, objTour, 'Completed', (objTour.steps.length-1).toString(), 'Dismissed'); if (callback != null) callback(objTour.tourtype)});
            (smartTipPopup.getElementsByClassName("smarttip-dismiss")[0] as HTMLButtonElement).addEventListener('keydown', (event) => 
            {
              if(event.key === "Enter")
              {
                let smartTipFocasibleElement = (document.getElementById(smartTipId).getElementsByClassName('smart-tip')[0] as HTMLElement);
                let focusableElementsOutSide = document.body.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                Array.from(focusableElementsOutSide).forEach((element, indexOfElemet) => {
                  if(element === smartTipFocasibleElement)
                  {
                    if(focusableElementsOutSide.length > indexOfElemet + 1)
                    {
                      (focusableElementsOutSide[indexOfElemet + 1] as HTMLElement).focus();
                    }
                    else
                    {
                      (focusableElementsOutSide[0] as HTMLElement).focus();
                    }

                    return;
                  }
                });

                this.dismissSmartTip(smartTipId, objTour, 'Completed', (objTour.steps.length-1).toString(), 'Dismissed');

                if (callback != null) 
                  callback(objTour.tourtype);
                
                event.preventDefault();
                this.hideSmartTip();
              }
              
              if(event.key === "Escape")
              {
                this.hideSmartTip();
                (document.getElementById(smartTipId).getElementsByClassName('smart-tip')[0] as HTMLElement).focus();
              }              
            });

            (smartTipPopup.getElementsByClassName("smarttip-close")[0] as HTMLDivElement).addEventListener('click', () => { smartTipPopup.style.display = 'none'; if (callback != null) callback(objTour.tourtype)});
            (smartTipPopup.getElementsByClassName("smarttip-close")[0] as HTMLDivElement).addEventListener('keydown', (event) => 
            {
              if(event.key === "Enter" || event.key === "Escape")
              {
                this.hideSmartTip();              
                (document.getElementById(smartTipId).getElementsByClassName('smart-tip')[0] as HTMLElement).focus();

                if (event.key === "Enter" && callback != null) 
                  callback(objTour.tourtype);

                event.preventDefault();
              }
            });
  
            let smartTip = DomUtils.appendToBody(this.smartTipFn());
            smartTip.id = smartTipId;
            smartTip.style.zIndex = zIndex;
            selectedElement.insertAdjacentElement('afterend', smartTip);
            let smartTipInstance = new Popper(selectedElement, smartTip, {
              placement: element.position as Placement,
            });
            smartTipInstance.update();
  
            let arrowDiv = document.createElement('div');
            arrowDiv.id = `smarttip_${objTour.id}_${i}-arrow`
            smartTipPopup.appendChild(arrowDiv);
  
            let objThis = this;

            smartTip.addEventListener("mouseover", function() {
              objThis.setToolTipPopupArrowPointer(objTour, element, arrowDiv, smartTipPopup, smartTip, i, zIndex);
            });

            smartTip.addEventListener("keydown", function(event) {
              let objThisEvnt = event;
              if(event.key === "Enter")
              {
                objThis.setToolTipPopupArrowPointer(objTour, element, arrowDiv, smartTipPopup, smartTip, i, zIndex);
                
                let focusableElements = smartTipPopup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                let firstFocusableElement = focusableElements[0] as HTMLElement;
                let lastFocusableElement = focusableElements[focusableElements.length - 1] as HTMLElement;

                let availableSmartPopUps = document.getElementsByClassName('smarttip-container');
                
                for(let i = 0; i<availableSmartPopUps.length;i++)
                {
                  let currPopupInst = availableSmartPopUps[i] as HTMLElement;
                  if(currPopupInst.id === smartTipPopup.id && currPopupInst.style.display != 'none')
                  {
                    (currPopupInst.getElementsByClassName('smarttip-close')[0] as HTMLElement).focus();
                    break;
                  }                 
                }

                lastFocusableElement.addEventListener("keydown", function(event) {
                  if(event.key === "Escape")
                  {
                    objThis.hideSmartTip();
                    (document.getElementById(smartTipId).getElementsByClassName('smart-tip')[0] as HTMLElement).focus();
                  }
                  else if(event.key === "Tab" && event.target === event.currentTarget && !event.shiftKey)
                  {
                    firstFocusableElement.focus();
                    event.preventDefault();
                  }
                });

                firstFocusableElement.addEventListener("keydown", function(event) {
                  if(event.key === "Escape")
                  {
                    objThis.hideSmartTip();
                    (document.getElementById(smartTipId).getElementsByClassName('smart-tip')[0] as HTMLElement).focus();
                  }
                  else if(event.key === "Tab" && event.target === event.currentTarget && event.shiftKey)
                  {
                    lastFocusableElement.focus();
                    event.preventDefault();
                  }
                });
              }
              else if(event.key === "Escape")
              {
                objThis.hideSmartTip();
                (event.target as HTMLElement).focus();
              }
            });

            let smartTipFocusObj = smartTip.getElementsByClassName('smart-tip')[0] as HTMLElement;

            smartTipFocusObj.addEventListener("focusin", function(event) {
              smartTipFocusObj.setAttribute("role", "application");
              smartTipFocusObj.setAttribute("aria-label","Smart tip icon for " + objTour.title);
            });

            smartTipFocusObj.addEventListener("focusout", function(event) {
              smartTipFocusObj.removeAttribute("role");
              smartTipFocusObj.removeAttribute("aria-label");
            });
          } else {
            if(opts.navigator.callbackOnTourStepFailure != null) {
              let stepErrorMessage = "Elements are missing to run smart-tip"
              opts.navigator.callbackOnTourStepFailure(objTour, 0, stepErrorMessage);
            }
            return;
          }
      }
  }

  private setToolTipPopupArrowPointer(objTour: Tutorial, element : any, arrowDiv:HTMLDivElement, smartTipPopup:HTMLElement, smartTip:HTMLElement, i:number, zIndex:string) 
  {
    Array.from(document.getElementsByClassName("smarttip-container") as HTMLCollectionOf<HTMLElement>).forEach(element => {
      element.style.display = "none"
    });
    let toolTipPopper = document.getElementById(`smarttip_${objTour.id}_${i}-popup`);
    toolTipPopper.style.display = "flex";
    toolTipPopper.style.zIndex = zIndex;
    let popperPlacement = element.position as Placement

    arrowDiv.style.alignSelf = 'center'
    arrowDiv.style.margin = '0px 0px'
    arrowDiv.style.borderColor = 'transparent'

    switch (element.position) {
      case 'top':
        arrowDiv.className = 'arrow-pointer arrow-down'
        smartTipPopup.style.flexDirection = 'column'
        arrowDiv.style.borderTopColor = '#0078D4'
        break

      case 'bottom':
        arrowDiv.className = 'arrow-pointer arrow-up'
        smartTipPopup.style.flexDirection = 'column-reverse'
        arrowDiv.style.borderBottomColor = '#0078D4'
        break

      case 'left':
        smartTipPopup.style.flexDirection = 'row'
        arrowDiv.className = 'arrow-pointer arrow-right'
        arrowDiv.style.borderLeftColor = '#0078D4'
        break

      case 'right':
        smartTipPopup.style.flexDirection = 'row-reverse'
        arrowDiv.className = 'arrow-pointer arrow-left'
        arrowDiv.style.borderRightColor = '#0078D4'
        break
    }

    let popperInstance = new Popper(smartTip, toolTipPopper, {
      placement: popperPlacement,
      modifiers: {
        offset: {
          offset: '0, 10'
        }
      }
    });
    popperInstance.enableEventListeners();
    popperInstance.scheduleUpdate();

    return;
  }

  private async dismissSmartTip(id: string, tour: Tutorial, userAction: string, step: string, operation: string) {
    // remove that specific tips and popper from the domutils.
    let availableSmartTips = document.getElementById(id);
    const opts = this.configStore.Options;
    if(availableSmartTips)
    {
      availableSmartTips.remove();
    }

    // record the action for the specific user and store in local storage.
    try {
      let response = await opts.userActionProvider.recordUserAction(
        tour,
        userAction,
        step,
        operation,
      )
      
      if(opts.navigator.callbackAfterTourEnd != null) {
        opts.navigator.callbackAfterTourEnd(tour, parseInt(step) + 1);
      }
    } catch (err) {}
  }

  public runAnnouncement = (
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
    this.LaunchAnnouncement(this.tour,action, startInterval, callback, autoPlayTest)(
      objTour,
      action,
      startInterval,
      callback,
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
      self.initializeAnnouncement(tour, action) 

      let retVal = {} as PageContext
      retVal.state = tour.steps[0].pagestatename
      retVal.url = tour.steps[0].pagecontext

      self.navigateToStart(retVal)

      if (autoPlayTest === true) {
        const opts = self.configStore.Options
        if (opts.navigator.callbackOnTourStart != null) {
          opts.navigator.callbackOnTourStart(self.tour)
        }
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

          const audioMuteButton: HTMLButtonElement = document.querySelector('#announcement-audio')
          if (audioMuteButton) {
            audioMuteButton.addEventListener('click', () => {
              document.getElementById('announcement-audio-stop').style.display = 'inline'
              document.getElementById('announcement-audio').style.display = 'none'
              self.isMuted = true;
              if (opts.navigator.callbackOnVolumeMute != null) {
                opts.navigator.callbackOnVolumeMute()
              }
            })
          }

          const audioUnMuteButton: HTMLButtonElement = document.querySelector('#announcement-audio-stop')
          if (audioUnMuteButton) {
            audioUnMuteButton.addEventListener('click', () => {
              document.getElementById('announcement-audio-stop').style.display = 'none'
              document.getElementById('announcement-audio').style.display = 'inline'
              self.isMuted = false;
              if (opts.navigator.callbackOnVolumeUnmute != null) {
                opts.navigator.callbackOnVolumeUnmute(self.tour.steps[self.currentStep].transcript)
              }
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
        }, startInterval);
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

          const audioMuteButton: HTMLButtonElement = document.querySelector('#pagetour-audio');
          if (audioMuteButton) {
            audioMuteButton.addEventListener('click', () => {
              document.getElementById('pagetour-audio-stop').style.display = 'inline'
              document.getElementById('pagetour-audio').style.display = 'none'
              self.isMuted = true;
              if (opts.navigator.callbackOnVolumeMute != null) {
                opts.navigator.callbackOnVolumeMute()
              }
            })
          }

          const audioUnMuteButton: HTMLButtonElement = document.querySelector('#pagetour-audio-stop');
          if (audioUnMuteButton) {
            audioUnMuteButton.addEventListener('click', () => {
              document.getElementById('pagetour-audio-stop').style.display = 'none'
              document.getElementById('pagetour-audio').style.display = 'inline'
              self.isMuted = false;
              if (opts.navigator.callbackOnVolumeUnmute != null) {
                opts.navigator.callbackOnVolumeUnmute(self.tour.steps[self.currentStep].transcript)
              }
            })
          }
        }, startInterval);
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
      let element = querySelectorDeep(self.getElementSelector(self.currentStep))
      let stepType = self.tour.steps[self.currentStep].type
      self.executeAction(tour, stepType, element, self.currentStep)
      if (self.currentStep === self.totalSteps - 1) {
        self.removeTether();
        if (tourEndsWithCoverPage) {
          self.showCoverPageModal(tour, action, callback, startInterval);
        } else {
          if(opts.feedback.PagetourFeedbackOptions.enabled && action != RunTourAction.Preview){
            self.showFeedbackModal();
          }
          if (callback != null) callback()
        }

        if (self.currentStep === this.totalSteps - 1) {
          if (opts.navigator.callbackAfterTourEnd != null) {
            opts.navigator.callbackAfterTourEnd(tour, self.currentStep + 1)
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
      if (callback != null) callback(tour.tourtype)
      if (opts.navigator.callbackAfterTourEnd != null) {
        opts.navigator.callbackAfterTourEnd(self.tour, self.currentStep + 1)
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

    if (stepAction === StepAction.Next) {
      const nextButton: HTMLButtonElement = document.querySelector('#anno-next-step')
      nextButton.classList.add('loadingNextStep')
      nextButton.disabled = true;

      if (self.currentStep === this.totalSteps - 1) {
        self.isTourPlaying = false
      }

      if (self.currentStep === self.totalSteps - 1) {
        self.removeTether()
        if (callback != null) callback(tour.tourtype)

        if (self.currentStep === this.totalSteps - 1) {
          if (opts.navigator.callbackAfterTourEnd != null) {
            opts.navigator.callbackAfterTourEnd(tour, self.currentStep + 1)
          }
          // code to dismiss the announcement if it is last step
          let element = document.querySelector(self.getElementSelector(self.currentStep))
          self.cleanupAction(element)
          if (opts.navigator.callbackAfterTourEnd != null) {
            opts.navigator.callbackAfterTourEnd(self.tour, self.currentStep + 1)
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
      if (callback != null) callback(tour.tourtype)
      if (opts.navigator.callbackAfterTourEnd != null) {
        opts.navigator.callbackAfterTourEnd(self.tour, self.currentStep + 1)
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
    this.isMuted = false;
    this.setupTourBox(tour)
  }

  private initializeAnnouncement = (tour: any, action:RunTourAction) => {
    this.totalSteps = tour.steps.length
    this.currentStep = 0
    this.isMuted = false;
    // initialize the feedback object
    let annoFeedbackOpts = this.configStore.Options.feedback.AnnouncementFeedbackOptions;
    if(annoFeedbackOpts.enabled == true && action != RunTourAction.Preview){
      var jsonFeedbackObj: AnnouncementFeedbackStep[]=[];
      var ratingStep : AnnouncementFeedbackStep = {submitted: false, rating: 0.0, ratingElement:null}; 
      for(var i=0; i<this.totalSteps; i++){
        jsonFeedbackObj[i] = ratingStep;
      }
      var jsonFeedbackString = JSON.stringify(jsonFeedbackObj);
      this.announcementFeedbackObj = JSON.parse(jsonFeedbackString);
    }

    this.setupAnnouncementBox(tour, action)
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

  private setupAnnouncementBox = (tour: any, action: RunTourAction) => {
    this.totalSteps = tour.steps.length
    this.tourBox = DomUtils.appendToBody(this.announcementBoxFn())
    this.tourBox.style.zIndex = '200000';
    let annoFeedbackOpts = this.configStore.Options.feedback.AnnouncementFeedbackOptions;
    if(annoFeedbackOpts.enabled && action != RunTourAction.Preview){
      let announcementFeedbackDivElement = document.getElementById('feedbackelement') as HTMLElement;
      announcementFeedbackDivElement = DomUtils.appendTo(announcementFeedbackDivElement, this.announcementFeedbackPageFn());
    }
    else{
      let annoFooterElement = document.getElementById('announcementfooter');
      annoFooterElement.style.paddingBottom = '1.5rem';
    }
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

    let element = querySelectorDeep(elementSelector)
    if (this.isValidElement(element)) {
      const previoustButton: HTMLButtonElement = document.querySelector('#pagetour-previous-step')
      const nextButton: HTMLButtonElement = document.querySelector('#pagetour-next-step');
      const audioButton: HTMLButtonElement = document.querySelector('#pagetour-audio');
      const audioMuteButton: HTMLButtonElement = document.querySelector('#pagetour-audio-stop');

      previoustButton.hidden = false
      previoustButton.disabled = false
      nextButton.hidden = false
      nextButton.disabled = false

      if (tour.steps[stepCount].transcript && tour.steps[stepCount].transcript !== '') {
        if(this.isMuted) {
          audioButton.style.display = 'none'
          audioMuteButton.style.display = 'inline'
        } else {
          audioButton.style.display = 'inline'
          audioMuteButton.style.display = 'none'
        }
      } else {
        audioButton.style.display = 'none'
        audioMuteButton.style.display = 'none'
      }

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

          if(opts.feedback.PagetourFeedbackOptions.enabled) {
            nextButton.hidden = false;
            nextButton.disabled = false;
          } else {
            nextButton.hidden = true
            nextButton.disabled = true
          }
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
          stepHeadingElement.innerText = this.tour.title
        } else {
          stepHeadingElement.innerText = ''
        }

        stepCounter.innerText = stepCount + 1 + ' / ' + this.tour.steps.length

        stepDescriptionElement.innerText = stepDescription

        this.tether = this.getTetherObject(stepCount, elementSelector)
        this.addTourOutline(element, tour.tourtype)       
        this.scrollIntoView(element)
        this.ApplyTheme(stepCount)
        this.srSpeak(`${this.tour.title} dialog`, 'assertive', 'dialog')
        let tourBoxElement: HTMLElement = document.getElementById('pagetour-tourBox')
        DomUtils.manageTabbing(tourBoxElement)
        if (opts.navigator.callbackAfterTourStep != null) {
          opts.navigator.callbackAfterTourStep(this.tour.steps[stepCount], this.isMuted)
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
      const audioButton: HTMLButtonElement = document.querySelector('#announcement-audio')
      const audioMuteButton: HTMLButtonElement = document.querySelector('#announcement-audio-stop')


      previoustButton.hidden = false
      previoustButton.disabled = false
      nextButton.hidden = false
      nextButton.disabled = false
    
      if (tour.steps[stepCount].transcript && tour.steps[stepCount].transcript !== '') {
        if(this.isMuted) {
          audioButton.style.display = 'none'
          audioMuteButton.style.display = 'inline'
        } else {
          audioButton.style.display = 'inline'
          audioMuteButton.style.display = 'none'
        }
      } 
      else {
        audioButton.style.display = 'none'
        audioMuteButton.style.display = 'none'
      }
      
      if (stepCount === 0) {
        // First step with element.
        if (action === RunTourAction.Play) {
          this.updateUserActions(tour, 'Started', '0', 'Playing')
        }
        previoustButton.hidden = true
        previoustButton.disabled = true
        annoCounter.parentElement.style.width = '78%'
      }
      if (opts.navigator.callbackBeforeTourStep != null) {
        opts.navigator.callbackBeforeTourStep(this.tour)
      }

      if (stepCount === this.totalSteps - 1) {
        // nextButton.hidden = true
        // nextButton.disabled = true
        nextButton.innerText = "Let's go!"
        annoCounter.parentElement.style.width = '78%'
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

        let annoFeedbackOpts = opts.feedback.AnnouncementFeedbackOptions;
        let defaultAnnoFeedbackOpts = this.configStore.DefaultOptions.feedback.AnnouncementFeedbackOptions;
        
        if(annoFeedbackOpts.enabled && action != RunTourAction.Preview){
          let annoFeedbackType = annoFeedbackOpts.type === undefined ? defaultAnnoFeedbackOpts.type : annoFeedbackOpts.type;
          var ratingElement: NodeListOf<HTMLInputElement>;
          if(this.announcementFeedbackObj[this.currentStep].submitted == false){
            this.updateAnnouncementFeedbackElement();
            if(annoFeedbackType == 'like-dislike'){
              let likeratingRadioButtons = document.querySelector('input[name="likerating"]:checked') as HTMLInputElement;
              if(likeratingRadioButtons) likeratingRadioButtons.checked = false;
              ratingElement = document.getElementsByName('likerating') as NodeListOf<HTMLInputElement>;
            }
            else if(annoFeedbackType == 'yes-no'){
              let yesratingRadio = document.querySelector('input[name="yesnorating"]:checked') as HTMLInputElement;
              if(yesratingRadio) yesratingRadio.checked = false;
              ratingElement = document.getElementsByName('yesnorating') as NodeListOf<HTMLInputElement>;
            }

            var self = this;  
            var rating =0.0;
            
            for(var i=0; i<ratingElement.length; i++){
              ratingElement[i].addEventListener('click', function(e){     
                   
                if(this.checked &&  self.announcementFeedbackObj[self.currentStep].submitted==false){
                  rating = parseFloat(this.value)/5;
                  self.announcementFeedbackObj[self.currentStep].submitted = true;
                  self.announcementFeedbackObj[self.currentStep].rating = rating;
                  self.announcementFeedbackObj[self.currentStep].ratingElement = this;
                  if (opts.navigator.callbackOnAnnouncementFeedbackSubmit != null) {
                    opts.navigator.callbackOnAnnouncementFeedbackSubmit(rating, self.tour, self.currentStep);
                  }
                  let feedbackContentElement = document.getElementById('feedbackcontent');
                  let privacyElement = document.getElementById('annofeedbackprivacy');
                  let submitMessageElement = document.getElementById('annothanksmsg');
                  DomUtils.hide(feedbackContentElement);
                  DomUtils.hide(privacyElement);
                  DomUtils.show(submitMessageElement);
                }
              })
            }

          }
          else if(this.announcementFeedbackObj[this.currentStep].submitted == true){
            let feedbackContentElement = document.getElementById('feedbackcontent');
            let privacyElement = document.getElementById('annofeedbackprivacy');
            let submitMessageElement = document.getElementById('annothanksmsg');
            DomUtils.hide(feedbackContentElement);
            DomUtils.hide(privacyElement);
            DomUtils.show(submitMessageElement);
          }

        }
      
        this.ApplyAnnouncementTheme(stepCount)
        let tourBoxElement: HTMLElement = document.getElementById('anno-tourBox')
        DomUtils.manageTabbing(tourBoxElement)
        if (opts.navigator.callbackAfterTourStep != null) {
          opts.navigator.callbackAfterTourStep(this.tour.steps[stepCount], this.isMuted)
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
    let previousIcon = document.getElementById('anno-previous-step')
    let nextIcon = document.getElementById('anno-next-step')
    let tourboxdata = document.getElementById('announcementboxdata')

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

    const targetDom = querySelectorDeep(target)

    let popperInstance = new Popper(targetDom, tourBoxElement, {
      placement: popperPosition,
      modifiers: {
        offset: {
          offset: '0, 13'
        }
      }
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
      let foundElementByKey = querySelectorDeep(elementSelector)
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

  private addTourOutline = (element: HTMLElement, tourType: string) => {
    if (element && !element.getAttribute('disabled')) {
      if(tourType.toLocaleLowerCase() === TourTypeEnum.InteractiveGuide.toLowerCase())
      {
          this.datastore['pagetour_lastoutline'] = element.style.outline;
          //element.className += " tutorial-bubble";
          element.style.outline = this.configStore.Options.theme.primaryColor + ' solid 5px';
          element.style.transition = 'outline 0.6s linear';
          let teachingBubble = document.createElement('div');
          var rect = element.getBoundingClientRect();
          teachingBubble.style.width = element.offsetWidth.toString() + "px";
          teachingBubble.style.height = element.offsetHeight.toString() + "px";
          //teachingBubble.style.left = rect.left.toString() + 'px';
          //teachingBubble.style.top = rect.top.toString() + 'px';
          teachingBubble.className = "tutorial-bubble";

          //div.innerHTML = "<div class='tutorial-bubble' style='width:" + element.offsetWidth.toString() + "px;height:" + element.offsetHeight.toString() + "px'></div>";
          //element.appendChild(teachingBubble);

          let elementOnRemovedListener = this.datastore['pagetour_nodeRemovedListener']
          if (elementOnRemovedListener) {
            elementOnRemovedListener.removeEventListener('DOMNodeRemoved', this.elementDomRemoved)
            this.datastore['pagetour_nodeRemovedListener'] = null
          }

          element.addEventListener('DOMNodeRemoved', this.elementDomRemoved)

          this.datastore['pagetour_nodeRemovedListener'] = element
          document.getElementById("pagetour-greyLayer").style.display = 'none'
          document.getElementById("pagetour-elementLayer").style.display = 'none'
      }
      else
      {
        let width = element.offsetWidth;
        let height = element.offsetHeight;
        var rect = element.getBoundingClientRect();
        let pagetourHelperLayer = document.getElementById("pagetour-elementLayer");
        
        pagetourHelperLayer.style.left = (rect.left - 14).toString() + 'px';
        pagetourHelperLayer.style.top = (rect.top - 4).toString() + 'px';
        pagetourHelperLayer.style.height = (height + 8).toString() + 'px';
        pagetourHelperLayer.style.width = (width + 24).toString() + 'px';
        document.getElementById("pagetour-greyLayer").style.display = 'inline'
        document.getElementById("pagetour-elementLayer").style.display = 'inline'
      }
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
      let opts = this.configStore.Options;
      startTourCoverPageButton.onclick = this.closeCoverPageModal(callback, action);
    }

    closeBtn.onclick = this.closeCoverPageModal(callback, action)
    cancelBtn.onclick = this.closeCoverPageModal(callback, action);
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
          self.closeCoverPageModal(callback, action);
        }, startInterval)
      }
    }
  }

  private closeCoverPageModal = (callback: any, action: RunTourAction) => {
    return () => {
      this.isTourPlaying = false
      this.modal = document.getElementById('cover-page-modal')
      this.modal.parentNode.removeChild(this.modal)

      let opts = this.configStore.Options;
      let coverPageLocation = this.tour.coverPage.location;
      if(opts.feedback.PagetourFeedbackOptions.enabled && coverPageLocation.toLocaleLowerCase() == "end" && action != RunTourAction.Preview){
        this.showFeedbackModal();
      }
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

  private showFeedbackModal = () => {

    let feedbackHtml = this.feedbackPageFn();
    this.feedbackModal = DomUtils.appendToBody(feedbackHtml);
    DomUtils.show(this.feedbackModal);

    let opts = this.configStore.Options;
    let pagetourFeedbackOpts = this.configStore.Options.feedback.PagetourFeedbackOptions;
    let defaultFeedbackOpts = this.configStore.DefaultOptions.feedback.PagetourFeedbackOptions;

    let feedbackHeadingElement= document.getElementById("feedbackheading");
    let feedbackDescriptionElement = document.getElementById("feedbackdescription");

    let feedbackHeading = pagetourFeedbackOpts.heading === undefined ? defaultFeedbackOpts.heading: pagetourFeedbackOpts.heading;
    let feedbackDescription = pagetourFeedbackOpts.description === undefined ? defaultFeedbackOpts.description: pagetourFeedbackOpts.description;

    feedbackHeadingElement.innerHTML = feedbackHeading;
    feedbackDescriptionElement.innerHTML = feedbackDescription;

    let feedbackType = pagetourFeedbackOpts.type === undefined ? defaultFeedbackOpts.type: pagetourFeedbackOpts.type;
    let feedback5starElement = document.getElementById("5star-rating");
    let feedbackLikeElement = document.getElementById("like-rating")
    if(feedbackType.toLocaleLowerCase() == "5-star"){
      feedbackLikeElement.style.display = "none";
    }
    else if(feedbackType.toLocaleLowerCase() == "like-dislike"){
      feedback5starElement.style.display = "none";
    }
    
    let feedbackPrivacyDescriptionElement = document.getElementById('privacydescription');
    let feedbackPrivacyURLElement = document.getElementById('privacyurl');

    let feedbackPrivacyDescription = pagetourFeedbackOpts.privacyDescription;
    let feedbackPrivacyURL = pagetourFeedbackOpts.privacyURL;

    if(feedbackPrivacyDescription !== undefined && feedbackPrivacyURL !== undefined) {
      feedbackPrivacyDescriptionElement.innerHTML = feedbackPrivacyDescription;
      feedbackPrivacyURLElement.setAttribute('href', feedbackPrivacyURL);
    }
    else{
      DomUtils.hide(document.getElementById('feedbackprivacy'));
    }
    
    let cancelButton = document.getElementById('feedback-cancel');
    let submitButton = document.getElementById('feedback-submit');
    let closeButton = document.getElementById('feedbackclosebtn');
    let feedbackBoxDataElement = document.getElementById('feedbackboxdata');

    submitButton.style.background = this.tourTheme.primaryColor;

    var iconColor = document.querySelector(':root') as HTMLElement;
    iconColor.style.setProperty('--star-color', this.tourTheme.primaryColor);
    iconColor.style.setProperty('--like-dislike-onclick-color', this.tourTheme.primaryColor);
    feedbackBoxDataElement.style.fontFamily = this.tourTheme.fontFamily ? this.tourTheme.fontFamily : this.defaultFontFamily;

    var rating = 0.0;
    var ratingElementGroup: NodeListOf<HTMLInputElement>;
    if(feedbackType.toLocaleLowerCase() == "5-star"){
      ratingElementGroup = document.getElementsByName('5starrating') as NodeListOf<HTMLInputElement>;
    }
    else if(feedbackType.toLocaleLowerCase() == "like-dislike"){
      ratingElementGroup = document.getElementsByName('likerating') as NodeListOf<HTMLInputElement>;
    }
   
    var self = this;
    for(var i=0; i<ratingElementGroup.length; i++){
      ratingElementGroup[i].addEventListener('change', function(e){     
           
        if(this.checked){
          (submitButton as HTMLInputElement).disabled = false;
            submitButton.style.opacity = '1';
        }
      })
    }

    submitButton.onclick = (event: MouseEvent) => {
      event.preventDefault();
      for (var i=0; i<ratingElementGroup.length; i++){
        if(ratingElementGroup[i].checked){
          rating = parseFloat(ratingElementGroup[i].value)/5;          
        }
      }

      if (opts.navigator.callbackOnPagetourFeedbackSubmit != null) {
        opts.navigator.callbackOnPagetourFeedbackSubmit(rating, this.tour);
        if(this.feedbackModal.parentNode){
          this.feedbackModal.parentNode.removeChild(this.feedbackModal);
        }
      }
      if(this.feedbackModal.parentNode){
        this.feedbackModal.parentNode.removeChild(this.feedbackModal);
      }
    }
    cancelButton.onclick = this.closeFeedbackModal();
    closeButton.onclick = this.closeFeedbackModal();
    DomUtils.manageTabbing(document.getElementById('feedbackboxdata'));
  }

  private closeFeedbackModal = () => {
    return () => {
      if(this.feedbackModal.parentNode){
        this.feedbackModal.parentNode.removeChild(this.feedbackModal);
      }
    }
  }

  private updateAnnouncementFeedbackElement = () => {
    let annoFeedbackOpts = this.configStore.Options.feedback.AnnouncementFeedbackOptions;
    let defaultAnnoFeedbackOpts = this.configStore.DefaultOptions.feedback.AnnouncementFeedbackOptions;
    let annoFeedbackHeadingElement = document.getElementById('annofeedbackheading');
    let annoPrivacyURLElement = document.getElementById('annoprivacyurl');
    let annoPrivacyDescElement = document.getElementById('annoprivacydescription');
    let submitMessageElement = document.getElementById('annothanksmsg');
    let privacyElement = document.getElementById('annofeedbackprivacy');

    let annoFeedbackHeading = annoFeedbackOpts.heading === undefined ? defaultAnnoFeedbackOpts.heading : annoFeedbackOpts.heading;
    let annoPrivacyURL= annoFeedbackOpts.privacyURL 
    let annoPrivacyDesc = annoFeedbackOpts.privacyDescription 
    let annoFeedbackSubmitMsg = annoFeedbackOpts.submitMessage === undefined ? defaultAnnoFeedbackOpts.submitMessage : annoFeedbackOpts.submitMessage;

    annoFeedbackHeadingElement.innerHTML = annoFeedbackHeading;
    if(annoPrivacyDesc !== undefined && annoPrivacyURL !== undefined){
      
      annoPrivacyDescElement.innerHTML = annoPrivacyDesc;
      annoPrivacyURLElement.setAttribute('href', annoPrivacyURL);
      DomUtils.show(privacyElement);
    }
    else{
      DomUtils.hide(privacyElement);
    }
    submitMessageElement.innerHTML = annoFeedbackSubmitMsg;
    
    let annoFeedbackType = annoFeedbackOpts.type === undefined ? defaultAnnoFeedbackOpts.type : annoFeedbackOpts.type;
    var iconColor = document.querySelector(':root') as HTMLElement;
    
    iconColor.style.setProperty('--like-dislike-onclick-color', this.tourTheme.primaryColor);

    if(annoFeedbackType == 'like-dislike'){
      DomUtils.hide(document.getElementById('yes-no-rating'));
    }
    else if(annoFeedbackType=='yes-no'){
      DomUtils.hide(document.getElementById('anno-like-rating'));
      
    }
    let feedbackContentElement = document.getElementById('feedbackcontent');
    
    feedbackContentElement.style.display = 'inline-flex';
    
    DomUtils.hide(submitMessageElement);
  }

}

export { PageTourPlay }