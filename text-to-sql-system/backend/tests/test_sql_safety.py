import unittest
from fastapi import HTTPException

from main import validate_and_prepare_sql


TEST_SCHEMA = {
    "table_name": "sales_data",
    "columns": [
        {"name": "region"},
        {"name": "total_sales"},
        {"name": "created_at"},
        {"name": "product_id"},
    ]
}


class TestSqlSafety(unittest.TestCase):
    def test_select_only_allowed(self):
        sql = 'SELECT "region", "total_sales" FROM "sales_data"'
        prepared = validate_and_prepare_sql(sql, TEST_SCHEMA)
        self.assertIn("LIMIT", prepared.upper())

    def test_with_cte_allowed(self):
        sql = """
        WITH tmp AS (
            SELECT "region", "total_sales" FROM "sales_data"
        )
        SELECT * FROM tmp
        """
        prepared = validate_and_prepare_sql(sql, TEST_SCHEMA)
        self.assertIn("LIMIT", prepared.upper())

    def test_rejects_ddl_dml(self):
        bad = [
            'DROP TABLE "sales_data"',
            'UPDATE "sales_data" SET "region" = \'x\'',
            'DELETE FROM "sales_data"',
            'INSERT INTO "sales_data" ("region") VALUES (\'x\')',
        ]
        for sql in bad:
            with self.assertRaises(HTTPException):
                validate_and_prepare_sql(sql, TEST_SCHEMA)

    def test_rejects_semicolon_and_comments(self):
        bad = [
            'SELECT * FROM "sales_data"; SELECT 1',
            'SELECT * FROM "sales_data" -- comment',
            'SELECT * FROM "sales_data" /* comment */',
        ]
        for sql in bad:
            with self.assertRaises(HTTPException):
                validate_and_prepare_sql(sql, TEST_SCHEMA)

    def test_allows_trailing_semicolon(self):
        sql = 'SELECT "region" FROM "sales_data";'
        prepared = validate_and_prepare_sql(sql, TEST_SCHEMA)
        self.assertNotIn(";", prepared)

    def test_rejects_unknown_table(self):
        sql = 'SELECT * FROM "other_table"'
        with self.assertRaises(HTTPException):
            validate_and_prepare_sql(sql, TEST_SCHEMA)

    def test_rejects_unknown_identifier(self):
        sql = 'SELECT "unknown_col" FROM "sales_data"'
        with self.assertRaises(HTTPException):
            validate_and_prepare_sql(sql, TEST_SCHEMA)

    def test_allows_known_identifiers(self):
        sql = 'SELECT "region", "total_sales" FROM "sales_data"'
        prepared = validate_and_prepare_sql(sql, TEST_SCHEMA)
        self.assertIn('"sales_data"', prepared)

    def test_limit_not_duplicated(self):
        sql = 'SELECT "region" FROM "sales_data" LIMIT 10'
        prepared = validate_and_prepare_sql(sql, TEST_SCHEMA)
        self.assertEqual(prepared.strip().lower().count("limit"), 1)


if __name__ == "__main__":
    unittest.main()
