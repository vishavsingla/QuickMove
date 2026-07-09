variable "project" {
  type    = string
  default = "quickmove"
}

variable "aws_region" {
  type    = string
  default = "ap-south-1"
}

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "availability_zones" {
  type    = list(string)
  default = ["ap-south-1a", "ap-south-1b"]
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "quickmove"
}

variable "db_username" {
  type    = string
  default = "quickmove"
}

variable "db_password" {
  type      = string
  sensitive = true
  default   = "changeme"
}

variable "redis_node_type" {
  type    = string
  default = "cache.t4g.micro"
}

variable "tags" {
  type = map(string)
  default = {
    app = "quickmove"
    env = "staging"
  }
}
