import numpy as np

def run_monte_carlo_power_sim(current_demand_mw: float, available_capacity_mw: float, pue: float = 1.0, simulations=2500, years=10):
    true_current_demand = current_demand_mw * pue
    
    # 1. BASE STOCHASTIC PARAMETERS (Time-Decaying S-Curve)
    initial_mu = 0.35   # Year 1 Base Drift: 35% standard growth
    decay_rate = 0.18   # Drift Decay: Forces growth to slow down as base scales
    sigma = 0.12        # Base Volatility: 12% standard deviation in routine deployment
    
    # 2. POISSON JUMP PARAMETERS (The "Black Swan" / Paradigm Shift Shocks)
    lambda_jump = 0.30  # Probability: 30% chance per year of a massive hardware/AI demand shock
    mu_jump = 0.25      # Impact: When a shock happens, demand instantly spikes by an average of 25%
    sigma_jump = 0.10   # Jump Volatility: Variance in the size of the shock
    
    paths = np.zeros((simulations, years + 1))
    paths[:, 0] = true_current_demand
    
    # Pre-generate random matrices for absolute maximum computational speed
    Z = np.random.standard_normal((simulations, years))
    # N determines IF a jump happens in a specific year for a specific simulation
    N = np.random.poisson(lambda_jump, (simulations, years)) 
    
    # Execute Merton's Jump-Diffusion with Time-Decaying Drift
    for t in range(years):
        # The mean growth rate decays naturally as the industry matures
        mu_t = initial_mu * np.exp(-decay_rate * t)
        
        # Standard continuous GBM component
        drift = mu_t - (0.5 * sigma**2)
        diffusion = sigma * Z[:, t]
        
        # Discrete Jump component (Calculates the impact if N > 0)
        jump_impact = N[:, t] * np.random.normal(mu_jump, sigma_jump, simulations)
        
        # Combine base growth, standard volatility, and sudden market shocks
        paths[:, t + 1] = paths[:, t] * np.exp(drift + diffusion + jump_impact)
    
    # Vectorized Risk Assessment
    crashed_mask = paths >= available_capacity_mw
    crash_indices = np.argmax(crashed_mask, axis=1)
    never_crashed = ~crashed_mask.any(axis=1)
    
    crash_years = np.where(never_crashed, 9999, 2026 + crash_indices)
    
    # Extract probabilistic confidence intervals
    p10 = np.percentile(paths, 10, axis=0)
    p50 = np.percentile(paths, 50, axis=0)
    p90 = np.percentile(paths, 90, axis=0)
    
    trajectory = []
    for t in range(years + 1):
        trajectory.append({
            "year": 2026 + t,
            "p10_load": round(p10[t], 1),
            "median_load": round(p50[t], 1),
            "p90_load": round(p90[t], 1),
            "grid_capacity": available_capacity_mw
        })
        
    median_crash_year = int(np.median(crash_years))
    
    # Calculate the exact risk density curve
    risks_by_year = {}
    for t in range(1, years + 1):
        target_year = 2026 + t
        risks_by_year[str(target_year)] = round(float(np.mean(crash_years <= target_year) * 100), 1)
    
    return median_crash_year, trajectory, risks_by_year