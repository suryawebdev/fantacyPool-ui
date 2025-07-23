import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { environment } from '../environments/environments';
import { Subject } from 'rxjs';
// import SockJS from 'sockjs-client';
// import * as SockJS from 'sockjs-client/dist/sockjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private matchUpdatesSubject = new Subject<any>();
  private selectionFeedSubject = new Subject<any>();

  matchUpdates$ = this.matchUpdatesSubject.asObservable();
  selectionFeed$ = this.selectionFeedSubject.asObservable();

  constructor() {
    if (environment.enableWebSockets) {
      this.connect();
    }
  }

  connect() {
    // Dynamically import SockJS to avoid browser compatibility issues
    import('sockjs-client').then((SockJS) => {
      this.client = new Client({
        brokerURL: undefined, // Use SockJS
        webSocketFactory: () => new SockJS.default(`${environment.apiUrl}/ws`),
        reconnectDelay: 5000,
        debug: (str) => { /* console.log(str); */ }
      });

      this.client.onConnect = () => {
        this.subscription = this.client!.subscribe('/topic/matches', (message: IMessage) => {
          this.matchUpdatesSubject.next(JSON.parse(message.body));
        });
        this.subscription = this.client!.subscribe('/topic/selections', (message: IMessage) => {
          this.selectionFeedSubject.next(JSON.parse(message.body));
        });
      };

      this.client.activate();
    }).catch(error => {
      console.error('Failed to load SockJS:', error);
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.client?.deactivate();
  }
}
