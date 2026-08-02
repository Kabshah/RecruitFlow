import os
import pdfplumber
import docx
from paddleocr import PaddleOCR

class DocumentParser:
    def __init__(self, char_threshold: int = 100):
        self.char_threshold = char_threshold
        self._ocr = None

    def _get_ocr(self):
        if self._ocr is None:
            # Lazy initialization to save memory/startup time
            self._ocr = PaddleOCR(use_angle_cls=True, lang='en')
        return self._ocr

    def parse_pdf(self, file_path: str) -> str:
        text = ""
        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    extracted = page.extract_text()
                    if extracted:
                        text += extracted + "\n"
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")
        
        # Fallback to OCR if the extracted text is too brief or empty
        # Usually implies a scanned image-based PDF
        if len(text.strip()) < self.char_threshold:
            print("Direct text extraction yielded little text. Falling back to OCR.")
            return self.fallback_ocr(file_path)
            
        return text.strip()

    def parse_docx(self, file_path: str) -> str:
        doc = docx.Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text.strip()

    def fallback_ocr(self, file_path: str) -> str:
        """
        Runs PaddleOCR. PaddleOCR can directly parse multipage PDFs.
        """
        ocr = self._get_ocr()
        result = ocr.ocr(file_path, cls=True)
        text = ""
        if result:
            for page in result:
                if page:
                    for line in page:
                        if isinstance(line, list) and len(line) > 1 and isinstance(line[1], tuple):
                            text += line[1][0] + "\n"
        return text.strip()

    def extract_text(self, file_path: str) -> str:
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            return self.parse_pdf(file_path)
        elif ext in [".docx"]:
            return self.parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")
