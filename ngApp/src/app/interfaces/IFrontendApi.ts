
export interface IFrontendApi {
  pushPlayerState(state: any): void;
  enterGame(): void;
  exitGame(): void;
  onPlayerEvent(callback: (state: any) => void): void;
  onGameLoop(callback: (state: any) => void): void;
  onGameStop(callback: (state: any) => void): void;
}
