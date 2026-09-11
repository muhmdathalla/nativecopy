"""
Vercel Serverless Function Handler for NativeCopy
"""

import sys
import os
import json
import urllib.parse
from http.server import BaseHTTPRequestHandler

# Add root directory to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import database
from server import NativeCopyHandler, broadcast_user_event, get_local_ips

class handler(NativeCopyHandler):
    """Vercel entrypoint handler subclassing NativeCopyHandler."""
    pass
