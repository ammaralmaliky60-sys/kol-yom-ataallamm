"""Create a downloadable source ZIP without Site identity or runtime data."""
from pathlib import Path
import subprocess,zipfile
root=Path(__file__).resolve().parent.parent
files=subprocess.check_output(['git','ls-files','-z'],cwd=root).decode().split('\0')
output=root/'dist'/'project.zip'
with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED) as archive:
 for file in files:
  if not file or file.startswith('.openai/') or file.startswith('qa/') or file.endswith('.zip'):continue
  path=root/file
  if path.is_file():archive.write(path,'kol-yom-ataallam/'+file)
print(output)
