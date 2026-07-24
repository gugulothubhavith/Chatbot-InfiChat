import sqlite3
c=sqlite3.connect('test_infichat.db')
print(c.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall())
