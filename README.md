# Fontara Financial - Docusign Integration Service

## Overview

This project provides a client data verification service for Docusign envelopes and includes a frontend portal. It allows Docusign to dynamically pull client data based on input provided during the signing process (e.g., a CPF/CNPJ) and offers a user interface for related financial services.

The project is composed of two main parts:

1.  **Frontend Portal:** A user-facing website built with HTML, CSS (Tailwind CSS), and JavaScript, providing access to various financial products and information.
2.  **Backend Docusign Integration (Netlify Functions):** A set of serverless functions responsible for handling requests from Docusign, verifying client information (currently using mock data), and serving data according to a predefined Concerto model.

## Technologies Used

*   **Frontend:**
    *   HTML
    *   CSS (Tailwind CSS)
    *   JavaScript
*   **Backend:**
    *   Node.js
    *   Netlify Functions
    *   Express.js (potentially, based on dependencies, for local proxying or function structure)
*   **Docusign Integration:**
    *   Docusign eSignature API
    *   Docusign Connected Fields
    *   Concerto Data Modeling (`.cto` files)
*   **Authentication:**
    *   JWT (JSON Web Tokens)
    *   Auth0 (for validating JWTs from Docusign callbacks)
*   **Development & Deployment:**
    *   Git
    *   npm
    *   Netlify (for deployment and serverless functions)
    *   Esbuild (for bundling Netlify functions)


## Frontend Details

The frontend portal is located in the `frontend/` directory. It provides users with access to information about various financial products and services offered by Fontara.

Key characteristics:

*   **Structure:** Static HTML files serve as the primary content pages (e.g., `index.html`, `credito-imobiliario.html`, `investimentos.html`).
    *   `assets/`: Contains static assets like images (`assets/images/`) and documents (`assets/documentos/`).
    *   `css/`: Contains stylesheets. `css/source.css` is the input for Tailwind CSS, and `css/tailwind-build.css` is the generated output.
    *   `scripts/`: Contains client-side JavaScript files. `scripts/loadPartials.js` suggests that common HTML parts like headers and footers (`_header.html`, `_footer.html`) might be loaded dynamically.
*   **Styling:** Tailwind CSS is used for styling. The configuration can be found in `frontend/tailwind.config.js`.
    *   To build the Tailwind CSS, navigate to the `frontend/` directory and run: `npm run build:css` (This script is defined in `frontend/package.json`).
*   **Dependencies:** Frontend specific dependencies are managed in `frontend/package.json`. Install them by running `npm install` within the `frontend/` directory.
*   **Local Viewing:** To view the frontend locally, you can typically open the `.html` files directly in a browser or serve the `frontend/` directory using a simple HTTP server. When using Netlify CLI for backend development (`netlify dev`), it will also usually serve the frontend from the directory specified in `netlify.toml` (which is `frontend/`).


## Backend Details (Netlify Functions)

The backend logic, primarily for Docusign integration, is implemented as serverless functions using Netlify Functions. These functions are located in the `netlify/functions/` directory.

Key functions and their roles (refer to `netlify/functions/DOCUSIGN_INTEGRATION_GUIDE.md` for more in-depth details):

*   **`verify.js`**: This is the main endpoint that Docusign calls during a signing process when Connected Fields are used. It receives data from Docusign (like `clienteId`), validates an incoming JWT (from Auth0) for security, calls `verificaCPFeCNPJ.js` to get client information, and then formats the response for Docusign.
*   **`GetTypeDefinition.js`**: Provides Docusign with the detailed data schema (structure, types, properties) of the `VerificacaoDeCliente` concept. This is based on the `model.cto` file and translated into a JSON format Docusign understands.
*   **`GetTypeNames.js`**: Supplies Docusign with a list of available data type names (e.g., "VerificacaoDeCliente") and their human-readable labels.
*   **`verificaCPFeCNPJ.js`**: Contains the core business logic for fetching or generating client verification data based on a `clienteId`. **Currently, this function returns mock/dummy data.** In a production environment, this would query a real database or external API.
*   **`docusign-listener.js` & `docusign-actions.js`**: These functions suggest further Docusign integration points, possibly for handling Docusign Connect events or other envelope/recipient actions. Consult their code and the Docusign guide for specifics.
*   **`get-docusign-client-id.js`**: Retrieves the Docusign Client ID, likely used for API interactions.
*   **Helper/Testing Functions:**
    *   `verificaCPFeCNPJ-http.js` and `verificaCPFeCNPJHandler.js`: These are HTTP-triggered wrappers around `verificaCPFeCNPJ.js`, useful for testing the data retrieval logic independently of the full Docusign flow.

*   **Data Modeling (`model.cto`)**: The structure of the data exchanged with Docusign (specifically for the `VerificacaoDeCliente` concept) is defined in `netlify/functions/model.cto` using the Concerto Modeling Language. This model includes fields like `clienteId`, `score`, `status`, `dataConsulta`, `endereco`, and `planoAtual`.

*   **Node.js Version**: The `netlify.toml` file specifies Node.js version 20 for the runtime environment of these functions.
*   **Bundling**: Functions are bundled using `esbuild`, as configured in `netlify.toml`.


## Data Flow and Docusign Integration

This service integrates with Docusign using its "Connected Fields" feature. The primary goal is to allow Docusign envelopes to dynamically fetch and populate client data during the signing ceremony.

**Key Data Concept: `VerificacaoDeCliente`**

*   **Definition**: Defined in `netlify/functions/model.cto`, this Concerto model represents the client information structure.
*   **Properties**: Includes `clienteId` (String, mandatory input like CPF/CNPJ), `score` (Integer), `status` (String), `dataConsulta` (DateTime), `endereco` (String), and `planoAtual` (String).
*   **Usage**: Docusign uses this model (via `GetTypeDefinition.js`) to understand what data it can request. The `verify.js` function returns data matching this structure.

**Integration Steps:**

1.  **Configuration Phase (in Docusign):**
    *   A Docusign administrator configures a "Connected Field" app, pointing to this service's Netlify functions.
    *   Docusign calls `GetTypeNames.js` to list available data types (i.e., `VerificacaoDeCliente`).
    *   Docusign calls `GetTypeDefinition.js` to get the schema for `VerificacaoDeCliente`.

2.  **Runtime Verification (during Docusign Signing):**
    *   A user starts a Docusign signing session for an envelope using these Connected Fields.
    *   Docusign makes an API call to this service's `verify.js` endpoint.
    *   The request to `verify.js` includes:
        *   An `Authorization: Bearer <JWT>` header (token issued by Auth0).
        *   A JSON body with `typeName: "VerificacaoDeCliente"` and `data: { "clienteId": "<user_input>" }`.
    *   **`verify.js` Processing:**
        1.  **Authenticates** the JWT using Auth0's JWKS URI.
        2.  **Retrieves/Generates Data** by calling `verificaCPFeCNPJ(data.clienteId)`.
        3.  **Formats Response** into the JSON structure Docusign expects, including verification status and the `VerificacaoDeCliente` data within a `suggestions` array.
    *   Docusign receives the response and populates the data into the document fields.

(For a more detailed flow, refer to `netlify/functions/DOCUSIGN_INTEGRATION_GUIDE.md`)


## Environment Variables and Configuration

To run and deploy this project, certain environment variables need to be configured. For local development, you can create a `.env` file in the root of the project (ensure this file is listed in `.gitignore` and not committed). For Netlify deployments, these variables should be set in the Netlify build & deploy settings.

**Required Environment Variables:**

*   **For Auth0 JWT Validation (used in `verify.js`):**
    *   `AUTH0_DOMAIN`: Your Auth0 domain (e.g., `fontara.us.auth0.com`). This is used to construct the JWKS URI.
    *   `AUTH0_AUDIENCE`: The audience for your API in Auth0 (e.g., `https://fontarafinancial.netlify.app`).

*   **For Docusign API Interaction (potentially used by various Docusign functions):**
    *   `DOCUSIGN_CLIENT_ID`: Your Docusign integration key (client ID). The function `get-docusign-client-id.js` likely provides this to other functions.
    *   `DOCUSIGN_IMPERSONATED_USER_GUID`: The GUID of the Docusign user to impersonate for API calls if using JWT Grant authentication.
    *   `DOCUSIGN_PRIVATE_KEY`: The private key corresponding to your Docusign integration key (client ID) for JWT Grant authentication. This might be a multi-line value; ensure it's formatted correctly when setting as an environment variable.
    *   `DOCUSIGN_ACCOUNT_ID`: The Docusign Account ID (API Account ID) your integration will target.

*   **General Netlify Configuration (`netlify.toml`):**
    *   **Build Command:** While the root `package.json` has build scripts, `netlify.toml` currently has an empty `command`. If a specific root build command is needed before deployment (other than frontend CSS build), it should be added here.
    *   **Publish Directory:** Set to `frontend/`, which is where the static frontend assets are served from.
    *   **Functions Directory:** Set to `netlify/functions/`.
    *   **Node Version:** Specified as Node.js 20.
    *   **Function Bundling:** Uses `esbuild` with specified `external_node_modules` like `docusign-esign` to optimize bundle sizes.

**Note on other variables from generic Docusign examples:**

The generic Docusign reference implementation `README.md` (which this document replaces) mentions `JWT_SECRET_KEY`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, and `AUTHORIZATION_CODE`. These seem related to a mock OAuth server or a different JWT setup not directly used by the primary `verify.js` function in this project, which relies on Auth0 for JWT validation. If parts of the application still use these (e.g., for other non-Docusign related auth or local testing proxies), they would need to be documented here. However, based on the `DOCUSIGN_INTEGRATION_GUIDE.md`, the Auth0 variables are paramount for the core Docusign verification flow.


## Setup and Local Development

Follow these steps to set up the project for local development:

**1. Prerequisites:**

*   **Node.js:** Install Node.js. It's recommended to use a version manager like `nvm`. The project specifies version 20 in `.nvmrc` and `netlify.toml`. You can run `nvm use` in the project root if you have `nvm` installed.
*   **npm:** npm (Node Package Manager) is included with Node.js. Used for managing project dependencies.
*   **Netlify CLI (Recommended):** To easily run the frontend and backend (Netlify Functions) locally, simulating the Netlify environment. Install it globally: `npm install -g netlify-cli`.

**2. Clone the Repository:**

```bash
git clone <repository_url>
cd <repository_directory>
```

**3. Install Dependencies:**

*   **Root Dependencies (for backend functions and general project tools):**
    ```bash
    npm install
    ```
*   **Frontend Dependencies (for Tailwind CSS):**
    ```bash
    cd frontend
    npm install
    cd ..
    ```

**4. Configure Environment Variables:**

*   Create a file named `.env` in the root directory of the project.
*   Add the necessary environment variables as listed in the "Environment Variables and Configuration" section to this `.env` file. For example:
    ```env
    AUTH0_DOMAIN="your-auth0-domain.us.auth0.com"
    AUTH0_AUDIENCE="your-api-audience"
    DOCUSIGN_CLIENT_ID="your-docusign-client-id"
    # Add other Docusign variables like DOCUSIGN_IMPERSONATED_USER_GUID, DOCUSIGN_PRIVATE_KEY, DOCUSIGN_ACCOUNT_ID
    ```
*   **Important:** Ensure `.env` is added to your `.gitignore` file to prevent committing secrets.

**5. Build Frontend Assets:**

*   Compile the Tailwind CSS:
    ```bash
    cd frontend
    npm run build:css
    cd ..
    ```

**6. Running the Project Locally:**

*   **Using Netlify CLI (Recommended):**
    The Netlify CLI will host your frontend (from the `publish` directory configured in `netlify.toml`, i.e., `frontend/`) and run your Netlify Functions, simulating the cloud environment.
    ```bash
    netlify dev
    ```
    This command typically opens your site in a browser and provides a local URL for your functions.

*   **Manual/Alternative (if not using Netlify CLI for frontend):**
    *   You can open frontend HTML files (`frontend/*.html`) directly in your browser. However, for full functionality including backend calls, `netlify dev` is preferred.
    *   The root `package.json` includes scripts like `npm run dev` or `npm run start` which seem to be related to running an Express-based proxy or server (potentially for the Docusign reference implementation this project is based on). If these are still relevant for a specific part of the local development (e.g., a mock auth server, if used), refer to their implementation details. However, for the core Netlify functions and frontend, `netlify dev` is the standard.

**7. Testing Docusign Integration:**

*   Testing the Docusign Connected Fields integration typically requires configuring Docusign to point to your local Netlify function URLs (which `netlify dev` will provide, often using a tunnel service like ngrok automatically managed by `netlify dev` or configured manually).
*   Use the helper functions like `verificaCPFeCNPJ-http.js` (by calling their local URLs) to test the data generation logic independently.


## Deployment

This project is designed for deployment on **Netlify**.

*   **Trigger:** Deployments are typically triggered automatically when changes are pushed to the configured branch in your Git repository (e.g., `main` or `master`).
*   **Configuration:** The `netlify.toml` file in the root of the project dictates how Netlify builds and deploys the site:
    *   `build.publish`: Set to `frontend/`, meaning the contents of the `frontend` directory will be deployed as the live site.
    *   `build.functions`: Set to `netlify/functions/`, where Netlify will find and deploy the serverless functions.
    *   `build.command`: If there were any root-level build commands required before deployment (beyond the frontend's CSS build, which should ideally be part of the local setup or a specific frontend build script referenced here), they would be specified here. Currently, it's empty in the provided `netlify.toml`.
*   **Environment Variables:** Ensure all necessary environment variables (as listed in the "Environment Variables and Configuration" section) are correctly set in your Netlify site's build & deploy settings (under "Environment"). These are crucial for the backend functions to operate correctly in the deployed environment.
*   **Frontend Build:** The frontend's CSS (`frontend/css/tailwind-build.css`) should be committed to the repository after being built locally with `cd frontend && npm run build:css`. Alternatively, the `build.command` in `netlify.toml` could be updated to include this step, e.g., `cd frontend && npm install && npm run build:css && cd ..`.

To deploy:

1.  Ensure your project is linked to a Netlify site.
2.  Push your code to the Git branch that Netlify is configured to watch.
3.  Netlify will automatically pick up the changes, build (if a command is set), deploy the functions from `netlify/functions/`, and deploy the static assets from `frontend/`.


## Contribution Guidelines

We welcome contributions to improve and expand this project! Please follow these guidelines:

**General Workflow:**

1.  **Fork the repository** to your own GitHub account.
2.  **Create a new branch** for your feature or bug fix: `git checkout -b feature/your-feature-name` or `bugfix/issue-description`.
3.  **Make your changes** and commit them with clear, descriptive messages.
4.  **Ensure your code lints correctly** if linters are configured (see below).
5.  **Test your changes thoroughly** locally.
6.  **Push your branch** to your fork: `git push origin feature/your-feature-name`.
7.  **Create a Pull Request (PR)** from your fork's branch to the main repository's `main` (or appropriate) branch.
8.  Clearly describe the changes made and the problem solved in your PR description.

**Coding Standards:**

*   **JavaScript/Node.js:** Follow existing code style. The root `package.json` includes `eslint` and `@typescript-eslint/parser` (though TypeScript usage isn't confirmed across the board, ESLint is present). Consider running `npm run lint` (if this script is fully configured) to check for issues.
*   **HTML/CSS:** Maintain clean and readable code. For CSS, try to leverage Tailwind CSS utility classes as much as possible.
*   **Commit Messages:** Write clear and concise commit messages, explaining the 'what' and 'why' of your changes.

**Adding New Features:**

*   **Frontend Pages:** New static pages can be added to the `frontend/` directory. Remember to update any navigation or links if necessary. If using partials, ensure they are handled correctly by `frontend/scripts/loadPartials.js` or similar logic.
*   **Netlify Functions:** New serverless functions can be added as JavaScript files within the `netlify/functions/` directory. Each file typically exports a handler function. Remember to configure any necessary environment variables if your new function requires them.
*   **Data Model (`model.cto`):** If changes to the Docusign data structure are needed, update `netlify/functions/model.cto`. This may also require updates to `GetTypeDefinition.js` and `verify.js` to reflect the new model.

**Reporting Bugs:**

*   Use the GitHub Issues section of the repository to report bugs.
*   Provide as much detail as possible, including steps to reproduce, expected behavior, and actual behavior.

**For AI Collaborators:**

*   This README aims to provide comprehensive details about the project structure, setup, and key components.
*   Pay close attention to the "Environment Variables" section for backend function requirements.
*   The `netlify/functions/DOCUSIGN_INTEGRATION_GUIDE.md` offers deeper insights into the Docusign-specific logic.
*   When modifying code, especially in backend functions, ensure that data types and structures align with the `model.cto` and the expectations of the Docusign API.
