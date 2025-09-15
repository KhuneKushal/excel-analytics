import { Routes } from '@angular/router';
import { UploadExcelComponent } from './components/upload-excel/upload-excel.component';
import { AutoChartsComponent } from './components/auto-charts/auto-charts.component';
import { DashboardBuilderComponent } from './components/dashboard-builder/dashboard-builder.component';
import { MyDashboardComponent } from './components/my-dashboard/my-dashboard.component';
import { DataSummaryComponent } from './components/data-summary/data-summary.component';
import { FilterBuilderComponent } from './components/filter-builder/filter-builder.component';
import { CalculatedColumnsComponent } from './components/calculated-columns/calculated-columns.component';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: '/upload', 
    pathMatch: 'full' 
  },
  { 
    path: 'upload', 
    component: UploadExcelComponent 
  },
  { 
    path: 'auto-analytics', 
    component: AutoChartsComponent 
  },
  { 
    path: 'dashboard-builder', 
    component: DashboardBuilderComponent 
  },
  { 
    path: 'my-dashboard', 
    component: MyDashboardComponent 
  },
  { 
    path: 'data-summary', 
    component: DataSummaryComponent 
  },
  { 
    path: 'filter-builder', 
    component: FilterBuilderComponent 
  },
  { 
    path: 'calculated-columns', 
    component: CalculatedColumnsComponent 
  },
  {
    path: '404',
    loadComponent: () => import('./components/error-page/error-page.component')
      .then(m => m.ErrorPageComponent)
  },
  { 
    path: '**', 
    redirectTo: '/404' 
  }
];