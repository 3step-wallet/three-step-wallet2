import { Component } from '@angular/core';
import { SymbolService } from '../service/symbol.service';
import { AccountService, PublicAccount, AggregateTransaction } from 'symbol-sdk';
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
    this.multisigAccount = PublicAccount.createFromPublicKey(
      tsAccount.multisigPublicKey, environment.node.networkType
    );//わからん。PublicAccountクラスとかどこにドキュメントあるの？とりあえずこれで登録したマルチシグアカが代入される
  }

  ListenningMultisig(){
    const wsEndpoint = this.endPoint.replace('http', 'ws');
    const listener = new Listener(wsEndpoint, WebSocket);
  }
  
  // Symbol.geConfirmTxs(address)
  // multisigのアカウントを引数にとり、①空のaccountRepository作る　②TransactionFilter作る（new TransactionFilter)
  // ③ ②をいれたaccountRepositoryを返す
  getConfirmTxs() {
    this.symbolService.getConfirmTxs(this.multisigAccount.address).subscribe(
      (txs) => {
        this.confirmTxs = txs;
      }
    );
  }

  confirmTxsTrackBy(index, item: ConfirmedTxInfo) {
    return item.id;
  }

  //ここで未承認情報を取得しpartialTxsに入れてる
  getPartialTxs() {
    this.symbolService.getPartialTxs(this.multisigAccount.address).subscribe(
      (txs) => {
        console.log(txs);
        this.partialTxs = txs;
      }
    );
  }

  partialTxsTrackBy(index, item: PartialTxInfo) {
    return item.id;
  }
}
