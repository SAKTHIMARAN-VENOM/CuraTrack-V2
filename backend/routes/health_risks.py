from fastapi import APIRouter, Query
from datetime import datetime
from typing import Optional

router = APIRouter()

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

# Comprehensive mock data dictionary for seasonal disease outbreaks for all 12 months
SEASONAL_OUTBREAK_DATA = {
    # 1. January
    1: {
        "season": "Peak Winter",
        "risks": [
            {
                "disease": "Viral Influenza (H1N1 / Swine Flu)",
                "risk": "HIGH",
                "icon": "coronavirus",
                "symptoms": "High fever (102°F+), chills, persistent cough, sore throat, severe body aches",
                "precautions": "Get annual flu vaccine, wear N95 masks in crowded spaces, practice frequent hand hygiene",
                "advisory": "January brings peak cold weather flu transmission across northern & central urban clusters.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Respiratory Syncytial Virus (RSV)",
                "risk": "HIGH",
                "icon": "laryngitis",
                "symptoms": "Wheezing, rapid breathing, persistent cough, loss of appetite in infants",
                "precautions": "Keep children and seniors warm, avoid indoor overcrowding, sanitize toys and surfaces",
                "advisory": "High RSV infection rates observed in infants and elderly individuals during cold dry winds.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Norovirus (Stomach Flu)",
                "risk": "MODERATE",
                "icon": "sick",
                "symptoms": "Sudden onset vomiting, watery diarrhea, abdominal cramps, low-grade fever",
                "precautions": "Wash hands with soap for 20 seconds, sanitize shared surfaces, consume boiled water",
                "advisory": "Winter gastroenteritis outbreaks spike in shared dining & institutional spaces.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 2. February
    2: {
        "season": "Late Winter",
        "risks": [
            {
                "disease": "Seasonal Influenza B Surge",
                "risk": "HIGH",
                "icon": "coronavirus",
                "symptoms": "Fever, nasal congestion, dry cough, extreme fatigue, frontal headache",
                "precautions": "Maintain physical distance from symptomatic individuals, use saline nasal sprays",
                "advisory": "Late winter secondary influenza B strain active across school and workplace environments.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Measles & Rubella Early Spike",
                "risk": "MODERATE",
                "icon": "health_metrics",
                "symptoms": "Fever, red maculopapular rash starting behind ears, cough, conjunctivitis",
                "precautions": "Verify MMR vaccine doses, isolate infected children early, avoid public gatherings",
                "advisory": "Late winter pediatric transmission peak reported in unvaccinated communities.",
                "urgency": "Moderate Precaution",
            },
            {
                "disease": "Scabies & Dry Skin Dermatitis",
                "risk": "MODERATE",
                "icon": "dermatology",
                "symptoms": "Severe nocturnal skin itching, red pimple-like rash on finger webs and waistline",
                "precautions": "Wash clothes/bedding in 60°C water, apply daily moisturizers, avoid sharing linen",
                "advisory": "Low ambient humidity accelerates skin barrier breakdown and mite transmission.",
                "urgency": "Low Precaution",
            },
        ],
    },
    # 3. March
    3: {
        "season": "Spring Transition",
        "risks": [
            {
                "disease": "Chickenpox (Varicella Zoster)",
                "risk": "HIGH",
                "icon": "vaccines",
                "symptoms": "Itchy fluid-filled blisters, fever, tiredness, loss of appetite",
                "precautions": "Isolate infected patients for 7 days, ensure varicella vaccination, apply calamine lotion",
                "advisory": "March temperature transition triggers annual peak of varicella virus transmission.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Seasonal Allergic Rhinitis (Hay Fever)",
                "risk": "MODERATE",
                "icon": "pulmonology",
                "symptoms": "Repetitive sneezing, clear runny nose, itchy watery eyes, sinus congestion",
                "precautions": "Keep windows closed during high pollen hours (morning), take prescribed antihistamines",
                "advisory": "Spring flower blooming raises tree and grass pollen counts significantly.",
                "urgency": "Moderate Precaution",
            },
            {
                "disease": "Viral Conjunctivitis (Spring Eye Flu)",
                "risk": "MODERATE",
                "icon": "visibility_off",
                "symptoms": "Eye redness, grittiness, watery discharge, morning eyelid crusting",
                "precautions": "Avoid rubbing eyes, use separate face towels, wash hands frequently",
                "advisory": "Warming spring temperatures increase adenoviral ocular transmission in schools.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 4. April
    4: {
        "season": "Late Spring",
        "risks": [
            {
                "disease": "Mumps & Parotitis Flare",
                "risk": "HIGH",
                "icon": "masks",
                "symptoms": "Swollen and painful salivary glands, fever, pain while chewing or swallowing",
                "precautions": "Complete MMR immunization schedule, isolate patient, encourage warm salt gargles",
                "advisory": "Pediatric clusters of mumps infection observed with spring temperature rise.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Typhoid Fever (Salmonella Typhi)",
                "risk": "HIGH",
                "icon": "water_drop",
                "symptoms": "Prolonged step-ladder fever, severe abdominal pain, weakness, rose-colored spots",
                "precautions": "Drink bottled or boiled water, avoid unpasteurized dairy and roadside juices",
                "advisory": "Rising ambient temperature accelerates bacterial multiplication in raw food items.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Early Dehydration & Heat Cramps",
                "risk": "MODERATE",
                "icon": "thermostat",
                "symptoms": "Muscle spasms, dizziness, intense thirst, dark yellow urine",
                "precautions": "Increase daily water intake to 3L+, consume lemon water and ORS electrolytes",
                "advisory": "April sunshine intensity causes rapid fluid loss during outdoor labor.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 5. May
    5: {
        "season": "Pre-Monsoon Heatwave",
        "risks": [
            {
                "disease": "Heat Stroke & Heat Exhaustion",
                "risk": "HIGH",
                "icon": "thermostat",
                "symptoms": "High body temperature (104°F+), confusion, dry red skin, rapid heart rate, fainting",
                "precautions": "Avoid direct sunlight between 11 AM - 4 PM, wear loose cotton clothes, drink ORS",
                "advisory": "Severe heatwave warnings active across inland regions with temperatures exceeding 42°C.",
                "urgency": "Emergency Precaution",
            },
            {
                "disease": "Acute Gastroenteritis & Food Poisoning",
                "risk": "HIGH",
                "icon": "sanitizer",
                "symptoms": "Sudden vomiting, profuse watery diarrhea, stomach cramps, dehydration",
                "precautions": "Eat freshly prepared hot food, discard unchilled leftovers after 2 hours",
                "advisory": "High ambient temperature speeds up food spoilage and foodborne bacterial toxins.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Jaundice / Hepatitis A & E",
                "risk": "MODERATE",
                "icon": "clean_hands",
                "symptoms": "Yellow skin and eyes, dark urine, pale stools, nausea, loss of appetite",
                "precautions": "Get Hepatitis A vaccine, consume filtered water, practice strict food hygiene",
                "advisory": "Pre-monsoon water scarcity leads to reliance on unverified water sources.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 6. June
    6: {
        "season": "Early Monsoon",
        "risks": [
            {
                "disease": "Dengue Fever Outbreak",
                "risk": "HIGH",
                "icon": "bug_report",
                "symptoms": "Sudden high fever, severe frontal headache, eye pain, joint/muscle agony, skin rash",
                "precautions": "Drain standing water from air coolers and pots, wear long sleeves, use mosquito nets",
                "advisory": "Early rain accumulation triggers Aedes mosquito breeding in urban containers.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Malaria (Anopheles Mosquito)",
                "risk": "MODERATE",
                "icon": "water_drop",
                "symptoms": "High fever with chills and severe shivering, profuse sweating, fatigue",
                "precautions": "Apply DEET mosquito repellents, install fine mesh screens on doors/windows",
                "advisory": "Night-biting Anopheles mosquito density increasing after initial monsoon showers.",
                "urgency": "Moderate Precaution",
            },
            {
                "disease": "Bacillary Dysentery (Shigellosis)",
                "risk": "MODERATE",
                "icon": "medical_services",
                "symptoms": "Bloody diarrhea, abdominal cramps, fever, painful bowel movements",
                "precautions": "Wash hands before meals, avoid unwashed street salads and raw cuts",
                "advisory": "Water contamination risks increase with early monsoon surface runoff.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 7. July
    7: {
        "season": "Mid Monsoon",
        "risks": [
            {
                "disease": "Dengue Fever Epidemic Surge",
                "risk": "HIGH",
                "icon": "bug_report",
                "symptoms": "High fever (104°F), joint agony ('breakbone fever'), pain behind eyes, low platelets",
                "precautions": "Apply mosquito repellent spray, clear stagnant water every 3 days, wear long clothing",
                "advisory": "July heavy rains create widespread mosquito breeding sites across residential zones.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Leptospirosis Flood Risk",
                "risk": "HIGH",
                "icon": "flood",
                "symptoms": "High fever, severe calf muscle pain, red eyes, jaundice, dark urine",
                "precautions": "Avoid walking barefoot through waterlogged streets, wear rubber boots, cover cuts",
                "advisory": "Bacterial contamination spikes in urban floodwaters contaminated by animal urine.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Chikungunya Fever",
                "risk": "MODERATE",
                "icon": "personal_injury",
                "symptoms": "High fever, disabling joint pain, joint swelling, morning stiffness",
                "precautions": "Protect daytime resting areas with nets, use anti-mosquito vaporizers",
                "advisory": "Aedes albopictus mosquito vector activity heightened during peak rainy weeks.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 8. August
    8: {
        "season": "Peak Monsoon",
        "risks": [
            {
                "disease": "Dengue Fever Epidemic Watch",
                "risk": "HIGH",
                "icon": "bug_report",
                "symptoms": "High fever (104°F), severe joint/muscle pain, skin rash, bleeding gums",
                "precautions": "Clear water from cooler trays, plant pots, and discarded tires every 3 days",
                "advisory": "August is peak transmission month for Dengue virus across flooded districts.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Malaria (Plasmodium Falciparum)",
                "risk": "HIGH",
                "icon": "water_drop",
                "symptoms": "Cyclic fever with chills, shivering, nausea, severe anemia, weakness",
                "precautions": "Use pyrethroid-treated bed nets, avoid outdoor stays after dusk",
                "advisory": "Anopheles mosquito count reaches maximum annual density in August.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Viral Conjunctivitis (Monsoon Eye Flu)",
                "risk": "MODERATE",
                "icon": "visibility_off",
                "symptoms": "Severe eye redness, grittiness, pus discharge, eyelid swelling",
                "precautions": "Do not touch or rub eyes, use personal face towels, wash hands frequently",
                "advisory": "Monsoon high humidity accelerates adenoviral ocular infection spread.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 9. September
    9: {
        "season": "Late Monsoon",
        "risks": [
            {
                "disease": "Scrub Typhus Outbreak",
                "risk": "HIGH",
                "icon": "bug_report",
                "symptoms": "High fever, dark scab-like lesion (eschar) at bite site, headache, lymph node swelling",
                "precautions": "Avoid sitting directly on unkept grass/shrubs, wear covered shoes and long socks",
                "advisory": "Chigger mite larval populations multiply rapidly in lush post-monsoon vegetation.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Cholera & Waterborne Gastroenteritis",
                "risk": "HIGH",
                "icon": "clean_hands",
                "symptoms": "Profuse rice-water stools, rapid dehydration, severe vomiting, leg cramps",
                "precautions": "Drink only boiled or UV-treated water, avoid unwashed raw salads and ice",
                "advisory": "Water pipeline contamination risks remain elevated post-heavy rainfall.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Dengue Post-Peak Tail",
                "risk": "MODERATE",
                "icon": "bug_report",
                "symptoms": "Low-grade fever, fatigue, body aches",
                "precautions": "Maintain mosquito control measures until temperatures drop in October",
                "advisory": "Residual vector breeding in receding water pools.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 10. October
    10: {
        "season": "Post-Monsoon Autumn",
        "risks": [
            {
                "disease": "AQI Smog & Asthma Exacerbation",
                "risk": "HIGH",
                "icon": "air",
                "symptoms": "Shortness of breath, chest tightness, wheezing, throat irritation, dry cough",
                "precautions": "Wear N95 mask outdoors, run HEPA air purifiers indoors, use prescribed inhalers",
                "advisory": "Cooler Autumn air trapping PM2.5 particulate matter causes severe urban AQI spikes.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Typhoid & Paratyphoid Fever",
                "risk": "MODERATE",
                "icon": "water_drop",
                "symptoms": "Persistent high fever, headache, constipation or diarrhea, loss of appetite",
                "precautions": "Eat warm cooked food, drink safe purified water, wash hands thoroughly",
                "advisory": "Post-monsoon foodborne bacterial infections remain active.",
                "urgency": "Moderate Precaution",
            },
            {
                "disease": "Seasonal Viral Fever",
                "risk": "MODERATE",
                "icon": "thermostat",
                "symptoms": "Fever, shivering, joint stiffness, general malaise",
                "precautions": "Stay hydrated, rest adequately, monitor body temperature",
                "advisory": "Day-night temperature variation triggers seasonal viral fever clusters.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 11. November
    11: {
        "season": "Late Autumn / Pre-Winter",
        "risks": [
            {
                "disease": "Seasonal Pneumonia & Acute Bronchitis",
                "risk": "HIGH",
                "icon": "pulmonology",
                "symptoms": "Cough with yellow/green sputum, chest pain when breathing, fever, fatigue",
                "precautions": "Get pneumococcal vaccination if over 65, keep chest warm, avoid cold exposure",
                "advisory": "Sudden temperature drops increase vulnerability to bacterial lung infections.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Smog & Dust Allergy Spike",
                "risk": "HIGH",
                "icon": "masks",
                "symptoms": "Dry throat irritation, eye burning, continuous sneezing, sinus headache",
                "precautions": "Steam inhalation before bed, wear protective eyewear outdoors, use saline drops",
                "advisory": "High PM10 and dust levels impair upper respiratory mucous lining.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Early Winter H1N1 Flu Onset",
                "risk": "MODERATE",
                "icon": "coronavirus",
                "symptoms": "High fever, chills, cough, throat pain",
                "precautions": "Get seasonal flu shot, avoid poorly ventilated indoor crowds",
                "advisory": "Early winter respiratory virus transmission beginning.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
    # 12. December
    12: {
        "season": "Early Winter",
        "risks": [
            {
                "disease": "Influenza A (H3N2 Winter Surge)",
                "risk": "HIGH",
                "icon": "coronavirus",
                "symptoms": "High fever, persistent dry cough, severe body pain, chills, exhaustion",
                "precautions": "Maintain physical distance from symptomatic individuals, get annual flu shot",
                "advisory": "December onset of low humidity accelerates airborne flu droplet survival.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Cardiovascular & Hypertension Stress",
                "risk": "HIGH",
                "icon": "favorite",
                "symptoms": "Morning blood pressure spikes, chest discomfort, dizziness, shortness of breath",
                "precautions": "Monitor blood pressure daily, dress warmly in layers, avoid sudden cold exposure",
                "advisory": "Cold weather causes peripheral blood vessel constriction, increasing cardiovascular load.",
                "urgency": "High Precaution",
            },
            {
                "disease": "Winter RSV & Bronchiolitis",
                "risk": "MODERATE",
                "icon": "laryngitis",
                "symptoms": "Wheezing, shallow breathing, coughing spells in young children",
                "precautions": "Keep living areas warm and humidified, wash hands before touching infants",
                "advisory": "Winter viral respiratory peak active across pediatric populations.",
                "urgency": "Moderate Precaution",
            },
        ],
    },
}


@router.get("/health-risks/all-months")
def get_all_seasonal_health_risks():
    """
    Returns the complete 12-month calendar of seasonal disease outbreak mock alerts.
    """
    result = []
    for m_num in range(1, 13):
        m_name = MONTH_NAMES[m_num]
        m_data = SEASONAL_OUTBREAK_DATA[m_num]
        result.append({
            "month_number": m_num,
            "month_name": m_name,
            "season": m_data["season"],
            "total_outbreaks": len(m_data["risks"]),
            "risks": [
                {
                    **r,
                    "category": "Outbreaks",
                    "month": m_name,
                }
                for r in m_data["risks"]
            ],
        })

    return {
        "current_month_number": datetime.now().month,
        "current_month_name": MONTH_NAMES[datetime.now().month],
        "total_months": 12,
        "calendar": result,
    }


@router.get("/health-risks")
def get_health_risks(month: Optional[int] = Query(default=None, ge=1, le=12)):
    """
    Returns seasonal disease outbreak risks based on the specified month (1-12).
    If no month is provided, defaults to the current calendar month.
    """
    if not isinstance(month, int) or month < 1 or month > 12:
        selected_month = datetime.now().month
    else:
        selected_month = month

    month_name = MONTH_NAMES[selected_month]
    month_data = SEASONAL_OUTBREAK_DATA.get(selected_month, SEASONAL_OUTBREAK_DATA[8])

    return {
        "month_number": selected_month,
        "month_name": month_name,
        "current_month": MONTH_NAMES[datetime.now().month],
        "season": month_data["season"],
        "total_outbreaks": len(month_data["risks"]),
        "risks": [
            {
                **r,
                "category": "Outbreaks",
                "month": month_name,
                "who_url": r.get("who_url") or "https://www.who.int/emergencies/disease-outbreak-news",
            }
            for r in month_data["risks"]
        ],
    }
