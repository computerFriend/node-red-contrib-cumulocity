# node-red-contrib-cumulocity
This is a set of nodes supporting integration with Cumulocity (currently still growing)

## Installation
run npm -g install node-red-contrib-cumulocity

## Features
Currently includes integration for measurements, events, and alarms.

## Usage

### Required inputs (vary for each node):
* Cumulocity Configuration (includes host, tenant, & login information)

### Optional inputs (vary for each node):
* deviceId: limits data to 1 specific device
* startDate, endDate: returns data for only a target date range
* pageSize: Defines maximum number of records to return


## Why this module?
This node library is an ever-expanding set of nodes designed to integrate with the Cumulocity IoT platform.  The long-term goal is to create a complete library of node-red nodes, such that anyone trying to integrate with Cumulocity will not need to write any code to do so.

## What's next?
* Nodes supporting device registration
