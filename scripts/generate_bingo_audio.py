import asyncio
import edge_tts
import os
import sys

VOICE = "am-ET-AmehaNeural"
OUTPUT_DIR = os.path.join("miniapp", "public", "audio", "bingo")

AMHARIC_NUMS = {
    1:'አንድ', 2:'ሁለት', 3:'ሶስት', 4:'አራት', 5:'አምስት',
    6:'ስድስት', 7:'ሰባት', 8:'ስምንት', 9:'ዘጠኝ', 10:'አስር',
    11:'አስራ አንድ', 12:'አስራ ሁለት', 13:'አስራ ሶስት', 14:'አስራ አራት', 15:'አስራ አምስት',
    16:'አስራ ስድስት', 17:'አስራ ሰባት', 18:'አስራ ስምንት', 19:'አስራ ዘጠኝ', 20:'ሃያ',
    21:'ሃያ አንድ', 22:'ሃያ ሁለት', 23:'ሃያ ሶስት', 24:'ሃያ አራት', 25:'ሃያ አምስት',
    26:'ሃያ ስድስት', 27:'ሃያ ሰባት', 28:'ሃያ ስምንት', 29:'ሃያ ዘጠኝ', 30:'ሠላሳ',
    31:'ሠላሳ አንድ', 32:'ሠላሳ ሁለት', 33:'ሠላሳ ሶስት', 34:'ሠላሳ አራት', 35:'ሠላሳ አምስት',
    36:'ሠላሳ ስድስት', 37:'ሠላሳ ሰባት', 38:'ሠላሳ ስምንት', 39:'ሠላሳ ዘጠኝ', 40:'አርባ',
    41:'አርባ አንድ', 42:'አርባ ሁለት', 43:'አርባ ሶስት', 44:'አርባ አራት', 45:'አርባ አምስት',
    46:'አርባ ስድስት', 47:'አርባ ሰባት', 48:'አርባ ስምንት', 49:'አርባ ዘጠኝ', 50:'ሃምሳ',
    51:'ሃምሳ አንድ', 52:'ሃምሳ ሁለት', 53:'ሃምሳ ሶስት', 54:'ሃምሳ አራት', 55:'ሃምሳ አምስት',
    56:'ሃምሳ ስድስት', 57:'ሃምሳ ሰባት', 58:'ሃምሳ ስምንት', 59:'ሃምሳ ዘጠኝ', 60:'ስልሳ',
    61:'ስልሳ አንድ', 62:'ስልሳ ሁለት', 63:'ስልሳ ሶስት', 64:'ስልሳ አራት', 65:'ስልሳ አምስት',
    66:'ስልሳ ስድስት', 67:'ስልሳ ሰባት', 68:'ስልሳ ስምንት', 69:'ስልሳ ዘጠኝ', 70:'ሰባ',
    71:'ሰባ አንድ', 72:'ሰባ ሁለት', 73:'ሰባ ሶስት', 74:'ሰባ አራት', 75:'ሰባ አምስት',
}

RANGES = {
    'B': range(1,16), 
    'I': range(16,31), 
    'N': range(31,46), 
    'G': range(46,61), 
    'O': range(61,76)
}

async def generate_file(text, filename, force=False):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path) and not force:
        print(f"Skipping {filename}, already exists.")
        return
    
    print(f"Generating {filename}...")
    try:
        communicate = edge_tts.Communicate(text, VOICE)
        await communicate.save(file_path)
    except Exception as e:
        print(f"Error generating {filename}: {e}")

async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print(f"Using Voice: {VOICE}")
    print(f"Output Directory: {OUTPUT_DIR}\n")
    
    # Generate numbers 1 to 75
    # Format: "B, አንድ" — just the BINGO letter + Amharic number
    for letter, nums in RANGES.items():
        for num in nums:
            amharic = AMHARIC_NUMS[num]
            text = f"{letter}, {amharic}"
            filename = f"bingo_{num:02d}.mp3"
            await generate_file(text, filename, force=True)
        
    # Generate special sounds
    for name, text in SPECIAL.items():
        filename = f"{name}.mp3"
        await generate_file(text, filename)

    print("\nGeneration complete!")

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
