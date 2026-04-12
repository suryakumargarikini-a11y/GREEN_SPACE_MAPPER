@echo off
REM start-analyzer.bat — Start the Python Green Space Analyzer on Windows
cd /d "%~dp0analyzer"

REM Create venv if needed
IF NOT EXIST ".venv" (
    echo Creating Python virtual environment...
    python -m venv .venv
)

REM Activate and install
call .venv\Scripts\activate.bat
echo Installing/verifying Python dependencies...
pip install -r requirements.txt -q

REM Start service
echo.
echo ================================================
echo  Green Space Analyzer running at:
echo  http://localhost:8000
echo  API docs: http://localhost:8000/docs
echo ================================================
echo.
uvicorn main:app --reload --port 8000 --host 0.0.0.0
