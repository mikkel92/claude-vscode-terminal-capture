from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

# Bug: "goldd" is a typo, should be "gold"
df = spark.sql("SELECT * FROM denmark.gold.buildings LIMIT 5")
df.show()
