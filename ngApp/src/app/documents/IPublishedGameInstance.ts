import { IGameInstance } from "./IGameInstance";

export interface IPublishedGameInstance {
  frontEndLogic: string;
  gameInstance: IGameInstance
}
