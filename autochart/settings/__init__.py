"""
Settings used by autochart project.

This consists of the general produciton settings, with an optional import of any local
settings.
"""

# Import production settings.
from autochart.settings.production import *

# Import optional local settings.
try:
    from autochart.settings.local import *
except ImportError:
    pass