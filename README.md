# node-red-contrib-cumulocity
This is set of nodes supporting integration with Cumulocity (currently still growing)

## Installation
run npm -g install node-red-contrib-cumulocity

## Features
Currently includes integration for measurements, events, and alarms.

## Usage

### Required inputs:
* cumulocity instance name
* tenant name

### Optional inputs:
* deviceId: limits data to 1 specific device
* startDate, endDate: returns data for only a target date range
* pageSize: Defines maximum number of records to return


## Why this module?
This node is the first in a series of nodes designed to integrate with the Cumulocity IoT platform.  The long-term goal is to create a complete library of node-red nodes that can pair with Cumulocity (analogous to the AWS & Salesforce node-red libraries).

## What's next?
More nodes & abstraction of credentials (store cumulocity login information all in one config node, instead of having to re-enter the same data for each node)
* Nodes supporting device registration are next
