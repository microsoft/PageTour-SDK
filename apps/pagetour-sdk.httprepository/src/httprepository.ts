import { IPagetourRepository, Tutorial } from 'pagetour-sdk'
import { TutorialSearchFilter } from 'pagetour-sdk/dist/types/models/tutorialsearchfilter';
import { IRepositoryConfiguration } from 'pagetour-sdk/dist/types/repository/irepositoryconfiguration';

class HttpRepository implements IPagetourRepository {
    private isRepoInitialized: boolean
    private baseUrl;
    private getEndpoint;
    private postEndpoint;
    private deleteEndpoint;
    private putEndpoint;
    private exportEndPoint;

    private getRequest = 'GET'
    private postRequest = 'POST'
    private putRequest = 'PUT'
    private deleteRequest = 'DELETE'

    isInitialized(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            resolve(this.isRepoInitialized);
        })

    }
    InitializeRepository(repositoryConfiguration: IRepositoryConfiguration): void {
        this.baseUrl = repositoryConfiguration.baseUrl;
        this.getEndpoint = repositoryConfiguration.getEndPoint;
        this.postEndpoint = repositoryConfiguration.postEndPoint;
        this.deleteEndpoint = repositoryConfiguration.deleteEndPoint;
        this.putEndpoint = repositoryConfiguration.putEndPoint;
        this.isRepoInitialized = true;
        this.exportEndPoint = repositoryConfiguration.exportEndpoint;
    }

    GetTourById(tutorialId: string, token: string): Promise<Tutorial> {
        let url = `${this.getRequestUrl(this.baseUrl, this.getEndpoint)}/${tutorialId}`;
        return this.httpRequest<Tutorial>(url, this.getRequest, token, null);
    }

    GetToursByPageContext(searchFilter: TutorialSearchFilter, token: string): Promise<Tutorial[]> {
        let url = this.getRequestUrl(this.baseUrl, this.getEndpoint);
        let headers = new Map<string, string>();
        headers.set('x-active', searchFilter.active.toString());
        headers.set('x-pagecontextstate', searchFilter.pageContextState);
        headers.set('x-pagecontexturl', searchFilter.pageContextUrl);
        let includedTags:string = searchFilter.includeTags.join();
        let excludedTags:string = searchFilter.excludeTags.join();
        headers.set('x-excludetags', excludedTags);
        headers.set('x-includetags', includedTags);
        return this.httpRequest<Tutorial[]>(url, this.getRequest, token, null, headers);
        
    }

    CreateTour = async (tutorial: any, token: string): Promise<Tutorial> => {
        let url = this.getRequestUrl(this.baseUrl, this.postEndpoint);
        return this.httpRequest<Tutorial>(url, this.postRequest, token, tutorial);
    }

    UpdateTour(tutorial: any, token: string): Promise<Tutorial> {
        let url = this.getRequestUrl(this.baseUrl, this.putEndpoint);
        return this.httpRequest<Tutorial>(url, this.putRequest, token, tutorial);
    }

    DeleteTour(tutorialId: string, token: string): Promise<Boolean> {
        let url = `${this.getRequestUrl(this.baseUrl, this.deleteEndpoint)}/${tutorialId}`;
        return this.httpRequest<Boolean>(url, this.deleteRequest, token, null);
    }

    ExportTour(tutorial:any, token:string):Promise<boolean>{
        if(this.exportEndPoint!=null){
            let url = this.getRequestUrl(this.baseUrl, this.exportEndPoint);
            return this.httpRequest<boolean>(url, this.postRequest, token, tutorial);
        }
    }

    private getRequestUrl(baseUrl: string, endPoint: string) {
        return `${baseUrl}${endPoint}`;
    }

    private httpRequest = <T>(url: string, type: string, token: string, data: any, headers?: Map<string, string>): Promise<T> => {
        return new Promise<T>((resolve, reject) => {
            let requestData = data
            if (type !== 'GET' && type !== 'DELETE') {
                requestData = JSON.stringify(data);
            }

            const ajaxRequest = new XMLHttpRequest()
            ajaxRequest.open(type.toUpperCase(), url, true)
            ajaxRequest.setRequestHeader('Content-Type', 'application/json')
            ajaxRequest.setRequestHeader('Authorization', `Bearer ${token}`)
            if (headers !== undefined) {
                for (let [key, value] of Array.from(headers.entries())) {
                    ajaxRequest.setRequestHeader(key, value)
                }
            }
            ajaxRequest.onreadystatechange = () => {
                if (ajaxRequest.readyState === 4) {
                    if (ajaxRequest.status !== 200) {
                        reject(ajaxRequest.responseText)
                    } else {
                        const response = JSON.parse(ajaxRequest.responseText) as T
                        resolve(response)
                    }
                }
            }
            ajaxRequest.send(requestData)

        })
    }

}

export { HttpRepository }
