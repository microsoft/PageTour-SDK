# pagetour-sdk.httprepository

This is the Http plugin for pagetour-sdk.

## Install

    npm install pagetour-sdk.httprepository

## Usage

Import and initialize the repository.

    import { HttpRepository} from 'pagetour-sdk.httprepository';
    ...
    this.repository = new HttpRepository({baseUrl:'https://api-baseUrl.com/'});


Pass it as a parameter while initializing the pagetour sdk.

    Pagetour.init(this.repository, options);
    this.pagetour = PageTour.GetInstance();


## [Documentation](https://github.com/microsoft/PageTour-SDK)
