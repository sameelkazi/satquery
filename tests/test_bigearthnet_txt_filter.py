"""Unit-tests select_rows()/clean_reference_prompt()/box_str_to_token() against synthetic
rows built to match the REAL verified schema/format (see module docstring in
bigearthnet_txt_filter.py for what was actually verified vs assumed). No network access
needed -- this is exactly why the network call was isolated to main()."""
import sys
sys.path.insert(0, "/tmp/beq_test")
from bigearthnet_txt_filter import select_rows, clean_reference_prompt, box_str_to_token

# --- unit: box_str_to_token ---
assert box_str_to_token("[0.0 0.33, 0.28 0.8]") == "{<0><33><28><80>}"
assert box_str_to_token("[0.64 0.0, 1.0 0.71]") == "{<64><0><100><71>}"
assert box_str_to_token("not a box") is None
assert box_str_to_token("[0.5 0.5, 0.1 0.9]") is None  # x1 > x2, degenerate -> rejected
assert box_str_to_token("[0.5 0.5, 0.5 0.9]") is None  # x1 == x2, zero-width -> rejected
print("PASS: box_str_to_token")

# --- unit: clean_reference_prompt ---
assert clean_reference_prompt("Identify the location of the <ref>largest connected region of pastures</ref>") \
    == "[refer] Where is the largest connected region of pastures?"
assert clean_reference_prompt("Provide a bounding box for the land cover class instance at <point>(0.82, 0.28)</point>") is None
assert clean_reference_prompt("no tags here") is None
print("PASS: clean_reference_prompt")

# --- integration: select_rows over a realistic synthetic batch ---
rows = [
    # good: bounding box + reference -> should be selected
    {"patch_id": "S2A_p1", "S1_name": "S1B_p1", "type": "bounding box", "category": "reference",
     "input": "Identify the location of the <ref>pastures</ref>", "output": "[0.0 0.33, 0.28 0.8]"},
    # excluded: category == point (different task shape)
    {"patch_id": "S2A_p2", "S1_name": "S1B_p2", "type": "bounding box", "category": "point",
     "input": "Provide a bounding box for the land cover class instance at <point>(0.82, 0.28)</point>",
     "output": "[0.55 0.58, 1.0 1.0]"},
    # excluded: type != bounding box (a VQA/caption row)
    {"patch_id": "S2A_p3", "S1_name": "S1B_p3", "type": "binary", "category": "presence",
     "input": "Is there a river?", "output": "yes"},
    # excluded: missing patch_id
    {"patch_id": None, "S1_name": "S1B_p4", "type": "bounding box", "category": "reference",
     "input": "Identify the location of the <ref>a road</ref>", "output": "[0.1 0.1, 0.2 0.2]"},
    # excluded: unparseable box
    {"patch_id": "S2A_p5", "S1_name": "S1B_p5", "type": "bounding box", "category": "reference",
     "input": "Identify the location of the <ref>a lake</ref>", "output": "garbled"},
    # excluded: missing required column entirely
    {"patch_id": "S2A_p6", "type": "bounding box", "category": "reference",
     "input": "Identify the location of the <ref>a field</ref>"},
]
# duplicate the first good row 5x under the same patch to test the per-patch dedupe cap
for i in range(5):
    rows.append({
        "patch_id": "S2A_p1", "S1_name": "S1B_p1", "type": "bounding box", "category": "reference",
        "input": f"Identify the location of the <ref>object {i}</ref>",
        "output": f"[0.0{i} 0.1, 0.5 0.6]",
    })

selected, stats = select_rows(rows, max_examples=100, dedupe_per_patch=3)
assert len(selected) == 3, f"expected exactly 3 selected from S2A_p1 (dedupe cap), got {len(selected)}: {selected}"
assert all(r["patch_id"] == "S2A_p1" for r in selected)
assert stats["skipped_not_reference_category"] == 1
assert stats["skipped_not_bbox_type"] == 1
assert stats["skipped_no_patch_id"] == 1
assert stats["skipped_unparseable_or_invalid_box"] == 1
assert stats["skipped_missing_columns"] == 1
assert stats["skipped_per_patch_cap"] == 3  # 1 original + 5 dupes = 6 rows for S2A_p1, cap 3 -> 3 selected, 3 skipped
print("stats:", dict(stats))
print("PASS: select_rows integration test")
print("\nALL TESTS PASSED")
