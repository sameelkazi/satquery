"""
Multilingual / Hindi Translation Service for SatQuery AI (Phase 5 Differentiation)
Provides: High-accuracy domain-preserved Hindi translation for remote sensing vision-language responses.
"""

import os
import re
from typing import Dict, Any

# Remote Sensing Domain Lexicon (Hindi)
RS_HINDI_LEXICON = {
    "built-up": "निर्मित (बिल्ट-अप)",
    "buildings": "इमारतों और आवासीय संरचनाओं",
    "water body": "जल निकाय",
    "river": "नदी और जल निकासी चैनल",
    "flood": "बाढ़ जलभराव (जलमग्न क्षेत्र)",
    "inundated": "जलमग्न",
    "agricultural": "कृषि भूमि और फसलें",
    "vegetation": "वनस्पति आवरण",
    "forest": "सघन वन क्षेत्र",
    "change analysis": "द्वि-कालिक परिवर्तन विश्लेषण",
    "increased": "वृद्धि हुई",
    "decreased": "कमी आई",
    "remained unchanged": "अपरिवर्तित रहा",
    "synthetic aperture radar": "सिंथेटिक एपर्चर रडार (SAR)",
    "backscatter": "माइक्रोवेव बैकस्कैटर",
    "corner reflectors": "डबल-बाउंस कॉर्नर रिफ्लेक्टर",
    "optical": "ऑप्टिकल मल्टी-स्पेक्ट्रल"
}

class TranslationService:
    def __init__(self):
        pass

    def translate_to_hindi(self, text: str) -> str:
        """
        Translates technical remote sensing text into domain-accurate Hindi dynamically.
        """
        if not text:
            return ""

        groq_key = os.environ.get("GROQ_API_KEY", "")
        if not groq_key and os.path.exists(".env"):
            try:
                with open(".env", "r") as f:
                    for line in f:
                        if line.startswith("GROQ_API_KEY="):
                            groq_key = line.strip().split("=", 1)[1]
            except Exception:
                pass

        if groq_key:
            try:
                from groq import Groq
                client = Groq(api_key=groq_key)
                
                resp = client.chat.completions.create(
                    model="qwen/qwen3.6-27b",
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a professional remote-sensing Hindi translator for ISRO. "
                                "Translate the given English satellite analysis into natural, technically accurate Devanagari Hindi (हिंदी). "
                                "Preserve numbers, percentages, coordinates, and standard abbreviations like SAR, NIR, NDVI. "
                                "Output ONLY the translated Hindi text."
                            )
                        },
                        {"role": "user", "content": f"Translate into Hindi:\n{text}"}
                    ],
                    temperature=0.1,
                    max_tokens=400
                )
                raw_tr = resp.choices[0].message.content or ""
                clean_tr = raw_tr.split("</think>")[-1].strip() if "</think>" in raw_tr else raw_tr.strip()
                if clean_tr and len(clean_tr) > 5:
                    return clean_tr
            except Exception as tr_err:
                pass

        # Lexical term substitution fallback
        trans_text = text
        for eng, hnd in RS_HINDI_LEXICON.items():
            pattern = re.compile(re.escape(eng), re.IGNORECASE)
            trans_text = pattern.sub(hnd, trans_text)

        return f"उपग्रह दृश्य विश्लेषण (हिंदी अनुवाद): {trans_text}"

translation_service = TranslationService()
