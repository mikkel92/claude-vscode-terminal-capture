import pandas as pd

df = pd.DataFrame([
    {"name": "Alice", "age": 30},
    {"name": "Bob", "age": 25},
])

# Bug: "agee" is a typo, should be "age"
result = df[df.agee > 20][["name", "salary"]]
print(result)
