import { Component, signal, inject, ElementRef, OnDestroy, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fromEvent, buffer, debounceTime, filter, map, Subscription } from 'rxjs';

/**
 * Компонент для различения одиночных и двойных кликов.
 * Использует RxJS оператор buffer для группировки кликов, произошедших в течение 300мс.
 */
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

  // Журнал всех действий (одиночные и двойные клики)
  actionLog = signal<string[]>([]);
  
  // Общий счётчик кликов (одиночный = +1, двойной = +2)
  clickCount = signal<number>(0);

  constructor() {
    // Используем afterNextRender, чтобы убедиться, что DOM уже отрендерен
    // и кнопка доступна для поиска через querySelector
    afterNextRender(() => {
      this.setupClickDetection();
    });
  }

  ngOnDestroy(): void {
    // Отписываемся от всех подписок при уничтожении компонента
    this.subscription.unsubscribe();
  }

  /**
   * Настраивает детектирование кликов с использованием RxJS buffer.
   * 
   * Как работает buffer:
   * - buffer собирает значения из исходного Observable (clicks$) в массив
   * - Массив эмитится, когда срабатывает "notifier" Observable (второй параметр)
   * - В данном случае notifier = clicks$.pipe(debounceTime(300))
   * 
   * Логика работы:
   * 1. Пользователь кликает → клик попадает в буфер
   * 2. debounceTime(300) ждёт 300мс после последнего клика
   * 3. Когда проходит 300мс без новых кликов → buffer эмитит накопленный массив кликов
   * 4. Если в массиве 1 клик → одиночный клик
   * 5. Если в массиве 2 клика → двойной клик
   * 6. Если больше 2 кликов → игнорируем (фильтруем)
   */
  private setupClickDetection(): void {
    // Находим кнопку в DOM
    const button = this.elementRef.nativeElement.querySelector('.click-button');
    if (!button) {
      return;
    }

    // Создаём Observable из событий клика на кнопке
    // fromEvent преобразует DOM-событие в RxJS Observable
    const clicks$ = fromEvent<MouseEvent>(button, 'click');

    // Группируем клики в буферы с помощью оператора buffer
    const clickBuffer$ = clicks$.pipe(
      /**
       * buffer(notifier) - собирает значения из clicks$ в массив
       * и эмитит этот массив, когда срабатывает notifier Observable.
       * 
       * notifier = clicks$.pipe(debounceTime(300)):
       * - debounceTime(300) эмитит значение только через 300мс после последнего клика
       * - Это означает: "эмить массив кликов через 300мс после последнего клика"
       * 
       * Результат: массив всех кликов, произошедших в течение 300мс
       */
      buffer(clicks$.pipe(debounceTime(300))),
      
      /**
       * map - преобразует массив кликов в количество кликов
       * [клик1, клик2] → 2
       * [клик1] → 1
       */
      map((clicks) => clicks.length),
      
      /**
       * filter - пропускает только одиночные (1) и двойные (2) клики
       * Тройные и более клики игнорируются
       */
      filter((count) => count > 0 && count <= 2)
    );

    // Подписываемся на сгруппированные клики
    const clickSubscription = clickBuffer$.subscribe((count) => {
      if (count === 1) {
        // Одиночный клик: прошло 300мс после клика, и больше кликов не было
        this.singleClickAction();
      } else if (count === 2) {
        // Двойной клик: два клика произошли в течение 300мс
        this.doubleClickAction();
      }
    });

    // Сохраняем подписку для отписки при уничтожении компонента
    this.subscription.add(clickSubscription);
  }

  /**
   * Обработчик одиночного клика.
   * Добавляет запись в журнал и увеличивает счётчик на 1.
   */
  private singleClickAction(): void {
    this.actionLog.update(
      (log) => 
      [...log, `[${new Date().toLocaleTimeString()}] Одиночный клик`]
  );
    this.clickCount.update((count) => count + 1);
    console.log('Single click action executed');
  }

  /**
   * Обработчик двойного клика.
   * Добавляет запись в журнал и увеличивает счётчик на 2.
   */
  private doubleClickAction(): void {
    this.actionLog.update(
      (log) => [...log, `[${new Date().toLocaleTimeString()}] Двойной клик`]
    );
    this.clickCount.update((count) => count + 2);
    console.log('Double click action executed');
  }

  /**
   * Очищает журнал действий и сбрасывает счётчик кликов.
   */
  clearLog(): void {
    this.actionLog.set([]);
    this.clickCount.set(0);
  }
}
