import re
import itertools
import chardet
import pandas as pd

class CSVPreprocessor:
    def __init__(self, filepath: str, delimiter: str = None, encoding: str = None):
        """
        filepath   : path to your CSV/TSV
        delimiter  : if you already know it (e.g. ',' or '\\t'), set it here
        encoding   : if you know it, set it here (else will be autodetected)
        """
        self.filepath  = filepath
        self.delimiter = delimiter
        self.encoding  = encoding
        self.df        = None

    def detect_encoding(self, n_bytes: int = 100_000) -> str:
        with open(self.filepath, "rb") as f:
            raw = f.read(n_bytes)
        guess = chardet.detect(raw)
        self.encoding = guess["encoding"] or "utf-8"
        print(f"🔍 Detected encoding: {self.encoding} (confidence {guess['confidence']:.2f})")
        return self.encoding

    def detect_delimiter(self, sample_lines: int = 10) -> str:
        # read a few lines in text mode (with replace errors)
        with open(self.filepath, "r", encoding=self.encoding or "utf-8", errors="replace") as f:
            sample = "".join(itertools.islice(f, sample_lines))
        candidates = [",", "\t", ";", "|"]
        counts = {d: sample.count(d) for d in candidates}
        # pick the delimiter that appears most often
        self.delimiter = max(counts, key=counts.get)
        print(f"🔍 Detected delimiter: {repr(self.delimiter)}")
        return self.delimiter

    def read_raw(self) -> pd.DataFrame:
        # 1) ensure encoding & delimiter
        if not self.encoding:
            self.detect_encoding()
        if not self.delimiter:
            self.detect_delimiter()

        # 2) read into pandas, skipping bad lines
        self.df = pd.read_csv(
            self.filepath,
            sep=self.delimiter,
            engine="python",
            encoding=self.encoding,
            dtype=str,              # load everything as str for cleaning
            skip_blank_lines=True,
            on_bad_lines="skip",    # skip rows that don't match column count
            skipinitialspace=True,  # trim spaces after delimiter
            quotechar='"'
        )
        print(f"🔢 Raw rows read: {len(self.df)}")
        return self.df

    def normalize_headers(self) -> pd.DataFrame:
        df = self.df
        df.columns = [
            re.sub(r"[^\w]+", "_", col.strip())
               .strip("_")
               .lower()
            for col in df.columns
        ]
        self.df = df
        return df

    def clean_values(self) -> pd.DataFrame:
        df = self.df

        # Identify column types by name
        pct_cols  = [c for c in df.columns if "prevalence" in c]
        num_cols  = [c for c in df.columns if any(k in c for k in ("number","deaths"))]
        year_cols = [c for c in df.columns if "year" in c]

        # Helper to strip commas, brackets, then parse
        def _clean_num(x):
            if pd.isna(x): return None
            s = re.sub(r"\[.*?\]", "", str(x))  # drop footnotes
            s = s.replace(",", "").strip()
            if s in ("", "-", "–", "—"): return None
            try:
                # prefer int if no dot
                return int(s) if s.isdigit() else float(s)
            except ValueError:
                return None

        # Percent → float
        for c in pct_cols:
            df[c] = (
                df[c]
                .str.replace("%", "", regex=False)
                .apply(_clean_num)
                .apply(lambda v: v/100 if v is not None else None)
            )

        # Counts → nullable Int
        for c in num_cols:
            df[c] = df[c].apply(_clean_num).astype("Int64")

        # Years → nullable Int
        for c in year_cols:
            df[c] = df[c].apply(_clean_num).astype("Int64")

        # Everything else → clean text
        other_cols = set(df.columns) - set(pct_cols) - set(num_cols) - set(year_cols)
        for c in other_cols:
            df[c] = (
                df[c]
                .astype(str)
                .str.strip()
                .apply(lambda s: re.sub(r"[^\x00-\x7F]+", "", s) if s and s != "nan" else None)
            )

        self.df = df
        return df

    def preprocess(self) -> pd.DataFrame:
        """
        Run the full pipeline: read → normalize headers → clean values
        Returns the cleaned DataFrame.
        """
        self.read_raw()
        self.normalize_headers()
        return self.clean_values()


# ------------------------- USAGE EXAMPLE -------------------------
if __name__ == "__main__":
    pre = CSVPreprocessor("/home/ntlpt-42/Downloads/HIV_AIDS prevalence estimates table.csv")
    clean_df = pre.preprocess()
    print("✅ Clean DataFrame:")
    print(clean_df.head(), "\n")
    print(clean_df)
    print("Dtypes:\n", clean_df.dtypes)
    output_csv = "/home/ntlpt-42/Downloads/cleaned_hiv_data.csv"
    clean_df.to_csv(output_csv, index=False, encoding="utf-8")
    print(f"✅ DataFrame saved as CSV to {output_csv}")
