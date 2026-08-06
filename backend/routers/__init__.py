"""Modular routers for Apka Munim backend.

Phase 2 (Foundation Fix) started moving feature routes out of the 5,958-line
server.py monolith into per-domain modules. Each router imports auth + scope
helpers directly from server.py to avoid a big refactor in one shot.
"""
