from app.core.database import SessionLocal
from app.models.domain import PoultryBatch, PoultryFeedLog, PoultryHealthLog, PoultryEggLog
from datetime import datetime, timedelta
import random

db = SessionLocal()

# Try to find a batch to populate
batch = db.query(PoultryBatch).filter(PoultryBatch.status == 'active').first()

if not batch:
    print("No active batch found to populate.")
    exit()

print(f"Populating data for batch {batch.id} ({batch.batch_type})")

# Clear old logs
db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id == batch.id).delete()
db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id == batch.id).delete()
db.query(PoultryEggLog).filter(PoultryEggLog.batch_id == batch.id).delete()

# Generate 35 days of data
start_date = datetime.utcnow() - timedelta(days=35)
batch.arrival_date = start_date.date()
batch.initial_quantity = 5000
batch.current_quantity = 5000
db.commit()

current_qty = 5000
total_feed_kg = 0

for day in range(1, 36):
    log_date = start_date + timedelta(days=day)
    
    # 1. Health Log (Mortality)
    # Higher mortality in first week, then stabilizes
    if day <= 7:
        deaths = random.randint(2, 8)
    else:
        deaths = random.randint(0, 3)
        
    current_qty -= deaths
    
    db.add(PoultryHealthLog(
        batch_id=batch.id,
        date=log_date.date(),
        event_type="inspection",
        description="Routine daily check",
        deaths_today=deaths,
        notes="Automated mock data",
        created_by_id=1
    ))
    
    # 2. Feed Log (Growth & FCR)
    # Broiler feed intake increases over time
    daily_feed = (current_qty * (20 + day * 4)) / 1000.0 # kg
    total_feed_kg += daily_feed
    
    # Target weight based on Ross 308 approx
    expected_weight_g = 42 + (day ** 1.8) * 3
    # Add some noise
    actual_weight = expected_weight_g * random.uniform(0.95, 1.02)
    
    # Calculate FCR
    total_biomass_kg = (current_qty * actual_weight) / 1000.0
    initial_biomass_kg = (5000 * 42) / 1000.0
    weight_gain = total_biomass_kg - initial_biomass_kg
    
    fcr = total_feed_kg / weight_gain if weight_gain > 0 else 0
    
    db.add(PoultryFeedLog(
        batch_id=batch.id,
        date=log_date.date(),
        feed_type="croissance" if day > 14 else "démarrage",
        quantity_kg=daily_feed,
        cost_per_kg=0.45,
        fcr_calculated=round(fcr, 3),
        created_by_id=1
    ))
    
    # 3. Egg log (only if layer, but let's add some anyway if > 120 days. Since it's day 35, no eggs yet usually, but let's fake it if it's a layer)
    if "layer" in str(batch.batch_type).lower() and day > 20:
        rate = 0.85 + random.uniform(-0.05, 0.05)
        eggs = int(current_qty * rate)
        db.add(PoultryEggLog(
            batch_id=batch.id,
            date=log_date.date(),
            total_eggs=eggs,
            production_rate=round(rate * 100, 2),
            created_by_id=1
        ))

batch.current_quantity = current_qty
db.commit()
print("Data populated successfully!")
