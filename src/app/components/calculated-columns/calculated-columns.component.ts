import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DashboardService } from '../../services/dashboard.service';
import { Parser } from 'expr-eval';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-calculated-columns',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    ReactiveFormsModule
  ],
  templateUrl: './calculated-columns.component.html',
  styleUrls: ['./calculated-columns.component.scss']
})
export class CalculatedColumnsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dashboardService = inject(DashboardService);
  private snackBar = inject(MatSnackBar);

  // Form group for the calculated column name and formula.
  calculatedColumnForm = this.fb.group({
    columnName: ['', Validators.required],
    formula: ['', Validators.required]
  });

  availableColumns: string[] = [];

  // Subscribes to data updates to get the available columns.
  ngOnInit(): void {
    this.dashboardService.getRawData().subscribe(data => {
      if (data && data.length > 0) {
        this.availableColumns = Object.keys(data[0]);
      }
    });
  }

  // Adds a new column to the dataset based on a user-defined formula.
  addCalculatedColumn(): void {
    if (this.calculatedColumnForm.invalid) {
      this.snackBar.open('Please fill in all fields.', 'Close', { duration: 3000 });
      return;
    }

    const { columnName, formula } = this.calculatedColumnForm.value;

    if (!columnName || !formula) {
      return; // Should be caught by form validation, but for type safety
    }

    this.dashboardService.getRawData().subscribe(data => {
      if (!data || data.length === 0) {
        this.snackBar.open('No data loaded to add calculated column.', 'Close', { duration: 3000 });
        return;
      }

      if (this.availableColumns.includes(columnName)) {
        this.snackBar.open(`Column '''${columnName}''' already exists. Please choose a different name.`, 'Close', { duration: 3000 });
        return;
      }

      try {
        const parser = new Parser();
        const expression = parser.parse(formula);

        const newData = data.map(row => {
          const scope: { [key: string]: any } = {};
          this.availableColumns.forEach(col => {
            scope[col] = row[col];
          });

          try {
            const result = expression.evaluate(scope);
            return { ...row, [columnName]: result };
          } catch (evalError: any) {
            console.warn(`Error evaluating formula for row: ${JSON.stringify(row)}. Error: ${evalError.message}`);
            return { ...row, [columnName]: null }; // Assign null on error
          }
        });

        this.dashboardService.setData(newData);
        this.snackBar.open(`Calculated column '''${columnName}''' added successfully.`, 'Close', { duration: 3000 });
        this.calculatedColumnForm.reset();
      } catch (parseError: any) {
        this.snackBar.open(`Error parsing formula: ${parseError.message}`, 'Close', { duration: 5000 });
      }
    });
  }
}