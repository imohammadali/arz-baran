import { Injectable, OnDestroy } from "@angular/core";
import { AppState } from "@core/core.state";
import { environment } from "@env/environment";
import { select, Store } from "@ngrx/store";
import { INotification } from "@shared/interfaces/Responses/INotification";
import { Observable, Subject, Subscription } from "rxjs";

@Injectable({ providedIn: "root" })
export class PushNotificationService implements OnDestroy {
  private socket!: WebSocket;
  private branch: any = null;
  private token: string | null = null;
  private manualClose = false;
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private branchSub!: Subscription;

  private readonly INITIAL_DELAY = 1000;
  private readonly MAX_DELAY = 30000;
  private readonly MULTIPLIER = 2;
  private readonly MAX_RETRIES = 10;

  messages$ = new Subject<INotification>();

  constructor(private store: Store<AppState>) {}

  connect(token: string): void {
    this.token = token;
    this.manualClose = false;
    this.openSocket();
  }

  disconnect(): void {
    this.manualClose = true;
    this.clearRetryTimeout();
    this.socket?.close();
  }

  send(data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  async requestNotificationPermission(): Promise<void> {
    if ("Notification" in window) {
      await Notification.requestPermission();
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.branchSub.unsubscribe();
    this.messages$.complete();
  }

  private openSocket(): void {
    const url = this.buildUrl();
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.retryCount = 0;
      this.clearRetryTimeout();
      this.socket.send(JSON.stringify({ type: "auth", token: this.token }));
    };

    this.socket.onmessage = (event) => {
      const data: INotification = JSON.parse(event.data);
      this.messages$.next(data);
      this.showPushNotification(data);
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = () => {
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    };
  }

  private showPushNotification(notification: INotification): void {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }

    // When the page is visible the in-app toast (app.component.ts) is enough;
    // only fire a native notification when the app is in the background.
    if (document.visibilityState === "visible") {
      return;
    }

    const iconPath = "/icons/icon-72x72.png";
    const options: NotificationOptions = {
      body: notification.message,
      icon: iconPath,
      badge: iconPath,
      data: notification,
    };

    // Prefer the Service Worker path — it survives page freezes and
    // lets the SW handle the notificationclick event for navigation.
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.showNotification(notification.title, options);
      });
    } else {
      // Fallback: plain Notification API with an onclick handler.
      const native = new Notification(notification.title, options);
      native.onclick = () => {
        window.focus();
        if (notification.trigger_link) {
          window.location.href = notification.trigger_link;
        }
        native.close();
      };
    }
  }

  private scheduleReconnect(): void {
    if (this.retryCount >= this.MAX_RETRIES) {
      console.warn("WebSocket max retries reached. Giving up.");
      return;
    }

    const base = Math.min(
      this.INITIAL_DELAY * this.MULTIPLIER ** this.retryCount,
      this.MAX_DELAY,
    );
    const delay = base + Math.random() * 500;

    this.retryTimeout = setTimeout(() => {
      this.retryCount++;
      this.openSocket();
    }, delay);
  }

  private clearRetryTimeout(): void {
    if (this.retryTimeout !== null) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private buildUrl(): string {
    const domain = window.location.hostname;
    const host = environment.production
      ? domain.replace(/^https?:\/\//, "")
      : "localhost:4200";
    return `${environment.baseWebsocketUrl}${host}/club/admin/v1/notification/live-check/read`;
  }
}
