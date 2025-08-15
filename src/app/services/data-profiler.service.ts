import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataProfilerService {

  constructor() { }

  profileData(data: any[]): any {
    if (!data || data.length === 0) {
      return {};
    }

    const profile: any = {};
    const headers = Object.keys(data[0]);

    headers.forEach(header => {
      const columnData = data.map(row => row[header]);
      const nonNullValues = columnData.filter(value => value !== null && value !== undefined && String(value).trim() !== '');

      let type = this.detectColumnType(nonNullValues);

      profile[header] = {
        type: type,
        nullCount: columnData.length - nonNullValues.length,
        emptyCount: columnData.filter(value => String(value).trim() === '').length,
        uniqueCount: new Set(nonNullValues).size,
        sampleValues: nonNullValues.slice(0, 5)
      };

      if (type === 'number' || type === 'integer') {
        const numericValues = nonNullValues.map(Number).filter(n => !isNaN(n));
        if (numericValues.length > 0) {
          profile[header].min = Math.min(...numericValues);
          profile[header].max = Math.max(...numericValues);
          profile[header].mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
          if (profile[header].uniqueCount / nonNullValues.length < 0.2 && profile[header].uniqueCount <= 10) {
            profile[header].isLikelyCategorical = true;
          }
        }
      } else if (type === 'date') {
        const dateValues = nonNullValues.map(val => new Date(val)).filter(d => !isNaN(d.getTime()));
        if (dateValues.length > 0) {
          profile[header].minDate = new Date(Math.min(...dateValues.map(d => d.getTime())));
          profile[header].maxDate = new Date(Math.max(...dateValues.map(d => d.getTime())));
          if (profile[header].uniqueCount > 1) {
            profile[header].isLikelyTimeSeries = true;
          }
        }
      }
    });

    return profile;
  }

  private detectColumnType(values: any[]): string {
    if (values.length === 0) {
      return 'unknown';
    }

    const isAllIntegers = values.every(val => String(val).match(/^-?\d+$/));
    if (isAllIntegers) {
      return 'integer';
    }

    const isAllNumbers = values.every(val => !isNaN(Number(val)));
    if (isAllNumbers) {
      return 'number';
    }

    const isAllDates = values.every(val => !isNaN(Date.parse(val)));
    if (isAllDates) {
      return 'date';
    }

    return 'string';
  }

  getAutoInsights(profile: any): any[] {
    const insights = [];
    for (const header in profile) {
      const p = profile[header];
      if (p.type === 'number' || p.type === 'integer') {
        insights.push({
          header: header,
          insight: `The values range from ${p.min} to ${p.max}, with an average of ${p.mean.toFixed(2)}.`
        });
      } else if (p.type === 'date' && p.minDate && p.maxDate) {
        insights.push({
          header: header,
          insight: `The dates range from ${p.minDate.toLocaleDateString()} to ${p.maxDate.toLocaleDateString()}.`
        });
      }
    }
    return insights.slice(0, 3);
  }

  suggestChartTypes(profile: any): any {
    const suggestions: any = {};
    const numericColumns = Object.keys(profile).filter(k => profile[k].type === 'number' || profile[k].type === 'integer');
    const dateColumns = Object.keys(profile).filter(k => profile[k].type === 'date');
    const categoricalColumns = Object.keys(profile).filter(k => profile[k].isLikelyCategorical || profile[k].type === 'string');

    if (numericColumns.length > 0) {
      suggestions.histogram = {
        type: 'bar',
        description: 'Distribution of a numeric variable.',
        requiredColumns: numericColumns.slice(0, 1)
      };
    }

    if (categoricalColumns.length > 0) {
      suggestions.barChart = {
        type: 'bar',
        description: 'Compare values across categories.',
        requiredColumns: categoricalColumns.slice(0, 1)
      };
      suggestions.pieChart = {
        type: 'pie',
        description: 'Proportion of each category.',
        requiredColumns: categoricalColumns.slice(0, 1)
      };
    }

    if (numericColumns.length >= 2) {
      suggestions.scatterPlot = {
        type: 'scatter',
        description: 'Relationship between two numeric variables.',
        requiredColumns: numericColumns.slice(0, 2)
      };
    }

    if (numericColumns.length > 0 && categoricalColumns.length > 0) {
      suggestions.groupedBarChart = {
        type: 'bar',
        description: 'Compare a numeric variable across different categories.',
        requiredColumns: [categoricalColumns[0], numericColumns[0]]
      };
    }
    
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      suggestions.lineChart = {
        type: 'line',
        description: 'Trend of a numeric variable over time.',
        requiredColumns: [dateColumns[0], numericColumns[0]]
      };
    }

    return suggestions;
  }
}
