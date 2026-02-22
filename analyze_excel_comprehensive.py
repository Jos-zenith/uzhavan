import openpyxl
import pandas as pd
import json
from pathlib import Path
from collections import Counter

# Path to the Excel file
excel_path = r"c:\Users\Zenith Joshua\Desktop\vict\my-app\data\Farms Stock Report.xlsx"

# Check if file exists
if not Path(excel_path).exists():
    print(f"Error: File not found at {excel_path}")
    exit(1)

# Load workbook with openpyxl
wb = openpyxl.load_workbook(excel_path)
sheet_names = wb.sheetnames

print("Excel File Analysis")
print("=" * 80)
print(f"File: {excel_path}")
print(f"Sheet names: {sheet_names}\n")

# Analysis results
analysis = {
    "file_path": str(excel_path),
    "sheet_names": sheet_names,
    "sheets": {}
}

# Analyze each sheet
for sheet_name in sheet_names:
    print(f"\nAnalyzing sheet: {sheet_name}")
    print("-" * 80)
    
    try:
        # Read sheet with pandas
        df = pd.read_excel(excel_path, sheet_name=sheet_name)
        
        # Get dimensions
        num_rows = len(df)
        num_cols = len(df.columns)
        
        print(f"  Dimensions: {num_rows} rows × {num_cols} columns")
        print(f"  Columns: {list(df.columns)}")
        
        # Analyze data types
        dtype_info = {}
        for col in df.columns:
            dtype_info[col] = str(df[col].dtype)
        
        print(f"  Data types: {dtype_info}")
        
        # Get sample rows
        sample_rows = df.head(5).values.tolist()
        
        # Analyze patterns and content
        patterns = {}
        location_cols = []
        crop_cols = []
        stock_cols = []
        outlet_cols = []
        
        for col in df.columns:
            col_lower = col.lower()
            
            # Identify column types by name
            if any(keyword in col_lower for keyword in ['location', 'place', 'area', 'region', 'district', 'state', 'address']):
                location_cols.append(col)
            if any(keyword in col_lower for keyword in ['crop', 'variety', 'seed', 'seedling', 'type', 'name']):
                crop_cols.append(col)
            if any(keyword in col_lower for keyword in ['stock', 'quantity', 'qty', 'count', 'amount', 'units']):
                stock_cols.append(col)
            if any(keyword in col_lower for keyword in ['outlet', 'store', 'shop', 'seller', 'vendor']):
                outlet_cols.append(col)
            
            # Get unique value counts for categorical columns
            if df[col].dtype == 'object':
                unique_count = df[col].nunique()
                unique_vals = df[col].unique()[:10].tolist()
                patterns[col] = {
                    "type": "categorical",
                    "unique_count": unique_count,
                    "sample_values": [str(v) for v in unique_vals]
                }
            else:
                # For numeric columns
                patterns[col] = {
                    "type": "numeric",
                    "min": float(df[col].min()) if df[col].notna().any() else None,
                    "max": float(df[col].max()) if df[col].notna().any() else None,
                    "mean": float(df[col].mean()) if df[col].notna().any() else None,
                    "non_null_count": int(df[col].notna().sum())
                }
        
        sheet_analysis = {
            "dimensions": {
                "rows": num_rows,
                "columns": num_cols
            },
            "column_names": list(df.columns),
            "data_types": dtype_info,
            "sample_rows": sample_rows,
            "patterns": patterns,
            "identified_fields": {
                "location_fields": location_cols,
                "crop_fields": crop_cols,
                "stock_fields": stock_cols,
                "outlet_fields": outlet_cols
            }
        }
        
        analysis["sheets"][sheet_name] = sheet_analysis
        
        print(f"  Sample data (first 5 rows):")
        for i, row in enumerate(sample_rows[:5], 1):
            print(f"    Row {i}: {row}")
        
        print(f"\n  Identified field types:")
        print(f"    Location fields: {location_cols}")
        print(f"    Crop/Variety fields: {crop_cols}")
        print(f"    Stock/Quantity fields: {stock_cols}")
        print(f"    Outlet/Store fields: {outlet_cols}")
        
    except Exception as e:
        print(f"  Error analyzing sheet: {str(e)}")
        analysis["sheets"][sheet_name] = {"error": str(e)}

# Output comprehensive JSON
output_path = r"c:\Users\Zenith Joshua\Desktop\vict\excel_analysis.json"
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(analysis, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 80)
print(f"Analysis saved to: {output_path}")
print("\nJSON Analysis Output:")
print(json.dumps(analysis, indent=2, ensure_ascii=False))
