import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { of, forkJoin, switchMap, map, catchError, tap, finalize } from 'rxjs';
import { UserDataService } from '../../services/user-data.service';
import { UserData } from '../../interfaces/user-data.interface';
import { User } from '../../interfaces/user.interface';
import { Cart } from '../../interfaces/cart.interface';
import { Todo } from '../../interfaces/todo.interface';

@Component({
  selector: 'app-many-requests',
  imports: [CommonModule, JsonPipe],
  templateUrl: './many-requests.html',
  styleUrl: './many-requests.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManyRequests {
  private readonly userDataService = inject(UserDataService);

  isLoading = signal<boolean>(false);
  error = signal<string>('');
  result = signal<UserData[]>([]);
  requestCount = signal<number>(0);

  loadData(): void {
    this.isLoading.set(true);
    this.error.set('');
    this.requestCount.set(0);

    // Получаем 5 пользователей
    this.userDataService
    // У первых 5 нет корзины, но если, например 20 ввести, то увидим
      .getUsersByLimit(20)
      .pipe(
        /**
         * tap - это оператор, который позволяет выполнять действия над данными,
         * не изменяя их. Он используется для отслеживания промежуточных значений.
         * В данном случае, мы используем его для увеличения счётчика запросов.
         */
        tap(() => this.requestCount.update((count) => count + 1)),
        // Для каждого пользователя получаем cart и todos параллельно
        switchMap((users: User[]) => {
          // Создаем массив запросов для каждого пользователя
          const userDataRequests = users.map((user: User) =>
            forkJoin({ 
              /**
             * forkJoin - это оператор, который позволяет выполнять несколько запросов параллельно
             * и получить результаты в виде массива.
             * В данном случае, мы используем его для получения cart и todos для каждого пользователя.
             */
              carts: this.userDataService.getUserCarts(user.id).pipe(
                tap(() => this.requestCount.update((count) => count + 1)),
                catchError(() => of<Cart[]>([]))
              ),
              todos: this.userDataService.getUserTodos(user.id).pipe(
                tap(() => this.requestCount.update((count) => count + 1)),
                catchError(() => of<Todo[]>([]))
              ),
            }).pipe(
              map(({ carts, todos }) => ({
                userId: user.id,
                cart: carts.length > 0 ? carts[0] : null,
                todo: todos.length > 0 ? todos : null,
              }))
            )
          );

          // Выполняем все запросы параллельно
          return forkJoin(userDataRequests);
        }),
        catchError((err: unknown) => {
          this.error.set(
            (err as { error?: { message?: string } })?.error?.message || 'Ошибка при загрузке данных. Попробуйте позже.'
          );
          console.error('Ошибка загрузки данных:', err);
          return of<UserData[]>([]);
        }),
        finalize(() => {
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (userDataArray: UserData[]) => {
          this.result.set(userDataArray);
          console.log('Результат:', userDataArray);
        },
        error: (err: unknown) => {
          this.error.set('Произошла непредвиденная ошибка');
          console.error('Критическая ошибка:', err);
        },
      });
  }
}
