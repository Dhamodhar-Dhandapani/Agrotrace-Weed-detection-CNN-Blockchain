
import py_compile

try:
    py_compile.compile('backend/models.py', doraise=True)
    print("models.py syntax is correct.")
except py_compile.PyCompileError as e:
    print(f"models.py error: {e}")

try:
    py_compile.compile('backend/reset_and_populate_db.py', doraise=True)
    print("reset_and_populate_db.py syntax is correct.")
except py_compile.PyCompileError as e:
    print(f"reset_and_populate_db.py error: {e}")
