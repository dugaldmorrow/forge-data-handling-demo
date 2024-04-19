# Forge Data Processing Demo

This app serves as an example for demonstrating how write Forge apps that can process large sets of data.

## Installation

1. Follow the [Forge getting started instructions](https://developer.atlassian.com/platform/forge/getting-started/) to set up your Forge development environment.
2. Run `yarn` or `npm install` to retrieve dependencies.
3. Run `forge register` to register this app as your own.
4. Run `forge deploy` to deploy the app in the development environment.
5. Run `forge install` to install the app in a Confluence site.

## Usage

1. Navigate to a Confluence page. 
2. Insert the macro titled "Forge Data Handling Demo - Data Manager Macro".
3. Run `forge tunnel` to conveniently see the log messages.
4. Use the macro to trigger the processing of a mock set of data.
5. Change the value of `src/mock-api/apiConfig.errorProbability` to increase or decrease the probability of the mock API returning error responses in order to see the effect on the processing.

## License

Copyright (c) 2024 Atlassian and others.
Apache 2.0 licensed, see [LICENSE](LICENSE) file.

[![From Atlassian](https://raw.githubusercontent.com/atlassian-internal/oss-assets/master/banner-cheers.png)](https://www.atlassian.com)
