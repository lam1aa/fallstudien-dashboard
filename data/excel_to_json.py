import pandas as pd
import json
import os

def excel_to_json(excel_path, output_dir):
    try:
        # Read all sheets from the Excel file
        # sheet_name=None returns a dictionary of all sheets
        excel_data = pd.read_excel(excel_path, sheet_name=None)
        
        # Ensure output directory exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        for sheet_name, df in excel_data.items():
            # Drop rows and columns that are completely empty
            df = df.dropna(how='all', axis=0).dropna(how='all', axis=1)
            
            # Replace Pandas NaN/NaT values with None so json.dump outputs 'null'
            df = df.where(pd.notnull(df), None)
            
            # Convert the dataframe to a list of dictionaries
            records = df.to_dict(orient='records')
            
            # Create a safe filename for the JSON (replace non-alphanumeric chars with underscores)
            safe_sheet_name = "".join([c if c.isalnum() else "_" for c in sheet_name]).strip("_")
            # Replace multiple underscores with a single one
            import re
            safe_sheet_name = re.sub(r'_+', '_', safe_sheet_name)
            
            json_filename = f"{safe_sheet_name}.json"
            json_path = os.path.join(output_dir, json_filename)
            
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(records, f, indent=4, ensure_ascii=False)
                
            print(f"Successfully converted sheet '{sheet_name}' -> {json_filename}")
            
    except Exception as e:
        print(f"Error processing Excel file: {e}")

if __name__ == '__main__':
    # Define paths relative to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    excel_file = os.path.join(script_dir, 'data.xlsx')
    
    if os.path.exists(excel_file):
        excel_to_json(excel_file, script_dir)
    else:
        print(f"Could not find {excel_file}. Please ensure data.xlsx is in the same folder.")
