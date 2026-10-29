export type NormalizedEvent = {
  externalId: string;
  title: string;
  description: string | null;
  location: string | null;
  start: Date;
  end: Date;
  allDay: boolean;
};

export type SyncResult = {
  events: NormalizedEvent[];
};
