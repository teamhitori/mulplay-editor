import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { IGameConfig } from 'src/app/documents/IGameConfig';
//import { Scene } from 'babylonjs/scene';
import { IFrontendApi } from 'src/app/interfaces/IFrontendApi';
import { IGameWindow } from 'src/app/interfaces/IGameWindow';
//import * as BABYLON from 'babylonjs';
const BABYLON = require('babylonjs');
const GUI = require('babylonjs-gui');

@Component({
  selector: 'app-game-window',
  templateUrl: './game-window.component.html',
  styleUrls: ['./game-window.component.scss']
})
export class GameWindowComponent  {

  public isActive = false;
  @ViewChild('canvas')
  public canvas!: ElementRef;

  @ViewChild('canvasHolder')
  public canvasHolder!: ElementRef;
  private canvasHolderW: number = 0;
  private canvasHolderH: number = 0;

  private _engine?: any;

  @Output() gameWindow: EventEmitter<IGameWindow> = new EventEmitter<IGameWindow>();
  private _logic: string = "";

  @Input() gameConfig!: IGameConfig;

  constructor() {

  }

  setFrontEndLogic(logic: string) {

    this._logic = logic;

  }

  ngAfterViewInit(): void {

    var canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;

    this._engine = new BABYLON.Engine(canvas, true);
    //var scene: any;s
    var _this = {}

    this.gameWindow.emit(<IGameWindow>{
      connect: async (frontEndApi: IFrontendApi) => {
        this.isActive = true;
        this._resizeCanvas();

        canvas.focus();

        var fronEndLogic = new Function("engine", "canvas", "frontendApi", "gameConfig", `${this._logic}`);

        fronEndLogic.call(_this, this._engine, canvas, frontEndApi, this.gameConfig);


      },
      disconnect: () => {
        this.isActive = false;
        for (const key in _this) {
          if (Object.prototype.hasOwnProperty.call(_this, key)) {
            delete (_this as any)[key];
          }
        }
        this._engine.stopRenderLoop();
        // scene?.dispose();
        // scene = new BABYLON.Scene(this._engine);
        // new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 0, -15), scene);

      }
    });

    this._resizeCanvas();
  }

  focusCanvas(){
    var canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    canvas.focus();
  }

  onResize() {

    this._resizeCanvas();
  }

  _resizeCanvas(){

    if(!this.gameConfig){
      this._resizeCanvasFillscreen();
    } else if(this.gameConfig?.fillScreen){
      this._resizeCanvasFillscreen();
    } else {
      this._resizeCanvasRatio();
    }
  }

  _resizeCanvasFillscreen(){
    this.canvas.nativeElement.setAttribute('style', `width: 100%; height: 100%;`);
  }

  _resizeCanvasRatio() {

    var offsetW = 15;
    var offsetH = 30;
    this.canvasHolderH = this.canvasHolder.nativeElement.offsetHeight;
    this.canvasHolderW = this.canvasHolder.nativeElement.offsetWidth;

    var maxHeight = this.canvasHolderW * (1 / this.gameConfig.screenRatio);
    var maxWidth = this.canvasHolderH * this.gameConfig.screenRatio;

    if (maxHeight > this.canvasHolderH - offsetH) {
      var width = (this.canvasHolderH - offsetH) * this.gameConfig.screenRatio;
      var height = this.canvasHolderH - offsetH;
      this.canvas.nativeElement.setAttribute('style', `width: ${width}px; height: ${height}px;`);

    } else if (maxWidth > this.canvasHolderW - offsetW) {
      var width = (this.canvasHolderW - offsetW);
      var height = (this.canvasHolderW - offsetW) / this.gameConfig.screenRatio;
      this.canvas.nativeElement.setAttribute('style', `width: ${width}px; height: ${height}px;`);
    }

    this._engine.resize();

  }

  keydown(event: KeyboardEvent) {
    event.stopPropagation();
    event.preventDefault();
  }

}
