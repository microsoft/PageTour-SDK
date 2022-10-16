import { Component, OnInit } from '@angular/core'
import { PageTour, Tutorial, IPagetourRepository } from 'pagetour-sdk'
import {LocalStorageRepository } from 'pagetour-sdk.localrepository'
import { MatSnackBar } from '@angular/material'
import { Router, NavigationEnd, NavigationStart } from '@angular/router'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  color = 'primary'
  checked = false
  disabled = false
  url: string

  public repository: IPagetourRepository


  constructor(private snackBar: MatSnackBar, private router: Router) {}
  ngOnInit(): void {
    this.repository = new LocalStorageRepository()
    this.repository.InitializeRepository()
    this.pageTourInit()
  }

  private pageTourInit = () => {
    PageTour.init(this.repository, {
      announcementDefaultImage : 'https://fxpsitstoragenew.z13.web.core.windows.net/perfectfit.jpg',
      enableTranscript: true,
      theme: {
        primaryColor: '#0063b1',
        secondaryColor: '#fdfdfd',
        textColor: '#252423',
        navigationButtonColor: '#0063b1',
        isRounded: false
      },
      tags: {
        tagHelpText: 'This is from sample app'
      },
      enableBeacon: true,
      enableAnnouncement: true,
      userInfo: {
        getCurrentUser: () => {
          return "";
        },
        getCurrentUserPermissions: () => {
            return ["create", "delete", "update", "export"]
        },
      }

    });
  }

  public openAuthorTourDialog = () => {
    const pagetour = PageTour.GetInstance()
    pagetour.openPageTourAuthorDialog()
  }

  public openManageTourDialog = async () => {
    const pagetour = PageTour.GetInstance()
    await pagetour.openPageTourManageDialog()
  }
  
}
