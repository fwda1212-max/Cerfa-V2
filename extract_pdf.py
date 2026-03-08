import json
import base64
import os

history_file = '/migrated_prompt_history/prompt_2026-02-19T13:26:58.596Z.json'
output_file = '/public/cerfaTemplate_4.pdf'

with open(history_file, 'r') as f:
    history = json.load(f)

# The last message is the user message with the file
last_msg = history[-1]
files_str = last_msg['payload']['files'][0]
file_data = json.loads(files_str)
base64_data = file_data['data']

# Decode base64
binary_data = base64.b64decode(base64_data)

# Write to file
with open(output_file, 'wb') as f:
    f.write(binary_data)

print(f"Successfully wrote {len(binary_data)} bytes to {output_file}")
