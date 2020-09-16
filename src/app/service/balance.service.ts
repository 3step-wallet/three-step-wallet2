import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BalanceService {

  constructor() { }

  getBalance() {
    if ('balance' in localStorage) {
      return localStorage.balance;
    }
    this.resetBalance();
    return localStorage.balance;
  }

  resetBalance() {
    localStorage.balance = 50;
  }

  reduceBalance(reduce: number) {
    const newBalance = localStorage.balance - reduce;
    localStorage.balance = newBalance;
    return newBalance;
  }
}
