import { ConfigStore } from './configstore'

export class LoggerService {
  constructor(private configStore: ConfigStore) {}

  public logError = (message: any, properties: any) => {
    this.logTelemetry('Error', message, properties)
  }

  public logWarning = (message: any, properties: any) => {
    this.logTelemetry('Warning', message, properties)
  }

  public logInfo = (message: any, properties: any) => {
    this.logTelemetry('Info', message, properties)
  }

  public logTrace = (message: any, properties: any) => {
    this.logTelemetry('Trace', message, properties)
  }

  private logTelemetry = (eventType: string, message: any, properties: any) => {}
}
