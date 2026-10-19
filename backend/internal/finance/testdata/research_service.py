"""Disposable cross-service test bootstrap; uses the actual FinLab server/worker.

Namespace bootstrapping mirrors deploy/research/Dockerfile's isolated package
initializer, avoiding unrelated training/broker imports. No API/scoring mocks.
"""
import json
import os
import sys
import threading
import types
from pathlib import Path

root = Path(os.environ['FINLAB_TEST_REPO'])
package = types.ModuleType('finrl')
package.__path__ = [str(root / 'finrl')]
sys.modules['finrl'] = package
from sqlalchemy.engine import make_url
from finrl.api.core import Store
from finrl.api.server import ResearchServer
from finrl.api.worker import run_once

url = make_url(os.environ['FINLAB_TEST_RESEARCH_DATABASE_URL'])
if url.get_backend_name() != 'postgresql':
    raise RuntimeError('disposable PostgreSQL required')
url = url.update_query_dict({'options': '-csearch_path=' + os.environ['FINLAB_TEST_SCHEMA']})
store = Store(url)
server = ResearchServer(('127.0.0.1', 0), store, os.environ['FINLAB_DELEGATION_SECRET'])
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
print(json.dumps({'url': 'http://127.0.0.1:' + str(server.server_port)}), flush=True)
# Worker run_once needs the process main thread for its actual SIGALRM guard.
for line in sys.stdin:
    if line.strip() == 'run':
        print(json.dumps({'processed': run_once(store)}), flush=True)
    else:
        break
server.shutdown()
server.server_close()
store.engine.dispose()
