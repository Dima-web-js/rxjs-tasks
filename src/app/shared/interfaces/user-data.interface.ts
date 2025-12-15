import { Cart } from './cart.interface';
import { Todo } from './todo.interface';

export interface UserData {
  userId: number;
  cart: Cart | null;
  todo: Todo[] | null;
}

