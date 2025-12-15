import { Component, signal } from '@angular/core';
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
export class MainPage {
  selectedTask = signal<string | null>('task1');

  selectTask(task: string): void {
    this.selectedTask.set(task);
  }
}
