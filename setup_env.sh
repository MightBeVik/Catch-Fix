# Delete Existing one if needed
deactivate
rm -rf venv

# 1. Create a new virtual environment with Python
python3.13 -m venv .venv

# 2. Activate the new environment
source .venv/bin/activate

# 3. Check the python version
python --version

# 3. Install dependencies
pip install -r requirements.txt