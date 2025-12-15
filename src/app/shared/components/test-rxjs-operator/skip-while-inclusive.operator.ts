import { MonoTypeOperatorFunction } from 'rxjs';
import { scan, filter, map } from 'rxjs/operators';

/**
 * Задание №1:
 * Кастомный оператор skipWhileInclusive
 * - пропускает значения, пока predicate возвращает true
 * - первое значение, для которого predicate стал false, тоже пропускает
 * - после этого эмитит все последующие значения
 */
export function skipWhileInclusive<T>(
  // predicate определяет, нужно ли пропускать текущее значение
  predicate: (value: T, index: number) => boolean
): MonoTypeOperatorFunction<T> {

  // Тип аккумулятора для scan — хранит состояние пропуска и само значение
  type Acc = {
    // started = true означает, что пропуск завершён и можно эмитить значения
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

          // Если мы уже закончили пропуск (inclusive false уже был)
          if (acc.started) {
            // Эмитим все значения без дополнительных проверок
            return { started: true, emit: true, value };
          }

          // Проверяем predicate для текущего значения
          const shouldSkip = predicate(value, index);

          // Пока predicate возвращает true — продолжаем пропускать значения
          if (shouldSkip) {
            return { started: false, emit: false, value };
          }

          // Мы дошли до ПЕРВОГО значения, где predicate стал false
          // Это значение тоже нужно пропустить (inclusive)
          // Но после него начинаем эмитить все последующие значения
          return { started: true, emit: false, value };
        },

        // Начальное состояние аккумулятора:
        // пропуск ещё не завершён, ничего не эмитим
        { started: false, emit: false, value: undefined as unknown as T }
      ),

      // Пропускаем дальше только те значения, для которых emit === true
      filter(acc => acc.emit),

      // Возвращаем исходное значение потока
      map(acc => acc.value)
    );
}
