 # pagetour-sdk.localrepository
![npm](https://img.shields.io/npm/v/pagetour-sdk.localrepository)

This is the local storage plugin for pagetour-sdk.

## Install

    npm install pagetour-sdk.localrepository

## Usage

Import and initialize the repository.

    import { LocalStorageRepository } from 'pagetour-sdk.localrepository';
    ...
    this.repository = new LocalStorageRespository();


Pass it as a parameter while initializing the pagetour sdk.

    Pagetour.init(this.repository, options);
    this.pagetour = PageTour.GetInstance();


## [Documentation](https://github.com/microsoft/PageTour-SDK)