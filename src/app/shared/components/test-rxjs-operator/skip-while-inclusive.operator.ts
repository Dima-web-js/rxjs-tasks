import { MonoTypeOperatorFunction } from 'rxjs';
import { scan, filter, map, take } from 'rxjs/operators';

/**
 * Задание №1:
 * Кастомный оператор skipWhileInclusive
 * Он делает так:
 * - Пока predicate === true → пропускаем значения
 * - Первое значение, где predicate стал false → эмитим (inclusive)
 * - После этого завершаем поток
 */
export function skipWhileInclusive<T>(
  // predicate определяет, нужно ли пропускать текущее значение
  predicate: (value: T, index: number) => boolean
  // Принимает: Observable<T> — исходный поток, 
  // Возвращает: Observable<T> — поток с одним эмитированным значением
): MonoTypeOperatorFunction<T> {

  // Тип аккумулятора для scan — хранит состояние пропуска и само значение
  type Acc = {
    // started = true означает, что мы уже нашли значение для эмита
    started: boolean;
    // emit = true означает, что текущее значение нужно передать дальше
    emit: boolean;
    // value — текущее значение исходного потока
    value: T;
  };

  // Возвращаем pipeable-оператор
  return (source) =>
    source.pipe(

      // scan используется для накопления состояния между эмитами (похож на reduce, только 
      // эмитит промежуточные значения)
      scan<T, Acc>(
        (acc, value, index) => {

          // Если мы уже нашли и эмитили значение — больше ничего не делаем
          // (это предотвращает дальнейшую обработку, хотя take(1) завершит поток)
          if (acc.started) {
            return { started: true, emit: false, value };
          }

          // Проверяем predicate для текущего значения
          const shouldSkip = predicate(value, index);

          // Пока predicate возвращает true — продолжаем пропускать значения
          if (shouldSkip) {
            return { started: false, emit: false, value };
          }

          // Мы дошли до ПЕРВОГО значения, где predicate стал false
          // Это значение эмитим (inclusive — оно выбивается из последовательности)
          return { started: true, emit: true, value };
        },

        // Начальное состояние аккумулятора:
        // значение ещё не найдено, ничего не эмитим
        { started: false, emit: false, value: undefined as unknown as T }
      ),

      // Пропускаем дальше только те значения, для которых emit === true
      filter(acc => acc.emit),

      // Возвращаем исходное значение потока
      map(acc => acc.value),

      // Берём только первое значение и завершаем поток
      take(1)
    );
}
