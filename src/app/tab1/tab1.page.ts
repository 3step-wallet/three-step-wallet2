import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';
import { BarcodeScanner, BarcodeScanResult } from '@ionic-native/barcode-scanner/ngx';
import { CallNumber } from '@ionic-native/call-number/ngx';
import { SMS } from '@ionic-native/sms/ngx';
import { LoadingController, AlertController, ModalController } from '@ionic/angular';
import { NetworkType, TransferTransaction, Address, Listener, TransactionType } from 'symbol-sdk';
import { IAccount, TSAccountService } from '../service/tsaccount.service';
import { SymbolService, ITxInfo } from '../service/symbol.service';
import { AccountPage } from '../setting/account/account.page';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page implements OnInit {
  symbolQrData: {
    v: number,
    network_id: number,
    chain_id: number,
    data: { payload: string }
  };
  transferTx: TransferTransaction;
  endPoint: string;
  amount = 0;
  smsMessage = '';
  networkType: NetworkType;
  account: IAccount;
  txInfo: ITxInfo;

  constructor(
    public barcodeScanner: BarcodeScanner,
    public loadingController: LoadingController,
    public callNumber: CallNumber,
    public alertController: AlertController,
    public sms: SMS,
    public accountService: TSAccountService,
    public symbolService: SymbolService,
    public modalController: ModalController,
  ) {
    this.endPoint = environment.node.endPoint;
    this.networkType = environment.node.networkType;
    this.account = accountService.getAccount();
  }

  async ngOnInit() {
    const account = this.accountService.getAccount();
    if (!account) {
      const modal = await this.modalController.create({
        component: AccountPage,
      });
      await modal.present();
      modal.onWillDismiss().then(() => this.ionViewDidEnter());
    }
  }

  ionViewDidEnter() {
    this.account = this.accountService.getAccount();
    this.getAccountXym();
  }

  getAccountXym() {
    const multisigAddress = Address.createFromPublicKey(this.account.multisigPublicKey, this.networkType);
    this.symbolService.getAccountXymAmount(multisigAddress).
    subscribe((m) => {
      this.amount = m.relativeAmount();
    });
  }

  runQRScanner() {
    // ローカルテスト用
    // tslint:disable-next-line:max-line-length
    // const text = `{"v":3,"type":3,"network_id":152,"chain_id":"ACECD90E7B248E012803228ADB4424F0D966D24149B72E58987D2BF2F2AF03C4","data":{"payload":"DB00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000198544150C300000000000019B5A1DA0300000098155FE225BD9D1C0A5592A88B44A728471060897352CEFC65012B0000000000B4E023924BC29F51002D31010000000000E3828FE3818BE381B0E7A5ADE3828AE38381E383ADE383ABE38381E383A7E382B3E381A0E38288EFBC81"}}`;
    // const payload = this.parseQRJSON(text);
    // if (payload) {
    //   this.parsePayload(payload);
    // }
    this.barcodeScanner.scan().then((barcodeData: BarcodeScanResult) => {
      if (!barcodeData.cancelled && barcodeData.format === 'QR_CODE') {
        const payload = this.parseQRJSON(barcodeData.text);
        if (payload) {
          this.parsePayload(payload);
        }
      }
    }).catch((e) => {
      console.error(e);
    });
  }

  parseQRJSON(barcodeData: string): string {
    this.symbolQrData = JSON.parse(barcodeData);
    if (this.symbolQrData?.data?.payload) {
      console.log(this.symbolQrData.data.payload);
      return this.symbolQrData.data.payload;
    }
    return null;
  }

  parsePayload(payload) {
    const tx = TransferTransaction.createFromPayload(payload);
    if (tx.type === TransactionType.TRANSFER) {
      this.transferTx = tx as TransferTransaction;
      this.txInfo = this.symbolService.parseTx(this.transferTx);
    }
  }

  async payXym() {
    const wsEndpoint = this.endPoint.replace('http', 'ws');
    const listener = new Listener(wsEndpoint, WebSocket);

    const loading = await this.loadingController.create({
      message: 'しはらいちゅう',
    });

    await loading.present();

    listener.open().then(() => {
      this.symbolService.sendTxFromMultisig(
        this.transferTx, listener,
        this.account.initiatorPrivateKey,
        this.account.multisigPublicKey).subscribe((x) => {
          console.log(x);
          this.smsMessage = this.txInfo.message;
          this.resetPayStatus(listener, loading);
          this.showSendTxMessage().then();
        }, (err) => {
          console.error(err);
          this.transferTx = null;
          loading.dismiss();
        });
    }).catch((err) => {
      console.error(err);
      this.transferTx = null;
      loading.dismiss();
    });
  }

  resetPayStatus(listener: Listener, loading: HTMLIonLoadingElement) {
    listener.close();
    this.transferTx = null;
    this.txInfo = null;
    loading.dismiss();
    this.getAccountXym();
  }

  async showSendTxMessage() {
    const alert = await this.alertController.create({
      header: 'そうきんいらいをおくったよ',
      message: 'しょうにんいらいをおくったよ。おかあさんかおとうさんにれんらくしよう',
      buttons: [
        {
          text: 'れんらくする',
          handler: () => {
            if (this.account.contact === 'tel') {
              this.callPhone();
            } else {
              this.sendSMS();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  callPhone() {
    this.callNumber.callNumber(this.account.parentTel, true).then(
      (res) => { console.log(`Lunched dialer: ${res}`); }
    ).catch((e) => { console.error(`Failed lunched dialer: ${e}`); });
  }

  sendSMS() {
    this.sms.send(this.account.parentTel, this.smsMessage).then();
    this.smsMessage = null;
  }

}
