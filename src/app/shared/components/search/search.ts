// import { Component, signal, inject, OnDestroy } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import {
//   Subject,
//   debounceTime,
//   distinctUntilChanged,
//   filter,
//   switchMap,
//   catchError,
//   of,
//   Subscription,
// } from 'rxjs';
// import { GetUsersService } from './get-users.service';
// import { User } from './user.interface';
// import { UserCard } from '../../ui/user-card/user-card';

// @Component({
//   selector: 'app-search',
//   imports: [CommonModule, FormsModule, UserCard],
//   templateUrl: './search.html',
//   styleUrl: './search.scss',
// })
// export class Search implements OnDestroy {
//   private readonly usersService = inject(GetUsersService);
//   private readonly searchSubject = new Subject<string>();
//   private readonly subscription = new Subscription();

//   searchInput = signal<string>('');
//   users = signal<User[]>([]);
//   isLoading = signal<boolean>(false);
//   error = signal<string>('');

//   constructor() {
//     // Настройка поиска с использованием RxJS операторов
//     const searchSubscription = this.searchSubject
//       .pipe(
//         // Задержка перед запросами 500мс
//         debounceTime(500),
//         // Игнорируем повторяющиеся значения
//         distinctUntilChanged(),
//         // Фильтруем: запрос только если длина > 3 символов
//         filter((searchTerm) => {
//           if (searchTerm.trim().length === 0) {
//             // Если поле пустое, очищаем результаты
//             this.users.set([]);
//             this.isLoading.set(false);
//             this.error.set('');
//             return false;
//           }
//           return searchTerm.trim().length >= 3;
//         }),
//         // Переключаемся на новый запрос, отменяя предыдущий
//         switchMap((searchTerm) => {
//           // Устанавливаем состояние загрузки
//           this.isLoading.set(true);
//           this.error.set('');
//           this.users.set([]);

//           // Выполняем запрос
//           return this.usersService.getUsers(searchTerm).pipe(
//             // Обработка ошибок
//             catchError((err) => {
//               this.error.set(
//                 err?.error?.message || 'Ошибка при загрузке пользователей. Попробуйте позже.'
//               );
//               this.isLoading.set(false);
//               console.error('Ошибка поиска пользователей:', err);
//               // Возвращаем пустой массив при ошибке
//               return of([]);
//             })
//           );
//         })
//       )
//       .subscribe({
//         next: (users) => {
//           this.users.set(users);
//           this.isLoading.set(false);
//           this.error.set('');
//         },
//         error: (err) => {
//           // Дополнительная обработка ошибок на уровне подписки
//           this.error.set('Произошла непредвиденная ошибка');
//           this.isLoading.set(false);
//           this.users.set([]);
//           console.error('Критическая ошибка:', err);
//         },
//       });

//     this.subscription.add(searchSubscription);
//   }

//   ngOnDestroy(): void {
//     this.subscription.unsubscribe();
//     this.searchSubject.complete();
//   }

//   onSearchChange(value: string): void {
//     this.searchInput.set(value);
//     this.searchSubject.next(value.trim());
//   }
// }


import { Component, signal, inject, OnDestroy, OnInit, ChangeDetectionStrategy } from '@angular/core';
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
  tap,
  finalize,
  map,
} from 'rxjs';
import { User } from '../../interfaces/user.interface';
import { UserCard } from '../../ui/user-card/user-card';
import { UserDataService } from '../../services/user-data.service';

@Component({
  selector: 'app-search',
  imports: [CommonModule, FormsModule, UserCard],
  templateUrl: './search.html',
  styleUrl: './search.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Search implements OnInit, OnDestroy {
  private readonly userDataService = inject(UserDataService);
  // Observable - это только для подписки и чтения, а Subject - для чтения и записи 
  // (Можно эмитить значения программно через .next(), .error(), .complete())
  private readonly searchSubject = new Subject<string>(); 
  private readonly subscription = new Subscription();

  searchInput = signal<string>('');
  users = signal<User[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string>('');

  ngOnInit(): void {
    const sub = this.searchSubject.pipe(
      map(v => v.trim()),
      debounceTime(300),

      
      distinctUntilChanged(), // игнорируем повторяющиеся значения

      // tap - выполняет побочное действие (side effect) над значением, но не изменяет его
      // Значение проходит дальше по цепочке без изменений
      // Используется для выполнения действий, которые не должны влиять на поток данных
      tap((term) => {
        // Если поисковый запрос пустой, очищаем результаты и сбрасываем состояние
        if (term.length === 0) {
          this.users.set([]);
          this.error.set('');
          this.isLoading.set(false);
        }
      }),

      // filter - пропускает только те значения, которые соответствуют условию
      filter((term) => term.length >= 3),

      // switchMap - переключается на новый Observable, отменяя предыдущий запрос
      // Если пользователь быстро меняет поисковый запрос, предыдущий HTTP-запрос отменяется
      // Это гарантирует, что результат всегда соответствует последнему поисковому запросу
      // В отличие от mergeMap (который выполняет все запросы параллельно) или concatMap (последовательно)
      switchMap((term) => {
        this.isLoading.set(true);
        this.error.set('');
        this.users.set([]);

        // Выполняем HTTP-запрос для поиска пользователей
        return this.userDataService.getUsersBySearch(term).pipe(
          // catchError - перехватывает ошибки в потоке и позволяет обработать их
          // Если запрос завершился с ошибкой, возвращаем пустой массив вместо прерывания потока
          // Поток продолжает работать даже при ошибках
          catchError((err) => {
            this.error.set(
              err?.error?.message || 'Ошибка при загрузке пользователей. Попробуйте позже.'
            );
            // Возвращаем пустой массив, чтобы поток не прервался
            return of<User[]>([]);
          }),
          // finalize - выполняется всегда при завершении Observable (успех или ошибка)
          // Используется для "уборки" - сброса состояния загрузки независимо от результата
          // Аналог блока finally в try-catch
          finalize(() => {
            this.isLoading.set(false);
          })
        );
      })
    ).subscribe((users) => {
      // subscribe - подписывается на поток и получает финальные значения
      // Когда запрос завершается успешно, обновляем список пользователей
      this.users.set(users);
    });

    this.subscription.add(sub);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.searchSubject.complete();
  }

  onSearchChange(value: string): void {
    this.searchInput.set(value);
    this.searchSubject.next(value);
  }
}
