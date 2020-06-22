import { Injectable } from '@angular/core';

export interface IAccount {
  multisigPublicKey: string;
  initiatorPrivateKey: string;
  coPrivateKey?: string;
  parentTel: string;
  contact: string;
  language: string;
}

@Injectable({
  providedIn: 'root'
})
export class TSAccountService {
  constructor() { }

  getAccount(): IAccount {
    if ('account' in localStorage) {
      const account: IAccount = JSON.parse(localStorage.account);
      console.log(account.contact);
      console.log(account.language);
      return account;
    }
    return null;
  }

  saveAccount(account: IAccount) {
    
    localStorage.account = JSON.stringify(account);
  }
}
