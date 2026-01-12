# SENSA Prompt Version History

This directory contains all versioned system prompts used for AI content generation.

## Current Active Version

| Prompt | Version | File | Description |
|--------|---------|------|-------------|
| Master Curriculum | v4.0 | `v4.0_master_curriculum_designer.txt` | Full SENSA v2.0 prompt with SHAPE, Mnemonics |
| Silver Bullet | v4.1 | *inline in `system_prompt.py`* | Parallelized 4-part generation prompt |

## Changelog

### v4.0 (December 2025)
- Initial formalized version
- Contains: Tier Classification, SHAPE Micro-Learning, Mnemonic Anchors, Dependency Graph
- Used for: Master curriculum generation

### v4.1 (Silver Bullet - January 2026)
- Parallelized prompt split into 4 parts (70 concepts total)
- Used for: `get_silver_bullet_prompt()` in Lambda

---

## How to Add a New Version

1. Copy the existing prompt text to a new file: `v{new_version}_{description}.txt`
2. Make your changes in the new file
3. Update `backend/lambda/shared/system_prompt.py` with a version comment
4. Update this README with the changelog entry
