class DomUtils {
  public static appendTo = (source: HTMLElement, html: string): HTMLElement => {
    if (!source || !html) {
      return source
    }
    const newElement = DomUtils.htmlToElement(html)
    source.appendChild(newElement)
    return newElement
  }

  public static appendToBody = (html: string): HTMLElement => {
    const body = document.getElementsByTagName('body')[0]
    return DomUtils.appendTo(body, html)
  }

  public static removeFromDom = (element: HTMLElement): void => {
    if (element) {
      const parent = element.parentElement
      if (parent) {
        parent.removeChild(element)
      }
    }
  }

  public static offset = (element: HTMLElement): any => {
    const rect = element.getBoundingClientRect()

    return {
      top: rect.top + document.body.scrollTop,
      left: rect.left + document.body.scrollLeft,
    }
  }

  public static outerWidth(element: HTMLElement): number {
    let width = element.offsetWidth
    const style = getComputedStyle(element)

    width += parseInt(style.marginLeft, 10) + parseInt(style.marginRight, 10)
    return width
  }

  public static outerHeight(element: HTMLElement): number {
    let width = element.offsetHeight
    const style = getComputedStyle(element)

    width += parseInt(style.marginTop, 10) + parseInt(style.marginBottom, 10)
    return width
  }

  public static show = (element: HTMLElement): HTMLElement => {
    if (!element) {
      return element
    }

    element.style.display = 'block'
    return element
  }

  public static hide = (element: HTMLElement): HTMLElement => {
    if (!element) {
      return element
    }

    element.style.display = 'none'
    return element
  }
  public static off = (element: HTMLElement): HTMLElement => {
    const newElement = element.cloneNode(true)
    element.parentNode.replaceChild(newElement, element)
    return newElement as HTMLElement
  }

  private static htmlToElement = (html: string): HTMLElement => {
    const template = document.createElement('template')
    html = html.trim() // Never return a text node of whitespace as the result
    template.innerHTML = html
    return template.content.firstChild as HTMLElement
  }

  public static getAllFocusableElements = (doc: HTMLElement): NodeListOf<Element> => {
    let focusableElementsString =
      'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
    let focusableElements = doc.querySelectorAll(focusableElementsString)

    return focusableElements
  }

  public static trapTabKey = (firstTabStop: HTMLElement, lastTabStop: HTMLElement) => {
    /*redirect last tab to first input*/
    lastTabStop.onkeydown = function(e: any) {
      if (e.which === 9 && !e.shiftKey) {
        e.preventDefault()
        firstTabStop.focus()
      }
    }

    /*redirect first shift+tab to last input*/
    firstTabStop.onkeydown = function(e: any) {
      if (e.which === 9 && e.shiftKey) {
        e.preventDefault()
        lastTabStop.focus()
      }
    }
  }

  private static releaseTabTrap(firstTabStop: HTMLElement, lastTabStop: HTMLElement) {
    firstTabStop.onkeydown = null
    lastTabStop.onkeydown = null
  }

  public static removeTabbing(htmlElement: HTMLElement) {
    let focusableElements = DomUtils.getAllFocusableElements(htmlElement)
    // Get first and last focusable elements
    let firstTabStop: HTMLElement = focusableElements[0] as HTMLElement
    let lastTabStop: HTMLElement = focusableElements[focusableElements.length - 1] as HTMLElement
    DomUtils.releaseTabTrap(firstTabStop, lastTabStop)
  }

  public static manageTabbing(htmlElement: HTMLElement) {
    // Get all focusable elements within the htmlElement
    let focusableElements = DomUtils.getAllFocusableElements(htmlElement)
    // Get first and last focusable elements
    let firstTabStop: HTMLElement = focusableElements[0] as HTMLElement
    let lastTabStop: HTMLElement = focusableElements[focusableElements.length - 1] as HTMLElement
    firstTabStop.focus()
    DomUtils.trapTabKey(firstTabStop, lastTabStop)
  }
}

export { DomUtils }
