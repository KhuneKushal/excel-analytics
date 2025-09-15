import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { DataProfilerService } from '../../services/data-profiler.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-data-summary',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatIconModule,
    MatGridListModule,
    MatTableModule
  ],
  templateUrl: './data-summary.component.html',
  styleUrls: ['./data-summary.component.scss']
})
export class DataSummaryComponent implements OnInit {
  private dataProfilerService = inject(DataProfilerService);
  private dashboardService = inject(DashboardService);

  summaryData: any = this.getPlaceholderData();
  aiInsights: string[] = [];
  dataSource: any[] = [];
  displayedColumns: string[] = [];
  trendIcon = 'trending_flat';
  confidenceColor = 'low-confidence';
  dataFreshness = '';

  ngOnInit(): void {
    this.dashboardService.currentData.subscribe(data => {
      if (data && data.length > 0) {
        const profiledData = this.dataProfilerService.profileData(data);
        this.summaryData = this.generateSummaryData(profiledData, data);
        this.aiInsights = this.generateAiInsights(this.summaryData);
        this.dashboardService.setSummaryData(this.summaryData);

        this.dataSource = data.slice(0, 5); // Display first 5 rows
        this.displayedColumns = Object.keys(profiledData);
        this.trendIcon = this.getTrendIcon(this.summaryData.trendAnalysis.trendType);
        this.confidenceColor = this.getConfidenceColor(this.summaryData.trendAnalysis.confidence);
        this.dataFreshness = this.timeAgo(this.summaryData.trendAnalysis.dataFreshness);
      } else {
        this.summaryData = this.getPlaceholderData();
        this.aiInsights = this.generateAiInsights(this.summaryData);
        this.dashboardService.setSummaryData(this.summaryData);
        
      }
    });
  }

  generateSummaryData(profiledData: any, data: any[]): any {
    const numericColumns = Object.values(profiledData).filter((col: any) => col.type === 'number' || col.type === 'integer').length;
    const categoryColumns = Object.values(profiledData).filter((col: any) => col.type === 'string').length;
    const totalRecords = data.length;
    const totalColumns = Object.keys(profiledData).length;
    const dataPoints = totalRecords * totalColumns;
    const completeness = this.calculateCompleteness(profiledData, totalRecords);
    const dataQuality = this.calculateDataQuality(profiledData, totalRecords);

    return {
      dataSummary: {
        dataRecords: totalRecords,
        numericColumns: numericColumns,
        categories: categoryColumns,
        dataPoints: dataPoints
      },
      systemPerformance: {
        chartsGenerated: 12, // Placeholder
        processingSpeed: Math.round(totalRecords / 0.5), // Placeholder for 0.5s processing time
        memoryUsage: 256, // Placeholder
        cacheHitRate: 95 // Placeholder
      },
      trendAnalysis: {
        trendType: 'Upward',
        strength: 'High',
        confidence: 98,
        dataFreshness: new Date().toISOString()
      },
      dataQualityIndicators: {
        completeness: completeness,
        dataQuality: dataQuality,
        performanceScore: Math.round((completeness + dataQuality) / 2)
      },
      kpis: {
        totalRecords: totalRecords,
        dataQuality: dataQuality,
        processingTime: 500, // Placeholder
        growthRate: 15 // Placeholder
      }
    };
  }

  calculateCompleteness(profiledData: any, totalRecords: number): number {
    const totalCells = Object.keys(profiledData).length * totalRecords;
    const totalNulls = Object.values(profiledData).reduce((acc: number, col: any) => acc + col.nullCount, 0);
    return Math.round(((totalCells - totalNulls) / totalCells) * 100);
  }

  calculateDataQuality(profiledData: any, totalRecords: number): number {
    // A simple quality score based on uniqueness and non-empty values
    const uniqueScores = Object.values(profiledData).map((col: any) => col.uniqueCount / totalRecords);
    const avgUniqueness = uniqueScores.reduce((acc, score) => acc + score, 0) / uniqueScores.length;
    const totalEmpties = Object.values(profiledData).reduce((acc: number, col: any) => acc + col.emptyCount, 0);
    const nonEmptyPercentage = 1 - (totalEmpties / (totalRecords * Object.keys(profiledData).length));
    return Math.round(((avgUniqueness + nonEmptyPercentage) / 2) * 100);
  }

  generateAiInsights(data: any): string[] {
    const insights = [];
    if (data.dataSummary.dataRecords > 1000) {
      insights.push('The dataset is large, providing a solid basis for analysis.');
    } else {
      insights.push('The dataset is small. More data would improve analysis accuracy.');
    }

    if (data.dataQualityIndicators.dataQuality > 90) {
      insights.push('Data quality is high, with good completeness and uniqueness.');
    } else {
      insights.push('There is room for improving data quality by addressing missing or inconsistent values.');
    }

    if (data.dataSummary.numericColumns > data.dataSummary.categories) {
      insights.push('The data is rich in numerical features, ideal for quantitative analysis.');
    } else {
      insights.push('The data is diverse with a good mix of categorical and numerical data.');
    }

    if (data.systemPerformance.processingSpeed > 10000) {
      insights.push('System performance is excellent, with high processing speed.');
    } else {
      insights.push('System performance is adequate for the current dataset size.');
    }

    return insights;
  }

  getPlaceholderData(): any {
    return {
      dataSummary: { dataRecords: 0, numericColumns: 0, categories: 0, dataPoints: 0 },
      systemPerformance: { chartsGenerated: 0, processingSpeed: 0, memoryUsage: 0, cacheHitRate: 0 },
      trendAnalysis: { trendType: 'N/A', strength: 'N/A', confidence: 0, dataFreshness: new Date().toISOString() },
      dataQualityIndicators: { completeness: 0, dataQuality: 0, performanceScore: 0 },
      kpis: { totalRecords: 0, dataQuality: 0, processingTime: 0, growthRate: 0 }
    };
  }

  timeAgo(date: string): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) {
      return Math.floor(interval) + " years ago";
    }
    interval = seconds / 2592000;
    if (interval > 1) {
      return Math.floor(interval) + " months ago";
    }
    interval = seconds / 86400;
    if (interval > 1) {
      return Math.floor(interval) + " days ago";
    }
    interval = seconds / 3600;
    if (interval > 1) {
      return Math.floor(interval) + " hours ago";
    }
    interval = seconds / 60;
    if (interval > 1) {
      return Math.floor(interval) + " minutes ago";
    }
    return Math.floor(seconds) + " seconds ago";
  }

  getTrendIcon(trend: string): string {
    switch (trend) {
      case 'Upward': return 'trending_up';
      case 'Downward': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getConfidenceColor(confidence: number): string {
    if (confidence > 95) return 'high-confidence';
    if (confidence > 80) return 'moderate-confidence';
    return 'low-confidence';
  }
}
