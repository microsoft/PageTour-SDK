import { IPagetourRepository, Tutorial } from 'pagetour-sdk'
import { TutorialSearchFilter } from 'pagetour-sdk/dist/types/models/tutorialsearchfilter';
import { IRepositoryConfiguration } from 'pagetour-sdk/dist/types/repository/irepositoryconfiguration';
import { v4 as uuidv4 } from 'uuid';

class LocalStorageRepository implements IPagetourRepository {
    InitializeRepository(): void {
        if (!this.isStorageAvailable) {
            this.isRepoInitialized = false;
            return;
        }
        this.localStorage = window.localStorage;
        let t = localStorage.getItem(this.ALL_TOUR_IDS_KEY);
        let m = localStorage.getItem(this.MAP_KEY);
        let allTours = (t !== null) ? t : JSON.stringify({ allTourIds: [] });
        let map = (m !== null) ? m : JSON.stringify({});
        if(this.setItem(this.ALL_TOUR_IDS_KEY, allTours) && this.setItem(this.MAP_KEY, map)){
            this.isRepoInitialized = true;
        }
    }
    

    private isRepoInitialized:boolean
    private localStorage: Storage;
    private ALL_TOUR_IDS_KEY = 'allTourIdsObject'
    private MAP_KEY = 'contextMap';
    private ACTION_ADD = 'ADD';
    private ACTION_DELETE = 'DELETE';

    isInitialized(): Promise<boolean> {
        return new Promise<boolean>((resolve,reject)=>{
            resolve(this.isRepoInitialized)
        })
    }

    GetTourById(tutorialId: string, token: string): Promise<Tutorial> {
        return new Promise<Tutorial>((resolve, reject) => {
            let tourString = this.localStorage.getItem(tutorialId);
            if (typeof (tourString) === 'string') {
                let tourJson: Tutorial = JSON.parse(tourString);
                resolve(tourJson);
            }
            reject('No tour with given id found');
        });
    }


    GetToursByPageContext(searchFilter: TutorialSearchFilter, token:string): Promise<Tutorial[]> {
        return new Promise<Tutorial[]>((resolve, reject) => {
            let mapString = (this.localStorage.getItem(this.MAP_KEY));

            if (typeof (mapString) === 'string') {
                let tutorialsOnPage: Tutorial[] = [];
                let filtteredTutorials: Tutorial[] = [];
                let map = JSON.parse(mapString);
                let pageContext = searchFilter.pageContextUrl;
                let toursMappedToPageContext = map[pageContext]
                if (toursMappedToPageContext !== undefined) {
                    toursMappedToPageContext.forEach((tourId: string) => {
                        let tutorial = localStorage.getItem(tourId);
                        if (tutorial) {
                            let t: Tutorial = JSON.parse(tutorial);
                            tutorialsOnPage.push(t);
                        }

                    });
                    if (tutorialsOnPage.length > 0) {
                        if (searchFilter.active) {
                            tutorialsOnPage.forEach(tour => {
                                if (this.isActive(tour)) {
                                    filtteredTutorials.push(tour);
                                }
                            });
                        } else {
                            filtteredTutorials = tutorialsOnPage;
                        }
                    }

                }
                resolve(filtteredTutorials);
            }
            reject('Unable to read mapstring from local storage');
        })




    }


    CreateTour(tutorial: any, token:string): Promise<Tutorial> {
        return new Promise<Tutorial>((resolve, reject) => {
            let tour: any = tutorial;
            let tourId = this.createId();
            tour.id = tourId;
            tour.expireson = new Date(tutorial.expireson).toISOString();
            tour.activeon = new Date(tutorial.activeon).toISOString();
            tour.createdon = new Date(tutorial.createdon).toISOString();
            tour.lastmodifiedon = new Date(tutorial.lastmodifiedon).toISOString();

            if (this.setItem(tourId, JSON.stringify(tour))) {
                let mapUpdated = this.updateMap(tour, this.ACTION_ADD)
                if (mapUpdated) {
                    resolve(tour)
                }
            }
            reject('Unable to write new tutorial to local storage');
        });


    }
    UpdateTour(tutorial: any, token:string): Promise<Tutorial> {
        return new Promise<Tutorial>((resolve, reject) => {
            let tour: any = tutorial;
            tour.expireson = new Date(tutorial.expireson).toISOString();
            tour.activeon = new Date(tutorial.activeon).toISOString();
            tour.createdon = new Date(tutorial.createdon).toISOString();
            tour.lastmodifiedon = new Date(tutorial.lastmodifiedon).toISOString();
            
            if(this.setItem(tutorial.id, JSON.stringify(tour))){
                resolve(tour);
            }
            reject('Unable to edit tutorial in local storage');
        });
        
    }

    DeleteTour(tutorialId: string, token:string): Promise<Boolean> {
        
        return new Promise<Boolean>((resolve, reject) => {
            let tutorialString = this.localStorage.getItem(tutorialId);
            if(typeof(tutorialString) === 'string'){
                let tutorial: Tutorial = JSON.parse(tutorialString);
                if(this.updateMap(tutorial, this.ACTION_DELETE)){
                    this.localStorage.removeItem(tutorialId);
                    resolve(true);
                }
            }
            reject(false)    
        });     
    }


    private setItem(key: string, value: any): Boolean {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }

    }

    private updateMap(tutorial: Tutorial, action: string): Boolean {

        let allTourIdsString: string | null = this.localStorage.getItem(this.ALL_TOUR_IDS_KEY);
        let mapString: string | null = this.localStorage.getItem(this.MAP_KEY);
        if (typeof (allTourIdsString) === 'string' && typeof (mapString) === 'string') {
            let allTourIdsJson = JSON.parse(allTourIdsString);
            let allTourIdsArray = allTourIdsJson['allTourIds'];
            let mapObject = JSON.parse(mapString);

            let pageContext = tutorial.pagecontext[0];
            let toursMappedToPageContext = mapObject[pageContext];

            switch (action) {
                case 'ADD':
                    allTourIdsArray.push(tutorial.id);
                    allTourIdsJson['allTourIds'] = allTourIdsArray;
                    if (toursMappedToPageContext === undefined) {
                        mapObject[pageContext] = [];
                    }
                    mapObject[pageContext].push(tutorial.id);
                    if (!(this.setItem(this.ALL_TOUR_IDS_KEY, JSON.stringify(allTourIdsJson)) && this.setItem(this.MAP_KEY, JSON.stringify(mapObject)))) {
                        return false;
                    }
                    return true;

                case 'DELETE':
                    allTourIdsArray.splice(allTourIdsArray.indexOf(tutorial.id), 1);
                    allTourIdsJson['allTourIds'] = allTourIdsArray;

                    toursMappedToPageContext.splice(toursMappedToPageContext.indexOf(tutorial.id), 1);
                    mapObject[pageContext] = toursMappedToPageContext;
                    if (!(this.setItem(this.ALL_TOUR_IDS_KEY, JSON.stringify(allTourIdsJson)) && this.setItem(this.MAP_KEY, JSON.stringify(mapObject)))) {
                        return false;
                    }
                    return true;   
                    

            }
        }
        return false;
    }

    private isActive(tour: Tutorial) {
        let dateToday = new Date(Date.now());
        let expiresOn = new Date(tour.expireson);
        let activeOn = new Date(tour.activeon);

        return (expiresOn >= dateToday && activeOn <= dateToday);

    }

    private createId() {
        return uuidv4();
    }

    private isStorageAvailable(): boolean {
        let storage: any
        try {
            storage = window.localStorage;
            let x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        }
        catch (e) {
            return e instanceof DOMException && (

                e.code === 22 ||

                e.code === 1014 ||

                e.name === 'QuotaExceededError' ||

                e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
                (storage && storage.length !== 0);
        }
    }

}

export { LocalStorageRepository }
