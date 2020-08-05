import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { AccountPage } from '../setting/account/account.page';
import { BalanceService } from '../service/balance.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {
  constructor(
    public modalController: ModalController,
    public balanceService: BalanceService,
  ) {}

  async openAccountSetting() {
    const modal = await this.modalController.create({
      component: AccountPage,
    });
    modal.present();
  }

  reset() {
    this.balanceService.resetBalance();
  }

}
