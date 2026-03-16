#!/usr/bin/env python3
"""
Generate test data for LLM load testing
Creates sample CSV files and uploads them for multiple users
"""

import csv
import random
import httpx
import asyncio
from datetime import datetime, timedelta
import argparse


def generate_sample_csv(filename: str, num_rows: int = 50):
    """Generate a sample restaurant data CSV file"""
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        
        # Header
        writer.writerow([
            'date', 'menu_item', 'quantity_ordered', 'quantity_sold', 
            'quantity_wasted', 'ingredient_cost', 'selling_price', 
            'total_revenue', 'customer_count', 'time_of_day', 
            'weather_condition', 'special_event', 'time_of_order'
        ])
        
        # Sample data
        menu_items = ['Sushi Roll', 'Taco Combo', 'Burger', 'Pasta', 'Pizza', 'Salad', 'Soup']
        time_of_day = ['breakfast', 'lunch', 'dinner', 'late_night']
        weather = ['sunny', 'rainy', 'cloudy', 'windy']
        special_event = ['none', 'holiday', 'sports_event', 'music_night', 'festival']
        
        # Generate rows
        for i in range(num_rows):
            date = datetime.now() - timedelta(days=random.randint(0, 60))
            item = random.choice(menu_items)
            qty_ordered = random.randint(20, 100)
            qty_sold = random.randint(int(qty_ordered * 0.6), qty_ordered)
            qty_wasted = qty_ordered - qty_sold
            
            ingredient_cost = round(random.uniform(5.0, 15.0), 2)
            selling_price = round(ingredient_cost * random.uniform(2.0, 3.5), 2)
            total_revenue = round(qty_sold * selling_price, 2)
            
            writer.writerow([
                date.strftime('%Y-%m-%d'),
                item,
                qty_ordered,
                qty_sold,
                qty_wasted,
                ingredient_cost,
                selling_price,
                total_revenue,
                random.randint(10, 50),
                random.choice(time_of_day),
                random.choice(weather),
                random.choice(special_event),
                f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}"
            ])
    
    print(f"Generated {filename} with {num_rows} rows")


async def upload_csv(base_url: str, filename: str, user_id: int, label: str = None):
    """Upload a CSV file to the server"""
    if label is None:
        label = f"test_data_user_{user_id}"
    
    print(f"Uploading {filename} for user {user_id}...")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            with open(filename, 'rb') as f:
                files = {'file': (filename, f)}
                data = {
                    'user_id': user_id,
                    'label': label,
                    'notes': f'Test data generated at {datetime.now()}'
                }
                
                response = await client.post(
                    f"{base_url}/data/upload",
                    files=files,
                    data=data
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"  ✓ Uploaded successfully: ID={result.get('id')}, Label={result.get('label')}")
                    return result
                else:
                    print(f"  ✗ Upload failed: {response.status_code} - {response.text}")
                    return None
        except Exception as e:
            print(f"  ✗ Upload error: {e}")
            return None


async def setup_test_users(base_url: str, num_users: int, start_user_id: int = 1):
    """Generate test data for multiple users"""
    print(f"\n{'='*60}")
    print(f"Generating Test Data")
    print(f"{'='*60}")
    print(f"Number of Users: {num_users}")
    print(f"Starting User ID: {start_user_id}")
    print(f"{'='*60}\n")
    
    uploads = []
    for i in range(num_users):
        user_id = start_user_id + i
        filename = f"test_data_user_{user_id}.csv"
        
        # Generate CSV
        generate_sample_csv(filename, num_rows=random.randint(30, 100))
        
        # Upload CSV
        result = await upload_csv(base_url, filename, user_id)
        if result:
            uploads.append({"user_id": user_id, "file_id": result.get('id')})
        
        # Small delay to avoid overwhelming the server
        await asyncio.sleep(0.5)
    
    print(f"\n{'='*60}")
    print(f"Setup Complete")
    print(f"{'='*60}")
    print(f"Successfully set up {len(uploads)} users")
    print(f"Ready to run load tests!")
    print(f"{'='*60}\n")
    
    return uploads


def main():
    parser = argparse.ArgumentParser(description="Generate and upload test data")
    parser.add_argument("--base-url", default="http://mise-ai.local/api",
                       help="Base URL of the API server")
    parser.add_argument("--users", type=int, default=5,
                       help="Number of users to create test data for")
    parser.add_argument("--start-user-id", type=int, default=1,
                       help="Starting user ID")
    
    args = parser.parse_args()
    
    asyncio.run(setup_test_users(args.base_url, args.users, args.start_user_id))


if __name__ == "__main__":
    main()

