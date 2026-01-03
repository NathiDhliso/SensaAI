output "content_bucket_name" {
  description = "S3 bucket name for content"
  value       = aws_s3_bucket.content.bucket
}

output "content_bucket_arn" {
  description = "S3 bucket ARN for content"
  value       = aws_s3_bucket.content.arn
}
