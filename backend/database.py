import os
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, Float, ForeignKey, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

# Load the hidden variables from the .env file
load_dotenv()

# Pull the entire connection string securely
DATABASE_URL = os.getenv("DATABASE_URL")

# Make sure it doesn't try to connect if the URL is missing
if not DATABASE_URL:
    raise ValueError("No DATABASE_URL found in environment variables!")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Region(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    total_capacity_mw = Column(Float)             
    available_capacity_mw = Column(Float)         
    electricity_cost_kwh = Column(Float) # NEW: Financial Alpha

class Company(Base):
    __tablename__ = "companies"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)            
    ticker = Column(String, unique=True)          

class DataCenter(Base):
    __tablename__ = "data_centers"
    id = Column(Integer, primary_key=True, index=True)
    location = Column(String)
    power_demand_mw = Column(Float)               
    pue = Column(Float)                  # NEW: Thermal Dynamics (Power Usage Effectiveness)
    company_id = Column(Integer, ForeignKey("companies.id"))
    region_id = Column(Integer, ForeignKey("regions.id"))
    
    company = relationship("Company")
    region = relationship("Region")

# This command physically creates the tables in PostgreSQL
def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully in the 'aipower' database!")

if __name__ == "__main__":
    create_tables()