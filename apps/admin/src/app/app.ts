import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly queues = [
    { label: 'Seed spots', value: 6, hint: 'Ready for mobile demo' },
    { label: 'Translations', value: 3, hint: 'English, Deutsch, Islenska' },
    { label: 'Community reports', value: 0, hint: 'Moderation queue empty' },
  ];
}
