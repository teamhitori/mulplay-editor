import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, ViewChild } from '@angular/core';
import { MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSidenav } from '@angular/material/sidenav';
import { Observable } from 'rxjs';
import { bufferTime, delay, map, shareReplay, throttleTime, timeInterval, timeout, timeoutWith, zip } from 'rxjs/operators';
import * as signalR from '@microsoft/signalr';

import { IGameConfig } from 'src/app/documents/IGameConfig';
import { IPlayerEventWrapper } from 'src/app/documents/IPlayerEventWrapper';
import { LogicDefaults } from 'src/app/documents/logicDefaults';
import { HttpService } from 'src/app/services/http-service.service';
import { GameWindowComponent } from '../game-window/game-window.component';
import { IGameWindow } from 'src/app/interfaces/IGameWindow';

import { LogicType } from 'src/app/documents/LogicType';
import { IGameDefinition } from 'src/app/documents/IGameDefinition';
import { IGameLogic } from 'src/app/documents/IGameLogic';
import { ICodeValidation } from 'src/app/documents/ICodeValidation';
import { environment } from './../../../environments/environment';
import { MatDialog } from '@angular/material/dialog';
import { DialogNewGameComponent } from '../dialog-new-game/dialog-new-game.component';
import { IGameInstance } from 'src/app/documents/IGameInstance';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Subject } from 'rxjs/internal/Subject';
import { interval } from 'rxjs/internal/observable/interval';
import { IFrontendApi } from 'src/app/interfaces/IFrontendApi';

enum EditorScreen {
  debug,
  editor,
  settings,
  publish
}

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})

export class EditorComponent {
  title = 'Mul Play Editor';


  @ViewChild('sidenav') public sidenav!: MatSidenav;

  public editorOptions = { theme: 'vs-dark', language: 'javascript' };
  public code: string = ``;
  public gameDefinition: IGameDefinition = <IGameDefinition>{};
  public selectedGame: String = "";
  public gamesListNames: string[] = [];
  public codeValidation?: ICodeValidation;
  public message: string = "";
  public gameState: any = {};
  public activeGameList: IGameInstance[] = [];
  public screen: EditorScreen = EditorScreen.debug;
  public fullscreen: boolean = false;

  public fileIsDirty: boolean = false;
  public gameInstance!: IGameInstance;
  private _frontendApi: any;

  public get EditorScreen(): typeof EditorScreen {
    return EditorScreen;
  }


  public currentLogicScreen: LogicType = LogicType.FrontendLogic;
  public savingLogicScreen: LogicType = LogicType.FrontendLogic;
  public get LogicType(): typeof LogicType {
    return LogicType;
  }

  public saving = false;
  public showActive = false;

  public isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  public range = [...Array(1, 50).keys()];

  @ViewChild('codeToggle') codeToggle?: MatButtonToggleGroup;

  @ViewChild('gameWindow') gameWindow?: GameWindowComponent;

  private _isStepActive: boolean = false;
  private _breakActive = false;
  private _lastSavedVersionId: any;
  private _currentGameName!: string;

  private _onPlayerEventCallback: (data: any) => void = _ => { console.log("PlayerStateCallback not set") };
  private _onGameStateCallback: (data: any) => void = _ => { console.log("GameStateCallback not set") };
  private _onPlayerEnterStateCallback: (data: any) => void = _ => { console.log("PlayerEnterStateCallback not set") };
  private _onPlayerExitStateCallback: (data: any) => void = _ => { console.log("PlayerExitStateCallback not set") };
  private _onStopStateCallback: (data: any) => void = _ => { console.log("StopStateCallback not set") };

  //private _createGameOutRes: ICreateGameOutDef;
  private _notifyPlayerEvent: EventEmitter<IPlayerEventWrapper> = new EventEmitter<IPlayerEventWrapper>();
  private _isGameActive = false;
  private _playerEntered = false;

  private _signalrConnection?: signalR.HubConnection;
  private _gameWindow?: IGameWindow;

  private _subjectUpdateConfig = new Subject<number>();

  constructor(
    private _snackBar: MatSnackBar,
    public dialogNew: MatDialog,
    private _httpService: HttpService,
    private _changeDetectorRef: ChangeDetectorRef,
    private breakpointObserver: BreakpointObserver) { }

  async ngAfterViewInit() {

    var split = window.location.pathname.split("/").filter(x => (!!x));

    this._currentGameName = "default";

    if (split.length == 2) {
      this._currentGameName = split[1];
    } else {
      this.gamesListNames = await this._httpService.getGameNames();

      this._currentGameName = this.gamesListNames.length ? this.gamesListNames[0] : "default";
    }

    await this._initSignalr();
    await this._bindEditorEvents()
    await this._loadGameDefinition();
    await this._loadActiveGameList();
    await this._signalrConnection?.invoke("Monitor", this._currentGameName);

    this._notifyPlayerEvent
      .pipe(bufferTime(100))
      .subscribe(playerEvent => {
        if (this._isGameActive && playerEvent.length) {
          this._signalrConnection?.invoke("PlayerEvent", JSON.stringify(playerEvent));
        }
      });

    this.code = this.gameDefinition.frontendLogic;
    this.currentLogicScreen = LogicType.FrontendLogic;
    this.savingLogicScreen = this.currentLogicScreen;

    this.showDebugWindow();

    this._subjectUpdateConfig
      .pipe(
        bufferTime(3000),
      ).subscribe(async events => {
        console.log(`buffer ${events.length}`)

        if (events.length) {

          this.gameDefinition.gameConfig.screenRatio = events[events.length - 1];
          await this.upsertGameConfig();
        }
      });


      this._frontendApi = <IFrontendApi>{
        pushPlayerState: (state) => {

          if (this._isGameActive) {

            var playerEvent = <IPlayerEventWrapper>{
              data: state
            }
            this._notifyPlayerEvent.emit(playerEvent);
          }
        },
        enterGame: async () => {
          console.log("Player Enter");
          this._playerEntered = true;

          await this._signalrConnection?.invoke("Enter");
        },
        exitGame: async () => {
          console.log("Player Exit")

          await this._signalrConnection?.invoke("Exit");
        },
        onPlayerEvent: (callback) => {
          this._onPlayerEventCallback = callback;
        },
        onGameLoop: (callback) => {
          this._onGameStateCallback = callback;
        },
        onGameStop: (callback) => {
          this._onStopStateCallback = callback;
        }
      }
  }

  fillScreenChange(event: MatCheckboxChange) {
    console.log(event);

    this.gameDefinition.gameConfig.fillScreen = event.checked;
  }

  screenRatioChange(event: any) {

    if (event.target.value) {

      this._subjectUpdateConfig.next(+event.target.value);
    }

  }

  async showDialogNew() {
    const dialogRef = this.dialogNew.open(DialogNewGameComponent, {
      width: '350px'
      //data: {name: this.name, animal: this.animal}
    });

    dialogRef.afterClosed().subscribe(async currentGameName => {
      console.log(`New Game dialog was closed ${currentGameName}`);

      if (currentGameName) {

        this._currentGameName = currentGameName;

        this._reloadGameDefinition();

        await this._signalrConnection?.invoke("Monitor", this._currentGameName);

      }

    });
  }

  async _reloadGameDefinition() {
    await this._loadGameDefinition();
    await this._loadActiveGameList();

    this.setLogic();
    this._changeDetectorRef.detectChanges();

    if (this.screen == EditorScreen.debug) {
      this.gameWindow?.setFrontEndLogic(this.gameDefinition.frontendLogic);
    }
  }

  async onSelectActiveGame(gameInstance: IGameInstance) {
    this.gameInstance = gameInstance;
    this.activeGameList = [];

    await this._signalrConnection?.invoke("Start", this.gameInstance.gamePrimaryName);

    this._gameWindow?.connect(this._frontendApi);

    await this._bindGameEvents();

    console.log("Invoking start")

    this._isGameActive = true;
  }

  async showDebugWindow() {
    this.saveLogic(this.currentLogicScreen);
    this.screen = EditorScreen.debug;
    this._changeDetectorRef.detectChanges();
    this.gameWindow?.setFrontEndLogic(this.gameDefinition.frontendLogic);
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });

  }

  async showEditorWindow() {
    this.stopGame();
    this.screen = EditorScreen.editor;
    this._changeDetectorRef.detectChanges();
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });
  }

  async showSettingsWindow() {
    this.screen = EditorScreen.settings;
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });
  }

  async showPublishWindow() {
    this.screen = EditorScreen.publish;
    this.isHandset$.subscribe(res => {
      if (res) {
        this.sidenav.close();
      }
    });
  }


  private async _loadActiveGameList() {
    this.activeGameList = await this._httpService.getActiveGameList(this._currentGameName);
  }

  private async _loadGameDefinition() {

    this.gameDefinition = await this._httpService.getGameDefinition(this._currentGameName);

    window.history.pushState("", "", `/editor/${this._currentGameName}`);

    this._changeDetectorRef.detectChanges();

    this.gameWindow?.onResize();

    this._snackBar.open('Game Config Loaded', 'Ok', {
      duration: 3000
    });

  }

  public async registerGameWindow(gameWindow: IGameWindow) {

    this._gameWindow = gameWindow;
  }


  async stepGame() {
    this._isStepActive = true;
    await this._signalrConnection?.invoke("Step");
  }

  validateCode(): any {
    try {
      var func = new Function("require", this.code);
      this.codeValidation = { success: true };
    } catch (ex) {
      console.log(ex);
      this.codeValidation = {
        success: false,
        error: ex
      };
    }
  }


  async upsertGameConfig() {
    var logicType = this.currentLogicScreen;
    this.gameDefinition.gameConfig.intervalMs = +this.gameDefinition.gameConfig.intervalMs;

    this.validateCode();

    if (this.codeValidation?.success) {
      this._httpService.upsertGameLogic(<IGameLogic>{
        gameName: this.gameDefinition.gameName,
        logicType: logicType,
        code: this.code
      })

      await this._httpService.upsertGameConfig(this.gameDefinition.gameName, this.gameDefinition.gameConfig);

      this.gamesListNames = await this._httpService.getGameNames();

      this._snackBar.open(`${LogicType[logicType]} Updated`, 'Ok', {
        duration: 3000
      });

    }

    this.saving = false;
  }

  async startGame() {

    if (!this._isGameActive) {

      this.gameInstance = await this._httpService.createGame(this.gameDefinition.gameName);

      await this._signalrConnection?.invoke("Start", this.gameInstance.gamePrimaryName);

      this._gameWindow?.connect(this._frontendApi);

      await this._bindGameEvents();

      console.log("Invoking start")


      this._isGameActive = true;
    }



  }

  async stopGame() {

    await this.finalizeGameLoop();
  }

  expand() {
    this.sidenav.close();

    this.fullscreen = true;

    var header = document.getElementById("nav-bar");
    header?.classList.add('collapse-header');

    setTimeout(() => {
      this.gameWindow?.onResize();
    }, 500);

    this.gameWindow?.focusCanvas();
  }

  collapse() {

    this.isHandset$.subscribe(res => {
      if (!res) {
        this.sidenav.open();
      }
    });

    this.fullscreen = false;

    var header = document.getElementById("nav-bar");
    header?.classList.remove('collapse-header');

    setTimeout(() => {
      this.gameWindow?.onResize();
    }, 500);

    this.gameWindow?.focusCanvas();
  }

  setLogic() {
    switch (this.currentLogicScreen) {
      case LogicType.FrontendLogic:
        this.code = this.gameDefinition.frontendLogic;
        break;
      case LogicType.BackendLogic:
        this.code = this.gameDefinition.backendLogic;
        break;
      default:
        break;
    }

    this.fileIsDirty = false;
    this._lastSavedVersionId = null;
  }

  async showFrontEndLogic() {
    this.saveLogic(LogicType.FrontendLogic);
    this.code = this.gameDefinition.frontendLogic;
    this.currentLogicScreen = LogicType.FrontendLogic;
    this._lastSavedVersionId = null;
  }

  async showBackendLogic() {
    this.saveLogic(LogicType.BackendLogic);
    this.code = this.gameDefinition.backendLogic;
    this.currentLogicScreen = LogicType.BackendLogic;
    this._lastSavedVersionId = null;
  }

  onKeyDown($event: KeyboardEvent): void {
    // Detect platform
    if (navigator.platform.match('Mac')) {
      this.handleMacKeyEvents($event);
    }
    else {
      this.handleWindowsKeyEvents($event);
    }
  }

  handleMacKeyEvents($event: KeyboardEvent) {
    // MetaKey documentation
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/metaKey
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.metaKey && charCode === 's') {
      // Action on Cmd + S
      $event.preventDefault();
    }
  }

  handleWindowsKeyEvents($event: KeyboardEvent) {
    let charCode = String.fromCharCode($event.which).toLowerCase();
    if ($event.ctrlKey && charCode === 's') {
      // Action on Ctrl + S
      $event.preventDefault();
    }
  }

  async saveLogic(nextScreen: LogicType = this.currentLogicScreen) {
    if (this.fileIsDirty) {

      this.saving = true;
      switch (this.currentLogicScreen) {

        case LogicType.FrontendLogic:
          this.gameDefinition.frontendLogic = this.code;
          break;
        case LogicType.BackendLogic:
          this.gameDefinition.backendLogic = this.code;
          break;
        default:
          break;
      }

      await this.upsertGameConfig();
    }

    this.fileIsDirty = false;
    this.savingLogicScreen = nextScreen;

  }

  async onInit(editor: any) {

    var monaco = (window as any).monaco;

    console.log(monaco);

    // validation settings
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false
    });

    // compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES6,
      allowNonTsExtensions: true
    });


    var response = await fetch("https://preview.babylonjs.com/babylon.d.ts");
    var babylonDef = await response.text();

    monaco.languages.typescript.javascriptDefaults.addExtraLib([
      babylonDef,
      ` declare interface IFrontendApi {
          pushPlayerState(state: any): void;
          enterGame(): void;
          exitGame(): void;
          onPlayerState(callback: (state: any) => void): void;
          onGameLoop(callback: (state: any) => void): void;
          onGameStop(callback: (state: any) => void): void;
        }
        var frontendApi: IFrontendApi;
      `,`declare interface IBackendApi {
          pushPlayerState(playerPosition: number, state: any): void;
          pushGameState(state: any): void;
          onPlayerEvent(callback: (playerPosition: number, playerState: any) => void): void;
          onGameLoop(callback: () => void): void;
          onPlayerEnter(callback: (playerPosition: number) => void): void;
          onPlayerExit(callback: (playerPosition: number) => void): void;
          onGameStop(callback: () => void): void;
          onGameStart(callback: () => void): void;
        };
        var backendApi: IBackendApi;
      `,`declare interface IGameConfig {
        intervalMs: number;
        fillScreen: boolean;
        screenRatio: number;
      }
      var gameConfig: IGameConfig;

      `
    ].join('\n'), 'filename/facts.d.ts');

    var model = editor.getModel();

    model.onDidChangeContent(() => {
      var currentId = model.getAlternativeVersionId();

      this.fileIsDirty = (this._lastSavedVersionId != null && this._lastSavedVersionId !== currentId)

      this._lastSavedVersionId = currentId;

    });

    this._lastSavedVersionId = model.getAlternativeVersionId()
    this.fileIsDirty = false;

    var decorations = editor.deltaDecorations([], [
      {
        range: new monaco.Range(3, 1, 3, 1),
        options: {
          isWholeLine: true,
          className: 'myContentClass',
        }
      }
    ]);

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S, () => {
      this.saveLogic(this.currentLogicScreen);
    })

    let line = editor.getPosition();
    console.log(line);
  }

  private async finalizeGameLoop() {

    this._isGameActive = false;

    await this._signalrConnection?.invoke("Stop");

    this._gameWindow?.disconnect();
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
    this._signalrConnection?.on(`onPlayerEvent`, (message) => {
      this._onPlayerEventCallback(JSON.parse(message))
    });
    this._signalrConnection?.on('OnPlayerExitState', (message) => {
      this._playerEntered = false;
      this._onPlayerExitStateCallback(JSON.parse(message))
    });
    this._signalrConnection?.on(`OnGameState`, (message) => {
      if (!this._playerEntered) return;

      var breakActive = false;
      var stateItems = JSON.parse(message)
      for (const state of stateItems) {
        breakActive = !!state.breakActive;
        this._onGameStateCallback(state)
      }
      // debugging
      if (!this._breakActive && breakActive) {
        console.log('Game Break Activated');
        this._snackBar.open('Game Break Activated', 'Ok', {
          duration: 3000
        });
      }
      this._breakActive = breakActive;
    });

    this._signalrConnection?.on(`OnMetrics`, (message) => {
      console.log(JSON.parse(message));
    });

    this._signalrConnection?.on("OnNotifyReload", () => {
      this._reloadGameDefinition();
    });

    this._signalrConnection?.on(`OnGameEnd`, (message) => {
      this._onStopStateCallback(JSON.parse(message));

      this._gameWindow?.disconnect();
      this._isGameActive = false;
      this._snackBar.open('Game Stopped', 'Ok', {
        duration: 3000
      });
    });

    this._signalrConnection?.on(`OnStep`, (message) => {

    });

  }

  private async _bindEditorEvents() {
    this._signalrConnection?.on(`OnNotifyReload`, (message) => {
      if (!this._isGameActive) {
        this._reloadGameDefinition();
      }
    });
  }
}

