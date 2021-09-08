import { Component, EventEmitter, OnInit, ViewChild } from '@angular/core';
import { IGameWindow } from 'src/app/interfaces/IGameWindow';
import * as signalR from '@microsoft/signalr';
import { environment } from './../../../environments/environment';
import { HttpService } from 'src/app/services/http-service.service';
import { IGameDefinition } from 'src/app/documents/IGameDefinition';
import { IPlayerEventWrapper } from 'src/app/documents/IPlayerEventWrapper';
import { bufferTime } from 'rxjs/operators';
import { IGameInstance } from 'src/app/documents/IGameInstance';
import { IPublishedGameInstance } from 'src/app/documents/IPublishedGameInstance';
import { GameWindowComponent } from '../game-window/game-window.component';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss']
})
export class GameComponent {

  @ViewChild('gameWindow') gameWindow?: GameWindowComponent;

  public publishedGameInstance?: IPublishedGameInstance

  private _signalrConnection?: signalR.HubConnection;
  private _gameWindow?: IGameWindow;
  private _isGameActive = false;

  private _onPlayerStateCallback: (data: any) => void = _ => { console.log("PlayerStateCallback not set") };
  private _onGameStateCallback: (data: any) => void = _ => { console.log("GameStateCallback not set") };
  private _onPlayerEnterStateCallback: (data: any) => void = _ => { console.log("PlayerEnterStateCallback not set") };
  private _onPlayerExitStateCallback: (data: any) => void = _ => { console.log("PlayerExitStateCallback not set") };
  private _onStopStateCallback: (data: any) => void = _ => { console.log("StopStateCallback not set") };

  private _notifyPlayerEvent: EventEmitter<IPlayerEventWrapper> = new EventEmitter<IPlayerEventWrapper>();

  constructor(
    private _httpService: HttpService
  ) { }

  async ngAfterViewInit() {

    await this._initSignalr();
    await this._bindGameEvents()
    await this._loadGameInstance();

    if (this.publishedGameInstance == null) return;

    this._notifyPlayerEvent
      .pipe(bufferTime(100))
      .subscribe(playerEvent => {
        if (this._isGameActive) {
          this._signalrConnection?.invoke("PlayerEvent", JSON.stringify(playerEvent));
        }
      });

    this.gameWindow?.setFrontEndLogic(this.publishedGameInstance.frontEndLogic);

    await this._signalrConnection?.invoke("Start", this.publishedGameInstance!!.gameInstance.gamePrimaryName);

    this._gameWindow?.connect({
      pushPlayerState: (state) => {
        //console.log("Sending player state:",state);

        if (this._isGameActive) {

          var playerEvent = <IPlayerEventWrapper>{
            data: state
          }

          this._notifyPlayerEvent.emit(playerEvent);

        }
      },
      enterGame: async () => {
        await this._signalrConnection?.invoke("Enter");

      },
      exitGame: async () => {
        await this._signalrConnection?.invoke("Exit");

      },
      onPlayerEvent: (callback) => {
        this._onPlayerStateCallback = callback;
      },
      onGameLoop: (callback) => {
        this._onGameStateCallback = callback;
      },
      onGameStop: (callback) => {
        this._onStopStateCallback = callback;
      }
    });


    this._isGameActive = true;

  }

  public async registerGameWindow(gameWindow: IGameWindow) {

    this._gameWindow = gameWindow;
  }

  private async _loadGameInstance() {

    this.publishedGameInstance = await this._httpService.getPublishedGameInstance(window.location.pathname);

  }

  private async _initSignalr() {

    if (this._signalrConnection) {
      console.log('Signalr connection already established');
      return;
    }

    this._signalrConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiBase}/game`)
      .configureLogging(signalR.LogLevel.Information)
      .build();

    console.log('signalr connecting...');

    await this._signalrConnection.start()
      .catch(console.error);

    this._signalrConnection.onclose(() => {

      console.log('disconnected');
      this._isGameActive = false;
      this._gameWindow?.disconnect();
    });
  }

  private async _bindGameEvents() {
    var playerEntered = false;
    this._signalrConnection?.on(`OnPlayerState`, (message) => {
      this._onPlayerStateCallback(JSON.parse(message))
    });
    this._signalrConnection?.on('OnPlayerEnterState', (message) => {
      this._onPlayerEnterStateCallback(JSON.parse(message));
      playerEntered = true;
    });
    this._signalrConnection?.on('OnPlayerExitState', (message) => {
      playerEntered = false;
      this._onPlayerExitStateCallback(JSON.parse(message))
    });
    this._signalrConnection?.on(`OnGameState`, (message) => {
      if (!playerEntered) return;
      var stateItems = JSON.parse(message)
      for (const state of stateItems) {
        this._onGameStateCallback(state)
      }
    });

    this._signalrConnection?.on(`OnGameEnd`, (message) => {
      this._onStopStateCallback(JSON.parse(message));

      this._gameWindow?.disconnect();
      this._isGameActive = false;
    });
  }
}
