# Anomaly Logs Application

## Table of Contents
1. [Introduction](#introduction)
2. [Installation Guide](#installation-guide)
   - [Prerequisites](#prerequisites)
   - [Step-by-step Installation](#step-by-step-installation)
3. [Database Setup](#database-setup)
   - [DDL Script](#ddl-script)
4. [Running the Application](#running-the-application)
5. [Troubleshooting](#troubleshooting)
6. [Acknowledgement](#acknowledgement)

---

## Introduction
This application logs and tracks DDoS anomalies. The logs are stored in a MySQL database, delivered through web socket connection to be visualized in client side.

---

## Installation Guide
### Prerequisites
Before setting up and running the application, ensure that you have the following installed:
- Node.js (version 14 or higher)
- MySQL (version 5.7 or higher)

### Step-by-step Installation
1. Install all dependecies using "npm install" both in frontEnd and webSocket directory
2. Go to /webSocket/.env and configure your DB, DB_USER, DB_PASSWORD, TABLE_NAME to set your local database up
3. Go to /frontEnd/public/scripts/mainScript.js and insert your ipinfo token (ipInfoToken = "IP INFO TOKEN"; (Line 27))
4. Set up your local mysql database



## Database Setup
### DDL Script
To set up the database, create your database (ex: database_name_example)

Use the following SQL script to create the required table for logging anomaly data.

(Database and table name must be the same name you set on .env file (DB and TABLE_NAME field on .env file))

```sql
CREATE TABLE table_name_example (
    id INT AUTO_INCREMENT PRIMARY KEY,  -- Primary key with auto-increment
    anomaly_id VARCHAR(255),            -- Anomaly ID
    creation_time DATETIME,             -- Creation timestamp
    update_time DATETIME,               -- Update timestamp
    type VARCHAR(100),                  -- Type of anomaly 
    sub_type VARCHAR(100),              -- Sub-type of the anomaly 
    scope VARCHAR(100),                 -- Scope
    severity VARCHAR(50),               -- Severity (e.g., Yellow, Red)
    status VARCHAR(50),                 -- Current status (e.g., Ongoing, Recovered)
    direction VARCHAR(50),              -- Attack direction
    resource VARCHAR(255),              -- Resource
    resource_id VARCHAR(255),           -- Resource ID
    importance VARCHAR(50),             -- Importance
    triggered_value VARCHAR(50),        -- triggered value
    threshold VARCHAR(50),              -- Threshold value
    unit VARCHAR(50),                   -- Unit of measurement (e.g., pps, bps)
    anomaly_host_ip VARCHAR(45),        -- Anomaly source IP
    sip1 VARCHAR(45),                   -- Source IP 1
    sip2 VARCHAR(45),                   -- Source IP 2
    sip3 VARCHAR(45),                   -- Source IP 3
    sport1 VARCHAR(10),                 -- Source port 1
    sport2 VARCHAR(10),                 -- Source port 2
    sport3 VARCHAR(10),                 -- Source port 3
    protocol VARCHAR(10),               -- Protocol number
    url_to_link VARCHAR(255),           -- URL to report
    remarks TEXT,                       -- Additional comments
    attack_direction VARCHAR(50)        -- Attack direction
);
```

## Running the Application
1. first, install all dependencied on frontEnd and webSocket directory
2. Run webSocket server using "node script" command on webSocket directory (the webScoket server will run on port 3000 (you can modify the port that webSocket server run))
3. Run front-end server using "node app" command on frontEnd directory (the front-end server will run on port 8000 (you can modify the port that front-end server run))
4. Open loaclhost:8000 (depend on what port that front-end web server run) on your web browser to access client-side

## Troubleshooting
1. **Database connection error**:
   - Ensure that MySQL is running and the credentials in the `.env` file are correct.
   - Double-check that the database name and table exist.

2. **Error inserting data**:
   - Make sure the structure of your payload matches the database columns.
   - Check the data types in your payload (e.g., date format, integer values).

## Acknowledgement
Portions of this software use code licensed under the MIT License: 
Copyright (c)
2024 Fajar Nur Wahid, Adil Shalikh