export interface LoggerOptions {
  log: (eventType: string, message: string, properties?: Map<string, string>) => void
}

export enum PlayingMode {
  Manual,
  AutoPlay,
  AutomationTriggered,
}
