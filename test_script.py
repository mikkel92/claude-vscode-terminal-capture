from pyspark.sql import SparkSession

spark = SparkSession.builder.getOrCreate()

# Bug: table name typo — "gold" should be the correct schema
df = spark.sql("SELECT * FROM denmark.goldd.buildings LIMIT 5")
df.show()
