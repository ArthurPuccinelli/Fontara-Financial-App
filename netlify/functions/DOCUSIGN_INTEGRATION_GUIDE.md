# DocuSign Integration Guide

## Overview

This document provides a detailed explanation of the API service integration with DocuSign's App Center, specifically focusing on the implementation of DocuSign Connected Fields. The purpose of this integration is to allow DocuSign envelopes to dynamically pull data from this service based on input provided during the signing process (e.g., a CPF/CNPJ). This service verifies the input and returns relevant data that can be populated into the document.

## File Descriptions

This section details the role and functionality of each key file involved in the DocuSign integration.

### `model.cto`

*   **Role**: Defines the data schema for the `VerificacaoDeCliente` concept using the Concerto Modeling Language. This schema is the single source of truth for the data structure used in the integration.
*   **Current Fields**:
    *   `clienteId`: `String` - Identifier for the client (e.g., CPF or CNPJ). This field is mandatory and used as the primary identifier.
    *   `score`: `Integer` - Credit score of the client. Optional.
    *   `status`: `String` - Status derived from the score (e.g., "Excelente", "Bom"). Optional.
    *   `dataConsulta`: `DateTime` - Timestamp of when the data was queried. Optional.
    *   `endereco`: `String` - Client's address. Optional.
    *   `planoAtual`: `String` - Client's current plan or product (e.g., "BÁSICO"). Optional.
*   **Decorators**:
    *   `@VerifiableType`: Marks `VerificacaoDeCliente` as a type that DocuSign can use for its Connected Fields.
    *   `@Term("Verificação de cliente")`: Provides a user-friendly label for the concept.
    *   `@IsRequiredForVerifyingType` (on `clienteId`): Indicates that `clienteId` is a mandatory input from DocuSign.
    *   `@Term(...)` (on properties): Provides user-friendly labels for each field.

### `GetTypeDefinition.js`

*   **Role**: A Netlify serverless function that dynamically generates and returns the JSON representation of the `VerificacaoDeCliente` type definition to DocuSign.
*   **Functionality**: It constructs a JSON object that conforms to the Concerto metamodel, essentially translating the `model.cto` definition into a format DocuSign's App Center can understand. This allows DocuSign to know the structure, types, and properties of the data it can request.

### `GetTypeNames.js`

*   **Role**: A Netlify serverless function that provides DocuSign with a list of available type names and their human-readable labels.
*   **Functionality**: It returns a simple JSON array mapping internal type names (like `clienteId`) to display labels (like "Cliente Id"). This helps in configuring the Connected Fields within the DocuSign interface.

### `verify.js`

*   **Role**: The main Netlify serverless function that handles the verification callback from DocuSign when a document with Connected Fields is being processed.
*   **Functionality**:
    1.  **Authentication**: It first validates a JSON Web Token (JWT) passed in the `Authorization` header. The token is verified against a JWKS (JSON Web Key Set) URI from Auth0, ensuring the request is legitimate.
    2.  **Input Processing**: It parses the request body from DocuSign, expecting a `typeName` (which should be `VerificacaoDeCliente`) and a `data` object containing the input fields (primarily `clienteId`).
    3.  **Data Retrieval**: It calls the `verificaCPFeCNPJ(data.clienteId)` function to fetch or generate the client's data.
    4.  **Response Formatting**: It then structures the retrieved data, along with verification status codes and messages, into the JSON format required by DocuSign. This includes ensuring data types are consistent (e.g., `clienteId` is explicitly cast to a String, `score` is parsed as an Integer).
    5.  **Passthrough Data**: Includes a `passthroughResponseData` field for any additional information.

### `verificaCPFeCNPJ.js`

*   **Role**: A JavaScript module containing the core business logic for retrieving or generating client verification data.
*   **Functionality**:
    *   Takes `clienteId` as input.
    *   Currently, it generates *mock/dummy data* for fields like `score`, `status`, `endereco`, and `planoAtual`. In a production scenario, this module would typically query a database or an external API to fetch real client data.
    *   Returns an object containing the client's information.

### `verificaCPFeCNPJ-http.js`

*   **Role**: A Netlify serverless function that acts as a simple HTTP endpoint for the `verificaCPFeCNPJ.js` logic.
*   **Functionality**: It allows direct invocation of the client data generation/retrieval logic via an HTTP GET or POST request. This can be useful for testing the core `verificaCPFeCNPJ.js` function independently of the full DocuSign `verify.js` flow. It expects `clienteId` in the request body or query string.

### `verificaCPFeCNPJHandler.js`

*   **Role**: Another Netlify serverless function, likely serving as an alternative handler or endpoint for the `verificaCPFeCNPJ.js` logic.
*   **Functionality**: Similar to `verificaCPFeCNPJ-http.js`, it takes a `cliente_id` from the query string, calls `verificaCPFeCNPJ.js`, and returns the data as JSON. This might be used for different testing scenarios or internal API calls.

## Data Flow

The following steps outline the data flow when DocuSign interacts with this API service for Connected Fields:

1.  **Configuration Phase (DocuSign Admin)**:
    *   An administrator in DocuSign's App Center configures a "Connected Field" or "Custom Data Source."
    *   DocuSign calls this API's `GetTypeNames.js` endpoint to get a list of available data types (e.g., "VerificacaoDeCliente").
    *   DocuSign then calls `GetTypeDefinition.js` for the selected type to understand its structure, fields, and which fields are required as input.

2.  **Runtime Verification Phase (DocuSign Signing Session)**:
    *   A user initiates a DocuSign signing session for an envelope that contains Connected Fields linked to this service.
    *   When the user needs to populate these fields, DocuSign makes an API call to the `verify.js` endpoint of this service.
    *   The request to `verify.js` includes:
        *   An `Authorization` header with a Bearer JWT.
        *   A JSON body containing the `typeName` (e.g., "VerificacaoDeCliente") and a `data` object with the input values provided by the user (e.g., `{"clienteId": "12345678900"}`).
    *   **`verify.js` Processing**:
        1.  **Authentication**: The JWT is validated using the configured JWKS URI. If invalid, a 401 Unauthorized error is returned.
        2.  **Input Validation**: Basic checks are performed on `typeName` and the presence of required data like `data.clienteId`.
        3.  **Data Retrieval**: `verify.js` calls the internal `verificaCPFeCNPJ(data.clienteId)` function.
        4.  **`verificaCPFeCNPJ.js` Execution**: This function fetches or (currently) generates the data for the given `clienteId`.
        5.  **Response Formatting**: `verify.js` receives the data from `verificaCPFeCNPJ.js` and transforms it into the specific JSON structure DocuSign expects. This includes:
            *   `verified`: A boolean indicating success.
            *   `verifyResponseMessage`, `verificationResultCode`, `verificationResultDescription`: Messages and codes about the outcome.
            *   `suggestions`: An array containing the retrieved data object(s) (e.g., the `VerificacaoDeCliente` instance with all its fields like `score`, `status`, etc.).
            *   `passthroughResponseData`: Any additional data to be returned.
    *   **Response to DocuSign**: `verify.js` returns the formatted JSON response to DocuSign.
    *   **Data Population**: DocuSign uses the data in the `suggestions` array to populate the relevant fields in the document being signed.

3.  **Alternative Flows (Testing/Direct API Calls)**:
    *   The `verificaCPFeCNPJ-http.js` and `verificaCPFeCNPJHandler.js` endpoints can be called directly (e.g., by developers or other services) to test or use the `verificaCPFeCNPJ.js` logic outside of the full DocuSign Connected Fields verification flow. These calls would typically bypass the JWT authentication handled by `verify.js`.

## Key Data Structures

The primary data structure used in this integration is `VerificacaoDeCliente`.

### `VerificacaoDeCliente`

*   **Definition**: This concept is formally defined in the `model.cto` file. It represents the set of information that can be retrieved and populated into DocuSign documents.
*   **Properties**:
    *   `clienteId` (String, Mandatory Input): The unique identifier for the client (e.g., CPF/CNPJ). This is typically provided by the user during the DocuSign signing process and is used as the primary key to look up the client's information.
    *   `score` (Integer, Optional Output): The client's credit score or a similar rating.
    *   `status` (String, Optional Output): A descriptive status based on the score or other criteria (e.g., "Approved", "Pending Review").
    *   `dataConsulta` (DateTime, Optional Output): The date and time when this information was last verified or updated.
    *   `endereco` (String, Optional Output): The client's address.
    *   `planoAtual` (String, Optional Output): Information about the client's current plan, product, or service level.
*   **Usage**:
    *   DocuSign becomes aware of this structure via `GetTypeDefinition.js`.
    *   The `verify.js` function receives the `clienteId` and is expected to return a `VerificacaoDeCliente` object (or an array of them) within the `suggestions` field of its response.
    *   The fields of this object are then used by DocuSign to populate the corresponding Connected Fields in the document.

## Authentication/Authorization

Security for the main data retrieval endpoint (`verify.js`) is handled via JSON Web Tokens (JWT).

*   **Mechanism**: When DocuSign calls the `verify.js` endpoint, it must include an `Authorization` header with a Bearer token (JWT).
*   **Validation**: The `verify.js` function uses the `jsonwebtoken` and `jwks-rsa` libraries to validate this token.
    *   It fetches the public signing keys from a JSON Web Key Set (JWKS) URI. The current configuration points to `https://fontara.us.auth0.com/.well-known/jwks.json`.
    *   It verifies the token's signature, audience (`https://fontarafinancial.netlify.app`), and issuer (`https://fontara.us.auth0.com/`).
*   **Outcome**: If the token is invalid or missing, `verify.js` returns a `401 Unauthorized` error, preventing unauthorized access to the data.
*   **Scope**: This JWT validation is specific to the `verify.js` endpoint, which is the primary integration point for DocuSign Connected Fields. Other helper/testing endpoints like `verificaCPFeCNPJ-http.js` or `verificaCPFeCNPJHandler.js` do not implement this JWT authentication.
