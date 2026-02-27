from database import SessionLocal, engine, Base, Region, Company, DataCenter
import random

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()

# 1. Authentic Commercial Rates ($/kWh) and IATA City Codes
regions_data = {
    "Northern Virginia": {"cap": 4500, "rate": 0.085, "code": "IAD"},
    "Texas": {"cap": 3200, "rate": 0.065, "code": "DFW"},
    "Oregon": {"cap": 2800, "rate": 0.052, "code": "PDX"}, # Cheap hydro
    "Ohio": {"cap": 2200, "rate": 0.075, "code": "CMH"},
    "São Paulo": {"cap": 1200, "rate": 0.140, "code": "GRU"},
    "Montreal": {"cap": 1500, "rate": 0.045, "code": "YUL"}, # Cheapest hydro
    "Ireland": {"cap": 1800, "rate": 0.165, "code": "DUB"},
    "Frankfurt": {"cap": 2100, "rate": 0.210, "code": "FRA"}, # Very expensive
    "London": {"cap": 1600, "rate": 0.235, "code": "LHR"},
    "Cape Town": {"cap": 600, "rate": 0.105, "code": "CPT"},
    "Tokyo": {"cap": 2500, "rate": 0.220, "code": "HND"},
    "Singapore": {"cap": 1100, "rate": 0.265, "code": "SIN"}, # Most constrained/expensive
    "Sydney": {"cap": 1400, "rate": 0.170, "code": "SYD"},
    "Mumbai": {"cap": 1700, "rate": 0.115, "code": "BOM"},
    "Seoul": {"cap": 1300, "rate": 0.125, "code": "ICN"},
    "Reykjavik": {"cap": 900, "rate": 0.035, "code": "KEF"}   # Geothermal heaven
}

cloud_codes = {
    "Northern Virginia": "us-east-1", "Texas": "us-south-1", "Oregon": "us-west-2", 
    "Ohio": "us-east-2", "São Paulo": "sa-east-1", "Montreal": "ca-central-1", 
    "Ireland": "eu-west-1", "Frankfurt": "eu-central-1", "London": "eu-west-2", 
    "Cape Town": "af-south-1", "Tokyo": "ap-northeast-1", "Singapore": "ap-southeast-1", 
    "Sydney": "ap-southeast-2", "Mumbai": "ap-south-1", "Seoul": "ap-northeast-2", 
    "Reykjavik": "eu-north-2"
}

regions = {}
for name, data in regions_data.items():
    r = Region(name=name, available_capacity_mw=data["cap"], electricity_cost_kwh=data["rate"])
    db.add(r)
    regions[name] = r

companies = {name: Company(name=name) for name in ["Microsoft", "Google", "Meta", "Amazon AWS", "Oracle"]}
for c in companies.values(): db.add(c)
db.commit()

data_centers = []
zones = ["a", "b", "c", "d", "e", "f"]

for _ in range(850):
    comp_name = random.choice(list(companies.keys()))
    reg_name = random.choices(
        list(regions.keys()), 
        weights=[15, 10, 8, 8, 4, 5, 8, 9, 7, 3, 10, 4, 5, 6, 5, 3], k=1
    )[0]
    
    az_code = f"{cloud_codes[reg_name]}{random.choice(zones)}"
    city_code = regions_data[reg_name]["code"]
    
    dc = DataCenter(
        company_id=companies[comp_name].id,
        region_id=regions[reg_name].id,
        # NEW: Injects the city initial exactly as requested: us-east-1a (IAD)
        location=f"{az_code} ({city_code})", 
        power_demand_mw=random.randint(15, 120),
        pue=round(random.uniform(1.10, 1.45), 2)
    )
    data_centers.append(dc)

db.bulk_save_objects(data_centers)
db.commit()
db.close()
print("Successfully generated 850+ Data Centers with Real Commercial Rates & City Codes!")