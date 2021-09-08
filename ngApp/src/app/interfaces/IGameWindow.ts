import { IFrontendApi } from "./IFrontendApi";


export interface IGameWindow {
  connect(gameLoopApi: IFrontendApi): void
  disconnect(): void;
}
