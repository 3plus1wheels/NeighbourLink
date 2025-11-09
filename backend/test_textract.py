"""
Test AWS Textract Address Verification
Run with: python backend/test_textract.py
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.textract_utils import (
    extract_text_from_document,
    extract_addresses_from_text,
    verify_address_from_document,
    normalize_address,
    calculate_address_similarity
)

def test_address_normalization():
    """Test address normalization"""
    print("\n" + "="*70)
    print("TESTING ADDRESS NORMALIZATION")
    print("="*70)
    
    addresses = [
        "123 Main Street, New York, NY 10001",
        "123 Main St, New York, NY 10001",
        "123  Main   St,  New  York,  NY  10001",
        "456 Oak Avenue, Apartment 5B",
        "789 Pine Road",
    ]
    
    for addr in addresses:
        normalized = normalize_address(addr)
        print(f"\nOriginal:   {addr}")
        print(f"Normalized: {normalized}")

def test_address_similarity():
    """Test address similarity calculation"""
    print("\n" + "="*70)
    print("TESTING ADDRESS SIMILARITY")
    print("="*70)
    
    test_cases = [
        ("123 Main St, NY", "123 Main Street, New York"),
        ("456 Oak Avenue", "456 Oak Ave"),
        ("789 Pine Rd", "123 Main St"),
        ("100 Broadway, New York, NY 10005", "100 Broadway NY 10005"),
    ]
    
    for addr1, addr2 in test_cases:
        similarity = calculate_address_similarity(addr1, addr2)
        match_status = "✓ MATCH" if similarity >= 0.8 else "✗ NO MATCH"
        print(f"\nAddress 1: {addr1}")
        print(f"Address 2: {addr2}")
        print(f"Similarity: {similarity*100:.1f}% {match_status} (threshold: 80%)")

def test_address_extraction():
    """Test address extraction from text"""
    print("\n" + "="*70)
    print("TESTING ADDRESS EXTRACTION")
    print("="*70)
    
    sample_text = """
    Bank of America
    Account Statement
    
    John Smith
    123 Main Street
    Apartment 4B
    New York, NY 10001
    
    Statement Date: November 9, 2025
    Account Number: ****1234
    
    For questions call: 1-800-123-4567
    """
    
    print("\nSample Text:")
    print(sample_text)
    
    addresses = extract_addresses_from_text(sample_text)
    print(f"\n✓ Found {len(addresses)} address(es):")
    for i, addr in enumerate(addresses, 1):
        print(f"  {i}. {addr}")

def test_with_sample_document():
    """Test with a sample document (you need to provide one)"""
    print("\n" + "="*70)
    print("TESTING WITH SAMPLE DOCUMENT")
    print("="*70)
    
    # You would need to provide a path to a sample document
    sample_path = input("\nEnter path to sample document (or press Enter to skip): ").strip()
    
    if not sample_path or not os.path.exists(sample_path):
        print("No valid document provided. Skipping this test.")
        return
    
    with open(sample_path, 'rb') as f:
        document_bytes = f.read()
    
    print(f"\n✓ Document loaded: {len(document_bytes)} bytes")
    
    # Test text extraction
    print("\nExtracting text...")
    extraction_result = extract_text_from_document(document_bytes)
    
    if extraction_result['success']:
        print(f"✓ Text extracted successfully")
        print(f"✓ Found {len(extraction_result['lines'])} lines\n")
        print("First 500 characters:")
        print("-" * 70)
        print(extraction_result['text'][:500])
        print("-" * 70)
        
        # Extract addresses
        print("\nExtracting addresses...")
        addresses = extract_addresses_from_text(extraction_result['text'])
        print(f"✓ Found {len(addresses)} address(es):")
        for i, addr in enumerate(addresses, 1):
            print(f"  {i}. {addr}")
        
        # Test verification
        if addresses:
            print("\n" + "="*70)
            print("TESTING ADDRESS VERIFICATION")
            print("="*70)
            
            claimed_address = {
                'street_address': input("\nEnter street address to verify: ").strip(),
                'city': input("Enter city: ").strip(),
                'state': input("Enter state (2 letters): ").strip(),
                'postal_code': input("Enter postal code: ").strip(),
            }
            
            print("\nVerifying address...")
            result = verify_address_from_document(document_bytes, claimed_address)
            
            print(f"\nResult: {result['message']}")
            print(f"Verified: {result['verified']} (threshold: 80%)")
            print(f"Confidence: {result['confidence']*100:.1f}%")
            
            if result.get('component_scores'):
                print(f"\nComponent Scores:")
                for component, score in result['component_scores'].items():
                    print(f"  {component}: {score*100:.0f}%")
            
            if result.get('best_match'):
                print(f"\nBest Match: {result['best_match']}")
                print(f"Similarity: {result.get('best_similarity', 0)*100:.1f}%")
    else:
        print(f"✗ Failed: {extraction_result.get('error')}")

def test_aws_connection():
    """Test AWS Textract connection"""
    print("\n" + "="*70)
    print("TESTING AWS TEXTRACT CONNECTION")
    print("="*70)
    
    from django.conf import settings
    from api.textract_utils import get_textract_client
    
    print("\nAWS Configuration:")
    print(f"  Access Key ID: {'SET' if settings.AWS_ACCESS_KEY_ID else 'NOT SET'}")
    print(f"  Secret Key: {'SET' if settings.AWS_SECRET_ACCESS_KEY else 'NOT SET'}")
    print(f"  Region: {settings.AWS_REGION}")
    
    print("\nInitializing Textract client...")
    client = get_textract_client()
    
    if client:
        print("✓ Textract client initialized successfully!")
        print("✓ AWS credentials are valid")
    else:
        print("✗ Failed to initialize Textract client")
        print("✗ Check your AWS credentials in .env file")

if __name__ == '__main__':
    print("\n" + "="*70)
    print("AWS TEXTRACT ADDRESS VERIFICATION TEST SUITE")
    print("="*70)
    
    try:
        test_aws_connection()
        test_address_normalization()
        test_address_similarity()
        test_address_extraction()
        test_with_sample_document()
        
        print("\n" + "="*70)
        print("✓ ALL TESTS COMPLETE!")
        print("="*70)
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
