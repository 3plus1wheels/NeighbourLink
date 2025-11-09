"""
AWS Textract Utilities for Address Verification

This module provides functions to:
1. Extract text from household documents (bills, bank statements)
2. Parse addresses from extracted text
3. Verify if extracted address matches user's claimed address
"""

import boto3
import re
import logging
from django.conf import settings
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


def get_textract_client():
    """Initialize and return AWS Textract client"""
    try:
        client = boto3.client(
            'textract',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Textract client: {e}")
        return None


def extract_text_from_document(image_bytes):
    """
    Extract all text from a document image using AWS Textract AnalyzeDocument
    AnalyzeDocument provides better text extraction with structure analysis
    
    Args:
        image_bytes: Binary image data
    
    Returns:
        dict: {
            'success': bool,
            'text': str (all extracted text),
            'lines': list (individual lines),
            'words': list (individual words),
            'error': str (if failed)
        }
    """
    try:
        client = get_textract_client()
        if not client:
            return {
                'success': False,
                'error': 'AWS Textract client not configured'
            }
        
        # Call Textract AnalyzeDocument with TABLES and FORMS features for better extraction
        # This provides more comprehensive text analysis than DetectDocumentText
        response = client.analyze_document(
            Document={'Bytes': image_bytes},
            FeatureTypes=['TABLES', 'FORMS']  # Extract structured data
        )
        
        # Extract all text from different block types
        full_text = ""
        lines = []
        words = []
        
        for block in response.get('Blocks', []):
            block_type = block.get('BlockType')
            text = block.get('Text', '')
            
            if block_type == 'LINE':
                lines.append(text)
                full_text += text + "\n"
            elif block_type == 'WORD':
                words.append(text)
        
        # If no lines were extracted, try to construct from words
        if not lines and words:
            full_text = " ".join(words)
            lines = [full_text]
        
        logger.info(f"Textract AnalyzeDocument extracted {len(lines)} lines and {len(words)} words")
        logger.info(f"=" * 80)
        logger.info(f"ALL EXTRACTED WORDS ({len(words)} total):")
        logger.info(f"=" * 80)
        for i, word in enumerate(words, 1):
            logger.info(f"  Word {i}: '{word}'")
        logger.info(f"=" * 80)
        
        return {
            'success': True,
            'text': full_text,
            'lines': lines,
            'words': words,
            'raw_response': response
        }
        
    except Exception as e:
        logger.error(f"Textract extraction failed: {e}")
        return {
            'success': False,
            'error': str(e)
        }


def extract_addresses_from_text(text):
    """
    Extract potential Canadian addresses from text using regex patterns
    
    Args:
        text: String containing document text
    
    Returns:
        list: List of potential addresses found
    """
    addresses = []
    
    # Canadian address patterns
    patterns = [
        # Full Canadian address: number, street, city, province, postal code
        r'\d+\s+[A-Za-z\s\.,#-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Circle|Cir|Crescent|Cres|Terrace|Ter)\s*[,\s]+[A-Za-z\s]+,?\s*(?:AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d',
        
        # Street address with optional unit/apt (Canadian style)
        r'\d+\s+[A-Za-z\s\.,#-]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl|Circle|Cir|Crescent|Cres|Parkway|Pkwy|Trail|Trl|Terrace|Ter)(?:\s*(?:Apt|Unit|Suite|Ste|#)\s*[A-Za-z0-9]+)?',
        
        # Number and street name (broader)
        r'\d+\s+[A-Za-z][A-Za-z\s]{2,}(?:\s+(?:NW|NE|SW|SE|N|S|E|W))?',
        
        # City, Province Postal Code pattern
        r'[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s+(?:AB|BC|MB|NB|NL|NT|NS|NU|ON|PE|QC|SK|YT)\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d',
        
        # Canadian postal code pattern (A1A 1A1 or A1A1A1)
        r'\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b',
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            address = match.group(0).strip()
            # Only add if it has some length and isn't already in list
            if len(address) > 5 and address not in addresses:
                addresses.append(address)
    
    return addresses


def normalize_address(address):
    """
    Normalize Canadian address for comparison
    - Convert to lowercase
    - Remove extra spaces
    - Standardize abbreviations
    """
    if not address:
        return ""
    
    address = address.lower().strip()
    
    # Standardize common Canadian address abbreviations
    replacements = {
        'street': 'st',
        'avenue': 'ave',
        'road': 'rd',
        'boulevard': 'blvd',
        'lane': 'ln',
        'drive': 'dr',
        'court': 'ct',
        'place': 'pl',
        'crescent': 'cres',
        'circle': 'cir',
        'terrace': 'ter',
        'apartment': 'apt',
        'suite': 'ste',
        'unit': 'unit',
        'northwest': 'nw',
        'northeast': 'ne',
        'southwest': 'sw',
        'southeast': 'se',
        'north': 'n',
        'south': 's',
        'east': 'e',
        'west': 'w',
    }
    
    for full, abbr in replacements.items():
        address = re.sub(r'\b' + full + r'\b', abbr, address)
    
    # Remove extra spaces
    address = re.sub(r'\s+', ' ', address)
    
    # Remove punctuation except hyphens and commas
    address = re.sub(r'[^\w\s,-]', '', address)
    
    return address


def calculate_address_similarity(address1, address2):
    """
    Calculate similarity ratio between two addresses
    
    Returns:
        float: Similarity ratio (0.0 to 1.0)
    """
    norm1 = normalize_address(address1)
    norm2 = normalize_address(address2)
    
    # Use SequenceMatcher for fuzzy matching
    ratio = SequenceMatcher(None, norm1, norm2).ratio()
    
    return ratio


def verify_address_from_document(image_bytes, claimed_address):
    """
    Main function to verify if claimed address matches document
    Scans ALL text from document and compares with selected address
    Verification passes if confidence >= 80%
    
    Args:
        image_bytes: Binary image data of document
        claimed_address: Dictionary with user's claimed address
            {
                'street_address': str,
                'city': str,
                'state': str,
                'postal_code': str
            }
    
    Returns:
        dict: {
            'verified': bool (True if confidence >= 80%),
            'confidence': float (0.0 to 1.0),
            'extracted_text': str (all text scanned from document),
            'found_addresses': list,
            'best_match': str,
            'component_scores': dict,
            'message': str
        }
    """
    try:
        # Step 1: Extract ALL text from document using AWS Textract
        logger.info("Starting document text extraction...")
        extraction_result = extract_text_from_document(image_bytes)
        
        if not extraction_result['success']:
            return {
                'verified': False,
                'confidence': 0.0,
                'message': f"Failed to extract text: {extraction_result.get('error', 'Unknown error')}"
            }
        
        extracted_text = extraction_result['text']
        logger.info(f"Successfully extracted {len(extracted_text)} characters from document")
        logger.info(f"=" * 80)
        logger.info(f"FULL EXTRACTED TEXT:")
        logger.info(f"=" * 80)
        logger.info(extracted_text)
        logger.info(f"=" * 80)
        
        # Step 2: Normalize the extracted text for better matching
        normalized_text = normalize_address(extracted_text)
        
        # Step 3: Build claimed address components
        street_address = claimed_address.get('street_address', '').strip()
        city = claimed_address.get('city', '').strip()
        state = claimed_address.get('state', '').strip()
        postal_code = claimed_address.get('postal_code', '').strip()
        
        # Build full claimed address
        claimed_full = f"{street_address} {city} {state} {postal_code}".strip()
        
        logger.info(f"Comparing with claimed address: {claimed_full}")
        logger.info(f"  Street: {street_address}")
        logger.info(f"  City: {city}")
        logger.info(f"  State: {state}")
        logger.info(f"  ZIP: {postal_code}")
        
        # Step 4: Calculate confidence by checking each address component IN THE ENTIRE DOCUMENT
        # This ensures we find the user's address even if bank address appears first
        component_scores = {}
        confidence_weights = {
            'street_address': 0.4,  # 40% weight
            'city': 0.2,            # 20% weight
            'state': 0.1,           # 10% weight
            'postal_code': 0.3      # 30% weight
        }
        
        total_confidence = 0.0
        
        # Check street address - look for it ANYWHERE in the entire document
        if street_address:
            normalized_street = normalize_address(street_address)
            
            # First: Direct substring match in entire document
            if normalized_street in normalized_text:
                component_scores['street_address'] = 1.0
                logger.info(f"✓ Street address found directly in document: {street_address}")
            else:
                # Second: Check each word/component of the street address
                # Extract meaningful parts (numbers and words longer than 2 chars)
                street_parts = [p for p in normalized_street.split() if len(p) > 1]
                matching_parts = sum(1 for part in street_parts if part in normalized_text)
                partial_score = matching_parts / len(street_parts) if street_parts else 0
                
                logger.info(f"Street parts: {street_parts}")
                logger.info(f"Matching parts: {matching_parts}/{len(street_parts)}")
                
                # Third: Fuzzy match with ALL found addresses in document
                found_addresses = extract_addresses_from_text(extracted_text)
                best_street_match = 0.0
                best_matching_addr = None
                
                for addr in found_addresses:
                    similarity = calculate_address_similarity(addr, street_address)
                    if similarity > best_street_match:
                        best_street_match = similarity
                        best_matching_addr = addr
                
                # Fourth: Try to find key components (street number + street name)
                # Extract street number (first set of digits)
                import re
                street_number_match = re.search(r'^\d+', street_address)
                if street_number_match:
                    street_number = street_number_match.group()
                    # Check if street number appears in document
                    if street_number in extracted_text:
                        # Street number found - give bonus score
                        partial_score = max(partial_score, 0.7)
                        logger.info(f"✓ Street number {street_number} found in document")
                
                # Use the best score from all methods
                component_scores['street_address'] = max(partial_score, best_street_match)
                
                if best_matching_addr:
                    logger.info(f"Fuzzy match: {street_address} ~= {best_matching_addr} ({best_street_match:.1%})")
                logger.info(f"Partial score: {partial_score:.1%}")
            
            total_confidence += component_scores['street_address'] * confidence_weights['street_address']
            logger.info(f"Street address confidence: {component_scores['street_address']:.2%}")
        
        # Check city - search ENTIRE document
        if city:
            normalized_city = normalize_address(city)
            if normalized_city in normalized_text:
                component_scores['city'] = 1.0
                logger.info(f"✓ City found in document: {city}")
            else:
                # Partial word matching
                city_words = normalized_city.split()
                if city_words:
                    matching_words = sum(1 for word in city_words if word in normalized_text)
                    component_scores['city'] = matching_words / len(city_words)
                else:
                    component_scores['city'] = 0.0
            
            total_confidence += component_scores['city'] * confidence_weights['city']
            logger.info(f"City confidence: {component_scores['city']:.2%}")
        
        # Check state - search ENTIRE document (Canadian provinces only)
        if state:
            normalized_state = normalize_address(state)
            
            # Canadian provinces mapping
            province_map = {
                'alberta': 'ab',
                'british columbia': 'bc',
                'manitoba': 'mb',
                'new brunswick': 'nb',
                'newfoundland and labrador': 'nl',
                'northwest territories': 'nt',
                'nova scotia': 'ns',
                'nunavut': 'nu',
                'ontario': 'on',
                'prince edward island': 'pe',
                'quebec': 'qc',
                'saskatchewan': 'sk',
                'yukon': 'yt'
            }
            
            # Get abbreviation for the claimed province
            province_abbr = province_map.get(normalized_state, state.upper()[:2])
            
            # Check for full name or abbreviation
            state_variations = [
                normalized_state,
                state.upper(),
                state.lower(),
                province_abbr.upper(),
                province_abbr.lower()
            ]
            
            found = False
            for var in state_variations:
                if var in normalized_text or var in extracted_text:
                    component_scores['state'] = 1.0
                    logger.info(f"✓ Province found in document: {state} (matched as '{var}')")
                    found = True
                    break
            
            if not found:
                component_scores['state'] = 0.0
                logger.info(f"✗ Province NOT found: {state} (tried: {state_variations})")
            
            total_confidence += component_scores['state'] * confidence_weights['state']
            logger.info(f"Province confidence: {component_scores['state']:.2%}")
        
        # Check postal code - Canadian format (A1A 1A1)
        if postal_code:
            # Canadian postal codes: Letter-Digit-Letter space Digit-Letter-Digit
            # Clean postal code for comparison
            postal_clean = postal_code.replace(' ', '').upper()
            
            # Try different formats
            postal_variations = [
                postal_code,  # Original format (e.g., "T3A 0X1")
                postal_clean,  # Without space (e.g., "T3A0X1")
                postal_clean[:3] + ' ' + postal_clean[3:] if len(postal_clean) >= 6 else postal_clean,  # A1A 1A1 format
                postal_clean[:3],  # First 3 characters (Forward Sortation Area)
            ]
            
            found = False
            for postal_var in postal_variations:
                if postal_var in extracted_text or postal_var in extracted_text.replace(' ', ''):
                    component_scores['postal_code'] = 1.0
                    logger.info(f"✓ Postal code found in document: {postal_code} (matched as '{postal_var}')")
                    found = True
                    break
            
            if not found:
                component_scores['postal_code'] = 0.0
                logger.info(f"✗ Postal code NOT found: {postal_code}")
            
            total_confidence += component_scores['postal_code'] * confidence_weights['postal_code']
            logger.info(f"Postal code confidence: {component_scores['postal_code']:.2%}")
        
        # Step 5: IMPROVED - Compare user's address with ALL found addresses in document
        # Don't just take the first one - check ALL of them and use the best match
        found_addresses = extract_addresses_from_text(extracted_text)
        logger.info(f"=" * 80)
        logger.info(f"FOUND {len(found_addresses)} ADDRESSES IN DOCUMENT:")
        logger.info(f"=" * 80)
        for i, addr in enumerate(found_addresses, 1):
            logger.info(f"  Address {i}: {addr}")
        logger.info(f"=" * 80)
        
        best_match = None
        best_similarity = 0.0
        all_matches = []
        
        logger.info(f"COMPARING EACH ADDRESS WITH USER'S CLAIMED ADDRESS:")
        logger.info(f"Claimed: {claimed_full}")
        logger.info(f"-" * 80)
        
        for i, found_addr in enumerate(found_addresses):
            similarity = calculate_address_similarity(found_addr, claimed_full)
            all_matches.append({
                'address': found_addr,
                'similarity': similarity
            })
            
            logger.info(f"Address {i+1}: {found_addr}")
            logger.info(f"  → Similarity: {similarity:.1%}")
            
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = found_addr
        
        if best_match:
            logger.info(f"=" * 80)
            logger.info(f"BEST MATCH FOUND: {best_match}")
            logger.info(f"SIMILARITY: {best_similarity:.1%}")
            logger.info(f"=" * 80)
        
        # Use the higher of component-based or whole-address confidence
        final_confidence = max(total_confidence, best_similarity)
        
        logger.info(f"=" * 80)
        logger.info(f"CONFIDENCE CALCULATION:")
        logger.info(f"=" * 80)
        logger.info(f"Component-based confidence: {total_confidence:.1%}")
        logger.info(f"  - Street: {component_scores.get('street_address', 0):.1%} × 40% weight")
        logger.info(f"  - City: {component_scores.get('city', 0):.1%} × 20% weight")
        logger.info(f"  - State: {component_scores.get('state', 0):.1%} × 10% weight")
        logger.info(f"  - ZIP: {component_scores.get('postal_code', 0):.1%} × 30% weight")
        logger.info(f"Whole-address confidence: {best_similarity:.1%}")
        logger.info(f"FINAL confidence (max of both): {final_confidence:.1%}")
        logger.info(f"=" * 80)
        
        # Step 6: Verification passes if confidence >= 80%
        CONFIDENCE_THRESHOLD = 0.80
        verified = final_confidence >= CONFIDENCE_THRESHOLD
        
        logger.info(f"=" * 80)
        logger.info(f"VERIFICATION RESULT: {'✓ VERIFIED' if verified else '✗ NOT VERIFIED'}")
        logger.info(f"Confidence: {final_confidence:.1%} (Threshold: {CONFIDENCE_THRESHOLD:.0%})")
        logger.info(f"=" * 80)
        
        return {
            'verified': verified,
            'confidence': final_confidence,
            'component_based_confidence': total_confidence,
            'whole_address_confidence': best_similarity,
            'extracted_text': extracted_text[:1000],  # Return first 1000 chars for debugging
            'all_found_addresses': found_addresses,
            'all_address_matches': all_matches,  # Shows similarity score for each found address
            'best_match': best_match,
            'best_similarity': best_similarity,
            'component_scores': component_scores,
            'threshold': CONFIDENCE_THRESHOLD,
            'message': f"{'✓ Address verified' if verified else '✗ Address not verified'} (confidence: {final_confidence*100:.1f}%, threshold: 80%)"
        }
        
    except Exception as e:
        logger.error(f"Address verification failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        
        return {
            'verified': False,
            'confidence': 0.0,
            'message': f"Verification error: {str(e)}"
        }
