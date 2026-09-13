export type ShareInboxChangedEvent = {
  preparing: boolean
  unreadableCount?: number
}

export type ExpoShareIntakeModuleEvents = {
  onInboxChanged: (event: ShareInboxChangedEvent) => void
}
