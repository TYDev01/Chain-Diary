"""
Chain Diary Image Compression Service
FastAPI service for compressing images to WEBP format with <5MB size constraint
"""

import io
import os
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Chain Diary Image Compression Service",
    description="Compress images to WEBP format with size < 5MB",
    version="1.0.0"
)

# Configuration
PORT = int(os.getenv("PORT", 8000))
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", 5242880))  # 5MB in bytes
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3001,http://localhost:3000").split(",")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported image formats
SUPPORTED_FORMATS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".webp"}


def compress_image(image: Image.Image, target_size: int = MAX_FILE_SIZE, initial_quality: int = 85) -> bytes:
    """
    Compress an image to WEBP format with size below target_size.
    
    Args:
        image: PIL Image object
        target_size: Maximum file size in bytes
        initial_quality: Starting quality level (0-100)
    
    Returns:
        Compressed image as bytes
    
    Raises:
        HTTPException: If compression fails to meet size requirements
    """
    quality = initial_quality
    min_quality = 10
    
    # Convert RGBA to RGB if necessary
    if image.mode in ("RGBA", "LA", "P"):
        # Create white background
        background = Image.new("RGB", image.size, (255, 255, 255))
        if image.mode == "P":
            image = image.convert("RGBA")
        background.paste(image, mask=image.split()[-1] if image.mode == "RGBA" else None)
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")
    
    # Resize if image is too large (max 4000px on longest side)
    max_dimension = 4000
    if max(image.size) > max_dimension:
        ratio = max_dimension / max(image.size)
        new_size = tuple(int(dim * ratio) for dim in image.size)
        image = image.resize(new_size, Image.Resampling.LANCZOS)
        logger.info(f"Resized image to {new_size}")
    
    # Iteratively compress until size is acceptable
    while quality >= min_quality:
        buffer = io.BytesIO()
        image.save(buffer, format="WEBP", quality=quality, method=6)
        size = buffer.tell()
        
        logger.info(f"Compressed at quality {quality}: {size} bytes")
        
        if size <= target_size:
            buffer.seek(0)
            return buffer.read()
        
        # Reduce quality more aggressively as we get desperate
        if quality > 70:
            quality -= 5
        elif quality > 50:
            quality -= 10
        else:
            quality -= 15
    
    # If still too large, try more aggressive resizing
    if max(image.size) > 2000:
        ratio = 2000 / max(image.size)
        new_size = tuple(int(dim * ratio) for dim in image.size)
        image = image.resize(new_size, Image.Resampling.LANCZOS)
        logger.info(f"Aggressively resized image to {new_size}")
        
        buffer = io.BytesIO()
        image.save(buffer, format="WEBP", quality=min_quality, method=6)
        size = buffer.tell()
        
        if size <= target_size:
            buffer.seek(0)
            return buffer.read()
    
    raise HTTPException(
        status_code=422,
        detail=f"Unable to compress image below {target_size} bytes. Final size: {size} bytes"
    )


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "Chain Diary Image Compression Service",
        "status": "healthy",
        "version": "1.0.0",
        "max_file_size": MAX_FILE_SIZE
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/compress")
async def compress(file: UploadFile = File(...)):
    """
    Compress an uploaded image to WEBP format with size < 5MB.
    
    Args:
        file: Image file to compress
    
    Returns:
        Compressed image as WEBP
    
    Raises:
        HTTPException: If file is invalid or compression fails
    """
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in SUPPORTED_FORMATS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Supported formats: {', '.join(SUPPORTED_FORMATS)}"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Check file size (max 50MB input)
        if len(content) > 50 * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail="Input file too large. Maximum input size: 50MB"
            )
        
        # Open image
        try:
            image = Image.open(io.BytesIO(content))
        except Exception as e:
            logger.error(f"Failed to open image: {e}")
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Get original info
        original_size = len(content)
        original_format = image.format
        original_dimensions = image.size
        
        logger.info(f"Processing image: {file.filename}")
        logger.info(f"Original - Format: {original_format}, Size: {original_size} bytes, Dimensions: {original_dimensions}")
        
        # Compress image
        compressed_data = compress_image(image, target_size=MAX_FILE_SIZE)
        compressed_size = len(compressed_data)
        
        logger.info(f"Compression successful! {original_size} -> {compressed_size} bytes ({compressed_size/original_size*100:.1f}%)")
        
        # Return compressed image
        return Response(
            content=compressed_data,
            media_type="image/webp",
            headers={
                "Content-Disposition": f"attachment; filename={os.path.splitext(file.filename)[0]}.webp",
                "X-Original-Size": str(original_size),
                "X-Compressed-Size": str(compressed_size),
                "X-Compression-Ratio": f"{compressed_size/original_size*100:.1f}%"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Compression error: {e}")
        raise HTTPException(status_code=500, detail=f"Compression failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting compression service on port {PORT}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
