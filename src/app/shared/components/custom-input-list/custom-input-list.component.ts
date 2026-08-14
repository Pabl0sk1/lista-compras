import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-custom-input-list',
  templateUrl: './custom-input-list.component.html',
  styleUrls: ['./custom-input-list.component.scss'],
  standalone: false
})
export class CustomInputListComponent {

  @Input() control: FormControl;
  @Input() label: string;
  @Input() icon: string;
  @Input() type: string;
  @Input() autocomplete: string;

  constructor() { }

}
