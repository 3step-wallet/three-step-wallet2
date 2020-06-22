import { Component } from '@angular/core';
import { SymbolService } from '../service/symbol.service';
import { AccountService, PublicAccount, AggregateTransaction, Account } from 'symbol-sdk';
import { TSAccountService } from '../service/tsaccount.service';
import { environment } from 'src/environments/environment';
import { ConfirmedTxInfo } from '../model/confirmed-tx-info';
import { PartialTxInfo } from '../model/partial-tx-info';
import { NetworkType, TransferTransaction, Address, Listener, TransactionType } from 'symbol-sdk';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  multisigAccount: PublicAccount;
  confirmTxs: ConfirmedTxInfo[];
  partialTxs: PartialTxInfo[];
  endPoint: string;
  privateKey: string;
  coPrivateKey: string;

  constructor(
    public accountService: TSAccountService,
    public symbolService: SymbolService,
  ) {
    this.endPoint = environment.node.endPoint;
  }

  ionViewDidEnter() {
    this.setMultisigAccount();
    this.getConfirmTxs();
    this.getPartialTxs();
  }

  //マルチシグアカウント取得
  setMultisigAccount() {
    const tsAccount = this.accountService.getAccount();//localStorageからアカウント取得
    this.privateKey = tsAccount.initiatorPrivateKey;
    this.coPrivateKey = tsAccount.coPrivateKey;
    this.multisigAccount = PublicAccount.createFromPublicKey(
      tsAccount.multisigPublicKey, environment.node.networkType
    );//わからん。PublicAccountクラスとかどこにドキュメントあるの？とりあえずこれで登録したマルチシグアカが代入される
    console.log(`multisigAccount:${JSON.stringify(this.multisigAccount)}`)
  }

  ListenningMultisig(){
    const wsEndpoint = this.endPoint.replace('http', 'ws');
    const listener = new Listener(wsEndpoint, WebSocket);
  }
  
  // Symbol.geConfirmTxs(address)
  // multisigのアカウントを引数にとり、①空のaccountRepository作る　②TransactionFilter作る（new TransactionFilter)
  // ③ ②をいれたaccountRepositoryを返す
  getConfirmTxs() {
    // console.log(`before subscribe: ${JSON.stringify(this.symbolService.getConfirmTxs(this.multisigAccount.address))}`)
    this.symbolService.getConfirmTxs(this.multisigAccount.address).subscribe(
      (txs) => {
        this.confirmTxs = txs;
        console.log(`comfirmTxs:${JSON.stringify(this.confirmTxs)}`)
      }
    );
  }

  confirmTxsTrackBy(index, item: ConfirmedTxInfo) {
    return item.id;
  }

  //ここで未承認情報(Agregate Transactions)を取得しpartialTxsに入れてる
  // 今は未承認トランザクションが存在しないので空
  getPartialTxs() {
    this.symbolService.getPartialTxs(this.multisigAccount.address).subscribe(
      (txs) => {
        this.partialTxs = txs;
        console.log(`transaction:${this.partialTxs}`);
      }
    );
  }

  pressPartial(){
    const cosignAccount = Account.createFromPrivateKey(this.coPrivateKey, NetworkType.TEST_NET);
    console.log(cosignAccount);
    this.symbolService.signatureMultisig(this.privateKey, cosignAccount);
    console.log('PressPartial finish');
  }

  partialTxsTrackBy(index, item: PartialTxInfo) {
    return item.id;
  }
}
