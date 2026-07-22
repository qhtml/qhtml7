#!/bin/bash

set -e

show_help() {
    echo "Usage:"
    echo "  $0 --diff <source.zip> <folder_path>"
    echo "  $0 --bundle <source.zip> <diff.zip> --output <destination.zip>"
    exit 1
}

# Ensure dependencies are installed
for cmd in unzip zip md5sum git; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: Required command '$cmd' is missing." >&2
        exit 1
    fi
done

if [ $# -lt 3 ]; then
    show_help
fi

MODE=$1

if [ "$MODE" = "--diff" ]; then
    ZIP_FILE=$2
    FOLDER_PATH=$3

    if [ ! -f "$ZIP_FILE" ]; then
        echo "Error: Zip file '$ZIP_FILE' not found." >&2
        exit 1
    fi
    if [ ! -d "$FOLDER_PATH" ]; then
        echo "Error: Folder '$FOLDER_PATH' not found." >&2
        exit 1
    fi

    # Convert folder path to absolute path
    ABS_FOLDER_PATH=$(cd "$FOLDER_PATH" && pwd)

    # Create temporary directory for zip extraction
    TMP_DIR=$(mktemp -d -t zipdiff-XXXXXX)
    trap 'rm -rf "$TMP_DIR"' EXIT

    echo "Extracting zip file for checksum verification..."
    unzip -q "$ZIP_FILE" -d "$TMP_DIR"

    # Prepare naming conventions
    BASE_NAME=$(basename "$ZIP_FILE" .zip)
    TIMESTAMP=$(date +"%Y-%m-%d-%H.%M.%S")
    OUTPUT_ZIP="${BASE_NAME}.diff.${TIMESTAMP}.zip"
    OUTPUT_ZIP_ABS="$(pwd)/$OUTPUT_ZIP"

    # Create a staging folder inside temp to organize the diff files cleanly
    STAGE_DIR="$TMP_DIR/stage"
    mkdir -p "$STAGE_DIR"

    echo "Scanning folder for modifications and new files..."
    CHANGES_FOUND=0

    # Read every file in the target folder recursively
    cd "$ABS_FOLDER_PATH"
    
    # Check if a .gitignore file actually exists to determine exclusion strategy
    HAS_GITIGNORE=0
    if [ -f ".gitignore" ]; then
        HAS_GITIGNORE=1
    fi

    find . -type f | while read -r FILE_REL; do
        CLEAN_PATH="${FILE_REL#./}"
        ZIP_VERSION="$TMP_DIR/$CLEAN_PATH"
        TARGET_VERSION="$ABS_FOLDER_PATH/$CLEAN_PATH"

        # Check gitignore rules if the file exists
        if [ "$HAS_GITIGNORE" -eq 1 ]; then
            # git check-ignore returns 0 if a file matches the ignore patterns
            if git check-ignore -q "$CLEAN_PATH"; then
                continue
            fi
        fi

        if [ -f "$ZIP_VERSION" ]; then
            # File exists in both: Check MD5 for changes
            SUM_ZIP=$(md5sum "$ZIP_VERSION" | awk '{print $1}')
            SUM_TARGET=$(md5sum "$TARGET_VERSION" | awk '{print $1}')

            if [ "$SUM_ZIP" != "$SUM_TARGET" ]; then
                echo "Modified: $CLEAN_PATH"
                mkdir -p "$STAGE_DIR/$(dirname "$CLEAN_PATH")"
                cp "$TARGET_VERSION" "$STAGE_DIR/$CLEAN_PATH"
                CHANGES_FOUND=$((CHANGES_FOUND + 1))
            fi
        else
            # File does not exist in zip: It is a brand new file
            echo "New File:  $CLEAN_PATH"
            mkdir -p "$STAGE_DIR/$(dirname "$CLEAN_PATH")"
            cp "$TARGET_VERSION" "$STAGE_DIR/$CLEAN_PATH"
            CHANGES_FOUND=$((CHANGES_FOUND + 1))
        fi
    done

    # Build the diff zip archive if changes were found
    if [ -d "$STAGE_DIR" ] && [ "$(ls -A "$STAGE_DIR")" ]; then
        cd "$STAGE_DIR"
        zip -q -r "$OUTPUT_ZIP_ABS" .
        echo "Success: Created diff archive with $CHANGES_FOUND change(s) -> $OUTPUT_ZIP"
    else
        echo "No changes or new files detected. No diff archive created."
    fi

elif [ "$MODE" = "--bundle" ]; then
    SRC_ZIP=$2
    DIFF_ZIP=$3
    OUT_FLAG=$4
    DEST_ZIP=$5

    if [ "$OUT_FLAG" != "--output" ] || [ -z "$DEST_ZIP" ]; then
        show_help
    fi
    if [ ! -f "$SRC_ZIP" ]; then
        echo "Error: Source zip '$SRC_ZIP' not found." >&2
        exit 1
    fi
    if [ ! -f "$DIFF_ZIP" ]; then
        echo "Error: Diff zip '$DIFF_ZIP' not found." >&2
        exit 1
    fi

    # Initialize destination zip with original file base
    cp "$SRC_ZIP" "$DEST_ZIP"

    TMP_DIR=$(mktemp -d -t zipbundle-XXXXXX)
    trap 'rm -rf "$TMP_DIR"' EXIT

    echo "Extracting updates from diff package..."
    unzip -q "$DIFF_ZIP" -d "$TMP_DIR"

    # Setup absolute path destination tracking
    cd "$TMP_DIR"
    cd - > /dev/null
    DEST_ZIP_ABS="$(cd "$(dirname "$DEST_ZIP")" && pwd)/$(basename "$DEST_ZIP")"
    cd "$TMP_DIR"

    echo "Injecting updated and new files into destination archive..."
    find . -type f | while read -r FILE_REL; do
        CLEAN_PATH="${FILE_REL#./}"
        zip -q -u "$DEST_ZIP_ABS" "$CLEAN_PATH"
    done

    echo "Success: Bundled archive created -> $DEST_ZIP"

else
    show_help
fi
