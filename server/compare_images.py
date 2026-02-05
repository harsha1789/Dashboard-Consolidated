import sys
import json
from PIL import Image, ImageChops, ImageDraw
import numpy as np

def compare_images(baseline_path, current_path, diff_path):
    """
    Compare two images pixel by pixel using Pillow and NumPy.
    Returns detailed comparison metrics.
    """
    try:
        # Load images
        baseline = Image.open(baseline_path).convert('RGB')
        current = Image.open(current_path).convert('RGB')

        size_mismatch = False
        original_baseline_size = baseline.size
        original_current_size = current.size

        # Handle dimension mismatch by padding smaller image
        if baseline.size != current.size:
            size_mismatch = True
            max_width = max(baseline.size[0], current.size[0])
            max_height = max(baseline.size[1], current.size[1])

            # Create new images with the max dimensions (white background)
            if baseline.size != (max_width, max_height):
                new_baseline = Image.new('RGB', (max_width, max_height), (255, 255, 255))
                new_baseline.paste(baseline, (0, 0))
                baseline = new_baseline

            if current.size != (max_width, max_height):
                new_current = Image.new('RGB', (max_width, max_height), (255, 255, 255))
                new_current.paste(current, (0, 0))
                current = new_current

        # Convert to numpy arrays for pixel-by-pixel comparison
        baseline_array = np.array(baseline)
        current_array = np.array(current)

        # Calculate pixel differences
        diff_array = np.abs(baseline_array.astype(int) - current_array.astype(int))

        # Create difference mask (any channel differs)
        diff_mask = np.any(diff_array > 0, axis=2)

        # Count pixels
        total_pixels = baseline.size[0] * baseline.size[1]
        diff_pixels = np.sum(diff_mask)
        matching_pixels = total_pixels - diff_pixels
        accuracy = (matching_pixels / total_pixels) * 100

        # Create visual diff image
        diff_image = Image.new('RGB', baseline.size)
        diff_pixels_data = []

        for y in range(baseline.size[1]):
            for x in range(baseline.size[0]):
                if diff_mask[y, x]:
                    # Highlight differences in bright red
                    diff_pixels_data.append((255, 0, 0))
                else:
                    # Keep original pixel but slightly faded
                    original = baseline.getpixel((x, y))
                    diff_pixels_data.append(tuple(int(c * 0.7) for c in original))

        diff_image.putdata(diff_pixels_data)

        # Add border and annotations
        draw = ImageDraw.Draw(diff_image)

        # Save diff image
        diff_image.save(diff_path, 'PNG')

        result = {
            'diffPixels': int(diff_pixels),
            'totalPixels': int(total_pixels),
            'matchingPixels': int(matching_pixels),
            'accuracy': round(accuracy, 4),
            'dimensions': f'{baseline.size[0]}x{baseline.size[1]}'
        }

        if size_mismatch:
            result['sizeMismatch'] = True
            result['baselineSize'] = f'{original_baseline_size[0]}x{original_baseline_size[1]}'
            result['currentSize'] = f'{original_current_size[0]}x{original_current_size[1]}'

        return result

    except Exception as e:
        return {
            'error': str(e),
            'diffPixels': -1,
            'totalPixels': 0,
            'matchingPixels': 0,
            'accuracy': 0.0
        }

if __name__ == '__main__':
    if len(sys.argv) != 4:
        print(json.dumps({'error': 'Usage: python compare_images.py <baseline> <current> <diff_output>'}))
        sys.exit(1)

    baseline_path = sys.argv[1]
    current_path = sys.argv[2]
    diff_path = sys.argv[3]

    result = compare_images(baseline_path, current_path, diff_path)
    print(json.dumps(result))
