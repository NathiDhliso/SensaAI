import zipfile
import os
import sys

src = os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'lambda')
dest = os.path.join(os.path.dirname(__file__), '..', 'terraform', 'modules', 'lambda', 'lambda_code.zip')

src = os.path.abspath(src)
dest = os.path.abspath(dest)

print(f"Zipping: {src}")
print(f"Output:  {dest}")

with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in ('__pycache__', '.pytest_cache', 'venv', '.venv')]
        for file in files:
            if file.endswith('.pyc'):
                continue
            abs_path = os.path.join(root, file)
            arc_name = os.path.relpath(abs_path, src)
            zf.write(abs_path, arc_name)

size_kb = os.path.getsize(dest) / 1024
print(f"Done: {size_kb:.0f} KB")
