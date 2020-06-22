import { Injectable } from "@angular/core";
import {
  Address,
  RepositoryFactoryHttp,
  MosaicService,
  MosaicAmountView,
  TransferTransaction,
  Listener,
  NetworkType,
  Account,
  PublicAccount,
  AggregateTransaction,
  Deadline,
  HashLockTransaction,
  NetworkCurrencyPublic,
  UInt64,
  TransactionService,
  TransactionFilter,
  TransactionType,

  CosignatureSignedTransaction,
  CosignatureTransaction,
} from "symbol-sdk";
import { environment } from "src/environments/environment";
import { mergeMap, first, filter, map, toArray } from "rxjs/operators";
import { Observable } from "rxjs";
import { ConfirmedTxInfo } from "../model/confirmed-tx-info";
import { PartialTxInfo } from "../model/partial-tx-info";
import { IAccount } from './tsaccount.service';

export interface ITxInfo {
  recipient: string;
  amount: number;
  message: string;
}

@Injectable({
  providedIn: "root",
})
export class SymbolService {
  repositoryFactory: RepositoryFactoryHttp;
  networkType: NetworkType;
  generationHash: string;
  initiatorPrivateKey: string;

  constructor() {
    this.repositoryFactory = new RepositoryFactoryHttp(
      environment.node.endPoint
    );
    this.networkType = environment.node.networkType;
    this.generationHash = environment.node.generationHash; //定数
    
  }

  getAccountXymAmount(address: Address): Observable<MosaicAmountView> {
    const mosaicService = new MosaicService(
      this.repositoryFactory.createAccountRepository(),
      this.repositoryFactory.createMosaicRepository()
    );
    return mosaicService.mosaicsAmountViewFromAddress(address).pipe(
      mergeMap((_) => _),
      first((m) => m.fullName() === environment.currencyId)
    );
  }

  parseTx(tx: TransferTransaction): ITxInfo {
    const recipient = this.recipientAddressFromTx(tx); // 送信者？
    const amount = this.amountFromTx(tx);
    const message = this.messageFromTx(tx);
    return {
      recipient,
      amount,
      message,
    };
  }

  private recipientAddressFromTx(tx: TransferTransaction): string {
    if (tx.recipientAddress instanceof Address) {
      return tx.recipientAddress.pretty(); // Get address in pretty format ex: SB3KUB-HATFCP-V7UZQL-WAQ2EU-R6SIHB-SBEOED-DDF3.
    } else {
      return tx.recipientAddress.id.toHex(); // Get string value of id
    }
  }

  private amountFromTx(tx: TransferTransaction): number {
    let amount: number = null;
    const xym = tx.mosaics.find((m) => {
      return m.id.toHex() === environment.currencyId;
    });
    if (xym) {
      const absolute = Number(xym.amount.toString());
      amount = absolute * Math.pow(10, -NetworkCurrencyPublic.DIVISIBILITY);
    }
    return amount;
  }

  private messageFromTx(tx: TransferTransaction): string {
    return tx.message.payload;
  }

  // ↓　ここから書き換え
  signatureMultisig(privateKey, cosignaccount,) {
    console.log(`takurin start`)
   
    const cosignAggregateBondedTransaction = (transaction: AggregateTransaction, cosignaccount: Account): CosignatureSignedTransaction => {
      const cosignatureTransaction = CosignatureTransaction.create(transaction);
      return cosignaccount.signCosignatureTransaction(cosignatureTransaction);
  };
    const accountHttp = this.repositoryFactory.createAccountRepository();
    console.log(`accountHttp:${accountHttp}`);
    // return new AccountHttp(this.url); <= ???
    // AccountRepositoryインターフェイスを返してる。つまり↑は空のインターフェイス
    // 内容はgetAccountInfo(): Observable<AccontInfo> とgetAccountsInfo(): Observable<AccontInfo[]>
    const transactionHttp = this.repositoryFactory.createTransactionRepository();
    console.log(`transactionHttp:${transactionHttp}`);
    const account = Account.createFromPrivateKey(privateKey, this.networkType);
    console.log(`account:${account}`);

    accountHttp
    .getAccountPartialTransactions(account.address) // of(1, 3, 5)
    .pipe(
        mergeMap((_) => _),// これいるか？非同期処理にしたいから？
        filter((_) => !_.signedByAccount(account.publicAccount)), //true返すのだけ残る
        map((transaction) => cosignAggregateBondedTransaction(transaction, cosignaccount)),
        mergeMap((cosignatureSignedTransaction) =>
            transactionHttp.announceAggregateBondedCosignature(cosignatureSignedTransaction)),
            // ↑メソッドの説明以下
          //   public announceAggregateBondedCosignature(
          //     cosignatureSignedTransaction: CosignatureSignedTransaction,
          // ): Observable<TransactionAnnounceResponse> {
          //     return observableFrom(this.transactionRoutesApi.announceCosignatureTransaction(cosignatureSignedTransaction)).pipe(
          //         map(({ body }) => new TransactionAnnounceResponse(body.message)),
          //         catchError((error) => throwError(this.errorHandling(error))),
          //     );

    )
    .subscribe((announcedTransaction) => console.log(`announcedTransactioin:${announcedTransaction}`),
        (err) => console.error(err));
  }
// ↑　ここまで

getConfirmTxs(address: Address): Observable<ConfirmedTxInfo[]> {
  const accountRepository = this.repositoryFactory.createAccountRepository();
  const transactionFilter = new TransactionFilter({
    types: [TransactionType.AGGREGATE_BONDED],
  });
  return accountRepository
    .getAccountTransactions(address, null, transactionFilter)
    .pipe(
      mergeMap((_) => _),
      filter((t) => t.type === TransactionType.AGGREGATE_BONDED),
      map((t) => t as AggregateTransaction),
      map((t) => this.parseConfirmedTx(t)),
      toArray()
    );
}
  private parseConfirmedTx(tx: AggregateTransaction): ConfirmedTxInfo {
    return ConfirmedTxInfo.txInfoFromAggregateTx(tx);
  }

  getPartialTxs(address: Address): Observable<PartialTxInfo[]> {
    const accountRepository = this.repositoryFactory.createAccountRepository();
    return accountRepository.getAccountPartialTransactions(address).pipe(
      mergeMap((_) => _),
      map((t) => t as AggregateTransaction),
      map((t) => this.parsePartialTx(t)),
      toArray()
    );
  }

  private parsePartialTx(tx: AggregateTransaction): PartialTxInfo {
    return PartialTxInfo.txInfoFromAggregateTx(tx);
  }

  public async validateMultisigSetting(
    cosignatoryKey: string,
    multisigKey: string
  ) {
    const networkType = environment.node.networkType;
    const multisigRepository = this.repositoryFactory.createMultisigRepository();

    try {
      const cosignatoryAccount = Account.createFromPrivateKey(
        cosignatoryKey,
        networkType
      );
      console.log(cosignatoryAccount);
      const multisigAccount = PublicAccount.createFromPublicKey(
        multisigKey,
        networkType
      );
      console.log(multisigAccount);
      const result = await multisigRepository
        .getMultisigAccountInfo(multisigAccount.address)
        .pipe(
          map((m) => m.cosignatories),
          mergeMap((_) => _),
          first((c) => c.publicKey === cosignatoryAccount.publicKey)
        )
        .toPromise();
      console.log(result);
      if (result) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.log("こんにちは", e);
      return false;
    }
  }
}
