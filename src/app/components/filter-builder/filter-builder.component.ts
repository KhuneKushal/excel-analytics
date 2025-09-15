import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { DataProfilerService } from '../../services/data-profiler.service';

interface FilterCondition {
  column: string;
  operator: string;
  value: any;
  value2?: any;
}

@Component({
  selector: 'app-filter-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  templateUrl: './filter-builder.component.html',
  styleUrls: ['./filter-builder.component.scss']
})
export class FilterBuilderComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dashboardService = inject(DashboardService);
  private dataProfilerService = inject(DataProfilerService);
  private destroy$ = new Subject<void>();

  filterForm: FormGroup;
  availableColumns: string[] = [];
  columnDataTypes: { [key: string]: string } = {};

  operators: { [key: string]: { label: string; value: string }[] } = {
    string: [
      { label: 'Equals', value: '==' },
      { label: 'Contains', value: 'contains' },
      { label: 'Starts With', value: 'startsWith' },
      { label: 'Ends With', value: 'endsWith' },
      { label: 'Not Equals', value: '!=' }
    ],
    number: [
      { label: 'Equals', value: '==' },
      { label: 'Not Equals', value: '!=' },
      { label: 'Greater Than', value: '>' },
      { label: 'Less Than', value: '<' },
      { label: 'Greater Than or Equal', value: '>=' },
      { label: 'Less Than or Equal', value: '<=' },
      { label: 'Between', value: 'between' }
    ],
    date: [
      { label: 'Equals', value: '==' },
      { label: 'Before', value: '<' },
      { label: 'After', value: '>' },
      { label: 'Between', value: 'between' }
    ],
    boolean: [
      { label: 'Is True', value: '==true' },
      { label: 'Is False', value: '==false' }
    ]
  };

  constructor() {
    this.filterForm = this.fb.group({
      conditions: this.fb.array([])
    });
  }

  ngOnInit(): void {
    this.dashboardService.currentData
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data?.length) {
          this.availableColumns = Object.keys(data[0]);
          const profiledData: any = this.dataProfilerService.profileData(data);
          this.columnDataTypes = Object.keys(profiledData).reduce((acc: { [key: string]: string }, key) => {
  acc[key] = profiledData[key].type;
  return acc;
}, {}); 
        }
      });

    this.addCondition();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get conditions(): FormArray {
    return this.filterForm.get('conditions') as FormArray;
  }

  addCondition(): void {
    const group = this.fb.group({
      column: ['', Validators.required],
      operator: ['', Validators.required],
      value: ['', Validators.required],
      value2: ['']
    });

    group.get('operator')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(op => {
        const value2Control = group.get('value2');
        if (op === 'between') {
          value2Control?.setValidators(Validators.required);
        } else {
          value2Control?.clearValidators();
        }
        value2Control?.updateValueAndValidity();
      });

    this.conditions.push(group);
  }

  removeCondition(index: number): void {
    this.conditions.removeAt(index);
  }

  getOperatorsForColumn(columnName: string): { label: string; value: string }[] {
    const type = this.columnDataTypes[columnName];
    return type ? this.operators[type] || [] : [];
  }

  needsSecondValue(operator: string): boolean {
    return operator === 'between';
  }

  applyFilters(): void {
    if (this.filterForm.valid) {
      const filters: FilterCondition[] = this.filterForm.value.conditions;
      this.dashboardService.setFilters(filters);
      console.log('Applied Filters:', filters);
    } else {
      console.warn('Form is invalid');
      this.filterForm.markAllAsTouched();
    }
  }
}