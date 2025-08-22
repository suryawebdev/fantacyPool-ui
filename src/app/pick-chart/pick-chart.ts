import { Component, OnInit, ElementRef, ViewChild, Input, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { VisualizationService, PickData } from '../visualization.service';

@Component({
  selector: 'app-pick-chart',
  imports: [CommonModule],
  templateUrl: './pick-chart.html',
  styleUrl: './pick-chart.scss'
})
export class PickChart implements OnInit, OnDestroy, OnChanges {
  @ViewChild('chartContainer', { static: true }) chartContainer!: ElementRef;
  @Input() matches: any[] = [];
  @Input() userPicks: any[] = [];

  loading = true;
  private svg: any;
  private width: number = 0;
  private height: number = 400;
  private margin = { top: 40, right: 30, bottom: 60, left: 80 };

  constructor(private visualizationService: VisualizationService) {}

  ngOnInit() {
    console.log('Component initialized with:', { matches: this.matches.length, picks: this.userPicks.length });
    
    // Set loading state
    this.loading = !(this.matches.length > 0 && this.userPicks.length > 0);
    
    // Wait for the next tick to ensure the view is initialized
    if (!this.loading) {
      setTimeout(() => {
        this.createChart();
      }, 0);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('Inputs changed:', { matches: this.matches.length, picks: this.userPicks.length });
    
    // Update loading state
    this.loading = !(this.matches.length > 0 && this.userPicks.length > 0);
    
    // Recreate chart when inputs change and we have data
    if (!this.loading) {
      setTimeout(() => {
        this.createChart();
      }, 0);
    }
  }

  ngOnDestroy() {
    if (this.svg) {
      this.svg.remove();
    }
  }

  private createChart() {
    console.log('Creating chart...', { matches: this.matches.length, picks: this.userPicks.length });
    
    if (!this.matches.length) {
      console.log('No matches data available');
      return;
    }

    const container = this.chartContainer.nativeElement;
    console.log('Container dimensions:', { width: container.clientWidth, height: container.clientHeight });
    
    // Check if container has dimensions
    if (container.clientWidth === 0) {
      console.log('Container has no width, retrying...');
      setTimeout(() => this.createChart(), 100);
      return;
    }

    this.width = container.clientWidth - this.margin.left - this.margin.right;
    console.log('Chart width:', this.width);

    // Clear previous chart only if it exists
    if (this.svg) {
      console.log('Removing previous SVG');
      this.svg.remove();
    }
    d3.select(container).selectAll('*').remove();

    // Process data
    const pickData = this.visualizationService.processPickData(this.matches, this.userPicks);
    console.log('Processed pick data:', pickData);
    
    // Create SVG
    try {
      this.svg = d3.select(container)
        .append('svg')
        .attr('width', this.width + this.margin.left + this.margin.right)
        .attr('height', this.height + this.margin.top + this.margin.bottom)
        .append('g')
        .attr('transform', `translate(${this.margin.left},${this.margin.top})`);
      
      console.log('SVG created successfully');
    } catch (error) {
      console.error('Error creating SVG:', error);
      return;
    }

    // Create scales
    const xScale = d3.scaleBand()
      .domain(pickData.map(d => `${d.teamA} vs ${d.teamB}`))
      .range([0, this.width])
      .padding(0.1);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(pickData, d => Math.max(d.teamAPicks, d.teamBPicks)) || 0])
      .range([this.height, 0]);

    // Add X axis
    this.svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    // Add Y axis
    this.svg.append('g')
      .call(d3.axisLeft(yScale))
      .style('font-size', '12px');

    // Create bars for Team A picks
    this.svg.selectAll('.team-a-bar')
      .data(pickData)
      .enter()
      .append('rect')
      .attr('class', 'team-a-bar')
      .attr('x', (d: any) => xScale(`${d.teamA} vs ${d.teamB}`) || 0)
      .attr('y', (d: any) => yScale(d.teamAPicks))
      .attr('width', xScale.bandwidth() / 2)
      .attr('height', (d: any) => this.height - yScale(d.teamAPicks))
      .attr('fill', '#3b82f6')
      .attr('stroke', '#1e40af')
      .attr('stroke-width', 1);

    // Create bars for Team B picks
    this.svg.selectAll('.team-b-bar')
      .data(pickData)
      .enter()
      .append('rect')
      .attr('class', 'team-b-bar')
      .attr('x', (d: any) => (xScale(`${d.teamA} vs ${d.teamB}`) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d: any) => yScale(d.teamBPicks))
      .attr('width', xScale.bandwidth() / 2)
      .attr('height', (d: any) => this.height - yScale(d.teamBPicks))
      .attr('fill', '#f59e0b')
      .attr('stroke', '#d97706')
      .attr('stroke-width', 1);

    // Add chart title
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#1f2937')
      .text('User Pick Distribution');

    // Add legend
    const legend = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.width - 100}, 20)`);

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', '#3b82f6');

    legend.append('text')
      .attr('x', 25)
      .attr('y', 12)
      .style('font-size', '12px')
      .text('Team A');

    legend.append('rect')
      .attr('x', 0)
      .attr('y', 25)
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', '#f59e0b');

    legend.append('text')
      .attr('x', 25)
      .attr('y', 37)
      .style('font-size', '12px')
      .text('Team B');
  }
}
