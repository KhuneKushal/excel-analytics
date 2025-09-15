# Excel Analytics

A powerful, web-based tool designed to bring your Excel and CSV data to life. Upload your files, and instantly generate insightful summaries, create dynamic charts, and build custom dashboards. This tool empowers you to explore your data, uncover trends, and visualize information with an intuitive drag-and-drop interface.

## Key Features

- **Excel/CSV Upload:** Easily upload your `.xlsx` or `.csv` files to start the analysis.
- **Data Profiling:** Get an instant summary of your data, including column statistics (mean, median, mode), data types, and missing value counts.
- **Dynamic Charting:**
  - **Auto-Charts:** Automatically suggests and generates charts based on your data analysis.
  - **Custom Charts:** Create a variety of charts, including bar, line, pie, and scatter plots.
- **Dashboard Builder:**
  - Drag-and-drop interface to design your own dashboards.
  - Add, remove, and resize charts and data summaries.
- **Advanced Filtering:**
  - Build complex filters for any column to drill down into your data.
  - Apply filters globally across your dashboard.
- **Calculated Columns:** Create new columns on the fly using mathematical expressions to derive new insights.
- **Data Export:** Export your dashboards as PDFs or the underlying data as CSVs.
- **Theming:** Switch between light and dark modes for comfortable viewing.

## Tech Stack

- **Frontend:**
  - [Angular](https://angular.io/) (^20.1.0)
  - [TypeScript](https://www.typescriptlang.org/)
  - [SCSS](https://sass-lang.com/)
- **UI Components:**
  - [Angular Material](https://material.angular.io/)
- **Charting:**
  - [Chart.js](https://www.chartjs.org/)
  - [ng2-charts](https://www.npmjs.com/package/ng2-charts)
- **Data Processing:**
  - [xlsx](https://www.npmjs.com/package/xlsx) for parsing Excel files.
  - [Papaparse](https://www.papaparse.com/) for parsing CSV files.
  - [expr-eval](https://www.npmjs.com/package/expr-eval) for calculated columns.
- **Backend & Deployment:**
  - [Node.js](https://nodejs.org/) with [Express](https://expressjs.com/) for the server.
  - Deployed on [Vercel](https://vercel.com/).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22.x)
- [Angular CLI](https://angular.io/cli)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd excel-analytics
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

To run the application in development mode with server-side rendering (SSR):

```bash
npm run dev:ssr
```

The application will be available at `http://localhost:4200`.

## Build

To create a production build of the application:

```bash
npm run build
```

The build artifacts will be stored in the `dist/excel-analytics/` directory.

## Available Scripts

- `ng`: Run Angular CLI commands.
- `start`: Start the production server.
- `build`: Build the application for production.

