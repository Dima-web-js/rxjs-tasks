import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { User, UsersResponse } from '../interfaces/user.interface';
import { Cart, CartsResponse } from '../interfaces/cart.interface';
import { Todo, TodosResponse } from '../interfaces/todo.interface';

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://dummyjson.com';

  getUsersBySearch(search: string): Observable<User[]> {
    const params = new HttpParams().set('q', search); 
    //q - query parameter (стандарт для dummyjson)

    return this.http
      .get<UsersResponse>(`${this.apiUrl}/users/search`, { params })
      .pipe(map((response) => response.users));
  }
  

  getUsersByLimit(limit: number = 5): Observable<User[]> {
    const url = `${this.apiUrl}/users?limit=${limit}`;
    return this.http.get<UsersResponse>(url).pipe(map((response) => response.users));
  }

  getUserCarts(userId: number): Observable<Cart[]> {
    const url = `${this.apiUrl}/users/${userId}/carts`;
    return this.http.get<CartsResponse>(url).pipe(map((response) => response.carts));
  }

  getUserTodos(userId: number): Observable<Todo[]> {
    const url = `${this.apiUrl}/users/${userId}/todos`;
    return this.http.get<TodosResponse>(url).pipe(map((response) => response.todos));
  }
}

