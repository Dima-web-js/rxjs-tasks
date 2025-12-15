import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { from } from 'rxjs';
import { skipWhileInclusive } from './skip-while-inclusive.operator';

// Тип, описывающий доступные варианты предиката,
// которые пользователь может выбрать в интерфейсе
type PredicateType = 'lessThan' | 'greaterThan' | 'even' | 'odd' | 'custom';

@Component({
  selector: 'app-test-rxjs-operator',
  imports: [CommonModule, FormsModule],
  templateUrl: './test-rxjs-operator.html',
  styleUrl: './test-rxjs-operator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestRxjsOperator {
  // Строковое представление входных значений (пользовательский ввод)
  // По умолчанию — простая последовательность чисел
  inputValues = signal<string>('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');

  // Выбранный тип предиката (какое условие будет использоваться)
  predicateType = signal<PredicateType>('lessThan');

  // Числовое значение порога для предикатов lessThan / greaterThan
  predicateValue = signal<string>('5');

  // Строка с пользовательским выражением для кастомного предиката
  // Например: "x < 5" или "x % 3 === 0 && index < 3"
  customPredicate = signal<string>('x < 5');

  // Массив входных чисел после успешного парсинга
  inputSequence = signal<number[]>([]);

  // Массив значений, которые реально прошли через оператор
  outputSequence = signal<number[]>([]);

  // Массив значений, которые были пропущены оператором (для визуализации)
  skippedValues = signal<number[]>([]);

  // Сообщение об ошибке (валидация, парсинг, выполнение предиката и т.д.)
  errorMessage = signal<string>('');

  // Описание доступных типов предикатов для отображения в UI
  readonly predicateTypes = [
    { value: 'lessThan', label: 'x < value' },
    { value: 'greaterThan', label: 'x > value' },
    { value: 'even', label: 'x % 2 === 0' },
    { value: 'odd', label: 'x % 2 !== 0' },
    { value: 'custom', label: 'Custom' },
  ] as const;

  /**
   * Основной метод тестирования оператора.
   * 1. Валидирует и парсит входные данные
   * 2. Создаёт предикат в зависимости от выбранного типа
   * 3. Строит RxJS-поток и применяет skipWhileInclusive
   * 4. Собирает как входную, так и выходную последовательности для отображения
   */
  testOperator(): void {
    // Сбрасываем предыдущее сообщение об ошибке
    this.errorMessage.set('');

    try {
      // 1. Парсим входные значения из строки вида "1, 2, 3"
      const values = this.inputValues()
        .split(',') // разбиваем по запятой
        .map((v) => v.trim()) // убираем пробелы вокруг
        .filter((v) => v !== '') // убираем пустые элементы
        .map((v) => {
          const num = Number(v);

          // Валидация: каждое значение должно быть числом
          if (Number.isNaN(num)) {
            throw new Error(`Неверное значение: ${v}`);
          }

          // Дополнительная валидация: допустим отрицательные значения
          // (они корректно обрабатываются оператором), поэтому ограничений
          // по знаку именно для входной последовательности нет
          return num;
        });

      // Если после парсинга нет ни одного числа — считаем это ошибкой ввода
      if (values.length === 0) {
        throw new Error('Пожалуйста, введите хотя бы одно числовое значение');
      }

      // Сохраняем разобранную последовательность для отображения
      this.inputSequence.set(values);

      // 2. Создаём функцию-предикат в зависимости от выбранного типа
      const predicate = this.createPredicate();

      // 3. Строим RxJS-поток из массива значений
      const source$ = from(values);

      // 4. Отдельно считаем, какие значения будут пропущены,
      // чтобы показать это пользователю (визуальное объяснение работы оператора)
      const skipped: number[] = [];
      let started = false; // флаг: начали ли мы уже "пропускать" inclusive-часть

      values.forEach((value, index) => {
        const shouldSkip = predicate(value, index);

        if (!started) {
          if (shouldSkip) {
            // Пока predicate === true — значение пропускается
            skipped.push(value);
          } else {
            // Первое значение, где predicate стал false — тоже пропускаем
            // (inclusive-часть поведения оператора)
            skipped.push(value);
            started = true;
          }
        }
      });

      // 5. Применяем оператор skipWhileInclusive к реальному потоку
      const result$ = source$.pipe(skipWhileInclusive(predicate));

      // 6. Собираем значения, которые реально прошли через поток
      const output: number[] = [];

      result$.subscribe({
        next: (value) => {
          output.push(value);
        },
        error: (error) => {
          // Ошибки при работе оператора или предиката
          this.errorMessage.set(`Error: ${error.message}`);
        },
        complete: () => {
          // Когда поток завершился — сохраняем результаты для отображения
          this.outputSequence.set(output);
          this.skippedValues.set(skipped);
        },
      });
    } catch (error) {
      // Любая ошибка парсинга / создания предиката / другая синхронная ошибка
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Unknown error'
      );
      // Сбрасываем последовательности, чтобы не показывать устаревшие данные
      this.inputSequence.set([]);
      this.outputSequence.set([]);
      this.skippedValues.set([]);
    }
  }

  /**
   * Создаёт предикат в зависимости от выбранного типа.
   * Здесь также проводится валидация числового порога (включая запрет отрицательных значений).
   */
  private createPredicate(): (value: number, index: number) => boolean {
    const type = this.predicateType();

    switch (type) {
      case 'lessThan': {
        const threshold = Number(this.predicateValue());

        // Валидация порога: должно быть числом
        if (Number.isNaN(threshold)) {
          throw new Error('Некорректное значение порога для предиката "x < value"');
        }

        // Дополнительная валидация: отрицательный порог не допускаем
        if (threshold < 0) {
          throw new Error('Порог для предиката "x < value" не может быть отрицательным');
        }

        return (x) => x < threshold;
      }

      case 'greaterThan': {
        const threshold = Number(this.predicateValue());

        // Валидация порога: должно быть числом
        if (Number.isNaN(threshold)) {
          throw new Error('Некорректное значение порога для предиката "x > value"');
        }

        // Дополнительная валидация: отрицательный порог не допускаем
        if (threshold < 0) {
          throw new Error('Порог для предиката "x > value" не может быть отрицательным');
        }

        return (x) => x > threshold;
      }

      case 'even':
        // Чётные числа
        return (x) => x % 2 === 0;

      case 'odd':
        // Нечётные числа
        return (x) => x % 2 !== 0;

      case 'custom': {
        const customCode = this.customPredicate();

        try {
          // Создаём функцию предиката из пользовательского выражения.
          // new Function используется только в демонстрационных целях.
          // В реальном приложении такой подход небезопасен и требует sandbox/ограничений.
          return new Function('x', 'index', `return ${customCode}`) as (
            value: number,
            index: number
          ) => boolean;
        } catch (error) {
          throw new Error(
            `Invalid custom predicate: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
      }

      default:
        // Теоретически сюда никогда не попадём, но добавляем на случай расширения типов
        throw new Error('Unknown predicate type');
    }
  }

  /**
   * Загружает один из преднастроенных примеров
   * и сразу запускает тестирование оператора.
   */
  loadExample(example: string): void {
    switch (example) {
      case 'example1':
        // Пример: простая последовательность 1..10 и условие x < 5
        this.inputValues.set('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
        this.predicateType.set('lessThan');
        this.predicateValue.set('5');
        break;

      case 'example2':
        // Пример: только чётные числа, предикат "even"
        this.inputValues.set('2, 4, 6, 8, 10, 12, 14');
        this.predicateType.set('even');
        break;

      case 'example3':
        // Пример: последовательность, где часть значений больше 25
        this.inputValues.set('10, 20, 30, 5, 15, 25, 35');
        this.predicateType.set('greaterThan');
        this.predicateValue.set('25');
        break;
    }

    // После установки примера сразу выполняем тест
    this.testOperator();
  }
}
