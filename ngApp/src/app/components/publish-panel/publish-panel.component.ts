import { Component, Input, OnInit } from '@angular/core';
import { HttpService } from 'src/app/services/http-service.service';
import { environment } from './../../../environments/environment';

@Component({
  selector: 'app-publish-panel',
  templateUrl: './publish-panel.component.html',
  styleUrls: ['./publish-panel.component.scss']
})
export class PublishPanelComponent implements OnInit {

  @Input() gameName!: string;

  isLoaded = false;
  isPublished = false;
  publishedUrl = "";

  constructor(
    private _httpService: HttpService
  ) { }

  async ngOnInit() {

    this.isPublished = await this._httpService.getIsPublished(this.gameName);
    var path = await this._httpService.getPublishedUrl(this.gameName);
    this.publishedUrl = `${environment.apiBase}${path}`

    this.isLoaded = true;
  }

  async publish() {
    await this._httpService.publish(this.gameName);
  }

  unPublish() {

  }

}
