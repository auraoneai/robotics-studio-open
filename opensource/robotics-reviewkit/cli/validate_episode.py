import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]/"src"))
from robotics_reviewkit.validate import validate_episode
episode=json.loads(Path(sys.argv[1]).read_text())
errors=validate_episode(episode)
print(json.dumps({"valid": not errors, "errors": errors}, indent=2))
sys.exit(0 if not errors else 2)
