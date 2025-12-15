import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { skipWhileInclusive } from './skip-while-inclusive.operator';

type PredicateType = 'lessThan' | 'greaterThan' | 'even' | 'odd' | 'custom';

@Component({
  selector: 'app-test-rxjs-operator',
  imports: [CommonModule, FormsModule],
  templateUrl: './test-rxjs-operator.html',
  styleUrl: './test-rxjs-operator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestRxjsOperator {
  inputValues = signal<string>('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  predicateType = signal<PredicateType>('lessThan');
  predicateValue = signal<string>('5');
  customPredicate = signal<string>('x < 5');
  
  inputSequence = signal<number[]>([]);
  outputSequence = signal<number[]>([]);
  skippedValues = signal<number[]>([]);
  errorMessage = signal<string>('');

  readonly predicateTypes = [
    { value: 'lessThan', label: 'x < value' },
    { value: 'greaterThan', label: 'x > value' },
    { value: 'even', label: 'x % 2 === 0' },
    { value: 'odd', label: 'x % 2 !== 0' },
    { value: 'custom', label: 'Custom' },
  ] as const;

  testOperator(): void {
    this.errorMessage.set('');
    
    try {
      // Парсим входные значения
      const values = this.inputValues()
        .split(',')
        .map(v => v.trim())
        .filter(v => v !== '')
        .map(v => {
          const num = Number(v);
          if (isNaN(num)) {
            throw new Error(`Invalid number: ${v}`);
          }
          return num;
        });

      if (values.length === 0) {
        throw new Error('Please enter at least one value');
      }

      this.inputSequence.set(values);

      // Создаем predicate функцию
      const predicate = this.createPredicate();

      // Создаем поток из массива
      const source$ = from(values);

      // Вычисляем пропущенные значения для визуализации
      const skipped: number[] = [];
      let started = false;

      values.forEach((value, index) => {
        const shouldSkip = predicate(value, index);
        
        if (!started) {
          if (shouldSkip) {
            skipped.push(value);
          } else {
            // Первое значение, где predicate стал false - тоже пропускаем (inclusive)
            skipped.push(value);
            started = true;
          }
        }
      });

      // Применяем оператор
      const result$ = source$.pipe(skipWhileInclusive(predicate));

      // Собираем результаты из реального потока
      const output: number[] = [];

      result$.subscribe({
        next: (value) => {
          output.push(value);
        },
        error: (error) => {
          this.errorMessage.set(`Error: ${error.message}`);
        },
        complete: () => {
          this.outputSequence.set(output);
          this.skippedValues.set(skipped);
        },
      });
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Unknown error'
      );
      this.inputSequence.set([]);
      this.outputSequence.set([]);
      this.skippedValues.set([]);
    }
  }

  private createPredicate(): (value: number, index: number) => boolean {
    const type = this.predicateType();

    switch (type) {
      case 'lessThan': {
        const threshold = Number(this.predicateValue());
        if (isNaN(threshold)) {
          throw new Error('Invalid threshold value');
        }
        return (x) => x < threshold;
      }
      case 'greaterThan': {
        const threshold = Number(this.predicateValue());
        if (isNaN(threshold)) {
          throw new Error('Invalid threshold value');
        }
        return (x) => x > threshold;
      }
      case 'even':
        return (x) => x % 2 === 0;
      case 'odd':
        return (x) => x % 2 !== 0;
      case 'custom': {
        const customCode = this.customPredicate();
        try {
          // Безопасное выполнение кастомного predicate
          // Используем Function constructor для создания функции
          // В реальном приложении нужно быть осторожным с eval
          return new Function('x', 'index', `return ${customCode}`) as (
            value: number,
            index: number
          ) => boolean;
        } catch (error) {
          throw new Error(
            `Invalid custom predicate: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
      default:
        throw new Error('Unknown predicate type');
    }
  }

  loadExample(example: string): void {
    switch (example) {
      case 'example1':
        this.inputValues.set('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
        this.predicateType.set('lessThan');
        this.predicateValue.set('5');
        break;
      case 'example2':
        this.inputValues.set('2, 4, 6, 8, 10, 12, 14');
        this.predicateType.set('even');
        break;
      case 'example3':
        this.inputValues.set('10, 20, 30, 5, 15, 25, 35');
        this.predicateType.set('greaterThan');
        this.predicateValue.set('25');
        break;
    }
    this.testOperator();
  }
}
