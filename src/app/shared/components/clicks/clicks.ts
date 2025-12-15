import { Component, signal, inject, ElementRef, OnDestroy, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fromEvent, buffer, debounceTime, filter, map, Subscription } from 'rxjs';

@Component({
  selector: 'app-clicks',
  imports: [CommonModule],
  templateUrl: './clicks.html',
  styleUrl: './clicks.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Clicks implements OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly subscription = new Subscription();

  actionLog = signal<string[]>([]);
  clickCount = signal<number>(0);

  constructor() {
    afterNextRender(() => {
      this.setupClickDetection();
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private setupClickDetection(): void {
    const button = this.elementRef.nativeElement.querySelector('.click-button');
    if (!button) {
      return;
    }

    // Создаем поток кликов
    const clicks$ = fromEvent<MouseEvent>(button, 'click');

    // Группируем клики в буфер с задержкой 300мс
    // Если в буфере 1 клик - это одиночный клик
    // Если в буфере 2+ клика - это двойной клик
    const clickBuffer$ = clicks$.pipe(
      buffer(clicks$.pipe(debounceTime(300))),
      map((clicks) => clicks.length),
      filter((count) => count > 0 && count <= 2) // Игнорируем больше 2 кликов
    );

    const clickSubscription = clickBuffer$.subscribe((count) => {
      if (count === 1) {
        this.singleClickAction();
      } else if (count === 2) {
        this.doubleClickAction();
      }
    });

    this.subscription.add(clickSubscription);
  }

  private singleClickAction(): void {
    this.actionLog.update((log) => [...log, `[${new Date().toLocaleTimeString()}] Одиночный клик`]);
    this.clickCount.update((count) => count + 1);
    console.log('Single click action executed');
  }

  private doubleClickAction(): void {
    this.actionLog.update((log) => [...log, `[${new Date().toLocaleTimeString()}] Двойной клик`]);
    this.clickCount.update((count) => count + 2);
    console.log('Double click action executed');
  }

  clearLog(): void {
    this.actionLog.set([]);
    this.clickCount.set(0);
  }
}
