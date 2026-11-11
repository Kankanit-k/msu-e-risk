#!/bin/bash
# package.sh
# Creates a compressed tar.gz archive of the project, excluding unnecessary files.

OUTPUT_FILE="mui-template.tar.gz"

echo "Packaging project into $OUTPUT_FILE..."

tar -czf "$OUTPUT_FILE" \
  --exclude="$OUTPUT_FILE" \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='backend/node_modules' \
  --exclude='backend/dist' \
  .

echo "Done! Archive created: $OUTPUT_FILE"
