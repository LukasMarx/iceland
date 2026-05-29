import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { AppScreenBase } from '../screen-base';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-profile-screen',
  templateUrl: './profile-screen.component.html',
  styleUrl: './profile-screen.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ProfileScreenComponent extends AppScreenBase {}
