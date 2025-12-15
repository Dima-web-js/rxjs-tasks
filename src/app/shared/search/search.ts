import { Component, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
  catchError,
  of,
  Subscription,
} from 'rxjs';
import { UserDataService } from '../services/user-data.service';
import { User } from '../interfaces/user.interface';
import { UserCard } from '../ui/user-card/user-card';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule, UserCard],
  templateUrl: '../components/search/search.html',
  styleUrl: '../components/search/search.scss',
})
export class Search implements OnDestroy {
  private readonly usersService = inject(UserDataService);
  private readonly searchSubject = new Subject<string>();
  private readonly subscription = new Subscription();

  searchInput = signal<string>('');
  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string>('');

  constructor() {
    // Настройка поиска с использованием RxJS операторов
    const searchSubscription = this.searchSubject
      .pipe(
        // Задержка перед запросами 500мс
        debounceTime(500),
        // Игнорируем повторяющиеся значения
        distinctUntilChanged(),
        // Фильтруем: запрос только если длина > 3 символов
        filter((searchTerm) => {
          if (searchTerm.trim().length === 0) {
            // Если поле пустое, очищаем результаты
            this.users.set([]);
            this.isLoading.set(false);
            this.error.set('');
            return false;
          }
          return searchTerm.trim().length >= 3;
        }),
        // Переключаемся на новый запрос, отменяя предыдущий
        switchMap((searchTerm) => {
          // Устанавливаем состояние загрузки
          this.isLoading.set(true);
          this.error.set('');
          this.users.set([]);

          // Выполняем запрос
          return this.usersService.getUsersBySearch(searchTerm).pipe(
            // Обработка ошибок
            catchError((err) => {
              this.error.set(
                err?.error?.message || 'Ошибка при загрузке пользователей. Попробуйте позже.'
              );
              this.isLoading.set(false);
              console.error('Ошибка поиска пользователей:', err);
              // Возвращаем пустой массив при ошибке
              return of([]);
            })
          );
        })
      )
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.isLoading.set(false);
          this.error.set('');
        },
        error: (err) => {
          // Дополнительная обработка ошибок на уровне подписки
          this.error.set('Произошла непредвиденная ошибка');
          this.isLoading.set(false);
          this.users.set([]);
          console.error('Критическая ошибка:', err);
        },
      });

    this.subscription.add(searchSubscription);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.searchSubject.complete();
  }

  onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchSubject.next(value.trim());
  }
}
