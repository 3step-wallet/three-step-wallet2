import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { IAccount, TSAccountService } from '../../service/tsaccount.service';
import { SymbolService } from 'src/app/service/symbol.service';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage implements OnInit {

  constructor(
    public accountService: TSAccountService,
    public symbolService: SymbolService,
    public modalController: ModalController,
    public toastController: ToastController,
  ) { }

  account: IAccount = {
    multisigPublicKey: null,
    initiatorPrivateKey: null,
    parentTel: null,
    contact: null,
    language: null,
  };

  ngOnInit() {
  }

  ionViewWillEnter() {
    const account = this.accountService.getAccount();
    if (account) {
      this.account = account;
    }

    if (!this.account.contact) {
      this.account.contact = 'tel';
    }

    if (!this.account.language) {
      this.account.language = 'lang';
    }
  }

  async saveAccount() {
    console.log('test');
    const isValid = await this.symbolService.validateMultisigSetting(
      this.account.initiatorPrivateKey,
      this.account.multisigPublicKey,
    );
    console.log('1', this.account.initiatorPrivateKey);
    console.log('2', this.account.multisigPublicKey);
    console.log('3', this.account.parentTel);
    console.log('4', this.account.contact);
    console.log('5', this.account.language);
    if (isValid) {
      this.accountService.saveAccount(this.account);
      // saveAccount localStorageに保存
      this.dismissModalController();
    } else {
      await this.showInvalidAccountSettingToast();
    }
  }

  async showInvalidAccountSettingToast() {
    console.log('failed setting');
    const toast = await this.toastController.create({
      message: 'アカウントの設定が間違っています',
      duration: 2000,
    });
    toast.present();
  }

  dismissModalController() {
    this.modalController.dismiss();
  }

  onChangePublicKey(event) {
    this.account.multisigPublicKey = event.target.value;
  }

  onChengePrivateKey(event) {
    this.account.initiatorPrivateKey = event.target.value;
  }

  onTelNumberChange(event) {
    this.account.parentTel = event.target.value;
  }

  onCallChange(event) {
    this.account.contact = event.target.value;
  }

  onLanguageChange(event) {
    this.account.language = event.target.value;
  }

}
