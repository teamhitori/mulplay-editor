import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpRequest } from '@angular/common/http';
import { Observable, of, Subject, throwError } from 'rxjs';
import { last, map, tap } from 'rxjs/operators';
import { ICreateGameInDef } from '../documents/ICreateGameInDef'
import { ICreateGameOutDef } from '../documents/ICreateGameOutDef'
import { IPlayerEventWrapper } from '../documents/IPlayerEventWrapper';
import { IGameConfig } from '../documents/IGameConfig';
import { IDebugDef, RunMode } from '../documents/DebugDef';
import { LogicType } from '../documents/LogicType';
import { IGameLogic } from '../documents/IGameLogic';
import { IGameDefinition } from '../documents/IGameDefinition';
import { environment } from './../../environments/environment';
import { IGameInstance } from '../documents/IGameInstance';
import { IPublishedGameInstance } from '../documents/IPublishedGameInstance';


@Injectable({
  providedIn: 'root'
})
export class HttpService {

  //public functionBase: string = "https://localhost:1049";
  //public functionBase: string = "http://localhost:8000";
  //public functionBase: string = "https://teamhitori-mulplay-dev-webapp.azurewebsites.net";

  constructor(
    private http: HttpClient
  ) {
    console.log(`Is prod: ${environment.production}`);
  }

  public async upsertGameConfig(gameName: string, gameConfig: IGameConfig): Promise<void> {
    console.log(`Called upsertGameConfig`);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = JSON.stringify(gameConfig);

    return this.http
      .post(`${environment.apiBase}/api/editorApi/upsert-config/${gameName}`, body, { headers: headers })
      .pipe(
        map(() => {
        })
      ).toPromise();
  }

  public async upsertGameLogic(gameLogic: IGameLogic): Promise<void> {
    console.log(`Called upsertGameLogic`);
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = JSON.stringify(gameLogic);

    return this.http
      .post(`${environment.apiBase}/api/editorApi/upsert-logic`, body, { headers: headers })
      .pipe(
        map(() => {
        })
      ).toPromise();
  }

  public async getGameNames(): Promise<string[]> {
    console.log(`Called getGameNames`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/get-all`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return <string[]>res;
      })
    ).toPromise();
  }

  public async getActiveGameList(gameName: string): Promise<IGameInstance[]> {
    console.log(`Called getActiveGameList`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/get-active/${gameName}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return res;
      })
    ).toPromise();
  }

  public async createGame(gameName: string): Promise<IGameInstance> {
    console.log(`Called getGameConfig`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/create-game/${gameName}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return res;
      })
    ).toPromise();
  }

  public async getPublishedGameInstance(gameName: string): Promise<IPublishedGameInstance> {
    console.log(`Called getGameConfig`);

    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = JSON.stringify("");

    return this.http
    .post(`${environment.apiBase}${gameName}`, body, { headers: headers })
    .pipe(
      map((res: any) => {
        console.log(res);
        return <IPublishedGameInstance>res;
      })
    ).toPromise();
  }

  public async getGameDefinition(gameName: string): Promise<IGameDefinition> {
    console.log(`Called getGameConfig`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/get-definition/${gameName}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return <IGameDefinition>res;
      })
    ).toPromise();
  }

  public async getGameLogic(gameName: string, logicType: LogicType): Promise<IGameLogic> {
    console.log(`Called getGameLogic`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/get-logic/${gameName}/${logicType}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return <IGameLogic>res;
      })
    ).toPromise();
  }

  public async getGameConfig(gameName: string): Promise<IGameConfig> {
    console.log(`Called getGameConfig`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/get-config/${gameName}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return <IGameConfig>res;
      })
    ).toPromise();
  }

  public async publish(gameName: string): Promise<boolean> {
    console.log(`Called publish`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/publish/${gameName}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return <boolean>res;
      })
    ).toPromise();
  }

  public async getIsPublished(gameName: string): Promise<boolean> {
    console.log(`Called is-published`);

    return this.http
    .get(`${environment.apiBase}/api/editorApi/is-published/${gameName}`)
    .pipe(
      map((res: any) => {
        console.log(res);
        return <boolean>res;
      })
    ).toPromise();
  }

  public async getPublishedUrl(gameName: string): Promise<string> {
    console.log(`Called published-url`);

    return this.http.get<string>(`${environment.apiBase}/api/editorApi/published-url/${gameName}`).toPromise();
  }

}
