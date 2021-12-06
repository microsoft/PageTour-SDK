import { PageTourAuthor } from '../authoringtour/pagetourauthor'
import { PageTourPlay } from '../playtour/pagetourplay'
import * as allToursModal from './all-tours-modal.html'
import * as popupModal from './popup-modal.html'
import { DomUtils } from '../common/domutils'
import { Tutorial } from '../models/tutorial'
import { AuthorizationService } from '../common/authorizationservice'
import { ConfigStore } from '../common/configstore'
import { PageContext } from '../models/pagecontext'
import { RunTourAction } from '../models/runtouraction'
import { PageTourTheme } from '../models/pagetourtheme'
import { DataStore } from '../common/datastore'
declare const $: any
declare const navigator: any
class PageTourManager {
  private toursList: any = [] // This holds an array of tours
  private pageTourPlay: PageTourPlay
  private pagetourAuthor: PageTourAuthor
  private authorizationService: AuthorizationService
  private isAuthorizedToAddTour: Boolean
  private isAuthorizedToExportTour: Boolean
  private isExportEnabled: Boolean
  private isAuthorizedToDeleteTour: Boolean
  private isTourPlaying: boolean
  private dataStore: DataStore
  public configStore: ConfigStore

  private allToursModalFn: any = allToursModal
  private popupModalFn: any = popupModal
  tourTheme: PageTourTheme
  private defaultFontFamily = 'Segoe UI'
  private ACTION_CANCELLED = 'CANCELLED'
  private ACTION_SUCCESS = 'SUCCESS'
  constructor(
    pageTourPlay: PageTourPlay,
    pagetourAuthor: PageTourAuthor,
    authorizationService: AuthorizationService,
    configStore: ConfigStore,
    dataStore: DataStore,
  ) {
    this.configStore = configStore
    this.pageTourPlay = pageTourPlay
    this.pagetourAuthor = pagetourAuthor
    this.authorizationService = authorizationService
    this.isTourPlaying = false
    this.tourTheme = configStore.Options.theme
    this.dataStore = dataStore
  }

  /// Initializes Manage Tour Dialog
  public InitManagerDock = async () => {
    await this.openTourMangerDialog()
  }

  public CloseManagerDock = () => {
    this.closeManageToursModal()
  }

  public getPageContext = () => {
    return this.dataStore.getPageContext()
  }

  public autoPlayByContext = async (context: PageContext, startInterval: number, autoPlayViewedTour: boolean) => {
    let tours: Tutorial[] = await this.dataStore.GetToursByPageContext(context)
    if (!autoPlayViewedTour) {
      tours = tours.filter(function(i) {
        return i.isviewed === false
      })
    }
    for (const tour of tours) {
      if (tour.isautoplayenabled) {
        await this.playTour(tour.id, startInterval)
      }
    }
  }

  public autoPlayByTourId = async (tourId: string, startInterval: number) => {
    if (this.isTourPlaying) {
      return
    }
    try {
      await this.playTour(tourId, startInterval)
    } catch (error) {
      this.isTourPlaying = false
    }
  }

  public autoPlayTest = async (tourId: string, startInterval: number) => {
    if (this.isTourPlaying) {
      return
    }
    try {
      await this.playTour(tourId, startInterval, true)
    } catch (error) {
      this.isTourPlaying = false
    }
  }

  public autoPlayByTourObject = async (objTour: any, startInterval: number) => {
    if (this.isTourPlaying) {
      return
    }
    try {
      await this.playTourByObject(objTour, startInterval)
    } catch (error) {
      this.isTourPlaying = false
    }
  }

  public deleteTourById = async (tourId: string) => {
    let tourToDelete = this.getTourbyId(tourId)
    await this.dataStore.DeleteTour(tourId)
    if (this.configStore.Options.navigator.callbackOnTourDeleted) {
      this.configStore.Options.navigator.callbackOnTourDeleted(tourToDelete)
    }
  }

  /// Opens Manage Tours Dialog
  private openTourMangerDialog = async () => {
    let manageTourModal = document.getElementById('manage-tours-modal')
    if (!manageTourModal) {
      let manageTourBox = this.allToursModalFn()
      manageTourBox = DomUtils.appendToBody(manageTourBox)
      DomUtils.show(manageTourBox)
    } else {
      manageTourModal.style.display = 'block'
    }

    this.isAuthorizedToAddTour = await this.authorizationService.isAuthorizedToAddTour()
    let isExportEnabled = await this.isExportAvaialable()
    this.isAuthorizedToDeleteTour = await this.authorizationService.isAuthorizedToDeleteTour()

    if (!this.isAuthorizedToAddTour) {
      document.getElementById('manage-tours-modal-add-tour-btn').style.display = 'none'
      document.getElementById('edit_button_header').style.display = 'none'
    }
    if (!isExportEnabled) {
      document.getElementById('export_button_header').style.display = 'none'
    }
    if (!this.isAuthorizedToDeleteTour) {
      document.getElementById('delete_button_header').style.display = 'none'
    }

    document.getElementById('all-list-x-btn').onclick = this.closeManageToursModal
    document.getElementById('manage-tours-modal-close-btn').onclick = this.closeManageToursModal
    document.getElementById('manage-tours-modal-add-tour-btn').onmouseenter = this.showOptions
    document.getElementById('manage-tours-modal-add-tour-div').onmouseleave = this.hideOptions
    document.getElementById('option-page-tour').onclick = this.addPageTour
    document.getElementById('option-system-announcement').onclick = this.addSystemAnnouncement
    document.getElementById('manage-tours-sort').onclick = this.sortTours
    document.getElementById('searchbytitle').onkeyup = this.searchTours
    document.getElementById('showexpiredtours-chkbox').onchange = this.searchTours
    document.getElementById('search-tour-btn-cancel').onclick = this.cancelToursSearch
    document.getElementById('itemstodisplay').onchange = this.changePageSize
    document.getElementById('current-tours-page-top').onkeyup = this.changeCurrentPageTop
    document.getElementById('current-tours-page-bottom').onkeyup = this.changeCurrentPageBottom
    document.getElementById('tours-table-previous-page-top').onclick = this.movetoToursPreviousPage
    document.getElementById('tours-table-previous-page-bottom').onclick = this.movetoToursPreviousPage
    document.getElementById('tours-table-next-page-top').onclick = this.movetoToursNextPage
    document.getElementById('tours-table-next-page-bottom').onclick = this.movetoToursNextPage

    let manageTourFormModal = document.getElementById('tour-form')
    DomUtils.manageTabbing(manageTourFormModal)
    try {
      const tours: Tutorial[] = await this.dataStore.GetToursByPageContext(null, true)
      this.toursList = this.sortItems(tours, 'desc')
      this.populateTours()
    } catch (err) {
      console.log(err as string)
      throw new Error(err as string)
    }
  }
  private openPopup = async (tourId: any, type: string, popupques: string, option1: string, option2: string) => {
    let popupModal = document.getElementById('popup-modal')
    if (!popupModal) {
      let popupBox = this.popupModalFn()
      popupBox = DomUtils.appendToBody(popupBox)
      DomUtils.show(popupBox)
    } else {
      popupModal.style.display = 'block'
    }
    let popupModalBox = document.getElementById('popup-display-content')
    let popupOptAccept = document.getElementById('popup-option-accept')
    let popupOptReject = document.getElementById('popup-option-reject')
    this.applyTheme(popupModalBox, popupOptAccept)

    let popupQues = document.getElementById('popup-ques')
    popupQues.textContent = popupques
    popupOptAccept.textContent = option1
    popupOptReject.textContent = option2

    document.getElementById('popup-option-accept').onclick = () => {
      let index = this.getIndexofTourbyId(tourId)
      switch (type) {
        case 'Export':
          let element = document.getElementById(`button-delete_${tourId}`)
          this.returnFocus(this.ACTION_SUCCESS, element, index)
          this.exportTour(tourId)
          break
        case 'Delete':
          this.deleteTour(tourId).then(() => {
            this.returnFocus(this.ACTION_SUCCESS, null, index)
          })
          break
      }
    }

    document.getElementById('popup-option-reject').onclick = () => {
      let element: HTMLElement
      switch (type) {
        case 'Export':
          this.closePopupModal()
          element = document.getElementById(`button-export_${tourId}`)
          this.returnFocus(this.ACTION_CANCELLED, element)
          break
        case 'Delete':
          this.closePopupModal()
          element = document.getElementById(`button-delete_${tourId}`)
          this.returnFocus(this.ACTION_CANCELLED, element)
          break
      }
    }

    document.getElementById('close-popup').onclick = () => {
      let element: HTMLElement
      switch (type) {
        case 'Export':
          this.closePopupModal()
          element = document.getElementById(`button-export_${tourId}`)
          this.returnFocus(this.ACTION_CANCELLED, element)
          break
        case 'Delete':
          this.closePopupModal()
          element = document.getElementById(`button-delete_${tourId}`)
          this.returnFocus(this.ACTION_CANCELLED, element)
          break
      }
    }
    DomUtils.manageTabbing(popupModalBox)
  }

  private returnFocus(result: string, htmlElement?: HTMLElement, index?: number) {
    switch (result) {
      case this.ACTION_CANCELLED:
        htmlElement.focus()
        break
      case this.ACTION_SUCCESS:
        if (htmlElement) {
          htmlElement.focus()
        } else if (this.toursList.length == 0) {
          document.getElementById('manage-tours-modal-close-btn').focus()
        } else if (index > this.toursList.length - 1) {
          let previousButton = document.getElementById('tours-table-previous-page-bottom') as HTMLButtonElement
          let nextButton = document.getElementById('tours-table-next-page-bottom') as HTMLButtonElement
          let closeButton = document.getElementById('manage-tours-modal-close-btn') as HTMLButtonElement

          if (!previousButton.disabled) {
            previousButton.focus()
          } else if (!nextButton.disabled) {
            nextButton.focus()
          } else {
            closeButton.focus()
          }
        } else {
          let id = this.toursList[index].id
          let editButton = document.getElementById(`button-edit_${id}`) as HTMLButtonElement
          let copyButton = document.getElementById(`button-copy_${id}`) as HTMLButtonElement
          let exportButton = document.getElementById(`button-export_${id}`) as HTMLButtonElement
          let deleteButton = document.getElementById(`button-delete_${id}`) as HTMLButtonElement
          let playButton = document.getElementById(`button-play_${id}`) as HTMLButtonElement

          if (editButton && !editButton.disabled) {
            editButton.focus()
          } else if (copyButton && !copyButton.disabled) {
            copyButton.focus()
          } else if (exportButton && !exportButton.disabled) {
            exportButton.focus()
          } else if (deleteButton && !deleteButton.disabled) {
            deleteButton.focus()
          } else if (playButton && !playButton.disabled) {
            playButton.focus()
          } else {
            document.getElementById('manage-tours-modal-close-btn').focus()
          }
        }
        break
    }
  }

  private applyTheme(popupModalBox: any, popupOption1Button: any) {
    popupModalBox.style.fontFamily = this.tourTheme.fontFamily ? this.tourTheme.fontFamily : this.defaultFontFamily
    popupModalBox.style.borderColor = this.tourTheme.primaryColor

    if (this.tourTheme.isRounded) {
      popupModalBox.style.borderRadius = this.tourTheme.borderRadius ? `${this.tourTheme.borderRadius}px` : '10px'
    }
    popupOption1Button.style.background = this.tourTheme.primaryColor
    popupOption1Button.style.color = this.tourTheme.secondaryColor
  }

  private closePopupModal = () => {
    let popupModal = document.getElementById('popup-modal')
    popupModal.parentNode.removeChild(popupModal)
  }

  /// Closes manage Tours Dialog
  private closeManageToursModal = () => {
    let manageTourModal = document.getElementById('manage-tours-modal')
    if (manageTourModal != null || manageTourModal != undefined) manageTourModal.parentNode.removeChild(manageTourModal)
  }

  // Opens the option
  private showOptions = () => {
    $("#add-new-dropdown").show();
  }

  private hideOptions = () => {
    $("#add-new-dropdown").hide();
  }

  
  /// Opens Add Tour Dialog
  private addPageTour = () => {
    this.hideManagePageTourModal();
    this.pagetourAuthor.AddTour("Pagetour");
  }

  // Opens Add system announcement dialog
  private addSystemAnnouncement = () => {
    this.hideManagePageTourModal();
    this.pagetourAuthor.AddTour("Announcement");
  }

  /*#BeginRegion:Tours Search*/

  /// Searches the Tours
  private searchTours = () => {
    const searchByTitleInputElement: HTMLInputElement = document.getElementById('searchbytitle') as HTMLInputElement
    const searchTourCancelButton: HTMLButtonElement = document.getElementById(
      'search-tour-btn-cancel',
    ) as HTMLButtonElement
    const currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    const currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement

    if (searchByTitleInputElement.value.length > 0) {
      searchTourCancelButton.style.display = 'block'
    } else {
      searchTourCancelButton.style.display = 'none'
    }
    currentToursPageTop.value = '1'
    currentToursPageBottom.value = '1'

    this.populateTours()
  }

  /// Clears the search text and resets tours
  private cancelToursSearch = () => {
    const searchByTitleInputElement: HTMLInputElement = document.getElementById('searchbytitle') as HTMLInputElement
    const searchTourCancelButton: HTMLButtonElement = document.getElementById(
      'search-tour-btn-cancel',
    ) as HTMLButtonElement

    searchTourCancelButton.style.display = 'none'
    searchByTitleInputElement.value = ''
    searchByTitleInputElement.focus()
    this.populateTours()
  }

  /*#EndRegion:Tours Search*/

  /// Changes the number of tours to display based on the selection
  private changePageSize = () => {
    const currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    const currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement

    currentToursPageTop.value = '1'
    currentToursPageBottom.value = '1'
    this.populateTours()
  }

  /*#BeginRegion:Sort Tours based on date*/

  /// Sorts Tours ascending to descending or descending to ascending
  private sortTours = () => {
    let dateTimeClass = document.getElementById('icon-tours-sortorder').getAttribute('class')
    let sortOrder = dateTimeClass.includes('icon-order-down') ? 'asc' : 'desc'
    this.toursList = this.sortItems(this.toursList, sortOrder)

    if (sortOrder === 'asc') {
      dateTimeClass = dateTimeClass.replace('icon-order-down', 'icon-order-up')
    } else {
      dateTimeClass = dateTimeClass.replace('icon-order-up', 'icon-order-down')
    }

    document.getElementById('icon-tours-sortorder').setAttribute('class', dateTimeClass)

    this.populateTours()
  }

  /// Sorts the array list based on the sortType ascending or descending.
  private sortItems = (arrList: any[], sortType: any) => {
    let arrListTemp = arrList.sort(function(a, b) {
      const prevDate = new Date(a.createdon).getTime()
      const nextDate = new Date(b.createdon).getTime()
      return prevDate - nextDate
    })

    if (sortType === 'asc') {
      return arrListTemp
    } else {
      return arrListTemp.reverse()
    }
  }

  /*#EndRegion:Sort Tours based on date*/

  /*#BeginRegion:Pagination*/

  /// Pagination- changes the tours display to next page.
  private movetoToursNextPage = () => {
    let currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    let currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement

    currentToursPageTop.valueAsNumber = currentToursPageTop.valueAsNumber + 1
    currentToursPageBottom.valueAsNumber = parseInt(currentToursPageBottom.value, 10) + 1
    this.populateTours()
  }

  /// Pagination- on changing the page number of top pagination controls
  private changeCurrentPageTop = () => {
    let currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    let currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement

    if (currentToursPageTop.value === '') {
      return
    } else {
      currentToursPageBottom.value = currentToursPageTop.value
    }
    this.populateTours()
  }

  /// Pagination- on changing the page number of bottom pagination controls
  private changeCurrentPageBottom = () => {
    let currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    let currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement

    if (currentToursPageBottom.value === '') {
      return
    } else {
      currentToursPageTop.value = currentToursPageBottom.value
    }
    this.populateTours()
  }

  /// Pagination- changes the tours display to previous page.
  private movetoToursPreviousPage = () => {
    let currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    let currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement

    currentToursPageTop.valueAsNumber = parseInt(currentToursPageTop.value, 10) - 1
    currentToursPageBottom.valueAsNumber = parseInt(currentToursPageBottom.value, 10) - 1
    this.populateTours()
  }

  /*#EndRegion:Pagination*/

  /// Populates all the tours on All Tours Dialog.
  private populateTours = () => {
    let allToursTableBody = document.getElementById('all-tours-table-body')
    if (allToursTableBody) {
      while (allToursTableBody.firstChild) {
        allToursTableBody.removeChild(allToursTableBody.firstChild)
      }
    }

    let tours = []

    const today = new Date()
    const expiredToursInputElement: HTMLInputElement = document.getElementById(
      'showexpiredtours-chkbox',
    ) as HTMLInputElement
    let showExpiredTour = expiredToursInputElement.checked
    if (showExpiredTour) {
      tours = this.toursList
    } else {
      tours = this.toursList.filter(function(t: any) {
        return new Date(t.expireson) >= today
      })
    }

    // If no tours are fetched, return from function
    if (tours.length <= 0) return

    /// Search Text Filters
    const searchByTitleInputElement: HTMLInputElement = document.getElementById('searchbytitle') as HTMLInputElement
    let searchText = searchByTitleInputElement.value

    if (searchText.length > 1) {
      searchText = searchText.toLowerCase()
      tours = tours.filter(function(tour: any) {
        if (
          tour.title.toLowerCase().includes(searchText) ||
          (tour.description && tour.description.toLowerCase().includes(searchText)) ||
          (tour.lastmodifiedon && tour.lastmodifiedon.toLowerCase().includes(searchText)) ||
          (tour.pagecontext &&
            tour.pagecontext.some((x: string) => x && x !== null && x.toLowerCase().includes(searchText)))
        ) {
          return true
        } else {
          for (let tag of tour.tags) {
            if (tag && tag.toLowerCase().includes(searchText)) {
              return true
            }
          }
        }
      })
    } else {
      tours = tours
    }

    /// updating tours based on Page size selection
    /// Filter display based on items to display
    let itemstoDisplayElement: HTMLSelectElement = document.getElementById('itemstodisplay') as HTMLSelectElement
    let itemstoDisplay = parseInt(itemstoDisplayElement.options[itemstoDisplayElement.selectedIndex].value, 10)

    const totalToursPagesTop: HTMLInputElement = document.getElementById('total-tours-pages-top') as HTMLInputElement
    const totalToursPagesBottom: HTMLInputElement = document.getElementById(
      'total-tours-pages-bottom',
    ) as HTMLInputElement
    const currentToursPageTop: HTMLInputElement = document.getElementById('current-tours-page-top') as HTMLInputElement
    const currentToursPageBottom: HTMLInputElement = document.getElementById(
      'current-tours-page-bottom',
    ) as HTMLInputElement
    const toursTablePreviousPageTop: HTMLButtonElement = document.getElementById(
      'tours-table-previous-page-top',
    ) as HTMLButtonElement
    const toursTablePreviousPageBottom: HTMLButtonElement = document.getElementById(
      'tours-table-previous-page-bottom',
    ) as HTMLButtonElement
    const toursTableNextPageTop: HTMLButtonElement = document.getElementById(
      'tours-table-next-page-top',
    ) as HTMLButtonElement
    const toursTableNextPageBottom: HTMLButtonElement = document.getElementById(
      'tours-table-next-page-bottom',
    ) as HTMLButtonElement

    let pageCount = Math.ceil(tours.length / itemstoDisplay)
    if (pageCount === 0) pageCount = 1
    totalToursPagesTop.innerText = pageCount.toString()
    totalToursPagesBottom.innerText = pageCount.toString()

    let currentPage = parseInt(currentToursPageTop.value, 10)

    if (currentPage <= 1) {
      toursTablePreviousPageTop.setAttribute('disabled', 'disabled')
      toursTablePreviousPageBottom.setAttribute('disabled', 'disabled')
    } else {
      toursTablePreviousPageTop.disabled = false
      toursTablePreviousPageBottom.disabled = false
    }

    if (currentPage < pageCount) {
      toursTableNextPageTop.disabled = false
      toursTableNextPageBottom.disabled = false
    } else {
      currentPage = pageCount
      totalToursPagesTop.value = pageCount.toString() // This will handle deletion of last item in the page.
      currentToursPageBottom.value = pageCount.toString() // This will handle deletion of last item in the page.
      toursTableNextPageTop.setAttribute('disabled', 'disabled')
      toursTableNextPageBottom.setAttribute('disabled', 'disabled')
    }

    let startIndex = (currentPage - 1) * itemstoDisplay
    let isExportEnabled = this.isExportEnabled
    do {
      let tour = tours[startIndex]
      let tr = document.createElement('tr')

      let tdExpander = document.createElement('td')
      let tdTourType = document.createElement('td')
      let tdTitle = document.createElement('td')
      let tdDescription = document.createElement('td')
      let tdStartPageName = document.createElement('td')
      let tdDate = document.createElement('td')
      let tdEdit = document.createElement('td')
      let tdCopy = document.createElement('td')
      let tdExport = document.createElement('td')
      let tdDelete = document.createElement('td')
      let tdPlay = document.createElement('td')

      let expander = this.getButton('expander', tour)
      let title = this.getTextElement('title', tour)
      let tourtype = null;
      if(!tour.tourtype || tour.tourtype == '')
        tour.tourtype = "pagetour";
      tourtype = this.getTextElement('tourtype', tour)
      let author=null;
      if(tour.lastmodifiedby!=null&&tour.lastmodifiedby!='')
        author = this.getTextElement('lastmodifiedby', tour)
      let description = this.getTextElement('description', tour)
      let startPage = this.getTextElement('startpageurl', tour)
      let date = document.createTextNode(this.getDate(tour.createdon))
      let tourEdit = this.getButton('edit', tour)
      let copyTour = this.getButton('copy', tour)
      let tourExport = this.getButton('export', tour)
      let tourDelete = this.getButton('delete', tour)
      let tourPlay = this.getButton('play', tour)

      tdExpander.setAttribute('class', 'expander-column')
      tdTourType.setAttribute('class', 'title-column')
      tdTitle.setAttribute('class', 'title-column')
      tdStartPageName.setAttribute('class', 'title-column')
      tdDate.setAttribute('class', 'date-column')
      tdEdit.setAttribute('class', 'button-column')
      tdCopy.setAttribute('class', 'button-column')
      tdExport.setAttribute('class', 'button-column')
      tdDelete.setAttribute('class', 'button-column')
      tdPlay.setAttribute('class', 'button-column')

      tdExpander.appendChild(expander)
      tdTitle.appendChild(title)
      tdTourType.appendChild(tourtype)
      if(author!=null)
        tdTitle.appendChild(author)
      tdDescription.appendChild(description)

      for (let tag of tour.tags) {
        let val = this.getTags('tags', tag, tour)
        let tourRemoveTag = this.getButton('cancel', tour)
        val.appendChild(tourRemoveTag)
        tdDescription.appendChild(val)
      }
      tdDescription.setAttribute('class', 'td-tdDescription')
      tdStartPageName.appendChild(startPage)
      tdDate.appendChild(date)
      if (this.isAuthorizedToAddTour) {
        tdEdit.appendChild(tourEdit)
      }

      if (this.isAuthorizedToDeleteTour) {
        tdDelete.appendChild(tourDelete)
      }
      tdPlay.appendChild(tourPlay)

      tr.appendChild(tdExpander)
      tr.appendChild(tdTourType)
      tr.appendChild(tdTitle)
      tr.appendChild(tdDescription)
      tr.appendChild(tdStartPageName)
      tr.appendChild(tdDate)
      if (this.isAuthorizedToAddTour) {
        tr.appendChild(tdEdit)
      }

      tdCopy.appendChild(copyTour)
      tr.appendChild(tdCopy)

      if (isExportEnabled) {
        if (tour.isexported) {
          tourExport.disabled = true
        }
        tdExport.appendChild(tourExport)
        tr.appendChild(tdExport)
      }
      if (this.isAuthorizedToDeleteTour) {
        tr.appendChild(tdDelete)
      }

      tr.appendChild(tdPlay)

      allToursTableBody.appendChild(tr)

      startIndex++
    } while (startIndex < currentPage * itemstoDisplay && startIndex < tours.length)
  }
  /// Gets the Text Element of a property of a tour
  private getTextElement = (
    property: string,
    tour: {
      title: string
      id: string
      description: string
      tags: string
      startpageurl: string
      lastmodifiedby: string
      tourtype: string
    },
  ) => {
    let msgElement = document.createElement('div')
    switch (property) {
      case 'title':
        msgElement.appendChild(document.createTextNode(tour.title))
        msgElement.setAttribute('id', 'tour-title_' + tour.id)
        break
      case 'description':
        msgElement.appendChild(document.createTextNode(tour.description))
        msgElement.setAttribute('id', 'tour-description_' + tour.id)
        break
      case 'startpageurl':
        msgElement.appendChild(document.createTextNode(tour.startpageurl))
        msgElement.setAttribute('id', 'tour-startpageurl_' + tour.id)
        break
      case 'lastmodifiedby':
        msgElement.appendChild(document.createTextNode('Author: ' + tour.lastmodifiedby))
        msgElement.setAttribute('id', 'tour-lastmodifiedby_' + tour.id)
        msgElement.classList.add('author-desc')
        break
      case 'tourtype':
        let tourTypeIcon = document.createElement('i');
        tourTypeIcon.setAttribute('class', "pagetour__icon icon-tourtype-" + tour.tourtype)
        msgElement.appendChild(tourTypeIcon)
        msgElement.appendChild(document.createTextNode(tour.tourtype))
        msgElement.setAttribute('id', 'tour-type_' + tour.id)
        break
    }
    msgElement.classList.add('message-desc')
    return msgElement
  }

  private getTags = (
    property: string,
    tagName: string,
    tour: {
      title: string
      id: string
      description: string
      startpageurl: string
    },
  ) => {
    let msgElement1 = document.createElement('div')
    switch (property) {
      case 'tags':
        msgElement1.appendChild(document.createTextNode(tagName))
        msgElement1.setAttribute('id', 'tour-tag_' + tour.id + '_' + tagName)
        break
    }
    msgElement1.classList.add('tag-desc')
    return msgElement1
  }

  /// Returns formated date.
  private getDate = (strDate: any) => {
    let date: Date = new Date(strDate)

    return (
      ('0' + (date.getMonth() + 1)).slice(-2) +
      '/' +
      ('0' + date.getDate()).slice(-2) +
      '/' +
      date
        .getFullYear()
        .toString()
        .substr(-2)
    )
  }

  /// Returns Toggle, Edit,Delete, Play buttons to display tours
  private getButton = (buttonType: string, tour: any) => {
    let button = document.createElement('button')
    button.setAttribute('type', 'button')
    let icon = document.createElement('i')
    switch (buttonType) {
      case 'expander':
        icon.setAttribute('id', 'icon-drop_' + (tour.id ? tour.id : ''))
        button.classList.add('button-44')
        button.setAttribute('title', 'Expand row')
        button.setAttribute('id', 'button-drop_' + (tour.id ? tour.id : ''))
        if (
          (tour.description != null && tour.description.length > 50) ||
          (tour.title != null && tour.title.length > 21) ||
          (tour.startpageurl != null && tour.startpageurl.length > 21)
        ) {
          button.style.display = 'block'
        } else {
          button.style.display = 'none'
        }
        button.addEventListener('click', (event: Event) => this.toggleTour(tour.id))
        icon.classList.add('pagetour__icon', 'icon-drop')
        break
      case 'export':
        icon.setAttribute('id', 'icon-export_' + (tour.id ? tour.id : ''))
        button.classList.add('button-36')
        button.setAttribute('title', 'Export  tour')
        button.setAttribute('id', 'button-export_' + (tour.id ? tour.id : ''))
        button.addEventListener('click', (event: Event) => this.openExportPopup(tour.id))
        icon.classList.add('pagetour__icon', 'icon-export')
        break
      case 'copy':
        icon.setAttribute('id', 'icon-copy_' + (tour.id ? tour.id : ''))
        button.classList.add('button-36')
        button.setAttribute('title', 'Copy Tour Url')
        button.setAttribute('id', 'button-copy_' + (tour.id ? tour.id : ''))
        button.addEventListener('click', (event: Event) => this.copyTourUrl(tour))
        icon.classList.add('pagetour__icon', 'icon-copy')
        break
      case 'edit':
        icon.setAttribute('id', 'icon-edit_' + (tour.id ? tour.id : ''))
        button.classList.add('button-36')
        button.setAttribute('title', 'Edit tour')
        button.setAttribute('id', 'button-edit_' + (tour.id ? tour.id : ''))
        button.addEventListener('click', (event: Event) => this.editTour(tour.id))
        icon.classList.add('pagetour__icon', 'icon-pencil')
        break
      case 'delete':
        icon.setAttribute('id', 'icon-delete_' + (tour.id ? tour.id : ''))
        button.classList.add('button-36')
        button.classList.add('button-delete')
        button.setAttribute('title', 'Delete tour')
        button.setAttribute('id', 'button-delete_' + (tour.id ? tour.id : ''))
        button.addEventListener('click', (event: Event) => this.openDeletePopup(tour.id))
        icon.classList.add('pagetour__icon', 'icon-recyclebin')
        break
      case 'play':
        icon.setAttribute('id', 'icon-play_' + (tour.id ? tour.id : ''))
        button.classList.add('button-36')
        button.setAttribute('title', 'Play tour')
        button.setAttribute('id', 'button-play_' + (tour.id ? tour.id : ''))
        button.addEventListener('click', (event: Event) =>
          this.playTour(tour.id, this.configStore.Options.tourStartDelayInMs),
        )
        icon.classList.add('pagetour__icon', 'icon-play')
        break
      case 'cancel':
        icon.setAttribute('id', 'icon-cancel_' + (tour.id ? tour.id : ''))
        button.classList.add('button-tag')
        button.setAttribute('title', 'Remove tag')
        button.addEventListener('click', (event: Event) => {
          let parentId = ''
          if (button.parentElement) {
            parentId = button.parentElement.getAttribute('id')
          }
          this.removeTour(tour.id, parentId).then(
            (response) => {
              return
            },
            (error) => {
              console.log({ error })
            },
          )
        })
        icon.classList.add('pagetour__icon', 'icon-close')
        break
    }
    button.appendChild(icon)
    return button
  }

  /// Gets Index of Tour by Id
  private getIndexofTourbyId = (tourId: any) => {
    return this.toursList
      .map(function(e: { id: any }) {
        return e.id
      })
      .indexOf(tourId)
  }

  private editTour = (tourId: any) => {
    this.hideManagePageTourModal()
    let tour = this.getTourbyId(tourId);
    this.pagetourAuthor.EditTour(tour);
  }

  private exportTour = async (id: any) => {
    let exportButtonElement: HTMLButtonElement = document.getElementById('icon-export_' + id) as HTMLButtonElement
    let parentCell: HTMLTableCellElement = exportButtonElement.parentElement as HTMLTableCellElement
    this.changeButtonToSpinner(exportButtonElement, parentCell)
    let announcementElement = document.getElementById('msg-announcement') as HTMLButtonElement
    let tourToExport = this.getTourbyId(id)
    announcementElement.setAttribute('aria-label', `Exporting tour ${tourToExport.title}`)
    tourToExport.isexported = true
    this.closePopupModal()
    await this.pagetourAuthor
      .ExportTour([tourToExport])
      .then(() => {
        announcementElement.setAttribute('aria-label', `Exported tour ${tourToExport.title}`)
        this.populateTours()
        if (this.configStore.Options.navigator.callbackOnTourExported) {
          this.configStore.Options.navigator.callbackOnTourExported(tourToExport)
        }
      })
      .catch((error) => {
        console.log(new String(error))
        announcementElement.setAttribute('aria-label', `Unable to export tour ${tourToExport.title}`)
        this.revertSpinnerToButton(exportButtonElement, parentCell)
      })
  }

  private removeTour = async (tourId: any, parentId: any) => {
    let tour = this.getTourbyId(tourId)
    document.getElementById(parentId).style.display = 'none'
    let tagName = parentId.replace('tour-tag_' + tourId + '_', '')
    const index = tour.tags.indexOf(tagName)
    if (index > -1) {
      tour.tags.splice(index, 1)
    }
    try {
      let response = await this.dataStore.UpdateTour(tour)
      if (this.configStore.Options.navigator.callbackOnTourSaved) {
        this.configStore.Options.navigator.callbackOnTourSaved(tour)
      }
    } catch (error) {
      // alert(error)
    }
  }
  private copyTourUrl = (tour: Tutorial) => {
    let hostName = location.origin
    let startUrl = ''
    if (tour && tour.startpageurl) {
      startUrl = tour.startpageurl
    }
    const opts = this.configStore.Options
    if (opts.navigator && opts.navigator.getStartPageUrl) {
      startUrl = opts.navigator.getStartPageUrl(startUrl)
    }
    let url = `${hostName}${startUrl}?tourId=${tour.id}`
    this.copyTextToClipboard(url)
  }

  private fallbackCopyTextToClipboard = (text: string) => {
    let textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      let successful = document.execCommand('copy')
      let msg = successful ? 'successful' : 'unsuccessful'
      console.log('Fallback: Copying text command was ' + msg)
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err)
    }
    document.body.removeChild(textArea)
  }

  private copyTextToClipboard = (text: string) => {
    if (!navigator.clipboard) {
      this.fallbackCopyTextToClipboard(text)
      return
    }
    navigator.clipboard.writeText(text).then(
      function(err: any) {
        console.log('Async: Copying to clipboard was successful!', err)
      },
      function(err: any) {
        console.error('Async: Could not copy text: ', err)
      },
    )
  }

  /// Gets Tour by Id
  private getTourbyId = (tourId: any) => {
    for (let index = 0; index < this.toursList.length; index++) {
      if (this.toursList[index].id === tourId) {
        return this.toursList[index]
      }
    }
  }

  /// This method shows the details of a Tour as expanded or collapsed.
  private toggleTour = (tourId: string) => {
    let iconExpander = document.getElementById('icon-drop_' + tourId)
    let messageClass = 'message-desc'

    if (iconExpander.classList.contains('icon-drop')) {
      iconExpander.parentElement.setAttribute('title', 'Collapse row')
      messageClass = 'message-desc-expanded'
      document.getElementById('icon-drop_' + tourId).setAttribute('class', 'pagetour__icon icon-drop-up')
    } else {
      iconExpander.parentElement.setAttribute('title', 'Expand row')
      document.getElementById('icon-drop_' + tourId).setAttribute('class', 'pagetour__icon icon-drop')
    }
    document.getElementById('tour-title_' + tourId).setAttribute('class', messageClass)
    document.getElementById('tour-description_' + tourId).setAttribute('class', messageClass)
    document.getElementById('tour-startpageurl_' + tourId).setAttribute('class', messageClass)
  }

  /// Edits the Tour

  private openDeletePopup = async (tourId: any) => {
    await this.openPopup(tourId, 'Delete', 'Do you want to delete this tour', 'Delete', 'Cancel')
  }

  private openExportPopup = async (tourId: any) => {
    await this.openPopup(tourId, 'Export', 'Do you want to export this tour', 'Export', 'Cancel')
  }

  /// Deletes Tour
  private deleteTour = async (tourId: any) => {
    let index = this.getIndexofTourbyId(tourId)
    let tour = this.toursList[index]

    let announcementElement = document.getElementById('msg-announcement') as HTMLButtonElement
    announcementElement.setAttribute('aria-label', `Deleting tour ${tour.title}`)

    let deleteButtonElement: HTMLButtonElement = document.querySelectorAll('.button-delete')[index] as HTMLButtonElement
    let parentCell: HTMLTableCellElement = deleteButtonElement.parentElement as HTMLTableCellElement
    this.changeButtonToSpinner(deleteButtonElement, parentCell)
    let self: any = this
    try {
      this.closePopupModal()
      await this.pagetourAuthor.DeleteTour(tourId).then(() => {
        announcementElement.setAttribute('aria-label', `Deleted tour ${tour.title}`)
        this.toursList.splice(index, 1)
        self.populateTours()
        if (this.configStore.Options.navigator.callbackOnTourDeleted) {
          this.configStore.Options.navigator.callbackOnTourDeleted(tour)
        }
      })
    } catch (error) {
      self.revertSpinnerToButton(deleteButtonElement, parentCell)
    }
  }

  private changeButtonToSpinner = (buttonElement: HTMLButtonElement, parentCell: HTMLTableCellElement) => {
    buttonElement.remove()
    parentCell.style.verticalAlign = 'middle'
    let spinnerDiv: HTMLDivElement = document.createElement('div')
    spinnerDiv.classList.add('pagetour-spinner-border', 'pagetour-spinner-border-sm')
    parentCell.appendChild(spinnerDiv)
  }

  private revertSpinnerToButton = (buttonElement: HTMLButtonElement, parentCell: HTMLTableCellElement) => {
    parentCell.removeChild(parentCell.firstChild)
    parentCell.appendChild(buttonElement)
  }

  /// Plays Tour
  private playTour = async (tourId: any, startInterval: number, autoPlayTest: boolean = false) => {
    this.hideManagePageTourModal()
    await this.pageTourPlay.playTour(tourId, RunTourAction.Play, startInterval, autoPlayTest)
  }

  private playTourByObject = async (tour: any, startInterval: number) => {
    this.hideManagePageTourModal()
    if(tour.tourtype.toLowerCase() == "announcement")
        this.pageTourPlay.runAnnouncement(tour, RunTourAction.Preview, 0)
    else
      this.pageTourPlay.runTour(tour, RunTourAction.Play, startInterval)
  }
  /// Hides Manage Tour Dialog
  private hideManagePageTourModal = () => {
    if (document.getElementById('manage-tours-modal') !== null) {
      document.getElementById('manage-tours-modal').style.display = 'none'
    }
  }

  private isExportAvaialable = async (): Promise<Boolean> => {
    if (this.isExportEnabled == undefined || this.isExportEnabled == null) {
      this.isAuthorizedToExportTour = await this.authorizationService.isAuthorizedToExportTour()
      this.isExportEnabled =
        this.isAuthorizedToExportTour &&
        this.configStore.Options.exportFeatureFlag &&
        (await this.dataStore.isExportTourImplemented())
    }
    return this.isExportEnabled
  }
  /// Unhides Manage Tour Dialog
  private unHideManagePageTourModal = () => {
    document.getElementById('manage-tours-modal').style.display = 'block'
  }
}

export { PageTourManager }
