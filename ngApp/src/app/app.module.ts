import { Injector, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { createCustomElement } from '@angular/elements';

import { EditorComponent } from './components/editor/editor.component';
import { MaterialModule } from './material-module';
import { GameWindowComponent } from './components/game-window/game-window.component';
import { DialogNewGameComponent } from './components/dialog-new-game/dialog-new-game.component';
import { PublishPanelComponent } from './components/publish-panel/publish-panel.component';
import { GameComponent } from './components/game/game.component';

@NgModule({
  declarations: [
    AppComponent,
    EditorComponent,
    GameWindowComponent,
    DialogNewGameComponent,
    PublishPanelComponent,
    GameComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    MaterialModule,
    MonacoEditorModule.forRoot(),
    BrowserAnimationsModule,
    HttpClientModule,
  ],
  providers: []
  //,bootstrap: [AppComponent]
  ,exports: [
    EditorComponent
  ],
  entryComponents: [
    EditorComponent,
    GameComponent
  ]
})
export class AppModule {
  constructor(private injector: Injector) {
  }

  ngDoBootstrap() {
    customElements.define('editor-component', createCustomElement(EditorComponent,
      { injector: this.injector }));

      customElements.define('game-component', createCustomElement(GameComponent,
        { injector: this.injector }));

    // customElements.define('app-root', createCustomElement(EditorComponent,
    //   { injector: this.injector }));
  }
}
