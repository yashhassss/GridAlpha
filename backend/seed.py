from database import SessionLocal, Company, Region, DataCenter, Base, engine

def seed_data():
    # Wipe the old database clean for the upgrade
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Add Major Global Power Grids + Wholesale Electricity Costs ($/kWh)
    va = Region(name="Northern Virginia", total_capacity_mw=2500.0, available_capacity_mw=450.0, electricity_cost_kwh=0.08)
    ie = Region(name="Ireland (Dublin)", total_capacity_mw=1200.0, available_capacity_mw=150.0, electricity_cost_kwh=0.14)
    tx = Region(name="Texas (Dallas)", total_capacity_mw=3000.0, available_capacity_mw=800.0, electricity_cost_kwh=0.06)
    oh = Region(name="Ohio (New Albany)", total_capacity_mw=1500.0, available_capacity_mw=300.0, electricity_cost_kwh=0.07)
    
    # Add the Hyperscalers
    msft = Company(name="Microsoft", ticker="MSFT")
    goog = Company(name="Google", ticker="GOOGL")
    meta = Company(name="Meta", ticker="META")
    aws = Company(name="Amazon AWS", ticker="AMZN")
    
    db.add_all([va, ie, tx, oh, msft, goog, meta, aws])
    db.commit()

    # Add the Assets with PUE (1.0 is perfect, 1.5 is highly inefficient)
    assets = [
        DataCenter(location="Ashburn, VA", power_demand_mw=120.0, pue=1.35, company_id=msft.id, region_id=va.id),
        DataCenter(location="Grange Castle", power_demand_mw=85.0, pue=1.15, company_id=goog.id, region_id=ie.id),
        DataCenter(location="Fort Worth, TX", power_demand_mw=150.0, pue=1.40, company_id=meta.id, region_id=tx.id),
        DataCenter(location="New Albany, OH", power_demand_mw=210.0, pue=1.20, company_id=aws.id, region_id=oh.id),
        DataCenter(location="Boydton, VA", power_demand_mw=180.0, pue=1.25, company_id=msft.id, region_id=va.id)
    ]
    
    db.add_all(assets)
    db.commit()
    db.close()
    print("Vault upgraded: Physics (PUE) and Financials ($/kWh) successfully injected!")

if __name__ == "__main__":
    seed_data()