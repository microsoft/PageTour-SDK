import { HttpRequest } from '@angular/common/http'
import { Component, OnInit } from '@angular/core'
import { PageTour } from 'pagetour-sdk'

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    const pagetour = PageTour.GetInstance()

    const pageContext = pagetour.getPageContext()
    let container = document.getElementById('container')
    let root = container.attachShadow( { mode: "open" } )

    //Inside element
    let h1 = document.createElement( "h1" )
    h1.textContent = "Inside Shadow DOM"
    h1.id = "firstChild"
    root.appendChild( h1 )

    //Inside element
    let h2 = document.createElement( "h2" )
    h2.textContent = "h2"
    h2.id = "secondChild"
    h2.className = 'demo header2'
    root.appendChild( h2 )
  }
}
