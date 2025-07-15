import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../data.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home {
  data: {
    status: string;
    message: string;
  } | any = { status: "loading", message: "No data" };
  
  constructor(private dataService: DataService) {}
  
  ngOnInit() {
    this.dataService.getData('home/test').subscribe({
      next: (response) => {
        this.data = response;
        console.log('Data fetched successfully:', this.data);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
      }
    });
  }
}
