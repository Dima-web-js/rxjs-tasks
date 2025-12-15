import { Component, OnInit, signal, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Search } from '../shared/components/search/search';
import { Clicks } from '../shared/components/clicks/clicks';
import { ManyRequests } from '../shared/components/many-requests/many-requests';
import { TestRxjsOperator } from '../shared/components/test-rxjs-operator/test-rxjs-operator';


@Component({
  selector: 'app-main-page',
  imports: [
    Search, 
    Clicks, 
    ManyRequests,
    TestRxjsOperator
  ],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit {
  // Текущая выбранная задача. По умолчанию — task1
  selectedTask = signal<string>('task1');

  // Router и ActivatedRoute получаем через inject согласно best practices
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    // При инициализации читаем query-параметр task из URL
    const taskFromUrl = this.route.snapshot.queryParamMap.get('task');

    // Разрешённые значения задач
    const allowedTasks = new Set(['task1', 'task2', 'task3', 'task4']);

    // Если в URL передан корректный task — используем его
    if (taskFromUrl && allowedTasks.has(taskFromUrl)) {
      this.selectedTask.set(taskFromUrl);
    } else {
      // Если параметра нет или он невалиден — устанавливаем task1 по умолчанию
      // и обновляем URL, чтобы при обновлении страницы сохранялась задача
      this.selectedTask.set('task1');
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { task: 'task1' },
        queryParamsHandling: 'merge',
      });
    }
  }

  selectTask(task: string): void {
    this.selectedTask.set(task);

    // Обновляем URL, записывая выбранную задачу в query-параметр task
    // Пример: ?task=task2
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { task },
      queryParamsHandling: 'merge',
    });
  }
}
