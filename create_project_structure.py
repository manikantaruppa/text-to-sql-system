# import os

# # Define the directory structure
# project_structure = {
#     "text-to-sql-system": {
#         "backend": {
#             "main.py": "",
#             "prompting_service.py": "",
#             "schema_analyzer.py": "",
#             "requirements.txt": "",
#             "static": {
#                 "index.html": ""
#             }
#         },
#         "frontend": {
#             "public": {
#                 "index.html": ""
#             },
#             "src": {
#                 "App.jsx": "",
#                 "index.js": "",
#                 "App.css": "",
#                 "components": {
#                     "FileUpload.jsx": "",
#                     "QueryInput.jsx": "",
#                     "ResultsDisplay.jsx": "",
#                     "LoadingSpinner.jsx": "",
#                     "DataVisualization.jsx": ""
#                 }
#             },
#             "package.json": "",
#             "README.md": ""
#         },
#         ".env": "",
#         "README.md": "",
#         "run.sh": ""
#     }
# }

# # Recursive function to create the structure
# def create_structure(base_path, structure):
#     for name, content in structure.items():
#         path = os.path.join(base_path, name)
#         if isinstance(content, dict):
#             os.makedirs(path, exist_ok=True)
#             create_structure(path, content)
#         else:
#             with open(path, 'w') as f:
#                 f.write(content)

# # Run it
# if __name__ == "__main__":
#     create_structure(".", project_structure)
#     print("✅ Project structure created successfully!")


import os

# Define the base directory
base_dir = "frontend"

# List of files and folders to create
structure = [
    ".env",
    "package.json",
    "tailwind.config.js",
    "postcss.config.js",
    "public/favicon.ico",
    "public/index.html",
    "public/manifest.json",
    "src/assets/logo.svg",
    "src/components/FileUpload.jsx",
    "src/components/QueryInput.jsx",
    "src/components/ResultsDisplay.jsx",
    "src/components/LoadingSpinner.jsx",
    "src/components/DataVisualization.jsx",
    "src/components/Header.jsx",
    "src/components/Footer.jsx",
    "src/components/ErrorBoundary.jsx",
    "src/contexts/AppContext.jsx",
    "src/hooks/useQuery.js",
    "src/hooks/useFileUpload.js",
    "src/services/api.js",
    "src/styles/index.css",
    "src/styles/tailwind.css",
    "src/utils/helpers.js",
    "src/App.jsx",
    "src/index.js"
]

# Create folders and empty files
for path in structure:
    full_path = os.path.join(base_dir, path)
    directory = os.path.dirname(full_path)
    os.makedirs(directory, exist_ok=True)
    if not os.path.exists(full_path):
        with open(full_path, "w") as f:
            f.write("")  # Create empty file

print(f"Frontend structure created under: {base_dir}")
