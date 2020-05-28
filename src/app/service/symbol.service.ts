import { Injectable } from '@angular/core';
import { Address, RepositoryFactoryHttp, MosaicService,
  MosaicAmountView, TransferTransaction, Listener,
  NetworkType, Account, PublicAccount, AggregateTransaction,
  Deadline, HashLockTransaction, NetworkCurrencyPublic,
  UInt64, TransactionService, TransactionFilter, TransactionType } from 'symbol-sdk';
import { environment } from 'src/environments/environment';
import { mergeMap, first, filter, map, toArray } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { ConfirmedTxInfo } from '../model/confirmed-tx-info';
import { PartialTxInfo } from '../model/partial-tx-info';

export interface ITxInfo {
  recipient: string;
  amount: number;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SymbolService {

  repositoryFactory: RepositoryFactoryHttp;
  networkType: NetworkType;
  generationHash: string;

  constructor() {
    this.repositoryFactory = new RepositoryFactoryHttp(environment.node.endPoint);
    this.networkType = environment.node.networkType;
    this.generationHash = environment.node.generationHash;
  }

  getAccountXymAmount(address: Address): Observable<MosaicAmountView> {
    const mosaicService = new MosaicService(
      this.repositoryFactory.createAccountRepository(),
      this.repositoryFactory.createMosaicRepository()
    );
    return mosaicService.mosaicsAmountViewFromAddress(address)
    .pipe(
      mergeMap((_) => _),
      first((m) => m.fullName() === environment.currencyId),
    );
  }

  parseTx(tx: TransferTransaction): ITxInfo {
    const recipient = this.recipientAddressFromTx(tx);
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
      return tx.recipientAddress.pretty();
    } else {
      return tx.recipientAddress.id.toHex();
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

  sendTxFromMultisig(tx: TransferTransaction,
                     listener: Listener,
                     cosignatoryKey: string,
                     multisigKey: string): Observable<AggregateTransaction> {
    const cosignatory = Account.createFromPrivateKey(cosignatoryKey, this.networkType);
    const multisig = PublicAccount.createFromPublicKey(multisigKey, this.networkType);
    const aggregateTx = AggregateTransaction.createBonded(
      Deadline.create(),
      [tx.toAggregate(multisig)],
      this.networkType
    ).setMaxFeeForAggregate(100, 2);

    const signedAggregateTx = cosignatory.sign(aggregateTx, this.generationHash);

    const hashLockTx = HashLockTransaction.create(
      Deadline.create(),
      NetworkCurrencyPublic.createRelative(10),
      UInt64.fromUint(1000),
      signedAggregateTx,
      this.networkType
    ).setMaxFee(100);

    const signedHashLockTx = cosignatory.sign(hashLockTx, this.generationHash);

    const transactionService = new TransactionService(
      this.repositoryFactory.createTransactionRepository(),
      this.repositoryFactory.createReceiptRepository()
    );

    return transactionService.announceHashLockAggregateBonded(signedHashLockTx, signedAggregateTx, listener);
  }

  getConfirmTxs(address: Address): Observable<ConfirmedTxInfo[]> {
    const accountRepository = this.repositoryFactory.createAccountRepository();
    const transactionFilter = new TransactionFilter({types: [TransactionType.AGGREGATE_BONDED] });
    return accountRepository.getAccountTransactions(address, null, transactionFilter).pipe(
      mergeMap((_) => _),
      filter((t) => t.type === TransactionType.AGGREGATE_BONDED),
      map((t) => t as AggregateTransaction),
      map((t) =>  this.parseConfirmedTx(t)),
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

  public async validateMultisigSetting(cosignatoryKey: string, multisigKey: string) {
    const networkType = environment.node.networkType;
    const multisigRepository = this.repositoryFactory.createMultisigRepository();

    try {
      const cosignatoryAccount = Account.createFromPrivateKey(cosignatoryKey, networkType);
      const multisigAccount = PublicAccount.createFromPublicKey(multisigKey, networkType);
      const result = await multisigRepository.getMultisigAccountInfo(multisigAccount.address).pipe(
        map((m) => m.cosignatories),
        mergeMap((_) => _),
        first((c) => c.publicKey === cosignatoryAccount.publicKey)
      ).toPromise();
      if (result) {
        return true;
      } else {
        return false;
      }
    } catch (e) {
      console.error(`failed account setting ${e}`);
      return false;
    }
  }
}
