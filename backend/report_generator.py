"""
Execution Summary Report Generator (SIH26167 PS Mandatory Deliverable)
Generates audit-ready downloadable PDF and structured JSON execution reports.

Honesty note (fixed 2026-08-24): the "Auditable Parameters" section used to print a fixed
paragraph claiming LoRA fine-tuning, BitsAndBytes quantization, and a specific fusion
architecture on EVERY report, regardless of what actually ran for that query. It now reads
those facts from the query's own execution_summary["parameters"], which main.py now
populates from the real per-service state (adapter_active, quantization_active,
is_real_model_loaded, etc.) rather than asserting them unconditionally.
"""

import os
import io
import time
import json
import hashlib
from typing import Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle


class ReportGenerator:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        self.title_style = ParagraphStyle(
            'ReportTitle', parent=self.styles['Heading1'], fontName='Helvetica-Bold',
            fontSize=18, leading=22, textColor=colors.HexColor('#0F172A'), spaceAfter=6
        )
        self.subtitle_style = ParagraphStyle(
            'ReportSubtitle', parent=self.styles['Normal'], fontName='Helvetica',
            fontSize=10, leading=14, textColor=colors.HexColor('#475569'), spaceAfter=12
        )
        self.section_heading = ParagraphStyle(
            'SectionHeading', parent=self.styles['Heading2'], fontName='Helvetica-Bold',
            fontSize=13, leading=16, textColor=colors.HexColor('#1E293B'), spaceBefore=10, spaceAfter=6
        )
        self.body_style = ParagraphStyle(
            'ReportBody', parent=self.styles['Normal'], fontName='Helvetica',
            fontSize=9.5, leading=13, textColor=colors.HexColor('#334155')
        )
        self.code_style = ParagraphStyle(
            'CodeSnippet', parent=self.styles['Code'], fontName='Courier',
            fontSize=8.5, leading=11, textColor=colors.HexColor('#0F172A')
        )

    def _content_integrity_hash(self, report_data: Dict[str, Any]) -> str:
        """
        SHA-256 of this report's own structured execution data (query, response text, boxes,
        change-detection summary, and execution_summary/parameters) -- a tamper-evidence
        fingerprint, not a claim about hashing model weight files or raw input imagery bytes
        (this generator never receives those). Re-hashing an unmodified copy of the same
        REPORTS_DB entry with this same canonical field set reproduces the same digest; any
        edit to those fields changes it. Scoped honestly: labeled "Content Integrity Hash" in
        the PDF, not "cryptographic proof of model execution."
        """
        canonical = {
            "query_id": report_data.get("query_id"),
            "query": report_data.get("query"),
            "text_response": report_data.get("text_response"),
            "boxes": report_data.get("boxes"),
            "change_mask_geojson_summary": {
                k: report_data.get("change_mask_geojson", {}).get(k)
                for k in ("georeferencing_source", "total_area_sq_m", "total_area_hectares", "total_area_acres")
            } if report_data.get("change_mask_geojson") else None,
            "execution_summary": report_data.get("execution_summary"),
        }
        canonical_json = json.dumps(canonical, sort_keys=True, default=str)
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def generate_pdf_report(self, report_data: Dict[str, Any]) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        story = []

        story.append(Paragraph("SatQuery AI — Execution Audit & Summary Report", self.title_style))
        story.append(Paragraph("Smart India Hackathon 2026 | Problem Statement SIH26167 (ISRO / Space Technology)", self.subtitle_style))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284C7'), spaceAfter=12))

        qid = report_data.get("query_id", "N/A")
        ts = time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime(report_data.get("timestamp", time.time())))
        latency = f"{report_data.get('latency_ms', 0)} ms"
        conf = f"{report_data.get('execution_summary', {}).get('confidence', 0.0) * 100:.1f}%"

        meta_table_data = [
            [Paragraph("<b>Query ID:</b>", self.body_style), Paragraph(qid, self.code_style), Paragraph("<b>Timestamp:</b>", self.body_style), Paragraph(ts, self.body_style)],
            [Paragraph("<b>Execution Latency:</b>", self.body_style), Paragraph(latency, self.body_style), Paragraph("<b>Combined Confidence:</b>", self.body_style), Paragraph(conf, self.body_style)]
        ]
        meta_table = Table(meta_table_data, colWidths=[100, 160, 110, 160])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        story.append(Paragraph("1. Natural Language Query & Agentic Router Decision", self.section_heading))
        story.append(Paragraph(f"<b>User Query:</b> <i>\"{report_data.get('query', '')}\"</i>", self.body_style))
        story.append(Spacer(1, 4))

        exec_sum = report_data.get("execution_summary", {})
        route = report_data.get("route", {})
        router_table_data = [
            [Paragraph("<b>Classified Task:</b>", self.body_style), Paragraph(exec_sum.get("task", "N/A"), self.body_style)],
            [Paragraph("<b>Modality & Temporal Scope:</b>", self.body_style), Paragraph(f"{route.get('modality', 'Optical')} | {route.get('temporal', 'single')}", self.body_style)],
            [Paragraph("<b>Router Reasoning:</b>", self.body_style), Paragraph(route.get("reasoning", "Autonomous classification based on spatial semantics."), self.body_style)],
            [Paragraph("<b>Specialist Models Invoked:</b>", self.body_style), Paragraph(", ".join(exec_sum.get("models_used", [])) or "N/A", self.body_style)]
        ]
        router_table = Table(router_table_data, colWidths=[160, 370])
        router_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(router_table)
        story.append(Spacer(1, 10))

        story.append(Paragraph("2. Synthesized Vision-Language Output & Findings", self.section_heading))
        text_ans = report_data.get("text_response", "No response text generated.")
        story.append(Paragraph(f"<b>Response Text:</b><br/>{text_ans}", self.body_style))
        story.append(Spacer(1, 8))

        boxes = report_data.get("boxes", [])
        if boxes:
            story.append(Paragraph("3. Spatial Grounding / Bounding Box Evidence", self.section_heading))
            box_rows = [[Paragraph("<b>Box ID</b>", self.body_style), Paragraph("<b>Label</b>", self.body_style), Paragraph("<b>Normalized Coords [x1, y1, x2, y2]</b>", self.body_style), Paragraph("<b>Confidence</b>", self.body_style)]]
            for b in boxes:
                box_rows.append([
                    Paragraph(str(b.get("id", "")), self.body_style),
                    Paragraph(str(b.get("label", "")), self.body_style),
                    Paragraph(str(b.get("bbox", [])), self.code_style),
                    Paragraph(f"{b.get('confidence', 0.0)*100:.1f}%", self.body_style)
                ])
            box_table = Table(box_rows, colWidths=[70, 180, 200, 80])
            box_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#E0F2FE')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BAE6FD')),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(box_table)
            story.append(Spacer(1, 10))

        change_geojson = report_data.get("change_mask_geojson")
        if change_geojson and change_geojson.get("features"):
            story.append(Paragraph("3b. Bi-Temporal Change Detection: Area Analysis", self.section_heading))
            geo_source = change_geojson.get("georeferencing_source", "n/a")
            total_ha = change_geojson.get("total_area_hectares")
            total_ac = change_geojson.get("total_area_acres")
            n_features = len(change_geojson.get("features", []))
            if total_ha is not None:
                area_line = f"<b>Total Alteration (measured):</b> {total_ha:,.3f} hectares ({total_ac:,.3f} acres) across {n_features} detected region(s)."
            else:
                note = change_geojson.get("total_area_note", "No real-world scale available for this imagery.")
                area_line = f"<b>Total Alteration:</b> area not reported — {note}"
            story.append(Paragraph(area_line, self.body_style))
            story.append(Paragraph(f"<b>Georeferencing source:</b> {geo_source}", self.body_style))
            story.append(Spacer(1, 6))

            region_rows = [[
                Paragraph("<b>Region</b>", self.body_style),
                Paragraph("<b>Change Type</b>", self.body_style),
                Paragraph("<b>Area (sq m)</b>", self.body_style),
                Paragraph("<b>Severity</b>", self.body_style),
            ]]
            for feat in change_geojson.get("features", [])[:8]:
                props = feat.get("properties", {})
                area_sq_m = props.get("area_sq_m")
                area_cell = f"{area_sq_m:,.1f}" if area_sq_m is not None else "n/a (no real scale)"
                region_rows.append([
                    Paragraph(str(feat.get("id", "")), self.body_style),
                    Paragraph(str(props.get("change_type", "")), self.body_style),
                    Paragraph(area_cell, self.body_style),
                    Paragraph(str(props.get("severity", "")), self.body_style),
                ])
            region_table = Table(region_rows, colWidths=[110, 220, 100, 80])
            region_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FEF3C7')),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#FDE68A')),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(region_table)
            if n_features > 8:
                story.append(Paragraph(f"<i>({n_features - 8} additional region(s) omitted from this table for brevity; full GeoJSON is available via the API.)</i>", self.subtitle_style))
            story.append(Spacer(1, 10))

        # --- Auditable Parameters section: built from THIS query's actual parameters, ---
        # --- never a fixed paragraph asserting quantization/LoRA regardless of reality. ---
        story.append(Paragraph("4. Auditable Parameters & Model Provenance", self.section_heading))
        params = exec_sum.get("parameters", {}) or {}
        param_lines = []
        if params.get("vqa_model"):
            param_lines.append(f"• <b>VQA / Grounding model:</b> {params['vqa_model']} (confidence basis: {params.get('vqa_confidence_basis', 'n/a')})")
        if params.get("change_detection_model"):
            param_lines.append(f"• <b>Change-detection model:</b> {params['change_detection_model']} (confidence basis: {params.get('change_detection_confidence_basis', 'n/a')})")
        if "sar_encoder_active" in params:
            sar_note = "real pretrained Sentinel-1 encoder active" if params["sar_encoder_active"] else "band-statistics only, no pretrained SAR encoder loaded"
            param_lines.append(f"• <b>SAR fusion:</b> {sar_note} (confidence basis: {params.get('fusion_confidence_basis', 'n/a')})")
        if "quantization" in params:
            param_lines.append(f"• <b>Quantization:</b> {params['quantization']}")
        if "adaptation" in params:
            param_lines.append(f"• <b>BigEarthNet.txt LoRA adaptation:</b> {params['adaptation']}")
        param_lines.append(f"• <b>Confidence Combination Rule:</b> {params.get('combination_rule', 'Arithmetic Mean of Specialist Confidences')}")

        if not param_lines:
            param_lines = ["• No specialist model parameters were recorded for this response (validation-rejected or cached-only query)."]

        story.append(Paragraph("<br/>".join(param_lines), self.body_style))
        story.append(Spacer(1, 14))

        content_hash = self._content_integrity_hash(report_data)
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CBD5E1'), spaceAfter=8))
        story.append(Paragraph(
            f"<b>Content Integrity Hash (SHA-256):</b> <font face='Courier'>{content_hash}</font>",
            self.body_style
        ))
        story.append(Paragraph(
            "<i>This hash is a tamper-evidence fingerprint of this report's own recorded query, response, "
            "change-detection summary, and execution parameters — re-computing it over an unmodified copy of "
            "this record reproduces the same digest. It is not a hash of model weight files or raw input "
            "imagery.</i>",
            self.subtitle_style
        ))
        story.append(Spacer(1, 4))
        story.append(Paragraph("<i>SatQuery AI System Deliverable — prepared for ISRO Smart India Hackathon 2026 (SIH26167) evaluation. This report reflects the models actually invoked for this specific query.</i>", self.subtitle_style))

        doc.build(story)
        return buffer.getvalue()


report_generator = ReportGenerator()
