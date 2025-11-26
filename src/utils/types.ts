export interface Participant {
  id: string;
  name: string;
  email: string;
}

export interface SecretSantaData {
  participants: Participant[];
  listName?: string;
  giftAmount?: number | undefined;
}
