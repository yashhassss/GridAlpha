from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import requests
import time

from fastapi.responses import StreamingResponse
import pandas as pd
import io
# --- PDF GENERATION IMPORTS ---
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet

from database import SessionLocal, DataCenter
from ml_engine import run_monte_carlo_power_sim

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

class SimulationRequest(BaseModel):
    target_company: str
    extra_mw: float
    hardware_type: str = "H100"

class OptimizeRequest(BaseModel):
    target_company: str
    requested_mw: float
    hardware_type: str = "H100"

WEATHER_CACHE = {}
CACHE_TTL = 300 

REGION_COORDS = {
    "IAD": (39.04, -77.48), "DFW": (29.42, -98.49), "PDX": (45.59, -121.18),
    "CMH": (39.96, -82.99), "GRU": (-23.55, -46.63), "YUL": (45.50, -73.56),
    "DUB": (53.34, -6.26), "FRA": (50.11, 8.68), "LHR": (51.50, -0.12),
    "CPT": (-33.92, 18.42), "HND": (35.68, 139.69), "SIN": (1.35, 103.81),
    "SYD": (-33.86, 151.20), "BOM": (19.07, 72.87), "ICN": (37.56, 126.97),
    "KEF": (64.12, -21.82)
}

def get_live_weather(city_code: str):
    now = time.time()
    if city_code in WEATHER_CACHE and now - WEATHER_CACHE[city_code]['timestamp'] < CACHE_TTL:
        return WEATHER_CACHE[city_code]['temp']

    coords = REGION_COORDS.get(city_code, (0, 0))
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={coords[0]}&longitude={coords[1]}&current_weather=true"
        res = requests.get(url, timeout=3).json()
        temp = res["current_weather"]["temperature"]
    except:
        temp = 20.0 
        
    WEATHER_CACHE[city_code] = {'temp': temp, 'timestamp': now}
    return temp

def apply_hardware_physics(hw_type: str, raw_mw: float, base_pue: float):
    multiplier, pue_penalty = 1.0, 0.0
    if hw_type == "A100": multiplier, pue_penalty = 0.7, -0.05
    elif hw_type == "AMD_MI300X": multiplier, pue_penalty = 1.15, +0.02
    elif hw_type == "B200": multiplier, pue_penalty = 2.0, +0.15 
    elif hw_type == "GB200_NVL72": multiplier, pue_penalty = 3.5, -0.10 
    elif hw_type == "TPU_v5p": multiplier, pue_penalty = 0.9, -0.02 
    return raw_mw * multiplier, round(base_pue + pue_penalty, 2)

def get_live_metrics(location: str, base_pue: float, base_rate: float, hw_pue_penalty: float = 0.0):
    try: city_code = location.split("(")[1].split(")")[0]
    except: city_code = "IAD"
    
    live_temp_c = get_live_weather(city_code)
    
    # 1. Smooth PUE Thermodynamics
    temp_diff = live_temp_c - 15.0
    weather_pue_impact = max(-0.15, min(0.35, temp_diff * 0.007))
    live_pue = round(base_pue + hw_pue_penalty + weather_pue_impact, 2)
    
    # 2. Continuous U-Shaped LMP Pricing Curve
    lmp_multiplier = 1.0
    if live_temp_c > 25.0:
        lmp_multiplier = 1.0 + ((live_temp_c - 25.0)**2 * 0.015)
    elif live_temp_c < 5.0:
        lmp_multiplier = 1.0 + ((5.0 - live_temp_c)**2 * 0.008)
    
    # Cap multiplier at 5.0x to prevent extreme weather anomalies from destroying the math
    lmp_multiplier = min(lmp_multiplier, 5.0)
    live_rate = base_rate * lmp_multiplier
    
    # 3. Time-Weighted Daily Blending
    # Assume the extreme weather spike only dictates 4 hours of the day
    peak_hours = 4.0
    off_peak_hours = 20.0
    blended_daily_rate = ((live_rate * peak_hours) + (base_rate * off_peak_hours)) / 24.0
    
    # Return 5 variables now (including the blended rate)
    return live_temp_c, live_pue, live_rate, lmp_multiplier > 1.5, blended_daily_rate

@app.get("/api/power-alpha")
def get_power_data(db: Session = Depends(get_db)):
    results = db.query(DataCenter).all()
    formatted_data = []
    for dc in results:
        live_temp_c, live_pue, live_rate, lmp_active, blended_rate = get_live_metrics(dc.location, dc.pue, dc.region.electricity_cost_kwh)
        
        median_crash_year, trajectory, risks = run_monte_carlo_power_sim(dc.power_demand_mw, dc.region.available_capacity_mw, live_pue)
        true_mw = dc.power_demand_mw * live_pue
        formatted_data.append({
            "company": dc.company.name, "location": dc.location, "region": dc.region.name,
            "demand": dc.power_demand_mw, "true_thermal_demand": round(true_mw, 1),
            "pue": live_pue, "live_temp_c": round(live_temp_c, 1), "lmp_active": lmp_active,
            "daily_opex": (true_mw * 1000) * 24 * blended_rate, # Fixed math using blended rate
            "power_wall_year": median_crash_year, "risks_by_year": risks, "trajectory": trajectory
        })
    return {"status": "success", "data": formatted_data}

@app.post("/api/simulate")
def simulate_scenario(req: SimulationRequest, db: Session = Depends(get_db)):
    results = db.query(DataCenter).all()
    
    company_dcs = [dc for dc in results if dc.company.name == req.target_company]
    num_dcs = len(company_dcs)
    distributed_mw = req.extra_mw / num_dcs if num_dcs > 0 else 0

    formatted_data = []
    for dc in results:
        sim_demand = dc.power_demand_mw
        hw_pue_penalty = 0.0
        
        if dc.company.name == req.target_company and req.extra_mw > 0:
            actual_extra, test_pue = apply_hardware_physics(req.hardware_type, distributed_mw, dc.pue)
            sim_demand += actual_extra
            hw_pue_penalty = test_pue - dc.pue

        live_temp_c, live_pue, live_rate, lmp_active, blended_rate = get_live_metrics(dc.location, dc.pue, dc.region.electricity_cost_kwh, hw_pue_penalty)

        median_crash_year, trajectory, risks = run_monte_carlo_power_sim(sim_demand, dc.region.available_capacity_mw, live_pue)
        true_mw = sim_demand * live_pue
        formatted_data.append({
            "company": dc.company.name, "location": dc.location, "region": dc.region.name,
            "demand": round(sim_demand, 1), "true_thermal_demand": round(true_mw, 1),
            "pue": live_pue, "live_temp_c": round(live_temp_c, 1), "lmp_active": lmp_active,
            "daily_opex": (true_mw * 1000) * 24 * blended_rate, # Fixed math using blended rate
            "power_wall_year": median_crash_year, "risks_by_year": risks, "trajectory": trajectory
        })
    return {"status": "success", "data": formatted_data}

@app.post("/api/optimize")
def optimize_allocation(req: OptimizeRequest, db: Session = Depends(get_db)):
    company_dcs = [dc for dc in db.query(DataCenter).all() if dc.company.name == req.target_company]
    actual_req_mw, test_pue = apply_hardware_physics(req.hardware_type, req.requested_mw, 1.0)
    hw_pue_penalty = test_pue - 1.0
    if not company_dcs: return {"status": "error"}

    dc_costs = []
    for dc in company_dcs:
        grid_room = max(0, dc.region.available_capacity_mw - dc.power_demand_mw - 10)
        loc = dc.location
        if "SIN" in loc or "LHR" in loc or "FRA" in loc or "GRU" in loc: physical_rack_limit_mw = 30
        elif "YUL" in loc or "DUB" in loc or "CPT" in loc or "BOM" in loc: physical_rack_limit_mw = 80
        else: physical_rack_limit_mw = 250
        available_room = min(grid_room, physical_rack_limit_mw)
        
        live_temp_c, live_pue, live_rate, lmp_active, blended_rate = get_live_metrics(loc, dc.pue, dc.region.electricity_cost_kwh, hw_pue_penalty)
        
        dc_costs.append({
            "location": loc, "live_temp_c": round(live_temp_c, 1), "base_rate": dc.region.electricity_cost_kwh,
            "live_rate": round(live_rate, 3), "lmp_active": lmp_active, "pue": live_pue,
            "cost_per_mw_day": 1 * live_pue * 1000 * 24 * blended_rate, # Fixed math using blended rate
            "available_room": available_room
        })
    
    baseline_cost_per_mw_day = sum(d["cost_per_mw_day"] for d in dc_costs) / len(dc_costs)
    dc_costs.sort(key=lambda x: x["cost_per_mw_day"])
    
    allocations, remaining_mw, total_optimized_cost = [], actual_req_mw, 0
    for dc in dc_costs:
        if remaining_mw <= 0: break
        alloc = min(remaining_mw, dc["available_room"])
        if alloc > 0:
            daily_cost = alloc * dc["cost_per_mw_day"]
            route_savings = (alloc * baseline_cost_per_mw_day) - daily_cost
            allocations.append({
                "location": dc["location"], "allocated_mw": round(alloc, 1),
                "live_temp_c": dc["live_temp_c"], "live_rate": dc["live_rate"],
                "lmp_active": dc["lmp_active"], "pue": dc["pue"],
                "daily_cost": round(daily_cost, 2), "route_savings": round(route_savings, 2)
            })
            total_optimized_cost += daily_cost
            remaining_mw -= alloc
            
    total_savings = (actual_req_mw * baseline_cost_per_mw_day) - total_optimized_cost
    
    return {
        "status": "success", "allocations": allocations, "unallocated_mw": round(remaining_mw, 1),
        "optimized_daily_cost": total_optimized_cost, "daily_savings_vs_worst": total_savings, "true_mw_processed": actual_req_mw
    }

@app.post("/api/report")
def generate_pdf_report(req: SimulationRequest, db: Session = Depends(get_db)):
    results = db.query(DataCenter).all()
    company_dcs = [dc for dc in results if dc.company.name == req.target_company]
    num_dcs = len(company_dcs)
    distributed_mw = req.extra_mw / num_dcs if num_dcs > 0 else 0

    # 1. NAIVE SIMULATION (What happens if we distribute evenly)
    report_data = []
    for dc in company_dcs:
        sim_demand = dc.power_demand_mw
        hw_pue_penalty = 0.0
        
        if req.extra_mw > 0:
            actual_extra, test_pue = apply_hardware_physics(req.hardware_type, distributed_mw, dc.pue)
            sim_demand += actual_extra
            hw_pue_penalty = test_pue - dc.pue

        live_temp_c, live_pue, live_rate, lmp_active, blended_rate = get_live_metrics(dc.location, dc.pue, dc.region.electricity_cost_kwh, hw_pue_penalty)
        median_crash_year, trajectory, risks = run_monte_carlo_power_sim(sim_demand, dc.region.available_capacity_mw, live_pue)
        true_mw = sim_demand * live_pue
        
        report_data.append({
            "location": dc.location, "region": dc.region.name,
            "sim_demand": round(sim_demand, 1), "true_mw": round(true_mw, 1),
            "pue": live_pue, "temp": round(live_temp_c, 1),
            "daily_opex": (true_mw * 1000) * 24 * blended_rate,
            "crash_year": median_crash_year, "risk_2030": risks.get("2030", 0.0),
            "lmp_active": lmp_active
        })

    # Sort by Highest Risk
    report_data.sort(key=lambda x: x["risk_2030"], reverse=True)

    # 2. ARBITRAGE OPTIMIZER (What happens if we use the algorithm)
    actual_req_mw, test_pue = apply_hardware_physics(req.hardware_type, req.extra_mw, 1.0)
    hw_pue_penalty = test_pue - 1.0
    
    dc_costs = []
    for dc in company_dcs:
        grid_room = max(0, dc.region.available_capacity_mw - dc.power_demand_mw - 10)
        loc = dc.location
        if "SIN" in loc or "LHR" in loc or "FRA" in loc or "GRU" in loc: physical_rack_limit_mw = 30
        elif "YUL" in loc or "DUB" in loc or "CPT" in loc or "BOM" in loc: physical_rack_limit_mw = 80
        else: physical_rack_limit_mw = 250
        available_room = min(grid_room, physical_rack_limit_mw)
        
        live_temp_c, live_pue, live_rate, lmp_active, blended_rate = get_live_metrics(loc, dc.pue, dc.region.electricity_cost_kwh, hw_pue_penalty)
        dc_costs.append({
            "cost_per_mw_day": 1 * live_pue * 1000 * 24 * blended_rate,
            "available_room": available_room
        })
    
    baseline_cost_per_mw_day = sum(d["cost_per_mw_day"] for d in dc_costs) / len(dc_costs) if dc_costs else 0
    dc_costs.sort(key=lambda x: x["cost_per_mw_day"])
    
    remaining_mw, total_optimized_cost = actual_req_mw, 0
    for dc in dc_costs:
        if remaining_mw <= 0: break
        alloc = min(remaining_mw, dc["available_room"])
        if alloc > 0:
            total_optimized_cost += (alloc * dc["cost_per_mw_day"])
            remaining_mw -= alloc
            
    total_savings = (actual_req_mw * baseline_cost_per_mw_day) - total_optimized_cost

    # 3. GLOBAL AGGREGATES
    total_network_opex = sum(d["daily_opex"] for d in report_data)
    total_network_mw = sum(d["sim_demand"] for d in report_data)
    avg_network_pue = sum(d["pue"] for d in report_data) / len(report_data) if report_data else 1.0

    # 4. BUILD THE PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30,
        title=f"{req.target_company} Infrastructure Tear Sheet", author="AI Power Alpha"
    )
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = styles['Heading1']
    title_style.textColor = colors.HexColor("#0f172a")
    title_style.alignment = 1 
    
    sub_style = styles['Heading3']
    sub_style.textColor = colors.HexColor("#334155")
    
    elements.append(Paragraph("<b>QUANTITATIVE INFRASTRUCTURE TEAR SHEET</b>", title_style))
    elements.append(Spacer(1, 15))
    
    # NEW: EXECUTIVE SUMMARY WITH ARBITRAGE ALPHA
    exec_summary = f"""
    <b>Target Asset:</b> {req.target_company} Global Network<br/>
    <b>Hardware Architecture:</b> {req.hardware_type}<br/>
    <b>Capital Injected (Capacity):</b> +{req.extra_mw:,.1f} MW<br/>
    <b>Timestamp:</b> {time.strftime('%Y-%m-%d %H:%M:%S')} UTC<br/><br/>
    
    <font color="#0f172a"><b>GLOBAL NETWORK FINANCIAL ROLL-UP:</b></font><br/>
    <b>Total Network IT Load:</b> {total_network_mw:,.1f} MW<br/>
    <b>Blended Network PUE:</b> {avg_network_pue:.3f}<br/>
    <b>Naive Network Daily OPEX:</b> <font color="red">${total_network_opex:,.2f} / day</font><br/>
    <b>Optimizer Alpha (Arbitrage Savings):</b> <font color="green">+${total_savings:,.2f} / day</font><br/>
    """
    elements.append(Paragraph(exec_summary, styles['Normal']))
    elements.append(Spacer(1, 20))

    # TABLE 1: Grid Stress
    elements.append(Paragraph("<b>1. Grid Stress & Hardware Physics (Top 15 Vulnerable Assets)</b>", sub_style))
    elements.append(Spacer(1, 10))
    
    risk_table_data = [["Facility Location", "Base Load", "Live PUE", "Therm Load", "Grid Wall", "2030 Risk"]]
    for d in report_data[:15]: 
        risk_table_data.append([
            d["location"], f"{d['sim_demand']} MW", str(d["pue"]), f"{d['true_mw']} MW", 
            str(d["crash_year"]) if d["crash_year"] != 9999 else "Stable", f"{d['risk_2030']}%"
        ])
        
    t1 = Table(risk_table_data, colWidths=[150, 70, 60, 70, 70, 70])
    t1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    
    for i, row in enumerate(risk_table_data):
        if i > 0 and float(row[5].replace("%", "")) > 50.0:
            t1.setStyle(TableStyle([('TEXTCOLOR', (5,i), (5,i), colors.red), ('FONTNAME', (5,i), (5,i), 'Helvetica-Bold')]))

    elements.append(t1)
    elements.append(Spacer(1, 25))

    # TABLE 2: Live Thermodynamics
    elements.append(Paragraph("<b>2. Live Thermodynamics & Daily OPEX Scaling</b>", sub_style))
    elements.append(Spacer(1, 10))
    
    fin_table_data = [["Facility Location", "Live Temp", "Grid Status", "Est. Daily OPEX"]]
    for d in report_data[:15]:
        fin_table_data.append([
            d["location"], f"{d['temp']} C", "LMP SPIKE" if d["lmp_active"] else "Stable", f"${d['daily_opex']:,.2f}"
        ])
        
    t2 = Table(fin_table_data, colWidths=[180, 100, 110, 110])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#f8fafc")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    
    for i, row in enumerate(fin_table_data):
        if row[2] == "LMP SPIKE":
            t2.setStyle(TableStyle([('TEXTCOLOR', (2, i), (2, i), colors.red), ('FONTNAME', (2,i), (2,i), 'Helvetica-Bold')]))

    elements.append(t2)

    doc.build(elements)
    buffer.seek(0)
    
    headers = {'Content-Disposition': f'attachment; filename="Tear_Sheet_{req.target_company}.pdf"'}
    return StreamingResponse(buffer, media_type="application/pdf", headers=headers)