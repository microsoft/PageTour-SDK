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
  }
}
