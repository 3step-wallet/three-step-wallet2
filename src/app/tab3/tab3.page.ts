import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AccountPage } from '../setting/account/account.page';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {
  amount = 50;

  constructor(
    public modalController: ModalController,
  ) {}

  async openAccountSetting() {
    const modal = await this.modalController.create({
      component: AccountPage,
    });
    modal.present();
  }

  reset() {
    localStorage.amount = this.amount;
  }

}
