"""
Unit and integration tests for the /api/v1/reports router and PDF report generation.
"""

import unittest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestReportsRouter(unittest.TestCase):

    def test_list_reports(self):
        """Validates report catalog listing endpoint."""
        res = client.get("/api/v1/reports")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data.get("success"))
        self.assertGreater(data.get("count"), 0)
        self.assertIn("download_url", data["data"][0])

    def test_generate_pdf_report(self):
        """Tests dynamic PDF report generation using existing reportlab script."""
        res = client.get("/api/v1/reports/generate/pdf?sector=Sector%2017")
        self.assertEqual(res.status_code, 200)
        json_data = res.json()
        self.assertTrue(json_data.get("success"))
        rep_data = json_data.get("data")
        self.assertIn("filename", rep_data)
        self.assertTrue(rep_data["filename"].endswith(".pdf"))
        self.assertGreater(rep_data["file_size_bytes"], 1000)
        self.assertEqual(rep_data["sector"], "Sector 17")

        # Now test downloading the generated report
        filename = rep_data["filename"]
        dl_res = client.get(f"/api/v1/reports/download/{filename}")
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res.headers.get("content-type"), "application/pdf")
        self.assertGreater(len(dl_res.content), 1000)

    def test_download_manual_alias(self):
        """Tests downloading standard technical manual via /reports/download/manual alias."""
        res = client.get("/api/v1/reports/download/manual")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("content-type"), "application/pdf")
        self.assertGreater(len(res.content), 5000)

    def test_download_nonexistent_report_404(self):
        """Verifies 404 behavior for invalid report filenames."""
        res = client.get("/api/v1/reports/download/nonexistent_file_9999.pdf")
        self.assertEqual(res.status_code, 404)


if __name__ == "__main__":
    unittest.main()
